export {};

declare global {
  interface Window {
    electron?: {
      ipcRenderer: {
        on: (
          channel: string,
          listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void
        ) => void;
        send?: (channel: string, ...args: any[]) => void;
        removeAllListeners?: (channel: string) => void;
      };
    };
  }
}
