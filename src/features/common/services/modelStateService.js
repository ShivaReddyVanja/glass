const Store = require('electron-store');
const fetch = require('node-fetch');
const { EventEmitter } = require('events');
const { BrowserWindow } = require('electron');
const { PROVIDERS, getProviderClass } = require('../ai/factory');
const encryptionService = require('./encryptionService');
const providerSettingsRepository = require('../repositories/providerSettings');
const userModelSelectionsRepository = require('../repositories/userModelSelections');

// Import authService directly (singleton)
const authService = require('./nextAuthService');

class ModelStateService extends EventEmitter {
    constructor() {
        super();
        this.authService = authService;
        this.store = new Store({ name: 'pickle-glass-model-state' });
        this.state = {};
        this.hasMigrated = false;
    }

    // 모든 윈도우에 이벤트 브로드캐스트
    _broadcastToAllWindows(eventName, data = null) {
        BrowserWindow.getAllWindows().forEach(win => {
            if (win && !win.isDestroyed()) {
                if (data !== null) {
                    win.webContents.send(eventName, data);
                } else {
                    win.webContents.send(eventName);
                }
            }
        });
    }

    async initialize() {
        console.log('[ModelStateService] Initializing...');
        await this._loadStateForCurrentUser();
        console.log('[ModelStateService] Initialization complete');
    }

    _logCurrentSelection() {
        const llmModel = this.state.selectedModels.llm;
        const sttModel = this.state.selectedModels.stt;
        const llmProvider = this.getProviderForModel('llm', llmModel) || 'None';
        const sttProvider = this.getProviderForModel('stt', sttModel) || 'None';
    
        console.log(`[ModelStateService] Current Selection -> LLM: ${llmModel || 'None'} (Provider: ${llmProvider}), STT: ${sttModel || 'None'} (Provider: ${sttProvider})`);
    }

    _autoSelectAvailableModels(forceReselectionForTypes = []) {
        console.log(`[ModelStateService] Running auto-selection for models. Force re-selection for: [${forceReselectionForTypes.join(', ')}]`);
        const types = ['llm', 'stt'];

        types.forEach(type => {
            const currentModelId = this.state.selectedModels[type];
            let isCurrentModelValid = false;

            const forceReselection = forceReselectionForTypes.includes(type);

            if (currentModelId && !forceReselection) {
                const provider = this.getProviderForModel(type, currentModelId);
                const apiKey = this.getApiKey(provider);
                // For Ollama, 'local' is a valid API key
                if (provider && (apiKey || (provider === 'ollama' && apiKey === 'local'))) {
                    isCurrentModelValid = true;
                }
            }

            if (!isCurrentModelValid) {
                console.log(`[ModelStateService] No valid ${type.toUpperCase()} model selected or re-selection forced. Finding an alternative...`);
                const availableModels = this.getAvailableModels(type);
                if (availableModels.length > 0) {
                    // Prefer API providers over local providers for auto-selection
                    const apiModel = availableModels.find(model => {
                        const provider = this.getProviderForModel(type, model.id);
                        return provider && provider !== 'ollama' && provider !== 'whisper';
                    });
                    
                    const selectedModel = apiModel || availableModels[0];
                    this.state.selectedModels[type] = selectedModel.id;
                    console.log(`[ModelStateService] Auto-selected ${type.toUpperCase()} model: ${selectedModel.id} (preferred: ${apiModel ? 'API' : 'local'})`);
                } else {
                    this.state.selectedModels[type] = null;
                }
            }
        });
    }

    async _migrateFromElectronStore() {
        console.log('[ModelStateService] Starting migration from electron-store to database...');
        const userId = this.authService.getCurrentUserId();
        
        try {
            // Get data from electron-store
            const legacyData = this.store.get(`users.${userId}`, null);
            
            if (!legacyData) {
                console.log('[ModelStateService] No legacy data to migrate');
                return;
            }
            
            console.log('[ModelStateService] Found legacy data, migrating...');
            
            // Migrate provider settings (API keys and selected models per provider)
            const { apiKeys = {}, selectedModels = {} } = legacyData;
            
            for (const [provider, apiKey] of Object.entries(apiKeys)) {
                if (apiKey && PROVIDERS[provider]) {
                    // For encrypted keys, they are already decrypted in _loadStateForCurrentUser
                    await providerSettingsRepository.upsert(provider, {
                        api_key: apiKey
                    });
                    console.log(`[ModelStateService] Migrated API key for ${provider}`);
                }
            }
            
            // Migrate global model selections
            if (selectedModels.llm || selectedModels.stt) {
                const llmProvider = selectedModels.llm ? this.getProviderForModel('llm', selectedModels.llm) : null;
                const sttProvider = selectedModels.stt ? this.getProviderForModel('stt', selectedModels.stt) : null;
                
                await userModelSelectionsRepository.upsert({
                    selected_llm_provider: llmProvider,
                    selected_llm_model: selectedModels.llm,
                    selected_stt_provider: sttProvider,
                    selected_stt_model: selectedModels.stt
                });
                console.log('[ModelStateService] Migrated global model selections');
            }
            
            // Mark migration as complete by removing legacy data
            this.store.delete(`users.${userId}`);
            console.log('[ModelStateService] Migration completed and legacy data cleaned up');
            
        } catch (error) {
            console.error('[ModelStateService] Migration failed:', error);
            // Don't throw - continue with normal operation
        }
    }

    async _loadStateFromDatabase() {
        console.log('[ModelStateService] Loading state from database...');
        const userId = this.authService.getCurrentUserId();
        
        try {
            // Load provider settings
            const providerSettings = await providerSettingsRepository.getAllByUid();
            const apiKeys = {};
            
            // Reconstruct apiKeys object
            Object.keys(PROVIDERS).forEach(provider => {
                apiKeys[provider] = null;
            });
            
            for (const setting of providerSettings) {
                if (setting.api_key) {
                    // API keys are already decrypted by the repository layer
                    apiKeys[setting.provider] = setting.api_key;
                }
            }
            
            // Load global model selections
            const modelSelections = await userModelSelectionsRepository.get();
            const selectedModels = {
                llm: modelSelections?.selected_llm_model || null,
                stt: modelSelections?.selected_stt_model || null
            };
            
            this.state = {
                apiKeys,
                selectedModels
            };
            
            console.log(`[ModelStateService] State loaded from database for user: ${userId}`);
            
            // Auto-select available models after loading state
            this._autoSelectAvailableModels();
            
        } catch (error) {
            console.error('[ModelStateService] Failed to load state from database:', error);
            // Fall back to default state
            const initialApiKeys = Object.keys(PROVIDERS).reduce((acc, key) => {
                acc[key] = null;
                return acc;
            }, {});
            
            this.state = {
                apiKeys: initialApiKeys,
                selectedModels: { llm: null, stt: null },
            };
        }
    }

    async _loadStateForCurrentUser() {
        const userId = this.authService.getCurrentUserId();
        
        // Initialize encryption service for current user
        await encryptionService.initializeKey(userId);
        
        // Try to load from database first
        await this._loadStateFromDatabase();
        
        // Check if we need to migrate from electron-store
        const legacyData = this.store.get(`users.${userId}`, null);
        if (legacyData && !this.hasMigrated) {
            await this._migrateFromElectronStore();
            // Reload state after migration
            await this._loadStateFromDatabase();
            this.hasMigrated = true;
        }
        
        this._autoSelectAvailableModels();
        await this._saveState();
        this._logCurrentSelection();
    }

    async _saveState() {
        console.log('[ModelStateService] Saving state to database...');
        const userId = this.authService.getCurrentUserId();
        
        try {
            // Save provider settings (API keys)
            for (const [provider, apiKey] of Object.entries(this.state.apiKeys)) {
                if (apiKey) {
                    // API keys will be encrypted by the repository layer
                    await providerSettingsRepository.upsert(provider, {
                        api_key: apiKey
                    });
                } else {
                    // Remove empty API keys
                    await providerSettingsRepository.remove(provider);
                }
            }
            
            // Save global model selections
            const llmProvider = this.state.selectedModels.llm ? this.getProviderForModel('llm', this.state.selectedModels.llm) : null;
            const sttProvider = this.state.selectedModels.stt ? this.getProviderForModel('stt', this.state.selectedModels.stt) : null;
            
            if (llmProvider || sttProvider || this.state.selectedModels.llm || this.state.selectedModels.stt) {
                await userModelSelectionsRepository.upsert({
                    selected_llm_provider: llmProvider,
                    selected_llm_model: this.state.selectedModels.llm,
                    selected_stt_provider: sttProvider,
                    selected_stt_model: this.state.selectedModels.stt
                });
            }
            
            console.log(`[ModelStateService] State saved to database for user: ${userId}`);
            this._logCurrentSelection();
            
        } catch (error) {
            console.error('[ModelStateService] Failed to save state to database:', error);
            // Fall back to electron-store for now
            this._saveStateToElectronStore();
        }
    }

    _saveStateToElectronStore() {
        console.log('[ModelStateService] Falling back to electron-store...');
        const userId = this.authService.getCurrentUserId();
        const stateToSave = {
            ...this.state,
            apiKeys: { ...this.state.apiKeys }
        };
        
        for (const [provider, key] of Object.entries(stateToSave.apiKeys)) {
            if (key) {
                try {
                    stateToSave.apiKeys[provider] = encryptionService.encrypt(key);
                } catch (error) {
                    console.error(`[ModelStateService] Failed to encrypt API key for ${provider}`);
                    stateToSave.apiKeys[provider] = null;
                }
            }
        }
        
        this.store.set(`users.${userId}`, stateToSave);
        console.log(`[ModelStateService] State saved to electron-store for user: ${userId}`);
        this._logCurrentSelection();
    }

    async validateApiKey(provider, key) {
        if (!key || (key.trim() === '' && provider !== 'ollama' && provider !== 'whisper')) {
            return { success: false, error: 'API key cannot be empty.' };
        }

        const ProviderClass = getProviderClass(provider);

        if (!ProviderClass || typeof ProviderClass.validateApiKey !== 'function') {
            // Default to success if no specific validator is found
            console.warn(`[ModelStateService] No validateApiKey function for provider: ${provider}. Assuming valid.`);
                    return { success: true };
        }

        try {
            const result = await ProviderClass.validateApiKey(key);
            if (result.success) {
                console.log(`[ModelStateService] API key for ${provider} is valid.`);
            } else {
                console.log(`[ModelStateService] API key for ${provider} is invalid: ${result.error}`);
            }
            return result;
        } catch (error) {
            console.error(`[ModelStateService] Error during ${provider} key validation:`, error);
            return { success: false, error: 'An unexpected error occurred during validation.' };
        }
    }
    
    setFirebaseVirtualKey(virtualKey) {
        console.log(`[ModelStateService] Setting Firebase virtual key (for openai-glass).`);
        this.state.apiKeys['openai-glass'] = virtualKey;
        
        const llmModels = PROVIDERS['openai-glass']?.llmModels;
        const sttModels = PROVIDERS['openai-glass']?.sttModels;

        // When logging in with Pickle, prioritize Pickle's models over existing selections
        if (virtualKey && llmModels?.length > 0) {
            this.state.selectedModels.llm = llmModels[0].id;
            console.log(`[ModelStateService] Prioritized Pickle LLM model: ${llmModels[0].id}`);
        }
        if (virtualKey && sttModels?.length > 0) {
            this.state.selectedModels.stt = sttModels[0].id;
            console.log(`[ModelStateService] Prioritized Pickle STT model: ${sttModels[0].id}`);
        }
        
        // If logging out (virtualKey is null), run auto-selection to find alternatives
        if (!virtualKey) {
            this._autoSelectAvailableModels();
        }
        
        this._saveState();
        this._logCurrentSelection();
    }

    async setApiKey(provider, key) {
        console.log(`[ModelStateService] setApiKey: ${provider}`);
        if (!provider) {
            throw new Error('Provider is required');
        }
        
        // API keys will be encrypted by the repository layer
        this.state.apiKeys[provider] = key;
        await this._saveState();
        
        this._autoSelectAvailableModels([]);
        
        this._broadcastToAllWindows('model-state:updated', this.state);
        this._broadcastToAllWindows('settings-updated');
    }

    getApiKey(provider) {
        return this.state.apiKeys[provider];
    }

    getAllApiKeys() {
        const { 'openai-glass': _, ...displayKeys } = this.state.apiKeys;
        return displayKeys;
    }

    async removeApiKey(provider) {
        if (this.state.apiKeys[provider]) {
            this.state.apiKeys[provider] = null;
            await providerSettingsRepository.remove(provider);
            await this._saveState();
            this._autoSelectAvailableModels([]);
            this._broadcastToAllWindows('model-state:updated', this.state);
            this._broadcastToAllWindows('settings-updated');
            return true;
        }
        return false;
    }

    getProviderForModel(type, modelId) {
        if (!modelId) return null;
        for (const providerId in PROVIDERS) {
            const models = type === 'llm' ? PROVIDERS[providerId].llmModels : PROVIDERS[providerId].sttModels;
            if (models.some(m => m.id === modelId)) {
                return providerId;
            }
        }
        
        // If no provider was found, assume it could be a custom Ollama model
        // if Ollama provider is configured (has a key).
        if (type === 'llm' && this.state.apiKeys['ollama']) {
            console.log(`[ModelStateService] Model '${modelId}' not found in PROVIDERS list, assuming it's a custom Ollama model.`);
            return 'ollama';
        }

        return null;
    }

    getCurrentProvider(type) {
        const selectedModel = this.state.selectedModels[type];
        return this.getProviderForModel(type, selectedModel);
    }

    isLoggedInWithFirebase() {
        return this.authService.getCurrentUser().isLoggedIn;
    }

    areProvidersConfigured() {
        if (this.isLoggedInWithFirebase()) return true;
        
        console.log('[DEBUG] Checking configured providers with apiKeys state:', JSON.stringify(this.state.apiKeys, (key, value) => (value ? '***' : null), 2));

        // LLM과 STT 모델을 제공하는 Provider 중 하나라도 API 키가 설정되었는지 확인
        const hasLlmKey = Object.entries(this.state.apiKeys).some(([provider, key]) => {
            if (provider === 'ollama') {
                // Ollama uses dynamic models, so just check if configured (has 'local' key)
                return key === 'local';
            }
            if (provider === 'whisper') {
                // Whisper doesn't support LLM
                return false;
            }
            return key && PROVIDERS[provider]?.llmModels.length > 0;
        });
        
        const hasSttKey = Object.entries(this.state.apiKeys).some(([provider, key]) => {
            if (provider === 'whisper') {
                // Whisper has static model list and supports STT
                return key === 'local' && PROVIDERS[provider]?.sttModels.length > 0;
            }
            if (provider === 'ollama') {
                // Ollama doesn't support STT yet
                return false;
            }
            return key && PROVIDERS[provider]?.sttModels.length > 0;
        });
        
        const result = hasLlmKey && hasSttKey;
        console.log(`[ModelStateService] areProvidersConfigured: LLM=${hasLlmKey}, STT=${hasSttKey}, result=${result}`);
        return result;
    }

    hasValidApiKey() {
        if (this.isLoggedInWithFirebase()) return true;
        
        // Check if any provider has a valid API key
        return Object.entries(this.state.apiKeys).some(([provider, key]) => {
            if (provider === 'ollama' || provider === 'whisper') {
                return key === 'local';
            }
            return key && key.trim().length > 0;
        });
    }


    getAvailableModels(type) {
        const available = [];
        const modelList = type === 'llm' ? 'llmModels' : 'sttModels';

        for (const [providerId, key] of Object.entries(this.state.apiKeys)) {
            if (!key) continue;
            
            // Ollama의 경우 데이터베이스에서 설치된 모델을 가져오기
            if (providerId === 'ollama' && type === 'llm') {
                try {
                    const ollamaModelRepository = require('../repositories/ollamaModel');
                    const installedModels = ollamaModelRepository.getInstalledModels();
                    const ollamaModels = installedModels.map(model => ({
                        id: model.name,
                        name: model.name
                    }));
                    available.push(...ollamaModels);
                } catch (error) {
                    console.warn('[ModelStateService] Failed to get Ollama models from DB:', error.message);
                }
            }
            // Whisper의 경우 정적 모델 목록 사용 (설치 상태는 별도 확인)
            else if (providerId === 'whisper' && type === 'stt') {
                // Whisper 모델은 factory.js의 정적 목록 사용
                if (PROVIDERS[providerId]?.[modelList]) {
                    available.push(...PROVIDERS[providerId][modelList]);
                }
            }
            // 다른 provider들은 기존 로직 사용
            else if (PROVIDERS[providerId]?.[modelList]) {
                available.push(...PROVIDERS[providerId][modelList]);
            }
        }
        
        return [...new Map(available.map(item => [item.id, item])).values()];
    }
    
    getSelectedModels() {
        return this.state.selectedModels;
    }
    
    setSelectedModel(type, modelId) {
        const availableModels = this.getAvailableModels(type);
        const isAvailable = availableModels.some(model => model.id === modelId);
        
        if (!isAvailable) {
            console.warn(`[ModelStateService] Model ${modelId} is not available for type ${type}`);
            return false;
        }
        
        const previousModelId = this.state.selectedModels[type];
        this.state.selectedModels[type] = modelId;
        this._saveState();
        
        console.log(`[ModelStateService] Selected ${type} model: ${modelId} (was: ${previousModelId})`);
        
        // Auto warm-up for Ollama models
        if (type === 'llm' && modelId && modelId !== previousModelId) {
            const provider = this.getProviderForModel('llm', modelId);
            if (provider === 'ollama') {
                this._autoWarmUpOllamaModel(modelId, previousModelId);
            }
        }
        
        this._broadcastToAllWindows('model-state:updated', this.state);
        this._broadcastToAllWindows('settings-updated');
        return true;
    }

    /**
     * Auto warm-up Ollama model when LLM selection changes
     * @private
     * @param {string} newModelId - The newly selected model
     * @param {string} previousModelId - The previously selected model
     */
    async _autoWarmUpOllamaModel(newModelId, previousModelId) {
        try {
            console.log(`[ModelStateService] LLM model changed: ${previousModelId || 'None'} → ${newModelId}, triggering warm-up`);
            
            // Get Ollama service if available
            const ollamaService = require('./ollamaService');
            if (!ollamaService) {
                console.log('[ModelStateService] OllamaService not available for auto warm-up');
                return;
            }

            // Delay warm-up slightly to allow UI to update first
            setTimeout(async () => {
                try {
                    console.log(`[ModelStateService] Starting background warm-up for: ${newModelId}`);
                    const success = await ollamaService.warmUpModel(newModelId);
                    
                    if (success) {
                        console.log(`[ModelStateService] Successfully warmed up model: ${newModelId}`);
                    } else {
                        console.log(`[ModelStateService] Failed to warm up model: ${newModelId}`);
                    }
                } catch (error) {
                    console.log(`[ModelStateService] Error during auto warm-up for ${newModelId}:`, error.message);
                }
            }, 500); // 500ms delay
            
        } catch (error) {
            console.error('[ModelStateService] Error in auto warm-up setup:', error);
        }
    }

    getProviderConfig() {
        const serializableProviders = {};
        for (const key in PROVIDERS) {
            const { handler, ...rest } = PROVIDERS[key];
            serializableProviders[key] = rest;
        }
        return serializableProviders;
    }

    async handleValidateKey(provider, key) {
        const result = await this.validateApiKey(provider, key);
        if (result.success) {
            // Use 'local' as placeholder for local services
            const finalKey = (provider === 'ollama' || provider === 'whisper') ? 'local' : key;
            await this.setApiKey(provider, finalKey);
        }
        return result;
    }

    async handleRemoveApiKey(provider) {
        console.log(`[ModelStateService] handleRemoveApiKey: ${provider}`);
        const success = await this.removeApiKey(provider);
        if (success) {
            const selectedModels = this.getSelectedModels();
            if (!selectedModels.llm || !selectedModels.stt) {
                this._broadcastToAllWindows('force-show-apikey-header');
            }
        }
        return success;
    }

    async handleSetSelectedModel(type, modelId) {
        return this.setSelectedModel(type, modelId);
    }

    /**
     * 
     * @param {('llm' | 'stt')} type
     * @returns {{provider: string, model: string, apiKey: string} | null}
     */
    getCurrentModelInfo(type) {
        this._logCurrentSelection();
        const model = this.state.selectedModels[type];
        if (!model) {
            return null; 
        }
        
        const provider = this.getProviderForModel(type, model);
        if (!provider) {
            return null;
        }

        const apiKey = this.getApiKey(provider);
        return { provider, model, apiKey };
    }
    
}

// Export singleton instance
const modelStateService = new ModelStateService();
module.exports = modelStateService;