import type { DiceTuple, Outcome, Prediction, PredictionType } from '../types';

export const TOTAL_VALUES = Array.from({ length: 16 }, (_, index) => index + 3);
export const BET_PRESETS = [10, 50, 100];

export function randomDie(): number {
  const cryptoObject = globalThis.crypto;

  if (cryptoObject?.getRandomValues) {
    const range = 0x1_0000_0000;
    const maxUnbiased = range - (range % 6);
    const buffer = new Uint32Array(1);

    do {
      cryptoObject.getRandomValues(buffer);
    } while (buffer[0] >= maxUnbiased);

    return (buffer[0] % 6) + 1;
  }

  return Math.floor(Math.random() * 6) + 1;
}

export function rollDice(): DiceTuple {
  return [randomDie(), randomDie(), randomDie()];
}

export function sumDice(dice: DiceTuple): number {
  return dice[0] + dice[1] + dice[2];
}

export function getOutcome(total: number): Outcome {
  return total <= 10 ? 'xiu' : 'tai';
}

export function getOutcomeFromDice(dice: DiceTuple): Outcome {
  return getOutcome(sumDice(dice));
}

export function matchesPrediction(prediction: Prediction, dice: DiceTuple): boolean {
  const total = sumDice(dice);

  if (prediction.kind === 'total') {
    return prediction.value === total;
  }

  return prediction.value === getOutcome(total);
}

export function calculatePointsChange(prediction: Prediction, dice: DiceTuple, betAmount: number): number {
  if (!matchesPrediction(prediction, dice)) {
    return -betAmount;
  }

  return prediction.kind === 'total' ? betAmount * 5 : betAmount;
}

export function validateBetAmount(value: number, availablePoints?: number): string | null {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    return 'So diem dat phai la so nguyen.';
  }

  if (value < 1) {
    return 'So diem dat phai lon hon hoac bang 1.';
  }

  if (typeof availablePoints === 'number' && value > availablePoints) {
    return 'So diem hien co khong du.';
  }

  return null;
}

export function predictionToRpc(prediction: Prediction): {
  predictionType: PredictionType;
  predictionValue: string;
} {
  if (prediction.kind === 'total') {
    return {
      predictionType: 'total',
      predictionValue: String(prediction.value),
    };
  }

  return {
    predictionType: 'tai_xiu',
    predictionValue: prediction.value,
  };
}

export function formatOutcome(outcome: Outcome): string {
  return outcome === 'tai' ? 'Tai' : 'Xiu';
}

export function formatPrediction(prediction: Prediction): string {
  if (prediction.kind === 'total') {
    return `Tong ${prediction.value}`;
  }

  return formatOutcome(prediction.value);
}

export function formatPredictionValue(type: PredictionType, value: string): string {
  if (type === 'total') {
    return `Tong ${value}`;
  }

  return value === 'tai' || value === 'xiu' ? formatOutcome(value) : value;
}

export function toDiceTuple(value: unknown): DiceTuple {
  if (!Array.isArray(value) || value.length !== 3) {
    return [1, 1, 1];
  }

  return value.map((item) => {
    const numericValue = Number(item);
    return Number.isInteger(numericValue) && numericValue >= 1 && numericValue <= 6
      ? numericValue
      : 1;
  }) as DiceTuple;
}

export function normalizeOutcome(value: unknown, total?: number): Outcome {
  if (value === 'tai' || value === 'xiu') {
    return value;
  }

  return getOutcome(total ?? 3);
}

import { formatNumber as formatNumberVi } from './formatHelpers';

export function formatNumber(value: number): string {
  return formatNumberVi(value);
}
