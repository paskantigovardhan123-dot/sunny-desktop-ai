import React from 'react';
import { Mic, Radio, Sparkles } from 'lucide-react';
import { CharacterProfile } from '../types/character.js';

interface SoundWaveVisualizerProps {
  isRecording: boolean;
  audioBands: number[];
  audioLevel: number;
  liveTranscript: string;
  character: CharacterProfile;
  onStopRecording?: () => void;
}

export const SoundWaveVisualizer: React.FC<SoundWaveVisualizerProps> = ({
  isRecording,
  audioBands,
  audioLevel,
  liveTranscript,
  character,
  onStopRecording,
}) => {
  if (!isRecording) return null;

  // Ensure 16 bands
  const bands = audioBands.length === 16 ? audioBands : Array(16).fill(0.2);

  return (
    <div className="w-full flex flex-col items-center gap-2 pointer-events-auto z-20 animate-in fade-in zoom-in-95 duration-200">
      {/* 1. Real-time Fluid Soundwave Bar Equalizer */}
      <div
        className="px-4 py-2.5 rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-slate-750/90 shadow-2xl flex items-center gap-2.5 transition-all"
        style={{
          boxShadow: `0 0 24px ${character.glowColor}30, 0 8px 32px rgba(0,0,0,0.4)`,
        }}
      >
        <div className="flex items-center gap-1.5 text-rose-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
          </span>
          <Mic className="w-3.5 h-3.5 animate-pulse" />
        </div>

        {/* 16 Dynamic Frequency Soundwave Bars */}
        <div className="flex items-center gap-1 h-8 px-1">
          {bands.map((val, idx) => {
            // Calculate dynamic height between 4px and 30px based on real microphone levels
            const barHeight = Math.max(4, Math.min(30, val * 30 + Math.sin(idx * 0.5) * 3));
            return (
              <div
                key={idx}
                className="w-1.5 rounded-full transition-all duration-75"
                style={{
                  height: `${barHeight}px`,
                  background: `linear-gradient(180deg, ${character.glowColor}, ${character.accentColor || '#38BDF8'})`,
                  boxShadow: val > 0.4 ? `0 0 8px ${character.glowColor}` : 'none',
                  opacity: Math.max(0.4, val * 1.2),
                }}
              />
            );
          })}
        </div>

        {/* Stop button or level badge */}
        <button
          type="button"
          onClick={onStopRecording}
          className="px-2 py-0.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] font-mono cursor-pointer transition-colors"
          title="Finish Push-to-Talk"
        >
          Done
        </button>
      </div>

      {/* 2. "Small text down" - Live Voice Transcription Subtitle Bubble */}
      <div className="w-full max-w-[320px] px-3.5 py-2 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-750 text-slate-100 shadow-xl flex items-start gap-2 text-xs leading-relaxed animate-in fade-in slide-in-from-top-1 duration-150">
        <Radio className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
            <span className="uppercase tracking-wider">Listening to Voice:</span>
            <span className="text-amber-400 font-semibold">{Math.round(audioLevel * 100)}% Input</span>
          </div>
          <p className="text-slate-200 mt-0.5 text-xs select-text font-medium break-words">
            {liveTranscript ? (
              liveTranscript
            ) : (
              <span className="text-slate-500 italic flex items-center gap-1">
                <span>Speak now...</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
