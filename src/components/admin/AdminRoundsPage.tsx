import { useCallback, useEffect, useState } from 'react';
import { 
  History, 
  RefreshCw, 
  Ban, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Zap,
  MoreHorizontal,
  ChevronRight
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import type { DiceRound } from '../../types';

type AdminRoundsPageProps = {
  sessionToken: string | null;
};

export function AdminRoundsPage({ sessionToken }: AdminRoundsPageProps) {
  const [rounds, setRounds] = useState<DiceRound[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRounds = useCallback(async () => {
    const { data, error: roundsError } = await adminService.listRounds();
    setRounds(data);
    setError(roundsError?.message ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadRounds();
    const intervalId = window.setInterval(loadRounds, 6000);
    return () => window.clearInterval(intervalId);
  }, [loadRounds]);

  async function forceSettle(roundId: string) {
    const { error: settleError } = await adminService.forceSettleRound(sessionToken, roundId);
    setError(settleError?.message ?? null);
    await loadRounds();
  }

  async function cancelRound(roundId: string) {
    const { error: cancelError } = await adminService.cancelRound(sessionToken, roundId);
    setError(cancelError?.message ?? null);
    await loadRounds();
  }

  return (
    <section className="panel overflow-hidden p-0">
      <div className="border-b border-white/5 bg-white/5 px-6 py-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-purple-400">
            <History size={14} />
            Temporal Sequencing
          </div>
          <h2 className="font-display text-xl font-black uppercase tracking-tight text-white">Round Audit Ledger</h2>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/5 px-3 py-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,1)]" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Auto-Sync Active</span>
           </div>
           <button 
             onClick={() => void loadRounds()}
             className="p-2 text-slate-500 hover:text-white transition-colors"
           >
             <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
           </button>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-6 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 flex items-center gap-3 text-rose-200 text-sm">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <th className="pb-4 pl-4 font-black">Temporal ID</th>
                <th className="pb-4 font-black text-center">Status</th>
                <th className="pb-4 font-black text-center">Outcome</th>
                <th className="pb-4 font-black">Timestamp</th>
                <th className="pb-4 pr-4 font-black text-right">Emergency Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rounds.map((round) => {
                const isActive = round.status === 'betting' || round.status === 'locked' || round.status === 'rolling';
                
                return (
                  <tr key={round.round_id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 pl-4">
                       <div className="flex items-center gap-3">
                          <div className={`h-2 w-2 rounded-full ${isActive ? 'bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,1)]' : 'bg-slate-700'}`} />
                          <span className="font-display text-xs font-black tracking-tighter text-white uppercase opacity-80 group-hover:opacity-100">
                             #{round.round_id.slice(0, 12)}
                          </span>
                       </div>
                    </td>
                    <td className="py-4 text-center">
                       <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest border ${
                         round.status === 'completed' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500' :
                         round.status === 'cancelled' ? 'border-rose-500/20 bg-rose-500/10 text-rose-500' :
                         round.status === 'betting' || round.status === 'locked' ? 'border-cyan-500/20 bg-cyan-500/10 text-cyan-500' :
                         'border-purple-500/20 bg-purple-500/10 text-purple-500'
                       }`}>
                          {round.status === 'completed' && <CheckCircle2 size={10} />}
                          {(round.status === 'betting' || round.status === 'locked') && <Clock size={10} />}
                          {round.status === 'cancelled' && <Ban size={10} />}
                          {round.status === 'rolling' && <RefreshCw size={10} className="animate-spin" />}
                          {round.status}
                       </span>
                    </td>
                    <td className="py-4 text-center">
                       {round.total ? (
                         <div className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 border border-white/10 font-display text-sm font-black text-cyan-400">
                            {round.total}
                         </div>
                       ) : (
                         <span className="text-slate-600 font-black">--</span>
                       )}
                    </td>
                    <td className="py-4">
                       <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                          {new Date(round.created_at).toLocaleDateString()}
                          <br />
                          <span className="text-slate-500">{new Date(round.created_at).toLocaleTimeString()}</span>
                       </div>
                    </td>
                    <td className="py-4 pr-4 text-right">
                       <div className="flex items-center justify-end gap-2">
                          <button 
                            disabled={!isActive}
                            onClick={() => void forceSettle(round.round_id)}
                            className="flex h-8 items-center gap-1.5 rounded-lg border border-white/5 bg-white/5 px-3 text-[9px] font-black uppercase tracking-widest text-slate-400 transition-all hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-500 disabled:opacity-20 disabled:hover:bg-white/5 disabled:hover:text-slate-400"
                          >
                             <Zap size={12} />
                             Force Settle
                          </button>
                          <button 
                            disabled={!isActive}
                            onClick={() => void cancelRound(round.round_id)}
                            className="flex h-8 items-center gap-1.5 rounded-lg border border-white/5 bg-white/5 px-3 text-[9px] font-black uppercase tracking-widest text-slate-400 transition-all hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-500 disabled:opacity-20 disabled:hover:bg-white/5 disabled:hover:text-slate-400"
                          >
                             <Ban size={12} />
                             Abort
                          </button>
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {rounds.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 opacity-50">
             <History size={48} className="mb-4 text-slate-700" />
             <p className="text-sm font-bold uppercase tracking-widest">No Temporal History Found</p>
          </div>
        )}
      </div>
    </section>
  );
}
