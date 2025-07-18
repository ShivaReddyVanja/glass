const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
    
    closeWindow: () => ipcRenderer.invoke('interview:close'),

    on: (channel, func) => {
      const validChannels = ['set-questions', 'additional-questions']; // <-- add here
      if (validChannels.includes(channel)) {
        ipcRenderer.on(channel, (event, ...args) => func(event, ...args));
      }
    },

    send: (channel, ...args) => {
      const validChannels = ['request-questions'];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, ...args);
      }
    },

    removeAllListeners: (channel) => {
      ipcRenderer.removeAllListeners(channel);
    }
  }
});


