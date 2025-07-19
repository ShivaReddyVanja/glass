// src/bridge/featureBridge.js
const { ipcMain, app, BrowserWindow } = require('electron');
const path = require('path');
const pdfParse = require('pdf-parse');
const { createLLM } = require('../features/common/ai/factory');
const settingsService = require('../features/settings/settingsService');
const nextAuthService = require('../features/common/services/nextAuthService');
const whisperService = require('../features/common/services/whisperService');
const ollamaService = require('../features/common/services/ollamaService');
const modelStateService = require('../features/common/services/modelStateService');
const shortcutsService = require('../features/shortcuts/shortcutsService');
const presetRepository = require('../features/common/repositories/preset');
const { windowPool } = require('../window/windowManager');

const askService = require('../features/ask/askService');
const listenService = require('../features/listen/listenService');
const permissionService = require('../features/common/services/permissionService');
const windowManager = require('./../window/windowManager');
const internalBridge = require('./internalBridge')

let interviewQuestionsWindow = null;

ipcMain.handle('window:setWindowVisibility', async (_, { name, visible }) => {
  return handleWindowVisibilityRequest(windowPool, layoutManager, movementManager, name, visible);
});


ipcMain.handle('mainHeader:openInterviewWindow', async () => {
  try {
    const win = windowPool.get('interview-window');

    if (win && !win.isDestroyed()) {
      const isVisible = win.isVisible();

      if (isVisible) {
        
        internalBridge.emit('window:requestVisibility', {
          name: 'interview-window',
          visible: false,
        });

        return { success: true, closed: true };
      } else {
        console.log('[DEBUG] Interview window exists but hidden — showing it');
        internalBridge.emit('window:requestVisibility', {
          name: 'interview-window',
          visible: true,
        });

        win.focus();
        return { success: true, opened: true };
      }
    } else {
      console.log('[DEBUG] Interview window not found — maybe not created yet');
      return { success: false, error: 'Interview window not created' };
    }
  } catch (err) {
    console.error('[ERROR] interview:openInterviewWindow', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('interview:close', () => {
  const win = windowPool.get('interview-window');
  if (win && !win.isDestroyed()) {
    win.close(); // Or win.hide()
    return { success: true };
  } else {
    return { success: false, error: 'Window not found or already destroyed' };
  }
});




ipcMain.handle('mainHeader:showInterviewQuestionsWindow', async (event, questions) => {
  try {
    // Use the window pool and visibility system
    internalBridge.emit('window:requestVisibility', { name: 'pdf-questions', visible: true });

    // Get the window and send questions
    const win = windowPool.get('pdf-questions');
    if (win && !win.isDestroyed()) {
      // Wait a bit for window to be ready, then send questions
      setTimeout(() => {
        win.webContents.send('set-questions', questions);
      }, 200);
    }
  } catch (err) {
    console.error('[mainHeader:showInterviewQuestionsWindow] Failed:', err);
  }
});

// Relay questions to the main content window
ipcMain.handle('mainHeader:showQuestionsInContentWindow', async (event, questions) => {
  try {
    // Find the main content window (adjust the key if needed)
    const mainWindow = windowPool.get('main') || windowPool.get('content') || BrowserWindow.getAllWindows().find(w => w.title === 'Pickle Glass' || w.webContents.getURL().includes('content.html'));
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('show-questions-view', questions);
    } else {
      console.error('[showQuestionsInContentWindow] Main content window not found.');
    }
  } catch (err) {
    console.error('[showQuestionsInContentWindow] Error relaying questions:', err);
  }
});

ipcMain.handle('mainHeader:openPdfQuestionsWindow', async (_, questions) => {
  windowManager.openWindow('pdf-questions', questions);
});


module.exports = {
  // Renderer로부터의 요청을 수신하고 서비스로 전달
  initialize() {
    // Settings Service
    ipcMain.handle('settings:getPresets', async () => await settingsService.getPresets());
    ipcMain.handle('settings:get-auto-update', async () => await settingsService.getAutoUpdateSetting());
    ipcMain.handle('settings:set-auto-update', async (event, isEnabled) => await settingsService.setAutoUpdateSetting(isEnabled));
    ipcMain.handle('settings:get-model-settings', async () => await settingsService.getModelSettings());
    ipcMain.handle('settings:validate-and-save-key', async (e, { provider, key }) => await settingsService.validateAndSaveKey(provider, key));
    ipcMain.handle('settings:clear-api-key', async (e, { provider }) => await settingsService.clearApiKey(provider));
    ipcMain.handle('settings:set-selected-model', async (e, { type, modelId }) => await settingsService.setSelectedModel(type, modelId));

    ipcMain.handle('settings:get-ollama-status', async () => await settingsService.getOllamaStatus());
    ipcMain.handle('settings:ensure-ollama-ready', async () => await settingsService.ensureOllamaReady());
    ipcMain.handle('settings:shutdown-ollama', async () => await settingsService.shutdownOllama());

    // Shortcuts
    ipcMain.handle('settings:getCurrentShortcuts', async () => await shortcutsService.loadKeybinds());
    ipcMain.handle('shortcut:getDefaultShortcuts', async () => await shortcutsService.handleRestoreDefaults());
    ipcMain.handle('shortcut:closeShortcutSettingsWindow', async () => await shortcutsService.closeShortcutSettingsWindow());
    ipcMain.handle('shortcut:openShortcutSettingsWindow', async () => await shortcutsService.openShortcutSettingsWindow());
    ipcMain.handle('shortcut:saveShortcuts', async (event, newKeybinds) => await shortcutsService.handleSaveShortcuts(newKeybinds));
    ipcMain.handle('shortcut:toggleAllWindowsVisibility', async () => await shortcutsService.toggleAllWindowsVisibility());

    // Permissions
    ipcMain.handle('check-system-permissions', async () => await permissionService.checkSystemPermissions());
    ipcMain.handle('request-microphone-permission', async () => await permissionService.requestMicrophonePermission());
    ipcMain.handle('open-system-preferences', async (event, section) => await permissionService.openSystemPreferences(section));
    ipcMain.handle('mark-permissions-completed', async () => await permissionService.markPermissionsAsCompleted());
    ipcMain.handle('check-permissions-completed', async () => await permissionService.checkPermissionsCompleted());

    // User/Auth
    ipcMain.handle('get-current-user', () => nextAuthService.getCurrentUser());
    ipcMain.handle('start-nextauth-auth', async () => await nextAuthService.startNextAuthFlow());
    ipcMain.handle('nextauth-logout', async () => await nextAuthService.signOut());

    // App
    ipcMain.handle('quit-application', () => app.quit());

    // Whisper
    ipcMain.handle('whisper:download-model', async (event, modelId) => await whisperService.handleDownloadModel(modelId));
    ipcMain.handle('whisper:get-installed-models', async () => await whisperService.handleGetInstalledModels());

    // General
    ipcMain.handle('get-preset-templates', () => presetRepository.getPresetTemplates());
    ipcMain.handle('get-web-url', () => process.env.pickleglass_WEB_URL || 'http://localhost:3000');

    // Ollama
    ipcMain.handle('ollama:get-status', async () => await ollamaService.handleGetStatus());
    ipcMain.handle('ollama:install', async () => await ollamaService.handleInstall());
    ipcMain.handle('ollama:start-service', async () => await ollamaService.handleStartService());
    ipcMain.handle('ollama:ensure-ready', async () => await ollamaService.handleEnsureReady());
    ipcMain.handle('ollama:get-models', async () => await ollamaService.handleGetModels());
    ipcMain.handle('ollama:get-model-suggestions', async () => await ollamaService.handleGetModelSuggestions());
    ipcMain.handle('ollama:pull-model', async (event, modelName) => await ollamaService.handlePullModel(modelName));
    ipcMain.handle('ollama:is-model-installed', async (event, modelName) => await ollamaService.handleIsModelInstalled(modelName));
    ipcMain.handle('ollama:warm-up-model', async (event, modelName) => await ollamaService.handleWarmUpModel(modelName));
    ipcMain.handle('ollama:auto-warm-up', async () => await ollamaService.handleAutoWarmUp());
    ipcMain.handle('ollama:get-warm-up-status', async () => await ollamaService.handleGetWarmUpStatus());
    ipcMain.handle('ollama:shutdown', async (event, force = false) => await ollamaService.handleShutdown(force));

    // Ask
    ipcMain.handle('ask:sendQuestionFromAsk', async (event, userPrompt) => await askService.sendMessage(userPrompt));
    ipcMain.handle('ask:sendQuestionFromSummary', async (event, userPrompt) => await askService.sendMessage(userPrompt));
    ipcMain.handle('ask:toggleAskButton', async () => await askService.toggleAskButton());
    ipcMain.handle('ask:closeAskWindow', async () => await askService.closeAskWindow());

    // Listen
    ipcMain.handle('listen:sendMicAudio', async (event, { data, mimeType }) => await listenService.handleSendMicAudioContent(data, mimeType));
    ipcMain.handle('listen:sendSystemAudio', async (event, { data, mimeType }) => {
      const result = await listenService.sttService.sendSystemAudioContent(data, mimeType);
      if (result.success) {
        listenService.sendToRenderer('system-audio-data', { data });
      }
      return result;
    });
    ipcMain.handle('listen:startMacosSystemAudio', async () => await listenService.handleStartMacosAudio());
    ipcMain.handle('listen:stopMacosSystemAudio', async () => await listenService.handleStopMacosAudio());
    ipcMain.handle('update-google-search-setting', async (event, enabled) => await listenService.handleUpdateGoogleSearchSetting(enabled));
    ipcMain.handle('listen:changeSession', async (event, listenButtonText) => {
      console.log('[FeatureBridge] listen:changeSession from mainheader', listenButtonText);
      try {
        await listenService.handleListenRequest(listenButtonText);
        return { success: true };
      } catch (error) {
        console.error('[FeatureBridge] listen:changeSession failed', error.message);
        return { success: false, error: error.message };
      }
    });

    // ModelStateService
    ipcMain.handle('model:validate-key', async (e, { provider, key }) => await modelStateService.handleValidateKey(provider, key));
    ipcMain.handle('model:get-all-keys', () => modelStateService.getAllApiKeys());
    ipcMain.handle('model:set-api-key', async (e, { provider, key }) => await modelStateService.setApiKey(provider, key));
    ipcMain.handle('model:remove-api-key', async (e, provider) => await modelStateService.handleRemoveApiKey(provider));
    ipcMain.handle('model:get-selected-models', () => modelStateService.getSelectedModels());
    ipcMain.handle('model:set-selected-model', async (e, { type, modelId }) => await modelStateService.handleSetSelectedModel(type, modelId));
    ipcMain.handle('model:get-available-models', (e, { type }) => modelStateService.getAvailableModels(type));
    ipcMain.handle('model:are-providers-configured', () => modelStateService.areProvidersConfigured());
    ipcMain.handle('model:get-provider-config', () => modelStateService.getProviderConfig());

    // PDF Resume Upload
    let storedResumeText = '';

    // Handle PDF upload from interview window
    ipcMain.handle('interview:uploadResumePdf', async (event, { buffer, name }) => {
      try {
        if (!buffer) throw new Error('No PDF buffer provided');

        // Convert buffer to Node.js Buffer if needed
        const nodeBuffer = Buffer.from(buffer);
        const data = await pdfParse(nodeBuffer);
        const resumeText = data.text;

        // Store resume text for generating more questions
        storedResumeText = resumeText;

        // Get current LLM provider and API key
        const llmModelId = modelStateService.state.selectedModels.llm;
        const llmProvider = modelStateService.getProviderForModel('llm', llmModelId);
        const apiKey = modelStateService.getApiKey(llmProvider);

        if (!llmProvider || !apiKey) {
          return { success: false, error: 'No LLM provider or API key configured.' };
        }

        const llm = createLLM(llmProvider, { apiKey, model: llmModelId });

        const prompt = [
          'You are an expert technical interviewer. Read the following resume and generate 10 interview preparation questions tailored to the candidate. Format as a numbered list.\n\nResume:\n',
          resumeText
        ];

        const result = await llm.generateContent(prompt);
        const questions = result.response.text();

        // Send questions to the interview window
        const win = windowPool.get('interview-window');
        if (win && !win.isDestroyed()) {
          win.webContents.send('set-questions', questions);
        }

        return {
          success: true,
          questions,
          text: resumeText,
          info: {
            numpages: data.numpages,
            numrender: data.numrender,
            info: data.info,
            metadata: data.metadata,
            version: data.version
          }
        };
      } catch (err) {
        console.error('[interview:uploadResumePdf] Failed to parse PDF:', err);
        return { success: false, error: err.message };
      }
    });

    // Handle generate more questions
    ipcMain.handle('interview:generateMoreQuestions', async (event) => {
      try {
        if (!storedResumeText) {
          return { success: false, error: 'No resume data available. Please upload a resume first.' };
        }

        // Get current LLM provider and API key
        const llmModelId = modelStateService.state.selectedModels.llm;
        const llmProvider = modelStateService.getProviderForModel('llm', llmModelId);
        const apiKey = modelStateService.getApiKey(llmProvider);

        if (!llmProvider || !apiKey) {
          return { success: false, error: 'No LLM provider or API key configured.' };
        }

        const llm = createLLM(llmProvider, { apiKey, model: llmModelId });

        const prompt = [
          'You are an expert technical interviewer. Based on the following resume, generate 5 additional unique interview preparation questions that are different from typical questions but still relevant to the candidate. Focus on deeper technical concepts, problem-solving scenarios, and leadership/collaboration aspects. Format as a numbered list.\n\nResume:\n',
          storedResumeText
        ];
        console.log("[LLM] Sending prompt to model");
        const result = await llm.generateContent(prompt);
        console.log("[LLM] Received response");
        const additionalQuestions = result.response.text();
       
        // Send additional questions to the interview window
        const win = windowPool.get('interview-window');
        if (win && !win.isDestroyed()) {
          console.log("sent interview additional questions",additionalQuestions);
          win.webContents.send('additional-questions', additionalQuestions);
        }

        return { success: true, questions: additionalQuestions };
      } catch (err) {
        console.error('[interview:generateMoreQuestions] Failed to generate more questions:', err);
        return { success: false, error: err.message };
      }
    });


    console.log('[FeatureBridge] Initialized with all feature handlers.');
  },



  // Renderer로 상태를 전송
  sendAskProgress(win, progress) {
    win.webContents.send('feature:ask:progress', progress);
  },
};