import React from 'react';
import { Sparkles } from 'lucide-react';
import { CharacterProfile } from '../types/character.js';

interface ThinkingParticlesProps {
  isStreaming: boolean;
  character: CharacterProfile;
}

interface ParticleConfig {
  left: string;
  top: string;
  delay: string;
  size: number;
}

const PARTICLE_CONFIGS: ParticleConfig[] = [
  { left: '26%', top: '68%', delay: '0s', size: 5 },
  { left: '44%', top: '72%', delay: '0.4s', size: 6 },
  { left: '62%', top: '65%', delay: '0.8s', size: 4 },
  { left: '76%', top: '70%', delay: '1.2s', size: 5 },
  { left: '34%', top: '56%', delay: '1.6s', size: 7 },
  { left: '67%', top: '54%', delay: '2.0s', size: 4 },
  { left: '50%', top: '48%', delay: '0.6s', size: 6 },
  { left: '22%', top: '46%', delay: '1.4s', size: 5 },
  { left: '80%', top: '58%', delay: '1.8s', size: 4 },
  { left: '38%', top: '42%', delay: '2.2s', size: 5 },
];

export const ThinkingParticles: React.FC<ThinkingParticlesProps> = ({
  isStreaming,
  character,
}) => {
  return (
    <div
      className={`absolute inset-0 pointer-events-none flex items-center justify-center transition-opacity duration-500 z-10 ${
        isStreaming ? 'opacity-100' : 'opacity-0'
      }`}
      aria-hidden={!isStreaming}
    >
      {/* Soft Central Pulsing Halo */}
      <div
        className="absolute top-16 w-52 h-52 rounded-full blur-2xl animate-pulse-glow pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${character.glowColor}70 0%, ${character.themeColor}35 45%, transparent 70%)`,
        }}
      />

      {/* Orbital Synaptic Halo Ring */}
      <div
        className="absolute top-24 w-44 h-44 rounded-full border border-dashed animate-orbit-ring pointer-events-none"
        style={{
          borderColor: `${character.glowColor}50`,
          boxShadow: `0 0 16px ${character.glowColor}25`,
        }}
      />

      {/* Floating Thinking Micro-Particles using animate-float-particle from index.css */}
      {isStreaming && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {PARTICLE_CONFIGS.map((p, idx) => (
            <span
              key={idx}
              className="absolute rounded-full animate-float-particle"
              style={{
                left: p.left,
                top: p.top,
                width: `${p.size}px`,
                height: `${p.size}px`,
                animationDelay: p.delay,
                backgroundColor: character.glowColor,
                boxShadow: `0 0 8px ${character.glowColor}, 0 0 16px ${character.themeColor}`,
              }}
            />
          ))}
        </div>
      )}

      {/* Thinking Status Pill */}
      <div className="absolute top-1 px-3 py-1 rounded-full bg-slate-900/85 backdrop-blur-md border border-amber-500/40 text-amber-300 text-[10px] font-mono flex items-center gap-1.5 shadow-xl animate-in fade-in zoom-in-95 pointer-events-none">
        <Sparkles className="w-3 h-3 text-amber-400 animate-spin" />
        <span>Thinking...</span>
        <span className="flex items-center gap-0.5 ml-0.5">
          <span className="w-1 h-1 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1 h-1 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1 h-1 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </span>
      </div>
    </div>
  );
};
