import { Gift, Loader2, Trophy, User, Target, BarChart3 } from 'lucide-react';
import type { ProfileStats, UserProfile } from '../types';
import { PointsDisplay } from './PointsDisplay';
import { formatNumber } from '../lib/dice';

type ProfileCardProps = {
  profile: UserProfile | null;
  stats: ProfileStats;
  loading: boolean;
  claimLoading: boolean;
  onClaimDemoPoints: () => void;
};

export function ProfileCard({ profile, stats, loading, claimLoading, onClaimDemoPoints }: ProfileCardProps) {
  return (
    <section className="panel overflow-hidden p-0 bg-transparent border-white/5 backdrop-blur-none shadow-none">
      <div className="px-2 py-4 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
               <User size={18} />
            </div>
            <div className="space-y-0.5">
               <h2 className="font-display text-sm font-black uppercase tracking-tight text-white italic">Dossier: Personnel</h2>
               <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                  Operational Intel
               </div>
            </div>
         </div>
         <BarChart3 size={18} className="text-slate-700" />
      </div>

      {!profile ? (
        <div className="mt-4 rounded-2xl border border-dashed border-white/5 bg-white/[0.02] p-8 text-center">
           <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Authentication Required</p>
        </div>
      ) : loading ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">Decrypting Profile...</span>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {/* Identity Header */}
          <div className="rounded-2xl bg-white/5 border border-white/5 p-4 flex items-center justify-between">
             <div className="space-y-0.5">
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Identity</div>
                <div className="text-sm font-black text-white uppercase tracking-tight">@{profile.account_name}</div>
             </div>
             {profile.vip_level > 0 && (
                <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 px-2 py-1 text-[9px] font-black text-purple-400 uppercase tracking-widest">
                   VIP LVL {profile.vip_level}
                </div>
             )}
          </div>

          {/* Core Balance */}
          <div className="rounded-2xl bg-gradient-to-br from-cyan-500/10 to-purple-600/10 border border-white/5 p-5">
             <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Net worth</span>
                <Trophy size={14} className="text-cyan-500/50" />
             </div>
             <div className="font-display text-3xl font-black text-white tracking-tighter mb-4">
                {stats.totalPoints.toLocaleString()}
                <span className="ml-2 text-xs text-slate-600 uppercase">pts</span>
             </div>
             <PointsDisplay profile={profile} />
          </div>

          {/* Grid Metrics */}
          <div className="grid grid-cols-2 gap-2">
            <MetricBox label="Execution rate" value={`${stats.winRate}%`} subValue="W/L ratio" />
            <MetricBox label="Total ops" value={formatNumber(stats.totalBets)} subValue="Successful rolls" />
            <MetricBox 
              label="Peak Yield" 
              value={`+${formatNumber(stats.biggestWin)}`} 
              subValue="Max payout" 
              color="text-emerald-400" 
            />
            <MetricBox 
              label="Max Exposure" 
              value={formatNumber(stats.biggestLoss)} 
              subValue="Drawdown" 
              color="text-rose-400" 
            />
          </div>

          {/* Emergency Funds */}
          {profile.points - profile.locked_points <= 0 && (
            <button
              className="group w-full flex items-center justify-center gap-3 rounded-2xl bg-emerald-500 text-black p-4 text-[11px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30"
              disabled={claimLoading}
              onClick={onClaimDemoPoints}
              type="button"
            >
              {claimLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift size={16} />}
              Request Resource Drop
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function MetricBox({ label, value, subValue, color = "text-white" }: { label: string, value: string, subValue: string, color?: string }) {
   return (
      <div className="rounded-2xl bg-white/5 border border-white/5 p-4 space-y-1">
         <div className="text-[9px] font-black uppercase tracking-widest text-slate-600 truncate">{label}</div>
         <div className={`font-display text-lg font-black tracking-tighter ${color}`}>{value}</div>
         <div className="text-[8px] font-bold uppercase text-slate-700 tracking-tighter">{subValue}</div>
      </div>
   );
}
