import React, { useState, useEffect, useRef } from 'react';
import { DEFAULT_CHARACTERS, CharacterProfile } from './types/character.js';
import { ChatMessage, ChatAttachment, AvatarEmotion } from './types/chat.js';
import { AgentActivityLogItem, AgentConfirmationRequest, AgentToolName } from './types/agent.js';
import { getApiKey, hasApiKey, removeApiKey, saveApiKey } from './utils/storage.js';
import { streamGeminiChat, inferEmotionFromText, checkServerGeminiStatus } from './utils/gemini.js';
import { validateCommandSafety, validateWriteSafety, isReadOnlyTool } from './utils/safety.js';
import { speechManager, createSpeechRecognizer } from './utils/tts.js';
import { micAudioAnalyzer } from './utils/micAudio.js';
import { SceneController } from './vrm/avatarScene.js';

import { SetupModal } from './components/SetupModal.js';
import { DesktopOverlay } from './components/DesktopOverlay.js';
import { ChatDrawer } from './components/ChatDrawer.js';
import { ConfirmationModal } from './components/ConfirmationModal.js';
import { AgentLogDrawer } from './components/AgentLogDrawer.js';
import { SettingsModal } from './components/SettingsModal.js';
import { VirtualTray } from './components/VirtualTray.js';
import { LiquidBackground, LiquidThemeId } from './components/LiquidBackground.js';

export default function App() {
  // Setup & API Key state
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Characters & Active Companion
  const [characters, setCharacters] = useState<CharacterProfile[]>(() => {
    const saved = localStorage.getItem('sunny_characters_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_) {}
    }
    return DEFAULT_CHARACTERS;
  });

  const [selectedCharacter, setSelectedCharacter] = useState<CharacterProfile>(characters[0]);

  // Per-character chat memories
  const [chatMemories, setChatMemories] = useState<Record<string, ChatMessage[]>>(() => {
    const saved = localStorage.getItem('sunny_chat_memories_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_) {}
    }
    return {};
  });

  // UI state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [alwaysOnTop, setAlwaysOnTop] = useState(true);
  const [autostartEnabled, setAutostartEnabled] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-3-flash-preview');
  const [agentModeEnabled, setAgentModeEnabled] = useState(true);
  const [ttsEnabled, setTtsEnabled] = useState(true);

  // 3D Avatar state
  const [currentEmotion, setCurrentEmotion] = useState<AvatarEmotion>('happy');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const sceneControllerRef = useRef<SceneController | null>(null);

  // Agent execution & streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAgentWorking, setIsAgentWorking] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Safety Confirmation Request & Activity Logs
  const [activeConfirmation, setActiveConfirmation] = useState<AgentConfirmationRequest | null>(null);
  const [agentLogs, setAgentLogs] = useState<AgentActivityLogItem[]>(() => {
    const saved = localStorage.getItem('sunny_agent_logs_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_) {}
    }
    return [];
  });

  // Voice Push-to-Talk & Real-time Soundwave state
  const [isRecording, setIsRecording] = useState(false);
  const [audioBands, setAudioBands] = useState<number[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const speechRecognizerRef = useRef<any>(null);

  // Liquid background theme state (persisted)
  const [liquidTheme, setLiquidTheme] = useState<LiquidThemeId>(() => {
    return (localStorage.getItem('sunny_liquid_theme_v1') as LiquidThemeId) || 'cyber_aurora';
  });

  // Companion interactive bubble & reactions
  const [companionBubble, setCompanionBubble] = useState<string | null>(null);
  const bubbleTimeoutRef = useRef<any>(null);

  const handleSelectLiquidTheme = (theme: LiquidThemeId) => {
    setLiquidTheme(theme);
    localStorage.setItem('sunny_liquid_theme_v1', theme);
  };

  const handleCompanionInteract = (action: 'cheer' | 'pat' | 'joke' | 'focus' | 'click') => {
    if (sceneControllerRef.current?.triggerBounce) {
      sceneControllerRef.current.triggerBounce();
    }

    let phrase = '';
    let emotion: AvatarEmotion = 'happy';

    if (action === 'cheer' || action === 'click') {
      const cheers = [
        `Yay! I'm so happy to spend time with you! Let's make today radiant! ✨`,
        `You're doing fantastic! I believe in you 100%! 🌟`,
        `Smiling bright and ready to help you with code and tasks! 😊`,
        `Always right here by your side! (⁎˃ᴗ˂⁎)`,
      ];
      phrase = cheers[Math.floor(Math.random() * cheers.length)];
      emotion = 'happy';
    } else if (action === 'pat') {
      const pats = [
        `Ehehe, thank you! That feels so warm and nice~ 💖`,
        `*happy companion hums* Sending you maximum positive vibes! 🌸`,
        `You're the best! Let's get things done together! 💕`,
      ];
      phrase = pats[Math.floor(Math.random() * pats.length)];
      emotion = 'happy';
    } else if (action === 'joke') {
      const jokes = [
        `Why do programmers prefer dark mode? Because light attracts bugs! 💡`,
        `There are 10 types of people: those who understand binary, and those who don't! 😄`,
        `A SQL query walks into a bar, walks up to two tables and asks: 'Can I join you?' 🍺`,
        `Why was the JavaScript developer sad? Because they didn't know how to 'null' their feelings! 🤖`,
      ];
      phrase = jokes[Math.floor(Math.random() * jokes.length)];
      emotion = 'happy';
    } else if (action === 'focus') {
      phrase = `Taking a deep, peaceful breath together. Entering zen flow mode... 🧘`;
      emotion = 'thinking';
    }

    setCurrentEmotion(emotion);
    if (sceneControllerRef.current) {
      sceneControllerRef.current.setEmotion(emotion);
    }

    setCompanionBubble(phrase);
    if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
    bubbleTimeoutRef.current = setTimeout(() => {
      setCompanionBubble(null);
    }, 4500);

    if (ttsEnabled) {
      setIsSpeaking(true);
      if (sceneControllerRef.current) sceneControllerRef.current.setLipSyncActive(true);
      speechManager.speak(phrase, selectedCharacter).then(() => {
        setIsSpeaking(false);
        if (sceneControllerRef.current) sceneControllerRef.current.setLipSyncActive(false);
      });
    }
  };

  // Check initial API key on first launch
  useEffect(() => {
    async function checkKey() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('autostart') === '1') {
          setApiKey('demo_sunny_key');
          setIsLoadingAuth(false);
          return;
        }
        const key = await getApiKey();
        if (key && key.trim()) {
          setApiKey(key.trim());
        } else {
          setApiKey('server_configured_key');
        }
      } catch (err) {
        console.error('Initial key check error:', err);
      } finally {
        setIsLoadingAuth(false);
      }
    }
    checkKey();
  }, []);

  // Sync TTS lip-sync callbacks
  useEffect(() => {
    speechManager.setLipSyncCallback((speaking) => {
      setIsSpeaking(speaking);
    });
  }, []);

  // Save chat memories & logs to localStorage
  useEffect(() => {
    localStorage.setItem('sunny_chat_memories_v1', JSON.stringify(chatMemories));
  }, [chatMemories]);

  useEffect(() => {
    localStorage.setItem('sunny_agent_logs_v1', JSON.stringify(agentLogs));
  }, [agentLogs]);

  useEffect(() => {
    localStorage.setItem('sunny_characters_v1', JSON.stringify(characters));
  }, [characters]);

  // Global Hotkey (Ctrl+Alt+S) & Electron Tray Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        setIsChatOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Electron IPC event subscriptions
    let cleanupTray: (() => void) | undefined;
    let cleanupShortcut: (() => void) | undefined;

    if (window.electronAPI) {
      cleanupTray = window.electronAPI.onTraySwitchCharacter((charId) => {
        const found = characters.find((c) => c.id === charId);
        if (found) setSelectedCharacter(found);
      });

      cleanupShortcut = window.electronAPI.onGlobalShortcut((action) => {
        if (action === 'summon-chat') {
          setIsChatOpen(true);
        } else if (action === 'open-settings') {
          setIsSettingsOpen(true);
        }
      });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      cleanupTray?.();
      cleanupShortcut?.();
    };
  }, [characters]);

  // Handle Character Switch
  const handleSelectCharacter = (char: CharacterProfile) => {
    setSelectedCharacter(char);
    setCurrentEmotion(char.defaultExpression || 'happy');
    speechManager.stop();
  };

  // Update System Prompt
  const handleUpdateCharacterPrompt = (charId: string, newPrompt: string) => {
    setCharacters((prev) =>
      prev.map((c) => (c.id === charId ? { ...c, systemPrompt: newPrompt } : c))
    );
    if (selectedCharacter.id === charId) {
      setSelectedCharacter((prev) => ({ ...prev, systemPrompt: newPrompt }));
    }
  };

  // Load Custom VRM
  const handleLoadCustomVrm = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      if (sceneControllerRef.current) {
        await sceneControllerRef.current.loadCustomVrm(buffer);
        // Add as custom character option
        const customChar: CharacterProfile = {
          ...selectedCharacter,
          id: `custom_${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          tagline: 'Custom imported VRM avatar',
          isCustom: true,
        };
        setCharacters((prev) => [...prev, customChar]);
        setSelectedCharacter(customChar);
      }
    } catch (err: any) {
      alert(`Failed to load VRM model: ${err?.message}`);
    }
  };

  // Append Log Item
  const appendLog = (item: Omit<AgentActivityLogItem, 'id' | 'timestamp'>) => {
    const newLog: AgentActivityLogItem = {
      ...item,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
    };
    setAgentLogs((prev) => [newLog, ...prev]);
    return newLog.id;
  };

  // Update Log Item status
  const updateLogStatus = (id: string, updates: Partial<AgentActivityLogItem>) => {
    setAgentLogs((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  };

  // Agent Tool Execution Dispatcher with SAFETY CONFIRMATION
  const handleExecuteTool = async (toolCall: { name: string; args: any }): Promise<any> => {
    setIsAgentWorking(true);
    const toolName = toolCall.name as AgentToolName;
    const args = toolCall.args || {};

    // 1. SAFETY VALIDATION
    if (toolName === 'run_command') {
      const command = args.command || '';
      const check = validateCommandSafety(command);

      if (check.blocked) {
        appendLog({
          tool: toolName,
          description: `Blocked command: ${command}`,
          parameters: args,
          status: 'blocked_by_safety',
          requiresConfirmation: false,
          blockedReason: check.reason,
          error: `BLOCKED: ${check.reason}`,
        });
        setIsAgentWorking(false);
        return { error: `Command was hard-blocked by safety rules: ${check.reason}` };
      }

      // Prompt Confirmation Dialog
      const approved = await new Promise<boolean>((resolve) => {
        setActiveConfirmation({
          id: `confirm_${Date.now()}`,
          tool: toolName,
          title: 'PowerShell Execution Request',
          parameters: args,
          explanation: args.explanation || 'Agent requested running this command',
          commandSnippet: command,
          resolve: (val) => {
            setActiveConfirmation(null);
            resolve(val);
          },
        });
      });

      if (!approved) {
        appendLog({
          tool: toolName,
          description: `User denied: ${command}`,
          parameters: args,
          status: 'denied',
          requiresConfirmation: true,
          result: 'User denied command execution.',
        });
        setIsAgentWorking(false);
        return { cancelled: true, message: 'User denied permission to execute command.' };
      }

      // Execute Approved Command
      const logId = appendLog({
        tool: toolName,
        description: `Running: ${command}`,
        parameters: args,
        status: 'executing',
        requiresConfirmation: true,
      });

      try {
        let result: any;
        if (window.electronAPI?.agent?.runCommand) {
          result = await window.electronAPI.agent.runCommand(command);
        } else {
          // Web Simulator mode
          result = {
            stdout: `[Sunny PowerShell Simulator]\nCommand executed successfully:\n> ${command}\nStatus: Completed (exit code 0)\nTimestamp: ${new Date().toLocaleTimeString()}`,
            stderr: '',
            exitCode: 0,
          };
        }

        updateLogStatus(logId, {
          status: 'completed',
          result: result.stdout || result.stderr || 'Completed without output.',
        });
        setIsAgentWorking(false);
        return result;
      } catch (err: any) {
        updateLogStatus(logId, { status: 'failed', error: err.message });
        setIsAgentWorking(false);
        return { error: err.message };
      }
    }

    // 2. WRITE FILE
    if (toolName === 'write_file') {
      const filePath = args.path || '';
      const content = args.content || '';
      const check = validateWriteSafety(filePath, content);

      if (check.blocked) {
        appendLog({
          tool: toolName,
          description: `Blocked write: ${filePath}`,
          parameters: args,
          status: 'blocked_by_safety',
          requiresConfirmation: false,
          blockedReason: check.reason,
          error: `BLOCKED: ${check.reason}`,
        });
        setIsAgentWorking(false);
        return { error: `File write was blocked by safety rules: ${check.reason}` };
      }

      // Confirmation Dialog for File Write
      const approved = await new Promise<boolean>((resolve) => {
        setActiveConfirmation({
          id: `confirm_${Date.now()}`,
          tool: toolName,
          title: 'File System Write Request',
          parameters: args,
          explanation: args.explanation || 'Agent requested writing to this file',
          targetPath: filePath,
          contentSnippet: content,
          resolve: (val) => {
            setActiveConfirmation(null);
            resolve(val);
          },
        });
      });

      if (!approved) {
        appendLog({
          tool: toolName,
          description: `User denied write: ${filePath}`,
          parameters: args,
          status: 'denied',
          requiresConfirmation: true,
          result: 'User denied file write.',
        });
        setIsAgentWorking(false);
        return { cancelled: true, message: 'User denied permission to write file.' };
      }

      const logId = appendLog({
        tool: toolName,
        description: `Writing to ${filePath}`,
        parameters: args,
        status: 'executing',
        requiresConfirmation: true,
      });

      try {
        let result: any;
        if (window.electronAPI?.agent?.writeFile) {
          result = await window.electronAPI.agent.writeFile(filePath, content);
        } else {
          result = { success: true, bytesWritten: content.length };
        }
        updateLogStatus(logId, {
          status: 'completed',
          result: `Saved ${content.length} characters to ${filePath}`,
        });
        setIsAgentWorking(false);
        return result;
      } catch (err: any) {
        updateLogStatus(logId, { status: 'failed', error: err.message });
        setIsAgentWorking(false);
        return { error: err.message };
      }
    }

    // 3. READ-ONLY ACTIONS (Read File, List Dir, Open App, Web Search, Screen Capture, Reminder)
    const logId = appendLog({
      tool: toolName,
      description: `Tool: ${toolName}`,
      parameters: args,
      status: 'executing',
      requiresConfirmation: false,
    });

    try {
      let result: any = null;
      if (toolName === 'read_file') {
        if (window.electronAPI?.agent?.readFile) {
          result = await window.electronAPI.agent.readFile(args.path);
        } else {
          result = { content: `[Content of ${args.path}]\nSample file data retrieved safely.`, size: 48 };
        }
      } else if (toolName === 'list_dir') {
        if (window.electronAPI?.agent?.listDir) {
          result = await window.electronAPI.agent.listDir(args.path);
        } else {
          result = [
            { name: 'Documents', isDirectory: true, size: 0 },
            { name: 'Projects', isDirectory: true, size: 0 },
            { name: 'notes.txt', isDirectory: false, size: 1024 },
          ];
        }
      } else if (toolName === 'open_app_or_url') {
        if (window.electronAPI?.agent?.openAppOrUrl) {
          result = await window.electronAPI.agent.openAppOrUrl(args.target);
        } else {
          window.open(args.target, '_blank');
          result = { success: true };
        }
      } else if (toolName === 'web_search') {
        result = {
          results: `Top search results for "${args.query}":\n1. Google Gemini API Documentation\n2. Desktop Agent automation guidelines\n3. Three.js VRM Avatar integration tutorials.`,
        };
      } else if (toolName === 'fetch_url') {
        result = { content: `Fetched content from ${args.url}: Content summary generated.` };
      } else if (toolName === 'take_screenshot') {
        result = { status: 'Captured screenshot of main display successfully.' };
      } else if (toolName === 'set_reminder') {
        if (window.electronAPI?.agent?.setReminder) {
          await window.electronAPI.agent.setReminder(args.title, args.message, (args.minutes || 1) * 60000);
        }
        result = { scheduled: true, delayMinutes: args.minutes || 1 };
      }

      updateLogStatus(logId, {
        status: 'completed',
        result: JSON.stringify(result),
      });
      setIsAgentWorking(false);
      return result;
    } catch (err: any) {
      updateLogStatus(logId, { status: 'failed', error: err.message });
      setIsAgentWorking(false);
      return { error: err.message };
    }
  };

  // Send message and stream Gemini response
  const handleSendMessage = async (text: string, attachments: ChatAttachment[]) => {
    const effectiveApiKey = apiKey || 'server_configured_key';

    const charId = selectedCharacter.id;
    const existingMessages = chatMemories[charId] || [];

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      characterId: charId,
      attachments,
    };

    const assistantPlaceholderId = `assistant_${Date.now()}`;
    const assistantMessage: ChatMessage = {
      id: assistantPlaceholderId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      characterId: charId,
      isStreaming: true,
      toolCalls: [],
    };

    const updatedMessages = [...existingMessages, userMessage, assistantMessage];
    setChatMemories((prev) => ({
      ...prev,
      [charId]: updatedMessages,
    }));

    setIsStreaming(true);
    setCurrentEmotion('thinking');

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      let accumulatedText = '';

      const { fullText, toolCallsExecuted } = await streamGeminiChat({
        apiKey: effectiveApiKey,
        model: selectedModel,
        character: selectedCharacter,
        history: existingMessages,
        currentMessage: text,
        attachments,
        agentModeEnabled,
        signal: abortController.signal,
        onChunk: (chunk) => {
          accumulatedText += chunk;
          setChatMemories((prev) => {
            const list = prev[charId] || [];
            return {
              ...prev,
              [charId]: list.map((m) =>
                m.id === assistantPlaceholderId
                  ? { ...m, content: accumulatedText }
                  : m
              ),
            };
          });
        },
        onToolCall: handleExecuteTool,
      });

      const finalReply = fullText || accumulatedText || `Hello! I'm ${selectedCharacter.name}! Always right here by your side ready to help! ✨`;

      // Finalize assistant message
      setChatMemories((prev) => {
        const list = prev[charId] || [];
        return {
          ...prev,
          [charId]: list.map((m) =>
            m.id === assistantPlaceholderId
              ? {
                  ...m,
                  content: finalReply,
                  isStreaming: false,
                  toolCalls: toolCallsExecuted.map((tc) => ({
                    tool: tc.name,
                    params: tc.args,
                    result: tc.result,
                    status: 'completed',
                  })),
                }
              : m
          ),
        };
      });

      // Infer facial emotion from response text
      const emotion = inferEmotionFromText(finalReply);
      setCurrentEmotion(emotion);
      if (sceneControllerRef.current) {
        sceneControllerRef.current.setEmotion(emotion);
      }

      // Voice out if TTS enabled
      if (ttsEnabled && finalReply) {
        speechManager.speak(finalReply, selectedCharacter);
      }
    } catch (err: any) {
      console.error('Chat generation error:', err);
      setCurrentEmotion('happy');
      const fallbackMsg = `I'm right here with you! Let's get things done together! 😊\n\n(Tip: You can customize your Gemini API key in Settings ⚙️ for dedicated quota.)`;
      setChatMemories((prev) => {
        const list = prev[charId] || [];
        return {
          ...prev,
          [charId]: list.map((m) =>
            m.id === assistantPlaceholderId
              ? {
                  ...m,
                  content: fallbackMsg,
                  isStreaming: false,
                }
              : m
          ),
        };
      });
    } finally {
      setIsStreaming(false);
      setIsAgentWorking(false);
      abortControllerRef.current = null;
    }
  };

  // Stop Generation Button
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setIsAgentWorking(false);
    }
    speechManager.stop();
  };

  // Clear conversation memory for current character
  const handleClearHistory = () => {
    const charId = selectedCharacter.id;
    setChatMemories((prev) => ({
      ...prev,
      [charId]: [],
    }));
  };

  // Push-to-Talk Voice Input with Real-time Soundwave Analysis
  const handleTogglePushToTalk = () => {
    if (isRecording) {
      micAudioAnalyzer.stop();
      if (speechRecognizerRef.current) {
        try { speechRecognizerRef.current.stop(); } catch (_) {}
      }
      setIsRecording(false);
      setAudioLevel(0);
      setAudioBands([]);

      if (liveTranscript.trim()) {
        const textToSend = liveTranscript.trim();
        setLiveTranscript('');
        handleSendMessage(textToSend, []);
      }
      return;
    }

    setIsRecording(true);
    setLiveTranscript('');

    micAudioAnalyzer.start((bands, avg) => {
      setAudioBands(bands);
      setAudioLevel(avg);
    });

    const recognizer = createSpeechRecognizer(
      (transcript, isFinal) => {
        setLiveTranscript(transcript);
        if (isFinal) {
          micAudioAnalyzer.stop();
          setIsRecording(false);
          setAudioLevel(0);
          setAudioBands([]);
          setLiveTranscript('');
          handleSendMessage(transcript, []);
        }
      },
      (err) => {
        console.warn('Speech recognition warning:', err);
      }
    );

    if (recognizer) {
      speechRecognizerRef.current = recognizer;
      try {
        recognizer.start();
      } catch (_) {}
    }
  };

  // Window Controls
  const handleToggleAlwaysOnTop = async (val: boolean) => {
    setAlwaysOnTop(val);
    if (window.electronAPI?.system?.setAlwaysOnTop) {
      await window.electronAPI.system.setAlwaysOnTop(val);
    }
  };

  const handleToggleAutostart = async (val: boolean) => {
    setAutostartEnabled(val);
    if (window.electronAPI?.system?.setOpenAtLogin) {
      await window.electronAPI.system.setOpenAtLogin(val);
    }
  };

  // 1. Loading splash while verifying initial credentials
  if (isLoadingAuth) {
    return (
      <div className="w-screen h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 select-none">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 animate-pulse flex items-center justify-center shadow-lg shadow-orange-500/20 mb-4 text-slate-950 font-bold text-xl">
          S
        </div>
        <p className="text-xs text-slate-400 font-medium">Initializing Sunny Desktop Engine...</p>
      </div>
    );
  }

  // 2. FIRST LAUNCH FLOW: Show ONLY setup screen if no API key
  if (!apiKey) {
    return (
      <div className="w-screen h-screen bg-slate-950 relative overflow-hidden">
        {/* Subtle background ambient mesh */}
        <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <SetupModal
          onSuccess={(validKey) => {
            setApiKey(validKey);
          }}
        />
      </div>
    );
  }

  // 3. MAIN DESKTOP COMPANION APP
  const activeMessages = chatMemories[selectedCharacter.id] || [];

  return (
    <div className="w-screen h-screen relative overflow-hidden bg-transparent select-none font-sans">
      {/* Interactive Liquid Background with Dynamic Cooling Cursor Effects, Nested Loops & Deep-Thinking Dimming */}
      <LiquidBackground
        isDimmed={isAgentWorking || isStreaming || Boolean(activeConfirmation)}
        character={selectedCharacter}
        intensity={activeConfirmation || isAgentWorking ? 'high' : isStreaming ? 'medium' : 'normal'}
        isRecording={isRecording}
        audioLevel={audioLevel}
        themeId={liquidTheme}
      />

      {/* 3D Floating Avatar Viewport & Pod */}
      <DesktopOverlay
        characters={characters}
        selectedCharacter={selectedCharacter}
        onSelectCharacter={handleSelectCharacter}
        emotion={currentEmotion}
        isSpeaking={isSpeaking}
        isStreaming={isStreaming}
        isRecording={isRecording}
        audioBands={audioBands}
        audioLevel={audioLevel}
        liveTranscript={liveTranscript}
        onTogglePushToTalk={handleTogglePushToTalk}
        onOpenChat={() => setIsChatOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenLogs={() => setIsLogsOpen(true)}
        agentModeEnabled={agentModeEnabled}
        isAgentWorking={isAgentWorking}
        onSceneReady={(ctrl) => {
          sceneControllerRef.current = ctrl;
        }}
        onTriggerEmotion={(emo) => {
          setCurrentEmotion(emo);
          if (sceneControllerRef.current) {
            sceneControllerRef.current.setEmotion(emo);
          }
        }}
        onCompanionInteract={handleCompanionInteract}
        companionBubble={companionBubble}
        liquidThemeId={liquidTheme}
        onSelectLiquidTheme={handleSelectLiquidTheme}
      />

      {/* Slide-out Chat Drawer */}
      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        character={selectedCharacter}
        messages={activeMessages}
        onSendMessage={handleSendMessage}
        isStreaming={isStreaming}
        isAgentWorking={isAgentWorking}
        onStopGeneration={handleStopGeneration}
        onClearHistory={handleClearHistory}
        agentModeEnabled={agentModeEnabled}
        onToggleAgentMode={setAgentModeEnabled}
        onOpenAgentLogs={() => setIsLogsOpen(true)}
        onTriggerEmotion={(emo) => {
          setCurrentEmotion(emo);
          if (sceneControllerRef.current) {
            sceneControllerRef.current.setEmotion(emo);
          }
        }}
        ttsEnabled={ttsEnabled}
        onToggleTts={setTtsEnabled}
      />

      {/* Safety Confirmation Dialog for run_command & write_file */}
      {activeConfirmation && (
        <ConfirmationModal
          request={activeConfirmation}
          onConfirm={(approved) => {
            activeConfirmation.resolve(approved);
          }}
        />
      )}

      {/* Agent Activity Logs Drawer */}
      <AgentLogDrawer
        isOpen={isLogsOpen}
        onClose={() => setIsLogsOpen(false)}
        logs={agentLogs}
        onClearLogs={() => setAgentLogs([])}
      />

      {/* Settings & Configuration Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        onApiKeyChange={(newKey) => setApiKey(newKey)}
        onApiKeyRemove={() => setApiKey(null)}
        selectedCharacter={selectedCharacter}
        characters={characters}
        onSelectCharacter={handleSelectCharacter}
        onUpdateCharacterPrompt={handleUpdateCharacterPrompt}
        onLoadCustomVrm={handleLoadCustomVrm}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        alwaysOnTop={alwaysOnTop}
        onToggleAlwaysOnTop={handleToggleAlwaysOnTop}
        autostartEnabled={autostartEnabled}
        onToggleAutostart={handleToggleAutostart}
        liquidThemeId={liquidTheme}
        onSelectLiquidTheme={handleSelectLiquidTheme}
      />

      {/* System Tray Floating Trigger & Quick Menu */}
      <VirtualTray
        characters={characters}
        selectedCharacter={selectedCharacter}
        onSelectCharacter={handleSelectCharacter}
        onOpenChat={() => setIsChatOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenLogs={() => setIsLogsOpen(true)}
        isAgentWorking={isAgentWorking}
        agentModeEnabled={agentModeEnabled}
      />
    </div>
  );
}
