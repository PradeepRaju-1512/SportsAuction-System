/**
 * IIIT Trichy - Sports Auction Data Models
 */

export type ColorMode = 'dark' | 'light';

export type VisualTheme = 
  | 'stadium-blue' 
  | 'crimson-arena' 
  | 'cyber-neon' 
  | 'emerald-championship' 
  | 'midnight-contrast';

export interface PositionalSlotConfig {
  codePrefix: string;       // e.g. "SET", "SPK", "LIB"
  name: string;             // e.g. "Setter", "Spiker", "Libero"
  maxCount: number;         // Max allowed per team squad
  aliasKeywords: string[];  // Normalized keywords
}

export interface TournamentConfig {
  tournamentName: string;
  startingPurse: number;
  minSquadSize: number;
  maxSquadSize: number;
  clubBasePrice: number;
  nonClubBasePrice: number;
  slots: PositionalSlotConfig[];
  isConfigured: boolean;
}

export interface Player {
  id: string;
  name: string;
  year: string;
  isClub: boolean;
  tier: 'Club' | 'Non-Club';
  position: string;
  positionLabel: string;
  basePrice: number;
  photoUrl: string;
  rawPhotoUrl?: string;
  status: 'pending' | 'sold' | 'unsold' | 'passed';
  round: 1 | 2;
  winningBid?: number;
  winningTeamId?: string;
  slotCode?: string;
  soldTimestamp?: string;
  attemptsCount: number;
  notes?: string;
  rollNumber?: string;
}

export interface DraftedPlayerSlot {
  playerId: string;
  playerName: string;
  price: number;
  position: string;
  slotCode: string;
  timestamp: string;
  round: 1 | 2;
  rollNumber?: string;
}

export interface Team {
  id: string;
  name: string;
  captainName: string;
  startingPurse: number;
  remainingPurse: number;
  creditsSpent: number;
  teamColor: string;
  logoUrl?: string;
  status: 'Approved' | 'Draft';
  draftedPlayers: DraftedPlayerSlot[];
}

export interface BidRecord {
  id: string;
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  amount: number;
  increment: number;
  timestamp: string;
}

export type ActionType =
  | 'BID_PLACED'
  | 'PLAYER_SOLD'
  | 'PLAYER_UNSOLD'
  | 'PLAYER_PASSED'
  | 'PLAYER_RETURNED_TO_QUEUE'
  | 'FORCE_DRAFT'
  | 'PRICE_OVERRIDE'
  | 'PLAYERS_IMPORTED'
  | 'TEAM_CREATED'
  | 'TEAM_UPDATED'
  | 'TEAM_DELETED'
  | 'PURSE_ADJUSTED'
  | 'QUEUE_REORDERED'
  | 'CONFIG_UPDATED'
  | 'ROUND_2_STARTED'
  | 'AUCTION_FINALIZED'
  | 'AUCTION_RESET'
  | 'UNDO_OPERATION'
  | 'REDO_OPERATION';

export interface AuditTransaction {
  id: string;
  timestamp: string;
  actionType: ActionType;
  operator: string;
  entityType: 'player' | 'team' | 'bid' | 'auction' | 'config' | 'bulk';
  entityId?: string;
  entityName?: string;
  description: string;
  previousSnapshot: any;
  resultingSnapshot: any;
  isUndone?: boolean;
  linkedTransactionId?: string;
}

export interface GoogleFormColumnMapping {
  timestampCol?: string;
  nameCol: string;
  yearCol: string;
  clubCol: string;
  positionCol: string;
  photoCol: string;
  rollNumberCol?: string;
}

export interface AuctionSessionState {
  config: TournamentConfig;
  teams: Team[];
  players: Player[];
  queueIndex: number;
  currentBidAmount: number;
  leadingTeamId: string | null;
  activeRound: 1 | 2;
  isStrictRulesEnforced: boolean;
  isAuctionCompleted: boolean;
  recentBids: BidRecord[];
  transactions: AuditTransaction[];
  undoStack: string[];
  redoStack: string[];
  activeTheme: VisualTheme;
  colorMode: ColorMode;
  isAudioMuted: boolean;
  lastUpdated: string;
}
