import { ChatMessage, ChatAttachment, AvatarEmotion } from '../types/chat.js';
import { CharacterProfile } from '../types/character.js';

export interface ModelOption {
  id: string;
  name: string;
  description: string;
}

export const FALLBACK_MODELS: ModelOption[] = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview (Default)', description: 'Ultra-fast, highly responsive multimodal model' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', description: 'Lightweight fast companion model' },
  { id: 'gemini-flash-latest', name: 'Gemini Flash Latest', description: 'Latest responsive release' },
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', description: 'High capability model' },
];

/**
 * Checks server key availability and capabilities
 */
export async function checkServerGeminiStatus(): Promise<{ hasServerKey: boolean; defaultModel: string; models: ModelOption[] }> {
  try {
    const res = await fetch('/api/gemini/status');
    if (res.ok) {
      const data = await res.json();
      return {
        hasServerKey: Boolean(data.hasServerKey),
        defaultModel: data.defaultModel || 'gemini-3-flash-preview',
        models: data.supportedModels || FALLBACK_MODELS,
      };
    }
  } catch (err) {
    console.warn('Could not query server gemini status:', err);
  }
  return { hasServerKey: false, defaultModel: 'gemini-3-flash-preview', models: FALLBACK_MODELS };
}

/**
 * Validates a Gemini API key using the server-side proxy route.
 */
export async function validateGeminiApiKey(apiKey: string): Promise<{ valid: boolean; error?: string; models?: string[]; isServerKey?: boolean }> {
  const cleanKey = apiKey.trim();

  // Allow preview demo testing
  if (cleanKey === 'demo_key' || cleanKey.startsWith('demo_') || cleanKey === 'sunny_demo_key') {
    return {
      valid: true,
      models: ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-4-argon'],
      isServerKey: false,
    };
  }

  try {
    const response = await fetch('/api/gemini/validate-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: cleanKey }),
    });

    const data = await response.json();
    if (!response.ok || !data.valid) {
      return { valid: false, error: data.error || 'Failed to authenticate with Gemini API.' };
    }

    return {
      valid: true,
      models: data.models || ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-4-argon'],
      isServerKey: data.isServerKey,
    };
  } catch (err: any) {
    return {
      valid: false,
      error: err?.message || 'Network connection failed while verifying API key with server.',
    };
  }
}

/**
 * Fetches available models from the server
 */
export async function fetchAvailableModels(apiKey?: string): Promise<ModelOption[]> {
  try {
    const headers: Record<string, string> = {};
    if (apiKey) headers['x-gemini-api-key'] = apiKey;

    const res = await fetch('/api/gemini/models', { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.models) && data.models.length) {
        return data.models;
      }
    }
  } catch (_) {}
  return FALLBACK_MODELS;
}

/**
 * Detect emotion from assistant text to drive 3D avatar facial expressions
 */
export function inferEmotionFromText(text: string): AvatarEmotion {
  const lower = text.toLowerCase();
  if (lower.includes('!') || lower.includes('awesome') || lower.includes('great') || lower.includes('happy') || lower.includes('yay') || lower.includes('love') || lower.includes('celebrate') || lower.includes('excellent')) {
    return 'happy';
  }
  if (lower.includes('sorry') || lower.includes('regret') || lower.includes('unfortunately') || lower.includes('sad') || lower.includes('apologize') || lower.includes('error occurred')) {
    return 'sad';
  }
  if (lower.includes('wow') || lower.includes('whoa') || lower.includes('surprising') || lower.includes('incredible') || lower.includes('unbelievable')) {
    return 'surprised';
  }
  if (lower.includes('analyzing') || lower.includes('calculating') || lower.includes('thinking') || lower.includes('let me check') || lower.includes('investigating') || lower.includes('evaluating')) {
    return 'thinking';
  }
  if (lower.includes('calm') || lower.includes('peace') || lower.includes('relax') || lower.includes('gentle') || lower.includes('breathe')) {
    return 'relaxed';
  }
  return 'neutral';
}

/**
 * Streams response from Gemini API through the server-side SSE endpoint (/api/gemini/stream)
 */
export async function streamGeminiChat(options: {
  apiKey: string;
  model: string;
  character: CharacterProfile;
  history: ChatMessage[];
  currentMessage: string;
  attachments?: ChatAttachment[];
  agentModeEnabled: boolean;
  onChunk: (chunk: string) => void;
  onToolCall?: (toolCall: { name: string; args: any }) => Promise<any>;
  signal?: AbortSignal;
}): Promise<{ fullText: string; toolCallsExecuted: any[] }> {
  const {
    apiKey,
    model,
    character,
    history,
    currentMessage,
    attachments = [],
    agentModeEnabled,
    onChunk,
    onToolCall,
    signal,
  } = options;

  let fullText = '';
  const executedToolCalls: any[] = [];

  const response = await fetch('/api/gemini/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey,
      model,
      character,
      history,
      currentMessage,
      attachments,
      agentModeEnabled,
    }),
    signal,
  });

  if (!response.ok) {
    let errMsg = `Server returned ${response.status} ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson.error) errMsg = errJson.error;
    } catch (_) {}
    throw new Error(errMsg);
  }

  if (!response.body) {
    throw new Error('No response body returned from server stream endpoint.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    if (signal?.aborted) {
      await reader.cancel();
      break;
    }

    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;

      const jsonStr = trimmed.slice(6);
      try {
        const payload = JSON.parse(jsonStr);

        if (payload.type === 'error') {
          console.error('SSE Error from Gemini server:', payload.message);
          throw new Error(payload.message || 'Error received from Gemini API');
        } else if (payload.type === 'chunk' && payload.text) {
          fullText += payload.text;
          onChunk(payload.text);
        } else if (payload.type === 'done' && payload.fullText && !fullText) {
          fullText = payload.fullText;
          onChunk(payload.fullText);
        } else if (payload.type === 'tool_call' && onToolCall) {
          executedToolCalls.push({ name: payload.name, args: payload.args });
          // Invoke client safety check & user confirmation dialog
          const result = await onToolCall({ name: payload.name, args: payload.args });
          executedToolCalls[executedToolCalls.length - 1].result = result;

          // Request continuation turn with the tool execution result from server
          try {
            const contResponse = await fetch('/api/gemini/stream', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                apiKey,
                model,
                character,
                history,
                currentMessage,
                attachments,
                agentModeEnabled,
                toolResult: { name: payload.name, result },
              }),
              signal,
            });

            if (contResponse.body) {
              const contReader = contResponse.body.getReader();
              let contBuf = '';
              while (true) {
                const { done: cDone, value: cVal } = await contReader.read();
                if (cDone) break;
                contBuf += decoder.decode(cVal, { stream: true });
                const cLines = contBuf.split('\n');
                contBuf = cLines.pop() || '';
                for (const cLine of cLines) {
                  const cTrim = cLine.trim();
                  if (!cTrim.startsWith('data: ')) continue;
                  try {
                    const cPayload = JSON.parse(cTrim.slice(6));
                    if (cPayload.type === 'chunk' && cPayload.text) {
                      fullText += cPayload.text;
                      onChunk(cPayload.text);
                    }
                  } catch (_) {}
                }
              }
            }
          } catch (contErr) {
            console.warn('Continuation stream error:', contErr);
          }
        } else if (payload.type === 'error') {
          throw new Error(payload.message || 'Stream error from server.');
        }
      } catch (err: any) {
        if (err.message && err.message.includes('Stream error')) throw err;
      }
    }
  }

  return { fullText, toolCallsExecuted: executedToolCalls };
}

/**
 * Gemini Live API WebSocket Session Client
 */
export class GeminiLiveSession {
  private ws: WebSocket | null = null;
  private onTextChunk?: (text: string) => void;
  private onError?: (err: string) => void;
  private onReady?: () => void;

  constructor(handlers: {
    onTextChunk?: (text: string) => void;
    onError?: (err: string) => void;
    onReady?: () => void;
  }) {
    this.onTextChunk = handlers.onTextChunk;
    this.onError = handlers.onError;
    this.onReady = handlers.onReady;
  }

  public connect(apiKey?: string) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/gemini/live`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.ws?.send(JSON.stringify({ type: 'auth', apiKey }));
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'ready') {
          this.onReady?.();
        } else if (data.type === 'text_chunk') {
          this.onTextChunk?.(data.text);
        } else if (data.type === 'error') {
          this.onError?.(data.message);
        }
      } catch (err) {
        console.error('Error parsing live WS message:', err);
      }
    };

    this.ws.onerror = () => {
      this.onError?.('WebSocket connection error on /api/gemini/live');
    };
  }

  public sendInput(text: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'user_input', text }));
    }
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
