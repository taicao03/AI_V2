import { CheckCircle2, XCircle, X, ShieldCheck, ShieldAlert, TrendingUp, TrendingDown } from 'lucide-react';
import { formatNumber } from '../lib/dice';

export type PrivateResultPopupItem = {
  id: string;
  result: 'win' | 'lose';
  pointsChange: number;
};

type PrivateResultPopupsProps = {
  items: PrivateResultPopupItem[];
  onClose: (id: string) => void;
};

function formatSignedPoints(value: number) {
  const absoluteValue = formatNumber(Math.abs(value));
  return `${value >= 0 ? '+' : '-'} ${absoluteValue}`;
}

export function PrivateResultPopups({ items, onClose }: PrivateResultPopupsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-8 right-8 z-[250] flex flex-col gap-4 max-w-sm w-full pointer-events-none" aria-live="polite">
      {items.map((item) => {
        const isWin = item.result === 'win';

        return (
          <div 
            key={item.id}
            className={`pointer-events-auto relative overflow-hidden rounded-3xl border backdrop-blur-xl shadow-2xl transition-all animate-in slide-in-from-right-4 duration-500 ${
              isWin 
                ? 'border-emerald-500/30 bg-[#064e3b]/40 shadow-emerald-500/10' 
                : 'border-rose-500/30 bg-[#4c0519]/40 shadow-rose-500/10'
            }`}
          >
            {/* Background Glow */}
            <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full blur-[60px] opacity-20 ${
              isWin ? 'bg-emerald-400' : 'bg-rose-400'
            }`} />

            <div className="relative p-5 flex items-center gap-4">
               {/* Icon Container */}
               <div className={`h-14 w-14 shrink-0 flex items-center justify-center rounded-2xl border transition-transform group-hover:scale-110 ${
                 isWin 
                   ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.2)]' 
                   : 'border-rose-400/20 bg-rose-400/10 text-rose-400 shadow-[0_0_15px_rgba(251,113,133,0.2)]'
               }`}>
                  {isWin ? <ShieldCheck size={28} /> : <ShieldAlert size={28} />}
               </div>

               {/* Content */}
               <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                     <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isWin ? 'Quantum Alignment Success' : 'Neural Synchronization Error'}
                     </span>
                  </div>
                  <div className="flex items-center justify-between">
                     <h3 className="font-display text-xl font-black text-white uppercase tracking-tight italic">
                        {isWin ? 'Prediction: Verified' : 'Prediction: Mismatch'}
                     </h3>
                  </div>
                  <div className={`flex items-center gap-1.5 font-display text-2xl font-black ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                     {isWin ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                     <span>{formatSignedPoints(item.pointsChange)}</span>
                     <span className="text-[10px] uppercase opacity-60 ml-1">PTS</span>
                  </div>
               </div>

               {/* Close Button */}
               <button 
                 onClick={() => onClose(item.id)}
                 className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-xl bg-white/5 text-slate-500 hover:text-white hover:bg-white/10 transition-all"
                 type="button"
               >
                 <X size={16} />
               </button>
            </div>

            {/* Bottom Accent Bar */}
            <div className={`h-[2px] w-full ${isWin ? 'bg-emerald-500/50' : 'bg-rose-500/50'}`} />
          </div>
        );
      })}
    </div>
  );
}
