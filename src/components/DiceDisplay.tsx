import { Activity, Dices, Layers } from 'lucide-react';
import type { DiceTuple, Outcome } from '../types';
import { formatOutcome, sumDice } from '../lib/dice';

type DiceDisplayProps = {
  dice: DiceTuple;
  rolling: boolean;
  outcome: Outcome;
};

const PIP_POSITIONS: Record<number, number[]> = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

function PipGrid({ value }: { value: number }) {
  const activePips = PIP_POSITIONS[value] ?? PIP_POSITIONS[1];

  return (
    <div className="pip-grid" aria-hidden="true">
      {Array.from({ length: 9 }, (_, index) => {
        const position = index + 1;
        return <span className={`pip ${activePips.includes(position) ? 'bg-[#0f172a] shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),0_0_10px_rgba(34,211,238,0.2)]' : 'opacity-0'}`} key={position} />;
      })}
    </div>
  );
}

function getSideValue(value: number, offset: number): number {
  return ((value + offset - 1) % 6) + 1;
}

function DiceCube({ value, rolling, index }: { value: number; rolling: boolean; index: number }) {
  return (
    <div className="dice-scene group" aria-label={`Dice ${index + 1}: ${value}`}>
      <div className={`dice-cube ${rolling ? 'rolling' : ''}`} style={{ animationDelay: `${index * 120}ms` }}>
        <div className="dice-face dice-front"><PipGrid value={value} /></div>
        <div className="dice-face dice-back"><PipGrid value={getSideValue(value, 3)} /></div>
        <div className="dice-face dice-right"><PipGrid value={getSideValue(value, 1)} /></div>
        <div className="dice-face dice-left"><PipGrid value={getSideValue(value, 4)} /></div>
        <div className="dice-face dice-top"><PipGrid value={getSideValue(value, 2)} /></div>
        <div className="dice-face dice-bottom"><PipGrid value={getSideValue(value, 5)} /></div>
      </div>
      {/* Dynamic shadow under each die */}
      <div className={`mx-auto mt-4 h-2 w-16 rounded-full bg-black/40 blur-md transition-all duration-500 ${rolling ? 'scale-110 opacity-60' : 'scale-100 opacity-30'}`} />
    </div>
  );
}

export function DiceDisplay({ dice, rolling, outcome }: DiceDisplayProps) {
  const total = sumDice(dice);

  return (
    <section className="panel relative overflow-hidden p-8 sm:p-10">
      {/* Background visual elements */}
      <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-cyan-500/50 via-purple-500/50 to-cyan-500/50 opacity-20" />
      <div className="absolute right-10 top-10 flex h-32 w-32 items-center justify-center rounded-full border border-white/5 bg-white/5 opacity-10 blur-2xl" />

      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.1)]">
                <Dices size={22} />
             </div>
             <div className="space-y-1">
                <div className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400/70">Quantum Randomizer</div>
                <h1 className="font-display text-4xl font-black uppercase tracking-tight text-white lg:text-5xl">Dice Predictor <span className="text-cyan-400">Pro</span></h1>
             </div>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-slate-400">
            Real-time provably fair dice simulation. Our algorithm ensures complete transparency and high-fidelity physics for every roll.
          </p>
        </div>

        <div className="flex items-center gap-4 rounded-3xl border border-white/5 bg-black/40 p-1.5 backdrop-blur-2xl">
           <div className="flex flex-col items-center justify-center rounded-2xl bg-white/5 px-6 py-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Result</span>
              <span className="font-display text-5xl font-black text-white">{total}</span>
           </div>
           <div className="flex flex-col gap-2 pr-6">
              <div className={`inline-flex items-center gap-2 rounded-lg px-3 py-1 text-xs font-black uppercase tracking-wider ${
                outcome === 'tai' ? 'bg-cyan-400/20 text-cyan-400' : 'bg-purple-400/20 text-purple-400'
              }`}>
                <Layers size={14} />
                {formatOutcome(outcome)}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Sum of all dice
              </div>
           </div>
        </div>
      </div>

      {/* Main Dice Arena */}
      <div className="relative mt-12 flex min-h-[16rem] items-center justify-center gap-6 rounded-3xl border border-white/5 bg-white/5 py-10 shadow-inner sm:gap-12">
        {/* Subtle grid in background of arena */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        
        {dice.map((value, index) => (
          <DiceCube index={index} key={`${index}-${value}`} rolling={rolling} value={value} />
        ))}
      </div>

      {/* Footer Status */}
      <div className="mt-8 flex items-center justify-between border-t border-white/5 pt-6">
        <div className="flex items-center gap-3">
          <div className="relative flex h-2 w-2">
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${rolling ? 'bg-cyan-400' : 'bg-emerald-400'}`} />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${rolling ? 'bg-cyan-500' : 'bg-emerald-500'}`} />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
            {rolling ? 'RNG System Processing...' : 'Oracle Ready for Prediction'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
           <Activity size={14} className={rolling ? 'animate-pulse text-cyan-400' : 'text-slate-500'} />
           <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Real-time Telemetry</span>
        </div>
      </div>
    </section>
  );
}
