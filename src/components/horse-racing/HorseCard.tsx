import { Flame, GaugeCircle, Star, Sparkles } from 'lucide-react';
import type { Horse } from '../../types/horse-racing';

type HorseCardProps = {
  horse: Horse;
  selected: boolean;
  disabled?: boolean;
  onSelect: (horseId: string) => void;
};

const RARITY_THEMES = {
  legendary: {
    border: 'border-amber-500/30',
    hoverBorder: 'hover:border-amber-400/60',
    selectedBorder: 'border-amber-400 bg-amber-500/15 shadow-[0_0_25px_rgba(245,158,11,0.25)]',
    text: 'text-amber-400',
    badge: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  },
  epic: {
    border: 'border-fuchsia-500/30',
    hoverBorder: 'hover:border-fuchsia-400/60',
    selectedBorder: 'border-fuchsia-400 bg-fuchsia-500/15 shadow-[0_0_25px_rgba(217,70,239,0.25)]',
    text: 'text-fuchsia-400',
    badge: 'border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-300',
  },
  rare: {
    border: 'border-cyan-500/30',
    hoverBorder: 'hover:border-cyan-400/60',
    selectedBorder: 'border-cyan-400 bg-cyan-500/15 shadow-[0_0_25px_rgba(6,182,212,0.25)]',
    text: 'text-cyan-400',
    badge: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300',
  },
  common: {
    border: 'border-slate-500/25',
    hoverBorder: 'hover:border-slate-400/50',
    selectedBorder: 'border-slate-300 bg-slate-500/15 shadow-[0_0_20px_rgba(255,255,255,0.15)]',
    text: 'text-slate-400',
    badge: 'border-slate-500/15 bg-slate-500/5 text-slate-400',
  },
};

export function HorseCard({ horse, selected, disabled, onSelect }: HorseCardProps) {
  const theme = RARITY_THEMES[horse.rarity] || RARITY_THEMES.common;

  return (
    <button
      type="button"
      className={`w-full rounded-2xl border p-4 text-left transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] ${
        selected
          ? theme.selectedBorder
          : `border-white/5 bg-black/40 ${theme.border} ${theme.hoverBorder}`
      } ${disabled ? 'cursor-not-allowed opacity-40 hover:scale-100 active:scale-100' : ''}`}
      disabled={disabled}
      onClick={() => onSelect(horse.horse_id)}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {horse.avatar ? (
            <img
              src={horse.avatar}
              alt={horse.name}
              className="h-16 w-16 rounded-xl border border-white/10 bg-black/40 object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-slate-500">
              <Sparkles size={14} />
            </div>
          )}
          <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black uppercase tracking-wide text-white">{horse.name}</span>
            {horse.rarity === 'legendary' && (
              <Sparkles size={11} className="text-amber-400 animate-pulse" />
            )}
          </div>
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-slate-400">
            <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 ${theme.badge}`}>
              <Star size={10} className="fill-current" />
              {horse.rarity}
            </span>
            <span className="inline-flex items-center gap-1 rounded border border-white/5 bg-white/5 px-2 py-0.5 text-slate-300">
              <GaugeCircle size={10} className="text-cyan-400" />
              SPD {horse.speed_rating}
            </span>
          </div>
        </div>
        </div>
        
        <div className="text-right">
          <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500 block">Odds</span>
          <span className={`text-sm font-black ${theme.text}`}>x{horse.odds_multiplier.toFixed(2)}</span>
        </div>
      </div>
      
      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">
        <span>Win Probability</span>
        <span className="text-slate-300 font-mono">{horse.win_probability.toFixed(2)}%</span>
      </div>
      
      {selected && (
        <div className="mt-2.5 inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[8px] font-black uppercase tracking-[0.2em] text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
          <Flame size={10} className="fill-current" />
          Active Bet
        </div>
      )}
    </button>
  );
}
