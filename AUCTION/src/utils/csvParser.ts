import Papa from 'papaparse';
import { GoogleFormColumnMapping, Player, TournamentConfig, Team, AuditTransaction, AuctionSessionState } from '../types/auction';

/**
 * Format currency in Indian Rupees / Lakhs
 * e.g., 250000 -> "₹2.5 Lakh", 100000 -> "₹1 Lakh", 500000 -> "₹5 Lakh", 10000000 -> "₹1 Crore"
 */
export function formatLakhs(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  if (amount >= 10000000) {
    const cr = amount / 10000000;
    return `₹${cr % 1 === 0 ? cr : cr.toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    const lk = amount / 100000;
    return `₹${lk % 1 === 0 ? lk : lk.toFixed(2)} Lakh`;
  }
  if (amount > 0 && amount < 100000) {
    const lk = amount / 100000;
    return `₹${lk.toFixed(2)} Lakh (${amount.toLocaleString('en-IN')})`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

/**
 * Auto-detects columns in Google Forms CSV based on flexible field heuristics
 */
export function autoDetectColumns(headers: string[]): GoogleFormColumnMapping {
  const cleanHeaders = headers.map((h) => (h || '').trim());

  const findMatch = (keywords: string[]): string => {
    // 1. Exact match (case insensitive)
    for (const kw of keywords) {
      const exact = cleanHeaders.find((h) => h.toLowerCase() === kw.toLowerCase());
      if (exact) return exact;
    }
    // 2. Contains match
    for (const kw of keywords) {
      const found = cleanHeaders.find((h) => h.toLowerCase().includes(kw.toLowerCase()));
      if (found) return found;
    }
    return '';
  };

  const nameCol = findMatch(['name', 'athlete', 'student', 'player', 'full name']) || cleanHeaders[1] || cleanHeaders[0] || '';
  const yearCol = findMatch(['year', 'batch', 'dept', 'grade', 'class']) || '';
  const clubCol = findMatch(['club?', 'club', 'club or not', 'club or not club', 'tier', 'level', 'experience']) || '';
  const positionCol = findMatch(['position', 'role', 'pref', 'slot', 'specialization']) || '';
  const photoCol = findMatch([
    'upload your photo (paste url of image)',
    'upload your photo',
    'paste url of image',
    'photo',
    'image',
    'picture',
    'avatar',
    'drive',
    'url',
  ]) || '';
  const rollNumberCol = findMatch([
    'roll',
    'roll number',
    'roll no',
    'reg',
    'reg no',
    'registration',
    'registration number',
    'student id',
    'university id',
    'student number',
    'college id',
    'id'
  ]) || '';

  return {
    nameCol,
    yearCol,
    clubCol,
    positionCol,
    photoCol,
    rollNumberCol: rollNumberCol || undefined,
  };
}

/**
 * Normalizes academic year input without producing "Year 2nd year" or hiding missing data
 */
export function parseAcademicYear(rawYear: string): { display: string; warning?: string } {
  if (!rawYear || typeof rawYear !== 'string') {
    return { display: 'Unspecified', warning: 'Academic year was missing.' };
  }
  const clean = rawYear.trim();
  if (!clean) {
    return { display: 'Unspecified', warning: 'Academic year was missing.' };
  }

  // Handle single digits: 1, 2, 3, 4
  if (/^1\b/.test(clean) || clean.toLowerCase() === '1st' || clean.toLowerCase() === 'first') return { display: '1st Year' };
  if (/^2\b/.test(clean) || clean.toLowerCase() === '2nd' || clean.toLowerCase() === 'second') return { display: '2nd Year' };
  if (/^3\b/.test(clean) || clean.toLowerCase() === '3rd' || clean.toLowerCase() === 'third') return { display: '3rd Year' };
  if (/^4\b/.test(clean) || clean.toLowerCase() === '4th' || clean.toLowerCase() === 'fourth') return { display: '4th Year' };

  // Handle "year 2", "2nd year"
  const match = clean.match(/(1st|2nd|3rd|4th|\b[1-4]\b)\s*year/i);
  if (match) {
    const num = match[1].charAt(0);
    const suffix = num === '1' ? '1st' : num === '2' ? '2nd' : num === '3' ? '3rd' : '4th';
    return { display: `${suffix} Year` };
  }

  return { display: clean };
}

/**
 * Robust Club detection: avoids classifying "Not in a club", "no club", or "probably no" as Club.
 */
export function parseClubStatus(rawClub: string): { isClub: boolean; warning?: string } {
  if (!rawClub || typeof rawClub !== 'string') {
    return { isClub: false, warning: 'Club field was blank; defaulted to non-club base price.' };
  }

  const clean = rawClub.trim().toLowerCase();
  if (!clean) {
    return { isClub: false, warning: 'Club field was blank; defaulted to non-club base price.' };
  }

  // Explicit negatives: "no", "not in a club", "no club", "non-club", "probably no", "false", "0"
  if (
    /^(no|n|false|0|none|not|na)\b/.test(clean) ||
    clean.includes('no club') ||
    clean.includes('not in') ||
    clean.includes('non-club') ||
    clean.includes('non club') ||
    clean.includes('probably no') ||
    clean.includes('never')
  ) {
    return { isClub: false };
  }

  // Explicit positives: "yes", "y", "true", "1", "club player", "club member"
  if (
    /^(yes|y|true|1)\b/.test(clean) ||
    clean === 'club' ||
    clean === 'club player' ||
    clean === 'club member' ||
    clean.startsWith('yes') ||
    clean.includes('varsity')
  ) {
    return { isClub: true };
  }

  // Unrecognized string
  return {
    isClub: false,
    warning: `Ambiguous club answer "${rawClub}"; defaulted to non-club base price.`,
  };
}

export function isClubPlayer(rawClub: string): boolean {
  return parseClubStatus(rawClub).isClub;
}

/**
 * Normalizes position against tournament slot configurations.
 * If unrecognized, flags as unmapped instead of silently guessing Setter!
 */
export function matchPositionToSlot(
  rawPosition: string,
  config: TournamentConfig
): { code: string; label: string; isUnknown?: boolean } {
  if (!rawPosition || typeof rawPosition !== 'string') {
    const fallback = config.slots[0] || { codePrefix: 'ATH', name: 'Athlete' };
    return { code: fallback.codePrefix, label: fallback.name, isUnknown: true };
  }

  const clean = rawPosition.trim().toLowerCase();
  if (!clean) {
    const fallback = config.slots[0] || { codePrefix: 'ATH', name: 'Athlete' };
    return { code: fallback.codePrefix, label: fallback.name, isUnknown: true };
  }

  // 1. Direct codePrefix or name match
  for (const slot of config.slots) {
    if (slot.codePrefix.toLowerCase() === clean || slot.name.toLowerCase() === clean) {
      return { code: slot.codePrefix, label: slot.name };
    }
    if (slot.aliasKeywords && Array.isArray(slot.aliasKeywords)) {
      for (const kw of slot.aliasKeywords) {
        if (clean === kw.toLowerCase() || clean.includes(kw.toLowerCase())) {
          return { code: slot.codePrefix, label: slot.name };
        }
      }
    }
  }

  // 2. Sport-specific position heuristics
  if (clean.includes('set')) {
    const s = config.slots.find((x) => x.codePrefix.toUpperCase().includes('SET') || x.name.toLowerCase().includes('set'));
    if (s) return { code: s.codePrefix, label: s.name };
  }
  if (clean.includes('spik') || clean.includes('att') || clean.includes('hit') || clean.includes('outside')) {
    const s = config.slots.find((x) => x.codePrefix.toUpperCase().includes('SPK') || x.name.toLowerCase().includes('spik'));
    if (s) return { code: s.codePrefix, label: s.name };
  }
  if (clean.includes('lib') || clean.includes('def')) {
    const s = config.slots.find((x) => x.codePrefix.toUpperCase().includes('LIB') || x.name.toLowerCase().includes('lib'));
    if (s) return { code: s.codePrefix, label: s.name };
  }
  if (clean.includes('block') || clean.includes('middle')) {
    const s = config.slots.find((x) => x.codePrefix.toUpperCase().includes('BLK') || x.codePrefix.toUpperCase().includes('MB') || x.name.toLowerCase().includes('block'));
    if (s) return { code: s.codePrefix, label: s.name };
  }
  if (clean.includes('opp')) {
    const s = config.slots.find((x) => x.codePrefix.toUpperCase().includes('OPP') || x.name.toLowerCase().includes('opp'));
    if (s) return { code: s.codePrefix, label: s.name };
  }

  // If unknown, do not guess first slot! Assign to FLEX / General so it doesn't prematurely fill Setter/specific quotas
  return {
    code: 'FLEX',
    label: rawPosition.trim() || 'General / Flex',
    isUnknown: true,
  };
}

/**
 * Generates pure inline SVG initials avatar. Zero external network dependency.
 */
export function getLocalAvatarSvg(name: string): string {
  const cleanName = (name || 'Athlete').trim();
  const initials = cleanName
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n.charAt(0).toUpperCase())
    .join('') || 'AT';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect width="100" height="100" rx="20" fill="#0f172a" />
    <circle cx="50" cy="50" r="42" fill="#1e293b" stroke="#f59e0b" stroke-width="2" />
    <text x="50" y="58" font-family="system-ui, -apple-system, sans-serif" font-size="34" font-weight="900" fill="#f59e0b" text-anchor="middle">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Sanitizes photo URLs from Google Forms.
 * Converts Google Drive sharing links to direct embeddable CDN links.
 * Gracefully handles Google Photos (photos.app.goo.gl) album links by using local avatar.
 */
export function sanitizePhotoUrl(rawUrl: string, name: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return getLocalAvatarSvg(name);
  const clean = rawUrl.trim();
  if (!clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('data:image/')) {
    return getLocalAvatarSvg(name);
  }

  // Google Photos album links return HTML wrapper pages, not raw image data
  if (clean.includes('photos.app.goo.gl') || clean.includes('photos.google.com')) {
    return getLocalAvatarSvg(name);
  }

  // Google Drive direct embed converter
  if (clean.includes('drive.google.com') || clean.includes('docs.google.com')) {
    const match = clean.match(/(?:file\/d\/|id=|open\?id=)([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
  }

  return clean;
}

export interface ParseResult {
  players: Player[];
  warnings: string[];
  errors: string[];
  totalRows: number;
  dedupedCount: number;
}

/**
 * Parses raw CSV or TSV text using PapaParse for standards-compliant quote, apostrophe, and newline handling
 */
export function parseCSVWithMapping(
  csvText: string,
  mapping: GoogleFormColumnMapping,
  config: TournamentConfig
): ParseResult {
  const cleanText = csvText.replace(/^\uFEFF/, '').trim();
  if (!cleanText) {
    return { players: [], warnings: [], errors: ['CSV content is empty.'], totalRows: 0, dedupedCount: 0 };
  }

  const parsed = Papa.parse<string[]>(cleanText, {
    skipEmptyLines: 'greedy',
    header: false,
  });

  if (parsed.errors && parsed.errors.length > 0) {
    const errorMsgs = parsed.errors.slice(0, 5).map((e) => `CSV Error on line ${e.row}: ${e.message}`);
    if (parsed.data.length <= 1) {
      return { players: [], warnings: [], errors: errorMsgs, totalRows: 0, dedupedCount: 0 };
    }
  }

  const rows = parsed.data;
  if (!rows || rows.length <= 1) {
    return { players: [], warnings: [], errors: ['CSV must contain a header row followed by at least one data row.'], totalRows: 0, dedupedCount: 0 };
  }

  const headers = rows[0].map((h) => (h || '').trim());

  const findIdx = (colName: string): number => {
    if (!colName) return -1;
    const cleanCol = colName.trim().toLowerCase();
    const idx = headers.findIndex((h) => h.toLowerCase() === cleanCol);
    if (idx !== -1) return idx;
    return headers.findIndex((h) => h.toLowerCase().includes(cleanCol));
  };

  const nameIdx = findIdx(mapping.nameCol);
  const yearIdx = findIdx(mapping.yearCol);
  const clubIdx = findIdx(mapping.clubCol);
  const posIdx = findIdx(mapping.positionCol);
  const photoIdx = findIdx(mapping.photoCol);
  const timestampIdx = findIdx('timestamp');
  const emailIdx = findIdx('email') !== -1 ? findIdx('email') : findIdx('mail');
  const rollIdx = mapping.rollNumberCol ? findIdx(mapping.rollNumberCol) : (findIdx('roll') !== -1 ? findIdx('roll') : findIdx('reg'));

  if (nameIdx === -1) {
    return {
      players: [],
      warnings: [],
      errors: [`Could not locate Name column "${mapping.nameCol}" in CSV headers.`],
      totalRows: rows.length - 1,
      dedupedCount: 0,
    };
  }

  const warnings: string[] = [];
  const errors: string[] = [];

  interface RawPlayerEntry {
    rowNumber: number;
    timestamp: string;
    identifier: string;
    name: string;
    yearDisplay: string;
    isClub: boolean;
    posCode: string;
    posLabel: string;
    basePrice: number;
    photoUrl: string;
    rawPhotoUrl: string;
    rollNumber?: string;
  }

  const rawEntries: RawPlayerEntry[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || row.every((c) => !c || c.trim() === '')) {
      continue;
    }

    const rawName = (row[nameIdx] || '').trim();
    if (!rawName) {
      warnings.push(`Row ${i + 1}: Skipped row with empty name.`);
      continue;
    }

    const rawYear = yearIdx !== -1 ? (row[yearIdx] || '') : '';
    const rawClub = clubIdx !== -1 ? (row[clubIdx] || '') : '';
    const rawPos = posIdx !== -1 ? (row[posIdx] || '') : '';
    const rawPhoto = photoIdx !== -1 ? (row[photoIdx] || '') : '';
    const timestampStr = timestampIdx !== -1 ? (row[timestampIdx] || '') : '';
    const rawEmail = emailIdx !== -1 ? (row[emailIdx] || '').trim() : '';
    const rawRoll = rollIdx !== -1 ? (row[rollIdx] || '').trim() : '';
    const identifier = rawRoll || rawEmail;

    const yearResult = parseAcademicYear(rawYear);
    if (yearResult.warning) {
      warnings.push(`Row ${i + 1} (${rawName}): ${yearResult.warning}`);
    }

    const clubResult = parseClubStatus(rawClub);
    if (clubResult.warning) {
      warnings.push(`Row ${i + 1} (${rawName}): ${clubResult.warning}`);
    }

    const posResult = matchPositionToSlot(rawPos, config);
    if (posResult.isUnknown) {
      warnings.push(`Row ${i + 1} (${rawName}): Unknown position "${rawPos}". Assigned to ${posResult.label} slot (${posResult.code}). Please verify.`);
    }

    if (rawPhoto.includes('photos.app.goo.gl') || rawPhoto.includes('photos.google.com')) {
      warnings.push(`Row ${i + 1} (${rawName}): Google Photos album link detected. Album links cannot be rendered directly in web browsers. Device upload or Google Drive link recommended.`);
    }

    const basePrice = clubResult.isClub ? config.clubBasePrice : config.nonClubBasePrice;
    const cleanPhoto = sanitizePhotoUrl(rawPhoto, rawName);

    rawEntries.push({
      rowNumber: i + 1,
      timestamp: timestampStr,
      identifier,
      name: rawName,
      yearDisplay: yearResult.display,
      isClub: clubResult.isClub,
      posCode: posResult.code,
      posLabel: posResult.label,
      basePrice,
      photoUrl: cleanPhoto,
      rawPhotoUrl: rawPhoto,
      rollNumber: rawRoll || undefined,
    });
  }

  // Non-Destructive Deduplication:
  // If an identifier (Roll Number / University ID / Email) is provided, use it as the absolute unique identifier for deduplication.
  // If no identifier is provided, NEVER deduplicate based on name alone.
  // Treat every entry without an identifier as a distinct player to prevent false-positive deletions of students with identical names.
  const playerMap = new Map<string, RawPlayerEntry>();
  let dedupedCount = 0;

  for (const entry of rawEntries) {
    let key: string;
    let isTrueDuplicate = false;

    if (entry.identifier) {
      key = `id:${entry.identifier.toLowerCase().trim()}`;
      isTrueDuplicate = playerMap.has(key);
    } else {
      // No Roll Number / ID: Treat as a distinct candidate guaranteed by row number
      key = `row:${entry.rowNumber}:${entry.name.toLowerCase().trim()}`;
      isTrueDuplicate = false;
    }

    if (isTrueDuplicate && playerMap.has(key)) {
      dedupedCount++;
      const existing = playerMap.get(key)!;
      if (entry.timestamp && existing.timestamp) {
        const timeA = new Date(existing.timestamp).getTime();
        const timeB = new Date(entry.timestamp).getTime();
        if (timeB >= timeA) {
          playerMap.set(key, entry);
          warnings.push(`Deduplicated "${entry.name}" [ID: ${entry.identifier}]: Row ${entry.rowNumber} replaced Row ${existing.rowNumber} based on newer timestamp.`);
        } else {
          warnings.push(`Deduplicated "${entry.name}" [ID: ${entry.identifier}]: Retained Row ${existing.rowNumber} over older Row ${entry.rowNumber}.`);
        }
      } else {
        playerMap.set(key, entry);
        warnings.push(`Deduplicated "${entry.name}" [ID: ${entry.identifier}]: Replaced earlier duplicate submission with Row ${entry.rowNumber}.`);
      }
    } else {
      playerMap.set(key, entry);
    }
  }

  const finalPlayers: Player[] = Array.from(playerMap.values()).map((item, idx) => {
    const uuid = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `p-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${idx}`;

    return {
      id: uuid,
      name: item.name,
      year: item.yearDisplay,
      isClub: item.isClub,
      tier: item.isClub ? 'Club' : 'Non-Club',
      position: item.posCode,
      positionLabel: item.posLabel,
      basePrice: item.basePrice,
      photoUrl: item.photoUrl,
      rawPhotoUrl: item.rawPhotoUrl,
      status: 'pending',
      round: 1,
      attemptsCount: 0,
      notes: item.isClub ? 'Registered Club Athlete' : 'College Athlete',
      rollNumber: item.rollNumber,
    };
  });

  return {
    players: finalPlayers,
    warnings,
    errors,
    totalRows: rows.length - 1,
    dedupedCount,
  };
}

/**
 * Pre-configured 5 Candidates matching the user's exact Google Form submission
 */
export function getExactUserCandidates(config: TournamentConfig): Player[] {
  const userCandidates = [
    { name: 'Pradeep raju', year: '2nd Year', rawPos: 'Setter', isClub: true, photo: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=800&auto=format&fit=crop&q=80' },
    { name: 'Abhiraj angoth', year: '2nd Year', rawPos: 'Spiker', isClub: false, photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80' },
    { name: 'Sampath', year: '3rd Year', rawPos: 'Libero', isClub: true, photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80' },
    { name: 'Sunil', year: '4th Year', rawPos: 'Spiker', isClub: false, photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&auto=format&fit=crop&q=80' },
    { name: 'Manoj', year: '1st Year', rawPos: 'Libero', isClub: true, photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&auto=format&fit=crop&q=80' },
  ];

  return userCandidates.map((item, idx) => {
    const { code, label } = matchPositionToSlot(item.rawPos, config);
    const basePrice = item.isClub ? config.clubBasePrice : config.nonClubBasePrice;
    const uuid = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `user-p-${Date.now()}-${idx}`;

    return {
      id: uuid,
      name: item.name,
      year: item.year,
      isClub: item.isClub,
      tier: item.isClub ? 'Club' : 'Non-Club',
      position: code,
      positionLabel: label,
      basePrice,
      photoUrl: item.photo,
      rawPhotoUrl: item.photo,
      status: 'pending',
      round: 1,
      attemptsCount: 0,
      notes: item.isClub ? 'IIIT Trichy Registered Club Athlete' : 'IIIT Trichy College Contender',
    };
  });
}

/**
 * Generates instant demo candidates for testing
 */
export function generateSampleCandidates(config: TournamentConfig): Player[] {
  const names = [
    { name: 'Pradeep raju', year: '2nd Year', isClub: true, pos: 'Setter', photo: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=800&auto=format&fit=crop&q=80' },
    { name: 'Abhiraj angoth', year: '2nd Year', isClub: false, pos: 'Spiker', photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80' },
    { name: 'Sampath', year: '3rd Year', isClub: true, pos: 'Libero', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80' },
    { name: 'Sunil', year: '4th Year', isClub: false, pos: 'Spiker', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&auto=format&fit=crop&q=80' },
    { name: 'Manoj', year: '1st Year', isClub: true, pos: 'Libero', photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&auto=format&fit=crop&q=80' },
    { name: 'Rohan Sharma', year: '3rd Year', isClub: true, pos: 'Spiker', photo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800&auto=format&fit=crop&q=80' },
    { name: 'Kavita Iyer', year: '4th Year', isClub: true, pos: 'Setter', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&auto=format&fit=crop&q=80' },
    { name: 'Arjun Verma', year: '2nd Year', isClub: false, pos: 'Libero', photo: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=800&auto=format&fit=crop&q=80' },
    { name: 'Siddharth Rao', year: '3rd Year', isClub: true, pos: 'Spiker', photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&auto=format&fit=crop&q=80' },
    { name: 'Neha Deshmukh', year: '1st Year', isClub: false, pos: 'Setter', photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80' },
    { name: 'Vikram Patel', year: '4th Year', isClub: true, pos: 'Spiker', photo: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=800&auto=format&fit=crop&q=80' },
    { name: 'Aditya Nair', year: '2nd Year', isClub: false, pos: 'Libero', photo: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&auto=format&fit=crop&q=80' },
  ];

  return names.map((item, idx) => {
    const { code, label } = matchPositionToSlot(item.pos, config);
    const basePrice = item.isClub ? config.clubBasePrice : config.nonClubBasePrice;
    const uuid = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `sample-p-${Date.now()}-${idx}`;

    return {
      id: uuid,
      name: item.name,
      year: item.year,
      isClub: item.isClub,
      tier: item.isClub ? 'Club' : 'Non-Club',
      position: code,
      positionLabel: label,
      basePrice,
      photoUrl: item.photo,
      rawPhotoUrl: item.photo,
      status: 'pending',
      round: 1,
      attemptsCount: 0,
      notes: item.isClub ? 'Registered Club Athlete' : 'College Athlete',
    };
  });
}

/**
 * Downloads a pre-formatted Google Forms CSV template
 */
export function downloadGoogleFormTemplateCSV(): void {
  const template = `Timestamp,Roll Number,Name,Year,Club?,Position,upload your photo (paste url of image)
2026/10/12 10:00:00 AM,220101,Pradeep raju,2nd Year,Yes,Setter,https://images.unsplash.com/photo-1566492031773-4f4e44671857
2026/10/12 10:02:00 AM,220102,Abhiraj angoth,2nd Year,No,Spiker,https://images.unsplash.com/photo-1534528741775-53994a69daeb
2026/10/12 10:05:00 AM,210105,Sampath,3rd Year,Yes,Libero,https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d
2026/10/12 10:07:00 AM,200109,Sunil,4th Year,No,Spiker,https://images.unsplash.com/photo-1500648767791-00dcc994a43e
2026/10/12 10:10:00 AM,230114,Manoj,1st Year,Yes,Libero,https://images.unsplash.com/photo-1519085360753-af0119f7cbe7`;

  downloadFile('iiit_trichy_auction_template.csv', template, 'text/csv;charset=utf-8;');
}

/**
 * Exports complete drafted rosters across all teams to CSV (compatible with Google Sheets)
 */
export function exportRostersToCSV(teams: Team[], tournamentName: string): string {
  const headers = ['Team Name', 'Captain', 'Remaining Purse (₹)', 'Credits Spent (₹)', 'Slot Code', 'Player Name', 'Position', 'Price Paid (₹)', 'Round', 'Sold Timestamp'];
  const rows: (string | number)[][] = [];

  for (const team of teams) {
    if (team.draftedPlayers.length === 0) {
      rows.push([team.name, team.captainName, team.remainingPurse, team.creditsSpent, 'None', 'No players drafted', '-', 0, '-', '-']);
    } else {
      for (const p of team.draftedPlayers) {
        rows.push([
          team.name,
          team.captainName,
          team.remainingPurse,
          team.creditsSpent,
          p.slotCode || '-',
          p.playerName,
          p.position,
          p.price,
          p.round || 1,
          p.timestamp || '-',
        ]);
      }
    }
  }

  return Papa.unparse({
    fields: headers,
    data: rows,
  });
}

/**
 * Exports full transaction audit trail to CSV
 */
export function exportAuditToCSV(transactions: AuditTransaction[]): string {
  const headers = ['Transaction ID', 'Timestamp', 'Action Type', 'Operator', 'Entity Type', 'Entity Name', 'Description'];
  const rows = transactions.map((t) => [
    t.id,
    t.timestamp,
    t.actionType,
    t.operator || 'Tournament Director',
    t.entityType,
    t.entityName || '-',
    t.description,
  ]);

  return Papa.unparse({
    fields: headers,
    data: rows,
  });
}

/**
 * Triggers browser file download
 */
export function downloadFile(filename: string, content: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
