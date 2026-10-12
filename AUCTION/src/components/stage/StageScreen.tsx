import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  CheckCircle, 
  XCircle, 
  Trophy, 
  Coins, 
  Minimize2, 
  Flame, 
  RefreshCw, 
  Sparkles, 
  Layers, 
  ArrowRight,
  Trash2,
  AlertTriangle,
  X,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Tv,
  Save,
  FileSpreadsheet
} from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { getTeamMetrics } from '../../utils/rules';
import { formatLakhs, exportRostersToCSV, downloadFile } from '../../utils/csvParser';
import { AthletePhoto } from '../common/AthletePhoto';

interface StageScreenProps {
  isFullscreenProjector?: boolean;
  onExitFullscreenProjector?: () => void;
}

export const StageScreen: React.FC<StageScreenProps> = ({
  isFullscreenProjector = false,
  onExitFullscreenProjector,
}) => {
  const {
    state,
    activePlayer,
    leadingTeam,
    auctionNotice,
    dismissNotice,
    showNotice,
    placeBid,
    sellCurrentPlayer,
    markPlayerUnsold,
    undo,
    redo,
    updatePlayerPhoto,
    startRound2,
    resetToScratch,
    loadExactCandidates,
    toggleStrictRules,
    downloadJSONBackup,
    jumpToPlayer,
  } = useAuction();

  const [selectedBidTeamId, setSelectedBidTeamId] = useState<string>('');
  const [customBidInput, setCustomBidInput] = useState<string>('');
  const [showResetModal, setShowResetModal] = useState(false);

  const isLight = state.colorMode === 'light';

  useEffect(() => {
    if (state.teams.length > 0 && !selectedBidTeamId) {
      setSelectedBidTeamId(state.teams[0].id);
    }
  }, [state.teams, selectedBidTeamId]);

  // Safe references to auction actions to prevent stale closures and event thrashing
  const handleSellRef = useRef<() => void>(() => {});
  const handlePassRef = useRef<() => void>(() => {});
  const handleUndoRef = useRef<() => void>(() => {});
  const handleRedoRef = useRef<() => void>(() => {});
  const isShortcutGuardActiveRef = useRef<boolean>(true);
  const [isShortcutGuardActive, setIsShortcutGuardActive] = useState<boolean>(true);

  handleSellRef.current = () => {
    if (!leadingTeam || !activePlayer || activePlayer.status !== 'pending') {
      showNotice('Cannot execute sale: No active leading bid on this athlete.', 'error');
      return;
    }
    const success = sellCurrentPlayer();
    if (success) {
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#3B82F6', '#10B981', '#EC4899', '#8B5CF6'],
      });
    }
  };

  handlePassRef.current = () => {
    if (!activePlayer || activePlayer.status !== 'pending') return;
    markPlayerUnsold();
  };

  handleUndoRef.current = () => {
    undo();
  };

  handleRedoRef.current = () => {
    redo();
  };

  useEffect(() => {
    isShortcutGuardActiveRef.current = isShortcutGuardActive;
  }, [isShortcutGuardActive]);

  // Global Keyboard Shortcuts (Attached ONCE on mount; isolated from projector; debounced with repeat guard)
  useEffect(() => {
    if (isFullscreenProjector) return;

    let lastShortcutTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Never trigger if key is repeating (eliminates infinite redo loop)
      if (e.repeat) return;

      // 2. Ignore key events inside inputs, textareas, and select elements
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) return;

      const now = Date.now();
      if (now - lastShortcutTime < 250) {
        return; // Debounce rapid keystrokes
      }

      // 3. Sell Player (Enter): Requires Ctrl/Cmd modifier if Shortcut Guard is active
      if (e.code === 'Enter') {
        if (!isShortcutGuardActiveRef.current || e.ctrlKey || e.metaKey) {
          e.preventDefault();
          lastShortcutTime = now;
          handleSellRef.current();
        }
      } 
      // 4. Pass Player (P): Requires Ctrl/Cmd modifier if Shortcut Guard is active
      else if (e.key.toLowerCase() === 'p') {
        if (!isShortcutGuardActiveRef.current || e.ctrlKey || e.metaKey) {
          e.preventDefault();
          lastShortcutTime = now;
          handlePassRef.current();
        }
      } 
      // 5. Undo: Ctrl+Z / Cmd+Z / 'u'
      else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        lastShortcutTime = now;
        handleUndoRef.current();
      } else if (e.key.toLowerCase() === 'u' && (!isShortcutGuardActiveRef.current || e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        lastShortcutTime = now;
        handleUndoRef.current();
      }
      // 6. Redo: Ctrl+Y / Ctrl+Shift+Z / Cmd+Shift+Z
      else if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        lastShortcutTime = now;
        handleRedoRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreenProjector]);

  const handleSell = () => {
    handleSellRef.current();
  };

  // Calculate dynamic increment ladder step
  const currentLadderStep = state.currentBidAmount >= 2500000 
    ? 500000 
    : state.currentBidAmount >= 1000000 
    ? 250000 
    : 100000;

  const handleLadderRaise = (teamId: string) => {
    placeBid(teamId); // Uses AuctionContext dynamic ladder automatically
  };

  const handleQuickRaise = (teamId: string, raise: number) => {
    if (!activePlayer) return;
    const base = activePlayer.basePrice || 100000;
    
    let nextAmount: number;
    if (!state.leadingTeamId) {
      nextAmount = raise > 0 ? base + raise : base;
    } else {
      nextAmount = state.currentBidAmount + raise;
    }
    placeBid(teamId, nextAmount);
  };

  const handleBidBasePrice = (teamId: string) => {
    if (!activePlayer) return;
    placeBid(teamId, activePlayer.basePrice);
  };

  const handleCustomRaise = () => {
    const val = parseInt(customBidInput, 10);
    if (!isNaN(val) && selectedBidTeamId && activePlayer) {
      const minBid = state.leadingTeamId ? state.currentBidAmount : activePlayer.basePrice;
      if (val < minBid) {
        showNotice(`Custom bid must be at least ${formatLakhs(minBid)}`, 'error');
        return;
      }
      placeBid(selectedBidTeamId, val);
      setCustomBidInput('');
    } else {
      showNotice('Enter a valid custom bid amount', 'error');
    }
  };

  const handleAddCustomDelta = (delta: number) => {
    const base = state.leadingTeamId ? state.currentBidAmount : (activePlayer?.basePrice || 100000);
    const nextVal = base + delta;
    setCustomBidInput(String(nextVal));
  };

  const handleConfirmReset = () => {
    resetToScratch();
    setShowResetModal(false);
  };

  const pendingCount = state.players.filter((p) => p.status === 'pending').length;
  const unsoldPool = state.players.filter((p) => p.status === 'unsold' || p.status === 'passed');

  return (
    <div
      className={`w-full h-full min-h-[640px] flex flex-col justify-between relative rounded-2xl border p-3 sm:p-4 transition-colors select-none ${
        isLight
          ? 'bg-slate-50 border-slate-200 text-slate-900'
          : 'bg-slate-950 border-slate-800 text-white'
      }`}
    >
      {/* Background ambient lighting */}
      <div className={`absolute inset-0 pointer-events-none rounded-2xl ${
        isLight
          ? 'bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.08),rgba(255,255,255,0))]'
          : 'bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.12),rgba(255,255,255,0))]'
      }`} />

      {/* TOP HEADER / ACTION BAR */}
      <div className={`relative z-10 flex items-center justify-between pb-2 border-b mb-2.5 flex-wrap gap-2 ${
        isLight ? 'border-slate-200' : 'border-slate-800/80'
      }`}>
        <div className="flex items-center gap-2.5">
          <span className={`font-display font-black text-lg sm:text-xl tracking-tight ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            IIIT Trichy
          </span>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/30 font-bold">
            ROUND {state.activeRound} LIVE STAGE
          </span>
          {!isFullscreenProjector && (
            <>
              <button
                onClick={() => setIsShortcutGuardActive((prev) => !prev)}
                className={`hidden md:flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                  isShortcutGuardActive
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                    : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                }`}
                title="When ON, Ctrl+Enter is required to Sell and Ctrl+P to Pass, preventing accidental keystrokes"
              >
                <span>{isShortcutGuardActive ? '🛡️ Guard: ON (Ctrl+Enter)' : '⚡ Guard: OFF (Direct)'}</span>
              </button>

              <button
                onClick={toggleStrictRules}
                className={`hidden sm:flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded border transition-colors ${
                  state.isStrictRulesEnforced
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                    : 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                }`}
                title="Toggle budget and squad reserve rule enforcement"
              >
                {state.isStrictRulesEnforced ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                <span>{state.isStrictRulesEnforced ? 'Strict Rules Active' : 'Relaxed Mode'}</span>
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Active Player Meta or 1-Click Load (Operator Only) */}
          {state.players.length > 0 ? (
            <span className="text-xs font-mono text-slate-400 hidden sm:inline">
              Lot: <span className={isLight ? 'text-slate-900 font-bold' : 'text-white font-bold'}>{state.queueIndex + 1}</span> of{' '}
              <span className="font-bold text-amber-500">{state.players.length}</span> ({pendingCount} pending)
            </span>
          ) : !isFullscreenProjector ? (
            <button
              onClick={loadExactCandidates}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold font-mono transition-all active:scale-95 cursor-pointer shadow"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>⚡ Load 5 Form Candidates</span>
            </button>
          ) : null}

          {/* Operator Controls: Hidden on Projector Screen */}
          {!isFullscreenProjector && (
            <>
              {/* Dedicated Projector Window Opener */}
              <button
                onClick={() => window.open(window.location.origin + window.location.pathname + '?mode=projector', '_blank')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-colors ${
                  isLight
                    ? 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border-cyan-200'
                    : 'bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 border-cyan-800'
                }`}
                title="Open separate borderless 16:9 stage window synced in real time for projector"
              >
                <Tv className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Projector View</span>
              </button>

              {/* Fast Rosters CSV Export */}
              <button
                onClick={() => {
                  const csv = exportRostersToCSV(state.teams, state.config.tournamentName);
                  downloadFile(`iiit_trichy_rosters_${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv;charset=utf-8;');
                  showNotice('Rosters exported to CSV successfully.', 'success');
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-colors ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
                }`}
                title="Export all franchise drafted rosters to CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline">Rosters CSV</span>
              </button>

              {/* Fast JSON Backup */}
              <button
                onClick={downloadJSONBackup}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-colors ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
                }`}
                title="Download full JSON backup of the auction state"
              >
                <Save className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">Backup</span>
              </button>

              {/* Complete Reset to Scratch Button */}
              <button
                onClick={() => setShowResetModal(true)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-colors ${
                  isLight
                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                    : 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border-rose-900/60'
                }`}
                title="Reset auction state completely back to scratch"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </>
          )}

          {isFullscreenProjector && onExitFullscreenProjector && (
            <button
              onClick={onExitFullscreenProjector}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                isLight 
                  ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Exit Projector (Esc)</span>
            </button>
          )}
        </div>
      </div>

      {/* AUCTION NOTICE BANNER (Replaces blocking alerts) */}
      {auctionNotice && (
        <div className={`relative z-20 mb-2 py-2 px-3 rounded-xl border flex items-center justify-between gap-2 text-xs font-mono animate-in fade-in slide-in-from-top-1 ${
          auctionNotice.type === 'error'
            ? 'bg-rose-950/80 border-rose-700 text-rose-200'
            : auctionNotice.type === 'success'
            ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
            : 'bg-slate-900 border-slate-700 text-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider">
              {auctionNotice.type === 'error' ? 'Notice:' : auctionNotice.type === 'success' ? 'Success:' : 'Update:'}
            </span>
            <span>{auctionNotice.message}</span>
          </div>
          <button
            onClick={dismissNotice}
            className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TOP SECTION: PLAYER SPOTLIGHT & LIVE BIDDING CONSOLE */}
      <div className="relative z-10 grid grid-cols-12 gap-3 sm:gap-4 flex-1 items-stretch min-h-0">
        
        {/* LEFT & CENTER: Expanded Player Photo Spotlight (7 cols) */}
        <div className={`col-span-12 lg:col-span-7 rounded-2xl border p-3.5 sm:p-5 flex flex-col justify-between backdrop-blur-md shadow-xl ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-slate-800/90'
        }`}>
          {activePlayer && activePlayer.status === 'pending' ? (
            <div className="flex flex-col h-full justify-between gap-3">
              
              {/* Card Header Tags */}
              <div className={`flex items-center justify-between gap-2 border-b pb-2 ${
                isLight ? 'border-slate-200' : 'border-slate-800'
              }`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${
                    activePlayer.round === 2
                      ? 'bg-purple-500 text-white shadow-sm'
                      : 'bg-amber-500 text-slate-950 font-black'
                  }`}>
                    ROUND {activePlayer.round}
                  </span>
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    activePlayer.isClub 
                      ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' 
                      : isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {activePlayer.isClub ? 'Club Athlete' : 'Non-Club'}
                  </span>
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    {activePlayer.positionLabel} ({activePlayer.position})
                  </span>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Base Price</span>
                  <span className="font-mono-numbers text-base font-black text-amber-500">
                    {formatLakhs(activePlayer.basePrice)}
                  </span>
                </div>
              </div>

              {/* Player Portrait & Spotlight Information */}
              <div className="flex items-center gap-4 sm:gap-5 my-auto">
                {/* Large Portrait Frame: Directly Visible On Screen */}
                <div className="relative w-36 h-36 sm:w-48 sm:h-48 rounded-2xl overflow-hidden border-3 border-amber-500/70 shadow-2xl shrink-0 bg-slate-900">
                  <AthletePhoto
                    photoUrl={activePlayer.photoUrl}
                    name={activePlayer.name}
                    position={activePlayer.position}
                    year={activePlayer.year}
                    isClub={activePlayer.isClub}
                    rollNumber={activePlayer.rollNumber}
                    className="w-full h-full"
                    allowUpload={true}
                    onPhotoChanged={(dataUrl) => updatePlayerPhoto(activePlayer.id, dataUrl)}
                  />

                  {/* Lot tag */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-md border border-white/20 text-[10px] font-mono text-white font-black z-10 pointer-events-none">
                    LOT #{state.queueIndex + 1}
                  </div>
                </div>

                {/* Athlete Profile Information */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className={`font-display font-black text-xl sm:text-3xl tracking-tight truncate leading-tight ${
                        isLight ? 'text-slate-900' : 'text-white'
                      }`} title={activePlayer.name}>
                        {activePlayer.name}
                      </h2>
                      {activePlayer.rollNumber && (
                        <span className="text-xs font-mono font-black px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm" title="University Roll Number / Student ID">
                          ID: {activePlayer.rollNumber}
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm font-mono text-cyan-400 font-semibold truncate mt-0.5">
                      IIIT Trichy &middot; {activePlayer.year}
                    </p>
                  </div>

                  <div className={`p-2 sm:p-2.5 rounded-xl border text-xs font-mono leading-relaxed ${
                    isLight 
                      ? 'bg-slate-100 border-slate-200 text-slate-700' 
                      : 'bg-slate-950/80 border-slate-800 text-slate-300'
                  }`}>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span>Affiliation:</span>
                      <strong className={activePlayer.isClub ? 'text-amber-400' : 'text-slate-300'}>
                        {activePlayer.isClub ? 'Registered Club Athlete' : 'College Contender'}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Live Status:</span>
                      <strong className="text-emerald-400 uppercase">
                        Active Bidding on Stage
                      </strong>
                    </div>
                  </div>

                  <p className="text-[10px] font-mono text-slate-400">
                    Photo renders directly on screen. Click or drop to update from device.
                  </p>
                </div>
              </div>

              {/* Footer Meta */}
              <div className={`flex items-center justify-between text-xs font-mono border-t pt-2 ${
                isLight ? 'border-slate-200 text-slate-500' : 'border-slate-800/80 text-slate-400'
              }`}>
                <span>
                  Lot: <strong className={isLight ? 'text-slate-800' : 'text-slate-200'}>#{state.queueIndex + 1}</strong> of {state.players.length}
                </span>
                <span>
                  Bidding Round: <strong className="text-amber-500">Round {activePlayer.round}</strong>
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
              <Trophy className="w-14 h-14 text-amber-500/60 animate-bounce" />
              <div>
                <h3 className={`font-display font-black text-2xl ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {state.players.length === 0 ? 'Auction Queue Ready' : 'Queue Completed'}
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {state.players.length === 0 
                    ? 'No candidates loaded yet. Import your Google Forms CSV or load sample candidates with 1 click.'
                    : `All athletes in Round ${state.activeRound} have been processed! ${unsoldPool.length > 0 ? `${unsoldPool.length} athletes went unsold and can be re-bid in Round 2.` : 'Every athlete has been sold.'}`}
                </p>
              </div>

              {state.players.length === 0 ? (
                <button
                  onClick={loadExactCandidates}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Zap className="w-4 h-4" />
                  <span>⚡ Load 5 Google Forms Candidates</span>
                </button>
              ) : unsoldPool.length > 0 ? (
                <button
                  onClick={() => startRound2(0)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Launch Round 2 for {unsoldPool.length} Unsold Players</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : null}
            </div>
          )}
        </div>

        {/* RIGHT: Live Bidding Center & Sale Gavel (5 cols) */}
        <div className={`col-span-12 lg:col-span-5 flex flex-col justify-between rounded-2xl border p-4 sm:p-5 backdrop-blur-md shadow-xl ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-slate-800/90'
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-mono tracking-wider text-slate-400 font-bold">
                Current Highest Bid
              </span>
              {leadingTeam && (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                  <Flame className="w-4 h-4 fill-emerald-400 text-emerald-400" />
                  Leading Bid
                </span>
              )}
            </div>

            {/* Huge Bid Display */}
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono-numbers font-black text-4xl sm:text-5xl text-amber-500 tracking-tight drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                {formatLakhs(state.currentBidAmount)}
              </span>
            </div>
          </div>

          {/* Leading Bidder Card */}
          <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 my-2.5 ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950/90 border-slate-800'
          }`}>
            {leadingTeam ? (
              <>
                <div className="flex items-center gap-3 min-w-0">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold shrink-0 border border-white/20 shadow"
                    style={{ backgroundColor: leadingTeam.teamColor }}
                  >
                    {leadingTeam.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className={`font-display font-bold text-sm truncate ${
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}>
                      {leadingTeam.name}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      Captain: {leadingTeam.captainName}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-mono text-slate-400 block">Purse Left</span>
                  <span className="font-mono-numbers text-xs font-bold text-emerald-400">
                    {formatLakhs(leadingTeam.remainingPurse - state.currentBidAmount)}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center w-full py-2 text-xs font-mono text-slate-400">
                Awaiting Opening Bid &middot; Base: {activePlayer ? formatLakhs(activePlayer.basePrice) : 'N/A'}
              </div>
            )}
          </div>

          {/* Sell / Pass Action Buttons */}
          <div className="grid grid-cols-2 gap-3 mt-auto">
            <button
              onClick={handleSell}
              disabled={!leadingTeam || !activePlayer || activePlayer.status !== 'pending'}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-display font-black text-sm uppercase tracking-wider transition-all active:scale-95 shadow-lg ${
                leadingTeam && activePlayer && activePlayer.status === 'pending'
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-slate-950 shadow-emerald-500/20 cursor-pointer'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700/50'
              }`}
            >
              <CheckCircle className="w-5 h-5" />
              <span>SELL PLAYER</span>
            </button>

            <button
              onClick={markPlayerUnsold}
              disabled={!activePlayer || activePlayer.status !== 'pending'}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-display font-bold text-sm uppercase tracking-wider bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <XCircle className="w-5 h-5" />
              <span>PASS / UNSOLD</span>
            </button>
          </div>
        </div>
      </div>

      {/* QUICK BID ACTION BUTTONS & CUSTOM RAISE CONSOLE */}
      <div className={`relative z-10 my-2 rounded-2xl border p-2.5 backdrop-blur-md shadow-lg ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-slate-800'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 mb-2 pb-2 border-b border-slate-800/60">
          <span className="text-xs font-mono uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-amber-500" />
            <span>Direct Quick-Bid & Custom Controls</span>
          </span>

          {/* Custom Bid Console */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <select
              value={selectedBidTeamId}
              onChange={(e) => setSelectedBidTeamId(e.target.value)}
              className={`text-xs rounded-lg px-2.5 py-1.5 font-mono border ${
                isLight 
                  ? 'bg-slate-50 border-slate-300 text-slate-900' 
                  : 'bg-slate-950 border-slate-700 text-slate-200'
              }`}
            >
              {state.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({formatLakhs(t.remainingPurse)})
                </option>
              ))}
            </select>

            {/* Quick Delta buttons for custom raise */}
            <div className="hidden md:flex items-center gap-1">
              <button
                onClick={() => handleAddCustomDelta(100000)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-cyan-300 font-bold"
              >
                +1L
              </button>
              <button
                onClick={() => handleAddCustomDelta(250000)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-amber-300 font-bold"
              >
                +2.5L
              </button>
              <button
                onClick={() => handleAddCustomDelta(500000)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-emerald-300 font-bold"
              >
                +5L
              </button>
            </div>

            <input
              type="number"
              step={50000}
              placeholder={`Amount in ₹`}
              value={customBidInput}
              onChange={(e) => setCustomBidInput(e.target.value)}
              className={`w-28 sm:w-32 text-xs rounded-lg px-2.5 py-1.5 font-mono-numbers border ${
                isLight 
                  ? 'bg-slate-50 border-slate-300 text-slate-900' 
                  : 'bg-slate-950 border-slate-700 text-slate-200'
              }`}
            />
            <button
              onClick={handleCustomRaise}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold font-mono transition-colors active:scale-95 cursor-pointer shadow-md"
            >
              Raise Bid
            </button>
          </div>
        </div>

        {/* 6 Teams Quick Raise Cards (+1L, +2.5L, +5L and Open Base) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {state.teams.map((team) => {
            const isLeading = state.leadingTeamId === team.id;
            const metrics = getTeamMetrics(team, state.config);
            return (
              <div
                key={team.id}
                className={`p-2 rounded-xl border transition-all ${
                  isLeading
                    ? 'bg-amber-500/15 border-amber-500 shadow-[0_0_14px_rgba(245,158,11,0.3)] ring-1 ring-amber-500'
                    : isLight
                    ? 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className={`font-bold truncate max-w-[85px] ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`} title={team.name}>
                    {team.name}
                  </span>
                  <span className="font-mono-numbers text-[11px] text-emerald-400 font-bold">
                    {formatLakhs(team.remainingPurse)}
                  </span>
                </div>

                {/* If team holds current highest bid, show Leading Bidder status (P0 self-outbid prevention) */}
                {isLeading ? (
                  <div className="py-1 rounded bg-amber-500/20 text-amber-400 text-center font-mono font-bold text-[10px] border border-amber-500/40">
                    👑 Holding Lead
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1">
                    {/* If no bid placed yet, first button opens at base price */}
                    {state.leadingTeamId === null ? (
                      <button
                        onClick={() => handleBidBasePrice(team.id)}
                        disabled={metrics.isFull}
                        className="py-1 rounded bg-amber-500 hover:bg-amber-400 active:scale-95 text-[10px] font-mono font-black text-slate-950 transition-colors col-span-1 shadow"
                        title={`Open bid at base price (${activePlayer ? formatLakhs(activePlayer.basePrice) : ''})`}
                      >
                        Base
                      </button>
                    ) : (
                      <button
                        onClick={() => handleQuickRaise(team.id, 100000)}
                        disabled={metrics.isFull}
                        className="py-1 rounded bg-slate-800 hover:bg-slate-700 active:scale-95 text-[10px] font-mono font-bold text-cyan-300 transition-colors"
                        title={`Raise +1 Lakh for ${team.name}`}
                      >
                        +1L
                      </button>
                    )}

                    <button
                      onClick={() => handleQuickRaise(team.id, 250000)}
                      disabled={metrics.isFull}
                      className="py-1 rounded bg-slate-800 hover:bg-slate-700 active:scale-95 text-[10px] font-mono font-bold text-amber-300 transition-colors"
                      title={`Raise +2.5 Lakh for ${team.name}`}
                    >
                      +2.5L
                    </button>

                    <button
                      onClick={() => handleQuickRaise(team.id, 500000)}
                      disabled={metrics.isFull}
                      className="py-1 rounded bg-slate-800 hover:bg-slate-700 active:scale-95 text-[10px] font-mono font-bold text-emerald-300 transition-colors"
                      title={`Raise +5 Lakh for ${team.name}`}
                    >
                      +5L
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* BOTTOM SECTION: TEAM ROSTER WITH DRAFTED PLAYER NAMES & POSITIONAL SLOTS */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 min-h-0 overflow-y-auto">
        {state.teams.map((team) => {
          const metrics = getTeamMetrics(team, state.config);
          return (
            <div
              key={team.id}
              className={`rounded-xl border p-2 flex flex-col justify-between transition-colors ${
                state.leadingTeamId === team.id
                  ? isLight ? 'bg-amber-50 border-amber-500 shadow-md' : 'bg-slate-900 border-amber-500/80 shadow-md'
                  : isLight ? 'bg-white border-slate-200' : 'bg-slate-900/70 border-slate-800/80'
              }`}
            >
              {/* Team Header */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white shrink-0 border border-white/20"
                    style={{ backgroundColor: team.teamColor }}
                  >
                    {team.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`font-display font-bold text-xs truncate ${
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}>
                      {team.name}
                    </div>
                  </div>
                  <span className="font-mono-numbers text-[10px] text-emerald-400 font-bold shrink-0">
                    {formatLakhs(team.remainingPurse)}
                  </span>
                </div>

                {/* Subheader: Squad count */}
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1 border-b pb-1 border-slate-800/40">
                  <span>Squad:</span>
                  <strong className={isLight ? 'text-slate-800' : 'text-slate-200'}>
                    {team.draftedPlayers.length}/{state.config.maxSquadSize}
                  </strong>
                </div>

                {/* DRAFTED ATHLETES LIST - Displays clear player names & designated slots */}
                <div className="space-y-1 my-1 max-h-24 overflow-y-auto pr-0.5">
                  {team.draftedPlayers.length > 0 ? (
                    team.draftedPlayers.map((p) => (
                      <div
                        key={p.playerId}
                        className={`flex items-center justify-between text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                          isLight 
                            ? 'bg-slate-50 border-slate-200 text-slate-800' 
                            : 'bg-slate-950/80 border-slate-800 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="text-[9px] px-1 rounded bg-cyan-500/20 text-cyan-400 font-bold shrink-0">
                            {p.slotCode}
                          </span>
                          <span className="truncate font-bold text-[11px]" title={p.playerName}>
                            {p.playerName}
                          </span>
                        </div>
                        <span className="font-mono-numbers text-[9px] font-bold text-amber-400 shrink-0 ml-1">
                          {formatLakhs(p.price)}
                        </span>
                      </div>
                    ))
                  ) : (
                    /* Designated vacant slots showing positions ready for drafted athletes */
                    <div className="space-y-0.5">
                      {state.config.slots.slice(0, 3).map((slot, sIdx) => (
                        <div
                          key={`${slot.codePrefix}-${sIdx}`}
                          className={`flex items-center justify-between text-[9px] font-mono px-1 py-0.5 rounded border border-dashed ${
                            isLight
                              ? 'border-slate-200 text-slate-400 bg-slate-50/50'
                              : 'border-slate-800 text-slate-500 bg-slate-950/30'
                          }`}
                        >
                          <span className="font-semibold">{slot.codePrefix} 1:</span>
                          <span className="italic">Available</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Positional Slot Matrix Indicators */}
              <div className="grid grid-cols-3 gap-0.5 pt-1 border-t border-slate-800/60 mt-auto">
                {state.config.slots.map((slot) => {
                  const draftedInSlot = team.draftedPlayers.filter((p) => p.position === slot.codePrefix).length;
                  const isFull = draftedInSlot >= slot.maxCount;

                  return (
                    <div
                      key={slot.codePrefix}
                      className={`text-center py-0.5 rounded text-[8px] font-mono font-bold ${
                        isFull
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : draftedInSlot > 0
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : isLight ? 'bg-slate-100 text-slate-400' : 'bg-slate-800 text-slate-500'
                      }`}
                      title={`${slot.name}: ${draftedInSlot}/${slot.maxCount}`}
                    >
                      {slot.codePrefix}:{draftedInSlot}/{slot.maxCount}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* CONFIRMATION MODAL FOR RESET TO SCRATCH */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl space-y-4 ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-500 border border-rose-500/30 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-black text-lg">Reset Auction to Scratch?</h3>
                  <p className="text-xs text-slate-400 mt-0.5">This will completely wipe the live state.</p>
                </div>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className={`p-3.5 rounded-xl text-xs font-mono leading-relaxed border ${
              isLight ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-rose-950/30 border-rose-900 text-rose-300'
            }`}>
              <ul className="space-y-1.5 list-disc list-inside">
                <li>All loaded athletes and queue will be cleared.</li>
                <li>All franchise drafted rosters will be emptied.</li>
                <li>All team purses will be reset to 25 Lakhs.</li>
                <li>All transaction history and local storage will be wiped.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowResetModal(false)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  isLight ? 'border-slate-300 text-slate-700 hover:bg-slate-100' : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmReset}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-rose-600/30 active:scale-95 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Yes, Reset to Scratch</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
