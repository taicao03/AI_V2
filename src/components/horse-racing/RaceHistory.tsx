import type { HorseRace, HorseWinner } from '../../types/horse-racing';

type RaceHistoryProps = {
  races: HorseRace[];
  winners: HorseWinner[];
};

export function RaceHistory({ races, winners }: RaceHistoryProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-300">Race History</div>
      <div className="grid gap-2 md:grid-cols-2">
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Recent Races</div>
          <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
            {races.slice(0, 10).map((race) => (
              <div key={race.race_id} className="rounded-lg border border-white/5 bg-slate-900/50 px-2 py-1 text-[10px]">
                <span className="font-black text-white">#{race.race_number}</span>
                <span className="ml-2 uppercase text-slate-400">{race.status}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Recent Winners</div>
          <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
            {winners.slice(0, 10).map((winner) => (
              <div key={`${winner.race_id}:${winner.winner_horse_id}`} className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px]">
                <span className="font-black text-emerald-300">#{winner.race_number}</span>
                <span className="ml-2 font-bold text-white">{winner.winner_name ?? 'Unknown'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
