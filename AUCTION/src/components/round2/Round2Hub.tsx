import React, { useState } from 'react';
import { 
  RefreshCw, 
  Users, 
  Sparkles, 
  ArrowRight, 
  Percent, 
  CheckCircle, 
  AlertCircle,
  Coins,
  ShieldAlert
} from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { formatLakhs } from '../../utils/csvParser';
import { AthletePhoto } from '../common/AthletePhoto';

interface Round2HubProps {
  onProceedToStage: () => void;
}

export const Round2Hub: React.FC<Round2HubProps> = ({ onProceedToStage }) => {
  const { 
    state, 
    startRound2, 
    movePlayerToRound2, 
    injectGlobalPurseBonus, 
    expandSquadLimits, 
    showNotice 
  } = useAuction();

  const [selectedDiscount, setSelectedDiscount] = useState<number>(0);
  const [customBasePrices, setCustomBasePrices] = useState<Record<string, number>>({});

  // Round 2 Stimulus & Rule Modifiers state
  const [isStimulusEnabled, setIsStimulusEnabled] = useState<boolean>(true);
  const [stimulusAmount, setStimulusAmount] = useState<number>(1000000); // 10 Lakhs default
  const [additionalSquadSlots, setAdditionalSquadSlots] = useState<number>(2); // +2 slots default

  const isLight = state.colorMode === 'light';

  const unsoldPlayers = state.players.filter(
    (p) => p.status === 'unsold' || p.status === 'passed'
  );
  const soldPlayers = state.players.filter((p) => p.status === 'sold');
  const pendingPlayers = state.players.filter((p) => p.status === 'pending');
  const round2Players = state.players.filter((p) => p.round === 2);

  const handleStartRound2 = () => {
    if (unsoldPlayers.length === 0) {
      showNotice('There are no unsold athletes to move to Round 2.', 'info');
      return;
    }

    // Step 3: Execute modifiers synchronously right before pushing athletes to the queue
    if (isStimulusEnabled && stimulusAmount > 0) {
      injectGlobalPurseBonus(stimulusAmount);
    }

    if (additionalSquadSlots > 0) {
      expandSquadLimits(additionalSquadSlots);
    }

    startRound2(selectedDiscount);
    onProceedToStage();
  };

  const handleIndividualPush = (playerId: string) => {
    const player = unsoldPlayers.find((p) => p.id === playerId);
    const discountedBase = selectedDiscount > 0 && player
      ? Math.max(50000, Math.round(player.basePrice * (1 - selectedDiscount / 100)))
      : player?.basePrice;
    const customPrice = customBasePrices[playerId] !== undefined ? customBasePrices[playerId] : discountedBase;
    movePlayerToRound2(playerId, customPrice);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      
      {/* Header */}
      <div className={`pb-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
        isLight ? 'border-slate-200' : 'border-slate-800'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30">
              ACCELERATED RE-BIDDING
            </span>
            <span className="text-xs font-mono text-slate-400">
              Active Round: <strong className={isLight ? 'text-slate-900' : 'text-white'}>Round {state.activeRound}</strong>
            </span>
          </div>
          <h1 className={`font-display font-black text-2xl sm:text-3xl mt-1 tracking-tight ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            Round 2 Accelerated Auction Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Re-engage athletes who passed or went unsold during Round 1. Adjust base valuations, apply pool-wide discounts, and relaunch them onto the live stage screen.
          </p>
        </div>

        {unsoldPlayers.length > 0 && (
          <button
            onClick={handleStartRound2}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Launch Round 2 ({unsoldPlayers.length} Athletes)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900/80 border-slate-800'
        }`}>
          <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>Total Registered</span>
          </div>
          <div className={`font-mono-numbers text-2xl font-black mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {state.players.length}
          </div>
        </div>

        <div className={`p-4 rounded-xl border ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900/80 border-slate-800'
        }`}>
          <div className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Sold (Round 1 & 2)</span>
          </div>
          <div className="font-mono-numbers text-2xl font-black text-emerald-400 mt-1">
            {soldPlayers.length}
          </div>
        </div>

        <div className={`p-4 rounded-xl border ${
          isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-950/20 border-amber-800/40'
        }`}>
          <div className="text-xs font-mono text-amber-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Unsold / Passed</span>
          </div>
          <div className="font-mono-numbers text-2xl font-black text-amber-400 mt-1">
            {unsoldPlayers.length}
          </div>
        </div>

        <div className={`p-4 rounded-xl border ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900/80 border-slate-800'
        }`}>
          <div className="text-xs font-mono text-purple-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Round 2 Pool</span>
          </div>
          <div className="font-mono-numbers text-2xl font-black text-purple-400 mt-1">
            {round2Players.length}
          </div>
        </div>
      </div>

      {/* Round 2 Global Launcher Box */}
      {unsoldPlayers.length > 0 ? (
        <div className={`p-6 rounded-2xl border ${
          isLight ? 'bg-white border-slate-200 shadow-md' : 'bg-slate-900/90 border-slate-800 shadow-xl'
        }`}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-4 mb-4 border-slate-800/60">
            <div>
              <h3 className={`font-display font-bold text-lg flex items-center gap-2 ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                <Sparkles className="w-5 h-5 text-amber-400" />
                Bulk Round 2 Configuration
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Choose a pricing strategy for the {unsoldPlayers.length} athletes re-entering the bidding stage.
              </p>
            </div>

            {/* Discount selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">Base Price Adjustment:</span>
              <div className="flex items-center rounded-lg bg-slate-950 border border-slate-800 p-1">
                <button
                  onClick={() => setSelectedDiscount(0)}
                  className={`px-3 py-1 rounded text-xs font-mono font-bold transition-colors ${
                    selectedDiscount === 0
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Original Price
                </button>
                <button
                  onClick={() => setSelectedDiscount(20)}
                  className={`px-3 py-1 rounded text-xs font-mono font-bold transition-colors ${
                    selectedDiscount === 20
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  20% Discount
                </button>
                <button
                  onClick={() => setSelectedDiscount(50)}
                  className={`px-3 py-1 rounded text-xs font-mono font-bold transition-colors ${
                    selectedDiscount === 50
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  50% Discount
                </button>
              </div>
            </div>
          </div>

          {/* Round 2 Stimulus & Rule Modifiers */}
          <div className={`p-4 rounded-xl border mb-5 space-y-3 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5" />
                Round 2 Stimulus & Rule Modifiers
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Phase 2 Rules Configurator
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Modifier 1: 10 Lakh Purse Stimulus Toggle */}
              <div className={`p-3 rounded-lg border flex flex-col justify-between space-y-2.5 ${
                isStimulusEnabled 
                  ? 'border-emerald-500/40 bg-emerald-500/5' 
                  : isLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900/50'
              }`}>
                <div className="flex items-start justify-between gap-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isStimulusEnabled}
                      onChange={(e) => setIsStimulusEnabled(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                    />
                    <div>
                      <span className={`text-xs font-bold block ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        Inject Purse Stimulus to All Teams
                      </span>
                      <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                        Guarantees competitive bidding in Round 2 by giving each franchise extra budget.
                      </p>
                    </div>
                  </label>
                </div>

                {isStimulusEnabled && (
                  <div className="flex items-center gap-2 pl-6 pt-1">
                    <span className="text-[11px] font-mono text-slate-400">Bonus:</span>
                    <select
                      value={stimulusAmount}
                      onChange={(e) => setStimulusAmount(Number(e.target.value))}
                      className={`text-xs font-mono font-bold rounded-lg px-2.5 py-1 border ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700 text-emerald-400'
                      }`}
                    >
                      <option value={500000}>+₹5.00 Lakhs (+500k)</option>
                      <option value={1000000}>+₹10.00 Lakhs (+10L Default)</option>
                      <option value={1500000}>+₹15.00 Lakhs (+15L)</option>
                      <option value={2000000}>+₹20.00 Lakhs (+20L)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Modifier 2: Squad Cap Expansion Dropdown */}
              <div className={`p-3 rounded-lg border flex flex-col justify-between space-y-2.5 ${
                additionalSquadSlots > 0 
                  ? 'border-cyan-500/40 bg-cyan-500/5' 
                  : isLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900/50'
              }`}>
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      Extend Max Squad Capacity
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      Cap: {state.config.maxSquadSize} &rarr; {state.config.maxSquadSize + additionalSquadSlots}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                    Expands roster limits without removing caps, preventing player lockouts while curbing hoarding.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] font-mono text-slate-400">Additional Slots:</span>
                  <div className="flex items-center rounded-lg bg-slate-950 border border-slate-800 p-0.5">
                    {[0, 1, 2, 3, 4].map((slots) => (
                      <button
                        key={slots}
                        type="button"
                        onClick={() => setAdditionalSquadSlots(slots)}
                        className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold transition-colors cursor-pointer ${
                          additionalSquadSlots === slots
                            ? 'bg-cyan-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        +{slots}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
            <div className="text-xs font-mono text-slate-400">
              When triggered, modifiers will be committed to the audit log, and all {unsoldPlayers.length} unsold athletes will be re-queued with the <span className="text-amber-400 font-bold">ROUND 2</span> badge.
            </div>

            <button
              onClick={handleStartRound2}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <span>Begin Round 2 Bidding Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className={`p-8 rounded-2xl border text-center ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-900/40 border-slate-800/80'
        }`}>
          <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
          <h3 className={`font-display font-bold text-lg ${isLight ? 'text-slate-800' : 'text-white'}`}>
            No Unsold Athletes Currently Pending
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            {pendingPlayers.length > 0 
              ? `There are still ${pendingPlayers.length} pending players in the live queue. Any players passed or marked unsold during stage bidding will automatically gather here.`
              : 'All registered candidates have been sold to teams or no players have been imported yet.'}
          </p>
          <div className="mt-4">
            <button
              onClick={onProceedToStage}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
            >
              <span>Return to Stage Screen</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Individual Athlete Cards for Unsold Pool */}
      {unsoldPlayers.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className={`font-display font-bold text-lg ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Unsold Candidate Roster ({unsoldPlayers.length})
            </h2>
            <span className="text-xs font-mono text-slate-400">
              Customize individual valuations before re-queuing
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unsoldPlayers.map((player) => {
              const discountedBase = selectedDiscount > 0
                ? Math.max(50000, Math.round(player.basePrice * (1 - selectedDiscount / 100)))
                : player.basePrice;
              const currentVal = customBasePrices[player.id] !== undefined 
                ? customBasePrices[player.id] 
                : discountedBase;

              return (
                <div
                  key={player.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                    isLight 
                      ? 'bg-white border-slate-200 hover:border-slate-300 shadow-sm' 
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <AthletePhoto
                      photoUrl={player.photoUrl}
                      name={player.name}
                      position={player.position}
                      year={player.year}
                      isClub={player.isClub}
                      className="w-12 h-12 rounded-xl shrink-0 border border-slate-700 overflow-hidden"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                          player.isClub ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {player.tier}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          {player.positionLabel}
                        </span>
                      </div>
                      <h4 className={`font-display font-bold text-base truncate mt-0.5 ${
                        isLight ? 'text-slate-900' : 'text-white'
                      }`}>
                        {player.name}
                      </h4>
                      <p className="text-xs font-mono text-slate-400">{player.year}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">Original Base:</span>
                      <span className="font-bold text-slate-300">{formatLakhs(player.basePrice)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">
                          Round 2 Valuation:
                        </label>
                        <input
                          type="number"
                          step={50000}
                          value={currentVal}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setCustomBasePrices({
                              ...customBasePrices,
                              [player.id]: isNaN(val) ? 0 : val,
                            });
                          }}
                          className={`w-full px-2.5 py-1.5 rounded text-xs font-mono border ${
                            isLight 
                              ? 'bg-slate-50 border-slate-300 text-slate-900' 
                              : 'bg-slate-950 border-slate-700 text-white'
                          }`}
                        />
                      </div>
                      <button
                        onClick={() => handleIndividualPush(player.id)}
                        className="mt-4 px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono transition-colors cursor-pointer"
                        title="Re-queue this athlete immediately"
                      >
                        Push to Stage
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
