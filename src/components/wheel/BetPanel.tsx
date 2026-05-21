import { memo } from 'react';
import { Minus, Plus, Coins } from 'lucide-react';
import { WHEEL_QUICK_BETS } from '../../constants/wheelConfig';
import { formatNumber } from '../../lib/formatHelpers';
import { FormattedInput } from '../FormattedInput';

type BetPanelProps = {
  minBet: number;
  maxBet: number;
  value: number;
  maxAvailable: number;
  onChange: (next: number) => void;
};

const BetPanelImpl = ({ minBet, maxBet, value, maxAvailable, onChange }: BetPanelProps) => {
  const limitedMax = Math.max(minBet, Math.min(maxBet, maxAvailable));

  const handleIncrement = () => {
    onChange(Math.min(value + 10, limitedMax));
  };

  const handleDecrement = () => {
    onChange(Math.max(value - 10, minBet));
  };

  const handleMultiply = (factor: number) => {
    onChange(Math.max(minBet, Math.min(Math.round(value * factor), limitedMax)));
  };

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-gradient-to-br from-[#0b0f19] to-[#04060c] p-4 sm:p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_10px_30px_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-400">
          <Coins size={12} className="text-cyan-400 animate-pulse animate-duration-1000" />
          Bet Amount
        </div>
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Available: <span className="font-black text-cyan-300">{formatNumber(maxAvailable)}</span>
        </div>
      </div>

      {/* Input row with minus / plus */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleDecrement}
          disabled={value <= minBet}
          className="w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 bg-black/40 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 active:scale-95 disabled:opacity-40 disabled:hover:text-slate-400 disabled:hover:border-white/10 disabled:cursor-not-allowed transition-all"
          type="button"
        >
          <Minus size={16} />
        </button>

        <div className="relative flex-1">
          <FormattedInput
            className="form-input w-full text-center text-lg font-black text-cyan-100 bg-black/40 border border-white/10 hover:border-white/20 focus:border-cyan-400/80 focus:shadow-[0_0_15px_rgba(34,211,238,0.15)] rounded-xl py-2 px-3 transition-all"
            value={value}
            onChange={onChange}
          />
        </div>

        <button
          onClick={handleIncrement}
          disabled={value >= limitedMax}
          className="w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 bg-black/40 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 active:scale-95 disabled:opacity-40 disabled:hover:text-slate-400 disabled:hover:border-white/10 disabled:cursor-not-allowed transition-all"
          type="button"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Quick Bet Buttons Styled as Chips / Gaming Controls */}
      <div className="grid grid-cols-5 gap-1.5">
        {/* Multiplying controls */}
        <button
          className="choice-button py-2 px-1 text-[10px] font-black uppercase text-slate-300 hover:text-cyan-300 hover:border-cyan-500/30 flex items-center justify-center"
          onClick={() => handleMultiply(0.5)}
          type="button"
        >
          1/2
        </button>
        
        <button
          className="choice-button py-2 px-1 text-[10px] font-black uppercase text-slate-300 hover:text-cyan-300 hover:border-cyan-500/30 flex items-center justify-center"
          onClick={() => handleMultiply(2)}
          type="button"
        >
          2X
        </button>

        {/* Concrete numbers */}
        {WHEEL_QUICK_BETS.slice(0, 2).map((bet) => (
          <button
            key={bet}
            className={`choice-button py-2 px-1 text-[10px] font-black uppercase transition-all flex items-center justify-center ${
              value === bet
                ? 'border-cyan-400 bg-cyan-500/10 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.15)]'
                : 'text-slate-300 hover:text-cyan-300 hover:border-cyan-500/30'
            }`}
            onClick={() => onChange(Math.max(minBet, Math.min(bet, limitedMax)))}
            type="button"
          >
            {bet >= 1000 ? `${bet/1000}k` : bet}
          </button>
        ))}

        <button
          className="choice-button py-2 px-1 text-[10px] font-black uppercase text-cyan-400 hover:text-cyan-300 border-cyan-500/20 hover:border-cyan-400/50 hover:bg-cyan-500/10 flex items-center justify-center"
          onClick={() => onChange(limitedMax)}
          type="button"
        >
          MAX
        </button>
      </div>

      <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 tracking-wider">
        <span>MIN: {formatNumber(minBet)}</span>
        <span>MAX: {formatNumber(maxBet)}</span>
      </div>
    </div>
  );
};

export const BetPanel = memo(BetPanelImpl);
BetPanel.displayName = 'BetPanel';


