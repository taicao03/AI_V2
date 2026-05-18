import { describe, expect, it } from 'vitest';
import { buildProfileStats, buildStats, percentage } from './stats';
import type { DiceRound } from '../types';

const rounds: DiceRound[] = [
  {
    round_id: '1',
    status: 'completed',
    created_at: '2026-05-13T08:00:00.000Z',
    starts_at: '2026-05-13T07:59:30.000Z',
    ends_at: '2026-05-13T08:00:00.000Z',
    settled_at: '2026-05-13T08:00:00.000Z',
    completed_at: '2026-05-13T08:00:00.000Z',
    settled_by: null,
    is_cancelled: false,
    created_by: 'user-1',
    dice: [6, 6, 6],
    total: 18,
    result_type: 'tai',
  },
  {
    round_id: '2',
    status: 'completed',
    created_at: '2026-05-13T08:01:00.000Z',
    starts_at: '2026-05-13T08:00:30.000Z',
    ends_at: '2026-05-13T08:01:00.000Z',
    settled_at: '2026-05-13T08:01:00.000Z',
    completed_at: '2026-05-13T08:01:00.000Z',
    settled_by: null,
    is_cancelled: false,
    created_by: 'user-2',
    dice: [1, 2, 3],
    total: 6,
    result_type: 'xiu',
  },
  {
    round_id: '3',
    status: 'completed',
    created_at: '2026-05-13T08:02:00.000Z',
    starts_at: '2026-05-13T08:01:30.000Z',
    ends_at: '2026-05-13T08:02:00.000Z',
    settled_at: '2026-05-13T08:02:00.000Z',
    completed_at: '2026-05-13T08:02:00.000Z',
    settled_by: null,
    is_cancelled: false,
    created_by: 'user-3',
    dice: [4, 4, 3],
    total: 11,
    result_type: 'tai',
  },
];

describe('stats utilities', () => {
  it('builds outcome and total counts', () => {
    const stats = buildStats(rounds);

    expect(stats.sampleSize).toBe(3);
    expect(stats.outcomeCounts.tai).toBe(2);
    expect(stats.outcomeCounts.xiu).toBe(1);
    expect(stats.totalCounts[18]).toBe(1);
    expect(stats.totalCounts[6]).toBe(1);
    expect(stats.totalCounts[3]).toBe(0);
  });

  it('builds profile stats from bets', () => {
    const stats = buildProfileStats(1200, [
      { result: 'win', points_change: 100 },
      { result: 'lose', points_change: -50 },
      { result: 'win', points_change: 250 },
      { result: null, points_change: 0 },
    ]);

    expect(stats.totalPoints).toBe(1200);
    expect(stats.totalBets).toBe(4);
    expect(stats.winRate).toBe(67);
    expect(stats.biggestWin).toBe(250);
    expect(stats.biggestLoss).toBe(-50);
  });

  it('calculates whole-number percentages safely', () => {
    expect(percentage(2, 3)).toBe(67);
    expect(percentage(0, 0)).toBe(0);
  });
});
