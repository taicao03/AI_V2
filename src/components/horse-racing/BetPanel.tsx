import { Wallet } from 'lucide-react';
import { FormattedInput } from '../FormattedInput';
import { HORSE_QUICK_BETS } from '../../constants/horseConfig';

type BetPanelProps = {
  minBet: number;
  maxBet: number;
  availablePoints: number;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
};

export function BetPanel({ minBet, maxBet, availablePoints, value, disabled, onChange }: BetPanelProps) {
  return (
    <section className="rounded-2xl border border-white/5 bg-white/5 p-5 backdrop-blur-xl shadow-lg relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-cyan-400 opacity-60" />
      
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet size={13} className="text-cyan-400" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Prediction Wager</span>
        </div>
        <div className="rounded-lg border border-white/5 bg-slate-900/60 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-400">
          Avail: <span className="text-emerald-400 font-mono">{availablePoints.toLocaleString()} PTS</span>
        </div>
      </div>
      
      <div className="group relative flex h-14 items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-4 transition-all focus-within:border-cyan-400/50">
        <FormattedInput
          className="min-w-0 flex-1 bg-transparent text-lg font-black text-white outline-none placeholder:text-slate-700"
          value={value}
          onChange={onChange}
        />
        <span className="text-[10px] font-black tracking-[0.2em] text-cyan-400/60 uppercase">PTS</span>
      </div>
      
      <div className="mt-2.5 flex items-center justify-between text-[9px] font-bold text-slate-500 uppercase tracking-widest">
        <span>Bet Limits</span>
        <span className="font-mono text-slate-400">Min {minBet.toLocaleString()} / Max {maxBet.toLocaleString()}</span>
      </div>
      
      <div className="mt-4 grid grid-cols-4 gap-2">
        {HORSE_QUICK_BETS.map((amount) => (
          <button
            key={amount}
            type="button"
            disabled={disabled}
            className="h-10 rounded-xl border border-white/5 bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/10 hover:text-white hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 disabled:opacity-30 disabled:hover:scale-100 disabled:hover:bg-white/5"
            onClick={() => onChange(amount)}
          >
            +{amount.toLocaleString()}
          </button>
        ))}
      </div>
    </section>
  );
}

