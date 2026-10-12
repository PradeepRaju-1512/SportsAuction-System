import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle, 
  Sparkles, 
  ArrowRight, 
  Trash2, 
  Users,
  Eye,
  Check,
  Zap,
  Info,
  AlertTriangle,
  Camera
} from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';
import { 
  autoDetectColumns, 
  parseCSVWithMapping, 
  downloadGoogleFormTemplateCSV, 
  getExactUserCandidates,
  generateSampleCandidates,
  formatLakhs
} from '../../utils/csvParser';
import { GoogleFormColumnMapping, Player } from '../../types/auction';
import { AthletePhoto } from '../common/AthletePhoto';

interface GoogleFormsCSVIngestionProps {
  onProceedToStage: () => void;
}

export const GoogleFormsCSVIngestion: React.FC<GoogleFormsCSVIngestionProps> = ({
  onProceedToStage,
}) => {
  const { state, importPlayersToQueue, showNotice } = useAuction();

  const [csvText, setCsvText] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<GoogleFormColumnMapping>({
    nameCol: '',
    yearCol: '',
    clubCol: '',
    positionCol: '',
    photoCol: '',
    rollNumberCol: '',
  });

  const [parsedPreviewPlayers, setParsedPreviewPlayers] = useState<Player[]>([]);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [hasConfirmedMapping, setHasConfirmedMapping] = useState(false);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isLight = state.colorMode === 'light';

  // Use PapaParse to safely parse CSV headers and preview rows
  const handleCSVChange = (text: string) => {
    setCsvText(text);
    setHasConfirmedMapping(false);
    setParsedPreviewPlayers([]);
    setParseWarnings([]);
    setParseErrors([]);

    const clean = text.replace(/^\uFEFF/, '').trim();
    if (!clean) {
      setHeaders([]);
      setPreviewRows([]);
      return;
    }

    const parsed = Papa.parse<string[]>(clean, {
      skipEmptyLines: 'greedy',
      header: false,
    });

    if (parsed.data && parsed.data.length > 0) {
      const parsedHeaders = parsed.data[0].map((h) => (h || '').trim());
      setHeaders(parsedHeaders);

      const detected = autoDetectColumns(parsedHeaders);
      setMapping(detected);

      // Extract up to 4 preview rows
      const rows = parsed.data.slice(1, 5);
      setPreviewRows(rows);
    } else {
      setHeaders([]);
      setPreviewRows([]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        handleCSVChange(String(event.target?.result || ''));
      };
      reader.readAsText(file);
    }
  };

  // Preview parsing with PapaParse and validations
  const handlePreviewParse = () => {
    if (!csvText.trim()) return;
    const result = parseCSVWithMapping(csvText, mapping, state.config);
    setParsedPreviewPlayers(result.players);
    setParseWarnings(result.warnings);
    setParseErrors(result.errors);
    setHasConfirmedMapping(true);

    if (result.errors.length > 0) {
      showNotice(`Found ${result.errors.length} parsing error(s). Please review below.`, 'error');
    } else if (result.warnings.length > 0) {
      showNotice(`Parsed ${result.players.length} athletes with ${result.warnings.length} warning(s). Review table below.`, 'info');
    } else {
      showNotice(`Successfully parsed ${result.players.length} athletes with zero errors!`, 'success');
    }
  };

  // Commit verified players into active auction queue
  const handleCommitQueue = () => {
    if (parsedPreviewPlayers.length === 0) return;
    importPlayersToQueue(parsedPreviewPlayers, importMode);
    onProceedToStage();
  };

  // Instant load of the user's 5 exact registered candidates
  const handleLoadUserCandidates = () => {
    const userCandidates = getExactUserCandidates(state.config);
    importPlayersToQueue(userCandidates, 'replace');
    onProceedToStage();
  };

  // Inline editing helpers for preview table
  const handleUpdatePlayerField = (idx: number, updates: Partial<Player>) => {
    setParsedPreviewPlayers((prev) =>
      prev.map((p, i) => {
        if (i !== idx) return p;
        const updated = { ...p, ...updates };

        // If club status was updated, adjust base price automatically if not explicitly set
        if (updates.isClub !== undefined && updates.basePrice === undefined) {
          updated.tier = updates.isClub ? 'Club' : 'Non-Club';
          updated.basePrice = updates.isClub ? state.config.clubBasePrice : state.config.nonClubBasePrice;
        }

        // If position was updated, update label
        if (updates.position !== undefined) {
          const slot = state.config.slots.find((s) => s.codePrefix === updates.position);
          if (slot) {
            updated.positionLabel = slot.name;
          }
        }

        return updated;
      })
    );
  };

  const handleRemovePreviewPlayer = (idx: number) => {
    setParsedPreviewPlayers((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      
      {/* Title */}
      <div className={`pb-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
        isLight ? 'border-slate-200' : 'border-slate-800'
      }`}>
        <div>
          <h1 className={`font-display font-black text-2xl flex items-center gap-2.5 ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            Google Forms CSV Ingestion & Mapping
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Accepts your exact Google Forms headers: <span className="font-mono text-amber-500 font-bold">Timestamp, Name, Year, Club?, Position, upload your photo</span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleLoadUserCandidates}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all cursor-pointer"
            title="Instantly load the 5 candidates: Pradeep raju, Abhiraj, Sampath, Sunil, Manoj"
          >
            <Zap className="w-3.5 h-3.5 fill-slate-950" />
            <span>Load 5 Form Candidates</span>
          </button>

          <button
            onClick={downloadGoogleFormTemplateCSV}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              isLight 
                ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Form Template</span>
          </button>
        </div>
      </div>

      {/* CSV Intake Box: Drag & drop + Paste */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Upload Dropzone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${
            isLight
              ? 'border-slate-300 hover:border-emerald-500 bg-white hover:bg-emerald-50/20 shadow-sm'
              : 'border-slate-700 hover:border-emerald-500/80 bg-slate-900/60 hover:bg-slate-900'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h3 className={`font-display font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Click or drag Google Forms CSV here
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Supports CSV exported directly from Google Forms or Google Sheets
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.tsv"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        {/* Or Paste Raw Content */}
        <div className={`p-4 rounded-2xl border flex flex-col space-y-2 ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-slate-400">Or paste raw CSV text:</span>
            {csvText && (
              <button
                onClick={() => handleCSVChange('')}
                className="text-rose-400 hover:underline flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
          <textarea
            value={csvText}
            onChange={(e) => handleCSVChange(e.target.value)}
            placeholder="Timestamp,Name,Year,Club?,Position,upload your photo (paste url of image)..."
            rows={5}
            className={`w-full h-full p-2.5 rounded-xl font-mono text-xs border resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
              isLight 
                ? 'bg-slate-50 border-slate-300 text-slate-800' 
                : 'bg-slate-950 border-slate-800 text-slate-200'
            }`}
          />
        </div>
      </div>

      {/* Detected Headers & Column Mapping Form */}
      {headers.length > 0 && (
        <div className={`rounded-2xl border p-6 space-y-6 shadow-xl ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-slate-800'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-4">
            <div>
              <h2 className={`font-display font-bold text-base flex items-center gap-2 ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                <Sparkles className="w-4 h-4 text-amber-500" />
                Detected Columns & Field Mapping
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Confirm which CSV columns correspond to the 5 mandatory athlete properties.
              </p>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
              {headers.length} Columns Detected
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            
            {/* Field 1: Roll Number / University ID */}
            <div className={`p-3 rounded-xl border space-y-1.5 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
            }`}>
              <span className="text-[11px] font-mono font-bold text-cyan-400 uppercase block truncate">
                1. Roll No / ID
              </span>
              <select
                value={mapping.rollNumberCol || ''}
                onChange={(e) => {
                  setMapping({ ...mapping, rollNumberCol: e.target.value });
                  setHasConfirmedMapping(false);
                }}
                className={`w-full text-xs rounded-lg px-2 py-1.5 border font-mono ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-200'
                }`}
              >
                <option value="">-- Auto-detect / None --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            {/* Field 2: Name */}
            <div className={`p-3 rounded-xl border space-y-1.5 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
            }`}>
              <span className="text-[11px] font-mono font-bold text-amber-500 uppercase block truncate">
                2. Athlete Name
              </span>
              <select
                value={mapping.nameCol}
                onChange={(e) => {
                  setMapping({ ...mapping, nameCol: e.target.value });
                  setHasConfirmedMapping(false);
                }}
                className={`w-full text-xs rounded-lg px-2 py-1.5 border font-mono ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-200'
                }`}
              >
                <option value="">-- Select Column --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            {/* Field 3: Year */}
            <div className={`p-3 rounded-xl border space-y-1.5 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
            }`}>
              <span className="text-[11px] font-mono font-bold text-amber-500 uppercase block truncate">
                3. Year / Dept
              </span>
              <select
                value={mapping.yearCol}
                onChange={(e) => {
                  setMapping({ ...mapping, yearCol: e.target.value });
                  setHasConfirmedMapping(false);
                }}
                className={`w-full text-xs rounded-lg px-2 py-1.5 border font-mono ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-200'
                }`}
              >
                <option value="">-- Select Column --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            {/* Field 4: Club? */}
            <div className={`p-3 rounded-xl border space-y-1.5 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
            }`}>
              <span className="text-[11px] font-mono font-bold text-amber-500 uppercase block truncate">
                4. Club / Tier
              </span>
              <select
                value={mapping.clubCol}
                onChange={(e) => {
                  setMapping({ ...mapping, clubCol: e.target.value });
                  setHasConfirmedMapping(false);
                }}
                className={`w-full text-xs rounded-lg px-2 py-1.5 border font-mono ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-200'
                }`}
              >
                <option value="">-- Select Column --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            {/* Field 5: Position */}
            <div className={`p-3 rounded-xl border space-y-1.5 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
            }`}>
              <span className="text-[11px] font-mono font-bold text-amber-500 uppercase block truncate">
                5. Position
              </span>
              <select
                value={mapping.positionCol}
                onChange={(e) => {
                  setMapping({ ...mapping, positionCol: e.target.value });
                  setHasConfirmedMapping(false);
                }}
                className={`w-full text-xs rounded-lg px-2 py-1.5 border font-mono ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-200'
                }`}
              >
                <option value="">-- Select Column --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            {/* Field 6: Photo URL */}
            <div className={`p-3 rounded-xl border space-y-1.5 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
            }`}>
              <span className="text-[11px] font-mono font-bold text-amber-500 uppercase block truncate">
                6. Photo URL
              </span>
              <select
                value={mapping.photoCol}
                onChange={(e) => {
                  setMapping({ ...mapping, photoCol: e.target.value });
                  setHasConfirmedMapping(false);
                }}
                className={`w-full text-xs rounded-lg px-2 py-1.5 border font-mono ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-200'
                }`}
              >
                <option value="">-- Select Column --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Verification Trigger Button */}
          <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between border-t pt-4 gap-3 ${
            isLight ? 'border-slate-200' : 'border-slate-800'
          }`}>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-slate-400">Queue Action:</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'append'}
                  onChange={() => setImportMode('append')}
                />
                <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>Append to queue</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-rose-400">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                />
                <span>Replace active queue</span>
              </label>
            </div>

            <button
              onClick={handlePreviewParse}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-md"
            >
              <Eye className="w-4 h-4" />
              <span>Verify & Preview Candidates</span>
            </button>
          </div>
        </div>
      )}

      {/* Warnings & Notices Box */}
      {hasConfirmedMapping && (parseWarnings.length > 0 || parseErrors.length > 0) && (
        <div className={`p-4 rounded-xl border space-y-2 text-xs font-mono ${
          parseErrors.length > 0
            ? 'bg-rose-950/40 border-rose-800 text-rose-300'
            : 'bg-amber-950/40 border-amber-800 text-amber-300'
        }`}>
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              {parseErrors.length > 0 ? `Errors encountered (${parseErrors.length}):` : `Parser Warnings & Deduplications (${parseWarnings.length}):`}
            </span>
          </div>
          <ul className="list-disc list-inside space-y-1 max-h-32 overflow-y-auto text-[11px] opacity-90">
            {parseErrors.map((err, i) => (
              <li key={`err-${i}`} className="text-rose-400 font-semibold">{err}</li>
            ))}
            {parseWarnings.map((warn, i) => (
              <li key={`warn-${i}`}>{warn}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Verified preview with inline editing */}
      {hasConfirmedMapping && parsedPreviewPlayers.length > 0 && (
        <div className={`rounded-2xl border p-5 sm:p-6 space-y-4 shadow-xl ${
          isLight ? 'bg-white border-emerald-400' : 'bg-slate-900/90 border-emerald-500/50'
        }`}>
          <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between border-b pb-3 gap-3 ${
            isLight ? 'border-slate-200' : 'border-slate-800'
          }`}>
            <div>
              <h3 className={`font-display font-bold text-base flex items-center gap-2 ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                <Check className="w-5 h-5 text-emerald-400" />
                Verified Candidate Preview ({parsedPreviewPlayers.length} Athletes Ready)
              </h3>
              <p className="text-xs text-slate-400">
                You can edit names, positions, tiers, or upload photos inline before committing to the live auction.
              </p>
            </div>

            <button
              onClick={handleCommitQueue}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <span>Add to Stage & Launch</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Editable Table Preview */}
          <div className={`overflow-x-auto max-h-80 border rounded-xl ${
            isLight ? 'border-slate-200' : 'border-slate-800'
          }`}>
            <table className="w-full text-left text-xs">
              <thead className={`font-mono text-[11px] uppercase border-b sticky top-0 ${
                isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}>
                <tr>
                  <th className="py-2 px-3">Photo & Name</th>
                  <th className="py-2 px-3">Roll No / ID</th>
                  <th className="py-2 px-3">Year</th>
                  <th className="py-2 px-3">Position Slot</th>
                  <th className="py-2 px-3">Club / Tier</th>
                  <th className="py-2 px-3">Base Price</th>
                  <th className="py-2 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-slate-800/80'}`}>
                {parsedPreviewPlayers.map((p, idx) => (
                  <tr key={p.id} className={isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/50'}>
                    
                    {/* Photo & Name */}
                    <td className="py-2 px-3 flex items-center gap-2.5 min-w-[200px]">
                      <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-700 bg-slate-800">
                        <AthletePhoto
                          photoUrl={p.photoUrl}
                          name={p.name}
                          position={p.position}
                          allowUpload={true}
                          onPhotoChanged={(dataUrl) => handleUpdatePlayerField(idx, { photoUrl: dataUrl, rawPhotoUrl: dataUrl })}
                        />
                      </div>
                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) => handleUpdatePlayerField(idx, { name: e.target.value })}
                        className={`font-bold px-2 py-1 rounded border text-xs w-full ${
                          isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                        }`}
                      />
                    </td>

                    {/* Roll Number / Student ID */}
                    <td className="py-2 px-3 font-mono">
                      <input
                        type="text"
                        placeholder="Optional ID"
                        value={p.rollNumber || ''}
                        onChange={(e) => handleUpdatePlayerField(idx, { rollNumber: e.target.value || undefined })}
                        className={`w-28 px-1.5 py-1 rounded border text-xs font-mono font-bold ${
                          p.rollNumber 
                            ? 'text-cyan-400 border-cyan-500/40 bg-cyan-950/20' 
                            : isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-400'
                        }`}
                      />
                    </td>

                    {/* Year */}
                    <td className="py-2 px-3 font-mono">
                      <input
                        type="text"
                        value={p.year}
                        onChange={(e) => handleUpdatePlayerField(idx, { year: e.target.value })}
                        className={`w-24 px-1.5 py-1 rounded border text-xs font-mono ${
                          isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-700 text-slate-200'
                        }`}
                      />
                    </td>

                    {/* Position Slot Dropdown */}
                    <td className="py-2 px-3 font-mono">
                      <select
                        value={p.position}
                        onChange={(e) => handleUpdatePlayerField(idx, { position: e.target.value })}
                        className={`px-2 py-1 rounded border text-xs font-mono ${
                          isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-700 text-cyan-300'
                        }`}
                      >
                        {state.config.slots.map((slot) => (
                          <option key={slot.codePrefix} value={slot.codePrefix}>
                            {slot.name} ({slot.codePrefix})
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Club / Tier Dropdown */}
                    <td className="py-2 px-3 font-mono">
                      <select
                        value={p.isClub ? 'club' : 'non-club'}
                        onChange={(e) => handleUpdatePlayerField(idx, { isClub: e.target.value === 'club' })}
                        className={`px-2 py-1 rounded border text-xs font-mono font-bold ${
                          p.isClub 
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-400' 
                            : 'bg-slate-800 border-slate-700 text-slate-300'
                        }`}
                      >
                        <option value="club">Club Athlete</option>
                        <option value="non-club">Non-Club</option>
                      </select>
                    </td>

                    {/* Base Price */}
                    <td className="py-2 px-3 font-mono-numbers font-bold text-amber-500">
                      <input
                        type="number"
                        step={50000}
                        value={p.basePrice}
                        onChange={(e) => handleUpdatePlayerField(idx, { basePrice: Number(e.target.value) })}
                        className={`w-28 px-1.5 py-1 rounded border text-xs font-mono-numbers font-bold text-amber-400 ${
                          isLight ? 'bg-white border-slate-300' : 'bg-slate-950 border-slate-700'
                        }`}
                      />
                    </td>

                    {/* Delete row */}
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => handleRemovePreviewPlayer(idx)}
                        className="text-slate-400 hover:text-rose-400 p-1 transition-colors"
                        title="Remove candidate from import"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Current Queue Status */}
      <div className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
      }`}>
        <div className="flex items-center gap-2 font-mono text-slate-400">
          <Users className="w-4 h-4 text-cyan-400" />
          <span>Active Auction Queue:</span>
          <strong className={isLight ? 'text-slate-900' : 'text-white'}>{state.players.length} Athletes Loaded</strong>
          <span>({state.players.filter((p) => p.status === 'pending').length} Pending on Stage)</span>
        </div>

        {state.players.length > 0 && (
          <button
            onClick={onProceedToStage}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
              isLight 
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <span>Go to Live Stage</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

    </div>
  );
};
