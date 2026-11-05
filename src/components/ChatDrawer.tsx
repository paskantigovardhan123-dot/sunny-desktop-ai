import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Camera,
  Image as ImageIcon,
  Square,
  Bot,
  Zap,
  RotateCcw,
  Sparkles,
  Paperclip,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  Activity,
  Smile,
} from 'lucide-react';
import { CharacterProfile } from '../types/character.js';
import { ChatMessage, ChatAttachment, AvatarEmotion } from '../types/chat.js';
import { speechManager, createSpeechRecognizer } from '../utils/tts.js';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  character: CharacterProfile;
  messages: ChatMessage[];
  onSendMessage: (text: string, attachments: ChatAttachment[]) => void;
  isStreaming: boolean;
  isAgentWorking: boolean;
  onStopGeneration: () => void;
  onClearHistory: () => void;
  agentModeEnabled: boolean;
  onToggleAgentMode: (enabled: boolean) => void;
  onOpenAgentLogs: () => void;
  onTriggerEmotion: (emotion: AvatarEmotion) => void;
  ttsEnabled: boolean;
  onToggleTts: (val: boolean) => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  character,
  messages,
  onSendMessage,
  isStreaming,
  isAgentWorking,
  onStopGeneration,
  onClearHistory,
  agentModeEnabled,
  onToggleAgentMode,
  onOpenAgentLogs,
  onTriggerEmotion,
  ttsEnabled,
  onToggleTts,
}) => {
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Voice Push-to-Talk setup
  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    setSpeechError(null);
    const recognizer = createSpeechRecognizer(
      (transcript, isFinal) => {
        setInputText((prev) => (isFinal ? transcript : transcript));
        if (isFinal) {
          setIsRecording(false);
        }
      },
      (err) => {
        setSpeechError(err);
        setIsRecording(false);
      }
    );

    if (!recognizer) {
      setSpeechError('Speech recognition is not supported in this environment.');
      return;
    }

    recognitionRef.current = recognizer;
    try {
      recognizer.start();
      setIsRecording(true);
    } catch (e: any) {
      setSpeechError('Could not start microphone.');
      setIsRecording(false);
    }
  };

  const handleSend = () => {
    if (!inputText.trim() && attachments.length === 0) return;
    onSendMessage(inputText.trim(), [...attachments]);
    setInputText('');
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files[0]) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAttachments((prev) => [
          ...prev,
          {
            type: 'image',
            dataUrl: reader.result as string,
            mimeType: file.type || 'image/png',
            name: file.name,
          },
        ]);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCaptureScreen = async () => {
    // If in Electron, capture screen via desktopCapturer
    if (window.electronAPI?.system?.takeScreenshot) {
      try {
        const dataUrl = await window.electronAPI.system.takeScreenshot();
        setAttachments((prev) => [
          ...prev,
          {
            type: 'image',
            dataUrl,
            mimeType: 'image/png',
            name: 'Desktop_Screenshot.png',
          },
        ]);
        return;
      } catch (err) {
        console.warn('Electron screenshot error:', err);
      }
    }

    // Fallback screen capture via browser navigator.mediaDevices.getDisplayMedia
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const track = stream.getVideoTracks()[0];
        const imageCapture = new (window as any).ImageCapture(track);
        const bitmap = await imageCapture.grabFrame();
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(bitmap, 0, 0);
        track.stop();
        const dataUrl = canvas.toDataURL('image/png');
        setAttachments((prev) => [
          ...prev,
          {
            type: 'image',
            dataUrl,
            mimeType: 'image/png',
            name: 'Display_Capture.png',
          },
        ]);
      } else {
        alert('Display media capture is unavailable in this browser session.');
      }
    } catch (e) {
      // User cancelled screen picker
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 max-w-full z-40 bg-slate-900/95 backdrop-blur-xl border-l border-slate-750 shadow-2xl flex flex-col text-slate-100 animate-in slide-in-from-right duration-200">
      {/* Header with Character Status & Mode Controls */}
      <div className="p-3.5 px-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="w-3.5 h-3.5 rounded-full ring-2 ring-slate-800 shrink-0"
            style={{ backgroundColor: character.themeColor }}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-white truncate">{character.name}</h2>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono uppercase">
                {character.gender}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">{character.tagline}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* TTS voice out toggle */}
          <button
            type="button"
            onClick={() => onToggleTts(!ttsEnabled)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              ttsEnabled ? 'text-amber-400 bg-amber-500/15' : 'text-slate-500 hover:text-slate-300'
            }`}
            title={ttsEnabled ? 'Voice Out Enabled' : 'Voice Out Muted'}
          >
            {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Activity log button */}
          <button
            type="button"
            onClick={onOpenAgentLogs}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="View Agent Activity Log"
          >
            <Activity className="w-4 h-4" />
          </button>

          {/* Close drawer */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Secondary Bar: Agent Mode Toggle & Quick Emotions */}
      <div className="px-4 py-2 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between text-xs">
        {/* Agent Mode Toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={agentModeEnabled}
            onChange={(e) => onToggleAgentMode(e.target.checked)}
            className="sr-only"
          />
          <div
            className={`w-7 h-4 rounded-full transition-colors relative ${
              agentModeEnabled ? 'bg-amber-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full bg-white transition-transform absolute top-0.5 ${
                agentModeEnabled ? 'left-3.5' : 'left-0.5'
              }`}
            />
          </div>
          <span className={`text-[11px] font-medium flex items-center gap-1 ${
            agentModeEnabled ? 'text-amber-300' : 'text-slate-400'
          }`}>
            <Zap className="w-3 h-3" />
            <span>Agent Mode</span>
          </span>
        </label>

        {/* Emotion triggers */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onTriggerEmotion('happy')}
            className="px-1.5 py-0.5 rounded text-[11px] hover:bg-slate-800 text-slate-300"
            title="Make Happy"
          >
            😊
          </button>
          <button
            type="button"
            onClick={() => onTriggerEmotion('surprised')}
            className="px-1.5 py-0.5 rounded text-[11px] hover:bg-slate-800 text-slate-300"
            title="Surprise"
          >
            😲
          </button>
          <button
            type="button"
            onClick={() => onTriggerEmotion('thinking')}
            className="px-1.5 py-0.5 rounded text-[11px] hover:bg-slate-800 text-slate-300"
            title="Thinking"
          >
            🤔
          </button>
          <button
            type="button"
            onClick={() => onTriggerEmotion('relaxed')}
            className="px-1.5 py-0.5 rounded text-[11px] hover:bg-slate-800 text-slate-300"
            title="Tranquil"
          >
            😌
          </button>
        </div>
      </div>

      {/* Agent Working Indicator Banner with Instant Stop Button */}
      {(isStreaming || isAgentWorking) && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-amber-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>{isAgentWorking ? 'Agent executing desktop actions...' : `${character.name} is thinking...`}</span>
          </div>

          <button
            type="button"
            onClick={onStopGeneration}
            className="px-2.5 py-1 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Square className="w-3 h-3 fill-rose-300" />
            <span>Stop</span>
          </button>
        </div>
      )}

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 shadow-lg"
              style={{ backgroundColor: `${character.themeColor}20` }}
            >
              <Bot className="w-6 h-6" style={{ color: character.themeColor }} />
            </div>
            <p className="text-sm font-semibold text-slate-300">
              {character.name} is ready
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-[240px] leading-relaxed">
              Ask anything, request desktop automation, paste screenshots, or use voice push-to-talk.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              <button
                type="button"
                onClick={() => setInputText('What desktop tools can you run for me?')}
                className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-700 transition-colors"
              >
                What tools can you run?
              </button>
              <button
                type="button"
                onClick={() => setInputText('Can you run a safe system info check in PowerShell?')}
                className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-700 transition-colors"
              >
                Run safe PowerShell check
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1 text-[10px] text-slate-500 px-1 font-mono">
                  <span>{isUser ? 'You' : character.name}</span>
                  <span>•</span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                {/* Attachments preview */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-1 max-w-[85%]">
                    {msg.attachments.map((att, idx) => (
                      <img
                        key={idx}
                        src={att.dataUrl}
                        alt="attachment"
                        className="max-h-36 rounded-lg border border-slate-700 object-cover shadow-md"
                      />
                    ))}
                  </div>
                )}

                {/* Content bubble */}
                <div
                  className={`p-3 rounded-2xl text-xs leading-relaxed max-w-[88%] select-text whitespace-pre-wrap ${
                    isUser
                      ? 'bg-amber-500 text-slate-950 font-medium rounded-br-none shadow-md shadow-amber-500/10'
                      : 'bg-slate-800/90 text-slate-200 rounded-bl-none border border-slate-750/70 shadow-md'
                  }`}
                >
                  {msg.content}
                  {msg.isStreaming && (
                    <span className="inline-block w-1.5 h-3.5 ml-1 bg-amber-400 animate-pulse" />
                  )}
                </div>

                {/* Tool calls badges */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="flex flex-col gap-1 mt-1 max-w-[88%]">
                    {msg.toolCalls.map((tc, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] font-mono flex items-center justify-between"
                      >
                        <span className="text-amber-300">{tc.tool}</span>
                        <span className={`text-[10px] uppercase font-semibold ${
                          tc.status === 'completed'
                            ? 'text-emerald-400'
                            : tc.status === 'denied'
                            ? 'text-rose-400'
                            : 'text-amber-400'
                        }`}>
                          {tc.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachments preview before sending */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/60 flex items-center gap-2 overflow-x-auto">
          {attachments.map((att, idx) => (
            <div key={idx} className="relative group shrink-0">
              <img
                src={att.dataUrl}
                alt="preview"
                className="w-12 h-12 rounded-lg object-cover border border-slate-700"
              />
              <button
                type="button"
                onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Voice status error banner */}
      {speechError && (
        <div className="px-4 py-1.5 bg-rose-500/10 text-rose-300 text-[11px] border-t border-rose-500/20 flex items-center justify-between">
          <span>{speechError}</span>
          <button type="button" onClick={() => setSpeechError(null)}>
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Input Composer Bar */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/90 flex flex-col gap-2">
        <div className="relative flex items-end gap-2 bg-slate-950 rounded-xl border border-slate-750 p-2 focus-within:ring-1 focus-within:ring-amber-500 transition-all">
          <textarea
            rows={2}
            placeholder={
              isRecording
                ? 'Listening to your voice...'
                : `Message ${character.name}... (Shift+Enter for newline)`
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-xs text-white placeholder-slate-500 resize-none focus:outline-none max-h-24 p-1 leading-relaxed"
          />

          <div className="flex items-center gap-1.5 shrink-0 pb-0.5">
            {/* Screen capture button */}
            <button
              type="button"
              onClick={handleCaptureScreen}
              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Capture Screen to Chat"
            >
              <Camera className="w-4 h-4" />
            </button>

            {/* Image upload button */}
            <label
              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Attach Image"
            >
              <ImageIcon className="w-4 h-4" />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>

            {/* Push to talk voice button */}
            <button
              type="button"
              onClick={toggleRecording}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isRecording
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
              }`}
              title={isRecording ? 'Stop Recording' : 'Voice Push-to-Talk'}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Send button */}
            <button
              type="button"
              onClick={handleSend}
              disabled={isStreaming || (!inputText.trim() && attachments.length === 0)}
              className="p-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Send Message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bottom controls: Clear history & Hotkey indicator */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
          <button
            type="button"
            onClick={onClearHistory}
            className="hover:text-slate-300 transition-colors cursor-pointer flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear conversation</span>
          </button>

          <span className="font-mono text-[10px] text-slate-500">
            Hotkey: Ctrl+Alt+S
          </span>
        </div>
      </div>
    </div>
  );
};
