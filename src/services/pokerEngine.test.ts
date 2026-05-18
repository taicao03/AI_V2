import { describe, expect, it } from 'vitest';
import { comparePokerHands, evaluatePokerHand } from './pokerEngine';

describe('evaluatePokerHand', () => {
  it('detects Straight Flush', () => {
    const hand = evaluatePokerHand(['TS', 'JS', 'QS', 'KS', 'AS']);
    expect(hand.handRank).toBe(1);
  });

  it('detects Four of a Kind', () => {
    const hand = evaluatePokerHand(['AS', 'AH', 'AD', 'AC', '2S']);
    expect(hand.handRank).toBe(2);
  });

  it('detects Full House', () => {
    const hand = evaluatePokerHand(['KS', 'KH', 'KD', '2C', '2D']);
    expect(hand.handRank).toBe(3);
  });

  it('detects Flush', () => {
    const hand = evaluatePokerHand(['AS', 'QS', '9S', '4S', '2S']);
    expect(hand.handRank).toBe(4);
  });

  it('detects Straight', () => {
    const hand = evaluatePokerHand(['9S', '8H', '7D', '6C', '5S']);
    expect(hand.handRank).toBe(5);
  });

  it('detects Three of a Kind', () => {
    const hand = evaluatePokerHand(['QS', 'QH', 'QD', '8C', '2S']);
    expect(hand.handRank).toBe(6);
  });

  it('detects Two Pair', () => {
    const hand = evaluatePokerHand(['AS', 'AH', 'KD', 'KC', '2S']);
    expect(hand.handRank).toBe(7);
  });

  it('detects One Pair', () => {
    const hand = evaluatePokerHand(['AS', 'AH', 'KD', 'QC', '2S']);
    expect(hand.handRank).toBe(8);
  });

  it('detects High Card', () => {
    const hand = evaluatePokerHand(['AS', 'KD', 'QC', '9H', '2S']);
    expect(hand.handRank).toBe(9);
  });

  it('handles A-2-3-4-5 straight correctly', () => {
    const hand = evaluatePokerHand(['AS', '2H', '3D', '4C', '5S']);
    expect(hand.handRank).toBe(5);
    expect(hand.tieBreak[0]).toBe(5);
  });
});

describe('comparePokerHands', () => {
  it('compares same rank with kicker/tie break', () => {
    const left = ['AS', 'AH', 'KD', 'QC', '2S'];
    const right = ['AS', 'AH', 'KD', 'JC', '3S'];
    expect(comparePokerHands(left, right)).toBe(1);
  });

  it('returns tie for exact same strength', () => {
    const left = ['AS', 'AH', 'KD', 'QC', '2S'];
    const right = ['AD', 'AC', 'KH', 'QS', '2D'];
    expect(comparePokerHands(left, right)).toBe(0);
  });
});
