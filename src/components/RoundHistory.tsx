import { Clock3, Loader2 } from 'lucide-react';
import type { DiceRound } from '../types';
import { formatOutcome } from '../lib/dice';

type RoundHistoryProps = {
  rounds: DiceRound[];
  loading: boolean;
};

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

function durationSeconds(start: string, end: string): number {
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000));
}

export function RoundHistory({ rounds, loading }: RoundHistoryProps) {
  return (
    <section className="panel p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-violet-200/80">
            <Clock3 className="h-4 w-4" />
            Lich su round
          </div>
          <h2 className="mt-1 text-2xl font-semibold text-white">20 round gan nhat</h2>
        </div>
        <div className="text-sm text-slate-400">{rounds.length} round</div>
      </div>

      {loading ? (
        <div className="flex min-h-40 items-center justify-center gap-3 text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
          Dang tai lich su round...
        </div>
      ) : rounds.length === 0 ? (
        <div className="flex min-h-40 items-center justify-center rounded-3xl border border-dashed border-slate-700 text-center text-slate-400">
          Chua co round nao trong phong realtime.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-separate border-spacing-y-2 text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Bat dau</th>
                <th className="px-3 py-2 font-medium">Trang thai</th>
                <th className="px-3 py-2 font-medium">Xuc xac</th>
                <th className="px-3 py-2 font-medium">Tong</th>
                <th className="px-3 py-2 font-medium">Tai/Xiu</th>
                <th className="px-3 py-2 font-medium">Thoi luong</th>
              </tr>
            </thead>
            <tbody>
              {rounds.map((round) => (
                <tr className="history-row" key={round.round_id}>
                  <td className="rounded-l-2xl px-3 py-3 text-slate-300">{formatTime(round.starts_at)}</td>
                  <td className="px-3 py-3">
                    <span className={`outcome-pill ${round.status === 'betting' ? 'result-pending' : round.status === 'cancelled' ? 'result-lose' : 'result-win'}`}>
                      {round.status === 'betting' ? 'Dang mo' : round.status === 'cancelled' ? 'Da huy' : 'Da chot'}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {round.dice ? (
                      <div className="flex gap-2">
                        {round.dice.map((value, index) => (
                          <span className="mini-die" key={`${round.round_id}-${index}`}>
                            {value}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-500">Dang cho</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-lg font-semibold text-cyan-100">{round.total ?? '-'}</td>
                  <td className="px-3 py-3">
                    {round.result_type ? (
                      <span className={`outcome-pill ${round.result_type === 'tai' ? 'outcome-tai' : 'outcome-xiu'}`}>
                        {formatOutcome(round.result_type)}
                      </span>
                    ) : (
                      <span className="outcome-pill result-pending">Pending</span>
                    )}
                  </td>
                  <td className="rounded-r-2xl px-3 py-3 text-slate-300">
                    {durationSeconds(round.starts_at, round.ends_at)}s
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
