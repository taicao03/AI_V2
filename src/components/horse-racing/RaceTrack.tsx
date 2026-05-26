import { useEffect, useMemo, useRef, useState } from 'react';
import { Gauge, Trophy, Activity, Sparkles, Zap, Flame, Crown } from 'lucide-react';
import type { Horse, HorseRace } from '../../types/horse-racing';

type RaceTrackProps = {
  horses: Horse[];
  race: HorseRace | null;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hashToUnit(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash % 10000) / 10000;
}

function smoothStep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function getRaceProgress(race: HorseRace | null, nowMs: number): number {
  if (!race) {
    return 0;
  }
  if (race.status === 'waiting' || race.status === 'betting') {
    return 0;
  }
  if (race.status === 'locked') {
    return 0.04;
  }
  if (race.status === 'completed') {
    return 1;
  }

  const startMs = race.race_started_at ? new Date(race.race_started_at).getTime() : NaN;
  const endMs = race.race_ends_at ? new Date(race.race_ends_at).getTime() : NaN;
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return race.status === 'racing' ? 0.45 : 0;
  }
  return clamp((nowMs - startMs) / (endMs - startMs), 0, 1);
}

function HorseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10h3l3-3h4l2 3h4c1 0 2 .5 2 1.5S20 13 19 13h-4l-2 3H8l-2-3H3c-1 0-2-.5-2-1.5S2 10 3 10z" />
      <path d="M9 7l1-3h3l-1 3" />
      <path d="M6 13v4" />
      <path d="M12 16v4" />
      <circle cx="17" cy="9" r="0.8" fill="currentColor" />
    </svg>
  );
}

const RARITY_COLORS = {
  legendary: { text: 'text-amber-400', glow: 'shadow-[0_0_12px_rgba(245,158,11,0.4)]', bar: 'from-amber-500/10 to-amber-500/30' },
  epic: { text: 'text-fuchsia-400', glow: 'shadow-[0_0_12px_rgba(217,70,239,0.4)]', bar: 'from-fuchsia-500/10 to-fuchsia-500/30' },
  rare: { text: 'text-cyan-400', glow: 'shadow-[0_0_12px_rgba(6,182,212,0.4)]', bar: 'from-cyan-500/10 to-cyan-500/30' },
  common: { text: 'text-slate-300', glow: 'shadow-[0_0_10px_rgba(255,255,255,0.15)]', bar: 'from-slate-500/5 to-slate-500/20' },
};

export function RaceTrack({ horses, race }: RaceTrackProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const lastProgressByHorseRef = useRef<Record<string, number>>({});
  const raceKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const nextKey = race?.race_id ?? null;
    if (raceKeyRef.current !== nextKey) {
      raceKeyRef.current = nextKey;
      lastProgressByHorseRef.current = {};
    }
  }, [race?.race_id]);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNowMs(Date.now());
    }, race?.status === 'racing' ? 120 : 350);
    return () => window.clearInterval(timerId);
  }, [race?.status]);

  const raceProgress = getRaceProgress(race, nowMs);

  const rows = useMemo(() => {
    const sorted = [...horses].sort((a, b) => a.sort_order - b.sort_order);
    const rowProgress = sorted.map((horse, index) => {
      const seed = hashToUnit(`${race?.race_id ?? 'idle'}:${horse.horse_id}`);
      const phaseA = seed * Math.PI * 2;
      const phaseB = (seed * 7.3 + 0.11) * Math.PI;
      const tempoA = 8 + seed * 4;
      const tempoB = 15 + seed * 5;

      let laneProgress = 0;

      if (!race || race.status === 'waiting' || race.status === 'betting') {
        laneProgress = 0;
      } else if (race.status === 'locked') {
        laneProgress = 0.04 + index * 0.005;
      } else if (race.status === 'racing') {
        const frontWave = Math.pow(raceProgress, 0.84 + seed * 0.2);
        const wobble =
          Math.sin(raceProgress * tempoA + phaseA) * (0.035 * (1 - raceProgress * 0.75)) +
          Math.sin(raceProgress * tempoB + phaseB) * (0.02 * (1 - raceProgress * 0.8));

        const midPackBoost = Math.sin(raceProgress * 10 + phaseA * 0.5) * 0.04 * (1 - raceProgress);

        // Winner lags slightly early, then bursts late to create chase drama.
        const winnerEarlyDip =
          horse.horse_id === race.winner_horse_id ? -0.05 * Math.exp(-Math.pow((raceProgress - 0.35) / 0.16, 2)) : 0;
        const winnerLateBurst =
          horse.horse_id === race.winner_horse_id ? 0.26 * smoothStep(0.58, 0.95, raceProgress) : 0;

        const challengerBurst =
          horse.horse_id !== race.winner_horse_id
            ? 0.08 * Math.exp(-Math.pow((raceProgress - (0.45 + (seed - 0.5) * 0.18)) / 0.22, 2))
            : 0;

        laneProgress = clamp(frontWave + wobble + midPackBoost + winnerEarlyDip + winnerLateBurst + challengerBurst, 0.03, 0.985);
      } else if (race.status === 'completed') {
        laneProgress = horse.horse_id === race.winner_horse_id ? 1 : Math.max(0.82, 0.96 - index * 0.03);
      } else {
        laneProgress = 0;
      }

      const prev = lastProgressByHorseRef.current[horse.horse_id] ?? 0;
      const monotonic = race?.status === 'racing' ? Math.max(prev, laneProgress) : laneProgress;
      lastProgressByHorseRef.current[horse.horse_id] = monotonic;

      return { horse, laneProgress: monotonic };
    });

    if (race?.status === 'completed' && race.winner_horse_id) {
      rowProgress.sort((a, b) => b.laneProgress - a.laneProgress);
    }

    return rowProgress;
  }, [horses, nowMs, race, raceProgress]);

  const isRacing = race?.status === 'racing';

  return (
    <section className="rounded-2xl border border-white/5 bg-gradient-to-br from-[#06111f]/60 to-[#03070d]/80 p-5 shadow-2xl relative overflow-hidden backdrop-blur-md">
      {/* CSS Animation Keyframes for gallop */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes horse-bounce-small {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-1px) rotate(0.8deg); }
        }
        .animate-bounce-small {
          animation: horse-bounce-small 0.2s infinite ease-in-out;
        }
        .laser-grid-racetrack {
          background-image: linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 25px 100%;
        }
      `}} />

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={14} className={isRacing ? 'animate-pulse text-cyan-400' : 'text-slate-500'} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Live Race Telemetry</span>
        </div>
        
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[8px] font-black uppercase tracking-widest border ${
            race?.status === 'completed' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' :
            race?.status === 'racing' ? 'border-purple-500/20 bg-purple-500/10 text-purple-400 animate-pulse' :
            'border-slate-500/20 bg-slate-500/5 text-slate-400'
          }`}>
            {race?.status ?? 'waiting'}
          </span>
          {isRacing && (
            <div className="flex items-center gap-1 text-[9px] font-black text-cyan-300 font-mono bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.15)] animate-pulse">
              <Gauge size={10} />
              {Math.round(raceProgress * 100)}%
            </div>
          )}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-black/60 p-4 shadow-inner">
        {/* Laser Grid Background overlay */}
        <div className="absolute inset-0 laser-grid-racetrack opacity-30 pointer-events-none" />
        
        {/* Finish Line */}
        <div className="pointer-events-none absolute right-[5%] top-0 bottom-0 w-[2px] bg-gradient-to-b from-transparent via-amber-400/40 to-transparent border-dashed border-l border-amber-300/35 z-10" />
        <div className="pointer-events-none absolute right-[5%] top-1/2 -translate-y-1/2 flex items-center justify-center z-10 rotate-90 -mr-6">
          <span className="text-[7.5px] font-black tracking-[0.25em] text-amber-300/45 uppercase">FINISH</span>
        </div>

        <div className="space-y-3 relative z-20">
          {rows.map(({ horse, laneProgress }, index) => {
            const colors = RARITY_COLORS[horse.rarity] || RARITY_COLORS.common;
            const isWinner = race?.winner_horse_id === horse.horse_id && race?.status === 'completed';
            
            return (
              <div 
                key={horse.horse_id} 
                className={`relative h-[74px] overflow-hidden rounded-xl border transition-all duration-300 ${
                  isWinner 
                    ? 'border-amber-400/40 bg-amber-950/10 shadow-[0_0_15px_rgba(245,158,11,0.1)]' 
                    : 'border-white/5 bg-slate-950/45 hover:bg-slate-900/40'
                }`}
              >
                {/* Visual Progress Trail */}
                <div
                  className={`absolute inset-y-0 left-0 bg-gradient-to-r ${colors.bar} transition-all duration-700 ease-out`}
                  style={{ width: `${Math.max(4, laneProgress * 100)}%` }}
                />

                {/* Animated Galloping Horse Block */}
                <div
                  className={`absolute bottom-[8px] transition-[left] duration-700 flex items-center z-30`}
                  style={{ 
                    left: `calc(${Math.max(2, laneProgress * 91)}% - 50px)`,
                    animation: isRacing ? 'horse-bounce-small 0.18s infinite ease-in-out' : 'none'
                  }}
                >
                  <div className={`relative ${isWinner ? 'animate-bounce' : ''}`}>
                    <div className="relative">
                      {horse.avatar ? (
                        <img
                          src={horse.avatar}
                          alt={horse.name}
                          className={`h-12 w-24 object-cover object-bottom ${isWinner ? 'drop-shadow-[0_0_14px_rgba(245,158,11,0.55)]' : ''}`}
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-12 w-24 items-center justify-center">
                          <HorseIcon className={`h-5 w-5 ${colors.text}`} />
                        </div>
                      )}

                      <div className="pointer-events-none absolute inset-x-1 bottom-1 rounded bg-black/65 px-1 py-0.5 text-center">
                        <span className="block truncate text-[8px] font-black uppercase tracking-wide text-white">{horse.name}</span>
                      </div>

                      {isWinner && (
                        <div className="absolute -right-2 -top-2 rounded-full border border-amber-400/40 bg-amber-500/20 p-1">
                          <Crown size={11} className="text-amber-300 animate-spin" style={{ animationDuration: '4s' }} />
                        </div>
                      )}
                    </div>
                    {!isRacing && !isWinner && (
                      <span className="absolute -right-1 -top-1 rounded border border-white/10 bg-black/70 px-1 py-0.5 text-[7px] font-mono font-bold text-slate-300">
                        SPD {horse.speed_rating}
                      </span>
                    )}
                  </div>
                </div>

                {/* Lane Index Badge */}
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
                  <span className="text-[9px] font-mono font-black text-slate-600 bg-black/40 px-1.5 py-0.5 rounded border border-white/5">
                    L{index + 1}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
