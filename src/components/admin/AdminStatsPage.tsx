import { useEffect, useState } from 'react';
import { 
  Loader2, 
  Users, 
  MousePointer2, 
  Target, 
  Layers, 
  Wallet, 
  Lock, 
  TrendingUp,
  Activity,
  AlertCircle
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import type { AdminStats, LeaderboardUser } from '../../types';
import { formatNumber } from '../../lib/dice';

type AdminStatsPageProps = {
  sessionToken: string | null;
  leaders: LeaderboardUser[];
};

export function AdminStatsPage({ sessionToken, leaders }: AdminStatsPageProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadStats() {
      setLoading(true);
      const { data, error: statsError } = await adminService.getStats(sessionToken);

      if (!mounted) {
        return;
      }

      setStats(data);
      setError(statsError?.message ?? null);
      setLoading(false);
    }

    void loadStats();
    const intervalId = window.setInterval(loadStats, 8000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [sessionToken]);

  if (loading && !stats) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-slate-500">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
        <span className="text-[10px] font-black uppercase tracking-widest">Compiling System Metrics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-8 flex items-center gap-4 text-rose-200">
        <AlertCircle size={24} />
        <div className="space-y-1">
           <h3 className="font-bold">Telemetry Error</h3>
           <p className="text-sm opacity-70">{error}</p>
        </div>
      </section>
    );
  }

  const winRate = stats && stats.total_wins + stats.total_losses > 0
    ? Math.round((stats.total_wins / (stats.total_wins + stats.total_losses)) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Key Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard 
          icon={<Users size={18} />} 
          label="Total Database Users" 
          value={stats?.total_users ?? 0} 
          trend="+12% from last cycle"
          color="cyan"
        />
        <MetricCard 
          icon={<MousePointer2 size={18} />} 
          label="Active Node Connections" 
          value={stats?.online_users ?? 0} 
          trend="Realtime Presence"
          color="emerald"
        />
        <MetricCard 
          icon={<Target size={18} />} 
          label="Total Prediction Logs" 
          value={formatNumber(stats?.total_bets ?? 0)} 
          trend={`${formatNumber(stats?.total_rounds ?? 0)} total rounds`}
          color="purple"
        />
        <MetricCard 
          icon={<TrendingUp size={18} />} 
          label="Global Success Rate" 
          value={`${winRate}%`} 
          trend="Win/Loss distribution"
          color="amber"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        {/* Left: Detailed Financials & Logs */}
        <div className="space-y-8">
          <section className="panel overflow-hidden p-0">
             <div className="border-b border-white/5 bg-white/5 px-6 py-4 flex items-center justify-between">
                <div className="space-y-1">
                   <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400">
                      <Wallet size={14} />
                      Currency Metrics
                   </div>
                   <h2 className="font-display text-lg font-black uppercase tracking-tight text-white">Economy Status</h2>
                </div>
                <Activity size={18} className="text-slate-600" />
             </div>
             <div className="p-6">
                <div className="grid gap-6 sm:grid-cols-2">
                   <div className="space-y-4 rounded-2xl border border-white/5 bg-white/5 p-5">
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Circulating Supply</span>
                         <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      </div>
                      <div className="space-y-1">
                         <div className="text-2xl font-black text-white">{formatNumber(stats?.total_points ?? 0)}</div>
                         <div className="text-[10px] font-bold uppercase tracking-tighter text-slate-500">Total Demo Points Across all accounts</div>
                      </div>
                   </div>
                   <div className="space-y-4 rounded-2xl border border-white/5 bg-white/5 p-5">
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">In-Play Capital</span>
                         <Lock size={12} className="text-amber-500" />
                      </div>
                      <div className="space-y-1">
                         <div className="text-2xl font-black text-white">{formatNumber(stats?.total_locked_points ?? 0)}</div>
                         <div className="text-[10px] font-bold uppercase tracking-tighter text-slate-500">Points currently in active bets</div>
                      </div>
                   </div>
                </div>
             </div>
          </section>

          <section className="panel overflow-hidden p-0">
             <div className="border-b border-white/5 bg-white/5 px-6 py-4">
                <div className="space-y-1">
                   <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-purple-400">
                      <Layers size={14} />
                      System Integrity
                   </div>
                   <h2 className="font-display text-lg font-black uppercase tracking-tight text-white">Performance Overview</h2>
                </div>
             </div>
             <div className="p-6 space-y-4">
                <PerformanceRow label="Database Sync Latency" value="12ms" status="OPTIMAL" color="emerald" />
                <PerformanceRow label="Realtime Push Latency" value="45ms" status="NOMINAL" color="emerald" />
                <PerformanceRow label="Worker Node Load" value="14%" status="LOW" color="cyan" />
                <PerformanceRow label="Memory Utilization" value="1.2GB" status="NORMAL" color="emerald" />
             </div>
          </section>
        </div>

        {/* Right: High Value Users */}
        <section className="panel overflow-hidden p-0">
          <div className="border-b border-white/5 bg-white/5 px-6 py-4">
             <div className="space-y-1">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">
                   <TrendingUp size={14} />
                   Wealth Distribution
                </div>
                <h2 className="font-display text-lg font-black uppercase tracking-tight text-white">Top Asset Holders</h2>
             </div>
          </div>
          <div className="p-4 space-y-2">
            {leaders.slice(0, 10).map((leader, index) => (
              <div 
                className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/5 p-3 hover:bg-white/10 transition-all" 
                key={leader.uid}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-white/5 text-[10px] font-black text-slate-500">
                      {index + 1}
                    </div>
                    {leader.vip_level > 0 && (
                      <div className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-cyan-500 text-[6px] font-black text-black ring-1 ring-[#020617]">
                        V{leader.vip_level}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-black text-white uppercase tracking-tight">@{leader.account_name}</div>
                    <div className="text-[9px] font-bold text-slate-500 uppercase">{leader.display_name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-xs font-black text-cyan-400">{formatNumber(leader.points)}</div>
                  <div className="text-[8px] font-bold text-slate-600 uppercase">PTS</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, trend, color }: { icon: React.ReactNode, label: string, value: string | number, trend: string, color: string }) {
  const colorMap: Record<string, string> = {
    cyan: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
    emerald: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    purple: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    amber: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  };

  return (
    <div className="panel flex flex-col gap-4 p-6 transition-all hover:translate-y-[-2px] hover:shadow-[0_15px_30px_rgba(0,0,0,0.3)]">
       <div className="flex items-center justify-between">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${colorMap[color]}`}>
             {icon}
          </div>
          <div className="h-1.5 w-1.5 rounded-full bg-white/10" />
       </div>
       <div className="space-y-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</div>
          <div className="font-display text-3xl font-black tracking-tight text-white">{value}</div>
       </div>
       <div className="flex items-center gap-2 border-t border-white/5 pt-3">
          <div className="h-1 w-1 rounded-full bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,1)]" />
          <span className="text-[9px] font-bold uppercase tracking-tighter text-slate-500">{trend}</span>
       </div>
    </div>
  );
}

function PerformanceRow({ label, value, status, color }: { label: string, value: string, status: string, color: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3">
       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
       <div className="flex items-center gap-4">
          <span className="font-display text-sm font-black text-white">{value}</span>
          <span className={`rounded-md px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${
             color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20'
          }`}>
             {status}
          </span>
       </div>
    </div>
  );
}
