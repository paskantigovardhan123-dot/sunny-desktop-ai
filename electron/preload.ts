import { contextBridge, ipcRenderer } from 'electron';
import { ElectronAPI } from '../src/types/electron.js';

const api: ElectronAPI = {
  isElectron: true,
  safeStorage: {
    saveKey: (key: string) => ipcRenderer.invoke('save-api-key', key),
    getKey: () => ipcRenderer.invoke('get-api-key'),
    removeKey: () => ipcRenderer.invoke('remove-api-key'),
    hasKey: () => ipcRenderer.invoke('has-api-key'),
  },
  system: {
    getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
    setAlwaysOnTop: (flag: boolean) => ipcRenderer.invoke('set-always-on-top', flag),
    setIgnoreMouseEvents: (ignore: boolean, forward?: boolean) => {
      ipcRenderer.send('set-ignore-mouse-events', ignore, forward);
      return Promise.resolve();
    },
    minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
    closeWindow: () => ipcRenderer.invoke('close-window'),
    setOpenAtLogin: (openAtLogin: boolean) => ipcRenderer.invoke('set-open-at-login', openAtLogin),
    getOpenAtLogin: () => ipcRenderer.invoke('get-open-at-login'),
    takeScreenshot: () => ipcRenderer.invoke('take-screenshot'),
  },
  agent: {
    runCommand: (command: string) => ipcRenderer.invoke('agent-run-command', command),
    readFile: (filePath: string) => ipcRenderer.invoke('agent-read-file', filePath),
    writeFile: (filePath: string, content: string) => ipcRenderer.invoke('agent-write-file', filePath, content),
    listDir: (dirPath: string) => ipcRenderer.invoke('agent-list-dir', dirPath),
    openAppOrUrl: (target: string) => ipcRenderer.invoke('agent-open-app-or-url', target),
    setReminder: (title: string, message: string, delayMs: number) =>
      ipcRenderer.invoke('agent-set-reminder', title, message, delayMs),
  },
  onTraySwitchCharacter: (callback: (characterId: string) => void) => {
    const handler = (_event: any, characterId: string) => callback(characterId);
    ipcRenderer.on('tray-switch-character', handler);
    return () => {
      ipcRenderer.removeListener('tray-switch-character', handler);
    };
  },
  onGlobalShortcut: (callback: (shortcut: string) => void) => {
    const handler = (_event: any, shortcut: string) => callback(shortcut);
    ipcRenderer.on('global-shortcut', handler);
    return () => {
      ipcRenderer.removeListener('global-shortcut', handler);
    };
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
