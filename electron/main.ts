import {
  app,
  BrowserWindow,
  ipcMain,
  safeStorage,
  Tray,
  Menu,
  globalShortcut,
  shell,
  desktopCapturer,
  Notification,
} from 'electron';
import path from 'path';
import fs from 'fs';
import { exec, spawn } from 'child_process';
import { validateCommandSafety, validateWriteSafety } from '../src/utils/safety.js';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const SECURE_STORE_PATH = path.join(app.getPath('userData'), 'sunny_credential.enc');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 640,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: true,
    hasShadow: false,
    skipTaskbar: false,
    webPreferences: {
      preload: fs.existsSync(path.join(__dirname, 'preload.cjs'))
        ? path.join(__dirname, 'preload.cjs')
        : path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Load Vite dev server in development or built index.html in production
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Handle click-through on transparent areas
  ipcMain.on('set-ignore-mouse-events', (event, ignore: boolean, forward?: boolean) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.setIgnoreMouseEvents(ignore, { forward: forward ?? true });
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '../public/icon.svg');
  // Fallback to bundled icon
  try {
    tray = new Tray(iconPath);
  } catch (err) {
    console.warn('Tray icon fallback:', err);
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show/Hide Sunny',
      click: () => {
        if (!mainWindow) return;
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: 'Summon Chat (Ctrl+Alt+S)',
      click: () => {
        if (!mainWindow) return;
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('global-shortcut', 'summon-chat');
      },
    },
    { type: 'separator' },
    {
      label: 'Switch Companion',
      submenu: [
        {
          label: '☀️ Sunny (Cheerful)',
          click: () => mainWindow?.webContents.send('tray-switch-character', 'sunny'),
        },
        {
          label: '🌐 Nova (Cybernetic)',
          click: () => mainWindow?.webContents.send('tray-switch-character', 'nova'),
        },
        {
          label: '🌿 Kaito (Tranquil)',
          click: () => mainWindow?.webContents.send('tray-switch-character', 'kaito'),
        },
        {
          label: '⚡ Atlas (Tactical)',
          click: () => mainWindow?.webContents.send('tray-switch-character', 'atlas'),
        },
      ],
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => mainWindow?.webContents.send('global-shortcut', 'open-settings'),
    },
    {
      label: 'Quit Sunny',
      click: () => {
        app.quit();
      },
    },
  ]);

  if (tray) {
    tray.setToolTip('Sunny - 3D AI Desktop Companion');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => {
      mainWindow?.show();
      mainWindow?.focus();
    });
  }
}

// Register SafeStorage IPC
ipcMain.handle('save-api-key', async (_event, apiKey: string) => {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      // Fallback base64 encryption
      fs.writeFileSync(SECURE_STORE_PATH, Buffer.from(apiKey).toString('base64'), 'utf-8');
      return true;
    }
    const encrypted = safeStorage.encryptString(apiKey);
    fs.writeFileSync(SECURE_STORE_PATH, encrypted);
    return true;
  } catch (err) {
    console.error('SafeStorage save error:', err);
    return false;
  }
});

ipcMain.handle('get-api-key', async () => {
  try {
    if (!fs.existsSync(SECURE_STORE_PATH)) return null;
    const fileBuffer = fs.readFileSync(SECURE_STORE_PATH);
    if (!safeStorage.isEncryptionAvailable()) {
      return Buffer.from(fileBuffer.toString('utf-8'), 'base64').toString('utf-8');
    }
    return safeStorage.decryptString(fileBuffer);
  } catch (err) {
    console.error('SafeStorage get error:', err);
    return null;
  }
});

ipcMain.handle('remove-api-key', async () => {
  try {
    if (fs.existsSync(SECURE_STORE_PATH)) {
      fs.unlinkSync(SECURE_STORE_PATH);
    }
    return true;
  } catch (err) {
    console.error('SafeStorage remove error:', err);
    return false;
  }
});

ipcMain.handle('has-api-key', async () => {
  return fs.existsSync(SECURE_STORE_PATH);
});

// System & Window Controls
ipcMain.handle('get-system-info', async () => {
  return {
    platform: process.platform,
    arch: process.arch,
    version: app.getVersion(),
    isElectron: true,
  };
});

ipcMain.handle('set-always-on-top', async (_event, flag: boolean) => {
  mainWindow?.setAlwaysOnTop(flag);
});

ipcMain.handle('minimize-window', async () => {
  mainWindow?.minimize();
});

ipcMain.handle('close-window', async () => {
  mainWindow?.close();
});

ipcMain.handle('set-open-at-login', async (_event, openAtLogin: boolean) => {
  app.setLoginItemSettings({ openAtLogin });
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle('get-open-at-login', async () => {
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle('take-screenshot', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 },
    });
    if (sources.length > 0) {
      return sources[0].thumbnail.toDataURL();
    }
    throw new Error('No screen display detected');
  } catch (err: any) {
    throw new Error(`Screen capture failed: ${err.message}`);
  }
});

// Agent Tool Execution IPC with strict safety checks
ipcMain.handle('agent-run-command', async (_event, command: string) => {
  // Enforce safety rules
  const check = validateCommandSafety(command);
  if (check.blocked) {
    throw new Error(`SECURITY BLOCK: ${check.reason}`);
  }

  return new Promise((resolve, reject) => {
    // Windows PowerShell execution
    const psCommand = process.platform === 'win32'
      ? `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "${command.replace(/"/g, '`"')}"`
      : command;

    exec(psCommand, { timeout: 30000, maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
      resolve({
        stdout: stdout || '',
        stderr: stderr || (error ? error.message : ''),
        exitCode: error && typeof error.code === 'number' ? error.code : 0,
      });
    });
  });
});

ipcMain.handle('agent-read-file', async (_event, filePath: string) => {
  const content = await fs.promises.readFile(filePath, 'utf-8');
  return { content, size: content.length };
});

ipcMain.handle('agent-write-file', async (_event, filePath: string, content: string) => {
  const check = validateWriteSafety(filePath, content);
  if (check.blocked) {
    throw new Error(`SECURITY BLOCK: ${check.reason}`);
  }

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    await fs.promises.mkdir(dir, { recursive: true });
  }
  await fs.promises.writeFile(filePath, content, 'utf-8');
  return { success: true, bytesWritten: Buffer.byteLength(content, 'utf-8') };
});

ipcMain.handle('agent-list-dir', async (_event, dirPath: string) => {
  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
  return entries.map((entry) => ({
    name: entry.name,
    isDirectory: entry.isDirectory(),
    size: 0,
  }));
});

ipcMain.handle('agent-open-app-or-url', async (_event, target: string) => {
  if (target.startsWith('http://') || target.startsWith('https://')) {
    await shell.openExternal(target);
    return { success: true };
  } else {
    // Open application
    spawn(target, { detached: true, shell: true });
    return { success: true };
  }
});

ipcMain.handle('agent-set-reminder', async (_event, title: string, message: string, delayMs: number) => {
  setTimeout(() => {
    new Notification({
      title: `Sunny Reminder: ${title}`,
      body: message,
    }).show();
  }, Math.max(1000, delayMs));
  return { success: true };
});

// App Lifecycle
app.whenReady().then(() => {
  createWindow();
  createTray();

  // Register Global Hotkey (Ctrl+Alt+S)
  globalShortcut.register('CommandOrControl+Alt+S', () => {
    if (!mainWindow) return;
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('global-shortcut', 'summon-chat');
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
