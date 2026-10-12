import React, { useState } from 'react';
import { AuctionProvider, useAuction } from './context/AuctionContext';
import { Sidebar, AppTab } from './components/navigation/Sidebar';
import { StageScreen } from './components/stage/StageScreen';
import { GoogleFormsCSVIngestion } from './components/ingestion/GoogleFormsCSVIngestion';
import { Round2Hub } from './components/round2/Round2Hub';
import { TournamentSetupWizard } from './components/setup/TournamentSetupWizard';
import { GodModeConsole } from './components/admin/GodModeConsole';
import { AuditLedger } from './components/history/AuditLedger';
import { FinalResultsScreen } from './components/results/FinalResultsScreen';
import { THEMES } from './utils/theme';

const MainAppContent: React.FC = () => {
  const { state } = useAuction();
  const [activeTab, setActiveTab] = useState<AppTab>('stage');
  const [isFullscreenStage, setIsFullscreenStage] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const isProjectorMode = typeof window !== 'undefined' && window.location.search.includes('mode=projector');
  const isLight = state.colorMode === 'light';

  // Dedicated Secondary Monitor Projector Mode
  if (isProjectorMode) {
    return (
      <div className={`min-h-screen w-screen flex flex-col p-2 sm:p-4 ${
        isLight ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-white'
      }`}>
        <StageScreen isFullscreenProjector={true} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex ${
      isLight ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-white'
    } transition-colors selection:bg-amber-500 selection:text-slate-950`}>
      
      {/* Left Collapsible Sidebar */}
      {!isFullscreenStage && (
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onToggleFullscreenStage={() => setIsFullscreenStage(true)}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        <main className="flex-1 flex flex-col">
          {isFullscreenStage ? (
            <StageScreen
              isFullscreenProjector={true}
              onExitFullscreenProjector={() => setIsFullscreenStage(false)}
            />
          ) : (
            <>
              {activeTab === 'stage' && (
                <div className="flex-1 flex flex-col justify-center p-2 sm:p-4 lg:p-6">
                  <StageScreen
                    isFullscreenProjector={false}
                    onExitFullscreenProjector={() => setIsFullscreenStage(false)}
                  />
                </div>
              )}

              {activeTab === 'intake' && (
                <div className="p-4 sm:p-6">
                  <GoogleFormsCSVIngestion
                    onProceedToStage={() => setActiveTab('stage')}
                  />
                </div>
              )}

              {activeTab === 'round2' && (
                <div className="p-4 sm:p-6">
                  <Round2Hub
                    onProceedToStage={() => setActiveTab('stage')}
                  />
                </div>
              )}

              {activeTab === 'setup' && (
                <div className="p-4 sm:p-6">
                  <TournamentSetupWizard
                    onComplete={() => setActiveTab('intake')}
                  />
                </div>
              )}

              {activeTab === 'godmode' && (
                <div className="p-4 sm:p-6">
                  <GodModeConsole />
                </div>
              )}

              {activeTab === 'audit' && (
                <div className="p-4 sm:p-6">
                  <AuditLedger />
                </div>
              )}

              {activeTab === 'results' && (
                <div className="p-4 sm:p-6">
                  <FinalResultsScreen />
                </div>
              )}
            </>
          )}
        </main>

        {/* Global Footer (Visible in Normal View) */}
        {!isFullscreenStage && (
          <footer className={`py-3 px-6 text-xs font-mono flex flex-col sm:flex-row items-center justify-between gap-2 border-t ${
            isLight ? 'bg-white border-slate-200 text-slate-500' : 'bg-slate-950/90 border-slate-800 text-slate-500'
          }`}>
            <div>
              IIIT Trichy &middot; {state.config.tournamentName} &middot; Round {state.activeRound} Active
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span>Shortcuts: <kbd className={`px-1.5 py-0.5 rounded font-mono ${isLight ? 'bg-slate-100 text-slate-700 border border-slate-300' : 'bg-slate-800 text-slate-200'}`}>Enter</kbd> Sell</span>
              <span><kbd className={`px-1.5 py-0.5 rounded font-mono ${isLight ? 'bg-slate-100 text-slate-700 border border-slate-300' : 'bg-slate-800 text-slate-200'}`}>P</kbd> Pass</span>
              <span><kbd className={`px-1.5 py-0.5 rounded font-mono ${isLight ? 'bg-slate-100 text-slate-700 border border-slate-300' : 'bg-slate-800 text-slate-200'}`}>Ctrl+Z</kbd> Undo</span>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuctionProvider>
      <MainAppContent />
    </AuctionProvider>
  );
}
