import React, { useEffect, useRef } from 'react';
import { CharacterProfile } from '../types/character.js';

export type LiquidThemeId = 'cyber_aurora' | 'deep_ocean' | 'liquid_sunset' | 'dark_obsidian' | 'transparent';

export interface LiquidThemeConfig {
  id: LiquidThemeId;
  name: string;
  icon: string;
  description: string;
  bgGradient: string;
  primaryGlow: string;
  secondaryGlow: string;
  accentGlow: string;
  causticAlpha: number;
}

export const LIQUID_THEMES: Record<LiquidThemeId, LiquidThemeConfig> = {
  cyber_aurora: {
    id: 'cyber_aurora',
    name: 'Cyber Aurora',
    icon: '🌌',
    description: 'Iridescent cyan, deep violet, and celestial emerald liquid glow',
    bgGradient: 'radial-gradient(circle at 50% 30%, #0d1a33 0%, #080e1e 50%, #040711 100%)',
    primaryGlow: '#38BDF8',
    secondaryGlow: '#818CF8',
    accentGlow: '#2DD4BF',
    causticAlpha: 0.22,
  },
  deep_ocean: {
    id: 'deep_ocean',
    name: 'Deep Ocean Glass',
    icon: '🌊',
    description: 'Abyssal midnight blue with bioluminescent aquamarine & sapphire waves',
    bgGradient: 'radial-gradient(circle at 40% 40%, #071f3d 0%, #041224 55%, #020710 100%)',
    primaryGlow: '#06B6D4',
    secondaryGlow: '#0284C7',
    accentGlow: '#14B8A6',
    causticAlpha: 0.26,
  },
  liquid_sunset: {
    id: 'liquid_sunset',
    name: 'Liquid Cyber Sunset',
    icon: '🌅',
    description: 'Rich twilight violet base with radiant molten amber and rose-gold caustics',
    bgGradient: 'radial-gradient(circle at 60% 40%, #260c2d 0%, #170720 50%, #0a0210 100%)',
    primaryGlow: '#F59E0B',
    secondaryGlow: '#EC4899',
    accentGlow: '#A855F7',
    causticAlpha: 0.24,
  },
  dark_obsidian: {
    id: 'dark_obsidian',
    name: 'Dark Obsidian Fluid',
    icon: '🖤',
    description: 'Ultra-dark graphite glass with minimal refractive cryogenic highlights',
    bgGradient: 'radial-gradient(circle at 50% 50%, #0f141f 0%, #090c13 60%, #05060a 100%)',
    primaryGlow: '#64748B',
    secondaryGlow: '#38BDF8',
    accentGlow: '#94A3B8',
    causticAlpha: 0.14,
  },
  transparent: {
    id: 'transparent',
    name: 'Transparent Desktop',
    icon: '🪟',
    description: 'Frameless transparent overlay directly on top of Windows desktop',
    bgGradient: 'transparent',
    primaryGlow: '#38BDF8',
    secondaryGlow: '#818CF8',
    accentGlow: '#2DD4BF',
    causticAlpha: 0.08,
  },
};

interface LiquidBackgroundProps {
  isDimmed: boolean;
  character: CharacterProfile;
  intensity?: 'normal' | 'medium' | 'high';
  isRecording?: boolean;
  audioLevel?: number;
  themeId?: LiquidThemeId;
}

interface LiquidDrop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
  glow: string;
}

interface RippleWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  speed: number;
  color: string;
}

interface AmbientMetaball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  color: string;
  pulseSpeed: number;
  phase: number;
}

export const LiquidBackground: React.FC<LiquidBackgroundProps> = ({
  isDimmed,
  character,
  intensity = 'normal',
  isRecording = false,
  audioLevel = 0,
  themeId = 'cyber_aurora',
}) => {
  const currentTheme = LIQUID_THEMES[themeId] || LIQUID_THEMES.cyber_aurora;

  const isRecordingRef = useRef(isRecording);
  isRecordingRef.current = isRecording;
  const audioLevelRef = useRef(audioLevel);
  audioLevelRef.current = audioLevel;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number; lastX: number; lastY: number; speed: number }>({
    x: -1000,
    y: -1000,
    lastX: -1000,
    lastY: -1000,
    speed: 0,
  });

  const dropsRef = useRef<LiquidDrop[]>([]);
  const ripplesRef = useRef<RippleWave[]>([]);
  const metaballsRef = useRef<AmbientMetaball[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Seed ambient floating liquid metaballs
    metaballsRef.current = [
      {
        x: width * 0.25,
        y: height * 0.35,
        vx: 0.18,
        vy: 0.12,
        radius: 160,
        baseRadius: 160,
        color: currentTheme.primaryGlow,
        pulseSpeed: 0.0015,
        phase: 0,
      },
      {
        x: width * 0.75,
        y: height * 0.6,
        vx: -0.15,
        vy: -0.1,
        radius: 200,
        baseRadius: 200,
        color: currentTheme.secondaryGlow,
        pulseSpeed: 0.0012,
        phase: Math.PI * 0.5,
      },
      {
        x: width * 0.5,
        y: height * 0.8,
        vx: 0.1,
        vy: -0.14,
        radius: 170,
        baseRadius: 170,
        color: currentTheme.accentGlow,
        pulseSpeed: 0.0018,
        phase: Math.PI,
      },
    ];

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Global cursor tracking for magic cooling ripples and dynamic cryogenic particles
    const handleMouseMove = (e: MouseEvent) => {
      const mouse = mouseRef.current;
      const dx = e.clientX - (mouse.lastX === -1000 ? e.clientX : mouse.lastX);
      const dy = e.clientY - (mouse.lastY === -1000 ? e.clientY : mouse.lastY);
      const speed = Math.min(65, Math.hypot(dx, dy));

      mouse.speed = speed;
      mouse.lastX = mouse.x;
      mouse.lastY = mouse.y;
      mouse.x = e.clientX;
      mouse.y = e.clientY;

      if (speed > 2) {
        // Cooling hues tuned to the current liquid theme
        const coolHues = [
          currentTheme.primaryGlow,
          currentTheme.secondaryGlow,
          currentTheme.accentGlow,
          '#E0F2FE', // Bright crystalline ice
        ];
        const pickColor = coolHues[Math.floor(Math.random() * coolHues.length)];

        // Spawn interactive liquid ripple shockwaves
        if (Math.random() < 0.55 || speed > 18) {
          ripplesRef.current.push({
            x: e.clientX,
            y: e.clientY,
            radius: 8,
            maxRadius: 75 + speed * 2.8,
            alpha: 0.7,
            speed: 2.0 + speed * 0.12,
            color: pickColor,
          });
        }

        // Spawn buoyant cryogenic micro-droplets
        const count = Math.min(5, Math.floor(speed / 7) + 1);
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dropSpeed = Math.random() * 2.5 + 0.6;
          dropsRef.current.push({
            x: e.clientX + (Math.random() - 0.5) * 14,
            y: e.clientY + (Math.random() - 0.5) * 14,
            vx: Math.cos(angle) * dropSpeed + dx * 0.04,
            vy: Math.sin(angle) * dropSpeed + dy * 0.04 - 0.45, // upward liquid drift
            radius: Math.random() * 3.5 + 2,
            maxRadius: 6,
            life: 1.0,
            maxLife: 45 + Math.random() * 35,
            color: pickColor,
            glow: currentTheme.primaryGlow,
          });
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Render loop
    let lastTime = performance.now();
    const render = (now: number) => {
      animationFrameRef.current = requestAnimationFrame(render);
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      // 1. Ambient Floating Bioluminescent Liquid Metaballs (soft radial gradient blobs)
      if (themeId !== 'transparent') {
        const metaballs = metaballsRef.current;
        for (const mb of metaballs) {
          mb.x += mb.vx;
          mb.y += mb.vy;
          if (mb.x < -mb.radius) mb.x = width + mb.radius;
          if (mb.x > width + mb.radius) mb.x = -mb.radius;
          if (mb.y < -mb.radius) mb.y = height + mb.radius;
          if (mb.y > height + mb.radius) mb.y = -mb.radius;

          mb.radius = mb.baseRadius + Math.sin(now * mb.pulseSpeed + mb.phase) * 25;

          const grad = ctx.createRadialGradient(mb.x, mb.y, 0, mb.x, mb.y, mb.radius);
          grad.addColorStop(0, `${mb.color}35`);
          grad.addColorStop(0.5, `${mb.color}15`);
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.save();
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(mb.x, mb.y, mb.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // 2. Liquid Caustic Flow Waves (flowing organic water reflections)
      const t = now * 0.0008;
      const waveAlpha = currentTheme.causticAlpha;
      ctx.save();
      ctx.globalAlpha = isDimmed ? waveAlpha * 0.4 : waveAlpha;
      ctx.strokeStyle = currentTheme.primaryGlow;
      ctx.lineWidth = 1.2;

      for (let j = 0; j < 3; j++) {
        ctx.beginPath();
        const yOffset = height * (0.3 + j * 0.25);
        for (let x = 0; x <= width; x += 30) {
          const y =
            yOffset +
            Math.sin(x * 0.004 + t * (j + 1) + j) * 22 +
            Math.cos(x * 0.008 - t * 0.5) * 12;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();

      // 3. Dynamic Fluid Loop Gyroscope Rings (audio-reactive during voice input)
      const isRec = isRecordingRef.current;
      const lvl = audioLevelRef.current || 0;
      const centerX = width * 0.5;
      const centerY = height * 0.5;

      const loopCount = isRec ? 5 : 3;
      for (let l = 1; l <= loopCount; l++) {
        const baseRadius = l * 95 + Math.sin(now * 0.0012 * l) * 22 + (isRec ? lvl * 130 : 0);
        ctx.save();
        ctx.strokeStyle = l % 2 === 0 ? currentTheme.secondaryGlow : currentTheme.primaryGlow;
        ctx.globalAlpha = isRec ? 0.35 + lvl * 0.5 : 0.09;
        ctx.lineWidth = isRec ? 1.8 + lvl * 2.8 : 1.0;
        ctx.setLineDash([18, 12, 6, 12]);
        ctx.beginPath();
        ctx.arc(centerX, centerY, Math.max(10, baseRadius), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 4. Cursor Cooling Aura
      const mouse = mouseRef.current;
      if (mouse.x > 0 && mouse.y > 0) {
        const auraRadius = 140 + Math.min(90, mouse.speed * 2.2);
        const auraGrad = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          0,
          mouse.x,
          mouse.y,
          auraRadius
        );
        auraGrad.addColorStop(0, `${currentTheme.primaryGlow}28`);
        auraGrad.addColorStop(0.4, `${currentTheme.secondaryGlow}15`);
        auraGrad.addColorStop(0.7, `${currentTheme.accentGlow}08`);
        auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, auraRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 5. Update and render liquid ripple rings
      const ripples = ripplesRef.current;
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += r.speed;
        r.alpha -= 0.012;

        if (r.alpha <= 0 || r.radius >= r.maxRadius) {
          ripples.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.strokeStyle = r.color;
        ctx.globalAlpha = Math.max(0, r.alpha);
        ctx.lineWidth = 2.0 * (1 - r.radius / r.maxRadius);
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Refractive inner wave
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.arc(r.x, r.y, Math.max(0, r.radius - 7), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 6. Update and render cooling buoyant micro-droplets
      const drops = dropsRef.current;
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.x += d.vx;
        d.y += d.vy;
        d.vx *= 0.96;
        d.vy *= 0.96;
        d.life -= 1 / d.maxLife;

        if (d.life <= 0) {
          drops.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, d.life);
        ctx.shadowColor = d.glow;
        ctx.shadowBlur = 12;
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.radius * d.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (drops.length > 140) drops.splice(0, drops.length - 140);
      if (ripples.length > 60) ripples.splice(0, ripples.length - 60);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [currentTheme, isDimmed, themeId]);

  // Dynamic dimming opacity calculation
  const dimOpacity = isDimmed
    ? intensity === 'high'
      ? 'opacity-85'
      : 'opacity-70'
    : 'opacity-0';

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* 1. Base Liquid Gradient Layer (replaces stark white void with deep luxury glass) */}
      <div
        className="absolute inset-0 transition-all duration-700 pointer-events-none"
        style={{
          background: currentTheme.bgGradient,
        }}
      />

      {/* 2. Ambient Shimmering Liquid Light Waves */}
      {themeId !== 'transparent' && (
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <div
            className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full blur-3xl animate-orbit-ring"
            style={{ backgroundColor: `${currentTheme.primaryGlow}20` }}
          />
          <div
            className="absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full blur-3xl animate-orbit-ring"
            style={{ backgroundColor: `${currentTheme.secondaryGlow}20` }}
          />
        </div>
      )}

      {/* 3. Deep-Thinking & Intensive Tool Calling Dimming Overlay */}
      <div
        className={`absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-1000 ease-in-out ${dimOpacity}`}
      >
        <div
          className="absolute inset-0 animate-pulse-glow opacity-30 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 50% 50%, ${character.glowColor}40 0%, ${currentTheme.primaryGlow}15 45%, transparent 75%)`,
          }}
        />
      </div>

      {/* 4. Interactive HTML5 Canvas (caustics, metaballs, cooling ripples, loops) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
    </div>
  );
};
