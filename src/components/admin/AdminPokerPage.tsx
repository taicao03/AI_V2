import { useCallback, useEffect, useState } from 'react';
import { Crown, RefreshCw, Activity, Users, Copy, Check, Eye, Trash2, RotateCcw, ShieldAlert, Award } from 'lucide-react';
import { adminPokerService } from '../../services/adminPokerService';
import { formatNumber } from '../../lib/dice';
import type { PokerHand, PokerTable } from '../../types';

type AdminPokerPageProps = {
  sessionToken: string | null;
};

// Compact Admin Card Component
function PlayingCard({ card, size = 'sm' }: { card: string; size?: 'sm' | 'md' }) {
  if (card === 'XX') {
    return (
      <div className="relative flex h-10 w-7 shrink-0 items-center justify-center rounded border border-cyan-500/30 bg-gradient-to-br from-[#0c1b33] to-[#020617] shadow-[0_0_6px_rgba(34,211,238,0.2)] overflow-hidden">
        <span className="text-[6px] font-black text-cyan-400/80 scale-75">CYBER</span>
      </div>
    );
  }

  const rank = card.slice(0, card.length - 1);
  const suit = card.slice(-1);
  const isRed = suit === 'H' || suit === 'D';
  const suitChar = suit === 'S' ? '♠' : suit === 'H' ? '♥' : suit === 'D' ? '♦' : '♣';
  const rankStr = rank === 'T' ? '10' : rank;

  const heightClass = size === 'md' ? 'h-12 w-8.5 p-0.5' : 'h-10 w-7 p-0.5';
  const rankFont = size === 'md' ? 'text-[9px]' : 'text-[8px]';
  const suitFont = size === 'md' ? 'text-sm -mt-0.5' : 'text-xs -mt-0.5';

  return (
    <div className={`relative flex ${heightClass} shrink-0 flex-col justify-between rounded border border-slate-300 bg-gradient-to-b from-white to-slate-100 font-sans font-black shadow-[0_2px_4px_rgba(0,0,0,0.3)] ${
      isRed ? 'text-rose-600' : 'text-slate-900'
    }`}>
      <div className={`${rankFont} text-left leading-none`}>{rankStr}</div>
      <div className={`${suitFont} text-center leading-none`}>{suitChar}</div>
      <div className={`${rankFont} text-right leading-none rotate-180`}>{rankStr}</div>
    </div>
  );
}

export function AdminPokerPage({ sessionToken }: AdminPokerPageProps) {
  const [tables, setTables] = useState<PokerTable[]>([]);
  const [debugHands, setDebugHands] = useState<PokerHand[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCodeTableId, setCopiedCodeTableId] = useState<string | null>(null);

  const loadTables = useCallback(async () => {
    const { data, error: listError } = await adminPokerService.listActiveTables(sessionToken);
    setTables(data);
    setError(listError?.message ?? null);
    setLoading(false);
  }, [sessionToken]);

  useEffect(() => {
    void loadTables();
    const intervalId = window.setInterval(loadTables, 6000);
    return () => window.clearInterval(intervalId);
  }, [loadTables]);

  async function forceClose(tableId: string) {
    if (!window.confirm('Are you absolutely sure you want to force close this table?')) return;
    const { error: closeError } = await adminPokerService.forceCloseTable(sessionToken, tableId);
    setError(closeError?.message ?? null);
    await loadTables();
  }

  async function cancelRound(roundId: string) {
    if (!window.confirm('Are you sure you want to CANCEL this active round and refund all player buy-ins?')) return;
    const { error: cancelError } = await adminPokerService.cancelRoundRefund(sessionToken, roundId, 'Cancelled from admin poker page');
    setError(cancelError?.message ?? null);
    await loadTables();
  }

  async function debugRound(roundId: string) {
    const { data, error: debugError } = await adminPokerService.debugRoundHands(sessionToken, roundId);
    setDebugHands(data);
    setError(debugError?.message ?? null);
  }

  const handleCopyCode = (roomCode: string | null, tableId: string) => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopiedCodeTableId(tableId);
    setTimeout(() => setCopiedCodeTableId(null), 2000);
  };

  // Summarize stats for admin overview
  const liveRoundsCount = tables.filter((t) => t.active_round_id).length;
  const waitingTablesCount = tables.filter((t) => t.status === 'waiting').length;

  return (
    <section className="panel p-0 overflow-hidden bg-[#070b17]/95 border border-cyan-500/10">
      {/* Admin Title Panel */}
      <div className="border-b border-cyan-500/10 bg-slate-950/40 px-6 py-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400">
            <Crown size={14} className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
            Operations Command Center
          </div>
          <h2 className="font-display text-xl font-black uppercase tracking-tight text-white mt-1">Poker Tables Supervisor</h2>
        </div>
        <button 
          className="p-2.5 rounded-xl border border-white/5 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all" 
          onClick={() => void loadTables()}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Error alert banner */}
        {error && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-xs text-rose-200 flex items-center gap-2">
            <ShieldAlert size={14} className="text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* METRICS DASHBOARD GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-white/5 bg-slate-900/10 p-4 flex items-center justify-between">
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Active Arenas</span>
              <div className="text-2xl font-black text-white mt-1">{tables.length}</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Activity size={18} />
            </div>
          </div>
          <div className="rounded-2xl border border-white/5 bg-slate-900/10 p-4 flex items-center justify-between">
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Live Hands Running</span>
              <div className="text-2xl font-black text-amber-300 mt-1">{liveRoundsCount}</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Crown size={18} />
            </div>
          </div>
          <div className="rounded-2xl border border-white/5 bg-slate-900/10 p-4 flex items-center justify-between">
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Lobby Waiting Rooms</span>
              <div className="text-2xl font-black text-purple-400 mt-1">{waitingTablesCount}</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Users size={18} />
            </div>
          </div>
        </div>

        {/* OPERATIONS CONSOLE TABLE */}
        <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#060a15]/40">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-slate-500 uppercase tracking-[0.25em] text-[9px] bg-slate-950/20">
                <th className="p-4">Table / ID</th>
                <th className="p-4">State</th>
                <th className="p-4">Secure Room Code</th>
                <th className="p-4">Active Round</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {tables.map((table) => (
                <tr key={table.table_id} className="text-slate-300 hover:bg-slate-900/25 transition-all duration-150">
                  <td className="p-4">
                    <div className="font-bold text-white tracking-tight">{table.name}</div>
                    <div className="text-[9px] text-slate-500 font-mono mt-0.5">{table.table_id}</div>
                  </td>
                  <td className="p-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wider ${
                      table.status === 'playing'
                        ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400 animate-pulse'
                        : table.status === 'showdown'
                          ? 'bg-purple-500/10 border border-purple-500/20 text-purple-400'
                          : 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400'
                    }`}>
                      {table.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {table.room_code ? (
                      <button
                        onClick={() => handleCopyCode(table.room_code, table.table_id)}
                        className="group inline-flex items-center gap-1 rounded bg-[#091021] border border-cyan-500/20 px-2.5 py-1 text-[10px] font-mono text-cyan-300 hover:bg-cyan-500/10 transition-all"
                      >
                        {table.room_code}
                        {copiedCodeTableId === table.table_id ? (
                          <Check size={8} className="text-emerald-400" />
                        ) : (
                          <Copy size={8} className="text-cyan-400/40 group-hover:text-cyan-400" />
                        )}
                      </button>
                    ) : (
                      <span className="text-slate-600 font-mono">-</span>
                    )}
                  </td>
                  <td className="p-4 font-mono text-slate-400 text-[10px]">
                    {table.active_round_id ? (
                      <span className="rounded bg-slate-900 px-2 py-0.5 border border-white/5 text-[9px] font-semibold text-slate-200">
                        {table.active_round_id.slice(0, 12)}
                      </span>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      {table.active_round_id && (
                        <>
                          <button
                            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 font-bold text-[10px] uppercase text-rose-300 hover:bg-rose-500/20 hover:text-white transition-all"
                            onClick={() => void cancelRound(table.active_round_id as string)}
                            title="Cancel Active Round & Refund Seated Stakes"
                          >
                            <RotateCcw size={10} />
                            Refund Round
                          </button>
                          <button
                            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 font-bold text-[10px] uppercase text-cyan-300 hover:bg-cyan-500/20 hover:text-white transition-all"
                            onClick={() => void debugRound(table.active_round_id as string)}
                          >
                            <Eye size={10} />
                            Debug
                          </button>
                        </>
                      )}
                      <button
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-1.5 font-bold text-[10px] uppercase text-slate-400 hover:bg-rose-600 hover:text-white hover:border-rose-500 transition-all"
                        onClick={() => void forceClose(table.table_id)}
                        title="Force close table and seat-order cleanup"
                      >
                        <Trash2 size={10} />
                        Close Table
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {tables.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 text-sm">
                    No active poker tables registered on server.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* TELEMETRY ROUND DEBUG PANEL */}
        {debugHands.length > 0 && (
          <div className="rounded-2xl border border-cyan-500/25 bg-cyan-950/10 p-5 space-y-4 shadow-[inset_0_0_24px_rgba(6,182,212,0.1)]">
            <div className="flex items-center justify-between border-b border-cyan-500/15 pb-2">
              <div className="text-xs font-black uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                <Activity size={12} className="text-cyan-400 animate-pulse" />
                Live Round Hand Telemetry
              </div>
              <button 
                onClick={() => setDebugHands([])}
                className="text-[10px] font-bold text-slate-500 hover:text-slate-300 uppercase tracking-wider"
              >
                Clear Deck
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {debugHands.map((hand) => (
                <div 
                  key={hand.user_id} 
                  className={`rounded-xl bg-black/40 border p-3 flex items-center justify-between gap-4 ${
                    hand.is_winner ? 'border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.15)] bg-emerald-950/5' : 'border-white/5'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200 text-xs truncate max-w-40 block font-mono">
                        {hand.user_id.slice(0, 12)}...
                      </span>
                      {hand.is_winner && (
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 text-[8px] font-black">
                          👑
                        </span>
                      )}
                    </div>
                    
                    <div className="text-[10px] font-black uppercase text-cyan-300 tracking-wide">
                      Combo: <span className="text-white">{hand.hand_name ?? 'Folded / Playing'}</span>
                    </div>
                  </div>

                  {/* Render debugging playing cards */}
                  <div className="flex gap-1 shrink-0">
                    {hand.cards.map((card, idx) => (
                      <PlayingCard key={`${hand.user_id}-${card}-${idx}`} card={card} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
