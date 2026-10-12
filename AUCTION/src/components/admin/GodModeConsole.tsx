import React, { useState } from 'react';
import { 
  ShieldAlert, 
  RotateCcw, 
  RotateCw, 
  Zap, 
  Shuffle, 
  DollarSign, 
  Lock, 
  Unlock, 
  Flame, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { formatLakhs } from '../../utils/csvParser';

export const GodModeConsole: React.FC = () => {
  const {
    state,
    undo,
    redo,
    canUndo,
    canRedo,
    forceDraftPlayer,
    overridePrice,
    jumpToPlayer,
    shuffleRemainingQueue,
    startRound2,
    adjustTeamPurse,
    toggleStrictRules,
    resetToFresh,
  } = useAuction();

  const isLight = state.colorMode === 'light';

  // Director PIN Authorization state (persisted in sessionStorage)
  const [isAuthorized, setIsAuthorized] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('godmode_authorized') === 'true';
    }
    return false;
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);

  // Force Draft form state
  const [selectedPlayerId, setSelectedPlayerId] = useState(state.players[0]?.id || '');
  const [selectedTeamId, setSelectedTeamId] = useState(state.teams[0]?.id || '');
  const [customForcePrice, setCustomForcePrice] = useState(100000);
  const [overrideReason, setOverrideReason] = useState('Administrative Executive Override');

  // Budget Adjuster state
  const [adjustTeamId, setAdjustTeamId] = useState(state.teams[0]?.id || '');
  const [newPurseAmount, setNewPurseAmount] = useState(state.config.startingPurse);
  const [adjustReason, setAdjustReason] = useState('Executive Budget Revision');

  // Jump to index state
  const [targetJumpIndex, setTargetJumpIndex] = useState(1);

  const pendingPlayers = state.players.filter((p) => p.status === 'pending');
  const unsoldPlayers = state.players.filter((p) => p.status === 'unsold' || p.status === 'passed');

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    // Default PIN: 2026 or any configured admin PIN
    if (pinInput.trim() === '2026' || pinInput.trim() === 'admin2026') {
      setIsAuthorized(true);
      setPinError(null);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('godmode_authorized', 'true');
      }
    } else {
      setPinError('Incorrect Director PIN. Default tournament PIN is 2026.');
    }
  };

  const handleLock = () => {
    setIsAuthorized(false);
    setPinInput('');
    setPinError(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('godmode_authorized');
    }
  };

  const handleExecuteForceDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayerId || !selectedTeamId) return;
    forceDraftPlayer(selectedPlayerId, selectedTeamId, customForcePrice, overrideReason);
  };

  const handleExecutePurseAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTeamId) return;
    adjustTeamPurse(adjustTeamId, newPurseAmount, adjustReason);
  };

  const handleJump = (e: React.FormEvent) => {
    e.preventDefault();
    jumpToPlayer(Math.max(0, targetJumpIndex - 1));
  };

  // If not authorized, render Director PIN authentication gate
  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className={`p-8 rounded-2xl border shadow-2xl text-center space-y-6 ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <h2 className={`font-display font-black text-xl ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Director Authorization Required
            </h2>
            <p className="text-xs text-slate-400 mt-2">
              The God Mode console permits destructive overrides, purse adjustments, and draft re-ordering. Enter tournament director credentials to unlock.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <input
                type="password"
                maxLength={10}
                placeholder="Enter Director PIN (default: 2026)"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(null);
                }}
                className={`w-full px-4 py-3 rounded-xl text-center font-mono text-base tracking-widest border transition-all ${
                  pinError
                    ? 'border-rose-500 bg-rose-500/10 text-rose-300'
                    : isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500'
                    : 'bg-slate-950 border-slate-700 text-white focus:border-amber-500'
                }`}
                autoFocus
              />
              {pinError && (
                <p className="text-xs text-rose-500 font-mono mt-2">{pinError}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4" />
              <span>Unlock Admin Console</span>
            </button>

            <div className="text-[11px] font-mono text-slate-500">
              Default Event Director PIN: <strong className="text-amber-500">2026</strong>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      
      {/* Banner: God Mode Warning */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
        isLight ? 'bg-amber-50 border-amber-300' : 'bg-amber-500/10 border-amber-500/30'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black shrink-0 shadow-lg shadow-amber-500/20">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`font-display font-bold text-base ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Administrator "God Mode" System Override Console
            </h2>
            <p className="text-xs text-amber-500 font-medium">
              Direct operational overrides: force-draft athletes, alter live purses in Lakhs, jump queues, and manage Round 2. All actions are logged and reversible via Universal Undo.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={undo}
            disabled={!canUndo}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              canUndo
                ? 'bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400 shadow-md shadow-amber-500/20 active:scale-95'
                : 'bg-slate-800 text-slate-600 border-slate-700 cursor-not-allowed'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Instant Undo ({state.undoStack.length})</span>
          </button>

          <button
            onClick={redo}
            disabled={!canRedo}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              canRedo
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 hover:bg-cyan-400 shadow-md shadow-cyan-500/20 active:scale-95'
                : 'bg-slate-800 text-slate-600 border-slate-700 cursor-not-allowed'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Redo ({state.redoStack.length})</span>
          </button>

          <button
            onClick={handleLock}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
            title="Lock console to prevent unauthorized tampering"
          >
            <Lock className="w-3.5 h-3.5 text-amber-500" />
            <span>Lock Console</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* PANEL 1: FORCE DRAFT & PRICE OVERRIDE */}
        <div className={`rounded-2xl border p-5 shadow-lg space-y-4 ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-slate-800'
        }`}>
          <div className={`border-b pb-2 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <h3 className={`font-display font-bold text-sm flex items-center gap-1.5 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              <Zap className="w-4 h-4 text-amber-500" />
              Force Draft Athlete
            </h3>
            <p className="text-[11px] text-slate-400">
              Bypass purse & slot limits to manually assign athlete.
            </p>
          </div>

          <form onSubmit={handleExecuteForceDraft} className="space-y-3">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Select Athlete
              </label>
              <select
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-mono ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                }`}
              >
                {state.players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.positionLabel} &middot; {p.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Assign To Team
              </label>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-mono ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                }`}
              >
                {state.teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({formatLakhs(t.remainingPurse)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Draft Price ({formatLakhs(customForcePrice)})
              </label>
              <input
                type="number"
                step={50000}
                value={customForcePrice}
                onChange={(e) => setCustomForcePrice(parseInt(e.target.value, 10) || 0)}
                className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-mono-numbers ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                }`}
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Override Justification
              </label>
              <input
                type="text"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className={`w-full border rounded-lg px-2.5 py-1.5 text-xs ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                }`}
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all cursor-pointer"
            >
              Execute Force Draft
            </button>
          </form>
        </div>

        {/* PANEL 2: QUEUE RE-ORDERING & SHUFFLE */}
        <div className={`rounded-2xl border p-5 shadow-lg space-y-4 ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-slate-800'
        }`}>
          <div className={`border-b pb-2 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <h3 className={`font-display font-bold text-sm flex items-center gap-1.5 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              <Shuffle className="w-4 h-4 text-cyan-400" />
              Queue Management & Jump
            </h3>
            <p className="text-[11px] text-slate-400">
              Re-order pending queue or jump spotlights.
            </p>
          </div>

          <div className="space-y-4">
            
            <form onSubmit={handleJump} className="space-y-2">
              <label className="block text-[11px] font-mono text-slate-400">
                Jump Spotlight Directly to Athlete # (1 - {state.players.length})
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, state.players.length)}
                  value={targetJumpIndex}
                  onChange={(e) => setTargetJumpIndex(parseInt(e.target.value, 10) || 1)}
                  className={`w-24 border rounded-lg px-2.5 py-1.5 text-xs font-mono-numbers ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                  }`}
                />
                <button
                  type="submit"
                  className="flex-1 py-1.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
                >
                  Jump Spotlight
                </button>
              </div>
            </form>

            <div className={`border-t pt-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <button
                onClick={shuffleRemainingQueue}
                className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                  isLight 
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                <Shuffle className="w-3.5 h-3.5 text-cyan-400" />
                <span>Shuffle Remaining Pending Queue</span>
              </button>
            </div>

            <div className={`border-t pt-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div className="text-[11px] font-mono text-slate-400 mb-1 flex items-center justify-between">
                <span>Unsold / Passed Pool:</span>
                <span className="text-rose-400 font-bold">{unsoldPlayers.length} Athletes</span>
              </div>
              <button
                onClick={() => startRound2(0)}
                disabled={unsoldPlayers.length === 0}
                className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  unsoldPlayers.length > 0
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md cursor-pointer'
                    : 'bg-slate-800/50 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Launch Round 2 For Unsold ({unsoldPlayers.length})</span>
              </button>
            </div>

          </div>
        </div>

        {/* PANEL 3: LIVE BUDGET MODIFIER & RULES TOGGLE */}
        <div className={`rounded-2xl border p-5 shadow-lg space-y-4 ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-slate-800'
        }`}>
          <div className={`border-b pb-2 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <h3 className={`font-display font-bold text-sm flex items-center gap-1.5 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Live Team Purse Adjustments
            </h3>
            <p className="text-[11px] text-slate-400">
              Modify team purses live or toggle strict constraints.
            </p>
          </div>

          <form onSubmit={handleExecutePurseAdjust} className="space-y-3">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Franchise Team
              </label>
              <select
                value={adjustTeamId}
                onChange={(e) => setAdjustTeamId(e.target.value)}
                className={`w-full border rounded-lg px-2.5 py-1.5 text-xs ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                }`}
              >
                {state.teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (Current: {formatLakhs(t.remainingPurse)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                New Remaining Purse ({formatLakhs(newPurseAmount)})
              </label>
              <input
                type="number"
                step={100000}
                value={newPurseAmount}
                onChange={(e) => setNewPurseAmount(parseInt(e.target.value, 10) || 0)}
                className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-mono-numbers ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                }`}
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Adjustment Reason
              </label>
              <input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className={`w-full border rounded-lg px-2.5 py-1.5 text-xs ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                }`}
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer"
            >
              Update Team Purse
            </button>
          </form>

          {/* Strict Rules Toggle */}
          <div className={`border-t pt-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <div className={`flex items-center justify-between p-2.5 rounded-xl border ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
            }`}>
              <div>
                <div className={`text-xs font-bold flex items-center gap-1.5 ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}>
                  {state.isStrictRulesEnforced ? (
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5 text-amber-500" />
                  )}
                  <span>Rule Enforcement</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  {state.isStrictRulesEnforced ? 'Strict squad/purse caps active' : 'Relaxed free-bidding mode'}
                </div>
              </div>

              <button
                onClick={toggleStrictRules}
                className={`px-3 py-1 rounded-lg text-[11px] font-mono font-bold transition-colors ${
                  state.isStrictRulesEnforced
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                }`}
              >
                {state.isStrictRulesEnforced ? 'STRICT' : 'RELAXED'}
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Reset auction warning */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs ${
        isLight ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-slate-900 border-slate-800 text-slate-400'
      }`}>
        <span className="flex items-center gap-1.5 text-rose-500">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Need a fresh start? Resetting clears active rosters and restores initial IIIT Trichy tournament defaults.</span>
        </span>

        <button
          onClick={() => setShowResetModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-colors cursor-pointer shrink-0 shadow-md shadow-rose-600/20 active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset All Data</span>
        </button>
      </div>

      {/* Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl space-y-4 ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className={`font-display font-black text-lg ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Reset Auction to Scratch?
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                This will wipe all active bids, clear all 6 team drafted rosters, restore team purses to 25 Lakhs, and reset queue progression.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowResetModal(false)}
                className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-colors ${
                  isLight
                    ? 'border-slate-300 hover:bg-slate-100 text-slate-700'
                    : 'border-slate-700 hover:bg-slate-800 text-slate-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resetToFresh();
                  setShowResetModal(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
              >
                Yes, Reset All
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
