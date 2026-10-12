import { TournamentConfig, Team, Player } from '../types/auction';
import { formatLakhs } from './csvParser';

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  maxAffordableBid?: number;
}

/**
 * Validates whether a team is eligible to place a bid on a player
 */
export function validateBid(
  team: Team,
  player: Player,
  bidAmount: number,
  config: TournamentConfig,
  isStrict: boolean = true,
  currentLeadingTeamId?: string | null
): ValidationResult {
  // 0. Prevent team outbidding itself
  if (currentLeadingTeamId && currentLeadingTeamId === team.id) {
    return {
      isValid: false,
      reason: `Team "${team.name}" already holds the highest leading bid on this athlete.`,
    };
  }

  // 1. Team status check (only block if explicitly Draft/Suspended)
  if (team.status && team.status === 'Draft') {
    return {
      isValid: false,
      reason: `Team "${team.name}" is in Draft status and cannot place bids until approved.`,
    };
  }

  // 2. Max squad capacity check
  if (team.draftedPlayers && team.draftedPlayers.length >= config.maxSquadSize) {
    return {
      isValid: false,
      reason: `Team "${team.name}" has reached the maximum squad limit of ${config.maxSquadSize} players.`,
    };
  }

  // 3. Positional slot capacity check (case-insensitive)
  const slotDef = config.slots.find(
    (s) =>
      s.codePrefix.toUpperCase() === player.position.toUpperCase() ||
      s.name.toLowerCase() === player.position.toLowerCase() ||
      (player.positionLabel && s.name.toLowerCase() === player.positionLabel.toLowerCase())
  );
  if (slotDef) {
    const currentInPosition = team.draftedPlayers.filter(
      (p) => p.position.toUpperCase() === slotDef.codePrefix.toUpperCase()
    ).length;
    if (currentInPosition >= slotDef.maxCount) {
      return {
        isValid: false,
        reason: `Team "${team.name}" has filled all ${slotDef.maxCount} ${slotDef.name} (${slotDef.codePrefix}) slots.`,
      };
    }
  }

  // 4. Absolute purse balance check
  if (bidAmount > team.remainingPurse) {
    return {
      isValid: false,
      reason: `Bid of ${formatLakhs(bidAmount)} exceeds team's remaining purse (${formatLakhs(team.remainingPurse)}).`,
    };
  }

  // 5. Minimum squad reserve budget check (enforced in strict mode)
  if (isStrict) {
    const currentCount = team.draftedPlayers ? team.draftedPlayers.length : 0;
    const playersAfterThis = currentCount + 1;
    const remainingNeededForMin = Math.max(0, config.minSquadSize - playersAfterThis);
    
    if (remainingNeededForMin > 0) {
      const minBasePrice = Math.max(0, Math.min(config.clubBasePrice, config.nonClubBasePrice));
      const reserveNeeded = remainingNeededForMin * minBasePrice;
      const maxAffordable = team.remainingPurse - reserveNeeded;

      // If team's remaining funds have fallen below nominal minimum squad reserve (e.g. via admin purse adjustments or manual penalties),
      // allow them to spend their remaining purse on available players rather than locking them out completely
      if (team.remainingPurse <= reserveNeeded) {
        return { isValid: true, maxAffordableBid: team.remainingPurse };
      }

      if (bidAmount > maxAffordable) {
        return {
          isValid: false,
          reason: `Bid leaves insufficient reserve to fulfill minimum squad (${config.minSquadSize} players). Requires ${formatLakhs(reserveNeeded)} reserve for ${remainingNeededForMin} more player(s). Max allowed bid is ${formatLakhs(Math.max(0, maxAffordable))}.`,
          maxAffordableBid: Math.max(0, maxAffordable),
        };
      }
    }
  }

  return { isValid: true, maxAffordableBid: Math.max(0, team.remainingPurse) };
}

/**
 * Computes squad completion and financial metrics for a team
 */
export function getTeamMetrics(team: Team, config: TournamentConfig) {
  const currentCount = team.draftedPlayers ? team.draftedPlayers.length : 0;
  const isMinMet = currentCount >= config.minSquadSize;
  const isFull = currentCount >= config.maxSquadSize;
  const percentPurseSpent =
    team.startingPurse > 0 ? Math.round((team.creditsSpent / team.startingPurse) * 100) : 0;

  const positionalCounts = config.slots.map((s) => {
    const count = team.draftedPlayers
      ? team.draftedPlayers.filter((p) => p.position.toUpperCase() === s.codePrefix.toUpperCase()).length
      : 0;
    return {
      code: s.codePrefix,
      name: s.name,
      count,
      max: s.maxCount,
      isFull: count >= s.maxCount,
    };
  });

  return {
    currentCount,
    minSquadSize: config.minSquadSize,
    maxSquadSize: config.maxSquadSize,
    isMinMet,
    isFull,
    percentPurseSpent,
    positionalCounts,
  };
}

/**
 * Assigns next available slot code for a drafted player collision-free
 */
export function assignSlotCode(team: Team, player: Player): string {
  const prefix = (player.position || 'ATH').toUpperCase();
  const takenCodes = new Set(
    (team.draftedPlayers || []).map((p) => (p.slotCode || '').toUpperCase())
  );
  let slotNumber = 1;
  while (takenCodes.has(`${prefix}${slotNumber}`)) {
    slotNumber++;
  }
  return `${prefix}${slotNumber}`;
}
