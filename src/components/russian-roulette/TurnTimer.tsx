import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

type TurnTimerProps = {
  targetAt: string | null;
  totalSeconds?: number;
  label?: string;
};

export function TurnTimer({ targetAt, totalSeconds = 15, label = 'Turn Timer' }: TurnTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!targetAt) {
      setSecondsLeft(0);
      return;
    }

    const calculateTime = () => {
      const diff = new Date(targetAt).getTime() - Date.now();
      return Math.max(0, Math.ceil(diff / 1000));
    };

    // Initial calculation
    setSecondsLeft(calculateTime());

    // Interval to calculate remaining seconds fluidly
    const interval = setInterval(() => {
      const left = calculateTime();
      setSecondsLeft(left);
      if (left <= 0) {
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [targetAt]);

  const progress = Math.max(0, Math.min(100, (secondsLeft / Math.max(1, totalSeconds)) * 100));
  const isEmergency = secondsLeft <= 4 && secondsLeft > 0;

  return (
    <div className="space-y-3 p-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Clock 
            size={14} 
            className={`transition-all duration-300 ${
              isEmergency 
                ? 'text-rose-500 animate-bounce filter drop-shadow-[0_0_3px_rgba(244,63,94,0.6)]' 
                : 'text-cyan-400 animate-spin-slow'
            }`} 
          />
          <span className="font-extrabold text-[10px] uppercase tracking-[0.2em] text-slate-400 font-display">
            {label}
          </span>
        </div>
        <span 
          className={`font-mono text-2xl font-black transition-all duration-300 ${
            isEmergency 
              ? 'text-rose-500 animate-pulse scale-110 filter drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]' 
              : 'text-cyan-300 font-display filter drop-shadow-[0_0_4px_rgba(34,211,238,0.4)]'
          }`}
        >
          {secondsLeft}s
        </span>
      </div>
      
      {/* High-tech counting bar */}
      <div className="h-2.5 w-full rounded-full bg-slate-950/80 p-0.5 border border-white/5 shadow-inner relative overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 relative ${
            isEmergency 
              ? 'bg-gradient-to-r from-rose-600 to-rose-400 animate-pulse' 
              : 'bg-gradient-to-r from-cyan-600 to-cyan-400'
          }`}
          style={{ width: `${progress}%` }}
        >
          {/* Animated glass shine on bar */}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent)] bg-[size:40px_100%] bg-no-repeat animate-shimmer" />
        </div>
      </div>
    </div>
  );
}

