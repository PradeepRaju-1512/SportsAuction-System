import { VisualTheme } from '../types/auction';

export interface ThemeColors {
  id: VisualTheme;
  name: string;
  bgCanvas: string;
  bgSurface: string;
  bgCard: string;
  borderSubtle: string;
  borderHighlight: string;
  accentPrimary: string;
  accentSecondary: string;
  accentGlow: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  badgeBg: string;
  badgeText: string;
}

export const THEMES: Record<VisualTheme, ThemeColors> = {
  'stadium-blue': {
    id: 'stadium-blue',
    name: 'Stadium Blue & Amber',
    bgCanvas: 'bg-slate-950',
    bgSurface: 'bg-slate-900',
    bgCard: 'bg-slate-900/80',
    borderSubtle: 'border-slate-800',
    borderHighlight: 'border-cyan-500/50',
    accentPrimary: 'text-amber-400 bg-amber-500',
    accentSecondary: 'text-cyan-400 bg-cyan-500',
    accentGlow: 'shadow-[0_0_20px_rgba(6,182,212,0.25)]',
    textPrimary: 'text-white',
    textSecondary: 'text-slate-200',
    textMuted: 'text-slate-400',
    badgeBg: 'bg-amber-500/10 border-amber-500/30',
    badgeText: 'text-amber-400',
  },
  'crimson-arena': {
    id: 'crimson-arena',
    name: 'Crimson Arena',
    bgCanvas: 'bg-[#0f070a]',
    bgSurface: 'bg-[#1b0d13]',
    bgCard: 'bg-[#25121b]/80',
    borderSubtle: 'border-rose-950',
    borderHighlight: 'border-rose-600/50',
    accentPrimary: 'text-rose-400 bg-rose-600',
    accentSecondary: 'text-amber-300 bg-amber-500',
    accentGlow: 'shadow-[0_0_20px_rgba(225,29,72,0.25)]',
    textPrimary: 'text-rose-50',
    textSecondary: 'text-rose-200',
    textMuted: 'text-rose-400/70',
    badgeBg: 'bg-rose-500/10 border-rose-500/30',
    badgeText: 'text-rose-400',
  },
  'cyber-neon': {
    id: 'cyber-neon',
    name: 'Cyber Neon',
    bgCanvas: 'bg-[#07090e]',
    bgSurface: 'bg-[#0e121d]',
    bgCard: 'bg-[#131927]/80',
    borderSubtle: 'border-slate-800/80',
    borderHighlight: 'border-emerald-400/50',
    accentPrimary: 'text-emerald-400 bg-emerald-500',
    accentSecondary: 'text-cyan-300 bg-cyan-400',
    accentGlow: 'shadow-[0_0_20px_rgba(52,211,153,0.3)]',
    textPrimary: 'text-white',
    textSecondary: 'text-emerald-100',
    textMuted: 'text-slate-400',
    badgeBg: 'bg-emerald-500/10 border-emerald-500/30',
    badgeText: 'text-emerald-400',
  },
  'emerald-championship': {
    id: 'emerald-championship',
    name: 'Emerald Championship',
    bgCanvas: 'bg-[#04130c]',
    bgSurface: 'bg-[#072417]',
    bgCard: 'bg-[#0b3321]/80',
    borderSubtle: 'border-emerald-950',
    borderHighlight: 'border-amber-400/50',
    accentPrimary: 'text-amber-400 bg-amber-500',
    accentSecondary: 'text-emerald-300 bg-emerald-400',
    accentGlow: 'shadow-[0_0_20px_rgba(245,158,11,0.25)]',
    textPrimary: 'text-emerald-50',
    textSecondary: 'text-emerald-200',
    textMuted: 'text-emerald-400/70',
    badgeBg: 'bg-amber-500/10 border-amber-500/30',
    badgeText: 'text-amber-400',
  },
  'midnight-contrast': {
    id: 'midnight-contrast',
    name: 'Midnight High-Contrast',
    bgCanvas: 'bg-black',
    bgSurface: 'bg-[#121214]',
    bgCard: 'bg-[#1a1a1e]/90',
    borderSubtle: 'border-zinc-800',
    borderHighlight: 'border-white/50',
    accentPrimary: 'text-black bg-white',
    accentSecondary: 'text-zinc-200 bg-zinc-700',
    accentGlow: 'shadow-[0_0_20px_rgba(255,255,255,0.2)]',
    textPrimary: 'text-white',
    textSecondary: 'text-zinc-200',
    textMuted: 'text-zinc-400',
    badgeBg: 'bg-white/10 border-white/30',
    badgeText: 'text-white',
  },
};
