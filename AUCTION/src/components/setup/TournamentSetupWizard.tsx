import React, { useState } from 'react';
import { 
  Trophy, 
  Plus, 
  Trash2, 
  Coins, 
  Layers, 
  Users, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { TournamentConfig, PositionalSlotConfig, Team } from '../../types/auction';
import { formatLakhs } from '../../utils/csvParser';

interface TournamentSetupWizardProps {
  onComplete: () => void;
}

export const TournamentSetupWizard: React.FC<TournamentSetupWizardProps> = ({ onComplete }) => {
  const { state, setupTournament, showNotice, resetToScratch } = useAuction();

  const [tournamentName, setTournamentName] = useState(state.config.tournamentName);
  const [startingPurse, setStartingPurse] = useState(state.config.startingPurse);
  const [minSquadSize, setMinSquadSize] = useState(state.config.minSquadSize);
  const [maxSquadSize, setMaxSquadSize] = useState(state.config.maxSquadSize);
  const [clubBasePrice, setClubBasePrice] = useState(state.config.clubBasePrice);
  const [nonClubBasePrice, setNonClubBasePrice] = useState(state.config.nonClubBasePrice);

  const [slots, setSlots] = useState<PositionalSlotConfig[]>(state.config.slots);
  const [teams, setTeams] = useState<Team[]>(state.teams);

  // New slot inputs
  const [newSlotPrefix, setNewSlotPrefix] = useState('');
  const [newSlotName, setNewSlotName] = useState('');
  const [newSlotMax, setNewSlotMax] = useState(3);

  // New team inputs
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamCaptain, setNewTeamCaptain] = useState('');
  const [newTeamColor, setNewTeamColor] = useState('#3B82F6');

  const isLight = state.colorMode === 'light';

  // Quick preset fills in Lakhs
  const applyPresetSlots = (type: 'volleyball' | 'cricket' | 'football' | 'kabaddi') => {
    switch (type) {
      case 'volleyball':
        setTournamentName('IIIT Trichy Volleyball Premier League');
        setSlots([
          { codePrefix: 'SET', name: 'Setter', maxCount: 2, aliasKeywords: ['setter', 'set', 's'] },
          { codePrefix: 'SPK', name: 'Spiker', maxCount: 3, aliasKeywords: ['spiker', 'spk', 'attacker'] },
          { codePrefix: 'LIB', name: 'Libero', maxCount: 5, aliasKeywords: ['libero', 'lib', 'defender'] },
        ]);
        setMinSquadSize(7);
        setMaxSquadSize(10);
        setStartingPurse(2500000); // 25 Lakhs
        setClubBasePrice(250000);  // 2.5 Lakhs
        setNonClubBasePrice(100000); // 1 Lakh
        break;
      case 'cricket':
        setTournamentName('IIIT Trichy Cricket Championship');
        setSlots([
          { codePrefix: 'BAT', name: 'Batsman', maxCount: 4, aliasKeywords: ['batsman', 'bat', 'batter'] },
          { codePrefix: 'BOWL', name: 'Bowler', maxCount: 4, aliasKeywords: ['bowler', 'bowl', 'pacer', 'spinner'] },
          { codePrefix: 'AR', name: 'All-Rounder', maxCount: 3, aliasKeywords: ['all-rounder', 'ar'] },
          { codePrefix: 'WK', name: 'Wicketkeeper', maxCount: 2, aliasKeywords: ['wicketkeeper', 'wk', 'keeper'] },
        ]);
        setMinSquadSize(11);
        setMaxSquadSize(15);
        setStartingPurse(5000000); // 50 Lakhs
        setClubBasePrice(500000);  // 5 Lakhs
        setNonClubBasePrice(200000); // 2 Lakhs
        break;
      case 'football':
        setTournamentName('IIIT Trichy Football League');
        setSlots([
          { codePrefix: 'GK', name: 'Goalkeeper', maxCount: 2, aliasKeywords: ['goalkeeper', 'gk', 'keeper'] },
          { codePrefix: 'DEF', name: 'Defender', maxCount: 5, aliasKeywords: ['defender', 'def', 'cb'] },
          { codePrefix: 'MID', name: 'Midfielder', maxCount: 5, aliasKeywords: ['midfielder', 'mid', 'cm'] },
          { codePrefix: 'FWD', name: 'Forward', maxCount: 4, aliasKeywords: ['forward', 'fwd', 'striker'] },
        ]);
        setMinSquadSize(11);
        setMaxSquadSize(18);
        setStartingPurse(5000000); // 50 Lakhs
        setClubBasePrice(500000);  // 5 Lakhs
        setNonClubBasePrice(200000); // 2 Lakhs
        break;
      case 'kabaddi':
        setTournamentName('IIIT Trichy Kabaddi Cup');
        setSlots([
          { codePrefix: 'RAID', name: 'Raider', maxCount: 4, aliasKeywords: ['raider', 'raid'] },
          { codePrefix: 'DEF', name: 'Defender', maxCount: 4, aliasKeywords: ['defender', 'def'] },
          { codePrefix: 'AR', name: 'All-Rounder', maxCount: 4, aliasKeywords: ['all-rounder', 'ar'] },
        ]);
        setMinSquadSize(7);
        setMaxSquadSize(12);
        setStartingPurse(2000000); // 20 Lakhs
        setClubBasePrice(200000);  // 2 Lakhs
        setNonClubBasePrice(100000); // 1 Lakh
        break;
    }
  };

  const handleAddSlot = () => {
    if (!newSlotPrefix.trim() || !newSlotName.trim()) return;
    const prefix = newSlotPrefix.trim().toUpperCase();
    setSlots([
      ...slots,
      {
        codePrefix: prefix,
        name: newSlotName.trim(),
        maxCount: Math.max(1, newSlotMax),
        aliasKeywords: [prefix.toLowerCase(), newSlotName.trim().toLowerCase()],
      },
    ]);
    setNewSlotPrefix('');
    setNewSlotName('');
    setNewSlotMax(3);
  };

  const handleRemoveSlot = (prefix: string) => {
    setSlots(slots.filter((s) => s.codePrefix !== prefix));
  };

  const handleAddTeam = () => {
    if (!newTeamName.trim()) return;
    const id = `team-${Date.now()}`;
    setTeams([
      ...teams,
      {
        id,
        name: newTeamName.trim(),
        captainName: newTeamCaptain.trim() || 'Captain',
        startingPurse,
        remainingPurse: startingPurse,
        creditsSpent: 0,
        teamColor: newTeamColor,
        status: 'Approved',
        draftedPlayers: [],
      },
    ]);
    setNewTeamName('');
    setNewTeamCaptain('');
  };

  const handleRemoveTeam = (id: string) => {
    setTeams(teams.filter((t) => t.id !== id));
  };

  const handleLoadSampleTeams = () => {
    const sampleColors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#F97316'];
    const sampleNames = ['Trichy Titans', 'Cauvery Kings', 'Rockfort Strikers', 'Delta Warriors', 'Solar Blasters', 'Emerald Eagles'];
    const sampleCaps = ['Alex Vance', 'Elena Rostova', 'Marcus Chen', 'Samantha Ray', 'David Kim', 'Priya Sharma'];

    const newTeamList: Team[] = sampleNames.map((name, i) => ({
      id: `team-${i + 1}`,
      name,
      captainName: sampleCaps[i],
      startingPurse,
      remainingPurse: startingPurse,
      creditsSpent: 0,
      teamColor: sampleColors[i],
      status: 'Approved',
      draftedPlayers: [],
    }));

    setTeams(newTeamList);
  };

  const handleSaveAndStart = () => {
    if (slots.length === 0) {
      showNotice('Please add at least one positional slot.', 'error');
      return;
    }
    if (teams.length < 2) {
      showNotice('Please configure at least 2 teams.', 'error');
      return;
    }

    const config: TournamentConfig = {
      tournamentName,
      startingPurse,
      minSquadSize,
      maxSquadSize,
      clubBasePrice,
      nonClubBasePrice,
      slots,
      isConfigured: true,
    };

    const updatedTeams = teams.map((t) => ({
      ...t,
      startingPurse,
      remainingPurse: startingPurse - t.creditsSpent,
    }));

    setupTournament(config, updatedTeams, state.players);
    onComplete();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      
      {/* Title */}
      <div className={`border-b pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
        isLight ? 'border-slate-200' : 'border-slate-800'
      }`}>
        <div>
          <h1 className={`font-display font-black text-2xl flex items-center gap-2.5 ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            <Trophy className="w-6 h-6 text-amber-500" />
            IIIT Trichy Tournament Setup Wizard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure purse budgets in Lakhs, squad constraints, club vs non-club base pricing, and custom positional matrices.
          </p>
        </div>

        {/* Quick presets buttons */}
        <div className={`flex items-center gap-1.5 p-1.5 rounded-xl border ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          <span className="text-[10px] uppercase font-mono text-slate-400 px-2 font-bold">Sport Presets:</span>
          <button
            onClick={() => applyPresetSlots('volleyball')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
              isLight ? 'bg-white hover:bg-slate-200 text-slate-800 shadow-sm' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            Volleyball
          </button>
          <button
            onClick={() => applyPresetSlots('cricket')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
              isLight ? 'bg-white hover:bg-slate-200 text-slate-800 shadow-sm' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            Cricket
          </button>
          <button
            onClick={() => applyPresetSlots('football')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
              isLight ? 'bg-white hover:bg-slate-200 text-slate-800 shadow-sm' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            Football
          </button>
          <button
            onClick={() => applyPresetSlots('kabaddi')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
              isLight ? 'bg-white hover:bg-slate-200 text-slate-800 shadow-sm' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            Kabaddi
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* SECTION 1: BUDGET & SQUAD LIMITS */}
        <div className={`rounded-2xl border p-6 space-y-4 shadow-lg ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-slate-800'
        }`}>
          <h3 className={`font-display font-bold text-base flex items-center gap-2 border-b pb-2 ${
            isLight ? 'text-slate-900 border-slate-200' : 'text-white border-slate-800'
          }`}>
            <Coins className="w-4 h-4 text-amber-500" />
            Budget & Squad Limits (in Indian Lakhs)
          </h3>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">
              Tournament Name
            </label>
            <input
              type="text"
              value={tournamentName}
              onChange={(e) => setTournamentName(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500 ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
              }`}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-slate-400">
                Starting Purse Per Team ({formatLakhs(startingPurse)})
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setStartingPurse(1000000)}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-200 hover:bg-slate-700"
                >
                  10 Lakhs
                </button>
                <button
                  type="button"
                  onClick={() => setStartingPurse(2500000)}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                >
                  25 Lakhs
                </button>
                <button
                  type="button"
                  onClick={() => setStartingPurse(5000000)}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-200 hover:bg-slate-700"
                >
                  50 Lakhs
                </button>
                <button
                  type="button"
                  onClick={() => setStartingPurse(10000000)}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-200 hover:bg-slate-700"
                >
                  1 Crore
                </button>
              </div>
            </div>

            <input
              type="number"
              step={100000}
              value={startingPurse}
              onChange={(e) => setStartingPurse(parseInt(e.target.value, 10) || 0)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-mono-numbers focus:outline-none focus:border-amber-500 ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
              }`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Min Squad Size
              </label>
              <input
                type="number"
                value={minSquadSize}
                onChange={(e) => setMinSquadSize(parseInt(e.target.value, 10) || 1)}
                className={`w-full border rounded-xl px-3 py-2 text-xs font-mono-numbers ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Max Squad Size
              </label>
              <input
                type="number"
                value={maxSquadSize}
                onChange={(e) => setMaxSquadSize(parseInt(e.target.value, 10) || 1)}
                className={`w-full border rounded-xl px-3 py-2 text-xs font-mono-numbers ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                }`}
              />
            </div>
          </div>

          {/* Base Prices: Club vs Non-Club */}
          <div className="grid grid-cols-2 gap-3 border-t pt-3 border-slate-800/80">
            <div>
              <label className="block text-xs font-mono text-amber-500 font-bold mb-1">
                Club Base Price ({formatLakhs(clubBasePrice)})
              </label>
              <input
                type="number"
                step={50000}
                value={clubBasePrice}
                onChange={(e) => setClubBasePrice(parseInt(e.target.value, 10) || 0)}
                className={`w-full border rounded-xl px-3 py-2 text-xs font-mono-numbers ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-cyan-400 font-bold mb-1">
                Non-Club Base Price ({formatLakhs(nonClubBasePrice)})
              </label>
              <input
                type="number"
                step={25000}
                value={nonClubBasePrice}
                onChange={(e) => setNonClubBasePrice(parseInt(e.target.value, 10) || 0)}
                className={`w-full border rounded-xl px-3 py-2 text-xs font-mono-numbers ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                }`}
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: POSITIONAL SLOT MATRIX */}
        <div className={`rounded-2xl border p-6 space-y-4 shadow-lg ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-slate-800'
        }`}>
          <div className={`flex items-center justify-between border-b pb-2 ${
            isLight ? 'border-slate-200' : 'border-slate-800'
          }`}>
            <h3 className={`font-display font-bold text-base flex items-center gap-2 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              <Layers className="w-4 h-4 text-cyan-400" />
              Positional Slot Matrix
            </h3>
            <span className="text-xs font-mono text-slate-400">
              {slots.length} Slots
            </span>
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {slots.map((s) => (
              <div
                key={s.codePrefix}
                className={`flex items-center justify-between p-2.5 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-cyan-500/20 text-cyan-400">
                    {s.codePrefix}
                  </span>
                  <span className={`text-xs font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {s.name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-400">
                    Max: <strong className={isLight ? 'text-slate-900' : 'text-white'}>{s.maxCount}</strong> / squad
                  </span>
                  <button
                    onClick={() => handleRemoveSlot(s.codePrefix)}
                    className="text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
            <input
              type="text"
              placeholder="Code (e.g. SET)"
              value={newSlotPrefix}
              onChange={(e) => setNewSlotPrefix(e.target.value)}
              className={`w-24 border rounded-lg px-2.5 py-1.5 text-xs font-mono uppercase ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
              }`}
            />
            <input
              type="text"
              placeholder="Slot Name (e.g. Setter)"
              value={newSlotName}
              onChange={(e) => setNewSlotName(e.target.value)}
              className={`flex-1 border rounded-lg px-2.5 py-1.5 text-xs ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
              }`}
            />
            <input
              type="number"
              placeholder="Max"
              value={newSlotMax}
              onChange={(e) => setNewSlotMax(parseInt(e.target.value, 10) || 1)}
              className={`w-14 border rounded-lg px-2 py-1.5 text-xs font-mono-numbers ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
              }`}
            />
            <button
              onClick={handleAddSlot}
              className="p-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* SECTION 3: TEAMS CONFIGURATION */}
      <div className={`rounded-2xl border p-6 space-y-4 shadow-lg ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-slate-800'
      }`}>
        <div className={`flex items-center justify-between border-b pb-2 ${
          isLight ? 'border-slate-200' : 'border-slate-800'
        }`}>
          <div>
            <h3 className={`font-display font-bold text-base flex items-center gap-2 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              <Users className="w-4 h-4 text-emerald-400" />
              Tournament Teams Registry ({teams.length} Teams)
            </h3>
            <p className="text-xs text-slate-400">
              Each team starts with {formatLakhs(startingPurse)} and competes across the positional matrix.
            </p>
          </div>

          <button
            onClick={handleLoadSampleTeams}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Load 6 IIIT Trichy Teams</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {teams.map((t) => (
            <div
              key={t.id}
              className={`p-3 rounded-xl border flex items-center justify-between ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: t.teamColor }}
                >
                  {t.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {t.name}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    Capt: {t.captainName}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleRemoveTeam(t.id)}
                className="text-slate-500 hover:text-rose-400 transition-colors p-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Add Team Row */}
        <div className="flex items-center gap-2 pt-3 border-t border-slate-800/80">
          <input
            type="text"
            placeholder="Team Name"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            className={`flex-1 border rounded-lg px-2.5 py-1.5 text-xs ${
              isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
            }`}
          />
          <input
            type="text"
            placeholder="Captain Name"
            value={newTeamCaptain}
            onChange={(e) => setNewTeamCaptain(e.target.value)}
            className={`flex-1 border rounded-lg px-2.5 py-1.5 text-xs ${
              isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
            }`}
          />
          <input
            type="color"
            value={newTeamColor}
            onChange={(e) => setNewTeamColor(e.target.value)}
            className="w-10 h-8 rounded border border-slate-700 bg-transparent cursor-pointer p-0.5"
          />
          <button
            onClick={handleAddTeam}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Team</span>
          </button>
        </div>
      </div>

      {/* Save & Continue */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveAndStart}
          className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
        >
          <span>Save Tournament & Proceed to Ingestion</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
