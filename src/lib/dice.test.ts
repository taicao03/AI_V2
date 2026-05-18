import { describe, expect, it } from 'vitest';
import { calculatePointsChange, getOutcome, matchesPrediction, rollDice, sumDice, toDiceTuple, validateBetAmount } from './dice';
import type { Prediction } from '../types';

describe('dice utilities', () => {
  it('rolls exactly three dice between 1 and 6', () => {
    for (let index = 0; index < 100; index += 1) {
      const dice = rollDice();

      expect(dice).toHaveLength(3);
      expect(dice.every((value) => Number.isInteger(value) && value >= 1 && value <= 6)).toBe(true);
    }
  });

  it('sums dice values', () => {
    expect(sumDice([6, 5, 4])).toBe(15);
  });

  it('classifies xiu from 3 to 10 and tai from 11 to 18', () => {
    expect(getOutcome(3)).toBe('xiu');
    expect(getOutcome(10)).toBe('xiu');
    expect(getOutcome(11)).toBe('tai');
    expect(getOutcome(18)).toBe('tai');
  });

  it('matches outcome and total predictions', () => {
    const taiPrediction: Prediction = { kind: 'outcome', value: 'tai' };
    const totalPrediction: Prediction = { kind: 'total', value: 14 };

    expect(matchesPrediction(taiPrediction, [6, 4, 4])).toBe(true);
    expect(matchesPrediction(totalPrediction, [6, 4, 4])).toBe(true);
    expect(matchesPrediction(totalPrediction, [1, 2, 3])).toBe(false);
  });

  it('calculates point changes by prediction type', () => {
    expect(calculatePointsChange({ kind: 'outcome', value: 'tai' }, [6, 4, 4], 50)).toBe(50);
    expect(calculatePointsChange({ kind: 'total', value: 14 }, [6, 4, 4], 50)).toBe(250);
    expect(calculatePointsChange({ kind: 'outcome', value: 'xiu' }, [6, 4, 4], 50)).toBe(-50);
  });

  it('validates bet amounts', () => {
    expect(validateBetAmount(10, 100)).toBeNull();
    expect(validateBetAmount(0, 100)).toBe('So diem dat phai lon hon hoac bang 1.');
    expect(validateBetAmount(101, 100)).toBe('So diem hien co khong du.');
  });

  it('normalizes invalid dice arrays safely', () => {
    expect(toDiceTuple([6, '2', 8])).toEqual([6, 2, 1]);
    expect(toDiceTuple([1, 2])).toEqual([1, 1, 1]);
  });
});
