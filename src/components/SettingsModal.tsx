import React, { useState } from 'react';
import {
  X,
  KeyRound,
  Trash2,
  Sparkles,
  Bot,
  Volume2,
  Sliders,
  Shield,
  Upload,
  Check,
  RefreshCw,
  Info,
  ExternalLink,
  Droplet,
} from 'lucide-react';
import { CharacterProfile, DEFAULT_CHARACTERS } from '../types/character.js';
import { FALLBACK_MODELS, validateGeminiApiKey } from '../utils/gemini.js';
import { saveApiKey, removeApiKey } from '../utils/storage.js';
import { speechManager } from '../utils/tts.js';
import { LiquidThemeId, LIQUID_THEMES } from './LiquidBackground.js';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onApiKeyChange: (newKey: string) => void;
  onApiKeyRemove: () => void;
  selectedCharacter: CharacterProfile;
  characters: CharacterProfile[];
  onSelectCharacter: (char: CharacterProfile) => void;
  onUpdateCharacterPrompt: (charId: string, newPrompt: string) => void;
  onLoadCustomVrm: (file: File) => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  alwaysOnTop: boolean;
  onToggleAlwaysOnTop: (val: boolean) => void;
  autostartEnabled: boolean;
  onToggleAutostart: (val: boolean) => void;
  liquidThemeId?: LiquidThemeId;
  onSelectLiquidTheme?: (theme: LiquidThemeId) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onApiKeyChange,
  onApiKeyRemove,
  selectedCharacter,
  characters,
  onSelectCharacter,
  onUpdateCharacterPrompt,
  onLoadCustomVrm,
  selectedModel,
  onSelectModel,
  alwaysOnTop,
  onToggleAlwaysOnTop,
  autostartEnabled,
  onToggleAutostart,
  liquidThemeId = 'cyber_aurora',
  onSelectLiquidTheme,
}) => {
  const [activeTab, setActiveTab] = useState<'character' | 'model' | 'voice' | 'theme' | 'apikey' | 'system' | 'licenses'>('character');

  // Change key state
  const [newKeyInput, setNewKeyInput] = useState('');
  const [isChangingKey, setIsChangingKey] = useState(false);
  const [isKeyValidating, setIsKeyValidating] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [keySuccess, setKeySuccess] = useState(false);

  // System prompt edit state
  const [promptEdit, setPromptEdit] = useState(selectedCharacter.systemPrompt);
  const [promptSaved, setPromptSaved] = useState(false);

  // Voice test state
  const [customPitch, setCustomPitch] = useState(selectedCharacter.voice.pitch);
  const [customRate, setCustomRate] = useState(selectedCharacter.voice.rate);

  if (!isOpen) return null;

  const handleSavePrompt = () => {
    onUpdateCharacterPrompt(selectedCharacter.id, promptEdit);
    setPromptSaved(true);
    setTimeout(() => setPromptSaved(false), 2000);
  };

  const handleChangeKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyInput.trim()) return;

    setIsKeyValidating(true);
    setKeyError(null);
    setKeySuccess(false);

    const valResult = await validateGeminiApiKey(newKeyInput.trim());
    if (!valResult.valid) {
      setKeyError(valResult.error || 'Invalid API key');
      setIsKeyValidating(false);
      return;
    }

    const saved = await saveApiKey(newKeyInput.trim());
    if (saved) {
      onApiKeyChange(newKeyInput.trim());
      setKeySuccess(true);
      setIsChangingKey(false);
      setNewKeyInput('');
      setTimeout(() => setKeySuccess(false), 3000);
    } else {
      setKeyError('Could not securely encrypt key');
    }
    setIsKeyValidating(false);
  };

  const handleTestVoice = () => {
    const testChar: CharacterProfile = {
      ...selectedCharacter,
      voice: {
        ...selectedCharacter.voice,
        pitch: customPitch,
        rate: customRate,
      },
    };
    speechManager.speak(`Hello! I am ${selectedCharacter.name}, your desktop AI companion. Ready for your instructions!`, testChar);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoadCustomVrm(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-3xl h-[85vh] bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Settings & Preferences</h2>
              <p className="text-xs text-slate-400">Configure companions, AI model, voice & desktop integrations</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Sidebar Tabs + Main View */}
        <div className="flex-1 flex overflow-hidden">
          {/* Navigation Sidebar */}
          <div className="w-48 border-r border-slate-800 p-3 flex flex-col gap-1 bg-slate-900/50">
            <button
              type="button"
              onClick={() => setActiveTab('character')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors cursor-pointer ${
                activeTab === 'character'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>Companions</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('model')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors cursor-pointer ${
                activeTab === 'model'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Gemini Model</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('voice')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors cursor-pointer ${
                activeTab === 'voice'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Volume2 className="w-4 h-4" />
              <span>Voice & TTS</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('theme')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors cursor-pointer ${
                activeTab === 'theme'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Droplet className="w-4 h-4" />
              <span>Liquid Themes</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('apikey')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors cursor-pointer ${
                activeTab === 'apikey'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>API Key</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('system')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors cursor-pointer ${
                activeTab === 'system'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Desktop & Window</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('licenses')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors cursor-pointer ${
                activeTab === 'licenses'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Info className="w-4 h-4" />
              <span>VRM Licenses</span>
            </button>
          </div>

          {/* Main Tab Panel */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* CHARACTER TAB */}
            {activeTab === 'character' && (
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Select Active 3D Avatar</h3>
                  <p className="text-xs text-slate-400">
                    4 bundled VRM personalities (2 female, 2 male) with unique system prompts, voices & memories.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  {characters.map((char) => {
                    const isSelected = selectedCharacter.id === char.id;
                    return (
                      <div
                        key={char.id}
                        onClick={() => {
                          onSelectCharacter(char);
                          setPromptEdit(char.systemPrompt);
                          setCustomPitch(char.voice.pitch);
                          setCustomRate(char.voice.rate);
                        }}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/30'
                            : 'bg-slate-800/40 border-slate-750 hover:bg-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: char.themeColor }}
                            />
                            <span className="text-sm font-semibold text-white">{char.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 uppercase font-mono">
                              {char.gender}
                            </span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2">{char.tagline}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Upload Custom VRM */}
                <div className="p-4 rounded-xl border border-dashed border-slate-750 bg-slate-800/30 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-amber-400" />
                      <span>Load Custom .VRM Model</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Import any VRoid Studio or custom VRM 0.0/1.0 avatar from your computer.
                    </p>
                  </div>
                  <label className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition-colors border border-slate-700">
                    <span>Browse .vrm</span>
                    <input
                      type="file"
                      accept=".vrm"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Editable System Prompt */}
                <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-white">
                        Personality & Directives ({selectedCharacter.name})
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Customize how this companion behaves, thinks, and speaks with you.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSavePrompt}
                      className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {promptSaved ? <Check className="w-3.5 h-3.5" /> : null}
                      <span>{promptSaved ? 'Saved!' : 'Save Directives'}</span>
                    </button>
                  </div>

                  <textarea
                    rows={5}
                    value={promptEdit}
                    onChange={(e) => setPromptEdit(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
            )}

            {/* GEMINI MODEL TAB */}
            {activeTab === 'model' && (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Gemini AI Model Selection</h3>
                  <p className="text-xs text-slate-400">
                    Pick which Google Gemini model powers Sunny's reasoning, vision, and desktop agent execution.
                  </p>
                </div>

                <div className="flex flex-col gap-2.5">
                  {FALLBACK_MODELS.map((model) => {
                    const isSelected = selectedModel === model.id;
                    return (
                      <div
                        key={model.id}
                        onClick={() => onSelectModel(model.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/30'
                            : 'bg-slate-800/40 border-slate-750 hover:bg-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-white flex items-center gap-2">
                            {model.name}
                            {model.id === 'gemini-3.8-flash' && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Recommended
                              </span>
                            )}
                          </span>
                          <span className="text-[11px] text-slate-400 mt-0.5">{model.description}</span>
                          <span className="text-[10px] text-slate-500 font-mono mt-1">{model.id}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VOICE & TTS TAB */}
            {activeTab === 'voice' && (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Text-to-Speech & Vocal Characteristics</h3>
                  <p className="text-xs text-slate-400">
                    Configure speech synthesis pitch, speech rate, and preview avatar lip sync.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-750 flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-medium">Voice Pitch: {customPitch.toFixed(2)}x</span>
                      <span className="text-slate-500 text-[11px]">(Lower = Deeper, Higher = Brighter)</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.8"
                      step="0.05"
                      value={customPitch}
                      onChange={(e) => setCustomPitch(parseFloat(e.target.value))}
                      className="accent-amber-500"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-medium">Speech Rate: {customRate.toFixed(2)}x</span>
                      <span className="text-slate-500 text-[11px]">(Speed of spoken speech)</span>
                    </div>
                    <input
                      type="range"
                      min="0.7"
                      max="1.5"
                      step="0.05"
                      value={customRate}
                      onChange={(e) => setCustomRate(parseFloat(e.target.value))}
                      className="accent-amber-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleTestVoice}
                    className="mt-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-amber-300 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>Test Voice & Lip-Sync Preview</span>
                  </button>
                </div>
              </div>
            )}

            {/* API KEY TAB */}
            {activeTab === 'apikey' && (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Google Gemini API Key</h3>
                  <p className="text-xs text-slate-400">
                    Encrypted with Electron safeStorage (DPAPI). Never stored in plain text.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-750 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Current API Key:</span>
                    <span className="font-mono text-emerald-400">
                      {apiKey ? `${apiKey.substring(0, 6)}••••••••••••${apiKey.slice(-4)}` : 'None configured'}
                    </span>
                  </div>

                  {keySuccess && (
                    <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs">
                      API key validated and updated successfully.
                    </div>
                  )}

                  {!isChangingKey ? (
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsChangingKey(true)}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        Change API Key
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm('Are you sure you want to remove your Gemini API key? This will return Sunny to the first-launch setup screen.')) {
                            await removeApiKey();
                            onApiKeyRemove();
                            onClose();
                          }
                        }}
                        className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Key</span>
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleChangeKey} className="flex flex-col gap-3 pt-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-300 font-medium">New Gemini API Key:</label>
                        <input
                          type="password"
                          placeholder="AIzaSy..."
                          value={newKeyInput}
                          onChange={(e) => setNewKeyInput(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-750 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      {keyError && (
                        <div className="text-xs text-rose-400 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30">
                          {keyError}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          disabled={isKeyValidating || !newKeyInput.trim()}
                          className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                          {isKeyValidating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          <span>Validate & Save</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsChangingKey(false);
                            setKeyError(null);
                            setNewKeyInput('');
                          }}
                          className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* LIQUID THEMES TAB */}
            {activeTab === 'theme' && (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Liquid UI & Background Environment</h3>
                  <p className="text-xs text-slate-400">
                    Select a dynamic liquid design with cooling caustics, organic metaballs, and cursor ripples.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {(Object.keys(LIQUID_THEMES) as LiquidThemeId[]).map((tId) => {
                    const theme = LIQUID_THEMES[tId];
                    const isSelected = theme.id === liquidThemeId;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => onSelectLiquidTheme?.(theme.id)}
                        className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${
                          isSelected
                            ? 'bg-slate-800/90 border-amber-500 ring-2 ring-amber-500/30 shadow-lg'
                            : 'bg-slate-900/60 border-slate-750 hover:bg-slate-800/50 hover:border-slate-650'
                        }`}
                      >
                        {/* Shimmer preview header */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{theme.icon}</span>
                            <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                              {theme.name}
                            </span>
                          </div>
                          {isSelected && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] text-amber-300 font-bold">
                              Active
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                          {theme.description}
                        </p>

                        {/* Liquid color swatches */}
                        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800">
                          <div
                            className="w-3.5 h-3.5 rounded-full border border-white/20"
                            style={{ backgroundColor: theme.primaryGlow }}
                            title="Primary Liquid Glow"
                          />
                          <div
                            className="w-3.5 h-3.5 rounded-full border border-white/20"
                            style={{ backgroundColor: theme.secondaryGlow }}
                            title="Secondary Liquid Glow"
                          />
                          <div
                            className="w-3.5 h-3.5 rounded-full border border-white/20"
                            style={{ backgroundColor: theme.accentGlow }}
                            title="Accent Liquid Glow"
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* DESKTOP & WINDOW TAB */}
            {activeTab === 'system' && (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Desktop & Windows Behavior</h3>
                  <p className="text-xs text-slate-400">
                    Window overlays, startup items, and hotkey configurations.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-750 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-white block">Always On Top</span>
                      <span className="text-[11px] text-slate-400">Keep 3D companion floating over other desktop windows</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={alwaysOnTop}
                      onChange={(e) => onToggleAlwaysOnTop(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-750 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-white block">Start with Windows</span>
                      <span className="text-[11px] text-slate-400">Automatically launch Sunny when logging into your PC</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={autostartEnabled}
                      onChange={(e) => onToggleAutostart(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-750 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-white block">Global Summon Hotkey</span>
                      <span className="text-[11px] text-slate-400">Summon chat anywhere in Windows</span>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-amber-300 font-mono text-xs">
                      Ctrl + Alt + S
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* VRM LICENSES TAB */}
            {activeTab === 'licenses' && (
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">VRM Models & Permissive Licenses</h3>
                  <p className="text-xs text-slate-400">
                    Open-source and CC0 model licensing attributions for Sunny avatars.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-750 flex flex-col gap-3 text-xs leading-relaxed text-slate-300">
                  <p>
                    Sunny bundles high-performance 3D stylized avatar definitions compatible with the VRM 0.0/1.0 specification and supports free CC0/permissive community models:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-slate-400 text-xs">
                    <li>
                      <strong className="text-slate-200">Sunny & Procedural Avatars:</strong> Original procedural VRM-compatible models created for Sunny AI Desktop Companion. Distributed under MIT / CC0 1.0 Universal Public Domain Dedication.
                    </li>
                    <li>
                      <strong className="text-slate-200">VRoid Hub CC0 Avatars:</strong> Compatible with CC0 and Permissive VRoid / UniVRM standard avatars (commercial use permitted, modification permitted, no credit required).
                    </li>
                    <li>
                      <strong className="text-slate-200">Seed-san by Dwango:</strong> CC BY 4.0 / VRM Consortium reference implementation.
                    </li>
                  </ul>
                  <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
                    Full license documentation is available in the project README.md.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
