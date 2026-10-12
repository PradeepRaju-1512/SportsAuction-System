import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, User, Sparkles } from 'lucide-react';

interface AthletePhotoProps {
  photoUrl?: string;
  name: string;
  position?: string;
  year?: string;
  isClub?: boolean;
  className?: string;
  allowUpload?: boolean;
  onPhotoChanged?: (dataUrl: string) => void;
  aspectRatio?: 'square' | 'portrait';
  rollNumber?: string;
}

/**
 * Resolves Google Drive and Google Photos links to embeddable image sources
 */
export function resolveImageCandidates(rawUrl?: string): string[] {
  if (!rawUrl || typeof rawUrl !== 'string') return [];
  const clean = rawUrl.trim();
  if (!clean) return [];

  // 1. Base64 or Blob URL (local file)
  if (clean.startsWith('data:image/') || clean.startsWith('blob:')) {
    return [clean];
  }

  const candidates: string[] = [];

  // 2. Google Drive Link: extract file ID
  if (clean.includes('drive.google.com') || clean.includes('docs.google.com')) {
    const match = clean.match(/(?:file\/d\/|id=|open\?id=)([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      const fileId = match[1];
      candidates.push(`https://lh3.googleusercontent.com/d/${fileId}`);
      candidates.push(`https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`);
      candidates.push(`https://wsrv.nl/?url=https%3A%2F%2Fdrive.google.com%2Fuc%3Fid%3D${fileId}&w=800`);
    }
  }

  // 3. Regular HTTP/HTTPS URL
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    candidates.push(clean);
    // Add wsrv.nl proxy as fallback for CORS or referrer-blocked hosts
    if (!clean.includes('wsrv.nl') && !clean.includes('localhost')) {
      candidates.push(`https://wsrv.nl/?url=${encodeURIComponent(clean)}&w=800`);
    }
  }

  return candidates;
}

/**
 * Deterministic gradient generation for player initials avatar
 */
function getPlayerAvatarGradient(name: string): string {
  const gradients = [
    'from-blue-600 via-indigo-600 to-slate-900',
    'from-amber-600 via-orange-600 to-slate-900',
    'from-emerald-600 via-teal-700 to-slate-900',
    'from-purple-600 via-indigo-700 to-slate-900',
    'from-rose-600 via-pink-700 to-slate-900',
    'from-cyan-600 via-blue-700 to-slate-900',
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

/**
 * Resilient, on-screen Athlete Photo with multi-source fallback and direct file upload
 */
export const AthletePhoto: React.FC<AthletePhotoProps> = ({
  photoUrl,
  name,
  position = 'ATH',
  year,
  isClub = false,
  className = '',
  allowUpload = false,
  onPhotoChanged,
  rollNumber,
}) => {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [hasAllFailed, setHasAllFailed] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const list = resolveImageCandidates(photoUrl);
    setCandidates(list);
    setCandidateIndex(0);
    setHasAllFailed(list.length === 0);
  }, [photoUrl]);

  const handleImageError = () => {
    if (candidateIndex + 1 < candidates.length) {
      setCandidateIndex((prev) => prev + 1);
    } else {
      setHasAllFailed(true);
    }
  };

  const handleFileSelect = (file?: File) => {
    if (!file || !onPhotoChanged) return;
    if (!file.type.startsWith('image/')) {
      console.warn('Selected file is not an image');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = String(e.target?.result || '');
      if (result) {
        onPhotoChanged(result);
        setCandidates([result]);
        setCandidateIndex(0);
        setHasAllFailed(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const currentSrc = candidates[candidateIndex];
  const initials = (name || 'Athlete')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');

  return (
    <div
      className={`relative overflow-hidden group select-none ${className} ${
        isDragOver ? 'ring-4 ring-amber-500 scale-[1.02]' : ''
      }`}
      onDragOver={(e) => {
        if (allowUpload) {
          e.preventDefault();
          setIsDragOver(true);
        }
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        if (allowUpload) {
          e.preventDefault();
          setIsDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFileSelect(file);
        }
      }}
    >
      {/* Hidden File Input for direct upload */}
      {allowUpload && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files?.[0])}
        />
      )}

      {/* Render Image or Stylized Fallback */}
      {!hasAllFailed && currentSrc ? (
        <img
          key={currentSrc}
          src={currentSrc}
          alt={name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={handleImageError}
        />
      ) : (
        /* High-Definition Stylized Athlete Jersey Fallback (Rendered Directly On Screen) */
        <div className={`w-full h-full flex flex-col items-center justify-between p-3.5 bg-gradient-to-br ${getPlayerAvatarGradient(name)} text-white`}>
          <div className="w-full flex items-center justify-between text-[10px] font-mono opacity-80">
            <span className="font-bold uppercase tracking-wider">{position}</span>
            <span>{rollNumber ? `ID: ${rollNumber}` : (year || 'IIIT Trichy')}</span>
          </div>

          <div className="flex flex-col items-center justify-center my-auto">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner mb-2">
              <span className="font-display font-black text-2xl sm:text-3xl tracking-wider text-amber-300">
                {initials || 'IIIT'}
              </span>
            </div>
            <span className="font-display font-bold text-xs sm:text-sm text-center line-clamp-1 text-white">
              {name}
            </span>
            <span className="text-[10px] font-mono text-cyan-200 mt-0.5">
              {isClub ? 'Club Contender' : 'College Athlete'}
            </span>
          </div>

          {allowUpload && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-1.5 px-2 rounded-lg bg-black/40 hover:bg-black/60 text-[10px] font-mono font-bold text-amber-300 border border-white/20 flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <Camera className="w-3 h-3" />
              <span>Upload Photo</span>
            </button>
          )}
        </div>
      )}

      {/* Hover Upload Overlay if allowUpload is active */}
      {allowUpload && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer backdrop-blur-[2px] p-2 text-center"
        >
          <div className="w-10 h-10 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center mb-1 shadow-lg">
            <Upload className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold font-mono text-amber-400">Click or Drop Photo</span>
          <span className="text-[10px] text-slate-300 mt-0.5">PNG, JPG, WEBP from device</span>
        </div>
      )}
    </div>
  );
};
