import React, { useState, useEffect } from 'react';
import { KeyRound, ShieldCheck, Sparkles, AlertCircle, ArrowRight, ExternalLink, CheckCircle2 } from 'lucide-react';
import { validateGeminiApiKey, checkServerGeminiStatus } from '../utils/gemini.js';
import { saveApiKey } from '../utils/storage.js';

interface SetupModalProps {
  onSuccess: (apiKey: string) => void;
}

export const SetupModal: React.FC<SetupModalProps> = ({ onSuccess }) => {
  const [keyInput, setKeyInput] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasServerKey, setHasServerKey] = useState(false);

  React.useEffect(() => {
    checkServerGeminiStatus().then((status) => {
      if (status.hasServerKey) {
        setHasServerKey(true);
      }
    });
  }, []);

  const handleUseServerKey = async () => {
    setIsValidating(true);
    setErrorMsg(null);
    try {
      const res = await validateGeminiApiKey('');
      if (res.valid) {
        await saveApiKey('server_configured_key');
        onSuccess('server_configured_key');
      } else {
        setErrorMsg(res.error || 'Could not verify server API key.');
        setIsValidating(false);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error connecting to server.');
      setIsValidating(false);
    }
  };

  const handleValidateAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = keyInput.trim();
    if (!clean) {
      setErrorMsg('Please enter your Google Gemini API key to proceed.');
      return;
    }

    setIsValidating(true);
    setErrorMsg(null);

    try {
      const res = await validateGeminiApiKey(clean);
      if (!res.valid) {
        setErrorMsg(res.error || 'The provided Gemini API key could not be verified. Please verify the key and try again.');
        setIsValidating(false);
        return;
      }

      // Save encrypted
      const saved = await saveApiKey(clean);
      if (!saved) {
        setErrorMsg('Failed to securely store encryption key.');
        setIsValidating(false);
        return;
      }

      onSuccess(clean);
    } catch (err: any) {
      setErrorMsg(err?.message || 'An unexpected error occurred during API key validation.');
      setIsValidating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl p-7 text-slate-100 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header with App Branding */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">Sunny Desktop AI</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium">
                Initial Setup
              </span>
            </div>
            <p className="text-sm text-slate-400">3D Interactive Companion & Windows Desktop Agent</p>
          </div>
        </div>

        {/* Informational callout */}
        <div className="rounded-xl bg-slate-800/60 border border-slate-700/60 p-4 text-sm text-slate-300 flex flex-col gap-2">
          <div className="flex items-center gap-2 font-medium text-amber-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Secure Hardware Storage</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Sunny runs locally on your computer. Your Gemini API key is encrypted using{' '}
            <strong className="text-slate-200 font-semibold">Electron safeStorage</strong> (DPAPI / AES-GCM)
            and is never shared or stored in plain text.
          </p>
        </div>

        {hasServerKey && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 flex items-center justify-between text-xs text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Server Gemini API Key is active & ready!</span>
            </div>
            <button
              type="button"
              onClick={handleUseServerKey}
              disabled={isValidating}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-colors cursor-pointer shadow-sm"
            >
              Start Immediately
            </button>
          </div>
        )}

        {/* Setup Form */}
        <form onSubmit={handleValidateAndSave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="gemini-api-key" className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Google Gemini API Key</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 normal-case font-normal text-xs transition-colors"
              >
                <span>Get an API Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                id="gemini-api-key"
                type="password"
                placeholder="AIzaSy..."
                value={keyInput}
                onChange={(e) => {
                  setKeyInput(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                autoFocus
                disabled={isValidating}
              />
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs leading-relaxed animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1">
                <strong className="font-semibold block mb-0.5">Validation Failed</strong>
                {errorMsg}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isValidating || !keyInput.trim()}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-semibold text-sm shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isValidating ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                <span>Validating with Google Gemini...</span>
              </>
            ) : (
              <>
                <span>Save Key & Start Companion</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Note */}
        <div className="text-center text-[11px] text-slate-500">
          On future launches, Sunny starts directly. You can update or remove this key anytime in Settings.
        </div>
      </div>
    </div>
  );
};
