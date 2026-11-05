export interface SystemInfo {
  platform: string;
  arch: string;
  version: string;
  isElectron: boolean;
}

export interface ElectronAPI {
  isElectron: boolean;
  safeStorage: {
    saveKey: (key: string) => Promise<boolean>;
    getKey: () => Promise<string | null>;
    removeKey: () => Promise<boolean>;
    hasKey: () => Promise<boolean>;
  };
  system: {
    getSystemInfo: () => Promise<SystemInfo>;
    setAlwaysOnTop: (flag: boolean) => Promise<void>;
    setIgnoreMouseEvents: (ignore: boolean, forward?: boolean) => Promise<void>;
    minimizeWindow: () => Promise<void>;
    closeWindow: () => Promise<void>;
    setOpenAtLogin: (openAtLogin: boolean) => Promise<boolean>;
    getOpenAtLogin: () => Promise<boolean>;
    takeScreenshot: () => Promise<string>; // base64 PNG data URL
  };
  agent: {
    runCommand: (command: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
    readFile: (filePath: string) => Promise<{ content: string; size: number }>;
    writeFile: (filePath: string, content: string) => Promise<{ success: boolean; bytesWritten: number }>;
    listDir: (dirPath: string) => Promise<Array<{ name: string; isDirectory: boolean; size: number }>>;
    openAppOrUrl: (target: string) => Promise<{ success: boolean }>;
    setReminder: (title: string, message: string, delayMs: number) => Promise<{ success: boolean }>;
  };
  onTraySwitchCharacter: (callback: (characterId: string) => void) => () => void;
  onGlobalShortcut: (callback: (shortcut: string) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
