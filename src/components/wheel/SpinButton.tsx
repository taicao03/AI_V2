import { Play, Loader2 } from 'lucide-react';

type SpinButtonProps = {
  disabled: boolean;
  spinning: boolean;
  onSpin: () => void;
};

export function SpinButton({ disabled, spinning, onSpin }: SpinButtonProps) {
  return (
    <div className="relative group w-full">
      {/* Dynamic Pulse Glow Behind Button (only when not spinning & not disabled) */}
      {!disabled && !spinning && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-600 blur-xl opacity-40 group-hover:opacity-75 transition-opacity duration-300 animate-pulse" />
      )}

      <button
        className={`relative w-full rounded-2xl px-6 py-4 text-sm font-black uppercase tracking-[0.25em] text-white transition-all duration-300 transform active:scale-[0.98] select-none flex items-center justify-center gap-2 overflow-hidden border ${
          spinning
            ? 'bg-slate-900 border-slate-700/60 text-slate-500 cursor-not-allowed shadow-none'
            : disabled
            ? 'bg-slate-900/60 border-white/5 text-slate-500 cursor-not-allowed shadow-none opacity-50'
            : 'bg-gradient-to-r from-cyan-500 via-cyan-400 to-purple-600 border-cyan-300/40 hover:border-cyan-300/80 text-white shadow-[0_0_25px_rgba(34,211,238,0.35),0_0_50px_rgba(168,85,247,0.15)] hover:shadow-[0_0_35px_rgba(34,211,238,0.55),0_0_60px_rgba(168,85,247,0.3)] hover:-translate-y-0.5'
        }`}
        disabled={disabled || spinning}
        onClick={onSpin}
        type="button"
      >
        {spinning ? (
          <>
            <Loader2 className="animate-spin text-cyan-400" size={16} />
            <span className="text-cyan-400 font-extrabold tracking-widest">SPINNING...</span>
          </>
        ) : (
          <>
            <Play size={14} className="fill-current text-white animate-pulse" />
            <span className="font-extrabold">SPIN NOW</span>
          </>
        )}
      </button>
    </div>
  );
}


