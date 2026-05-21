import { memo } from 'react';
import { Clock, Trophy, ArrowUpRight, ArrowDownRight, Coins } from 'lucide-react';
import { formatNumber } from '../../lib/dice';
import type { WheelSpin } from '../../types/wheel';

type WheelHistoryProps = {
  title: string;
  spins: WheelSpin[];
};

const WheelHistoryImpl = ({ title, spins }: WheelHistoryProps) => {
  const isWinnersList = title.toLowerCase().includes('winner');

  return (
    <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#060a16] to-[#03050c] p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_10px_35px_rgba(0,0,0,0.5)]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
          {isWinnersList ? (
            <Trophy size={12} className="text-amber-400 animate-bounce" />
          ) : (
            <Clock size={12} className="text-cyan-400 animate-pulse" />
          )}
          {title}
        </div>
        <span className="text-[8px] bg-slate-800/60 text-slate-400 font-extrabold uppercase px-1.5 py-0.5 rounded border border-white/5">
          {isWinnersList ? 'Big Wins' : 'Recent'}
        </span>
      </div>

      <div className="max-h-[300px] space-y-2 overflow-y-auto custom-scrollbar pr-1">
        {spins.map((spin) => {
          const net = spin.result_amount - spin.bet_amount;
          const isWin = net >= 0;
          return (
            <div 
              key={spin.spin_id} 
              className="group rounded-xl border border-white/5 bg-black/35 hover:bg-black/50 hover:border-white/10 p-3 text-xs transition-all duration-200"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-black text-slate-100 group-hover:text-white transition-colors">{spin.display_name}</span>
                <span 
                  className={`font-black font-mono flex items-center gap-0.5 ${
                    isWin 
                      ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.2)]' 
                      : 'text-rose-400'
                  }`}
                >
                  {isWin ? (
                    <>
                      <ArrowUpRight size={12} className="text-emerald-400" />
                      +{formatNumber(net)}
                    </>
                  ) : (
                    <>
                      <ArrowDownRight size={12} className="text-rose-400" />
                      {formatNumber(net)}
                    </>
                  )}
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[9px] text-slate-500 font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="bg-cyan-950/40 border border-cyan-800/30 text-cyan-400 font-bold px-1.5 py-0.2 rounded">
                    {spin.label}
                  </span>
                  <span className="text-fuchsia-400 font-black">
                    x{spin.multiplier}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 text-slate-400 font-medium">
                  <Coins size={10} className="text-slate-500" />
                  <span>Bet: <strong className="text-slate-300 font-bold">{formatNumber(spin.bet_amount)}</strong></span>
                </div>
              </div>
            </div>
          );
        })}
        {spins.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-600 font-medium">
            No data yet.
          </div>
        ) : null}
      </div>
    </section>
  );
};

export const WheelHistory = memo(WheelHistoryImpl);
WheelHistory.displayName = 'WheelHistory';


