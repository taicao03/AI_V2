import { Clock, Loader2, Zap } from 'lucide-react';
import type { DiceRound, DiceRoundBetTotals } from '../types';

type RoundTimerProps = {
  currentRound: DiceRound | null;
  currentRoundBetTotals: DiceRoundBetTotals;
  secondsLeft: number;
  settling: boolean;
};

export function RoundTimer({ currentRound, currentRoundBetTotals, secondsLeft, settling }: RoundTimerProps) {
  const progress = (secondsLeft / 30) * 100;
  const isCritical = secondsLeft <= 5 && !settling;

  return (
    <section className="panel group relative overflow-hidden p-6 sm:p-8">
      {/* Background glow effect */}
      <div className={`absolute -right-10 -top-10 h-40 w-40 rounded-full blur-[80px] transition-colors duration-1000 ${
        settling ? 'bg-purple-500/10' : isCritical ? 'bg-rose-500/20' : 'bg-cyan-500/10'
      }`} />

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${
              settling ? 'bg-purple-500/20 text-purple-400' : 'bg-cyan-500/20 text-cyan-400'
            }`}>
              <Clock size={14} className={settling ? 'animate-pulse' : ''} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">System Round Status</span>
          </div>
          
          <div className="space-y-1">
            <h2 className="font-display text-3xl font-black tracking-tight text-white uppercase">
              {settling ? (
                <span className="flex items-center gap-3 text-purple-400">
                  Settling Round <Loader2 size={24} className="animate-spin" />
                </span>
              ) : (
                <>Time Remaining: <span className={isCritical ? 'text-rose-500 animate-pulse' : 'text-cyan-400'}>{secondsLeft}s</span></>
              )}
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-slate-400">
              Predictions close when the timer reaches zero. System will automatically roll and settle all bets.
            </p>
          </div>

          <div className="flex items-center gap-4 pt-2">
             <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-1.5 backdrop-blur-md">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Current ID:</span>
                <span className="font-display text-xs font-black tracking-tighter text-cyan-400/80">
                  #{currentRound?.round_id?.slice(0, 8) ?? 'PENDING'}
                </span>
             </div>
             <div className="flex items-center gap-1.5">
                <div className={`h-1.5 w-1.5 rounded-full ${connected_color(settling, isCritical)}`} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Live Sync</span>
             </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-cyan-200">
              Tong cuoc Tai: {currentRoundBetTotals.tai.toLocaleString()}
            </div>
            <div className="rounded-lg border border-sky-400/20 bg-sky-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-sky-200">
              Tong cuoc Xiu: {currentRoundBetTotals.xiu.toLocaleString()}
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-300">
              Tong: {currentRoundBetTotals.total.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="round-countdown relative z-10 flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl border-2 border-white/5 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-2xl transition-all duration-300">
            {settling ? (
              <Loader2 className="h-10 w-10 animate-spin text-purple-400" />
            ) : (
              <div className="flex flex-col items-center">
                <span className={`text-5xl font-black ${isCritical ? 'text-rose-500' : 'text-white'}`}>{secondsLeft}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">SEC</span>
              </div>
            )}
            
            {/* Animated accent lines */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute h-full w-px left-1/4 bg-white/10" />
              <div className="absolute h-full w-px right-1/4 bg-white/10" />
              <div className="absolute w-full h-px top-1/4 bg-white/10" />
              <div className="absolute w-full h-px bottom-1/4 bg-white/10" />
            </div>
          </div>
          
          {/* External glow */}
          <div className={`absolute h-40 w-40 rounded-full blur-3xl opacity-20 ${
            settling ? 'bg-purple-500' : isCritical ? 'bg-rose-500' : 'bg-cyan-500'
          }`} />
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="mt-8 space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Zap size={10} className={isCritical ? 'text-rose-500' : 'text-cyan-400'} />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Network Latency Compensation</span>
          </div>
          <span className="text-[9px] font-black text-slate-500 uppercase">{Math.round(progress)}% Remaining</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5 p-[1px]">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              settling 
                ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]' 
                : isCritical 
                ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' 
                : 'bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_10px_rgba(34,211,238,0.5)]'
            }`}
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      </div>
    </section>
  );
}

function connected_color(settling: boolean, isCritical: boolean) {
  if (settling) return 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,1)]';
  if (isCritical) return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,1)]';
  return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)]';
}
