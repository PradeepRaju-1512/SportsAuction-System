import React, { useState } from 'react';
import { 
  Trophy, 
  Users, 
  Coins, 
  CheckCircle, 
  Search, 
  Printer, 
  Download, 
  ChevronRight, 
  ChevronLeft,
  RotateCcw,
  Sparkles,
  Upload
} from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { getTeamMetrics } from '../../utils/rules';
import { formatLakhs, exportRostersToCSV, exportAuditToCSV, downloadFile } from '../../utils/csvParser';

export const FinalResultsScreen: React.FC = () => {
  const { state, finalizeAuction, reopenAuction, restoreStateFromJSON, showNotice, downloadJSONBackup } = useAuction();

  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');
  const [selectedTeamId, setSelectedTeamId] = useState<string>(state.teams[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRosterStatus, setFilterRosterStatus] = useState<'all' | 'complete' | 'incomplete'>('all');

  const isLight = state.colorMode === 'light';

  const totalRegistered = state.players.length;
  const soldPlayers = state.players.filter((p) => p.status === 'sold');
  const unsoldPlayers = state.players.filter((p) => p.status === 'unsold' || p.status === 'passed');
  const round2Sold = soldPlayers.filter((p) => p.round === 2);
  const totalSpent = state.teams.reduce((acc, t) => acc + t.creditsSpent, 0);
  const totalRemaining = state.teams.reduce((acc, t) => acc + t.remainingPurse, 0);
  const avgSalePrice = soldPlayers.length > 0 ? Math.round(totalSpent / soldPlayers.length) : 0;

  const selectedTeam = state.teams.find((t) => t.id === selectedTeamId) || state.teams[0];

  const filteredTeams = state.teams.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.captainName.toLowerCase().includes(searchQuery.toLowerCase());

    const isComplete = t.draftedPlayers.length >= state.config.minSquadSize;
    const matchesStatus =
      filterRosterStatus === 'all' ||
      (filterRosterStatus === 'complete' && isComplete) ||
      (filterRosterStatus === 'incomplete' && !isComplete);

    return matchesSearch && matchesStatus;
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCSV = () => {
    const csv = exportRostersToCSV(state.teams, state.config.tournamentName);
    downloadFile(`${state.config.tournamentName.replace(/\s+/g, '_')}_Final_Rosters.csv`, csv, 'text/csv;charset=utf-8;');
    showNotice('Exported final rosters to CSV.', 'success');
  };

  const handleDownloadAuditCSV = () => {
    const csv = exportAuditToCSV(state.transactions);
    downloadFile(`${state.config.tournamentName.replace(/\s+/g, '_')}_Audit_Ledger.csv`, csv, 'text/csv;charset=utf-8;');
    showNotice('Exported auction audit ledger to CSV.', 'success');
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(String(event.target?.result || '{}'));
          restoreStateFromJSON(parsed);
        } catch {
          showNotice('Failed to parse backup JSON file.', 'error');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleNextTeam = () => {
    const idx = state.teams.findIndex((t) => t.id === selectedTeamId);
    if (idx !== -1 && idx < state.teams.length - 1) {
      setSelectedTeamId(state.teams[idx + 1].id);
    } else if (state.teams.length > 0) {
      setSelectedTeamId(state.teams[0].id);
    }
  };

  const handlePrevTeam = () => {
    const idx = state.teams.findIndex((t) => t.id === selectedTeamId);
    if (idx > 0) {
      setSelectedTeamId(state.teams[idx - 1].id);
    } else if (state.teams.length > 0) {
      setSelectedTeamId(state.teams[state.teams.length - 1].id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 print:p-0 print:m-0">
      
      {/* AUCTION COMPLETION SUMMARY HEADER */}
      <div className={`rounded-2xl border p-6 shadow-2xl space-y-4 ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        
        <div className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-4 ${
          isLight ? 'border-slate-200' : 'border-slate-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`font-display font-extrabold text-2xl ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  IIIT Trichy &middot; {state.config.tournamentName} — Final Results
                </h1>
                <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                  state.isAuctionCompleted
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-500 border border-amber-500/40'
                }`}>
                  {state.isAuctionCompleted ? 'OFFICIALLY CONCLUDED' : 'DRAFT IN PROGRESS'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Official Roster Allocations & Financial Balances
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden flex-wrap">
            <button
              onClick={handlePrint}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              onClick={handleDownloadCSV}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="Download RFC 4180 CSV of all squad rosters for Google Sheets"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Rosters CSV</span>
            </button>

            <button
              onClick={handleDownloadAuditCSV}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="Download complete transaction audit ledger CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Audit CSV</span>
            </button>

            <button
              onClick={downloadJSONBackup}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Backup JSON</span>
            </button>

            <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
              isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}>
              <Upload className="w-3.5 h-3.5" />
              <span>Restore JSON</span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleRestoreFile}
              />
            </label>

            {state.isAuctionCompleted ? (
              <button
                onClick={reopenAuction}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold border border-slate-700 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reopen</span>
              </button>
            ) : (
              <button
                onClick={finalizeAuction}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Finalize Draft</span>
              </button>
            )}
          </div>
        </div>

        {/* Executive Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          
          <div className={`p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'}`}>
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Total Athletes</span>
            <span className={`font-mono-numbers font-black text-xl ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {totalRegistered}
            </span>
          </div>

          <div className={`p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'}`}>
            <span className="text-[10px] font-mono uppercase text-emerald-400 block">Sold Athletes</span>
            <span className="font-mono-numbers font-black text-xl text-emerald-400">
              {soldPlayers.length}
            </span>
          </div>

          <div className={`p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'}`}>
            <span className="text-[10px] font-mono uppercase text-rose-400 block">Unsold Athletes</span>
            <span className="font-mono-numbers font-black text-xl text-rose-400">
              {unsoldPlayers.length}
            </span>
          </div>

          <div className={`p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'}`}>
            <span className="text-[10px] font-mono uppercase text-amber-500 block">Total Spent</span>
            <span className="font-mono-numbers font-black text-xl text-amber-500">
              {formatLakhs(totalSpent)}
            </span>
          </div>

          <div className={`p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'}`}>
            <span className="text-[10px] font-mono uppercase text-cyan-400 block">Remaining Purse</span>
            <span className="font-mono-numbers font-black text-xl text-cyan-400">
              {formatLakhs(totalRemaining)}
            </span>
          </div>

          <div className={`p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'}`}>
            <span className="text-[10px] font-mono uppercase text-purple-400 block">Average Sale</span>
            <span className="font-mono-numbers font-black text-xl text-purple-400">
              {formatLakhs(avgSalePrice)}
            </span>
          </div>

        </div>

      </div>

      {/* Viewing Modes Toggle (Overview Mode vs Detailed Team Mode) */}
      <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 border-b pb-3 print:hidden ${
        isLight ? 'border-slate-200' : 'border-slate-800'
      }`}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'overview'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            All Franchises Overview ({state.teams.length})
          </button>

          <button
            onClick={() => setViewMode('detailed')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'detailed'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            Individual Franchise Deep Dive
          </button>
        </div>

        {viewMode === 'overview' && (
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search team or captain..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-8 pr-3 py-1.5 rounded-lg text-xs border ${
                  isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
                }`}
              />
            </div>
          </div>
        )}
      </div>

      {/* VIEW MODE 1: OVERVIEW GRID */}
      {viewMode === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((team) => {
            const metrics = getTeamMetrics(team, state.config);
            return (
              <div
                key={team.id}
                className={`rounded-2xl border p-5 shadow-lg flex flex-col justify-between transition-all ${
                  isLight ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0 shadow-md"
                      style={{ backgroundColor: team.teamColor }}
                    >
                      {team.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className={`font-display font-bold text-base truncate ${
                        isLight ? 'text-slate-900' : 'text-white'
                      }`}>
                        {team.name}
                      </h3>
                      <p className="text-xs font-mono text-slate-400">
                        Captain: {team.captainName}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 my-3 text-xs font-mono">
                    <div className={`p-2 rounded-lg ${isLight ? 'bg-slate-100' : 'bg-slate-950'}`}>
                      <span className="text-[10px] text-slate-400 block">Purse Left</span>
                      <strong className="text-emerald-400 font-mono-numbers">
                        {formatLakhs(team.remainingPurse)}
                      </strong>
                    </div>
                    <div className={`p-2 rounded-lg ${isLight ? 'bg-slate-100' : 'bg-slate-950'}`}>
                      <span className="text-[10px] text-slate-400 block">Spent</span>
                      <strong className="text-amber-500 font-mono-numbers">
                        {formatLakhs(team.creditsSpent)}
                      </strong>
                    </div>
                  </div>

                  {/* Roster list */}
                  <div className="space-y-1.5 mt-3">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block">
                      Drafted Roster ({team.draftedPlayers.length}/{state.config.maxSquadSize})
                    </span>
                    <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                      {team.draftedPlayers.map((p) => (
                        <div
                          key={p.playerId}
                          className={`flex items-center justify-between p-1.5 rounded-lg text-xs font-mono ${
                            isLight ? 'bg-slate-50' : 'bg-slate-950/80'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-[10px] px-1 rounded bg-cyan-500/20 text-cyan-400 font-bold">
                              {p.slotCode}
                            </span>
                            <span className={`truncate font-medium ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                              {p.playerName}
                            </span>
                          </div>
                          <span className="font-mono-numbers font-bold text-amber-500 shrink-0">
                            {formatLakhs(p.price)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <button
                    onClick={() => {
                      setSelectedTeamId(team.id);
                      setViewMode('detailed');
                    }}
                    className={`w-full py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      isLight 
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' 
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                  >
                    View Complete Franchise Roster
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW MODE 2: DETAILED FRANCHISE VIEW */}
      {viewMode === 'detailed' && selectedTeam && (
        <div className={`rounded-2xl border p-6 space-y-6 shadow-xl ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md"
                style={{ backgroundColor: selectedTeam.teamColor }}
              >
                {selectedTeam.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className={`font-display font-black text-2xl ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {selectedTeam.name}
                </h2>
                <p className="text-xs font-mono text-slate-400">
                  Captain: {selectedTeam.captainName} &middot; Purse Left: {formatLakhs(selectedTeam.remainingPurse)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevTeam}
                className={`p-2 rounded-lg border transition-colors ${
                  isLight ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextTeam}
                className={`p-2 rounded-lg border transition-colors ${
                  isLight ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Table of Drafted Players */}
          <div className="overflow-x-auto border rounded-xl">
            <table className="w-full text-left text-xs font-mono">
              <thead className={`uppercase text-[11px] border-b ${
                isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}>
                <tr>
                  <th className="py-2.5 px-3">Slot</th>
                  <th className="py-2.5 px-3">Athlete Name</th>
                  <th className="py-2.5 px-3">Position</th>
                  <th className="py-2.5 px-3">Draft Round</th>
                  <th className="py-2.5 px-3">Winning Bid</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800'}`}>
                {selectedTeam.draftedPlayers.map((p, idx) => (
                  <tr key={p.playerId} className={isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'}>
                    <td className="py-2.5 px-3 font-bold text-cyan-400">{p.slotCode || `#${idx + 1}`}</td>
                    <td className={`py-2.5 px-3 font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{p.playerName}</td>
                    <td className="py-2.5 px-3 text-slate-400">{p.position}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-500">
                        Round {p.round || 1}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-emerald-400">{formatLakhs(p.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
