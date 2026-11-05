/**
 * Real-time microphone audio frequency and level tracker
 * using the Web Audio API AnalyserNode with fallback simulation.
 */

export class MicAudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private animationId: number | null = null;
  private isRunning = false;

  public async start(onLevel: (bands: number[], avgLevel: number) => void) {
    this.stop();

    try {
      if (typeof window !== 'undefined' && navigator?.mediaDevices?.getUserMedia) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioCtx();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 64; // 32 frequency bins
        this.analyser.smoothingTimeConstant = 0.75;

        this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.source.connect(this.analyser);

        const bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(bufferLength);
        this.isRunning = true;

        const loop = () => {
          if (!this.isRunning || !this.analyser || !this.dataArray) return;
          this.analyser.getByteFrequencyData(this.dataArray);

          const bands: number[] = [];
          let sum = 0;
          const step = Math.max(1, Math.floor(bufferLength / 16));
          for (let i = 0; i < 16; i++) {
            const raw = this.dataArray[i * step] || 0;
            const normalized = Math.min(1, Math.max(0.08, raw / 255));
            bands.push(normalized);
            sum += normalized;
          }
          const avg = sum / 16;
          onLevel(bands, avg);
          this.animationId = requestAnimationFrame(loop);
        };

        loop();
        return;
      }
    } catch (err) {
      console.warn('Microphone stream access error, using simulated soundwaves:', err);
    }

    // Fallback simulation for headless / restricted permissions
    this.startSynthetic(onLevel);
  }

  private startSynthetic(onLevel: (bands: number[], avgLevel: number) => void) {
    this.isRunning = true;
    let t = 0;
    const loop = () => {
      if (!this.isRunning) return;
      t += 0.14;
      const bands: number[] = [];
      let sum = 0;
      for (let i = 0; i < 16; i++) {
        const val = Math.max(0.12, (Math.sin(t * 1.5 + i * 0.45) * 0.42 + 0.5) * (Math.cos(t * 0.9 + i * 0.2) * 0.35 + 0.65));
        bands.push(val);
        sum += val;
      }
      onLevel(bands, sum / 16);
      this.animationId = requestAnimationFrame(loop);
    };
    loop();
  }

  public stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.source) {
      try { this.source.disconnect(); } catch (_) {}
      this.source = null;
    }
    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track) => track.stop());
      } catch (_) {}
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try { this.audioContext.close(); } catch (_) {}
      this.audioContext = null;
    }
  }
}

export const micAudioAnalyzer = new MicAudioAnalyzer();
