import React, { useState } from 'react';
import { 
  Trophy, 
  Tv, 
  FileSpreadsheet, 
  RefreshCw, 
  Settings2, 
  ShieldAlert, 
  History, 
  Award, 
  Sun, 
  Moon, 
  RotateCcw, 
  RotateCw, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Trash2,
  AlertTriangle,
  X
} from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';

export type AppTab = 'stage' | 'intake' | 'round2' | 'setup' | 'godmode' | 'audit' | 'results';

interface SidebarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  onToggleFullscreenStage: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onToggleFullscreenStage,
  isCollapsed,
  setIsCollapsed,
}) => {
  const { 
    state, 
    undo, 
    redo, 
    canUndo, 
    canRedo, 
    toggleAudioMute, 
    toggleColorMode,
    resetToScratch
  } = useAuction();

  const [showResetModal, setShowResetModal] = useState(false);
  const isLight = state.colorMode === 'light';

  const unsoldRound2Count = state.players.filter(
    (p) => p.status === 'unsold' || p.status === 'passed'
  ).length;

  const navItems = [
    {
      id: 'stage' as AppTab,
      label: '16:9 Stage Screen',
      icon: Tv,
      badge: `${state.players.filter((p) => p.status === 'pending').length} left`,
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    },
    {
      id: 'intake' as AppTab,
      label: 'Google Forms Intake',
      icon: FileSpreadsheet,
      badge: `${state.players.length}`,
      badgeColor: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
    },
    {
      id: 'round2' as AppTab,
      label: 'Round 2 Hub',
      icon: RefreshCw,
      badge: unsoldRound2Count > 0 ? `${unsoldRound2Count} unsold` : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    },
    {
      id: 'setup' as AppTab,
      label: 'Tournament Setup',
      icon: Settings2,
    },
    {
      id: 'godmode' as AppTab,
      label: 'God Mode Overrides',
      icon: ShieldAlert,
      badge: 'Admin',
      badgeColor: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
    },
    {
      id: 'audit' as AppTab,
      label: 'Audit History',
      icon: History,
      badge: `${state.transactions.length}`,
      badgeColor: 'bg-slate-700 text-slate-300',
    },
    {
      id: 'results' as AppTab,
      label: 'Final Results',
      icon: Award,
    },
  ];

  const handleConfirmReset = () => {
    resetToScratch();
    setShowResetModal(false);
    setActiveTab('stage');
  };

  return (
    <>
      <aside
        className={`h-screen sticky top-0 shrink-0 border-r transition-all duration-300 z-40 flex flex-col justify-between select-none ${
          isCollapsed ? 'w-18' : 'w-64'
        } ${
          isLight 
            ? 'bg-white border-slate-200 text-slate-800 shadow-sm' 
            : 'bg-slate-950/95 border-slate-800/80 text-white backdrop-blur-md'
        }`}
      >
        {/* Top Header / Branding */}
        <div>
          <div className={`p-4 border-b flex items-center justify-between gap-3 ${
            isLight ? 'border-slate-200' : 'border-slate-800/80'
          }`}>
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20 shrink-0">
                <Trophy className="w-5 h-5" />
              </div>

              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`font-display font-black text-base tracking-tight truncate ${
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}>
                      IIIT Trichy
                    </span>
                    <span className="text-[9px] font-mono font-bold uppercase px-1 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30">
                      LIVE
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 truncate">
                    Sports Auction Hub
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`p-1.5 rounded-lg border transition-colors ${
                isLight
                  ? 'hover:bg-slate-100 border-slate-200 text-slate-600'
                  : 'hover:bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Round Badge Banner */}
          {!isCollapsed && (
            <div className={`px-4 py-2 border-b text-[11px] font-mono flex items-center justify-between ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-slate-900/60 border-slate-800 text-slate-400'
            }`}>
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Session:</span>
              </span>
              <span className="font-bold text-amber-400">
                Round {state.activeRound} Active
              </span>
            </div>
          )}

          {/* Navigation Items */}
          <nav className="p-2 space-y-1 mt-2">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all relative ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/15'
                      : isLight
                      ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />

                  {!isCollapsed && (
                    <span className="truncate flex-1 text-left">
                      {item.label}
                    </span>
                  )}

                  {!isCollapsed && item.badge && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isActive ? 'bg-slate-950/20 text-slate-950 font-bold' : item.badgeColor
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Footer Controls */}
        <div className={`p-2 border-t space-y-1.5 ${
          isLight ? 'border-slate-200 bg-slate-50/50' : 'border-slate-800 bg-slate-950/60'
        }`}>
          
          {/* Fullscreen 16:9 Projector Trigger */}
          <button
            onClick={onToggleFullscreenStage}
            className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              isLight
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 shadow-md'
            }`}
            title="Launch 16:9 Fullscreen Projector"
          >
            <Maximize2 className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>16:9 Projector Mode</span>}
          </button>

          {/* Undo & Redo Row */}
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={undo}
              disabled={!canUndo}
              title="Universal Undo (Ctrl+Z)"
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-mono font-semibold border transition-all ${
                canUndo
                  ? isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                    : 'bg-slate-900 hover:bg-slate-800 text-amber-400 border-slate-700'
                  : 'opacity-40 cursor-not-allowed border-transparent text-slate-500'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {!isCollapsed && <span>Undo</span>}
            </button>

            <button
              onClick={redo}
              disabled={!canRedo}
              title="Universal Redo (Ctrl+Shift+Z)"
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-mono font-semibold border transition-all ${
                canRedo
                  ? isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                    : 'bg-slate-900 hover:bg-slate-800 text-cyan-400 border-slate-700'
                  : 'opacity-40 cursor-not-allowed border-transparent text-slate-500'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              {!isCollapsed && <span>Redo</span>}
            </button>
          </div>

          {/* Theme & Audio Toggles */}
          <div className="flex items-center justify-between gap-1 pt-1">
            {/* Light / Dark Mode Toggle */}
            <button
              onClick={toggleColorMode}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                isLight
                  ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
              }`}
              title={`Switch to ${isLight ? 'Dark' : 'Light'} Mode`}
            >
              {isLight ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-500" />
                  {!isCollapsed && <span>Dark</span>}
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  {!isCollapsed && <span>Light</span>}
                </>
              )}
            </button>

            {/* Audio Mute */}
            <button
              onClick={toggleAudioMute}
              className={`p-1.5 rounded-lg border text-xs font-mono transition-colors ${
                state.isAudioMuted
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : isLight
                  ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-emerald-400'
              }`}
              title={state.isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {state.isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Complete Reset to Scratch Button */}
          <button
            onClick={() => setShowResetModal(true)}
            className={`w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-mono font-bold transition-all border ${
              isLight
                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                : 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border-rose-900/60'
            }`}
            title="Complete Reset to Scratch (Clear All Data)"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {!isCollapsed && <span>Reset to Scratch</span>}
          </button>

        </div>
      </aside>

      {/* Confirmation Modal for Reset to Scratch */}
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
                  <p className="text-xs text-slate-400 mt-0.5">This action cannot be undone.</p>
                </div>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="text-slate-400 hover:text-white"
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
                <li>All local storage and action history will be wiped.</li>
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
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-rose-600/30 active:scale-95 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>Yes, Reset to Scratch</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
