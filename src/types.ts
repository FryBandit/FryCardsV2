import { HandResult } from './lib/poker';

export enum CardType {
  Unit = 'Unit',
  Location = 'Location',
  Event = 'Event',
  Artifact = 'Artifact',
}

export enum Rarity {
  Common = 'Common',
  Uncommon = 'Uncommon',
  Rare = 'Rare',
  SuperRare = 'Super-Rare',
  Mythic = 'Mythic',
  Divine = 'Divine',
}

export enum CardSuit {
  Spades = 'Spades',
  Hearts = 'Hearts',
  Diamonds = 'Diamonds',
  Clubs = 'Clubs',
}

export enum CardRank {
  Two = '2',
  Three = '3',
  Four = '4',
  Five = '5',
  Six = '6',
  Seven = '7',
  Eight = '8',
  Nine = '9',
  Ten = '10',
  Jack = 'J',
  Queen = 'Q',
  King = 'K',
  Ace = 'A',
}

export interface Ability {
  name: string;
  description: string;
  value?: number;
  type?: 'Mana';
  // New keyword properties
  cost?: number; // For Imbue
  charges?: number; // For Charge
  duration?: number; // For Chrono
  condition?: string; // For Trap, Flux
  overloadCost?: number; // For Overload
  overloadDescription?: string; // For Overload UI
  abilityToGrant?: Ability; // For Imbue
}


export interface CardData {
  id: number;
  name:string;
  description: string;
  type: CardType;
  rarity: Rarity;
  imageUrl: string;
  set: string;
  author: string;
  suit?: CardSuit;
  rank?: CardRank;
  manaCost?: number;
  abilities?: Ability[];
}

// --- New Types for River of Ruin ---

export interface PlayerState {
  id: number;
  name: string;
  deck: CardData[];
  hand: CardData[];
  holeCards: CardData[];
  artifacts: CardData[];
  discard: CardData[];
  mana: number;
  points: number;
  bet: number;
  hasActed: boolean;
  hasMadeBettingActionThisTurn: boolean;
  hasDiscarded: boolean;
  hasPeeked: boolean;
  hasUsedCrossroadsThisTurn: boolean;
  // New state properties
  manaDebt: number;
  trapCard: CardData | null;
  activeChronoEffects: { cardName: string, turns: number, description: string }[];
}

export type GamePhase =
  | 'SETUP'
  | 'PRE_FLOP'
  | 'FLOP'
  | 'TURN'
  | 'RIVER'
  | 'SHOWDOWN'
  | 'END_ROUND'
  | 'GAME_OVER';

export interface GameState {
  players: [PlayerState, PlayerState];
  riverDeck: CardData[];
  communityCards: CardData[];
  activeLocation: CardData | null;
  pot: number;
  activePlayerIndex: 0 | 1;
  phase: GamePhase;
  log: string[];
  winner: PlayerState | null;
  firstPlayerIndexThisRound: 0 | 1;
  lastRoundWinnerId: number | null;
  // Betting state
  amountToCall: number;
  lastBettor: number | null;
  lastBetSize: number;
  // Showdown state
  showdownResults?: {
    p1Hand: HandResult;
    p2Hand: HandResult;
    winnerIndex: number;
  } | null;
}