import { Dice5, Loader2, Target, Wallet, Zap } from 'lucide-react';
import type { Outcome, Prediction } from '../types';
import { BET_PRESETS, formatNumber, formatOutcome, formatPrediction, TOTAL_VALUES, validateBetAmount } from '../lib/dice';

export type RollFeedback = {
  result: 'pending' | 'win' | 'lose';
  total?: number;
  outcome?: Outcome;
  pointsChange: number;
  roundEndsAt?: string;
};

type PredictionPanelProps = {
  prediction: Prediction;
  onPredictionChange: (prediction: Prediction) => void;
  betAmount: number;
  onBetAmountChange: (value: number) => void;
  onRoll: () => void;
  rolling: boolean;
  disabled: boolean;
  isAuthenticated: boolean;
  availablePoints: number;
  feedback: RollFeedback | null;
};

function isSelected(prediction: Prediction, candidate: Prediction): boolean {
  return prediction.kind === candidate.kind && prediction.value === candidate.value;
}

export function PredictionPanel({
  prediction,
  onPredictionChange,
  betAmount,
  onBetAmountChange,
  onRoll,
  rolling,
  disabled,
  isAuthenticated,
  availablePoints,
  feedback,
}: PredictionPanelProps) {
  const betError = isAuthenticated ? validateBetAmount(betAmount, availablePoints) : 'Login required to place bets.';
  const canRoll = !disabled && !rolling && !betError;

  const handlePercentBet = (percent: number) => {
    const amount = Math.floor(availablePoints * (percent / 100));
    onBetAmountChange(Math.max(1, amount));
  };

  return (
    <div className="mx-auto max-w-2xl w-full">
      <section className="panel group overflow-hidden p-0 border-white/20 shadow-[0_0_50px_rgba(34,211,238,0.05)]">
        {/* Header */}
        <div className="relative border-b border-white/5 bg-white/5 px-8 py-6 flex items-center justify-between">
           <div className="space-y-1">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400">
                <Target size={14} />
                Protocol: Execution
              </div>
              <h2 className="font-display text-2xl font-black tracking-tight text-white uppercase italic">Arena Selection</h2>
           </div>
           
           <div className="flex flex-col items-end gap-1.5">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Live Target</span>
              <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-black uppercase text-white shadow-[0_0_15px_rgba(34,211,238,0.15)] animate-pulse">
                {formatPrediction(prediction)}
              </div>
           </div>
        </div>

        <div className="p-8 space-y-10">
          {/* Main Outcomes */}
          <div className="grid gap-4 sm:grid-cols-2">
            {(['tai', 'xiu'] as const).map((outcome) => {
              const candidate: Prediction = { kind: 'outcome', value: outcome };
              const selected = isSelected(prediction, candidate);

              return (
                <button
                  aria-pressed={selected}
                  key={outcome}
                  onClick={() => onPredictionChange(candidate)}
                  className={`relative flex flex-col items-center justify-center gap-2 py-8 rounded-3xl border transition-all ${
                    selected 
                      ? 'border-cyan-400/50 bg-cyan-400/10 text-white shadow-[0_0_30px_rgba(34,211,238,0.1)]' 
                      : 'border-white/5 bg-white/5 text-slate-500 hover:border-white/20 hover:bg-white/[0.08]'
                  }`}
                  type="button"
                >
                  <span className={`font-display text-3xl font-black uppercase tracking-widest ${selected ? 'text-white' : 'opacity-40'}`}>
                    {formatOutcome(outcome)}
                  </span>
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${selected ? 'text-cyan-400' : 'text-slate-600'}`}>
                    {outcome === 'tai' ? 'Points 11-18' : 'Points 03-10'}
                  </span>
                  {selected && (
                    <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Specific Totals */}
          <div className="space-y-4">
             <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Specific Totals</span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
             </div>
             <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {TOTAL_VALUES.map((total) => {
                  const candidate: Prediction = { kind: 'total', value: total };
                  const selected = isSelected(prediction, candidate);
                  return (
                    <button
                      key={total}
                      onClick={() => onPredictionChange(candidate)}
                      className={`h-11 rounded-xl border text-sm font-black transition-all ${
                        selected 
                          ? 'border-purple-400/50 bg-purple-400/20 text-white' 
                          : 'border-white/5 bg-white/5 text-slate-500 hover:border-white/10 hover:text-white'
                      }`}
                      type="button"
                    >
                      {total}
                    </button>
                  );
                })}
             </div>
          </div>

          {/* Wager Control */}
          <div className="space-y-6">
             <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                   <Wallet size={14} className="text-cyan-400" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Capital Deployment</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400">
                   <span className="opacity-40">Available:</span>
                   <span className="text-cyan-400">{formatNumber(availablePoints)} PTS</span>
                </div>
             </div>

             <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                 <div className="group relative flex h-14 items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-4 transition-all focus-within:border-cyan-400/50">
                    <Zap size={16} className="text-cyan-400 opacity-50" />
                    <input
                      className="min-w-0 flex-1 bg-transparent text-lg font-black text-white outline-none placeholder:text-slate-700"
                      min={1}
                      onChange={(event) => onBetAmountChange(Number(event.target.value))}
                      placeholder="0.00"
                      type="number"
                      value={Number.isNaN(betAmount) ? '' : betAmount}
                    />
                    <span className="text-[11px] font-black tracking-[0.2em] text-cyan-400/60 uppercase">PTS</span>
                 </div>
                <div className="grid grid-cols-3 gap-2">
                   {[25, 50, 100].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => handlePercentBet(pct)}
                        className="h-14 px-5 rounded-xl border border-white/5 bg-white/5 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/10 hover:text-white transition-all"
                        type="button"
                      >
                        {pct === 100 ? 'MAX' : `${pct}%`}
                      </button>
                   ))}
                </div>
             </div>

             {betError && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 p-4 text-[10px] font-black uppercase text-rose-400 border border-rose-500/20">
                   <AlertCircleIcon size={14} />
                   {betError}
                </div>
             )}
          </div>

          {/* Feedback */}
          {feedback && (
            <div className={`rounded-2xl border p-6 transition-all animate-in slide-in-from-bottom-2 ${
              feedback.result === 'pending' ? 'border-cyan-400/20 bg-cyan-400/5' :
              feedback.result === 'win' ? 'border-emerald-400/20 bg-emerald-400/5' : 'border-rose-400/20 bg-rose-400/5'
            }`}>
               <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                     <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Settlement Status</span>
                     <span className={`text-[10px] font-black uppercase tracking-widest ${
                       feedback.result === 'win' ? 'text-emerald-400' : feedback.result === 'lose' ? 'text-rose-400' : 'text-cyan-400'
                     }`}>
                        {feedback.result}
                     </span>
                  </div>
                  <p className="text-sm font-bold text-white">
                     {feedback.result === 'pending' ? 'Transmission successful. Awaiting temporal roll...' :
                      feedback.result === 'win' ? 'Quantum alignment verified. Wager won.' : 'Roll mismatch detected. Account debited.'}
                  </p>
                  {feedback.pointsChange !== 0 && (
                    <div className={`mt-2 font-display text-xl font-black ${feedback.pointsChange > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                       {feedback.pointsChange > 0 ? '+' : ''}{formatNumber(feedback.pointsChange)} PTS
                    </div>
                  )}
               </div>
            </div>
          )}

          {/* Action */}
          <button
            disabled={!canRoll}
            onClick={onRoll}
            className="group relative h-20 w-full overflow-hidden rounded-3xl bg-white text-black transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-20 disabled:hover:scale-100"
            type="button"
          >
             <div className="relative z-10 flex items-center justify-center gap-3">
                {rolling ? <Loader2 className="h-6 w-6 animate-spin" /> : <Zap size={20} className="fill-current" />}
                <span className="font-display text-lg font-black uppercase tracking-[0.3em]">
                   {rolling ? 'Settling...' : 'Execute Wager'}
                </span>
             </div>
             {canRoll && (
               <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-purple-500 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" style={{ mixBlendMode: 'screen' }} />
             )}
          </button>
        </div>
      </section>
    </div>
  );
}

function AlertCircleIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
