import { CharacterProfile } from '../types/character.js';

class SpeechManager {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private onLipSyncChange: ((active: boolean) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.loadVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        this.loadVoices();
      };
    }
  }

  private loadVoices() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices();
    }
  }

  public setLipSyncCallback(cb: (active: boolean) => void) {
    this.onLipSyncChange = cb;
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.voices.length) this.loadVoices();
    return this.voices;
  }

  public speak(text: string, character: CharacterProfile): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        resolve();
        return;
      }

      this.stop();

      // Clean markdown, code blocks and emojis for spoken speech
      const cleaned = text
        .replace(/```[\s\S]*?```/g, 'Code snippet provided in chat.')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/[*_~#\[\]]/g, '')
        .replace(/https?:\/\/\S+/g, 'link')
        .trim();

      if (!cleaned) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleaned);
      this.currentUtterance = utterance;

      // Select voice based on gender and quality
      if (!this.voices.length) this.loadVoices();
      const preferred = this.voices.find(v => {
        const name = v.name.toLowerCase();
        if (character.gender === 'female') {
          return (name.includes('female') || name.includes('zira') || name.includes('samantha') || name.includes('victoria') || name.includes('karen') || name.includes('jenny')) && v.lang.startsWith('en');
        } else {
          return (name.includes('male') || name.includes('david') || name.includes('george') || name.includes('guy') || name.includes('alex') || name.includes('daniel')) && v.lang.startsWith('en');
        }
      }) || this.voices.find(v => v.lang.startsWith('en')) || this.voices[0];

      if (preferred) {
        utterance.voice = preferred;
      }

      utterance.pitch = character.voice.pitch;
      utterance.rate = character.voice.rate;

      utterance.onstart = () => {
        this.onLipSyncChange?.(true);
      };

      utterance.onend = () => {
        this.onLipSyncChange?.(false);
        this.currentUtterance = null;
        resolve();
      };

      utterance.onerror = () => {
        this.onLipSyncChange?.(false);
        this.currentUtterance = null;
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  public stop() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.currentUtterance = null;
    this.onLipSyncChange?.(false);
  }

  public isSpeaking(): boolean {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      return window.speechSynthesis.speaking;
    }
    return false;
  }
}

export const speechManager = new SpeechManager();

/**
 * Speech-to-Text helper for Push-to-Talk voice in
 */
export function createSpeechRecognizer(
  onResult: (transcript: string, isFinal: boolean) => void,
  onError: (err: string) => void
) {
  if (typeof window === 'undefined') return null;

  const SpeechRecognitionConstructor =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognitionConstructor) {
    return null;
  }

  const recognition = new SpeechRecognitionConstructor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (event: any) => {
    let interim = '';
    let final = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        final += transcript;
      } else {
        interim += transcript;
      }
    }

    onResult(final || interim, Boolean(final));
  };

  recognition.onerror = (e: any) => {
    onError(e.error || 'Speech recognition error');
  };

  return recognition;
}
