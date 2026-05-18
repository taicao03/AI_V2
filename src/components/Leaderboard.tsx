import { Crown, Loader2, Trophy, Medal } from 'lucide-react';
import type { LeaderboardUser } from '../types';
import { formatNumber } from '../lib/dice';

type LeaderboardProps = {
  leaders: LeaderboardUser[];
  loading: boolean;
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function Leaderboard({ leaders, loading }: LeaderboardProps) {
  return (
    <section className="panel overflow-hidden p-0 bg-transparent border-white/5 backdrop-blur-none shadow-none">
      <div className="px-2 py-4 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-500">
               <Trophy size={18} />
            </div>
            <div className="space-y-0.5">
               <h2 className="font-display text-sm font-black uppercase tracking-tight text-white italic">Elite Rankings</h2>
               <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                  <ActivityIcon size={10} className="text-emerald-500" />
                  Live Sync
               </div>
            </div>
         </div>
         <Crown size={18} className="text-slate-700" />
      </div>

      <div className="space-y-2 mt-2">
        {loading ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">Accessing Ledger...</span>
          </div>
        ) : leaders.length === 0 ? (
          <div className="p-8 text-center text-[10px] font-bold uppercase tracking-widest text-slate-600">
             No active records
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {leaders.map((leader, index) => (
              <div 
                className={`group flex items-center justify-between gap-3 rounded-2xl border p-3 transition-all ${
                  index === 0 ? 'bg-yellow-500/10 border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.05)]' : 
                  'bg-white/5 border-white/5 hover:bg-white/[0.08] hover:border-white/10'
                }`} 
                key={leader.uid}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-display text-[10px] font-black ${
                    index === 0 ? 'bg-yellow-500 text-black' : 
                    index === 1 ? 'bg-slate-300 text-black' :
                    index === 2 ? 'bg-amber-700 text-white' : 'text-slate-600'
                  }`}>
                    {index + 1}
                  </div>
                  
                  <div className="relative shrink-0">
                    {leader.avatar_url ? (
                      <img alt="" className="h-9 w-9 rounded-xl object-cover ring-1 ring-white/10" src={leader.avatar_url} />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 border border-white/5 text-[10px] font-black text-slate-500">
                        {getInitials(leader.display_name) || 'DP'}
                      </div>
                    )}
                    {leader.vip_level > 0 && (
                      <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-[7px] font-black text-black ring-2 ring-[#020617]">
                        V{leader.vip_level}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-xs font-black text-white tracking-tight uppercase group-hover:text-cyan-400 transition-colors">
                       {leader.display_name}
                    </div>
                    <div className="text-[9px] font-bold text-slate-600 tracking-wider">@{leader.account_name}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`font-display text-xs font-black tracking-tighter ${index === 0 ? 'text-yellow-400' : 'text-white/80'}`}>
                    {formatNumber(leader.points)}
                  </div>
                  <div className="text-[8px] font-bold uppercase text-slate-700 tracking-tighter">PTS</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ActivityIcon({ size, className }: { size: number, className?: string }) {
   return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
         <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
   );
}
