# ☀️ Sunny — 3D AI Desktop Companion & Agent

A high-performance Windows desktop application built with **Electron**, **Vite**, **TypeScript**, **Three.js** with `@pixiv/three-vrm`, and the **@google/genai** SDK.

Sunny gives you a floating, interactive 3D desktop companion with voice interaction, autonomous agent capabilities, and a first-class safety subsystem that enforces user confirmation and hard-blocks destructive terminal commands.

---

## ✨ Features

- **Floating Transparent 3D Avatar Window**:
  - Borderless, draggable, always-on-top, and non-intrusive on your workspace.
  - Natural idle breathing, eye-tracking cursor look-at, randomized natural eye blinking, and expressive emotions (`happy`, `sad`, `surprised`, `thinking`, `relaxed`).
  - Real-time speech lip-sync visemes (`aa`, `ih`, `oh`) synced to text-to-speech output.
- **First Launch Security Flow**:
  - Secure first-launch wizard requiring the user's personal Google Gemini API key.
  - Real-time API key validation test against Google Gemini before allowing entry.
  - Hardware encryption via **Electron `safeStorage`** (Windows DPAPI / AES-GCM). Keys are never logged or stored in plain text.
  - In-app "Change API key" and "Remove key" controls in Settings.
- **4 Distinct Companions (2 Female, 2 Male)**:
  - **☀️ Sunny** (Female): Energetic, cheerful, highly organized daily companion (Pitch: 1.25x).
  - **🌐 Nova** (Female): Analytical, sleek cybernetic software engineer & researcher (Pitch: 1.05x).
  - **🌿 Kaito** (Male): Tranquil creative mentor, philosopher, and strategic thinker (Pitch: 0.90x).
  - **⚡ Atlas** (Male): Tactical executive assistant and high-efficiency systems operator (Pitch: 0.80x).
  - Isolated per-character conversation memories and editable personality prompts.
- **Custom VRM Support**:
  - Import any custom `.vrm` 0.0 or 1.0 avatar model from VRoid Studio or Blender.
- **Multimodal & Voice Input/Output**:
  - Push-to-Talk voice recognition (STT) and voice synthesis (TTS) tuned per character.
  - Paste images, drag-and-drop, or click "Capture Screen" to pass desktop screenshots directly to Gemini.
- **Autonomous Agent Mode with Strict Safety Rules**:
  - Built-in tools: `run_command` (PowerShell), `read_file`, `write_file`, `list_dir`, `open_app_or_url`, `web_search`, `fetch_url`, `take_screenshot`, and `set_reminder`.
  - **Mandatory Confirmation**: Every `run_command` and `write_file` shows a dialog with the exact command or file diff, requiring user Approve / Deny.
  - **Hard-Block Rule**: Destructive actions (disk formatting, recursive root deletion, registry deletes, disabling security/firewall tools) are blocked at the engine level even if approved.
  - **Activity Log**: Full audit log tracking every tool execution with timestamps, arguments, approval status, and output.
  - **Instant Cancellation**: Visible "Agent working" indicator with an immediate Stop button.
- **Windows Integration**:
  - Global Hotkey (`Ctrl+Alt+S`) to summon or dismiss the companion chat from anywhere in Windows.
  - System Tray icon with quick character switcher, chat summon, and settings.
  - Optional "Start with Windows" autostart configuration.

---

## 🏗️ Architecture

```
/
├── electron/
│   ├── main.ts            # Electron main process (transparent window, tray, global shortcuts, safeStorage, PowerShell executor)
│   ├── preload.ts         # Typed contextBridge exposing window.electronAPI
│   └── safety.ts          # Central security policies and pattern detection
├── src/
│   ├── types/             # TypeScript declarations (electron.d.ts, character.ts, agent.ts, chat.ts)
│   ├── utils/
│   │   ├── safety.ts      # Command blocklist and validation logic
│   │   ├── safety.test.ts # Node:test unit tests for security rules
│   │   ├── storage.ts     # SafeStorage encryption bridge
│   │   ├── gemini.ts      # @google/genai streaming, key validation & tool declarations
│   │   └── tts.ts         # Speech synthesis and Push-to-Talk recognition
│   ├── vrm/
│   │   ├── avatarScene.ts # Three.js WebGL controller and VRMLoaderPlugin
│   │   └── proceduralAvatar.ts # Procedural 3D anime avatars with expression blendshapes & visemes
│   ├── components/        # SetupModal, AvatarCanvas, ChatDrawer, ConfirmationModal, SettingsModal, AgentLogDrawer
│   ├── App.tsx            # Application coordinator and event bus
│   └── main.tsx           # React entry point
├── electron-builder.yml   # Windows NSIS per-user installer configuration
└── package.json
```

---

## 🛡️ Safety Blocklist Policy

Sunny enforces a strict, non-bypassable blocklist for host system operations. The following patterns are hard-blocked immediately:

| Category | Blocked Command Patterns | Rationale |
|---|---|---|
| **Drive Formatting** | `format C:`, `format /fs`, `diskpart clean`, `mkfs` | Prevents disk clobbering |
| **Root Deletion** | `rm -rf /`, `Remove-Item -Recurse C:\*`, `del /s /q C:\` | Protects filesystem root |
| **Registry Tampering** | `reg delete HKLM\...`, `Remove-ItemProperty HKLM:...` | Protects OS stability |
| **Disabling Security** | `DisableRealtimeMonitoring`, `net stop WinDefend`, `netsh advfirewall set allprofiles state off` | Prevents security bypass |
| **System Paths Write** | `C:\Windows\System32\...`, `/etc/...` | Protects system configuration |

---

## 📜 3D VRM Avatars & License Attributions

Sunny bundles 3D procedural avatars and supports open-source VRM specifications:

1. **Sunny, Nova, Kaito & Atlas Procedural Avatars**:
   - Original 3D meshes, bone hierarchies, materials, and blendshapes created specifically for the Sunny Desktop Companion.
   - **License**: CC0 1.0 Universal (Public Domain Dedication) / MIT.
2. **VRM / @pixiv/three-vrm**:
   - Developed by the VRM Consortium and Pixiv Inc.
   - **License**: MIT License ([GitHub: pixiv/three-vrm](https://github.com/pixiv/three-vrm)).
3. **UniVRM & VRoid Hub Permissive / CC0 Community Models**:
   - Sunny is fully compatible with VRM 0.0 and VRM 1.0 specifications. Users may freely load CC0 or permissively licensed avatars (such as Seed-san by Dwango, VRoid Open Avatars, and custom exported VRMs).

---

## 🚀 Building & Packaging

### 1. Development (Web & Dev Server)
```bash
npm install
npm run dev
```

### 2. Run Unit Tests (Safety Logic)
```bash
npm run test
```

### 3. Build Web Bundle
```bash
npm run build
```

### 4. Package Windows Installer (`Sunny-Setup.exe`)
```bash
npm run build:electron
```
The resulting NSIS per-user setup installer will be generated in `release/Sunny-Setup.exe`.
