import type { HorseLeaderboardEntry } from '../../types/horse-racing';

type RaceLeaderboardProps = {
  items: HorseLeaderboardEntry[];
};

export function RaceLeaderboard({ items }: RaceLeaderboardProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Top Predictors</div>
      <div className="space-y-1.5">
        {items.slice(0, 10).map((entry, index) => (
          <div key={entry.user_id} className="rounded-lg border border-white/5 bg-slate-900/50 px-3 py-2 text-[10px]">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-black text-white">
                  #{index + 1} {entry.display_name}
                </div>
                <div className="text-slate-500">@{entry.account_name}</div>
              </div>
              <div className="text-right">
                <div className="font-black text-emerald-300">{entry.total_winnings.toLocaleString()}</div>
                <div className="text-slate-500">Streak {entry.best_streak}</div>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 ? <div className="text-[10px] text-slate-500">No leaderboard data yet.</div> : null}
      </div>
    </section>
  );
}
