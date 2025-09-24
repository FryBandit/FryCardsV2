
import { CardData, CardRank, CardSuit } from '../types';

export interface HandResult {
  name: string;
  hand: CardData[];
  value: number[]; // [handRank, highCard1, highCard2, ...]
}

const RANK_VALUES: Record<CardRank, number> = {
  [CardRank.Two]: 2,
  [CardRank.Three]: 3,
  [CardRank.Four]: 4,
  [CardRank.Five]: 5,
  [CardRank.Six]: 6,
  [CardRank.Seven]: 7,
  [CardRank.Eight]: 8,
  [CardRank.Nine]: 9,
  [CardRank.Ten]: 10,
  [CardRank.Jack]: 11,
  [CardRank.Queen]: 12,
  [CardRank.King]: 13,
  [CardRank.Ace]: 14,
};

const getCombinations = (cards: CardData[], k: number): CardData[][] => {
  if (k > cards.length || k <= 0) return [];
  if (k === cards.length) return [cards];
  if (k === 1) return cards.map(card => [card]);

  const combinations: CardData[][] = [];
  const tail = cards.slice(1);
  const combosWithoutFirst = getCombinations(tail, k);
  const combosWithFirst = getCombinations(tail, k - 1).map(combo => [cards[0], ...combo]);
  
  return [...combosWithoutFirst, ...combosWithFirst];
};

const checkHand = (hand: CardData[]): HandResult => {
    const sortedHand = [...hand].sort((a, b) => RANK_VALUES[b.rank!] - RANK_VALUES[a.rank!]);
    const ranks = sortedHand.map(c => RANK_VALUES[c.rank!]);
    const suits = sortedHand.map(c => c.suit!);

    const isFlush = suits.every(s => s === suits[0]);
    const isWheel = ranks.join(',') === '14,5,4,3,2';
    const isStraight = (ranks[0] - ranks[4] === 4 && new Set(ranks).size === 5) || isWheel;

    const rankCounts = ranks.reduce((acc, rank) => {
        acc[rank] = (acc[rank] || 0) + 1;
        return acc;
    }, {} as Record<number, number>);

    const ranksByCount = Object.keys(rankCounts)
        .map(Number)
        .sort((a,b) => {
            const countDiff = rankCounts[b] - rankCounts[a];
            if (countDiff !== 0) return countDiff;
            return b - a; // If counts are equal, sort by rank
        });

    if (isStraight && isFlush) {
        if (ranks[0] === RANK_VALUES[CardRank.Ace] && ranks[1] === RANK_VALUES[CardRank.King]) return { name: 'Royal Flush', value: [10], hand: sortedHand };
        if (isWheel) return { name: 'Straight Flush (Wheel)', value: [9, 5], hand: sortedHand };
        return { name: 'Straight Flush', value: [9, ranks[0]], hand: sortedHand };
    }
    if (rankCounts[ranksByCount[0]] === 4) {
        return { name: 'Four of a Kind', value: [8, ranksByCount[0], ranksByCount[1]], hand: sortedHand };
    }
    if (rankCounts[ranksByCount[0]] === 3 && ranksByCount.length > 1 && rankCounts[ranksByCount[1]] === 2) {
        return { name: 'Full House', value: [7, ranksByCount[0], ranksByCount[1]], hand: sortedHand };
    }
    if (isFlush) {
        return { name: 'Flush', value: [6, ...ranks], hand: sortedHand };
    }
    if (isStraight) {
        if (isWheel) return { name: 'Straight (Wheel)', value: [5, 5], hand: sortedHand };
        return { name: 'Straight', value: [5, ranks[0]], hand: sortedHand };
    }
    if (rankCounts[ranksByCount[0]] === 3) {
        const kickers = ranks.filter(r => r !== ranksByCount[0]);
        return { name: 'Three of a Kind', value: [4, ranksByCount[0], ...kickers], hand: sortedHand };
    }
    if (ranksByCount.length > 1 && rankCounts[ranksByCount[0]] === 2 && rankCounts[ranksByCount[1]] === 2) {
        const kicker = ranks.find(r => r !== ranksByCount[0] && r !== ranksByCount[1]);
        return { name: 'Two Pair', value: [3, ranksByCount[0], ranksByCount[1], kicker!], hand: sortedHand };
    }
    if (rankCounts[ranksByCount[0]] === 2) {
        const kickers = ranks.filter(r => r !== ranksByCount[0]);
        return { name: 'One Pair', value: [2, ranksByCount[0], ...kickers], hand: sortedHand };
    }
    
    return { name: 'High Card', value: [1, ...ranks], hand: sortedHand };
};

export const compareHands = (hand1: HandResult, hand2: HandResult): number => {
    for (let i = 0; i < Math.max(hand1.value.length, hand2.value.length); i++) {
        const v1 = hand1.value[i] || 0;
        const v2 = hand2.value[i] || 0;
        if (v1 > v2) return 1;
        if (v1 < v2) return -1;
    }
    return 0;
}

export const evaluateHand = (sevenCards: CardData[]): HandResult => {
  const pokerCards = sevenCards.filter(c => c.rank && c.suit);
  if (pokerCards.length < 5) {
      return { name: 'Not enough cards', hand: [], value: [0] };
  }
  
  const all5CardHands = getCombinations(pokerCards, 5);
  
  if (all5CardHands.length === 0) {
    return { name: 'No 5-card hands', hand: [], value: [0] };
  }

  return all5CardHands
      .map(checkHand)
      .reduce((best, current) => (compareHands(current, best) > 0 ? current : best));
};
