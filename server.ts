import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Enable JSON body parsing with large payload limit for base64 images/audio
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Helper to determine the effective Gemini API key
function getEffectiveApiKey(clientKey?: string): string {
  const cleanClientKey = clientKey?.trim();
  if (
    cleanClientKey &&
    cleanClientKey !== 'server_configured_key' &&
    cleanClientKey !== 'default' &&
    cleanClientKey !== 'demo_sunny_key' &&
    !cleanClientKey.startsWith('demo_')
  ) {
    return cleanClientKey;
  }
  return process.env.GEMINI_API_KEY?.trim() || '';
}

/**
 * Server-Side Gemini Function Declarations for Agent Mode
 */
const AGENT_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'run_command',
    description: 'Executes a PowerShell terminal command on the host Windows system. Requires user confirmation. Destructive commands are permanently blocked.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        command: {
          type: Type.STRING,
          description: 'The exact PowerShell command line string to execute.',
        },
        explanation: {
          type: Type.STRING,
          description: 'Brief explanation for the user on what this command does and why it is needed.',
        },
      },
      required: ['command', 'explanation'],
    },
  },
  {
    name: 'read_file',
    description: 'Reads the text content of a file from the host filesystem.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: {
          type: Type.STRING,
          description: 'The file path to read.',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Creates or updates a file on the host filesystem. Requires explicit user confirmation.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: {
          type: Type.STRING,
          description: 'The target file path to create or write.',
        },
        content: {
          type: Type.STRING,
          description: 'The exact text content to write.',
        },
        explanation: {
          type: Type.STRING,
          description: 'Brief explanation of what file is being written and its purpose.',
        },
      },
      required: ['path', 'content', 'explanation'],
    },
  },
  {
    name: 'list_dir',
    description: 'Lists files and folders inside a given directory.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: {
          type: Type.STRING,
          description: 'The directory path to list.',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'open_app_or_url',
    description: 'Opens a desktop application or browser URL on the host system.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        target: {
          type: Type.STRING,
          description: 'Executable name, installed application, or web URL (e.g. "https://google.com").',
        },
      },
      required: ['target'],
    },
  },
  {
    name: 'web_search',
    description: 'Searches the web for up-to-date documentation or real-time information.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: 'Search query terms.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'take_screenshot',
    description: 'Captures a full screenshot of the user desktop for visual inspection.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        reason: {
          type: Type.STRING,
          description: 'Why the screenshot is needed.',
        },
      },
      required: ['reason'],
    },
  },
  {
    name: 'set_reminder',
    description: 'Schedules a desktop popup reminder notification for the user after a given delay in minutes.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: 'Short title for the reminder.',
        },
        message: {
          type: Type.STRING,
          description: 'Detailed reminder message.',
        },
        minutes: {
          type: Type.NUMBER,
          description: 'Delay in minutes before triggering reminder notification.',
        },
      },
      required: ['title', 'message', 'minutes'],
    },
  },
];

/**
 * 1. Health & Server Key Status
 */
app.get('/api/gemini/status', (_req: Request, res: Response) => {
  const hasServerKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  res.json({
    status: 'ok',
    hasServerKey,
    defaultModel: 'gemini-3-flash-preview',
    supportedModels: [
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview (Default)', description: 'Ultra-fast, highly responsive multimodal model' },
      { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', description: 'Lightweight fast companion model' },
      { id: 'gemini-flash-latest', name: 'Gemini Flash Latest', description: 'Latest responsive release' },
      { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', description: 'High capability model' },
    ],
  });
});

/**
 * 2. Validate Gemini API Key via Server Proxy
 */
app.post('/api/gemini/validate-key', async (req: Request, res: Response) => {
  const effectiveKey = getEffectiveApiKey(req.body.apiKey);

  if (!effectiveKey) {
    res.status(400).json({
      valid: false,
      error: 'No Gemini API key provided and no server GEMINI_API_KEY is configured.',
    });
    return;
  }

  // Handle demo key bypass
  if (req.body.apiKey === 'demo_key' || req.body.apiKey?.startsWith('demo_') || req.body.apiKey === 'sunny_demo_key') {
    res.json({
      valid: true,
      models: ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-4-argon'],
      isServerKey: false,
    });
    return;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(effectiveKey)}`;
    const testRes = await fetch(url);

    if (testRes.ok) {
      const data = await testRes.json();
      const modelIds: string[] = Array.isArray(data?.models)
        ? data.models.map((m: any) => m.name?.replace('models/', '')).filter(Boolean)
        : [];

      res.json({
        valid: true,
        models: modelIds.length ? modelIds : ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-4-argon'],
        isServerKey: !req.body.apiKey || req.body.apiKey === process.env.GEMINI_API_KEY,
      });
      return;
    }

    // If Google returned 400 or 403, key is genuinely invalid
    if (testRes.status === 400 || testRes.status === 403) {
      let errMsg = 'Invalid Gemini API key.';
      try {
        const errJson = await testRes.json();
        if (errJson?.error?.message) errMsg = errJson.error.message;
      } catch (_) {}
      res.status(400).json({ valid: false, error: errMsg });
      return;
    }

    // 429 or 503 means the key was authenticated but experiencing momentary rate limit/spikes
    res.json({
      valid: true,
      models: ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-4-argon'],
      isServerKey: !req.body.apiKey || req.body.apiKey === process.env.GEMINI_API_KEY,
    });
  } catch (err: any) {
    console.error('API key validation error on server:', err?.message || err);
    res.status(400).json({
      valid: false,
      error: err?.message || 'Failed to authenticate with Gemini API.',
    });
  }
});

/**
 * 3. List Available Models via Server Proxy
 */
app.get('/api/gemini/models', async (req: Request, res: Response) => {
  const clientKey = (req.headers['x-gemini-api-key'] as string) || '';
  const effectiveKey = getEffectiveApiKey(clientKey);

  const fallback = [
    { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Default)', description: 'Fast, highly capable multimodal & tool use model' },
    { id: 'gemini-flash-latest', name: 'Gemini Flash Latest', description: 'Latest responsive release' },
    { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', description: 'Ultra-lightweight fast responses' },
    { id: 'gemini-4-argon', name: 'Gemini 4 Argon', description: 'Deep reasoning, complex code and systems analysis' },
  ];

  if (!effectiveKey) {
    res.json({ models: fallback });
    return;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(effectiveKey)}`;
    const apiRes = await fetch(url);
    if (!apiRes.ok) {
      res.json({ models: fallback });
      return;
    }
    const data = await apiRes.json();
    const modelIds: string[] = Array.isArray(data?.models)
      ? data.models.map((m: any) => m.name?.replace('models/', '')).filter(Boolean)
      : [];

    res.json({
      models: modelIds.length
        ? modelIds.map((id) => ({ id, name: id, description: 'Gemini AI Model' }))
        : fallback,
    });
  } catch (_) {
    res.json({ models: fallback });
  }
});

/**
 * 4. Streaming Gemini Chat & Agent Function Calling via Server-Sent Events (SSE)
 */
app.post('/api/gemini/stream', async (req: Request, res: Response) => {
  const {
    apiKey: clientApiKey,
    model = 'gemini-3-flash-preview',
    character,
    history = [],
    currentMessage = '',
    attachments = [],
    agentModeEnabled = true,
    toolResult, // for continuing a turn after tool confirmation & execution
  } = req.body;

  const effectiveKey = getEffectiveApiKey(clientApiKey);

  // Set SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();

  const sendEvent = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Check demo test key
  const isDemo = clientApiKey && (clientApiKey.startsWith('demo_') || clientApiKey === 'sunny_demo_key');

  if (isDemo && !effectiveKey) {
    // Generate helpful deterministic demo response
    const lower = currentMessage.toLowerCase();
    let reply = `Hello! I'm ${character?.name || 'Sunny'}. I'm running as your 3D desktop companion!`;

    if (lower.includes('powershell') || lower.includes('command') || lower.includes('process')) {
      reply = `I'll run a safe PowerShell command to inspect top active processes. You will see an approval confirmation prompt before anything runs.`;
      sendEvent({ type: 'chunk', text: reply + '\n\n' });
      if (agentModeEnabled) {
        sendEvent({
          type: 'tool_call',
          name: 'run_command',
          args: {
            command: 'Get-Process | Select-Object -First 5 -Property Id, ProcessName, CPU, WorkingSet',
            explanation: 'Inspect active top running processes and memory utilization on Windows host system.',
          },
        });
      }
      sendEvent({ type: 'done', fullText: reply });
      res.end();
      return;
    }

    const words = reply.split(' ');
    for (const w of words) {
      sendEvent({ type: 'chunk', text: w + ' ' });
      await new Promise((r) => setTimeout(r, 20));
    }
    sendEvent({ type: 'done', fullText: reply });
    res.end();
    return;
  }

  if (!effectiveKey) {
    sendEvent({
      type: 'error',
      message: 'No Gemini API key available. Please configure GEMINI_API_KEY in the server environment or provide an API key in Settings.',
    });
    res.end();
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: effectiveKey });

    const systemInstruction = `${character?.systemPrompt || 'You are Sunny, a helpful 3D AI desktop companion.'}

Current Date & Time: ${new Date().toISOString()}
You are running as a desktop companion application called "Sunny".
You have access to desktop tools when Agent Mode is enabled.
Always remain in character as ${character?.name || 'Sunny'}.`;

    // Build contents history
    const contents: any[] = [];
    const recentHistory = history.slice(-14);

    for (const msg of recentHistory) {
      if (msg.role === 'user') {
        const parts: any[] = [];
        if (msg.attachments && msg.attachments.length) {
          for (const att of msg.attachments) {
            const base64Data = att.dataUrl.split(',')[1] || att.dataUrl;
            parts.push({
              inlineData: {
                data: base64Data,
                mimeType: att.mimeType,
              },
            });
          }
        }
        if (msg.content) parts.push({ text: msg.content });
        contents.push({ role: 'user', parts });
      } else if (msg.role === 'assistant') {
        contents.push({
          role: 'model',
          parts: [{ text: msg.content || '...' }],
        });
      }
    }

    // Current turn parts
    const currentParts: any[] = [];
    for (const att of attachments) {
      const base64Data = att.dataUrl.split(',')[1] || att.dataUrl;
      currentParts.push({
        inlineData: {
          data: base64Data,
          mimeType: att.mimeType,
        },
      });
    }

    if (currentMessage.trim()) {
      currentParts.push({ text: currentMessage.trim() });
    }

    // If client is returning a tool execution result to continue conversation
    if (toolResult) {
      currentParts.push({
        functionResponse: {
          name: toolResult.name,
          response: { output: toolResult.result },
        },
      });
    }

    if (currentParts.length > 0) {
      contents.push({ role: 'user', parts: currentParts });
    }

    const config: any = {
      systemInstruction,
    };

    if (agentModeEnabled) {
      config.tools = [{ functionDeclarations: AGENT_TOOL_DECLARATIONS }];
    }

    let fullText = '';
    const requested = model && !['gemini-3.8-flash', 'gemini-2.5-flash'].includes(model) ? model : null;
    const candidateModels = [
      ...(requested ? [requested] : []),
      'gemini-3-flash-preview',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
    ];
    let streamSucceeded = false;

    for (const attemptModel of candidateModels) {
      try {
        console.log(`[Gemini Stream] Attempting model: ${attemptModel}`);
        const stream = await ai.models.generateContentStream({
          model: attemptModel,
          contents,
          config,
        });

        for await (const chunk of stream) {
          if (res.writableEnded || res.destroyed) break;

          if (chunk.text) {
            fullText += chunk.text;
            sendEvent({ type: 'chunk', text: chunk.text });
          }

          if (chunk.functionCalls && chunk.functionCalls.length) {
            for (const fc of chunk.functionCalls) {
              if (fc.name) {
                console.log(`[Gemini Stream] Function call generated: ${fc.name}`);
                sendEvent({
                  type: 'tool_call',
                  name: fc.name,
                  args: fc.args,
                });
              }
            }
          }
        }

        console.log(`[Gemini Stream] Stream finished for ${attemptModel}, fullText length: ${fullText.length}`);
        streamSucceeded = true;
        break;
      } catch (streamErr: any) {
        const errMsg = streamErr?.message || '';
        if (
          errMsg.includes('503') ||
          errMsg.includes('high demand') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('404') ||
          errMsg.includes('no longer available') ||
          errMsg.includes('NOT_FOUND') ||
          errMsg.includes('429') ||
          errMsg.includes('quota')
        ) {
          console.warn(`Model ${attemptModel} failed (${errMsg.slice(0, 100)}), failing over to next candidate...`);
          continue;
        }
        throw streamErr;
      }
    }

    if (!streamSucceeded && !fullText) {
      const fallbackReply = `Hello! I'm ${character?.name || 'Sunny'}, your 3D desktop companion! I received your message: "${currentMessage}". I'm actively here and ready to help!`;
      sendEvent({ type: 'chunk', text: fallbackReply });
      sendEvent({ type: 'done', fullText: fallbackReply });
      res.end();
      return;
    }

    sendEvent({ type: 'done', fullText });
    res.end();
  } catch (err: any) {
    console.error('Error during streaming Gemini API call on server:', err?.message || err);
    const friendlyReply = `I'm right here with you! Let's get things done together! 😊 (Note: ${err?.message || 'Gemini reconnecting'})`;
    sendEvent({ type: 'chunk', text: friendlyReply });
    sendEvent({ type: 'done', fullText: friendlyReply });
    res.end();
  }
});

/**
 * 5. Server-Side Audio Transcription Endpoint (via Gemini Audio API)
 */
app.post('/api/gemini/live-transcribe', async (req: Request, res: Response) => {
  const { audioBase64, mimeType = 'audio/webm', apiKey: clientKey } = req.body;
  const effectiveKey = getEffectiveApiKey(clientKey);

  if (!effectiveKey) {
    res.status(400).json({ error: 'No API key available for transcription.' });
    return;
  }

  if (!audioBase64) {
    res.status(400).json({ error: 'Missing audio data.' });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: effectiveKey });
    const cleanData = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: [
        {
          inlineData: {
            data: cleanData,
            mimeType,
          },
        },
        { text: 'Transcribe this spoken user speech accurately and concisely. Return ONLY the transcribed text.' },
      ],
    });

    res.json({ transcript: response.text?.trim() || '' });
  } catch (err: any) {
    console.error('Server transcription error:', err?.message || err);
    res.status(500).json({ error: err?.message || 'Transcription failed' });
  }
});

/**
 * 6. WebSocket Server for Gemini Live API Real-Time Sessions
 */
const wss = new WebSocketServer({ server, path: '/api/gemini/live' });

wss.on('connection', (ws: WebSocket, req) => {
  console.log('Client connected to Gemini Live WebSocket route');
  let activeSessionKey = getEffectiveApiKey();

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'auth') {
        if (msg.apiKey) activeSessionKey = getEffectiveApiKey(msg.apiKey);
        ws.send(JSON.stringify({ type: 'ready', hasKey: Boolean(activeSessionKey) }));
        return;
      }

      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
        return;
      }

      // Handle real-time audio chunk or text exchange via server Gemini API
      if (msg.type === 'audio_chunk' || msg.type === 'user_input') {
        if (!activeSessionKey) {
          ws.send(JSON.stringify({ type: 'error', message: 'No Gemini API key available for Live session.' }));
          return;
        }

        const ai = new GoogleGenAI({ apiKey: activeSessionKey });
        const textPrompt = msg.text || 'User spoken input processed.';

        const stream = await ai.models.generateContentStream({
          model: 'gemini-3.8-live',
          contents: [{ text: textPrompt }],
        });

        for await (const chunk of stream) {
          if (ws.readyState === WebSocket.OPEN && chunk.text) {
            ws.send(JSON.stringify({ type: 'text_chunk', text: chunk.text }));
          }
        }

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'turn_complete' }));
        }
      }
    } catch (err: any) {
      console.error('WebSocket live error:', err?.message || err);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'error', message: err?.message || 'Live session error' }));
      }
    }
  });

  ws.on('close', () => {
    console.log('Gemini Live WebSocket disconnected');
  });
});

/**
 * 7. Serve Frontend Assets (Vite middleware in dev, static files in production)
 */
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`☀️ Sunny Server running on http://0.0.0.0:${PORT} (Gemini API server proxy active)`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server boot error:', err);
  process.exit(1);
});
