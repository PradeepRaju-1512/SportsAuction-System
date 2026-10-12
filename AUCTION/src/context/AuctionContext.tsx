import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  AuctionSessionState, 
  Player, 
  Team, 
  AuditTransaction, 
  BidRecord, 
  VisualTheme, 
  ColorMode,
  TournamentConfig,
  ActionType 
} from '../types/auction';
import { validateBid, assignSlotCode } from '../utils/rules';
import { audioEngine } from '../utils/audio';
import { 
  getExactUserCandidates, 
  generateSampleCandidates, 
  formatLakhs, 
  downloadFile 
} from '../utils/csvParser';

const STORAGE_KEY = 'iiit_trichy_auction_v3';
const BROADCAST_CHANNEL_NAME = 'iiit_trichy_auction_sync';

export const DEFAULT_CONFIG: TournamentConfig = {
  tournamentName: 'IIIT Trichy Premier League',
  startingPurse: 2500000, // 25 Lakhs
  minSquadSize: 7,
  maxSquadSize: 10,
  clubBasePrice: 250000,  // 2.5 Lakhs
  nonClubBasePrice: 100000, // 1 Lakh
  slots: [
    { codePrefix: 'SET', name: 'Setter', maxCount: 2, aliasKeywords: ['setter', 'set', 's'] },
    { codePrefix: 'SPK', name: 'Spiker', maxCount: 3, aliasKeywords: ['spiker', 'spk', 'attacker', 'opposite'] },
    { codePrefix: 'LIB', name: 'Libero', maxCount: 5, aliasKeywords: ['libero', 'lib', 'defender', 'def', 'blocker'] },
  ],
  isConfigured: true,
};

export const DEFAULT_TEAMS: Team[] = [
  { 
    id: 'team-1', 
    name: 'Trichy Titans', 
    captainName: 'Alex Vance', 
    startingPurse: 2500000, 
    remainingPurse: 2250000, 
    creditsSpent: 250000, 
    teamColor: '#3B82F6', 
    status: 'Approved', 
    draftedPlayers: [
      {
        playerId: 'pre-1',
        playerName: 'Pradeep Raju',
        position: 'SET',
        slotCode: 'SET1',
        price: 250000,
        round: 1,
        timestamp: new Date().toISOString()
      }
    ] 
  },
  { 
    id: 'team-2', 
    name: 'Cauvery Kings', 
    captainName: 'Elena Rostova', 
    startingPurse: 2500000, 
    remainingPurse: 2200000, 
    creditsSpent: 300000, 
    teamColor: '#EF4444', 
    status: 'Approved', 
    draftedPlayers: [
      {
        playerId: 'pre-2',
        playerName: 'Karthik Verma',
        position: 'SPK',
        slotCode: 'SPK1',
        price: 300000,
        round: 1,
        timestamp: new Date().toISOString()
      }
    ] 
  },
  { 
    id: 'team-3', 
    name: 'Rockfort Strikers', 
    captainName: 'Marcus Chen', 
    startingPurse: 2500000, 
    remainingPurse: 2350000, 
    creditsSpent: 150000, 
    teamColor: '#10B981', 
    status: 'Approved', 
    draftedPlayers: [
      {
        playerId: 'pre-3',
        playerName: 'Vikram Patel',
        position: 'LIB',
        slotCode: 'LIB1',
        price: 150000,
        round: 1,
        timestamp: new Date().toISOString()
      }
    ] 
  },
  { 
    id: 'team-4', 
    name: 'Delta Warriors', 
    captainName: 'Samantha Ray', 
    startingPurse: 2500000, 
    remainingPurse: 2300000, 
    creditsSpent: 200000, 
    teamColor: '#F59E0B', 
    status: 'Approved', 
    draftedPlayers: [
      {
        playerId: 'pre-4',
        playerName: 'Ananya Sen',
        position: 'SET',
        slotCode: 'SET1',
        price: 200000,
        round: 1,
        timestamp: new Date().toISOString()
      }
    ] 
  },
  { 
    id: 'team-5', 
    name: 'Solar Blasters', 
    captainName: 'David Kim', 
    startingPurse: 2500000, 
    remainingPurse: 2150000, 
    creditsSpent: 350000, 
    teamColor: '#8B5CF6', 
    status: 'Approved', 
    draftedPlayers: [
      {
        playerId: 'pre-5',
        playerName: 'Rohan Deshmukh',
        position: 'SPK',
        slotCode: 'SPK1',
        price: 350000,
        round: 1,
        timestamp: new Date().toISOString()
      }
    ] 
  },
  { 
    id: 'team-6', 
    name: 'Emerald Eagles', 
    captainName: 'Priya Sharma', 
    startingPurse: 2500000, 
    remainingPurse: 2400000, 
    creditsSpent: 100000, 
    teamColor: '#F97316', 
    status: 'Approved', 
    draftedPlayers: [
      {
        playerId: 'pre-6',
        playerName: 'Arjun Sharma',
        position: 'LIB',
        slotCode: 'LIB1',
        price: 100000,
        round: 1,
        timestamp: new Date().toISOString()
      }
    ] 
  },
];

function findNextPendingPlayerIndex(players: Player[], currentIndex: number): number {
  if (players.length === 0) return -1;
  // Search forward from currentIndex + 1
  for (let i = currentIndex + 1; i < players.length; i++) {
    if (players[i].status === 'pending') return i;
  }
  // Wrap around from 0 to currentIndex
  for (let i = 0; i <= currentIndex; i++) {
    if (players[i].status === 'pending') return i;
  }
  return -1;
}

function createInitialState(): AuctionSessionState {
  const initialCandidates = getExactUserCandidates(DEFAULT_CONFIG);
  return {
    config: DEFAULT_CONFIG,
    teams: DEFAULT_TEAMS,
    players: initialCandidates,
    queueIndex: 0,
    currentBidAmount: initialCandidates[0]?.basePrice || 250000,
    leadingTeamId: null,
    activeRound: 1,
    isStrictRulesEnforced: true, // P0: Strict budget & squad reserve rules enabled by default for live auctions
    isAuctionCompleted: false,
    recentBids: [],
    transactions: [
      {
        id: `tx-init`,
        timestamp: new Date().toISOString(),
        actionType: 'CONFIG_UPDATED',
        operator: 'Tournament Director',
        entityType: 'config',
        description: 'Initialized IIIT Trichy Tournament with 25 Lakhs team purse & strict budget rules',
        previousSnapshot: null,
        resultingSnapshot: { config: DEFAULT_CONFIG },
      },
    ],
    undoStack: [],
    redoStack: [],
    activeTheme: 'stadium-blue',
    colorMode: 'dark',
    isAudioMuted: false,
    lastUpdated: new Date().toISOString(),
  };
}

export interface AuctionNotice {
  id: string;
  type: 'error' | 'success' | 'info';
  message: string;
}

interface AuctionContextType {
  state: AuctionSessionState;
  activePlayer: Player | null;
  leadingTeam: Team | null;
  auctionNotice: AuctionNotice | null;
  dismissNotice: () => void;
  showNotice: (message: string, type?: 'error' | 'success' | 'info') => void;

  // Live Auction & Bidding
  placeBid: (teamId: string, customAmount?: number) => boolean;
  sellCurrentPlayer: () => boolean;
  markPlayerUnsold: () => boolean;
  passCurrentPlayer: () => boolean;
  toggleStrictRules: () => void;
  toggleAudioMute: () => void;
  setTheme: (theme: VisualTheme) => void;
  toggleColorMode: () => void;
  setColorMode: (mode: ColorMode) => void;
  updatePlayerPhoto: (playerId: string, newPhotoUrl: string) => void;

  // Round 2 Management
  startRound2: (discountPercent?: number) => boolean;
  movePlayerToRound2: (playerId: string, newBasePrice?: number) => void;
  injectGlobalPurseBonus: (bonusAmount: number) => void;
  expandSquadLimits: (additionalSlots: number) => void;

  // Universal Undo & Redo
  undo: () => boolean;
  redo: () => boolean;
  canUndo: boolean;
  canRedo: boolean;
  lastActionMessage: string | null;

  // Setup Wizard & Config
  updateTournamentConfig: (newConfig: TournamentConfig) => void;
  setupTournament: (config: TournamentConfig, teams: Team[], players: Player[]) => void;
  setTeams: (teams: Team[]) => void;
  importPlayersToQueue: (players: Player[], mode?: 'append' | 'replace') => void;
  loadExactCandidates: () => void;
  loadSampleCandidates: () => void;

  // Administrative Overrides & Operations
  forceDraftPlayer: (playerId: string, teamId: string, price: number, reason: string) => boolean;
  overridePrice: (playerId: string, newPrice: number) => void;
  jumpToPlayer: (index: number) => void;
  shuffleRemainingQueue: () => void;
  adjustTeamPurse: (teamId: string, newPurse: number, reason: string) => void;

  // Finalization & State Management
  finalizeAuction: () => boolean;
  reopenAuction: () => void;
  resetToFresh: () => void;
  resetToScratch: () => void;
  downloadJSONBackup: () => void;
  restoreStateFromJSON: (restored: AuctionSessionState) => boolean;
}

const AuctionContext = createContext<AuctionContextType | null>(null);

export const AuctionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial state from localStorage if available
  const [state, setState] = useState<AuctionSessionState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.config && Array.isArray(parsed.teams)) {
            const fresh = createInitialState();
            const hasPlayers = Array.isArray(parsed.players) && parsed.players.length > 0;
            const hasDrafted = parsed.teams.some((t: any) => Array.isArray(t.draftedPlayers) && t.draftedPlayers.length > 0);

            return {
              ...fresh,
              ...parsed,
              players: hasPlayers ? parsed.players : fresh.players,
              teams: hasDrafted ? parsed.teams : fresh.teams,
              currentBidAmount: parsed.currentBidAmount || (hasPlayers ? parsed.players[parsed.queueIndex || 0]?.basePrice : fresh.players[0]?.basePrice) || 250000,
              colorMode: parsed.colorMode || 'dark',
              activeRound: parsed.activeRound || 1,
              isStrictRulesEnforced: parsed.isStrictRulesEnforced !== undefined ? parsed.isStrictRulesEnforced : true,
            };
          }
        }
      } catch (e) {
        console.error('Failed to parse saved state from localStorage:', e);
      }
    }
    return createInitialState();
  });

  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null);
  const [auctionNotice, setAuctionNotice] = useState<AuctionNotice | null>(null);

  // Unique tab identifier to permanently prevent BroadcastChannel echo loops
  const tabIdRef = useRef<string>(
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `tab-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  );

  // In-memory snapshot cache for universal high-fidelity undo/redo without bloating LocalStorage
  const inMemorySnapshotsRef = useRef<Map<string, { previousSnapshot: any; resultingSnapshot: any }>>(new Map());

  // Atomic in-flight lock to eliminate double-sell race conditions from rapid Enter key mashing
  const isSellingRef = useRef<boolean>(false);

  // BroadcastChannel for syncing multiple windows / projector tab in real-time
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const isReceivingBroadcastRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        broadcastChannelRef.current = channel;

        channel.onmessage = (event) => {
          // Zero-Echo Rule: Instantly reject any message originated by this exact tab!
          if (event.data && event.data.senderId === tabIdRef.current) {
            return;
          }

          if (event.data && event.data.type === 'SYNC_STATE' && event.data.state) {
            isReceivingBroadcastRef.current = true;
            setState(event.data.state);
            // Release lock immediately via microtask, avoiding any fragile timeout race conditions
            queueMicrotask(() => {
              isReceivingBroadcastRef.current = false;
            });
          }
        };

        return () => {
          channel.close();
        };
      } catch (e) {
        console.warn('BroadcastChannel initialization error:', e);
      }
    }
  }, []);

  const dismissNotice = useCallback(() => {
    setAuctionNotice(null);
  }, []);

  const showNotice = useCallback((message: string, type: 'error' | 'success' | 'info' = 'info') => {
    setAuctionNotice({
      id: String(Date.now()),
      type,
      message,
    });
  }, []);

  // Auto-dismiss notice after 5 seconds
  useEffect(() => {
    if (auctionNotice) {
      const timer = setTimeout(() => {
        setAuctionNotice(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [auctionNotice]);

  // Persist compact, quota-safe state to localStorage and broadcast to projector
  useEffect(() => {
    try {
      // 1. Strip heavy previousSnapshot and resultingSnapshot from transactions when saving to LocalStorage.
      // Full deep snapshots are retained in inMemorySnapshotsRef for active session undo/redo.
      const lightweightTransactions = state.transactions.slice(0, 100).map((t) => ({
        id: t.id,
        timestamp: t.timestamp,
        actionType: t.actionType,
        operator: t.operator,
        entityType: t.entityType,
        description: t.description,
        entityId: t.entityId,
        entityName: t.entityName,
        linkedTransactionId: t.linkedTransactionId,
        isUndone: t.isUndone,
        previousSnapshot: null,
        resultingSnapshot: null,
      }));

      // 2. Prevent duplication of large photo URLs if rawPhotoUrl is identical
      const sanitizedPlayers = state.players.map((p) => {
        if (p.rawPhotoUrl === p.photoUrl) {
          const { rawPhotoUrl, ...rest } = p;
          return { ...rest, rawPhotoUrl: p.photoUrl };
        }
        return p;
      });

      const stateToSave = {
        ...state,
        players: sanitizedPlayers,
        transactions: lightweightTransactions,
      };

      const serialized = JSON.stringify(stateToSave);
      
      try {
        localStorage.setItem(STORAGE_KEY, serialized);
      } catch (quotaError: any) {
        // QuotaExceededError recovery: Trim transactions to 20 and retry
        console.warn('LocalStorage quota constraint detected; pruning historical transactions to guarantee draft state safety.', quotaError);
        const emergencyState = {
          ...stateToSave,
          transactions: lightweightTransactions.slice(0, 20),
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(emergencyState));
        } catch {
          console.error('Critical: LocalStorage full. In-memory state remains fully intact.');
        }
      }

      // 3. Broadcast state to external windows with unique senderId to prevent ping-pong loops
      if (broadcastChannelRef.current && !isReceivingBroadcastRef.current) {
        broadcastChannelRef.current.postMessage({
          type: 'SYNC_STATE',
          state,
          senderId: tabIdRef.current,
          timestamp: Date.now(),
        });
      }
    } catch (e) {
      console.error('Failed to persist auction state:', e);
    }
  }, [state]);

  // Sync colorMode class on html/body
  useEffect(() => {
    const root = document.documentElement;
    if (state.colorMode === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
  }, [state.colorMode]);

  // Active player in current queue
  const activePlayer: Player | null = state.players[state.queueIndex] || null;

  // Leading team for current active bid
  const leadingTeam: Team | null = state.leadingTeamId 
    ? state.teams.find((t) => t.id === state.leadingTeamId) || null 
    : null;

  // Helper to commit atomic state mutation with transaction logging & reversible snapshot
  const commitTransaction = useCallback(
    (
      actionType: ActionType,
      description: string,
      entityType: AuditTransaction['entityType'],
      updateFn: (current: AuctionSessionState) => Partial<AuctionSessionState>,
      meta?: { entityId?: string; entityName?: string }
    ) => {
      setState((prev) => {
        // Universal snapshot includes all state including config and rules mode
        const previousSnapshot = {
          config: JSON.parse(JSON.stringify(prev.config)),
          isStrictRulesEnforced: prev.isStrictRulesEnforced,
          teams: JSON.parse(JSON.stringify(prev.teams)),
          players: JSON.parse(JSON.stringify(prev.players)),
          queueIndex: prev.queueIndex,
          currentBidAmount: prev.currentBidAmount,
          leadingTeamId: prev.leadingTeamId,
          activeRound: prev.activeRound,
          isAuctionCompleted: prev.isAuctionCompleted,
          recentBids: [...prev.recentBids],
        };

        const updates = updateFn(prev);
        const nextState: AuctionSessionState = {
          ...prev,
          ...updates,
          lastUpdated: new Date().toISOString(),
        };

        const resultingSnapshot = {
          config: JSON.parse(JSON.stringify(nextState.config)),
          isStrictRulesEnforced: nextState.isStrictRulesEnforced,
          teams: JSON.parse(JSON.stringify(nextState.teams)),
          players: JSON.parse(JSON.stringify(nextState.players)),
          queueIndex: nextState.queueIndex,
          currentBidAmount: nextState.currentBidAmount,
          leadingTeamId: nextState.leadingTeamId,
          activeRound: nextState.activeRound,
          isAuctionCompleted: nextState.isAuctionCompleted,
          recentBids: [...nextState.recentBids],
        };

        const txId = typeof crypto !== 'undefined' && crypto.randomUUID
          ? `tx-${crypto.randomUUID()}`
          : `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

        // Retain full snapshots in in-memory map for the active session (up to 60 transactions)
        inMemorySnapshotsRef.current.set(txId, { previousSnapshot, resultingSnapshot });
        if (inMemorySnapshotsRef.current.size > 60) {
          const oldestKey = inMemorySnapshotsRef.current.keys().next().value;
          if (oldestKey) inMemorySnapshotsRef.current.delete(oldestKey);
        }

        const newTransaction: AuditTransaction = {
          id: txId,
          timestamp: new Date().toISOString(),
          actionType,
          operator: 'Tournament Director',
          entityType,
          description,
          previousSnapshot,
          resultingSnapshot,
          entityId: meta?.entityId,
          entityName: meta?.entityName,
          isUndone: false,
        };

        return {
          ...nextState,
          transactions: [newTransaction, ...prev.transactions].slice(0, 200),
          undoStack: [txId, ...prev.undoStack].slice(0, 30),
          redoStack: [],
        };
      });

      setLastActionMessage(description);
    },
    []
  );

  // Place a Bid on Current Athlete (Strict & Safe Bidding)
  const placeBid = useCallback(
    (teamId: string, customAmount?: number): boolean => {
      if (!activePlayer || activePlayer.status !== 'pending') {
        showNotice('Cannot place bid: No active athlete currently on stage.', 'error');
        return false;
      }

      // Prevent team from outbidding itself
      if (state.leadingTeamId === teamId) {
        audioEngine.playBuzzer();
        const leadingName = state.teams.find((t) => t.id === teamId)?.name || 'Team';
        showNotice(`${leadingName} already holds the highest leading bid. Another franchise must bid first.`, 'error');
        return false;
      }

      const team = state.teams.find((t) => t.id === teamId);
      if (!team) {
        showNotice('Invalid team selected.', 'error');
        return false;
      }

      const basePrice = activePlayer.basePrice || 100000;
      let newAmount: number;

      if (customAmount !== undefined) {
        newAmount = customAmount;
      } else if (!state.leadingTeamId) {
        // First opening bid defaults to base price
        newAmount = basePrice;
      } else {
        // Dynamic increment ladder: +1L under 10L, +2.5L between 10L-25L, +5L above 25L
        const step = state.currentBidAmount >= 2500000 
          ? 500000 
          : state.currentBidAmount >= 1000000 
          ? 250000 
          : 100000;
        newAmount = state.currentBidAmount + step;
      }

      // Check minimum base price
      if (newAmount < basePrice) {
        audioEngine.playBuzzer();
        showNotice(`Bid denied: Minimum opening bid must meet base price (${formatLakhs(basePrice)}).`, 'error');
        return false;
      }

      // If already bid, new bid must be higher
      if (state.leadingTeamId && newAmount <= state.currentBidAmount) {
        audioEngine.playBuzzer();
        showNotice(`Bid denied: New bid (${formatLakhs(newAmount)}) must exceed current highest bid (${formatLakhs(state.currentBidAmount)}).`, 'error');
        return false;
      }

      // Full validation (purse, squad cap, position slots, minimum reserve)
      const validation = validateBid(team, activePlayer, newAmount, state.config, state.isStrictRulesEnforced, state.leadingTeamId);
      if (!validation.isValid) {
        audioEngine.playBuzzer();
        showNotice(`Bid Denied for ${team.name}: ${validation.reason}`, 'error');
        return false;
      }

      audioEngine.playBidChirp();

      const bidRecord: BidRecord = {
        id: `bid-${Date.now()}`,
        playerId: activePlayer.id,
        playerName: activePlayer.name,
        teamId: team.id,
        teamName: team.name,
        amount: newAmount,
        increment: newAmount - (state.leadingTeamId ? state.currentBidAmount : basePrice),
        timestamp: new Date().toLocaleTimeString(),
      };

      commitTransaction(
        'BID_PLACED',
        `${team.name} placed bid of ${formatLakhs(newAmount)} on ${activePlayer.name}`,
        'bid',
        (curr) => ({
          currentBidAmount: newAmount,
          leadingTeamId: team.id,
          recentBids: [bidRecord, ...curr.recentBids].slice(0, 10),
        }),
        { entityId: team.id, entityName: team.name }
      );

      showNotice(`${team.name} takes the lead with ${formatLakhs(newAmount)}!`, 'success');
      return true;
    },
    [activePlayer, state.currentBidAmount, state.leadingTeamId, state.teams, state.isStrictRulesEnforced, state.config, commitTransaction, showNotice]
  );

  // Sell Current Player to Leading Bidder (Protected against Enter key mashing race condition)
  const sellCurrentPlayer = useCallback((): boolean => {
    if (isSellingRef.current) {
      return false;
    }

    if (!activePlayer || !leadingTeam || activePlayer.status !== 'pending') {
      showNotice('Cannot execute sale: No leading bid on the current athlete.', 'error');
      return false;
    }

    isSellingRef.current = true;
    setTimeout(() => {
      isSellingRef.current = false;
    }, 450);

    const winningPrice = state.currentBidAmount;
    const slotCode = assignSlotCode(leadingTeam, activePlayer);

    audioEngine.playGavelImpact();

    commitTransaction(
      'PLAYER_SOLD',
      `SOLD! ${activePlayer.name} awarded to ${leadingTeam.name} for ${formatLakhs(winningPrice)} (${slotCode})`,
      'player',
      (curr) => {
        // Atomic In-Flight Verification: Guard against double execution
        const targetPlayer = curr.players.find((p) => p.id === activePlayer.id);
        if (!targetPlayer || targetPlayer.status !== 'pending') {
          return {};
        }

        const updatedPlayers = curr.players.map((p) =>
          p.id === activePlayer.id
            ? {
                ...p,
                status: 'sold' as const,
                winningBid: winningPrice,
                winningTeamId: leadingTeam.id,
                slotCode,
                soldTimestamp: new Date().toISOString(),
                attemptsCount: p.attemptsCount + 1,
              }
            : p
        );

        const updatedTeams = curr.teams.map((t) => {
          if (t.id === leadingTeam.id) {
            return {
              ...t,
              remainingPurse: t.remainingPurse - winningPrice,
              creditsSpent: t.creditsSpent + winningPrice,
              draftedPlayers: [
                ...t.draftedPlayers,
                {
                  playerId: activePlayer.id,
                  playerName: activePlayer.name,
                  price: winningPrice,
                  position: activePlayer.position,
                  slotCode,
                  timestamp: new Date().toISOString(),
                  round: activePlayer.round,
                },
              ],
            };
          }
          return t;
        });

        // Search for next pending player with wraparound
        const nextPendingIdx = findNextPendingPlayerIndex(updatedPlayers, curr.queueIndex);
        const isCompleted = nextPendingIdx === -1;
        const nextPlayer = nextPendingIdx !== -1 ? updatedPlayers[nextPendingIdx] : null;

        return {
          players: updatedPlayers,
          teams: updatedTeams,
          queueIndex: nextPendingIdx !== -1 ? nextPendingIdx : curr.queueIndex,
          currentBidAmount: nextPlayer ? nextPlayer.basePrice : curr.config.nonClubBasePrice,
          leadingTeamId: null,
          recentBids: [],
          isAuctionCompleted: isCompleted,
        };
      },
      { entityId: activePlayer.id, entityName: activePlayer.name }
    );

    showNotice(`Hammer down! ${activePlayer.name} sold to ${leadingTeam.name} for ${formatLakhs(winningPrice)}!`, 'success');
    return true;
  }, [activePlayer, leadingTeam, state.currentBidAmount, commitTransaction, showNotice]);

  // Mark Player Unsold (Eligible for Round 2)
  const markPlayerUnsold = useCallback((): boolean => {
    if (!activePlayer) {
      showNotice('No active athlete on stage to pass.', 'error');
      return false;
    }

    audioEngine.playBuzzer();

    commitTransaction(
      'PLAYER_UNSOLD',
      `${activePlayer.name} passed unsold in Round ${activePlayer.round}`,
      'player',
      (curr) => {
        const updatedPlayers = curr.players.map((p) =>
          p.id === activePlayer.id
            ? {
                ...p,
                status: 'unsold' as const,
                attemptsCount: p.attemptsCount + 1,
              }
            : p
        );

        // Search for next pending player with wraparound
        const nextPendingIdx = findNextPendingPlayerIndex(updatedPlayers, curr.queueIndex);
        const isCompleted = nextPendingIdx === -1;
        const nextPlayer = nextPendingIdx !== -1 ? updatedPlayers[nextPendingIdx] : null;

        return {
          players: updatedPlayers,
          queueIndex: nextPendingIdx !== -1 ? nextPendingIdx : curr.queueIndex,
          currentBidAmount: nextPlayer ? nextPlayer.basePrice : curr.config.nonClubBasePrice,
          leadingTeamId: null,
          recentBids: [],
          isAuctionCompleted: isCompleted,
        };
      },
      { entityId: activePlayer.id, entityName: activePlayer.name }
    );

    showNotice(`${activePlayer.name} passed unsold. Eligible for Round 2 pool.`, 'info');
    return true;
  }, [activePlayer, commitTransaction, showNotice]);

  const passCurrentPlayer = useCallback((): boolean => {
    return markPlayerUnsold();
  }, [markPlayerUnsold]);

  // Direct Photo Updater
  const updatePlayerPhoto = useCallback((playerId: string, newPhotoUrl: string) => {
    commitTransaction(
      'CONFIG_UPDATED',
      `Updated athlete photo`,
      'player',
      (curr) => ({
        players: curr.players.map((p) => 
          p.id === playerId ? { ...p, photoUrl: newPhotoUrl, rawPhotoUrl: newPhotoUrl } : p
        ),
      }),
      { entityId: playerId }
    );
    showNotice('Photo updated successfully and visible on stage.', 'success');
  }, [commitTransaction, showNotice]);

  // Round 2 Safeguards: Block if Round 1 still pending, no double attempt increment
  const startRound2 = useCallback((discountPercent: number = 0): boolean => {
    // P0 Safeguard: Check if any Round 1 athletes are still pending
    const pendingRound1 = state.players.filter((p) => p.round === 1 && p.status === 'pending');
    if (pendingRound1.length > 0) {
      showNotice(`Cannot start Round 2: There are still ${pendingRound1.length} pending athletes in Round 1. Please process them first.`, 'error');
      return false;
    }

    const unsoldAthletes = state.players.filter((p) => p.status === 'unsold' || p.status === 'passed');
    if (unsoldAthletes.length === 0) {
      showNotice('There are no unsold athletes eligible for Round 2.', 'info');
      return false;
    }

    commitTransaction(
      'ROUND_2_STARTED',
      `Launched Round 2 with ${discountPercent > 0 ? `${discountPercent}% discount` : 'standard base prices'} for ${unsoldAthletes.length} unsold athletes`,
      'auction',
      (curr) => {
        const updatedPlayers = curr.players.map((p) => {
          if (p.status === 'unsold' || p.status === 'passed') {
            const discountedPrice = discountPercent > 0 
              ? Math.max(50000, Math.round(p.basePrice * (1 - discountPercent / 100)))
              : p.basePrice;

            return {
              ...p,
              status: 'pending' as const,
              round: (curr.activeRound >= 2 ? curr.activeRound + 1 : 2) as any,
              basePrice: discountedPrice,
              // Do NOT double-increment attemptsCount here; it was already incremented when marked unsold
            };
          }
          return p;
        });

        const firstPendingIdx = updatedPlayers.findIndex((p) => p.status === 'pending');
        const nextPlayer = firstPendingIdx !== -1 ? updatedPlayers[firstPendingIdx] : null;

        return {
          players: updatedPlayers,
          activeRound: 2 as const,
          queueIndex: firstPendingIdx !== -1 ? firstPendingIdx : 0,
          currentBidAmount: nextPlayer ? nextPlayer.basePrice : curr.config.nonClubBasePrice,
          leadingTeamId: null,
          recentBids: [],
          isAuctionCompleted: false,
        };
      }
    );

    showNotice(`Round 2 launched with ${unsoldAthletes.length} athletes ready for bidding!`, 'success');
    return true;
  }, [state.players, commitTransaction, showNotice]);

  const movePlayerToRound2 = useCallback((playerId: string, newBasePrice?: number) => {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) return;

    commitTransaction(
      'ROUND_2_STARTED',
      `Re-queued ${player.name} to Round 2 with base price of ${formatLakhs(newBasePrice || player.basePrice)}`,
      'player',
      (curr) => {
        const updatedPlayers = curr.players.map((p) => {
          if (p.id === playerId) {
            return {
              ...p,
              status: 'pending' as const,
              round: 2 as const,
              basePrice: newBasePrice !== undefined ? newBasePrice : p.basePrice,
            };
          }
          return p;
        });

        const targetIdx = updatedPlayers.findIndex((p) => p.id === playerId);

        return {
          players: updatedPlayers,
          activeRound: 2 as const,
          queueIndex: targetIdx !== -1 ? targetIdx : curr.queueIndex,
          currentBidAmount: newBasePrice !== undefined ? newBasePrice : player.basePrice,
          leadingTeamId: null,
          recentBids: [],
          isAuctionCompleted: false,
        };
      },
      { entityId: player.id, entityName: player.name }
    );
    showNotice(`${player.name} added to Round 2 live queue!`, 'success');
  }, [state.players, commitTransaction, showNotice]);

  // Round 2 Stimulus: Inject bonus amount into all teams' starting & remaining purses
  const injectGlobalPurseBonus = useCallback((bonusAmount: number) => {
    if (bonusAmount <= 0) return;

    commitTransaction(
      'PURSE_ADJUSTED',
      `Round 2 Stimulus: Added ${formatLakhs(bonusAmount)} to all franchises`,
      'bulk',
      (curr) => {
        const updatedTeams = curr.teams.map((team) => ({
          ...team,
          startingPurse: team.startingPurse + bonusAmount,
          remainingPurse: team.remainingPurse + bonusAmount,
        }));
        return {
          teams: updatedTeams,
        };
      }
    );
    showNotice(`Round 2 Stimulus Applied: Added ${formatLakhs(bonusAmount)} to all franchises!`, 'success');
  }, [commitTransaction, showNotice]);

  // Round 2 Cap Expansion: Increase maxSquadSize and positional flex limits
  const expandSquadLimits = useCallback((additionalSlots: number) => {
    if (additionalSlots <= 0) return;

    commitTransaction(
      'CONFIG_UPDATED',
      `Round 2 Roster Expansion: Expanded max squad size by +${additionalSlots} (New Cap: ${state.config.maxSquadSize + additionalSlots})`,
      'config',
      (curr) => {
        const updatedSlots = curr.config.slots.map((slot) => {
          if (slot.codePrefix.toUpperCase() === 'FLEX' || slot.name.toLowerCase().includes('flex') || slot.name.toLowerCase().includes('general')) {
            return { ...slot, maxCount: slot.maxCount + additionalSlots };
          }
          return slot;
        });

        // If no FLEX slot exists, ensure slots can accommodate the new players
        const hasFlex = updatedSlots.some((s) => s.codePrefix.toUpperCase() === 'FLEX' || s.name.toLowerCase().includes('flex'));
        if (!hasFlex && updatedSlots.length > 0) {
          updatedSlots.push({
            codePrefix: 'FLEX',
            name: 'Flex / Wildcard',
            maxCount: additionalSlots,
            aliasKeywords: ['flex', 'wildcard', 'all-rounder', 'reserve'],
          });
        }

        const newConfig = {
          ...curr.config,
          maxSquadSize: curr.config.maxSquadSize + additionalSlots,
          slots: updatedSlots,
        };

        return {
          config: newConfig,
        };
      }
    );
    showNotice(`Squad Cap Expanded by +${additionalSlots} slots!`, 'success');
  }, [state.config.maxSquadSize, commitTransaction, showNotice]);

  // Universal Undo & Redo (Restores entire state using in-memory snapshot cache and historical logs)
  const undo = useCallback((): boolean => {
    if (state.undoStack.length === 0) return false;

    const txId = state.undoStack[0];
    const inMem = inMemorySnapshotsRef.current.get(txId);
    const tx = state.transactions.find((t) => t.id === txId);
    const snap = inMem?.previousSnapshot || tx?.previousSnapshot;

    if (!snap) {
      // Clean up orphaned undo ID to prevent stuck stacks
      setState((prev) => ({ ...prev, undoStack: prev.undoStack.slice(1) }));
      return false;
    }

    audioEngine.playSoftClick();

    setState((prev) => {
      const newUndoStack = prev.undoStack.slice(1);
      const newRedoStack = [txId, ...prev.redoStack];

      const undoneTx: AuditTransaction = {
        id: `undo-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actionType: 'UNDO_OPERATION',
        operator: 'Tournament Director',
        entityType: tx?.entityType || 'bulk',
        description: `Undid: ${tx?.description || 'Operation'}`,
        previousSnapshot: inMem?.resultingSnapshot || tx?.resultingSnapshot,
        resultingSnapshot: snap,
        linkedTransactionId: txId,
        isUndone: false,
      };

      const updatedTransactions = prev.transactions.map((t) =>
        t.id === txId ? { ...t, isUndone: true } : t
      );

      setLastActionMessage(`Reversed: ${tx?.description || 'Operation'}`);

      return {
        ...prev,
        config: snap.config || prev.config,
        isStrictRulesEnforced: snap.isStrictRulesEnforced !== undefined ? snap.isStrictRulesEnforced : prev.isStrictRulesEnforced,
        teams: snap.teams,
        players: snap.players,
        queueIndex: snap.queueIndex,
        currentBidAmount: snap.currentBidAmount,
        leadingTeamId: snap.leadingTeamId,
        activeRound: snap.activeRound || 1,
        isAuctionCompleted: snap.isAuctionCompleted,
        recentBids: snap.recentBids || [],
        undoStack: newUndoStack,
        redoStack: newRedoStack,
        transactions: [undoneTx, ...updatedTransactions].slice(0, 200),
        lastUpdated: new Date().toISOString(),
      };
    });

    showNotice(`Undone: ${tx?.description || 'Operation'}`, 'info');
    return true;
  }, [state.undoStack, state.transactions, showNotice]);

  const redo = useCallback((): boolean => {
    if (state.redoStack.length === 0) return false;

    const txId = state.redoStack[0];
    const inMem = inMemorySnapshotsRef.current.get(txId);
    const tx = state.transactions.find((t) => t.id === txId);
    const snap = inMem?.resultingSnapshot || tx?.resultingSnapshot;

    if (!snap) {
      setState((prev) => ({ ...prev, redoStack: prev.redoStack.slice(1) }));
      return false;
    }

    audioEngine.playSoftClick();

    setState((prev) => {
      const newRedoStack = prev.redoStack.slice(1);
      const newUndoStack = [txId, ...prev.undoStack];

      const redoneTx: AuditTransaction = {
        id: `redo-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actionType: 'REDO_OPERATION',
        operator: 'Tournament Director',
        entityType: tx?.entityType || 'bulk',
        description: `Redid: ${tx?.description || 'Operation'}`,
        previousSnapshot: inMem?.previousSnapshot || tx?.previousSnapshot,
        resultingSnapshot: snap,
        linkedTransactionId: txId,
      };

      setLastActionMessage(`Restored: ${tx?.description || 'Operation'}`);

      return {
        ...prev,
        config: snap.config || prev.config,
        isStrictRulesEnforced: snap.isStrictRulesEnforced !== undefined ? snap.isStrictRulesEnforced : prev.isStrictRulesEnforced,
        teams: snap.teams,
        players: snap.players,
        queueIndex: snap.queueIndex,
        currentBidAmount: snap.currentBidAmount,
        leadingTeamId: snap.leadingTeamId,
        activeRound: snap.activeRound || 1,
        isAuctionCompleted: snap.isAuctionCompleted,
        recentBids: snap.recentBids || [],
        undoStack: newUndoStack,
        redoStack: newRedoStack,
        transactions: [redoneTx, ...prev.transactions].slice(0, 200),
        lastUpdated: new Date().toISOString(),
      };
    });

    showNotice(`Redone: ${tx?.description || 'Operation'}`, 'info');
    return true;
  }, [state.redoStack, state.transactions, showNotice]);

  const updateTournamentConfig = useCallback((newConfig: TournamentConfig) => {
    commitTransaction(
      'CONFIG_UPDATED',
      `Updated tournament settings: ${newConfig.tournamentName}`,
      'config',
      () => ({ config: newConfig })
    );
  }, [commitTransaction]);

  const setupTournament = useCallback((config: TournamentConfig, teams: Team[], players: Player[]) => {
    commitTransaction(
      'CONFIG_UPDATED',
      `Configured tournament with ${teams.length} teams and ${players.length} players`,
      'config',
      (curr) => {
        // Intelligently preserve live auction progression if draft is already active
        const hasLiveDraftProgress =
          curr.players.some((p) => p.status === 'sold' || p.status === 'unsold') ||
          curr.activeRound > 1 ||
          curr.leadingTeamId !== null;

        const firstPendingIdx = players.findIndex((p) => p.status === 'pending');
        const queueIndex =
          hasLiveDraftProgress && curr.queueIndex < players.length
            ? curr.queueIndex
            : firstPendingIdx !== -1
            ? firstPendingIdx
            : 0;

        const targetPlayer = players[queueIndex];
        const currentBidAmount =
          hasLiveDraftProgress && curr.leadingTeamId !== null
            ? curr.currentBidAmount
            : targetPlayer?.basePrice || config.nonClubBasePrice;

        return {
          config,
          teams,
          players,
          queueIndex,
          currentBidAmount,
          leadingTeamId: hasLiveDraftProgress ? curr.leadingTeamId : null,
          activeRound: hasLiveDraftProgress ? curr.activeRound : 1,
          isAuctionCompleted: firstPendingIdx === -1 && players.length > 0,
        };
      }
    );
  }, [commitTransaction]);

  const setTeams = useCallback((teams: Team[]) => {
    commitTransaction(
      'TEAM_UPDATED',
      `Updated team registry (${teams.length} teams)`,
      'team',
      () => ({ teams })
    );
  }, [commitTransaction]);

  const importPlayersToQueue = useCallback((newPlayers: Player[], mode: 'append' | 'replace' = 'append') => {
    commitTransaction(
      'PLAYERS_IMPORTED',
      `${mode === 'replace' ? 'Replaced queue with' : 'Appended'} ${newPlayers.length} athletes from Google Forms`,
      'bulk',
      (curr) => {
        let combined: Player[];

        if (mode === 'replace') {
          combined = newPlayers;
        } else {
          // Robust non-duplicating append:
          // Filter newPlayers so that anyone with an existing rollNumber or existing id is not duplicated
          const existingRolls = new Set(
            curr.players
              .filter((p) => Boolean(p.rollNumber))
              .map((p) => p.rollNumber!.trim().toLowerCase())
          );
          const existingIds = new Set(curr.players.map((p) => p.id));

          const uniqueIncoming = newPlayers.filter((np) => {
            if (np.rollNumber && existingRolls.has(np.rollNumber.trim().toLowerCase())) {
              return false; // Already present in queue by rollNumber
            }
            if (existingIds.has(np.id)) {
              return false; // Already present in queue by id
            }
            return true;
          });

          combined = [...curr.players, ...uniqueIncoming];
        }

        const firstPendingIdx = combined.findIndex((p) => p.status === 'pending');
        const queueIdx = firstPendingIdx !== -1 ? firstPendingIdx : 0;
        return {
          players: combined,
          queueIndex: queueIdx,
          currentBidAmount: combined[queueIdx]?.basePrice || curr.config.nonClubBasePrice,
          leadingTeamId: null,
          recentBids: [],
          isAuctionCompleted: firstPendingIdx === -1 && combined.length > 0,
        };
      }
    );
    showNotice(`Loaded ${newPlayers.length} athletes into auction queue!`, 'success');
  }, [commitTransaction, showNotice]);

  const loadExactCandidates = useCallback(() => {
    const candidates = getExactUserCandidates(state.config);
    importPlayersToQueue(candidates, 'replace');
  }, [state.config, importPlayersToQueue]);

  const loadSampleCandidates = useCallback(() => {
    const sample = generateSampleCandidates(state.config);
    importPlayersToQueue(sample, 'replace');
  }, [state.config, importPlayersToQueue]);

  // Safe Force Draft: Validates status, transfers if already owned, and checks purse limits
  const forceDraftPlayer = useCallback((playerId: string, teamId: string, price: number, reason: string): boolean => {
    if (price < 0 || isNaN(price)) {
      showNotice('Cannot force draft: Price cannot be negative.', 'error');
      return false;
    }

    const player = state.players.find((p) => p.id === playerId);
    const targetTeam = state.teams.find((t) => t.id === teamId);
    if (!player || !targetTeam) {
      showNotice('Invalid athlete or team for force draft.', 'error');
      return false;
    }

    if (price > targetTeam.remainingPurse) {
      showNotice(`Cannot force draft: Price ${formatLakhs(price)} exceeds ${targetTeam.name}'s remaining purse (${formatLakhs(targetTeam.remainingPurse)}).`, 'error');
      return false;
    }

    if (targetTeam.draftedPlayers.length >= state.config.maxSquadSize) {
      showNotice(`Cannot force draft: ${targetTeam.name} has already reached maximum squad limit (${state.config.maxSquadSize}).`, 'error');
      return false;
    }

    const previousOwnerId = player.winningTeamId;

    commitTransaction(
      'FORCE_DRAFT',
      `Admin Force Draft: ${player.name} to ${targetTeam.name} for ${formatLakhs(price)} [Reason: ${reason}]`,
      'player',
      (curr) => {
        const slotCode = assignSlotCode(targetTeam, player);
        const updatedPlayers = curr.players.map((p) =>
          p.id === playerId
            ? {
                ...p,
                status: 'sold' as const,
                winningBid: price,
                winningTeamId: targetTeam.id,
                slotCode,
                soldTimestamp: new Date().toISOString(),
                notes: `Force drafted: ${reason}`,
              }
            : p
        );

        let updatedTeams = curr.teams.map((t) => {
          // If player was previously owned by a different team, refund that team
          if (previousOwnerId && t.id === previousOwnerId && t.id !== targetTeam.id) {
            const draftedEntry = t.draftedPlayers.find((dp) => dp.playerId === playerId);
            const refund = draftedEntry ? draftedEntry.price : (player.winningBid || 0);
            return {
              ...t,
              remainingPurse: t.remainingPurse + refund,
              creditsSpent: Math.max(0, t.creditsSpent - refund),
              draftedPlayers: t.draftedPlayers.filter((dp) => dp.playerId !== playerId),
            };
          }

          if (t.id === targetTeam.id) {
            // Remove previous copy if already in this team
            const filteredRoster = t.draftedPlayers.filter((dp) => dp.playerId !== playerId);
            return {
              ...t,
              remainingPurse: t.remainingPurse - price,
              creditsSpent: t.creditsSpent + price,
              draftedPlayers: [
                ...filteredRoster,
                {
                  playerId: player.id,
                  playerName: player.name,
                  price,
                  position: player.position,
                  slotCode,
                  timestamp: new Date().toISOString(),
                  round: player.round,
                },
              ],
            };
          }
          return t;
        });

        const nextPendingIdx = findNextPendingPlayerIndex(updatedPlayers, curr.queueIndex);
        const isCompleted = nextPendingIdx === -1;
        const nextPlayer = nextPendingIdx !== -1 ? updatedPlayers[nextPendingIdx] : null;

        return {
          players: updatedPlayers,
          teams: updatedTeams,
          queueIndex: nextPendingIdx !== -1 ? nextPendingIdx : curr.queueIndex,
          currentBidAmount: nextPlayer ? nextPlayer.basePrice : curr.config.nonClubBasePrice,
          leadingTeamId: null,
          recentBids: [],
          isAuctionCompleted: isCompleted,
        };
      },
      { entityId: player.id, entityName: player.name }
    );

    showNotice(`Admin force-drafted ${player.name} to ${targetTeam.name}.`, 'success');
    return true;
  }, [state.players, state.teams, state.config, commitTransaction, showNotice]);

  const overridePrice = useCallback((playerId: string, newPrice: number) => {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) return;

    commitTransaction(
      'PRICE_OVERRIDE',
      `Admin Base Price Override on ${player.name}: ${formatLakhs(newPrice)}`,
      'player',
      (curr) => ({
        players: curr.players.map((p) => (p.id === playerId ? { ...p, basePrice: newPrice } : p)),
        currentBidAmount: curr.players[curr.queueIndex]?.id === playerId ? newPrice : curr.currentBidAmount,
      }),
      { entityId: player.id, entityName: player.name }
    );
    showNotice(`Base price for ${player.name} set to ${formatLakhs(newPrice)}.`, 'success');
  }, [state.players, commitTransaction, showNotice]);

  const jumpToPlayer = useCallback((index: number) => {
    if (index < 0 || index >= state.players.length) return;
    const target = state.players[index];

    commitTransaction(
      'QUEUE_REORDERED',
      `Jumped queue cursor to Lot #${index + 1}: ${target.name}`,
      'player',
      () => ({
        queueIndex: index,
        currentBidAmount: target.basePrice,
        leadingTeamId: null,
        recentBids: [],
      })
    );
    showNotice(`Active lot set to #${index + 1}: ${target.name}`, 'info');
  }, [state.players, commitTransaction, showNotice]);

  const shuffleRemainingQueue = useCallback(() => {
    commitTransaction(
      'QUEUE_REORDERED',
      'Shuffled all remaining pending athletes',
      'bulk',
      (curr) => {
        const finished = curr.players.filter((p) => p.status !== 'pending');
        const pending = curr.players.filter((p) => p.status === 'pending');

        for (let i = pending.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pending[i], pending[j]] = [pending[j], pending[i]];
        }

        const reordered = [...finished, ...pending];
        const newQueueIdx = reordered.findIndex((p) => p.status === 'pending');
        const nextPlayer = newQueueIdx !== -1 ? reordered[newQueueIdx] : null;

        return {
          players: reordered,
          queueIndex: newQueueIdx !== -1 ? newQueueIdx : 0,
          currentBidAmount: nextPlayer ? nextPlayer.basePrice : curr.config.nonClubBasePrice,
          leadingTeamId: null,
          recentBids: [],
        };
      }
    );
    showNotice('Remaining queue shuffled successfully.', 'info');
  }, [commitTransaction, showNotice]);

  // Reconciled Team Purse Adjustments: Keeps startingPurse, remainingPurse, and creditsSpent balanced
  const adjustTeamPurse = useCallback((teamId: string, newPurse: number, reason: string) => {
    if (newPurse < 0 || isNaN(newPurse)) {
      showNotice('Cannot adjust purse: Team purse cannot be negative.', 'error');
      return;
    }

    const team = state.teams.find((t) => t.id === teamId);
    if (!team) return;

    commitTransaction(
      'PURSE_ADJUSTED',
      `Adjusted purse for ${team.name} to ${formatLakhs(newPurse)} [Reason: ${reason}]`,
      'team',
      (curr) => ({
        teams: curr.teams.map((t) => {
          if (t.id === teamId) {
            return {
              ...t,
              remainingPurse: newPurse,
              startingPurse: newPurse + t.creditsSpent, // Reconciles total budget so startingPurse - creditsSpent == remainingPurse!
            };
          }
          return t;
        }),
      }),
      { entityId: team.id, entityName: team.name }
    );
    showNotice(`Purse for ${team.name} adjusted to ${formatLakhs(newPurse)}.`, 'success');
  }, [state.teams, commitTransaction, showNotice]);

  const toggleStrictRules = useCallback(() => {
    setState((prev) => {
      const nextVal = !prev.isStrictRulesEnforced;
      showNotice(`Strict budget rules ${nextVal ? 'enabled' : 'disabled'}.`, 'info');
      return {
        ...prev,
        isStrictRulesEnforced: nextVal,
      };
    });
  }, [showNotice]);

  const toggleAudioMute = useCallback(() => {
    setState((prev) => {
      const nextMuted = !prev.isAudioMuted;
      audioEngine.setMuted(nextMuted);
      return { ...prev, isAudioMuted: nextMuted };
    });
  }, []);

  const setTheme = useCallback((theme: VisualTheme) => {
    setState((prev) => ({ ...prev, activeTheme: theme }));
  }, []);

  const toggleColorMode = useCallback(() => {
    setState((prev) => ({
      ...prev,
      colorMode: prev.colorMode === 'dark' ? 'light' : 'dark',
    }));
  }, []);

  const setColorMode = useCallback((mode: ColorMode) => {
    setState((prev) => ({ ...prev, colorMode: mode }));
  }, []);

  // Completion check: Verifies no unresolved pending players
  const finalizeAuction = useCallback((): boolean => {
    const pendingCount = state.players.filter((p) => p.status === 'pending').length;
    if (pendingCount > 0) {
      showNotice(`Warning: There are still ${pendingCount} unresolved athletes in queue. Please finish bidding or pass them before finalization.`, 'error');
      return false;
    }

    commitTransaction(
      'AUCTION_FINALIZED',
      'Auction officially finalized by Tournament Director',
      'auction',
      () => ({ isAuctionCompleted: true })
    );
    showNotice('Tournament auction officially finalized!', 'success');
    return true;
  }, [state.players, commitTransaction, showNotice]);

  const reopenAuction = useCallback(() => {
    commitTransaction(
      'CONFIG_UPDATED',
      'Auction reopened for additional bidding',
      'auction',
      () => ({ isAuctionCompleted: false })
    );
    showNotice('Auction reopened.', 'info');
  }, [commitTransaction, showNotice]);

  // Complete Reset to Scratch: Only removes own app storage key!
  const resetToScratch = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error(e);
    }
    const fresh = createInitialState();
    setState(fresh);
    setLastActionMessage('Auction completely reset to scratch.');
    audioEngine.playSoftClick();
    showNotice('Auction completely reset to scratch. Ready for new tournament setup.', 'info');
  }, [showNotice]);

  const resetToFresh = useCallback(() => {
    resetToScratch();
  }, [resetToScratch]);

  // Download complete JSON backup
  const downloadJSONBackup = useCallback(() => {
    const jsonStr = JSON.stringify(state, null, 2);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadFile(`iiit_trichy_auction_backup_${dateStr}.json`, jsonStr, 'application/json');
    showNotice('Auction backup downloaded successfully.', 'success');
  }, [state, showNotice]);

  // Safe restoration with schema validation
  const restoreStateFromJSON = useCallback((restored: AuctionSessionState): boolean => {
    if (!restored || !restored.config || !Array.isArray(restored.teams) || !Array.isArray(restored.players)) {
      showNotice('Invalid backup file: Missing required tournament configuration or rosters.', 'error');
      return false;
    }

    setState({
      ...createInitialState(),
      ...restored,
      isStrictRulesEnforced: restored.isStrictRulesEnforced !== undefined ? restored.isStrictRulesEnforced : true,
    });
    showNotice('Auction state successfully restored from backup file.', 'success');
    return true;
  }, [showNotice]);

  return (
    <AuctionContext.Provider
      value={{
        state,
        activePlayer,
        leadingTeam,
        auctionNotice,
        dismissNotice,
        showNotice,
        placeBid,
        sellCurrentPlayer,
        markPlayerUnsold,
        passCurrentPlayer,
        toggleStrictRules,
        toggleAudioMute,
        setTheme,
        toggleColorMode,
        setColorMode,
        updatePlayerPhoto,
        startRound2,
        movePlayerToRound2,
        injectGlobalPurseBonus,
        expandSquadLimits,
        undo,
        redo,
        canUndo: state.undoStack.length > 0,
        canRedo: state.redoStack.length > 0,
        lastActionMessage,
        updateTournamentConfig,
        setupTournament,
        setTeams,
        importPlayersToQueue,
        loadExactCandidates,
        loadSampleCandidates,
        forceDraftPlayer,
        overridePrice,
        jumpToPlayer,
        shuffleRemainingQueue,
        adjustTeamPurse,
        finalizeAuction,
        reopenAuction,
        resetToFresh,
        resetToScratch,
        downloadJSONBackup,
        restoreStateFromJSON,
      }}
    >
      {children}
    </AuctionContext.Provider>
  );
};

export const useAuction = (): AuctionContextType => {
  const context = useContext(AuctionContext);
  if (!context) {
    throw new Error('useAuction must be used within an AuctionProvider');
  }
  return context;
};
