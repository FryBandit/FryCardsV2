
import React, { useState, useCallback, useEffect } from 'react';
import { CardData, GameState, PlayerState, CardType, CardRank, Rarity, Ability, CardSuit } from './types';
import { CARDS, RIVER_DECK_UNITS, RANKS, assignRandomPokerValue, ANTE } from './constants';
import { evaluateHand, compareHands, RANK_VALUES } from './lib/poker';
import { masterResolveCardEffect } from './lib/effects';
import { shuffle } from './lib/utils';
import GameBoard from './components/GameBoard';
import HomeScreen from './components/HomeScreen';
import RulesScreen from './components/RulesScreen';


const STARTING_POINTS = 20;
const STARTING_MANA = 5;
const STARTING_HAND_SIZE = 5;
const MANA_SINK_CYCLE_COST = 2;


const createPlayerDeck = (): CardData[] => shuffle(CARDS);

// Helper to update player flags based on cards in play
const updatePlayerFlags = (player: PlayerState): PlayerState => {
    const allPlayerCards = [...player.holeCards, ...player.artifacts];
    player.hasBulwark = allPlayerCards.some(c => c.abilities?.some(a => a.name === 'Bulwark'));
    player.hasIntimidate = allPlayerCards.some(c => c.abilities?.some(a => a.name === 'Intimidate'));
    player.hasFlux = allPlayerCards.some(c => c.abilities?.some(a => a.name === 'Flux'));
    player.hasEconomist = allPlayerCards.some(c => c.abilities?.some(a => a.name === 'Economist'));
    return player;
};

const resolveShowdown = (state: GameState): GameState => {
    // This function mutates the state object passed to it.
    const getPlayerShowdownCards = (player: PlayerState, communityCards: CardData[], log: string[]): { cards: CardData[] } => {
        let holeCards = player.holeCards.map(c => ({ ...c })); // deep copy for modification
        
        // Handle 'Last Stand'
        if (player.points <= 5) {
            holeCards.forEach(card => {
                const lastStandAbility = card.abilities?.find(a => a.name === 'Last Stand');
                if (lastStandAbility && player.mana >= (lastStandAbility.cost || 3)) {
                    player.mana -= (lastStandAbility.cost || 3);
                    const currentRankIndex = RANKS.indexOf(card.rank!);
                    if (currentRankIndex < RANKS.length - 1) { // not an ace
                        card.rank = RANKS[currentRankIndex + 1];
                        log.push(`> *${player.name}* pays !3 mana! for %${card.name}% to trigger %Last Stand%!`);
                    }
                }
            });
        }
        return { cards: [...holeCards, ...communityCards] };
    };

    let logMessage = `--- @Showdown!@ ---`;

    let finalCommunityCards = state.communityCards;
    if (state.spadesRound) {
        logMessage += `\n> %Eternal Eclipse% is active! All community cards are Spades.`;
        finalCommunityCards = state.communityCards.map(c => ({...c, suit: CardSuit.Spades }));
    }

    // Trigger start-of-showdown abilities BEFORE evaluating hands
    state.players.forEach((player) => {
        player.holeCards.forEach(card => {
            if (card.abilities?.some(a => a.name === 'Gravity Well')) {
                const opponent = state.players.find(p => p.id !== player.id)!;
                const manaLost = Math.floor(opponent.mana / 2);
                opponent.mana -= manaLost;
                state.log.push(`> *${player.name}*'s %${card.name}% triggers %Gravity Well%! *${opponent.name}* loses !${manaLost} mana!.`);
            }
        });
    });

    let p1Log: string[] = [];
    let p2Log: string[] = [];
    const { cards: p1Cards } = getPlayerShowdownCards(state.players[0], finalCommunityCards, p1Log);
    const { cards: p2Cards } = getPlayerShowdownCards(state.players[1], finalCommunityCards, p2Log);

    const p1Hand = evaluateHand(p1Cards);
    const p2Hand = evaluateHand(p2Cards);
    
    // Trigger post-evaluation abilities like 'Underdog'
    [p1Hand, p2Hand].forEach((hand, index) => {
        const player = state.players[index];
        player.holeCards.forEach(card => {
            card.abilities?.forEach(ability => {
                if (ability.name === 'Underdog' && hand.value[0] <= 2) { // High Card or One Pair
                   const manaGain = ability.value || 1;
                   player.mana += manaGain;
                   state.log.push(`> *${player.name}*'s %${card.name}% triggers %Underdog%, gaining +${manaGain} mana+.`);
                }
            });
        });
    });

    let winnerIndex = -1;
    logMessage += `\n` +
     `${p1Log.join('\n')}\n${p2Log.join('\n')}`.trim() +`\n`+
     `*${state.players[0].name}* has: %${p1Hand.name}%\n` +
     `*${state.players[1].name}* has: %${p2Hand.name}%`;

    const comparison = compareHands(p1Hand, p2Hand);
    if(comparison > 0) winnerIndex = 0;
    else if (comparison < 0) winnerIndex = 1;
    
    const isSanctuaryActive = state.activeLocation?.abilities?.some(a => a.name === 'Sanctuary');
    
    if (winnerIndex !== -1) {
        const loserIndex = winnerIndex === 0 ? 1 : 0;
        logMessage += `\n> *${state.players[winnerIndex].name}* wins the showdown!`;
        
        const winner = state.players[winnerIndex];
        const loser = state.players[loserIndex];
        
        let pot = state.pot;
        
        // Handle uneven bets from all-ins first, return excess money
        if (winner.bet > loser.bet) {
            const excess = winner.bet - loser.bet;
            winner.points += excess;
            pot -= excess;
            logMessage += `\n> Returning ~${excess}~ uncalled bet to *${winner.name}*.`;
        } else if (loser.bet > winner.bet) {
            const excess = loser.bet - winner.bet;
            loser.points += excess;
            pot -= excess;
            logMessage += `\n> Returning ~${excess}~ uncalled bet to *${loser.name}*.`;
        }

        if (isSanctuaryActive) {
            const amountToReturn = loser.bet;
            logMessage += `\n> *${loser.name}* is protected by %Sanctuary%! Their bet of ~${amountToReturn}~ is returned.`;
            loser.points += amountToReturn;
            pot -= amountToReturn;
        }

        winner.points += pot; // Winner gains the remaining pot
        logMessage += `\n> *${winner.name}* wins the remaining pot of ~${pot}~.`;

        if (winner.hasFlux) {
            const fluxBonus = Math.floor(state.pot / 10);
            if (fluxBonus > 0) {
                winner.points += fluxBonus;
                logMessage += `\n> *${winner.name}*'s %Flux% grants an extra +${fluxBonus} points+!`;
            }
        }
        
        state.lastRoundWinnerId = winner.id;
        
        if (winner.wager62Active) {
            const winnerHand = winnerIndex === 0 ? p1Hand : p2Hand;
            if (winnerHand.value[0] >= 7) { // 7 is Full House
                state.phase = 'GAME_OVER';
                state.winner = winner;
                logMessage += `\n> *${winner.name}* wins with a %${winnerHand.name}%! %The Last Plating% is perfected, and they !win the game!`;
            } else {
                logMessage += `\n> *${winner.name}*'s %${winnerHand.name}% was not strong enough for %The Last Plating%! The wager fails.`;
            }
        }
        if(loser.wager62Active) {
            loser.points = 1;
            logMessage += `\n> *${loser.name}*'s wager fails! Their points are set to !1!.`;
        }

    } else {
        logMessage += `\n> It's a tie! The pot is split.`;
        let p1 = state.players[0];
        let p2 = state.players[1];
        let potToSplit = state.pot;

        if (p1.bet < p2.bet) {
            const excess = p2.bet - p1.bet;
            p2.points += excess;
            potToSplit -= excess;
            logMessage += `\n> Returning ~${excess}~ uncalled bet to *${p2.name}*.`;
        } else if (p2.bet < p1.bet) {
            const excess = p1.bet - p2.bet;
            p1.points += excess;
            potToSplit -= excess;
            logMessage += `\n> Returning ~${excess}~ uncalled bet to *${p1.name}*.`;
        }
        
        const p1Share = Math.floor(potToSplit / 2);
        const p2Share = Math.ceil(potToSplit / 2);

        p1.points += p1Share;
        p2.points += p2Share;

        logMessage += `\n> *${p1.name}* receives ~${p1Share}~ and *${p2.name}* receives ~${p2Share}~.`;
        
        [p1, p2].forEach(p => {
            if (p.wager62Active) {
                p.points = 1;
                logMessage += `\n> *${p.name}* did not win the showdown! Their %The Last Plating% wager fails and their points are set to !1!.`;
            }
        });

        state.lastRoundWinnerId = null;
    }
    state.log.push(logMessage);

    const p1isBust = state.players[0].points <= 0;
    const p2isBust = state.players[1].points <= 0;

    if ((p1isBust || p2isBust) && state.phase !== 'GAME_OVER') {
        state.phase = 'GAME_OVER';
        if (p1isBust && p2isBust) {
            state.winner = null;
            state.log.push(`\n--- @Both players ran out of points! The game is a draw!@ ---`);
        } else {
            state.winner = p1isBust ? state.players[1] : state.players[0];
            state.log.push(`\n--- @*${state.winner.name}* wins the game!@ ---`);
        }
    }
    
    state.showdownResults = { p1Hand, p2Hand, winnerIndex };
    return state;
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [theme, setTheme] = useState<string>(() => document.documentElement.getAttribute('data-theme') || 'nightdrive');
  const [view, setView] = useState<'home' | 'game' | 'rules'>('home');

  const advancePhase = (state: GameState): GameState => {
     // This function mutates the state object passed to it.
     
     // Reset for next betting round
     state.amountToCall = 0;
     state.lastBettor = null;
     state.lastBetSize = ANTE; // Minimum bet for the new round
     state.players.forEach(p => { p.hasMadeBettingActionThisTurn = false; });
     
     switch (state.phase) {
        case 'PRE_FLOP':
            state.phase = 'FLOP';
            state.communityCards = state.riverDeck.slice(0, 3);
            state.riverDeck = state.riverDeck.slice(3);
            state.log.push('--- @The Flop@ ---', ...state.communityCards.map(c => `Revealed: %${c.rank} of ${c.suit}%`));
            state.activePlayerIndex = state.firstPlayerIndexThisRound;
            return state;
        case 'FLOP':
             state.phase = 'TURN';
             const turnCard = state.riverDeck[0];
             state.communityCards = [...state.communityCards, turnCard];
             state.riverDeck = state.riverDeck.slice(1);
             state.log.push('--- @The Turn@ ---', `Revealed: %${turnCard.rank} of ${turnCard.suit}%`);
             state.activePlayerIndex = state.firstPlayerIndexThisRound;
            return state;
        case 'TURN':
             state.phase = 'RIVER';
             const riverCard = state.riverDeck[0];
             state.communityCards = [...state.communityCards, riverCard];
             state.riverDeck = state.riverDeck.slice(1);
             state.log.push('--- @The River@ ---', `Revealed: %${riverCard.rank} of ${riverCard.suit}%`);
             state.activePlayerIndex = state.firstPlayerIndexThisRound;
            return state;
        case 'RIVER': {
            // Volatile ability check BEFORE showdown
            if (state.activeLocation?.abilities?.some(a => a.name === 'Volatile')) {
                const damage = state.activeLocation.abilities.find(a => a.name === 'Volatile')?.value ?? 3;
                state.log.push(`> %${state.activeLocation.name}% becomes unstable and !explodes!`);
                state.players.forEach(p => p.points -= damage);
                state.activeLocation = null;
            }

            resolveShowdown(state);
            state.phase = 'SHOWDOWN';
            return state;
          }
        case 'MULLIGAN':
            state.phase = 'PRE_FLOP';
            state.log.push(`--- @Betting Begins@ ---`);
            state.log.push(`*${state.players[state.activePlayerIndex].name}* acts first.`);
            return state;
     }
     return state;
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('fry-cards-theme', theme);
  }, [theme]);

  const startRound = useCallback((currentState: GameState): GameState => {
    // Strips rank/suit from cards before they go back to the deck
    const cleanPlayerCards = (cards: CardData[]): CardData[] => {
        return cards.map(({ rank, suit, ...rest }) => rest);
    };

    const p1DeckContents = [
        ...currentState.players[0].deck, 
        ...currentState.players[0].hand, 
        ...currentState.players[0].holeCards, 
        ...currentState.players[0].artifacts, 
        ...currentState.players[0].discard
    ];
    const p2DeckContents = [
        ...currentState.players[1].deck,
        ...currentState.players[1].hand,
        ...currentState.players[1].holeCards,
        ...currentState.players[1].artifacts,
        ...currentState.players[1].discard
    ];

    const p1FullDeck = shuffle(cleanPlayerCards(p1DeckContents));
    const p2FullDeck = shuffle(cleanPlayerCards(p2DeckContents));
    
    // Check if players can afford the ante before the round starts
    if (currentState.players[0].points < ANTE || currentState.players[1].points < ANTE) {
        const finalState: GameState = JSON.parse(JSON.stringify(currentState));
        finalState.phase = 'GAME_OVER';

        const p1Bust = finalState.players[0].points < ANTE;
        const p2Bust = finalState.players[1].points < ANTE;

        if (p1Bust && p2Bust) {
            finalState.winner = null;
            finalState.log.push(`--- @Both players cannot post the ante! The game is a draw!@ ---`);
        } else {
            finalState.winner = p1Bust ? finalState.players[1] : finalState.players[0];
            finalState.log.push(`--- @${p1Bust ? currentState.players[0].name : currentState.players[1].name} cannot post the ante!@ ---`);
            finalState.log.push(`--- @*${finalState.winner.name}* wins the game!@ ---`);
        }
        return finalState;
    }

    const p1Points = currentState.players[0].points - ANTE;
    const p2Points = currentState.players[1].points - ANTE;

    const dealPlayerCards = (deck: CardData[]) => {
      const units = shuffle(deck.filter(c => c.type === CardType.Unit));
      const nonUnits = shuffle(deck.filter(c => c.type !== CardType.Unit));

      // Rules: Hole cards are always units.
      if (units.length < 2) {
        while(units.length < 2 && nonUnits.length > 0) {
            units.push(nonUnits.pop()!);
        }
        if (units.length < 2) throw new Error("FATAL: Not enough cards in deck to deal hole cards.");
      }
      
      const holeCard1 = units.shift()!;
      const holeCard2 = units.shift()!;
      const holeCards = [assignRandomPokerValue(holeCard1), assignRandomPokerValue(holeCard2)];

      const hand = nonUnits.splice(0, STARTING_HAND_SIZE);
      const remainingDeck = shuffle([...units, ...nonUnits]);
      
      return { holeCards, hand, remainingDeck };
    }
    
    const { holeCards: p1Hole, hand: p1Hand, remainingDeck: p1RemainingDeck } = dealPlayerCards(p1FullDeck);
    const { holeCards: p2Hole, hand: p2Hand, remainingDeck: p2RemainingDeck } = dealPlayerCards(p2FullDeck);

    const firstPlayer = currentState.lastRoundWinnerId === null ? (currentState.firstPlayerIndexThisRound === 0 ? 1 : 0) : (currentState.players.findIndex(p => p.id !== currentState.lastRoundWinnerId));


    let baseP1: PlayerState = { ...currentState.players[0], deck: p1RemainingDeck, hand: p1Hand, holeCards: p1Hole, artifacts: [], discard: [], mana: STARTING_MANA, points: p1Points, bet: ANTE, hasActed: false, hasDiscarded: false, hasPeeked: false, hasMadeBettingActionThisTurn: false, hasUsedEconomistThisRound: false, manaDebt: 0, trapCard: null, activeChronoEffects: [], mulliganed: false, wager62Active: false, charges: {}, stats: { ...currentState.players[0].stats, handsPlayed: currentState.players[0].stats.handsPlayed + 1 }, cardPlayLocked: false };
    let baseP2: PlayerState = { ...currentState.players[1], deck: p2RemainingDeck, hand: p2Hand, holeCards: p2Hole, artifacts: [], discard: [], mana: STARTING_MANA, points: p2Points, bet: ANTE, hasActed: false, hasDiscarded: false, hasPeeked: false, hasMadeBettingActionThisTurn: false, hasUsedEconomistThisRound: false, manaDebt: 0, trapCard: null, activeChronoEffects: [], mulliganed: false, wager62Active: false, charges: {}, stats: { ...currentState.players[1].stats, handsPlayed: currentState.players[1].stats.handsPlayed + 1 }, cardPlayLocked: false  };

    const newState: GameState = {
      players: [baseP1, baseP2],
      riverDeck: shuffle(RIVER_DECK_UNITS),
      communityCards: [],
      activeLocation: null,
      pot: ANTE * 2,
      phase: 'MULLIGAN',
      log: [`--- @New Round@ ---`, `Both players ante ~${ANTE}~. Pot is ~${ANTE * 2}~.`, `--- @Mulligan Phase@ ---`],
      winner: null,
      activePlayerIndex: firstPlayer as 0 | 1,
      firstPlayerIndexThisRound: firstPlayer as 0 | 1,
      amountToCall: 0,
      lastBettor: null,
      lastBetSize: ANTE,
      showdownResults: null,
      lastRoundWinnerId: currentState.lastRoundWinnerId,
      spadesRound: false,
    };
    
    // Handle start-of-round abilities
    newState.players.forEach((player, index) => {
        player.holeCards.forEach(card => {
            card.abilities?.forEach(ability => {
                if (ability.name === 'Momentum' && player.id === newState.lastRoundWinnerId) {
                    player.mana += ability.value || 3;
                    newState.log.push(`> *${player.name}*'s %${card.name}% triggers %Momentum%! Gained +${ability.value || 3} mana+.`);
                }
                if (ability.name === 'Synergy (2 Mana)' || ability.name === 'Synergy (Rank)') {
                    const otherCard = player.holeCards.find(c => c.id !== card.id);
                    if (otherCard && (otherCard.suit === card.suit || otherCard.rank === card.rank)) {
                        player.mana += ability.value || 2;
                        newState.log.push(`> *${player.name}*'s %${card.name}% triggers %Synergy%! Gained +${ability.value || 2} mana+.`);
                    }
                }
            })
        });
        newState.players[index] = updatePlayerFlags(player);
    });

    return newState;
  }, []);

  const initGame = useCallback(() => {
    const p1: PlayerState = { id: 1, name: 'Player 1', deck: createPlayerDeck(), hand: [], holeCards: [], artifacts: [], discard: [], mana: 0, points: STARTING_POINTS, bet: 0, hasActed: false, hasDiscarded: false, hasPeeked: false, hasMadeBettingActionThisTurn: false, hasUsedEconomistThisRound: false, manaDebt: 0, trapCard: null, activeChronoEffects: [], mulliganed: false, wager62Active: false, charges: {}, hasBulwark: false, hasIntimidate: false, hasFlux: false, hasEconomist: false, cardPlayLocked: false, stats: { handsPlayed: 0 } };
    const p2: PlayerState = { id: 2, name: 'CPU', deck: createPlayerDeck(), hand: [], holeCards: [], artifacts: [], discard: [], mana: 0, points: STARTING_POINTS, bet: 0, hasActed: false, hasDiscarded: false, hasPeeked: false, hasMadeBettingActionThisTurn: false, hasUsedEconomistThisRound: false, manaDebt: 0, trapCard: null, activeChronoEffects: [], mulliganed: false, wager62Active: false, charges: {}, hasBulwark: false, hasIntimidate: false, hasFlux: false, hasEconomist: false, cardPlayLocked: false, stats: { handsPlayed: 0 } };

    const initialGameState: GameState = {
      players: [p1, p2], riverDeck: [], communityCards: [], activeLocation: null, pot: 0, activePlayerIndex: 0,
      phase: 'SETUP', log: ['Game Initialized...'], winner: null, amountToCall: 0, lastBettor: null, lastBetSize: ANTE,
      firstPlayerIndexThisRound: Math.round(Math.random()) as 0 | 1,
      lastRoundWinnerId: null,
    };
    setGameState(startRound(initialGameState));
  }, [startRound]);
  
   const getCpuAction = useCallback((gs: GameState, isMulliganCheck: boolean = false): { action: string, payload?: any } | null => {
        const cpu = gs.players[1];
        const player = gs.players[0];

        if (isMulliganCheck) {
            if (cpu.hand.length === 0) return { action: 'KEEP_HAND' };
            const lowCostPlays = cpu.hand.filter(c => (c.manaCost || 99) <= 3).length;
            const highCostCards = cpu.hand.filter(c => (c.manaCost || 0) > 5).length;
            
            if (highCostCards >= 3 && lowCostPlays === 0) return { action: 'MULLIGAN' };
            if (lowCostPlays === 0 && cpu.hand.length > 2) return { action: 'MULLIGAN' };
            return { action: 'KEEP_HAND' };
        }

        const { communityCards, phase, pot, lastBetSize } = gs;
        const pokerCards = [...cpu.holeCards, ...communityCards].filter(c => c.rank && c.suit);
        const amountToCall = player.bet - cpu.bet;

        let handStrength: number;
        let handPotential = 0;

        if (phase === 'PRE_FLOP') {
            const card1 = cpu.holeCards[0];
            const card2 = cpu.holeCards[1];
            const rank1 = RANK_VALUES[card1.rank!];
            const rank2 = RANK_VALUES[card2.rank!];
            const isPair = rank1 === rank2;
            const isSuited = card1.suit === card2.suit;
            const gap = Math.abs(rank1 - rank2) - 1;

            let baseStrength = (rank1 + rank2) / 28;
            if (isPair) baseStrength += 0.45;
            if (isSuited) baseStrength += 0.15;
            if (gap === 0) baseStrength += 0.1;
            if (gap > 0 && gap <= 3) baseStrength += (0.05 / (gap + 1));
            handStrength = Math.min(1, baseStrength);
        } else {
            const cpuHand = evaluateHand(pokerCards);
            handStrength = (cpuHand.value[0] - 1) / 9;

            if (phase !== 'RIVER') {
                const suits = pokerCards.reduce((acc, card) => { acc[card.suit!] = (acc[card.suit!] || 0) + 1; return acc; }, {} as Record<string, number>);
                if (Object.values(suits).some(count => count === 4)) handPotential = Math.max(handPotential, 9 / 47);
                const uniqueRanks = [...new Set(pokerCards.map(c => RANK_VALUES[c.rank!]))].sort((a, b) => a - b);
                if (uniqueRanks.length >= 4) {
                    for (let i = 0; i <= uniqueRanks.length - 4; i++) {
                        if (uniqueRanks[i + 3] - uniqueRanks[i] === 3 && uniqueRanks.length === 4) handPotential = Math.max(handPotential, 8 / 47);
                        if (uniqueRanks[i + 3] - uniqueRanks[i] === 4 && uniqueRanks.length === 4) handPotential = Math.max(handPotential, 4 / 47);
                    }
                }
            }
        }
        const effectiveHandStrength = Math.min(1, handStrength + handPotential * 1.5);

        const possibleActions: { action: string, payload?: any, score: number }[] = [];
        
        const opponentHasIntimidate = player.hasIntimidate;
        const opponentHasBulwark = player.hasBulwark;

        // --- Non-Betting Actions ---
        const peekCard = cpu.holeCards.find(c => c.abilities?.some(a => a.name === 'Peek'));
        if (peekCard && !cpu.hasPeeked && cpu.mana >= 1 && (phase === 'FLOP' || phase === 'TURN') && handPotential > 0.15) {
            possibleActions.push({ action: 'PEEK', payload: { cardId: peekCard.id }, score: 0.65 });
        }
        
        if (amountToCall <= 0 && !cpu.cardPlayLocked) {
            cpu.hand.forEach((card, index) => {
                const playCard = (isOverload: boolean) => {
                    let score = 0.5;
                    // De-prioritize playing cards with a very strong poker hand to encourage betting for value
                    if (effectiveHandStrength > 0.85 && phase !== 'PRE_FLOP') score -= 0.5;

                    if (card.type === CardType.Artifact) score += 0.4;
                    if (card.type === CardType.Location && (gs.phase === 'PRE_FLOP' || gs.phase === 'FLOP')) score += 0.5;
                    
                    if (card.type === CardType.Event && effectiveHandStrength > 0.7 && !card.abilities?.some(a => a.name === 'Wager')) score -= 0.3;
                    
                    if (card.id === 4 && player.points <= 10) score += (isOverload ? 1.5 : 0.5); // Solar Flare on low health
                    if (card.id === 14 && cpu.points < player.points) score += 0.8; // The Watcher Awakens (Bulwark) when behind
                    if (card.id === 16 || card.id === 21) score += 0.7; // Intimidate cards
                    if (card.id === 8) score += 0.4; // Message from the Stars (card draw)
                    if (card.id === 12 && player.hand.length >= 4) score += 0.8; // The Hunger vs large hand
                    if (card.id === 13 && gs.phase === 'PRE_FLOP') score += 0.8; // Hollow Starlight early
                    if (card.id === 26) score += (isOverload ? 5.0 : 1.0); // Singularity of Fear is a high priority
                    if (card.id === 29 && (cpu.holeCards.some(c => c.suit === CardSuit.Spades) || pokerCards.filter(c => c.suit === CardSuit.Spades).length >= 3)) score += 1.5; // Eternal Eclipse with spade synergy
                    if (card.id === 62 && effectiveHandStrength > 0.7 && gs.phase === 'RIVER' && (player.points / STARTING_POINTS < 0.6)) score = 3.0; // The Last Plating as a finisher

                    if (card.abilities?.some(a => ['Bulwark', 'Intimidate', 'Flux', 'Economist'].includes(a.name)) && (gs.phase === 'PRE_FLOP' || gs.phase === 'FLOP')) {
                       score += 0.6;
                    }
                    if (card.abilities?.some(a => a.description.includes('loses') && a.description.includes('points')) && opponentHasBulwark) {
                        score -= 0.4;
                    }

                    if (isOverload) score += 0.6;
                    possibleActions.push({ action: 'PLAY_CARD', payload: { cardIndex: index, isOverload }, score });
                };

                const regularCost = card.manaCost || 99;
                if (regularCost <= cpu.mana) playCard(false);
                const overload = card.abilities?.find(a => a.name === 'Overload');
                if (overload && (overload.overloadCost || 99) <= cpu.mana) playCard(true);
            });
        }
        
        // --- Betting Actions ---
        const potOdds = amountToCall > 0 ? amountToCall / (pot + amountToCall) : 0;
        const fearFactor = Math.max(1, (amountToCall / (pot - amountToCall || 1)) * 1.5);
        let requiredStrengthToCall = potOdds * fearFactor * (1 + (Math.random() - 0.5) * 0.2); // Add some randomness
        
        if (opponentHasIntimidate) requiredStrengthToCall *= 1.2;
        if (cpu.hasEconomist) requiredStrengthToCall *= 0.95;
        if (cpu.hasBulwark && cpu.points < player.points) requiredStrengthToCall *= 0.9;

        if (amountToCall > 0) {
            if (effectiveHandStrength < requiredStrengthToCall * 0.9 && handPotential < 0.1) {
                possibleActions.push({ action: 'FOLD', score: 0.1 + (requiredStrengthToCall - effectiveHandStrength) });
            }
            if (cpu.points >= amountToCall && effectiveHandStrength >= requiredStrengthToCall * 0.8) {
                possibleActions.push({ action: 'CALL', score: 0.2 + (effectiveHandStrength - requiredStrengthToCall) * 2 });
            }
            if (cpu.points > amountToCall && effectiveHandStrength > Math.max(0.6, requiredStrengthToCall * 1.3)) {
                const raiseAggression = cpu.hasIntimidate ? 1.3 : 1.1;
                const raiseAmount = Math.min(cpu.points + cpu.bet, player.bet + Math.max(lastBetSize, Math.floor(pot * 0.75 * raiseAggression)));
                if (raiseAmount > player.bet) {
                    const intimidateBonus = cpu.hasIntimidate ? 0.25 : 0;
                    const handStrengthBonus = (effectiveHandStrength - 0.6) * 1.5;
                    possibleActions.push({ action: 'RAISE', payload: { amount: raiseAmount }, score: 0.7 + handStrengthBonus + intimidateBonus });
                }
            }
        } else {
            possibleActions.push({ action: 'CHECK', score: 0.3 + (1 - effectiveHandStrength) * 1.5 });
            if (cpu.points > 0) {
                const betAggression = cpu.hasIntimidate ? 1.25 : 1.0;
                if (effectiveHandStrength > 0.45) {
                    const betSize = 0.4 + (effectiveHandStrength - 0.4) * 1.3;
                    const randomness = 1 + (Math.random() - 0.5) * 0.2;
                    const betAmount = Math.min(cpu.points, Math.max(ANTE, Math.floor(pot * betSize * betAggression * randomness)));
                    const intimidateBonus = cpu.hasIntimidate ? 0.15 : 0;
                    if (betAmount > 0) possibleActions.push({ action: 'BET', payload: { amount: betAmount }, score: 0.55 + effectiveHandStrength + intimidateBonus });
                } else if (Math.random() < (0.15 + (gs.communityCards.some(c => c.rank === CardRank.Ace) ? 0.1 : 0))) { // Bluff
                    const bluffSize = (gs.phase === 'RIVER' || gs.phase === 'TURN') ? 0.75 : 0.5;
                    const randomness = 1 + (Math.random() - 0.5) * 0.3;
                    const betAmount = Math.min(cpu.points, Math.max(ANTE, Math.floor(pot * bluffSize * randomness)));
                    if (betAmount > 0) possibleActions.push({ action: 'BET', payload: { amount: betAmount }, score: 0.48 });
                }
            }
        }

        if (possibleActions.length === 0) {
            return amountToCall > 0 ? { action: 'FOLD' } : { action: 'CHECK' };
        }

        possibleActions.sort((a, b) => b.score - a.score);
        return possibleActions[0];
    }, []);

  const handleAction = useCallback((action: string, payload?: any) => {
    setGameState(prevState => {
      if (!prevState) return null;
      if (action === 'NEW_GAME') {
        initGame();
        return null;
      }
      if (action === 'NEXT_ROUND') {
          setGameState(startRound(prevState));
          return null; // Let the new state from startRound be the one
      }

      if (prevState.phase === 'GAME_OVER' || (prevState.phase === 'SHOWDOWN' && !prevState.winner)) {
          return prevState;
      }
      
      let newState = JSON.parse(JSON.stringify(prevState)) as GameState;
      const activePlayer = newState.players[newState.activePlayerIndex];
      const opponent = newState.players[newState.activePlayerIndex === 0 ? 1: 0];

      const endTurn = (state: GameState): GameState => {
        // This function mutates the state object passed to it
        if (state.phase === 'GAME_OVER' || state.phase === 'SHOWDOWN') return state;
        
        const actingPlayer = state.players[state.activePlayerIndex];
        
        // This correctly clears the lock on the player who just finished their locked turn.
        // E.g., P1 plays Eclipse -> P2 gets lock. P2's turn starts. P2 bets. P2's turn ends.
        // This function runs with actingPlayer = P2, clearing the lock for their next turn.
        if (actingPlayer.cardPlayLocked) {
          actingPlayer.cardPlayLocked = false;
        }
        
        const p1 = state.players[0];
        const p2 = state.players[1];
        const betsAreMatched = p1.bet === p2.bet;
        const aPlayerIsAllIn = p1.points === 0 || p2.points === 0;
        
        const bothPlayersActed = p1.hasMadeBettingActionThisTurn && p2.hasMadeBettingActionThisTurn;
        if ((bothPlayersActed && betsAreMatched) || (aPlayerIsAllIn && bothPlayersActed)) {
            return advancePhase(state);
        }

        state.activePlayerIndex = state.activePlayerIndex === 0 ? 1 : 0;
        const newActivePlayer = state.players[state.activePlayerIndex];
        const newOpponent = state.players[state.activePlayerIndex === 0 ? 1 : 0];
        
        // --- START OF TURN EFFECTS for new active player ---
        newActivePlayer.mana += 1;
        let manaGainedLog = ['gains +1 mana+'];

        if (state.activeLocation?.abilities?.some(a => a.name === "Mana Well")) {
            newActivePlayer.mana += 1;
            manaGainedLog.push('+1 from Mana Well+');
        }
        if (newActivePlayer.hasBulwark && newActivePlayer.points < newOpponent.points) {
            newActivePlayer.mana += 1;
            manaGainedLog.push('+1 from Bulwark+');
        }
        state.log.push(`*${newActivePlayer.name}* ${manaGainedLog.join(', ')}.`);
        
        newActivePlayer.hasDiscarded = false;
        newActivePlayer.hasPeeked = false;
        
        const remainingChronoEffects: any[] = [];
        newActivePlayer.activeChronoEffects.forEach(effect => {
            state.log.push(`> *${newActivePlayer.name}*'s %${effect.cardName}% %Chrono% effect triggers!`);
            switch(effect.cardId) {
                case 15: // The Ship's Last Breath
                    newOpponent.points -= 1;
                    state.log.push(`> *${newOpponent.name}* loses !1 point!.`)
                    break;
                case 195: // Mask of the Midnight Wings
                    if (newActivePlayer.deck.length > 0) {
                        const topCard = newActivePlayer.deck.shift()!;
                        state.log.push(`> Playing %${topCard.name}% for free from Chrono effect.`);
                        state = masterResolveCardEffect(state, topCard, state.activePlayerIndex as 0|1, false);
                        const playerAfterEffect = state.players[state.activePlayerIndex];
                         switch (topCard.type) {
                            case CardType.Event: playerAfterEffect.discard.push(topCard); break;
                            case CardType.Artifact: 
                                playerAfterEffect.artifacts.push(topCard); 
                                updatePlayerFlags(playerAfterEffect);
                                break;
                            case CardType.Location: state.activeLocation = topCard; break;
                            default: playerAfterEffect.discard.push(topCard); break;
                        }
                    }
                    break;
            }

            effect.turns -= 1;
            if (effect.turns > 0) {
                remainingChronoEffects.push(effect);
            } else {
                state.log.push(`> %${effect.cardName}% %Chrono% effect has ended.`);
            }
        });
        newActivePlayer.activeChronoEffects = remainingChronoEffects;
        updatePlayerFlags(newActivePlayer);
        return state;
      }
      
      if (newState.phase === 'MULLIGAN') {
          const playerIndex = newState.activePlayerIndex;
          const player = newState.players[playerIndex];

          if (player.mulliganed) return newState;

          if (action === 'KEEP_HAND') {
              newState.log.push(`> *${player.name}* +keeps their hand+.`);
              player.mulliganed = true;
          } else if (action === 'MULLIGAN') {
              newState.log.push(`> *${player.name}* !mulligans!.`);
              player.deck.push(...player.hand);
              player.deck = shuffle(player.deck);
              player.hand = player.deck.splice(0, STARTING_HAND_SIZE);
              player.mulliganed = true;
          } else {
              return newState;
          }

          const otherPlayerIndex = playerIndex === 0 ? 1 : 0;
          
          if (!newState.players[otherPlayerIndex].mulliganed) {
              newState.activePlayerIndex = otherPlayerIndex;
          } else {
              return advancePhase(newState);
          }
          
          return newState;
      }

      const checkTrap = (triggerAction: string, actingPlayer: PlayerState, opponentState: PlayerState) => {
          if (opponentState.trapCard && opponentState.trapCard.condition === triggerAction) {
              newState.log.push(`> *${opponentState.name}*'s trap, %${opponentState.trapCard.card.name}%, was triggered!`);
              switch (opponentState.trapCard.card.id) {
                case 6: // Unseen Entities
                    opponentState.mana += 2;
                    newState.log.push(`> *${opponentState.name}* gains +2 mana+.`)
                    break;
                case 33: // Final Broadcast
                    const potGained = newState.pot;
                    opponentState.mana += potGained;
                    newState.log.push(`> *${opponentState.name}* gains +${potGained} mana+ equal to the pot!`);
                    break;
              }
              opponentState.trapCard = null;
          }
      }
      
      switch(action) {
          case 'PEEK': {
              const { cardId } = payload;
              const cardWithAbility = activePlayer.holeCards.find(c => c.id === cardId);
              if (!cardWithAbility || !cardWithAbility.abilities?.some(a => a.name === 'Peek') || activePlayer.mana < 1 || activePlayer.hasPeeked || newState.riverDeck.length === 0) return newState;
              activePlayer.mana -= 1;
              activePlayer.hasPeeked = true;
              const topCard = newState.riverDeck[0];
              newState.log.push(`> *${activePlayer.name}* pays !1 mana! to %peek%... The top card of the river is %${topCard.rank} of ${topCard.suit}%.`);
              // Peeking does not end the turn.
              return newState;
          }
          case 'USE_CHARGE': {
              const { cardId } = payload;
              const cardWithCharge = activePlayer.artifacts.find(c => c.id === cardId);

              if (!cardWithCharge || !activePlayer.charges[cardId] || activePlayer.charges[cardId] <= 0 || activePlayer.deck.length === 0) {
                  return newState;
              }

              activePlayer.charges[cardId] -= 1;
              const [drawnCard] = activePlayer.deck.splice(0, 1);
              activePlayer.hand.push(drawnCard);
              newState.log.push(`> *${activePlayer.name}* uses a charge from %${cardWithCharge.name}% to +draw a card+. ${activePlayer.charges[cardId]} charges remaining.`);
              // Using a charge does not end the turn
              return newState;
          }
          case 'ACTIVATE_IMBUE': {
              const { cardId } = payload;
              const card = activePlayer.artifacts.find(c => c.id === cardId);
              const ability = card?.abilities?.find(a => a.name === 'Imbue');
              if (!card || !ability || activePlayer.mana < (ability.cost ?? 99)) return newState;

              activePlayer.mana -= ability.cost!;
              if (activePlayer.holeCards.length > 0) {
                  const targetCardIndex = Math.floor(Math.random() * activePlayer.holeCards.length);
                  const targetCard = activePlayer.holeCards[targetCardIndex];
                  if (!targetCard.abilities) targetCard.abilities = [];
                  targetCard.abilities.push(ability.abilityToGrant!);
                  newState.log.push(`> *${activePlayer.name}* pays !${ability.cost} mana! to imbue %${targetCard.name}% with %${ability.abilityToGrant!.name}%!`);
              }
              // Activating Imbue does not end the turn
              return newState;
          }
          case 'MANA_SINK_CYCLE': {
              const { cardIndex } = payload;
              const card = activePlayer.hand[cardIndex];
              if (!card || activePlayer.mana < MANA_SINK_CYCLE_COST || activePlayer.deck.length === 0) return newState;

              activePlayer.mana -= MANA_SINK_CYCLE_COST;
              const [discardedCard] = activePlayer.hand.splice(cardIndex, 1);
              activePlayer.discard.push(discardedCard);
              const [drawnCard] = activePlayer.deck.splice(0,1);
              activePlayer.hand.push(drawnCard);
              newState.log.push(`> *${activePlayer.name}* pays !${MANA_SINK_CYCLE_COST} mana! to cycle %${discardedCard.name}% and +draw a new card+.`);
              // Cycling does not end the turn
              return newState;
          }
          case 'DISCARD': {
              const { cardIndex } = payload;
              if (cardIndex === null || cardIndex === undefined || activePlayer.hasDiscarded || (opponent.bet - activePlayer.bet) > 0) {
                  return newState;
              }
              const [discardedCard] = activePlayer.hand.splice(cardIndex, 1);
              activePlayer.discard.push(discardedCard);
              activePlayer.mana += 1;
              activePlayer.hasDiscarded = true;
              newState.log.push(`*${activePlayer.name}* discards %${discardedCard.name}% for +1 mana+.`);
              activePlayer.hasMadeBettingActionThisTurn = true;
              return endTurn(newState);
          }
          case 'CHECK': {
              if ((opponent.bet - activePlayer.bet) > 0) return newState;
              newState.log.push(`*${activePlayer.name}* checks.`);
              activePlayer.hasMadeBettingActionThisTurn = true;
              return endTurn(newState);
          }
          case 'BET': {
              const { amount } = payload;
              if ((opponent.bet - activePlayer.bet) > 0 || amount <= 0 || amount > activePlayer.points) return newState;
              
              let cost = amount;
              if (activePlayer.hasEconomist && !activePlayer.hasUsedEconomistThisRound) {
                  cost = Math.max(0, cost - 1);
                  activePlayer.hasUsedEconomistThisRound = true;
                  newState.log.push(`> %Economist% reduces cost by 1.`);
              }

              activePlayer.points -= cost;
              activePlayer.bet += amount;
              newState.pot += amount;
              newState.amountToCall = amount;
              newState.lastBettor = newState.activePlayerIndex;
              newState.lastBetSize = amount;
              newState.log.push(`*${activePlayer.name}* bets ~${amount}~. Pot is now ~${newState.pot}~.`);
              activePlayer.hasMadeBettingActionThisTurn = true;
              opponent.hasMadeBettingActionThisTurn = false;
              checkTrap("opponent_bets", activePlayer, opponent);
              return endTurn(newState);
          }
           case 'RAISE': {
              const { amount } = payload;
              const opponentBet = opponent.bet;
              const amountToCall = opponentBet - activePlayer.bet;
              const totalNewMoney = amount - activePlayer.bet;

              const isAllIn = totalNewMoney >= activePlayer.points;
              const isMinRaiseValid = (amount - opponentBet) >= newState.lastBetSize;

              if (totalNewMoney <= amountToCall || (!isMinRaiseValid && !isAllIn) || totalNewMoney > activePlayer.points) {
                  return newState;
              }

              let cost = totalNewMoney;
              if (activePlayer.hasEconomist && !activePlayer.hasUsedEconomistThisRound) {
                  cost = Math.max(0, cost - 1);
                  activePlayer.hasUsedEconomistThisRound = true;
                  newState.log.push(`> %Economist% reduces cost by 1.`);
              }

              activePlayer.points -= cost;
              activePlayer.bet += totalNewMoney;
              newState.pot += totalNewMoney;
              
              newState.lastBettor = newState.activePlayerIndex;
              const raiseAmount = amount - opponentBet;
              newState.lastBetSize = raiseAmount;
              newState.amountToCall = raiseAmount;

              newState.log.push(`*${activePlayer.name}* raises to ~${amount}~. Pot is now ~${newState.pot}~.`);
              activePlayer.hasMadeBettingActionThisTurn = true;
              opponent.hasMadeBettingActionThisTurn = false;
              checkTrap("opponent_bets", activePlayer, opponent);
              return endTurn(newState);
          }
          case 'CALL': {
              const amountToCall = opponent.bet - activePlayer.bet;
              if (amountToCall <= 0) return newState;

              let requiredPoints = amountToCall;
              let requiredMana = opponent.hasIntimidate ? 1 : 0;
              
              if(opponent.hasIntimidate) {
                newState.log.push(`> %Intimidate% increases the call cost by !1 mana!`);
              }

              if (activePlayer.hasEconomist && !activePlayer.hasUsedEconomistThisRound) {
                  if (requiredMana > 0) requiredMana = Math.max(0, requiredMana - 1);
                  else requiredPoints = Math.max(0, requiredPoints - 1);
                  activePlayer.hasUsedEconomistThisRound = true;
                  newState.log.push(`> %Economist% reduces cost by 1.`);
              }

              if (activePlayer.mana < requiredMana) {
                  newState.log.push(`> !*${activePlayer.name}* cannot afford the mana cost to call.!`);
                  return newState;
              }

              const pointsToPay = Math.min(requiredPoints, activePlayer.points);
              
              activePlayer.points -= pointsToPay;
              activePlayer.mana -= requiredMana;
              activePlayer.bet += pointsToPay;
              newState.pot += pointsToPay;

              newState.log.push(`*${activePlayer.name}* calls ~${pointsToPay}~${pointsToPay < requiredPoints ? ' and is all-in' : ''}. Pot is now ~${newState.pot}~.`);
              activePlayer.hasMadeBettingActionThisTurn = true;
              return endTurn(newState);
          }
          case 'FOLD': {
              checkTrap("opponent_folds", activePlayer, opponent);
              newState.log.push(`*${activePlayer.name}* !folds!.`);
              opponent.points += newState.pot;
              newState.log.push(`*${opponent.name}* wins the pot of ~${newState.pot}~.`);
              newState.pot = 0;
              const winnerIndex = newState.activePlayerIndex === 0 ? 1 : 0;
              newState.lastRoundWinnerId = newState.players[winnerIndex].id;
              newState.phase = 'END_ROUND';
              return newState;
          }
          case 'PLAY_CARD': {
              const { cardIndex, isOverload } = payload;
              const card = activePlayer.hand[cardIndex];
              const ability = card?.abilities?.find(a => a.name === 'Overload');
              const cost = isOverload ? ability?.overloadCost ?? 99 : card?.manaCost ?? 99;

              if (!card || activePlayer.mana < cost || (opponent.bet - activePlayer.bet) > 0 || activePlayer.cardPlayLocked) {
                if (activePlayer.cardPlayLocked) newState.log.push(`> !Cannot play card due to an opponent's effect!`);
                return newState;
              }
              
              activePlayer.mana -= cost;
              activePlayer.hand.splice(cardIndex, 1);
              newState.log.push(`*${activePlayer.name}* plays %${card.name}% for !${cost} mana!${isOverload ? ' with %Overload%!' : '.'}`);

              card.abilities?.forEach(ab => {
                  if (ab.name === 'Chrono' && ab.duration) {
                      activePlayer.activeChronoEffects.push({ cardName: card.name, turns: ab.duration, description: ab.description, cardId: card.id });
                  }
                  if (ab.name === 'Trap' && ab.condition) {
                      activePlayer.trapCard = { card, condition: ab.condition };
                      newState.log.push(`> *${activePlayer.name}* sets a trap!`);
                  }
                  if (ab.name === 'Charge' && ab.charges) {
                      if (!activePlayer.charges) activePlayer.charges = {};
                      activePlayer.charges[card.id] = ab.charges;
                      newState.log.push(`> %${card.name}% enters with +${ab.charges} charges+.`);
                  }
              });

              newState = masterResolveCardEffect(newState, card, newState.activePlayerIndex as 0 | 1, isOverload);
              
              if (newState.phase === 'GAME_OVER') return newState;

              let wasPlaced = false;
              if (card.abilities?.some(a => a.name === 'Trap')) {
                 wasPlaced = true;
              }

              if (!wasPlaced) {
                   switch (card.type) {
                        case CardType.Event:
                          activePlayer.discard.push(card);
                          break;
                        case CardType.Artifact:
                          if (card.abilities?.some(a => a.discardsAfterUse)) {
                              activePlayer.discard.push(card);
                              newState.log.push(`> %${card.name}% is discarded after use.`);
                          } else {
                              activePlayer.artifacts.push(card);
                          }
                          updatePlayerFlags(activePlayer);
                          break;
                        case CardType.Location:
                          newState.activeLocation = card;
                          break;
                        case CardType.Unit:
                          activePlayer.discard.push(card);
                          break;
                  }
              }
              
              activePlayer.hasMadeBettingActionThisTurn = true;
              return endTurn(newState);
          }
      }
      return newState;
    });
  }, [initGame, startRound, getCpuAction]);

  useEffect(() => {
    const isActionPhase = gameState && ['PRE_FLOP', 'FLOP', 'TURN', 'RIVER'].includes(gameState.phase);
    const isCpuMulliganTurn = gameState && gameState.phase === 'MULLIGAN' && gameState.activePlayerIndex === 1 && !gameState.players[1].mulliganed;

    if (gameState && gameState.activePlayerIndex === 1 && (isActionPhase || isCpuMulliganTurn) && !gameState.winner) {
      const timeoutId = setTimeout(() => {
        let aiDecision;
        if (isCpuMulliganTurn) {
            aiDecision = getCpuAction(gameState, true);
        } else if (isActionPhase) {
            aiDecision = getCpuAction(gameState);
        }
        
        if (aiDecision && typeof aiDecision === 'object' && aiDecision.action) {
          handleAction(aiDecision.action, aiDecision.payload);
        }
      }, 1500);
      return () => clearTimeout(timeoutId);
    }
  }, [gameState, handleAction, getCpuAction]);

  if (view === 'home') {
    return <HomeScreen onPlay={() => { initGame(); setView('game'); }} onRules={() => setView('rules')} />;
  }
  
  if (view === 'rules') {
    return <RulesScreen onBack={() => setView('home')} />;
  }

  if (view === 'game' && gameState) {
     return ( <GameBoard gameState={gameState} onAction={handleAction} theme={theme} setTheme={setTheme} onGoHome={() => setView('home')} /> );
  }

  return (
      <div className="w-full h-screen flex items-center justify-center bg-brand-bg">
        <h1 className="text-4xl font-serif text-brand-text">Initializing River of Ruin...</h1>
      </div>
  );
};

export default App;
