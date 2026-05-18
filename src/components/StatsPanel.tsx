import { BarChart3 } from 'lucide-react';
import type { DiceRound } from '../types';
import { formatOutcome, TOTAL_VALUES } from '../lib/dice';
import { buildStats, percentage } from '../lib/stats';

type StatsPanelProps = {
  rounds: DiceRound[];
};

export function StatsPanel({ rounds }: StatsPanelProps) {
  const stats = buildStats(rounds);
  const maxTotalCount = Math.max(1, ...Object.values(stats.totalCounts));
  const outcomes = [
    { key: 'tai' as const, label: formatOutcome('tai'), color: 'from-cyan-300 to-emerald-300' },
    { key: 'xiu' as const, label: formatOutcome('xiu'), color: 'from-violet-300 to-fuchsia-300' },
  ];

  return (
    <section className="panel p-5 sm:p-6">
      <div className="mb-5">
        <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-violet-200/80">
          <BarChart3 className="h-4 w-4" />
          Thong ke
        </div>
        <h2 className="mt-1 text-2xl font-semibold text-white">Tan suat ket qua</h2>
        <div className="mt-1 text-sm text-slate-400">Mau thong ke: {stats.sampleSize} van gan nhat</div>
      </div>

      <div className="space-y-4">
        {outcomes.map((outcome) => {
          const count = stats.outcomeCounts[outcome.key];
          const rate = percentage(count, stats.sampleSize);

          return (
            <div key={outcome.key}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-200">{outcome.label}</span>
                <span className="text-slate-400">
                  {count} lan - {rate}%
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${outcome.color}`}
                  style={{ width: `${rate}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-4 gap-3">
        {TOTAL_VALUES.map((total) => {
          const count = stats.totalCounts[total] ?? 0;
          const height = Math.max(8, Math.round((count / maxTotalCount) * 64));

          return (
            <div className="rounded-2xl border border-slate-700/70 bg-slate-950/40 p-2 text-center" key={total}>
              <div className="mx-auto flex h-16 w-3 items-end rounded-full bg-slate-800">
                <div
                  className="w-full rounded-full bg-gradient-to-t from-violet-400 to-cyan-300"
                  style={{ height: `${height}px` }}
                />
              </div>
              <div className="mt-2 text-sm font-semibold text-white">{total}</div>
              <div className="text-xs text-slate-500">{count}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
