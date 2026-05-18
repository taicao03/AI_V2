import { Trophy, Zap, ChevronRight } from 'lucide-react';

export type HeaderWinAlert = {
  id: string;
  displayName: string;
  pointsChange: number;
  createdAt: string;
};

type HeaderWinTickerProps = {
  alerts: HeaderWinAlert[];
};

export function HeaderWinTicker({ alerts }: HeaderWinTickerProps) {
  if (alerts.length === 0) {
    return null;
  }

  // We want to show a good number of items in the marquee
  const tickerItems = alerts.slice(0, 10);

  return (
    <div className="fixed top-14 left-0 right-0 z-[140] pointer-events-none px-4">
      <div className="mx-auto max-w-4xl pointer-events-auto">
        <div className="relative h-8 flex items-center bg-[#020617] border border-white/10 rounded-full overflow-hidden backdrop-blur-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)]">
          {/* Header Icon */}
          <div className="relative z-10 flex items-center justify-center gap-2 px-5 h-full bg-gradient-to-r from-yellow-500 to-amber-600 text-black">
             <Trophy size={11} className="fill-current" />
             <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap translate-y-[0.5px]">Winner Ledger</span>
          </div>

          {/* Marquee Track */}
          <div className="flex-1 overflow-hidden relative h-full flex items-center">
             <div className="header-ticker-track flex items-center gap-10 whitespace-nowrap px-8">
                {[...tickerItems, ...tickerItems].map((alert, idx) => (
                  <div key={`${alert.id}-${idx}`} className="flex items-center gap-3 h-full">
                     <span className="text-[10px] font-black text-white/50 uppercase tracking-tighter translate-y-[0.5px]">
                        {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                     </span>
                     <div className="flex items-center gap-1.5 h-full">
                        <span className="text-[11px] font-black text-white uppercase tracking-tight translate-y-[0.5px]">{alert.displayName}</span>
                        <ChevronRight size={10} className="text-slate-700" />
                        <span className="text-[11px] font-black text-emerald-400 translate-y-[0.5px]">
                           +{alert.pointsChange.toLocaleString()} PTS
                        </span>
                     </div>
                     <div className="h-1 w-1 rounded-full bg-white/10" />
                  </div>
                ))}
             </div>
          </div>

          {/* Decorative Pulse */}
          <div className="absolute right-4 flex items-center gap-2 h-full">
             <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
             <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Live</span>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes header-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .header-ticker-track {
          animation: header-marquee 40s linear infinite;
        }
        .header-ticker-track:hover {
          animation-play-state: paused;
        }
      `}} />
    </div>
  );
}
