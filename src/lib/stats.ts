import type { BetResult, DiceRound, Outcome, ProfileStats } from '../types';
import { TOTAL_VALUES } from './dice';

export type DiceStats = {
  sampleSize: number;
  outcomeCounts: Record<Outcome, number>;
  totalCounts: Record<number, number>;
};

export function buildStats(rounds: Pick<DiceRound, 'total' | 'result_type'>[]): DiceStats {
  const totalCounts = Object.fromEntries(TOTAL_VALUES.map((value) => [value, 0])) as Record<number, number>;
  const outcomeCounts: Record<Outcome, number> = {
    tai: 0,
    xiu: 0,
  };

  for (const round of rounds) {
    if (round.total === null || round.result_type === null) {
      continue;
    }

    totalCounts[round.total] = (totalCounts[round.total] ?? 0) + 1;
    outcomeCounts[round.result_type] += 1;
  }

  return {
    sampleSize: rounds.filter((round) => round.total !== null && round.result_type !== null).length,
    outcomeCounts,
    totalCounts,
  };
}

export function buildProfileStats(
  points: number,
  bets: Array<Pick<ProfileStatsSource, 'result' | 'points_change'>>,
): ProfileStats {
  const settledBets = bets.filter((bet) => bet.result !== null);
  const wins = settledBets.filter((bet) => bet.result === 'win').length;
  const biggestWin = Math.max(0, ...bets.map((bet) => Math.max(0, bet.points_change)));
  const biggestLoss = Math.min(0, ...bets.map((bet) => Math.min(0, bet.points_change)));

  return {
    totalPoints: points,
    totalBets: bets.length,
    winRate: percentage(wins, settledBets.length),
    biggestWin,
    biggestLoss,
  };
}

export function percentage(count: number, sampleSize: number): number {
  if (sampleSize === 0) {
    return 0;
  }

  return Math.round((count / sampleSize) * 100);
}

type ProfileStatsSource = {
  result: BetResult;
  points_change: number;
};
