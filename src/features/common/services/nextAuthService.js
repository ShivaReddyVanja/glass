const { BrowserWindow, shell } = require('electron');
const fetch = require('node-fetch');
const encryptionService = require('./encryptionService');
const migrationService = require('./migrationService');
const sessionRepository = require('../repositories/session');
const providerSettingsRepository = require('../repositories/providerSettings');
const userModelSelectionsRepository = require('../repositories/userModelSelections');

async function getVirtualKeyByEmail(email, accessToken) {
    if (!accessToken) {
        throw new Error('NextAuth access token is required for virtual key request');
    }

    const resp = await fetch('https://serverless-api-sf3o.vercel.app/api/virtual_key', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
        redirect: 'follow',
    });

    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
        console.error('[VK] API request failed:', json.message || 'Unknown error');
        throw new Error(json.message || `HTTP ${resp.status}: Virtual key request failed`);
    }

    const vKey = json?.data?.virtualKey || json?.data?.virtual_key || json?.data?.newVKey?.slug;

    if (!vKey) throw new Error('virtual key missing in response');
    return vKey;
}

class NextAuthService {
    constructor() {
        this.currentUserId = 'default_user';
        this.currentUserMode = 'local'; // 'local' or 'firebase' (keeping for compatibility)
        this.currentUser = null;
        this.isInitialized = false;
        this.session = null;

        // This ensures the key is ready before any login/logout state change.
        encryptionService.initializeKey(this.currentUserId);
        this.initializationPromise = null;

        sessionRepository.setAuthService(this);
        providerSettingsRepository.setAuthService(this);
        userModelSelectionsRepository.setAuthService(this);
    }

    initialize() {
        if (this.isInitialized) return this.initializationPromise;

        this.initializationPromise = new Promise((resolve) => {
            // For NextAuth, we don't have a persistent auth state listener
            // Instead, we'll rely on deep link callbacks and manual session management
            console.log('[NextAuthService] Initialized without persistent auth state');
            this.isInitialized = true;
            resolve();
        });

        return this.initializationPromise;
    }

    async startNextAuthFlow() {
        try {
            const webUrl = process.env.pickleglass_WEB_URL || 'http://localhost:3000';
            const authUrl = `${webUrl}/login?mode=electron`;
            console.log(`[NextAuthService] Opening NextAuth URL in browser: ${authUrl}`);
            await shell.openExternal(authUrl);
            return { success: true };
        } catch (error) {
            console.error('[NextAuthService] Failed to open NextAuth URL:', error);
            return { success: false, error: error.message };
        }
    }

    async signInWithNextAuthSession(sessionData) {
        try {
            console.log('[NextAuthService] Processing NextAuth session:', sessionData);
            
            const previousUser = this.currentUser;

            if (sessionData && sessionData.user) {
                // User signed IN
                const user = sessionData.user;
                const userId = sessionData.userId || user.id || 'unknown';
                
                console.log(`[NextAuthService] NextAuth user signed in:`, userId);
                
                this.currentUser = {
                    uid: userId,
                    email: user.email || 'no-email@example.com',
                    displayName: user.name || 'User',
                    photoURL: user.image
                };
                this.currentUserId = userId;
                this.currentUserMode = 'firebase'; // Keep for compatibility
                this.session = sessionData;

                // Clean up any zombie sessions from a previous run for this user.
                await sessionRepository.endAllActiveSessions();

                // ** Initialize encryption key for the logged-in user **
                await encryptionService.initializeKey(userId);

                // ** Check for and run data migration for the user **
                // No 'await' here, so it runs in the background without blocking startup.
                migrationService.checkAndRunMigration(this.currentUser);

                // Start background task to fetch and save virtual key
                if (sessionData.accessToken) {
                    (async () => {
                        try {
                            const virtualKey = await getVirtualKeyByEmail(user.email, sessionData.accessToken);

                            if (global.modelStateService) {
                                global.modelStateService.setFirebaseVirtualKey(virtualKey);
                            }
                            console.log(`[NextAuthService] BG: Virtual key for ${user.email} has been processed.`);

                        } catch (error) {
                            console.error('[NextAuthService] BG: Failed to fetch or save virtual key:', error);
                        }
                    })();
                }

            } else {
                // User signed OUT
                console.log(`[NextAuthService] No NextAuth user.`);
                if (previousUser) {
                    console.log(`[NextAuthService] Clearing API key for logged-out user: ${previousUser.uid}`);
                    if (global.modelStateService) {
                        global.modelStateService.setFirebaseVirtualKey(null);
                    }
                }
                this.currentUser = null;
                this.currentUserId = 'default_user';
                this.currentUserMode = 'local';
                this.session = null;

                // End active sessions for the local/default user as well.
                await sessionRepository.endAllActiveSessions();

                // ** Initialize encryption key for the default/local user **
                await encryptionService.initializeKey(this.currentUserId);
            }
            
            this.broadcastUserState();
            
        } catch (error) {
            console.error('[NextAuthService] Error processing NextAuth session:', error);
            throw error;
        }
    }

    async signOut() {
        try {
            // End all active sessions for the current user BEFORE signing out.
            await sessionRepository.endAllActiveSessions();

            // Clear the session
            this.session = null;
            this.currentUser = null;
            this.currentUserId = 'default_user';
            this.currentUserMode = 'local';

            // Initialize encryption key for the default/local user
            await encryptionService.initializeKey(this.currentUserId);

            console.log('[NextAuthService] User sign-out completed successfully.');
            this.broadcastUserState();
        } catch (error) {
            console.error('[NextAuthService] Error signing out:', error);
        }
    }
    
    broadcastUserState() {
        const userState = this.getCurrentUser();
        console.log('[NextAuthService] Broadcasting user state change:', userState);
        BrowserWindow.getAllWindows().forEach(win => {
            if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
                win.webContents.send('user-state-changed', userState);
            }
        });
    }

    getCurrentUserId() {
        return this.currentUserId;
    }

    getCurrentUser() {
        const isLoggedIn = !!(this.currentUserMode === 'firebase' && this.currentUser);

        if (isLoggedIn) {
            return {
                uid: this.currentUser.uid,
                email: this.currentUser.email,
                displayName: this.currentUser.displayName,
                mode: 'firebase',
                isLoggedIn: true,
            };
        }
        return {
            uid: this.currentUserId, // returns 'default_user'
            email: 'contact@pickle.com',
            displayName: 'Default User',
            mode: 'local',
            isLoggedIn: false,
        };
    }

    getSession() {
        return this.session;
    }
}

const nextAuthService = new NextAuthService();
module.exports = nextAuthService; 