import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Bot, Settings, Activity, Power, ChevronUp, Bell } from 'lucide-react';
import { CharacterProfile } from '../types/character.js';

interface VirtualTrayProps {
  characters: CharacterProfile[];
  selectedCharacter: CharacterProfile;
  onSelectCharacter: (char: CharacterProfile) => void;
  onOpenChat: () => void;
  onOpenSettings: () => void;
  onOpenLogs: () => void;
  isAgentWorking: boolean;
  agentModeEnabled: boolean;
}

export const VirtualTray: React.FC<VirtualTrayProps> = ({
  characters,
  selectedCharacter,
  onSelectCharacter,
  onOpenChat,
  onOpenSettings,
  onOpenLogs,
  isAgentWorking,
  agentModeEnabled,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={menuRef} className="fixed bottom-3 right-3 z-30 select-none">
      {/* Context Menu Popup */}
      {isMenuOpen && (
        <div className="absolute bottom-12 right-0 w-64 bg-slate-900/95 backdrop-blur-md border border-slate-750 rounded-2xl shadow-2xl p-2 text-slate-100 flex flex-col gap-1 text-xs animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Sunny Tray Menu</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
              Ctrl+Alt+S
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              onOpenChat();
              setIsMenuOpen(false);
            }}
            className="w-full px-3 py-2 rounded-xl text-left hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <Bot className="w-4 h-4 text-amber-400" />
            <div className="flex-1">
              <span className="font-medium text-white block">Summon Chat</span>
              <span className="text-[10px] text-slate-400">Open conversation drawer</span>
            </div>
          </button>

          {/* Quick Character Switcher */}
          <div className="px-3 pt-2 pb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Switch Companion
          </div>
          <div className="grid grid-cols-2 gap-1 px-1">
            {characters.map((char) => {
              const isSelected = char.id === selectedCharacter.id;
              return (
                <button
                  key={char.id}
                  type="button"
                  onClick={() => {
                    onSelectCharacter(char);
                    setIsMenuOpen(false);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-left flex items-center gap-1.5 transition-all text-xs cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-medium'
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: char.themeColor }}
                  />
                  <span className="truncate">{char.name}</span>
                </button>
              );
            })}
          </div>

          <div className="my-1 border-t border-slate-800" />

          <button
            type="button"
            onClick={() => {
              onOpenLogs();
              setIsMenuOpen(false);
            }}
            className="w-full px-3 py-1.5 rounded-lg text-left hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer text-slate-300 hover:text-white"
          >
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            <span>Agent Activity Log</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenSettings();
              setIsMenuOpen(false);
            }}
            className="w-full px-3 py-1.5 rounded-lg text-left hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer text-slate-300 hover:text-white"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>Settings & Models</span>
          </button>
        </div>
      )}

      {/* Tray Pill Trigger */}
      <div
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-750 shadow-xl hover:border-amber-500/50 transition-all cursor-pointer select-none group"
        title="Sunny Desktop Tray"
      >
        <div className="relative">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shadow-md transition-transform group-hover:scale-105"
            style={{
              background: `linear-gradient(135deg, ${selectedCharacter.themeColor}, #FF5E62)`,
              color: '#0F172A',
            }}
          >
            {selectedCharacter.name.charAt(0)}
          </div>
          {isAgentWorking && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          )}
        </div>

        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-white">{selectedCharacter.name}</span>
            {agentModeEnabled && (
              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                AGENT
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400">Ctrl+Alt+S</span>
        </div>

        <ChevronUp className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
      </div>
    </div>
  );
};
