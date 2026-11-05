import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Settings as SettingsIcon,
  Activity,
  Zap,
  Move,
  Sparkles,
  Heart,
  Smile,
  Lightbulb,
  Moon,
  Droplet,
  Mic,
  MicOff,
} from 'lucide-react';
import { CharacterProfile } from '../types/character.js';
import { AvatarEmotion } from '../types/chat.js';
import { AvatarCanvas } from './AvatarCanvas.js';
import { ThinkingParticles } from './ThinkingParticles.js';
import { SoundWaveVisualizer } from './SoundWaveVisualizer.js';
import { SceneController } from '../vrm/avatarScene.js';
import { LiquidThemeId, LIQUID_THEMES } from './LiquidBackground.js';

interface HeartBurst {
  id: number;
  x: number;
  y: number;
  emoji: string;
}

interface DesktopOverlayProps {
  characters: CharacterProfile[];
  selectedCharacter: CharacterProfile;
  onSelectCharacter: (char: CharacterProfile) => void;
  emotion: AvatarEmotion;
  isSpeaking: boolean;
  isStreaming: boolean;
  isRecording?: boolean;
  audioBands?: number[];
  audioLevel?: number;
  liveTranscript?: string;
  onTogglePushToTalk?: () => void;
  onOpenChat: () => void;
  onOpenSettings: () => void;
  onOpenLogs: () => void;
  agentModeEnabled: boolean;
  isAgentWorking: boolean;
  onSceneReady?: (controller: SceneController) => void;
  onTriggerEmotion?: (emotion: AvatarEmotion) => void;
  onCompanionInteract?: (action: 'cheer' | 'pat' | 'joke' | 'focus' | 'click') => void;
  companionBubble?: string | null;
  liquidThemeId?: LiquidThemeId;
  onSelectLiquidTheme?: (theme: LiquidThemeId) => void;
}

export const DesktopOverlay: React.FC<DesktopOverlayProps> = ({
  characters,
  selectedCharacter,
  onSelectCharacter,
  emotion,
  isSpeaking,
  isStreaming,
  isRecording = false,
  audioBands = [],
  audioLevel = 0,
  liveTranscript = '',
  onTogglePushToTalk,
  onOpenChat,
  onOpenSettings,
  onOpenLogs,
  agentModeEnabled,
  isAgentWorking,
  onSceneReady,
  onTriggerEmotion,
  onCompanionInteract,
  companionBubble,
  liquidThemeId = 'cyber_aurora',
  onSelectLiquidTheme,
}) => {
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 50, y: 140 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showControls, setShowControls] = useState(true);
  const [heartBursts, setHeartBursts] = useState<HeartBurst[]>([]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: Math.max(10, Math.min(window.innerWidth - 380, e.clientX - dragOffset.x)),
      y: Math.max(10, Math.min(window.innerHeight - 560, e.clientY - dragOffset.y)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Trigger floating heart/sparkle animation
  const triggerBurst = (emoji: string) => {
    const newBurst: HeartBurst = {
      id: Date.now() + Math.random(),
      x: 140 + (Math.random() - 0.5) * 80,
      y: 220 + (Math.random() - 0.5) * 40,
      emoji,
    };
    setHeartBursts((prev) => [...prev, newBurst]);
    setTimeout(() => {
      setHeartBursts((prev) => prev.filter((b) => b.id !== newBurst.id));
    }, 1800);
  };

  const handleAvatarClick = () => {
    triggerBurst('💖');
    triggerBurst('✨');
    onCompanionInteract?.('click');
  };

  // Cycle to next liquid theme
  const handleCycleTheme = () => {
    const themeKeys: LiquidThemeId[] = ['cyber_aurora', 'deep_ocean', 'liquid_sunset', 'dark_obsidian', 'transparent'];
    const currentIndex = themeKeys.indexOf(liquidThemeId);
    const nextTheme = themeKeys[(currentIndex + 1) % themeKeys.length];
    onSelectLiquidTheme?.(nextTheme);
  };

  const currentThemeConfig = LIQUID_THEMES[liquidThemeId] || LIQUID_THEMES.cyber_aurora;

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="fixed inset-0 pointer-events-none select-none z-20 overflow-hidden"
    >
      {/* Floating 3D Companion Pod */}
      <div
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: '380px',
          height: '560px',
        }}
        className="absolute pointer-events-auto flex flex-col items-center justify-end group transition-shadow duration-300"
      >
        {/* Floating Heart & Sparkle Bursts */}
        {heartBursts.map((burst) => (
          <div
            key={burst.id}
            style={{ left: `${burst.x}px`, top: `${burst.y}px` }}
            className="absolute text-2xl pointer-events-none animate-float-particle select-none z-30 drop-shadow-md"
          >
            {burst.emoji}
          </div>
        ))}

        {/* Primary Controls Bar */}
        <div
          className={`w-full max-w-[360px] px-3 py-1.5 rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-slate-750/80 shadow-2xl flex items-center justify-between transition-opacity duration-200 z-20 mb-1.5 ${
            showControls ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          {/* Drag Handle */}
          <div
            onMouseDown={handleMouseDown}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white cursor-grab active:cursor-grabbing p-1 rounded-lg hover:bg-slate-800/60 transition-colors"
            title="Drag 3D Avatar Window"
          >
            <Move className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold text-slate-300">{selectedCharacter.name}</span>
          </div>

          {/* Quick Character Switcher Pills */}
          <div className="flex items-center gap-1 bg-slate-950/70 p-0.5 rounded-xl border border-slate-800">
            {characters.map((char) => (
              <button
                key={char.id}
                type="button"
                onClick={() => onSelectCharacter(char)}
                className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all cursor-pointer ${
                  char.id === selectedCharacter.id
                    ? 'ring-1 ring-amber-400 scale-105 shadow-sm text-slate-950 font-extrabold'
                    : 'text-slate-400 hover:text-white opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: char.id === selectedCharacter.id ? char.themeColor : 'transparent',
                }}
                title={`Switch to ${char.name} (${char.gender})`}
              >
                {char.name.charAt(0)}
              </button>
            ))}
          </div>

          {/* Primary Quick Actions */}
          <div className="flex items-center gap-1">
            {onTogglePushToTalk && (
              <button
                type="button"
                onClick={onTogglePushToTalk}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isRecording
                    ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30'
                    : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
                }`}
                title={isRecording ? 'Stop Voice Push-to-Talk' : 'Voice Push-to-Talk'}
              >
                {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
            )}

            <button
              type="button"
              onClick={onOpenChat}
              className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-md shadow-amber-500/20 cursor-pointer"
              title="Summon Chat (Ctrl+Alt+S)"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onOpenLogs}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Agent Activity Logs"
            >
              <Activity className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onOpenSettings}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Settings"
            >
              <SettingsIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Companion Interactive Mood & Feature Bar */}
        <div
          className={`w-full max-w-[360px] px-2.5 py-1 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800/80 shadow-lg flex items-center justify-between transition-opacity duration-200 z-20 mb-1 ${
            showControls ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          {/* Cheer Up Button */}
          <button
            type="button"
            onClick={() => {
              triggerBurst('✨');
              triggerBurst('😊');
              onCompanionInteract?.('cheer');
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold text-amber-300 hover:bg-amber-500/20 transition-colors cursor-pointer"
            title="Make your anime companion smile bright!"
          >
            <Smile className="w-3 h-3 text-amber-400" />
            <span>Cheer Up!</span>
          </button>

          {/* Praise / Pet */}
          <button
            type="button"
            onClick={() => {
              triggerBurst('💖');
              triggerBurst('🌸');
              onCompanionInteract?.('pat');
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
            title="Praise and headpat your anime bot"
          >
            <Heart className="w-3 h-3 text-rose-400 fill-rose-400/30" />
            <span>Pet</span>
          </button>

          {/* Daily Tech Tip / Joke */}
          <button
            type="button"
            onClick={() => {
              triggerBurst('💡');
              onCompanionInteract?.('joke');
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold text-sky-300 hover:bg-sky-500/20 transition-colors cursor-pointer"
            title="Fun tech trivia and programming jokes"
          >
            <Lightbulb className="w-3 h-3 text-sky-400" />
            <span>Joke</span>
          </button>

          {/* Focus Mode */}
          <button
            type="button"
            onClick={() => {
              triggerBurst('🧘');
              onCompanionInteract?.('focus');
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold text-indigo-300 hover:bg-indigo-500/20 transition-colors cursor-pointer"
            title="Enter calm zen focus contemplation"
          >
            <Moon className="w-3 h-3 text-indigo-400" />
            <span>Focus</span>
          </button>

          {/* Liquid Theme Quick Switcher */}
          <button
            type="button"
            onClick={handleCycleTheme}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold text-teal-300 hover:bg-teal-500/20 transition-colors cursor-pointer"
            title={`Liquid Background Theme: ${currentThemeConfig.name} (Click to cycle)`}
          >
            <Droplet className="w-3 h-3 text-teal-400 fill-teal-400/30" />
            <span className="truncate max-w-[55px]">{currentThemeConfig.name.split(' ')[0]}</span>
          </button>
        </div>

        {/* 3D VRM Three.js Viewport */}
        <div className="w-full flex-1 relative flex items-center justify-center">
          {/* Companion Anime Speech Bubble / Subtitle Caption */}
          {companionBubble && (
            <div className="absolute top-2 w-[92%] max-w-[340px] px-3.5 py-2 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-amber-500/40 shadow-2xl shadow-amber-500/10 text-white text-xs leading-relaxed animate-in fade-in slide-in-from-top-2 duration-300 flex items-start gap-2.5 z-30 pointer-events-auto">
              <span className="text-base select-none mt-0.5">✨</span>
              <div className="flex-1">
                <div className="flex items-center justify-between text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-0.5">
                  <span>{selectedCharacter.name}</span>
                  <span className="text-slate-400 font-mono">Joyful Companion</span>
                </div>
                <p className="text-slate-200">{companionBubble}</p>
              </div>
            </div>
          )}

          {/* Bioluminescent aura beneath avatar */}
          <div
            className="absolute bottom-6 w-56 h-20 rounded-full blur-2xl opacity-35 pointer-events-none transition-colors duration-500"
            style={{ backgroundColor: selectedCharacter.glowColor }}
          />

          {/* ThinkingParticles overlay when isStreaming is true */}
          <ThinkingParticles
            isStreaming={isStreaming}
            character={selectedCharacter}
          />

          <AvatarCanvas
            character={selectedCharacter}
            emotion={emotion}
            isSpeaking={isSpeaking}
            onSceneReady={onSceneReady}
            onAvatarClick={handleAvatarClick}
          />
        </div>

        {/* Real-time Audio-Reactive Soundwave & Live Transcript Caption during Push-to-Talk */}
        {isRecording && (
          <div className="w-full px-2 mb-2">
            <SoundWaveVisualizer
              isRecording={isRecording}
              audioBands={audioBands}
              audioLevel={audioLevel}
              liveTranscript={liveTranscript}
              character={selectedCharacter}
              onStopRecording={onTogglePushToTalk}
            />
          </div>
        )}

        {/* Speaking / Agent Working Mini Pill at bottom */}
        {isSpeaking && !isRecording && (
          <div className="absolute bottom-2 px-3 py-1 rounded-full bg-slate-900/90 border border-amber-500/40 text-amber-300 text-[10px] font-mono flex items-center gap-1.5 shadow-lg animate-in fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            <span>Speaking...</span>
          </div>
        )}
      </div>
    </div>
  );
};
