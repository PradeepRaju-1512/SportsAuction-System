import React, { useState } from 'react';
import { 
  History, 
  Search, 
  RotateCcw, 
  RotateCw, 
  Download, 
  ArrowUpDown,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { ActionType } from '../../types/auction';

export const AuditLedger: React.FC = () => {
  const { state, undo, redo, canUndo, canRedo } = useAuction();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  const isLight = state.colorMode === 'light';

  // Filtered transactions
  const filteredTransactions = state.transactions.filter((tx) => {
    const matchesSearch =
      tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.entityName && tx.entityName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tx.entityId && tx.entityId.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesAction = filterAction === 'all' || tx.actionType === filterAction;
    const matchesEntity = filterEntity === 'all' || tx.entityType === filterEntity;

    return matchesSearch && matchesAction && matchesEntity;
  });

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
  });

  const toggleExpand = (id: string) => {
    setExpandedTxId(expandedTxId === id ? null : id);
  };

  const exportAuditCSV = () => {
    const headers = 'TransactionID,Timestamp,ActionType,Operator,EntityType,EntityID,EntityName,Description,IsUndone';
    const rows = sortedTransactions.map((tx) => [
      tx.id,
      tx.timestamp,
      tx.actionType,
      tx.operator,
      tx.entityType,
      tx.entityId || '',
      `"${(tx.entityName || '').replace(/"/g, '""')}"`,
      `"${tx.description.replace(/"/g, '""')}"`,
      tx.isUndone ? 'YES' : 'NO',
    ].join(','));

    const csvContent = `${headers}\n${rows.join('\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_ledger_${Date.now()}.csv`;
    link.click();
  };

  const getActionBadgeColor = (action: ActionType) => {
    switch (action) {
      case 'PLAYER_SOLD':
      case 'FORCE_DRAFT':
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      case 'BID_PLACED':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
      case 'PLAYER_UNSOLD':
      case 'PLAYER_PASSED':
        return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
      case 'UNDO_OPERATION':
        return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
      case 'REDO_OPERATION':
        return 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30';
      case 'ROUND_2_STARTED':
        return 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border border-slate-700';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      
      {/* Top Banner & Universal Undo */}
      <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4 ${
        isLight ? 'border-slate-200' : 'border-slate-800'
      }`}>
        <div>
          <h2 className={`font-display font-extrabold text-xl flex items-center gap-2 ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            <History className="w-5 h-5 text-amber-500" />
            IIIT Trichy Auction History & Audit Ledger
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable transaction log of every bid, sale, Round 2 trigger, and administrative action.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            disabled={!canUndo}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              canUndo
                ? isLight ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300' : 'bg-slate-800 text-white border-slate-700 hover:bg-slate-700 active:scale-95'
                : 'opacity-40 cursor-not-allowed border-transparent text-slate-500'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo ({state.undoStack.length})</span>
          </button>

          <button
            onClick={redo}
            disabled={!canRedo}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              canRedo
                ? isLight ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300' : 'bg-slate-800 text-white border-slate-700 hover:bg-slate-700 active:scale-95'
                : 'opacity-40 cursor-not-allowed border-transparent text-slate-500'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Redo ({state.redoStack.length})</span>
          </button>

          <button
            onClick={exportAuditCSV}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-black uppercase tracking-wider transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={`rounded-2xl border p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-slate-800'
      }`}>
        
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by event, athlete, team..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full border rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-amber-500 ${
              isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
            }`}
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className={`border rounded-lg px-2.5 py-1.5 text-xs font-mono ${
              isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-300'
            }`}
          >
            <option value="all">All Action Types</option>
            <option value="BID_PLACED">Bids Placed</option>
            <option value="PLAYER_SOLD">Players Sold</option>
            <option value="PLAYER_UNSOLD">Players Unsold</option>
            <option value="FORCE_DRAFT">Force Draft Overrides</option>
            <option value="ROUND_2_STARTED">Round 2 Started</option>
            <option value="UNDO_OPERATION">Undo Operations</option>
            <option value="PURSE_ADJUSTED">Purse Adjustments</option>
          </select>

          <select
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            className={`border rounded-lg px-2.5 py-1.5 text-xs font-mono ${
              isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-300'
            }`}
          >
            <option value="all">All Entities</option>
            <option value="player">Player Events</option>
            <option value="team">Team Events</option>
            <option value="bid">Bid Events</option>
            <option value="auction">Auction Setup</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-mono whitespace-nowrap ${
              isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-300'
            }`}
          >
            <ArrowUpDown className="w-3 h-3" />
            <span>{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</span>
          </button>

          <span className="text-xs font-mono text-slate-400 whitespace-nowrap">
            <strong className={isLight ? 'text-slate-900' : 'text-white'}>{sortedTransactions.length}</strong> records
          </span>
        </div>

      </div>

      {/* Ledger Table */}
      <div className={`rounded-2xl border overflow-hidden shadow-lg ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-slate-800'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className={`text-[11px] uppercase border-b ${
              isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-950 text-slate-400 border-slate-800'
            }`}>
              <tr>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/80'}`}>
              {sortedTransactions.length > 0 ? (
                sortedTransactions.map((tx) => {
                  const isExpanded = expandedTxId === tx.id;
                  const timeFormatted = new Date(tx.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <React.Fragment key={tx.id}>
                      <tr 
                        onClick={() => toggleExpand(tx.id)}
                        className={`cursor-pointer transition-colors ${
                          isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/50'
                        } ${tx.isUndone ? 'opacity-40 line-through' : ''}`}
                      >
                        <td className="py-3 px-4 font-semibold text-slate-400">
                          {timeFormatted}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getActionBadgeColor(tx.actionType)}`}>
                            {tx.actionType}
                          </span>
                        </td>
                        <td className={`py-3 px-4 font-sans font-medium ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                          {tx.description}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button className="text-slate-400 hover:text-white">
                            {isExpanded ? <ChevronUp className="w-4 h-4 inline" /> : <ChevronDown className="w-4 h-4 inline" />}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className={isLight ? 'bg-slate-50' : 'bg-slate-950/80'}>
                          <td colSpan={4} className="p-4 text-xs font-mono">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-[10px] uppercase text-slate-400 block mb-1">Resulting State Snapshot:</span>
                                <pre className={`p-2 rounded text-[11px] overflow-x-auto max-h-40 border ${
                                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-300'
                                }`}>
                                  {JSON.stringify(tx.resultingSnapshot, null, 2)}
                                </pre>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase text-slate-400 block mb-1">Previous State Snapshot:</span>
                                <pre className={`p-2 rounded text-[11px] overflow-x-auto max-h-40 border ${
                                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-300'
                                }`}>
                                  {JSON.stringify(tx.previousSnapshot, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 font-mono">
                    No transactions matching your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
