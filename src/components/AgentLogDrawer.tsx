import React, { useState } from 'react';
import { ScrollText, CheckCircle2, XCircle, AlertTriangle, Clock, PlayCircle, Trash2, X, ChevronDown, ChevronUp, Terminal, Search } from 'lucide-react';
import { AgentActivityLogItem } from '../types/agent.js';

interface AgentLogDrawerProps {
  logs: AgentActivityLogItem[];
  isOpen: boolean;
  onClose: () => void;
  onClearLogs: () => void;
}

export const AgentLogDrawer: React.FC<AgentLogDrawerProps> = ({
  logs,
  isOpen,
  onClose,
  onClearLogs,
}) => {
  const [filterTool, setFilterTool] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    if (filterTool !== 'all' && log.tool !== filterTool) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = log.description.toLowerCase().includes(q);
      const matchTool = log.tool.toLowerCase().includes(q);
      const matchParams = JSON.stringify(log.parameters).toLowerCase().includes(q);
      const matchResult = (log.result || '').toLowerCase().includes(q);
      return matchDesc || matchTool || matchParams || matchResult;
    }
    return true;
  });

  const getStatusBadge = (status: AgentActivityLogItem['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            <span>Completed</span>
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-teal-500/15 text-teal-300 border border-teal-500/30">
            <CheckCircle2 className="w-3 h-3" />
            <span>Approved</span>
          </span>
        );
      case 'denied':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <XCircle className="w-3 h-3" />
            <span>Denied</span>
          </span>
        );
      case 'blocked_by_safety':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/20 text-red-300 border border-red-500/40">
            <AlertTriangle className="w-3 h-3" />
            <span>Blocked by Safety</span>
          </span>
        );
      case 'executing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <PlayCircle className="w-3 h-3 animate-spin" />
            <span>Executing</span>
          </span>
        );
      case 'pending_approval':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <Clock className="w-3 h-3" />
            <span>Pending Approval</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-700 text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl h-[85vh] bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Drawer Header */}
        <div className="p-4 px-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/20">
              <ScrollText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Agent Activity Log</h2>
              <p className="text-xs text-slate-400">Audit trail of all tool executions, approvals & safety blocks</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {logs.length > 0 && (
              <button
                type="button"
                onClick={onClearLogs}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-rose-300 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                title="Clear all logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters and search bar */}
        <div className="p-3 px-5 border-b border-slate-800 bg-slate-900/60 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search actions, commands, paths..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <select
            value={filterTool}
            onChange={(e) => setFilterTool(e.target.value)}
            className="py-1.5 px-3 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="all">All Tools</option>
            <option value="run_command">run_command (PowerShell)</option>
            <option value="write_file">write_file</option>
            <option value="read_file">read_file</option>
            <option value="list_dir">list_dir</option>
            <option value="open_app_or_url">open_app_or_url</option>
            <option value="web_search">web_search</option>
            <option value="take_screenshot">take_screenshot</option>
            <option value="set_reminder">set_reminder</option>
          </select>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
          {filteredLogs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <Terminal className="w-10 h-10 mb-2.5 opacity-30" />
              <p className="text-sm font-medium text-slate-400">No agent actions recorded yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                When Agent Mode is enabled, tool requests (PowerShell commands, file modifications, screenshots) will appear here with verification status.
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isExpanded = expandedId === log.id;
              const timeStr = new Date(log.timestamp).toLocaleTimeString();

              return (
                <div
                  key={log.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/80 hover:border-slate-750 transition-all overflow-hidden"
                >
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    className="p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-800 text-amber-300 shrink-0 font-medium border border-slate-700/70">
                        {log.tool}
                      </span>
                      <span className="text-xs text-slate-200 truncate font-medium">
                        {log.description}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      {getStatusBadge(log.status)}
                      <span className="text-[11px] text-slate-500 font-mono">{timeStr}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-3.5 pt-0 border-t border-slate-800/80 bg-slate-950/50 flex flex-col gap-2 text-xs">
                      {log.blockedReason && (
                        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                          <strong className="block font-semibold">Blocked by Safety Policy:</strong>
                          {log.blockedReason}
                        </div>
                      )}

                      <div>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                          Parameters:
                        </span>
                        <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-slate-300 overflow-x-auto text-[11px]">
                          {JSON.stringify(log.parameters, null, 2)}
                        </pre>
                      </div>

                      {log.result && (
                        <div>
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                            Result / Output:
                          </span>
                          <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-emerald-300 overflow-x-auto text-[11px] max-h-40 overflow-y-auto whitespace-pre-wrap">
                            {log.result}
                          </pre>
                        </div>
                      )}

                      {log.error && (
                        <div>
                          <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider block mb-1">
                            Error:
                          </span>
                          <pre className="p-2.5 rounded-lg bg-slate-950 border border-rose-950 font-mono text-rose-400 overflow-x-auto text-[11px]">
                            {log.error}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
