# Firebase & Firestore File-by-File Breakdown

This document provides a detailed breakdown of every file in the codebase that uses Firebase or Firestore, including what it does, why it is used, and how it is used. Use this as a reference for your migration.

---

## Electron Backend

### 1. `src/features/common/services/firebaseClient.js`
- **What:** Initializes Firebase App, Auth, and Firestore for Electron.
- **Why:** Provides singleton access to Firebase services for the backend.
- **How:**
  - Uses `initializeApp`, `initializeAuth`, and `getFirestore`.
  - Custom persistence for Electron using `electron-store`.
  - Exports `initializeFirebase`, `getFirebaseAuth`, `getFirestoreInstance`.

### 2. `src/features/common/services/authService.js`
- **What:** Handles authentication logic using Firebase Auth.
- **Why:** Manages user login state, sign-in with custom token, sign-out, and user state broadcasting.
- **How:**
  - Uses `onAuthStateChanged`, `signInWithCustomToken`, `signOut`.
  - Triggers encryption key setup and data migration on login.

### 3. `src/preload.js` & `src/bridge/featureBridge.js`
- **What:** Exposes auth actions (`getCurrentUser`, `startFirebaseAuth`, `firebaseLogout`) to renderer via IPC.
- **Why:** Allows renderer/frontend to trigger login/logout and get user info.
- **How:** IPC handlers call methods in `authService`.

### 4. `src/index.js`
- **What:**
  - Calls `initializeFirebase()` on app startup.
  - Handles deep link callback from web login, exchanges ID token for custom token via Firebase Cloud Function, signs in user in Electron.
- **Why:** Ensures Firebase is ready before any authentication or Firestore operations. Enables secure login flow between web and Electron.
- **How:** Calls `initializeFirebase`, `authService.initialize`, and handles token exchange.

### 5. `src/features/common/services/migrationService.js`
- **What:** Migrates user data from local SQLite to Firestore.
- **Why:** Ensures user data is synced to the cloud after login.
- **How:** Uses Firestore batch writes and document operations.

---

## Firestore Repository Files (Electron)

Each feature has a `firebase.repository.js` file for Firestore and a `sqlite.repository.js` for local storage. All use the same pattern:
- **What:** CRUD operations for a specific collection (users, sessions, presets, provider settings, AI messages, summaries, STT data).
- **Why:** Abstracts data access, allowing switching between cloud and local storage.
- **How:**
  - Imports Firestore methods (`collection`, `doc`, `getDoc`, `setDoc`, `addDoc`, `updateDoc`, `deleteDoc`, `writeBatch`, `query`, `where`, `orderBy`, `Timestamp`).
  - Uses `getFirestoreInstance()` from `firebaseClient.js`.
  - Defines functions to access specific collections.
  - Uses custom Firestore converters for encryption/decryption.

**Files:**
- `src/features/common/repositories/user/firebase.repository.js`
- `src/features/common/repositories/session/firebase.repository.js`
- `src/features/common/repositories/preset/firebase.repository.js`
- `src/features/common/repositories/providerSettings/firebase.repository.js`
- `src/features/common/repositories/userModelSelections/firebase.repository.js`
- `src/features/ask/repositories/firebase.repository.js`
- `src/features/listen/summary/repositories/firebase.repository.js`
- `src/features/settings/repositories/firebase.repository.js`
- `src/features/listen/stt/repositories/firebase.repository.js`

---

## Firestore Converter

### `src/features/common/repositories/firestoreConverter.js`
- **What:** Provides encryption/decryption for Firestore data fields.
- **Why:** Ensures sensitive data is encrypted at rest in Firestore.
- **How:** Custom Firestore data converter using `encryptionService`.

---

## Web Frontend (Next.js)

### 1. `pickleglass_web/utils/firebase.ts`
- **What:** Initializes Firebase App, Auth, and Firestore for the web.
- **Why:** Provides singleton for use in React/Next.js.
- **How:** Uses `initializeApp`, `getAuth`, `getFirestore`.

### 2. `pickleglass_web/utils/auth.ts`
- **What:** React hook for auth state, user profile, and mode (local/firebase).
- **Why:** Syncs user state between Firebase and local app.
- **How:** Uses `onAuthStateChanged`, fetches user profile from Firestore.

### 3. `pickleglass_web/app/login/page.tsx`
- **What:** Handles Google sign-in with Firebase Auth, deep links back to Electron with ID token.
- **Why:** Provides login UI and logic for both web and Electron.
- **How:** Uses `signInWithPopup`, `getIdToken`, and Firestore for user role.

### 4. `pickleglass_web/utils/firestore.ts`
- **What:** Exports Firestore service classes for user, session, transcript, AI message, summary, and preset management.
- **Why:** Centralizes Firestore CRUD logic for frontend.
- **How:** Uses Firestore SDK methods for CRUD and batch operations.

### 5. `pickleglass_web/utils/useUserRole.ts`
- **What:** React hook to fetch user role from Firestore.
- **Why:** Used for role-based UI/logic.
- **How:** Uses `getDoc` on Firestore user document.

---

## Cloud Functions

### `functions/index.js`
- **What:** Implements a Cloud Function for exchanging Firebase ID token for a custom token (used in Electron login flow).
- **Why:** Securely bridges authentication between web and Electron.
- **How:** Uses `firebase-admin` to verify ID token and create custom token.

---

## Other

### `src/features/common/services/encryptionService.js`
- **What:** Handles encryption/decryption for Firestore data.
- **Why:** Protects sensitive user data.
- **How:** Used by Firestore converters in repositories.

### `src/features/common/services/databaseInitializer.js`
- **What:** Initializes local SQLite database.
- **Why:** Used for local mode (not directly Firebase, but interacts with migration logic).

---

## Summary
- All authentication, user/session/profile management, and business logic currently using Firebase/Firestore must be migrated to NextAuth and Express.
- All Firestore CRUD and query logic must be replaced with API calls to the new backend.
- Encryption and persistence logic must be ported to the new stack as needed. 