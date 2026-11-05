export interface ChatAttachment {
  type: 'image';
  dataUrl: string; // base64 data URL
  mimeType: string;
  name?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  characterId: string;
  attachments?: ChatAttachment[];
  toolCalls?: Array<{
    tool: string;
    params: any;
    result?: any;
    status: 'pending' | 'approved' | 'denied' | 'completed' | 'error';
  }>;
  isStreaming?: boolean;
}

export type AvatarEmotion = 'happy' | 'sad' | 'surprised' | 'thinking' | 'neutral' | 'relaxed';
