export type AgentToolName =
  | 'run_command'
  | 'read_file'
  | 'write_file'
  | 'list_dir'
  | 'open_app_or_url'
  | 'web_search'
  | 'fetch_url'
  | 'take_screenshot'
  | 'set_reminder';

export type AgentActionStatus =
  | 'pending_approval'
  | 'approved'
  | 'denied'
  | 'blocked_by_safety'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface AgentActivityLogItem {
  id: string;
  timestamp: number;
  tool: AgentToolName;
  description: string;
  parameters: Record<string, any>;
  status: AgentActionStatus;
  result?: string;
  error?: string;
  requiresConfirmation: boolean;
  blockedReason?: string;
}

export interface AgentConfirmationRequest {
  id: string;
  tool: AgentToolName;
  title: string;
  parameters: Record<string, any>;
  explanation: string;
  commandSnippet?: string;
  targetPath?: string;
  contentSnippet?: string;
  resolve: (approved: boolean) => void;
}
