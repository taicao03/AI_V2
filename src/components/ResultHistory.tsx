import { Clock3, Loader2 } from 'lucide-react';
import type { BetHistoryItem } from '../types';
import { formatOutcome, formatPredictionValue } from '../lib/dice';

type ResultHistoryProps = {
  items: BetHistoryItem[];
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

export function ResultHistory({ items, loading }: ResultHistoryProps) {
  return (
    <section className="panel mt-5 p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-cyan-200/80">
            <Clock3 className="h-4 w-4" />
            Lich su bet
          </div>
          <h2 className="mt-1 text-2xl font-semibold text-white">20 van gan nhat</h2>
        </div>
        <div className="text-sm text-slate-400">{items.length} ket qua</div>
      </div>

      {loading ? (
        <div className="flex min-h-40 items-center justify-center gap-3 text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
          Dang tai lich su...
        </div>
      ) : items.length === 0 ? (
        <div className="flex min-h-40 items-center justify-center rounded-3xl border border-dashed border-slate-700 text-center text-slate-400">
          Chua co bet nao trong phong realtime.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-separate border-spacing-y-2 text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Thoi gian</th>
                <th className="px-3 py-2 font-medium">Nguoi choi</th>
                <th className="px-3 py-2 font-medium">Du doan</th>
                <th className="px-3 py-2 font-medium">Xuc xac</th>
                <th className="px-3 py-2 font-medium">Tong</th>
                <th className="px-3 py-2 font-medium">Ket qua</th>
                <th className="px-3 py-2 font-medium">Diem</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr className="history-row" key={item.bet_id}>
                  <td className="rounded-l-2xl px-3 py-3 text-slate-300">{formatTime(item.created_at)}</td>
                  <td className="px-3 py-3 text-slate-200">{item.display_name ?? 'Demo player'}</td>
                  <td className="px-3 py-3 text-slate-300">
                    {formatPredictionValue(item.prediction_type, item.prediction_value)}
                    <span className="ml-2 text-slate-500">({item.bet_amount})</span>
                  </td>
                  <td className="px-3 py-3">
                    {item.dice ? (
                      <div className="flex gap-2">
                        {item.dice.map((value, index) => (
                          <span className="mini-die" key={`${item.bet_id}-${index}`}>
                            {value}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-500">Dang cho</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-lg font-semibold text-cyan-100">{item.total ?? '-'}</td>
                  <td className="px-3 py-3">
                    {item.result_type ? (
                      <span className={`outcome-pill ${item.result_type === 'tai' ? 'outcome-tai' : 'outcome-xiu'}`}>
                        {formatOutcome(item.result_type)}
                      </span>
                    ) : (
                      <span className="outcome-pill result-pending">Pending</span>
                    )}
                    <span
                      className={`ml-2 outcome-pill ${
                        item.status === 'pending' ? 'result-pending' : item.result === 'win' ? 'result-win' : 'result-lose'
                      }`}
                    >
                      {item.status === 'pending' ? 'Pending' : item.result === 'win' ? 'Win' : 'Lose'}
                    </span>
                  </td>
                  <td className="rounded-r-2xl px-3 py-3">
                    {item.status === 'pending' ? (
                      <span className="text-slate-500">Cho ket qua</span>
                    ) : (
                      <span className={item.points_change >= 0 ? 'text-emerald-200' : 'text-rose-200'}>
                        {item.points_change >= 0 ? '+' : ''}
                        {item.points_change}
                      </span>
                    )}
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
