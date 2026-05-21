import { memo } from 'react';
import { Trophy, Crown, Medal, TrendingUp } from 'lucide-react';
import { formatNumber } from '../../lib/dice';
import type { WheelLeaderboardEntry } from '../../types/wheel';

type WheelLeaderboardProps = {
  items: WheelLeaderboardEntry[];
};

const WheelLeaderboardImpl = ({ items }: WheelLeaderboardProps) => {
  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return (
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 flex items-center justify-center shadow-[0_0_12px_rgba(250,204,21,0.55)] border border-yellow-200/50">
            <Crown size={12} className="text-slate-950 font-black" />
          </div>
        );
      case 1:
        return (
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-100 via-cyan-200 to-slate-400 flex items-center justify-center shadow-[0_0_12px_rgba(103,232,249,0.45)] border border-white/50">
            <Medal size={12} className="text-slate-900 animate-pulse" />
          </div>
        );
      case 2:
        return (
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-600 via-orange-500 to-amber-800 flex items-center justify-center shadow-[0_0_12px_rgba(249,115,22,0.35)] border border-orange-400/40">
            <Trophy size={11} className="text-white" />
          </div>
        );
      default:
        return (
          <div className="w-6 h-6 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center">
            <span className="font-display font-black text-[10px] text-slate-400">#{index + 1}</span>
          </div>
        );
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#060a16] to-[#03050c] p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_10px_35px_rgba(0,0,0,0.5)]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
          <Trophy size={12} className="text-yellow-400" />
          Leaderboard
        </div>
        <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest bg-cyan-950/40 border border-cyan-800/30 px-2 py-0.5 rounded-full">
          Realtime
        </span>
      </div>

      <div className="space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
        {items.slice(0, 10).map((entry, index) => {
          const isTop3 = index < 3;
          return (
            <div 
              key={entry.user_id} 
              className={`grid grid-cols-[30px_1fr_auto] items-center gap-2 rounded-xl border p-2.5 text-xs transition-all duration-300 hover:translate-x-1 ${
                isTop3
                  ? 'bg-gradient-to-r from-cyan-950/15 via-black/40 to-black/60 border-cyan-500/15 hover:border-cyan-400/30'
                  : 'bg-black/30 border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex justify-center">
                {getRankBadge(index)}
              </div>
              
              <div className="min-w-0">
                <div className="font-black text-slate-100 truncate flex items-center gap-1">
                  {entry.display_name}
                  {index === 0 && (
                    <span className="text-[8px] bg-yellow-500/10 text-yellow-400 font-extrabold uppercase px-1 rounded border border-yellow-500/20">
                      CHAMP
                    </span>
                  )}
                </div>
                <div className="text-[9px] text-slate-500 mt-0.5 flex items-center gap-1 flex-wrap font-medium">
                  <span>Spins: <strong className="text-slate-400 font-bold">{entry.total_spins}</strong></span>
                  <span>•</span>
                  <span>WR: <strong className="text-cyan-400 font-bold">{entry.win_rate.toFixed(0)}%</strong></span>
                  <span>•</span>
                  <span>Jackpots: <strong className="text-fuchsia-400 font-bold">{entry.jackpot_hits}</strong></span>
                </div>
              </div>
              
              <div className="text-right flex flex-col justify-center items-end">
                <div className="font-black text-emerald-400 font-mono tracking-tight flex items-center justify-end gap-0.5">
                  <TrendingUp size={10} className="text-emerald-400" />
                  +{formatNumber(entry.total_winnings)}
                </div>
                <div className="text-[9px] text-slate-500 mt-0.5 font-medium">
                  Max: <strong className="text-slate-400 font-bold">{formatNumber(entry.biggest_win)}</strong>
                </div>
              </div>
            </div>
          );
        })}
        {items.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-600 font-medium">
            No leaderboard data yet.
          </div>
        ) : null}
      </div>
    </section>
  );
};

export const WheelLeaderboard = memo(WheelLeaderboardImpl);
WheelLeaderboard.displayName = 'WheelLeaderboard';


