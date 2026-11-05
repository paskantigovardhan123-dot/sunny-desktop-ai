import React from 'react';
import { AlertTriangle, Terminal, FileCode, Check, X, ShieldAlert } from 'lucide-react';
import { AgentConfirmationRequest } from '../types/agent.js';
import { validateCommandSafety, validateWriteSafety } from '../utils/safety.js';

interface ConfirmationModalProps {
  request: AgentConfirmationRequest;
  onConfirm: (approved: boolean) => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  request,
  onConfirm,
}) => {
  const isCommand = request.tool === 'run_command';
  const commandText = request.parameters?.command || request.commandSnippet || '';
  const filePath = request.parameters?.path || request.targetPath || '';
  const fileContent = request.parameters?.content || request.contentSnippet || '';
  const explanation = request.parameters?.explanation || request.explanation || 'Agent requested execution';

  // Check safety block
  let isHardBlocked = false;
  let blockReason = '';

  if (isCommand) {
    const check = validateCommandSafety(commandText);
    if (check.blocked) {
      isHardBlocked = true;
      blockReason = check.reason || 'Command violates system safety policies.';
    }
  } else if (request.tool === 'write_file') {
    const check = validateWriteSafety(filePath, fileContent);
    if (check.blocked) {
      isHardBlocked = true;
      blockReason = check.reason || 'Target file path is restricted.';
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start gap-3.5">
          <div className={`p-2.5 rounded-xl shrink-0 ${isHardBlocked ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
            {isHardBlocked ? <ShieldAlert className="w-6 h-6" /> : isCommand ? <Terminal className="w-6 h-6" /> : <FileCode className="w-6 h-6" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white">
                {isHardBlocked
                  ? 'Action Hard-Blocked by Safety Rules'
                  : isCommand
                  ? 'Confirm PowerShell Execution'
                  : 'Confirm File Write'}
              </h2>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase tracking-wider ${isHardBlocked ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'}`}>
                {request.tool}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {explanation}
            </p>
          </div>
        </div>

        {/* Hard blocked warning banner if triggered */}
        {isHardBlocked && (
          <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-600/50 text-rose-200 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block text-rose-300">Safety Rule Enforced</strong>
              <p className="mt-0.5 leading-relaxed text-rose-200/90">{blockReason}</p>
              <p className="mt-1 text-[11px] text-rose-300/70">
                This operation cannot be executed even with approval to safeguard your operating system.
              </p>
            </div>
          </div>
        )}

        {/* Content Details: Code or Command */}
        <div className="flex flex-col gap-2">
          <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
            <span>{isCommand ? 'Exact Command to Run:' : `Target File: ${filePath}`}</span>
            <span className="text-[11px] font-mono text-slate-500">PowerShell / Host OS</span>
          </div>

          {isCommand ? (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto select-text leading-relaxed">
              {commandText}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-amber-300 break-all select-text">
                {filePath}
              </div>
              <div className="max-h-48 overflow-y-auto p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 select-text whitespace-pre-wrap leading-relaxed">
                {fileContent}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => onConfirm(false)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Deny & Abort</span>
          </button>

          {!isHardBlocked && (
            <button
              type="button"
              onClick={() => onConfirm(true)}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Approve Action</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
