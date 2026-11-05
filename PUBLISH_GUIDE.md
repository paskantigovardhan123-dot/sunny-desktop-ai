# 🚀 End-to-End Guide: Publish Sunny to GitHub & Distribute Windows .exe

This guide walks you through the complete end-to-end process to publish **Sunny (3D AI Desktop Companion & Autonomous Agent)** to GitHub so that anyone in the public can download the Windows `.exe` and use their personal AI assistant.

---

## 📋 What Has Already Been Set Up For You

1. **Automated GitHub Actions CI/CD (`.github/workflows/build-and-release.yml`)**:
   - Automatically builds on a native Windows machine in GitHub's cloud (`windows-latest`).
   - Runs safety unit tests, compiles the React UI and Electron main process.
   - Generates both the **NSIS Installer (`Sunny-Setup.exe`)** and **Portable Executable**.
   - Publishes the `.exe` directly to your repository's **GitHub Releases** page whenever you push a version tag (e.g., `v1.0.0`) or click "Run workflow".
2. **Clean Repository Configuration**:
   - `.gitignore` configured to keep out `node_modules`, `dist`, `release`, `.env`, and temporary caches.
   - Initialized Git on the `main` branch.
3. **Dual Execution Engine**:
   - **Web / Server mode**: Runs in browser or Cloud Run with server-side Gemini streaming.
   - **Desktop Electron mode**: Runs as a frameless, transparent 3D avatar on Windows with system tray, hotkeys (`Ctrl+Alt+S`), and safe PowerShell desktop agent tools.

---

## 🛠️ Step 1: Create a Repository on GitHub

1. Open your web browser and go to [GitHub: New Repository](https://github.com/new).
2. Set the **Repository name** to: `sunny-desktop-ai` (or any name you prefer).
3. Choose **Public** (so anyone can download the `.exe` and use it).
4. Leave **Initialize this repository with a README** **UNCHECKED** (we already have a complete README).
5. Click **Create repository**.

---

## 💻 Step 2: Push Your Code to GitHub

Open your terminal or command prompt in this project folder and run the following commands (replace `<YOUR_GITHUB_USERNAME>` with your actual GitHub username):

```bash
# 1. Add all files to git staging
git add .

# 2. Create the initial release commit
git commit -m "feat: release Sunny 3D AI Desktop Companion & Agent v1.0.0"

# 3. Connect to your GitHub repository
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/sunny-desktop-ai.git

# 4. Push code to main branch
git push -u origin main
```

---

## 🏷️ Step 3: Trigger Automated Windows `.exe` Build

To trigger the automated GitHub Actions build that compiles the `.exe` and creates the download release:

```bash
# 1. Tag this release as v1.0.0
git tag -a v1.0.0 -m "Release v1.0.0 - Sunny 3D Desktop AI"

# 2. Push the tag to GitHub
git push origin v1.0.0
```

### Alternatively (via GitHub Web UI):
1. Go to your GitHub repository in your browser.
2. Click the **Actions** tab at the top.
3. In the left sidebar, click **Build and Release Sunny Desktop AI**.
4. Click the **Run workflow** dropdown button on the right, select `main`, and click **Run workflow**.

GitHub Actions will start a Windows runner, compile the codebase, build `Sunny-Setup.exe` and `Sunny-Setup.zip`, and publish them under **Releases**!

---

## 📥 Step 4: How the Public Downloads & Uses Sunny

Once the GitHub Actions workflow finishes (takes ~3 minutes):

1. Anyone visiting your repository can click on **Releases** on the right side of the GitHub page (or visit `https://github.com/<YOUR_GITHUB_USERNAME>/sunny-desktop-ai/releases`).
2. Download **`Sunny-Setup.exe`** (or `Sunny-Setup.zip`).
3. Double-click to run on Windows 10 or Windows 11.
   *(Note for open-source apps: If Windows SmartScreen shows "Windows protected your PC", click **More info** -> **Run anyway**).*
4. On first launch:
   - Sunny opens a welcoming setup window.
   - The user gets their free Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
   - They paste the key into Sunny. It is encrypted on their machine using **Windows DPAPI** (`safeStorage`).
5. Sunny appears on their desktop as a live 3D companion ready to assist!

---

## ⌨️ Desktop Shortcuts & Features for End Users

| Action | Shortcut / Interaction |
|---|---|
| **Summon / Dismiss Chat** | Press `Ctrl + Alt + S` anywhere in Windows |
| **Move Companion** | Click & drag the top header bar to position Sunny anywhere on screen |
| **Pet / Cheer Up** | Click the avatar or click `Cheer Up!` / `Pet` on the companion pod |
| **Change Avatar** | Click `S` (Sunny), `N` (Nova), `K` (Kaito), or `A` (Atlas) on the header pod |
| **Change Liquid UI Theme** | Click the theme button on the pod or go to **Settings ⚙️ -> Liquid Themes** |
| **Voice Push-to-Talk** | Hold the microphone button in chat to speak |
| **Agent Automation** | Enable **Agent Mode** in chat to ask Sunny to search the web, read files, or run PowerShell tasks with mandatory approval |

---

## 📦 Local Building (If you want to build on your own PC)

If you have a Windows PC and prefer to build the `.exe` locally instead of waiting for GitHub Actions:

```bash
# 1. Clone your repo
git clone https://github.com/<YOUR_GITHUB_USERNAME>/sunny-desktop-ai.git
cd sunny-desktop-ai

# 2. Install dependencies
npm install

# 3. Build React web application
npm run build

# 4. Build Electron main process
npm run build:electron-main

# 5. Build Windows installer (.exe)
npm run build:electron
```
The compiled installer will appear in the `release/` folder as `Sunny-Setup.exe`.
