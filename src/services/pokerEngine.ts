import type { PokerCard, PokerHandRank } from '../types';

export type EvaluatedPokerHand = {
  handRank: PokerHandRank;
  handName: string;
  handScore: number;
  tieBreak: number[];
};

const RANK_MAP: Record<string, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

export function getPokerHandName(handRank: PokerHandRank): string {
  switch (handRank) {
    case 1:
      return 'Thung pha sanh';
    case 2:
      return 'Tu quy';
    case 3:
      return 'Cu lu';
    case 4:
      return 'Thung';
    case 5:
      return 'Sanh';
    case 6:
      return 'Sam co';
    case 7:
      return 'Hai doi';
    case 8:
      return 'Mot doi';
    default:
      return 'Mau thau';
  }
}

function parseCardValue(card: string): number {
  const safe = card.trim().toUpperCase();
  const rankToken = safe.slice(0, safe.length - 1);
  const value = RANK_MAP[rankToken];

  if (!value) {
    throw new Error(`Invalid card rank: ${card}`);
  }

  return value;
}

function scoreFromTie(handRank: PokerHandRank, tieBreak: number[]): number {
  let tieScore = 0;

  for (const part of tieBreak) {
    tieScore = tieScore * 15 + Math.max(0, Math.min(14, Math.trunc(part)));
  }

  return (10 - handRank) * 1_000_000_000 + tieScore;
}

export function evaluatePokerHand(cards: string[] | PokerCard[]): EvaluatedPokerHand {
  if (cards.length !== 5) {
    throw new Error('A poker hand must include exactly 5 cards.');
  }

  const values = cards.map(parseCardValue);
  const suits = cards.map((card) => card.trim().toUpperCase().slice(-1));
  const sorted = [...values].sort((a, b) => b - a);
  const unique = [...new Set(sorted)];
  const isFlush = new Set(suits).size === 1;

  let isStraight = false;
  let straightHigh = 0;

  if (unique.length === 5) {
    if (unique[0] - unique[4] === 4) {
      isStraight = true;
      straightHigh = unique[0];
    } else if (unique.join(',') === '14,5,4,3,2') {
      isStraight = true;
      straightHigh = 5;
    }
  }

  const counts = [...new Set(sorted)].map((value) => ({
    count: sorted.filter((item) => item === value).length,
    value,
  }));
  counts.sort((a, b) => b.count - a.count || b.value - a.value);

  let handRank: PokerHandRank;
  let tieBreak: number[];

  if (isFlush && isStraight) {
    handRank = 1;
    tieBreak = [straightHigh];
  } else if (counts[0]?.count === 4) {
    handRank = 2;
    const quad = counts[0].value;
    const kicker = counts[1].value;
    tieBreak = [quad, kicker];
  } else if (counts[0]?.count === 3 && counts[1]?.count === 2) {
    handRank = 3;
    tieBreak = [counts[0].value, counts[1].value];
  } else if (isFlush) {
    handRank = 4;
    tieBreak = sorted;
  } else if (isStraight) {
    handRank = 5;
    tieBreak = [straightHigh];
  } else if (counts[0]?.count === 3) {
    handRank = 6;
    const kickers = sorted.filter((value) => value !== counts[0].value);
    tieBreak = [counts[0].value, ...kickers];
  } else if (counts[0]?.count === 2 && counts[1]?.count === 2) {
    handRank = 7;
    const highPair = Math.max(counts[0].value, counts[1].value);
    const lowPair = Math.min(counts[0].value, counts[1].value);
    const kicker = counts[2].value;
    tieBreak = [highPair, lowPair, kicker];
  } else if (counts[0]?.count === 2) {
    handRank = 8;
    const pair = counts[0].value;
    const kickers = sorted.filter((value) => value !== pair);
    tieBreak = [pair, ...kickers];
  } else {
    handRank = 9;
    tieBreak = sorted;
  }

  return {
    handRank,
    handName: getPokerHandName(handRank),
    handScore: scoreFromTie(handRank, tieBreak),
    tieBreak,
  };
}

export function comparePokerHands(leftCards: string[] | PokerCard[], rightCards: string[] | PokerCard[]): number {
  const left = evaluatePokerHand(leftCards);
  const right = evaluatePokerHand(rightCards);

  if (left.handScore === right.handScore) {
    return 0;
  }

  return left.handScore > right.handScore ? 1 : -1;
}
