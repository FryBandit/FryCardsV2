
import React, { useState, useCallback, useEffect } from 'react';
import { CardData, GameState, PlayerState, CardType, CardRank, Rarity } from './types';
import { CARDS, RIVER_DECK_UNITS, RANKS, assignRandomPokerValue } from './constants';
import { evaluateHand, compareHands } from './lib/poker';
import GameBoard from './components/GameBoard';


const STARTING_POINTS = 10;
const STARTING_MANA = 10;
const STARTING_HAND_SIZE = 5;
const ANTE = 1;

// --- Helper Functions ---
const shuffle = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const createPlayerDeck = (): CardData[] => shuffle(CARDS);

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [theme, setTheme] = useState<string>(() => document.documentElement.getAttribute('data-theme') || 'nightdrive');

  // New function to resolve card effects based on keywords
  const resolveCardEffect = (state: GameState, card: CardData, playerIndex: 0 | 1, isOverload: boolean = false): GameState => {
      let newState = JSON.parse(JSON.stringify(state));
      const player = newState.players[playerIndex];
      const opponent = newState.players[playerIndex === 0 ? 1 : 0];

      card.abilities?.forEach(ability => {
          // This is a simplified handler. A full implementation would be much larger.
          // For now, we'll just log that an effect would happen.
          const effectDescription = isOverload ? ability.overloadDescription : ability.description;
          newState.log.push(`> ${player.name}'s ${card.name} triggers '${ability.name}'! Effect: ${effectDescription}`);

          // Example of a specific keyword logic
          if (ability.name === 'Cascade') {
              newState.log.push(`> Cascading...`);
              // In a real implementation, we would loop through the deck here.
          }
           if (ability.name === 'Twin') {
              newState.log.push(`> Twinned effect!`);
              // Apply effect a second time
          }
      });
      
      // Placeholder for old effect logic
      const opponentHasBulwark = opponent.holeCards.some(c => c.abilities?.some(a => a.name === 'Bulwark'));
      if (card.id === 4) { // Solar Flare
          let damage = isOverload ? 5 : 2;
          if (opponentHasBulwark) {
              damage = Math.max(0, damage - 1);
              newState.log.push(`> ${opponent.name}'s Bulwark reduces the damage!`);
          }
          opponent.points -= damage;
          newState.log.push(`> ${card.name} erupts, dealing ${damage} damage to ${opponent.name}.`);
      }


      // Check for game over after effects
      if (newState.players[0].points <= 0 || newState.players[1].points <= 0) {
          const p1Dead = newState.players[0].points <= 0;
          const p2Dead = newState.players[1].points <= 0;
          newState.phase = 'GAME_OVER';
          if (p1Dead && p2Dead) {
               newState.winner = null;
               newState.log.push(`\n--- Both players were defeated! The game is a draw! ---`);
          } else {
               newState.winner = p1Dead ? newState.players[1] : newState.players[0];
               newState.log.push(`\n--- ${newState.winner.name} wins the game! ---`);
          }
      }
      return newState;
  }

  const advancePhase = (state: GameState): GameState => {
     let newState: GameState = JSON.parse(JSON.stringify(state));
     // Reset for next betting round
     newState.amountToCall = 0;
     newState.lastBettor = null;
     newState.lastBetSize = ANTE; // Minimum bet for the new round
     newState.players.forEach(p => { p.bet = 0; p.hasActed = false; p.hasMadeBettingActionThisTurn = false; });
     
     switch (state.phase) {
        case 'PRE_FLOP':
            newState.phase = 'FLOP';
            newState.communityCards = state.riverDeck.slice(0, 3);
            newState.riverDeck = state.riverDeck.slice(3);
            newState.log.push('--- The Flop ---', ...newState.communityCards.map(c => `Revealed: ${c.rank} of ${c.suit}`));
            newState.activePlayerIndex = newState.firstPlayerIndexThisRound;

            // Oracle's Observatory ability
            if (newState.activeLocation?.abilities?.some(a => a.name === "Oracle's Observatory") && newState.riverDeck.length > 0) {
                const nextCard = newState.riverDeck[0];
                newState.log.push(`> The Observatory reveals the next card: ${nextCard.rank} of ${nextCard.suit}`);
            }

            return newState;
        case 'FLOP':
             newState.phase = 'TURN';
             const turnCard = state.riverDeck[0];
             newState.communityCards = [...state.communityCards, turnCard];
             newState.riverDeck = state.riverDeck.slice(1);
             newState.log.push('--- The Turn ---', `Revealed: ${turnCard.rank} of ${turnCard.suit}`);
             newState.activePlayerIndex = newState.firstPlayerIndexThisRound;
            return newState;
        case 'TURN':
             newState.phase = 'RIVER';
             const riverCard = state.riverDeck[0];
             newState.communityCards = [...state.communityCards, riverCard];
             newState.riverDeck = state.riverDeck.slice(1);
             newState.log.push('--- The River ---', `Revealed: ${riverCard.rank} of ${riverCard.suit}`);
             newState.activePlayerIndex = newState.firstPlayerIndexThisRound;
            return newState;
        case 'RIVER': {
            // Volatile ability check BEFORE showdown
            if (newState.activeLocation?.abilities?.some(a => a.name === 'Volatile')) {
                const location = newState.activeLocation;
                newState.log.push(`> ${location.name} becomes unstable and is destroyed!`);
                
                // Find owner and move to discard
                for (let i = 0; i < newState.players.length; i++) {
                    const player = newState.players[i];
                    const locIndex = player.artifacts.findIndex(a => a.id === location.id);
                    if (locIndex !== -1) {
                        const [removedLoc] = player.artifacts.splice(locIndex, 1);
                        player.discard.push(removedLoc);
                        break;
                    }
                }
                
                newState.activeLocation = null;
                newState.players.forEach(p => p.points -= 3);
                newState.log.push(`> All players lose 3 points from Volatile effect.`);

                // Check for game over *after* volatile damage
                const p1Dead = newState.players[0].points <= 0;
                const p2Dead = newState.players[1].points <= 0;
                if (p1Dead || p2Dead) {
                    newState.phase = 'GAME_OVER';
                    if (p1Dead && p2Dead) {
                         newState.winner = null; // TIE
                         newState.log.push(`\n--- Both players were defeated! The game is a draw! ---`);
                    } else {
                         newState.winner = p1Dead ? newState.players[1] : newState.players[0];
                         newState.log.push(`\n--- ${newState.winner.name} wins the game! ---`);
                    }
                    return newState;
                }
            }

            // --- SHOWDOWN LOGIC ---
            const getPlayerShowdownCards = (player: PlayerState, communityCards: CardData[], log: string[]): { cards: CardData[], lastStandTriggered: boolean } => {
                let holeCards = player.holeCards.map(c => ({ ...c })); // deep copy
                let lastStandTriggered = false;
                if (player.points <= 5) {
                    holeCards.forEach(card => {
                        if (card.abilities?.some(a => a.name === 'Last Stand')) {
                            const currentRankIndex = RANKS.indexOf(card.rank!);
                            if (currentRankIndex < RANKS.length - 1) { // not an ace
                                card.rank = RANKS[currentRankIndex + 1];
                                log.push(`> ${player.name}'s ${card.name} triggers Last Stand!`);
                                lastStandTriggered = true;
                            }
                        }
                    });
                }
                return { cards: [...holeCards, ...communityCards], lastStandTriggered };
            };

            let p1Log: string[] = [];
            let p2Log: string[] = [];
            const { cards: p1Cards, lastStandTriggered: p1LastStandTriggered } = getPlayerShowdownCards(newState.players[0], newState.communityCards, p1Log);
            const { cards: p2Cards, lastStandTriggered: p2LastStandTriggered } = getPlayerShowdownCards(newState.players[1], newState.communityCards, p2Log);
            
            const p1Hand = evaluateHand(p1Cards);
            const p2Hand = evaluateHand(p2Cards);

            let winnerIndex = -1;
            let logMessage = `--- Showdown! ---\n` +
             `${p1Log.length > 0 ? p1Log.join('\n') + `\n` : ''}` +
             `${p2Log.length > 0 ? p2Log.join('\n') + `\n` : ''}` +
             `${newState.players[0].name} has: ${p1Hand.name}\n` +
             `${newState.players[1].name} has: ${p2Hand.name}`;


            // Underdog logic
            [
                { player: newState.players[0], hand: p1Hand },
                { player: newState.players[1], hand: p2Hand }
            ].forEach(({player, hand}) => {
                if (hand.name === 'High Card' || hand.name === 'One Pair') {
                    let underdogBonus = 0;
                    player.holeCards.forEach(card => {
                        card.abilities?.forEach(ability => {
                            if (ability.name === 'Underdog') {
                                underdogBonus += ability.value || 0;
                            }
                        });
                    });
                    if (underdogBonus > 0) {
                        player.mana += underdogBonus;
                        logMessage += `\n> ${player.name} gains ${underdogBonus} mana from Underdog.`;
                    }
                }
            });

            const comparison = compareHands(p1Hand, p2Hand);
            if(comparison > 0) winnerIndex = 0;
            else if (comparison < 0) winnerIndex = 1;
            
            const isSanctuaryActive = newState.activeLocation?.abilities?.some(a => a.name === 'Sanctuary');
            
            if (winnerIndex !== -1) {
                const loserIndex = winnerIndex === 0 ? 1 : 0;
                logMessage += `\n> ${newState.players[winnerIndex].name} wins the showdown!`;
                
                const winnerUsedLastStand = (winnerIndex === 0 && p1LastStandTriggered) || (winnerIndex === 1 && p2LastStandTriggered);

                if (!winnerUsedLastStand) {
                    newState.players[winnerIndex].points += Math.floor(newState.pot / 2); // Winner gains half the pot in points
                } else {
                    logMessage += `\n> ${newState.players[winnerIndex].name} forgoes point gain due to Last Stand.`;
                }
                
                newState.lastRoundWinnerId = newState.players[winnerIndex].id;

                if (!isSanctuaryActive) {
                    newState.players[loserIndex].points -= newState.pot;
                    logMessage += `\n> ${newState.players[loserIndex].name} loses ${newState.pot} points.`;
                } else {
                    logMessage += `\n> ${newState.players[loserIndex].name} is protected by Sanctuary and loses no points.`;
                }
            } else {
                logMessage += `\n> It's a tie! The pot is split.`;
                newState.lastRoundWinnerId = null;
            }
            newState.log.push(logMessage);

            const loser = newState.players.find(p => p.points <= 0);
            const gameWinner = loser ? newState.players.find(p => p.id !== loser.id) : null;

            if(gameWinner) {
                newState.phase = 'GAME_OVER';
                newState.winner = gameWinner;
                newState.log.push(`\n--- ${gameWinner.name} wins the game! ---`);
                return newState;
            }
            
            newState.phase = 'SHOWDOWN';
            newState.showdownResults = { p1Hand, p2Hand, winnerIndex };
            return newState;
          }
     }
     return newState;
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('fry-cards-theme', theme);
  }, [theme]);

  const startRound = useCallback((currentState: GameState): GameState => {
    const p1FullDeck = shuffle([...currentState.players[0].deck, ...currentState.players[0].hand, ...currentState.players[0].holeCards, ...currentState.players[0].artifacts, ...currentState.players[0].discard]);
    const p2FullDeck = shuffle([...currentState.players[1].deck, ...currentState.players[1].hand, ...currentState.players[1].holeCards, ...currentState.players[1].artifacts, ...currentState.players[1].discard]);
    
    const dealPlayerCards = (deck: CardData[]) => {
      const units = shuffle(deck.filter(c => c.type === CardType.Unit));
      const nonUnits = shuffle(deck.filter(c => c.type !== CardType.Unit));
      
      const holeCards = units.length >= 2
        ? [assignRandomPokerValue(units[0]), assignRandomPokerValue(units[1])]
        : [assignRandomPokerValue(deck[0]), assignRandomPokerValue(deck[1])]; // Failsafe
      
      const hand = nonUnits.slice(0, STARTING_HAND_SIZE);
      const remainingDeck = shuffle([...units.slice(2), ...nonUnits.slice(STARTING_HAND_SIZE)]);
      
      return { holeCards, hand, remainingDeck };
    }
    
    const { holeCards: p1Hole, hand: p1Hand, remainingDeck: p1RemainingDeck } = dealPlayerCards(p1FullDeck);
    const { holeCards: p2Hole, hand: p2Hand, remainingDeck: p2RemainingDeck } = dealPlayerCards(p2FullDeck);

    const p1Points = currentState.players[0].points - ANTE;
    const p2Points = currentState.players[1].points - ANTE;

    const firstPlayer = currentState.firstPlayerIndexThisRound;

    const newState: GameState = {
      players: [
        { ...currentState.players[0], deck: p1RemainingDeck, hand: p1Hand, holeCards: p1Hole, artifacts: [], discard: [], mana: STARTING_MANA, points: p1Points, bet: ANTE, hasActed: false, hasDiscarded: false, hasPeeked: false, hasUsedCrossroadsThisTurn: false, hasMadeBettingActionThisTurn: false, manaDebt: 0, trapCard: null, activeChronoEffects: [] },
        { ...currentState.players[1], deck: p2RemainingDeck, hand: p2Hand, holeCards: p2Hole, artifacts: [], discard: [], mana: STARTING_MANA, points: p2Points, bet: ANTE, hasActed: false, hasDiscarded: false, hasPeeked: false, hasUsedCrossroadsThisTurn: false, hasMadeBettingActionThisTurn: false, manaDebt: 0, trapCard: null, activeChronoEffects: [] },
      ],
      riverDeck: shuffle(RIVER_DECK_UNITS),
      communityCards: [],
      activeLocation: null,
      pot: ANTE * 2,
      phase: 'PRE_FLOP',
      log: [`--- New Round ---`, `Both players ante ${ANTE}. Pot is ${ANTE * 2}.`],
      winner: null,
      activePlayerIndex: firstPlayer,
      firstPlayerIndexThisRound: firstPlayer,
      amountToCall: 0,
      lastBettor: null,
      lastBetSize: ANTE,
      showdownResults: null,
      lastRoundWinnerId: null,
    };
    
    // Handle start-of-round abilities
    newState.players.forEach((player) => {
        // Scrapper
        player.holeCards.forEach(card => {
            if (card.abilities?.some(a => a.name === 'Scrapper') && card.rank !== CardRank.Ace) {
                card.rank = CardRank.King;
            }
        });

        // Synergy
        const [card1, card2] = player.holeCards;
        if (card1 && card2 && (card1.suit === card2.suit || card1.rank === card2.rank)) {
            let synergyBonus = 0;
            player.holeCards.forEach(card => {
                card.abilities?.forEach(ability => {
                    if (ability.name.startsWith('Synergy')) {
                        synergyBonus += ability.value || 0;
                    }
                });
            });
            if (synergyBonus > 0) {
                player.mana += synergyBonus;
                newState.log.push(`> ${player.name} gains ${synergyBonus} mana from Synergy.`);
            }
        }
        
        // Momentum
        if (currentState.lastRoundWinnerId === player.id) {
            let momentumBonus = 0;
            player.holeCards.forEach(card => {
                card.abilities?.forEach(ability => {
                    if (ability.name === 'Momentum') {
                        momentumBonus += ability.value || 0;
                    }
                })
            });
            if (momentumBonus > 0) {
                player.mana += momentumBonus;
                newState.log.push(`> ${player.name} gains ${momentumBonus} mana from Momentum for winning the last round!`);
            }
        }
    });

    return newState;
  }, []);

  const initGame = useCallback(() => {
    const p1: PlayerState = { id: 1, name: 'Player 1', deck: createPlayerDeck(), hand: [], holeCards: [], artifacts: [], discard: [], mana: 0, points: STARTING_POINTS, bet: 0, hasActed: false, hasDiscarded: false, hasPeeked: false, hasUsedCrossroadsThisTurn: false, hasMadeBettingActionThisTurn: false, manaDebt: 0, trapCard: null, activeChronoEffects: [] };
    const p2: PlayerState = { id: 2, name: 'CPU', deck: createPlayerDeck(), hand: [], holeCards: [], artifacts: [], discard: [], mana: 0, points: STARTING_POINTS, bet: 0, hasActed: false, hasDiscarded: false, hasPeeked: false, hasUsedCrossroadsThisTurn: false, hasMadeBettingActionThisTurn: false, manaDebt: 0, trapCard: null, activeChronoEffects: [] };

    const initialGameState: GameState = {
      players: [p1, p2], riverDeck: [], communityCards: [], activeLocation: null, pot: 0, activePlayerIndex: 0,
      phase: 'SETUP', log: ['Game Initialized...'], winner: null, amountToCall: 0, lastBettor: null, lastBetSize: ANTE,
      firstPlayerIndexThisRound: Math.round(Math.random()) as 0 | 1,
      lastRoundWinnerId: null,
    };
    setGameState(startRound(initialGameState));
  }, [startRound]);
  
  useEffect(() => { initGame() }, [initGame]);

  const handleAction = useCallback((action: string, payload?: any) => {
    setGameState(prevState => {
      if (!prevState) return null;
      if (action === 'NEW_GAME') {
        initGame();
        return null;
      }

      if (prevState.phase === 'GAME_OVER' || prevState.phase === 'END_ROUND' || prevState.phase === 'SHOWDOWN') {
         if (action === 'NEXT_ROUND' && prevState?.phase === 'END_ROUND') {
            let stateForNextRound = JSON.parse(JSON.stringify(prevState)) as GameState;
            stateForNextRound.firstPlayerIndexThisRound = stateForNextRound.firstPlayerIndexThisRound === 0 ? 1 : 0;
            // Persist last round winner ID for Momentum
            stateForNextRound.lastRoundWinnerId = prevState.lastRoundWinnerId;
            return startRound(stateForNextRound);
         }
         if (action === 'END_SHOWDOWN' && prevState?.phase === 'SHOWDOWN') {
            let newState = JSON.parse(JSON.stringify(prevState)) as GameState;
            newState.phase = 'END_ROUND';
            newState.showdownResults = null;
            return newState;
         }
         return prevState;
      }
      
      let newState = JSON.parse(JSON.stringify(prevState)) as GameState;
      const activePlayer = newState.players[newState.activePlayerIndex];
      const opponent = newState.players[newState.activePlayerIndex === 0 ? 1: 0];

      const endTurn = (state: GameState): GameState => {
        let turnEndState = JSON.parse(JSON.stringify(state));
        const actingPlayer = turnEndState.players[turnEndState.activePlayerIndex];
        const opp = turnEndState.players[turnEndState.activePlayerIndex === 0 ? 1: 0];

        actingPlayer.hasActed = true;
        actingPlayer.hasUsedCrossroadsThisTurn = false; // Reset flag
        const opponentIndex = turnEndState.activePlayerIndex === 0 ? 1 : 0;

        if (turnEndState.players[opponentIndex].hasActed && actingPlayer.bet === opp.bet) {
            turnEndState.log.push("--- Betting round concludes. ---");
            return advancePhase(turnEndState);
        }

        turnEndState.activePlayerIndex = opponentIndex as 0 | 1;
        const newActivePlayer = turnEndState.players[turnEndState.activePlayerIndex];
        const newOpponent = turnEndState.players[turnEndState.activePlayerIndex === 0 ? 1: 0];
        
        turnEndState.log.push(`It is now ${newActivePlayer.name}'s turn.`);

        // --- Start of Turn Effects for new active player ---
        // Mana Debt (from Overload)
        if (newActivePlayer.manaDebt > 0) {
            turnEndState.log.push(`> ${newActivePlayer.name} pays mana debt of ${newActivePlayer.manaDebt}.`);
            newActivePlayer.mana = Math.max(0, newActivePlayer.mana - newActivePlayer.manaDebt);
            newActivePlayer.manaDebt = 0;
        }

        // Mana Well ability
        if (turnEndState.activeLocation?.abilities?.some(a => a.name === 'Mana Well')) {
            newActivePlayer.mana += 1;
            turnEndState.log.push(`> ${newActivePlayer.name} gains 1 mana from Mana Well.`);
        }

        // Bulwark ability
        const newPlayerHasBulwark = newActivePlayer.holeCards.some(c => c.abilities?.some(a => a.name === 'Bulwark'));
        if (newPlayerHasBulwark && newActivePlayer.points < newOpponent.points) {
            newActivePlayer.mana += 1;
            turnEndState.log.push(`> ${newActivePlayer.name} gains 1 mana from Bulwark for being behind.`);
        }
        return turnEndState;
      }

      if (action === 'PEEK') {
        if (newState.activePlayerIndex !== 0) return newState; // Player only for now
        const player = newState.players[0];
        const hasPeekAbility = player.holeCards.some(c => c.abilities?.some(a => a.name === 'Peek'));
        if (!hasPeekAbility || player.hasPeeked || player.mana < 1 || newState.phase !== 'PRE_FLOP') {
            return newState;
        }
        player.mana -= 1;
        player.hasPeeked = true;
        newState.log.push(`> You pay 1 mana to Peek at the top of the river: ${newState.riverDeck[0].rank} of ${newState.riverDeck[0].suit}`);
        return newState; // Do not end turn
      }

      const isHighStakes = newState.activeLocation?.abilities?.some(a => a.name === 'High Stakes');
      const minBetMultiplier = isHighStakes ? 2 : 1;
      
      const hasEconomist = activePlayer.holeCards.some(c => c.abilities?.some(a => a.name === 'Economist'));
      
      switch(action) {
          case 'CHECK':
              if (activePlayer.bet < opponent.bet) return newState; // Cannot check if there is a bet
              newState.log.push(`${activePlayer.name} checks.`);
              return endTurn(newState);
          case 'BET': {
              const { amount } = payload;
              let cost = amount;
              if (hasEconomist && !activePlayer.hasMadeBettingActionThisTurn) {
                  cost = Math.max(0, cost - 1);
                  newState.log.push(`> ${activePlayer.name}'s Economist reduces the cost by 1.`);
              }
              if (amount <= 0 || activePlayer.mana < cost || opponent.bet > activePlayer.bet || amount < (newState.lastBetSize * minBetMultiplier) ) return newState;
              
              activePlayer.mana -= cost;
              activePlayer.bet += amount;
              newState.pot += amount;
              
              newState.amountToCall = activePlayer.bet - opponent.bet;
              newState.lastBetSize = amount;
              newState.lastBettor = newState.activePlayerIndex;
              activePlayer.hasMadeBettingActionThisTurn = true;
              opponent.hasActed = false;
              newState.log.push(`${activePlayer.name} bets ${amount}.`);
              return endTurn(newState);
          }
           case 'RAISE': {
              const { amount } = payload; // amount is the new total bet for the player
              let costToRaise = amount - activePlayer.bet;
              const raiseAmount = amount - opponent.bet;

              if (hasEconomist && !activePlayer.hasMadeBettingActionThisTurn) {
                  costToRaise = Math.max(0, costToRaise - 1);
                  newState.log.push(`> ${activePlayer.name}'s Economist reduces the cost by 1.`);
              }

              if (costToRaise <= 0 || activePlayer.mana < costToRaise || raiseAmount < (newState.lastBetSize * minBetMultiplier)) return newState;

              activePlayer.mana -= costToRaise;
              newState.pot += costToRaise;
              activePlayer.bet = amount;

              newState.amountToCall = raiseAmount;
              newState.lastBetSize = raiseAmount;
              newState.lastBettor = newState.activePlayerIndex;
              activePlayer.hasMadeBettingActionThisTurn = true;
              opponent.hasActed = false;
              newState.log.push(`${activePlayer.name} raises to ${amount}.`);
              return endTurn(newState);
          }
          case 'CALL': {
              const intimidateInstances = opponent.holeCards.filter(c => c.abilities?.some(a => a.name === 'Intimidate')).length;
              const intimidateCost = intimidateInstances;
              const amountToCall = opponent.bet - activePlayer.bet;
              let totalCallCost = amountToCall + intimidateCost;

              if (hasEconomist && !activePlayer.hasMadeBettingActionThisTurn) {
                  totalCallCost = Math.max(0, totalCallCost - 1);
                   newState.log.push(`> ${activePlayer.name}'s Economist reduces the cost by 1.`);
              }

              if (amountToCall <= 0 || activePlayer.mana < totalCallCost) return newState;

              activePlayer.mana -= totalCallCost;
              activePlayer.bet += amountToCall;
              newState.pot += amountToCall + intimidateCost;
              newState.amountToCall = 0;

              if (intimidateCost > 0) {
                  newState.log.push(`${activePlayer.name} calls and pays an extra ${intimidateCost} mana for Intimidate.`);
              } else {
                  newState.log.push(`${activePlayer.name} calls.`);
              }
              activePlayer.hasMadeBettingActionThisTurn = true;
              return endTurn(newState);
          }
          case 'FOLD': {
              newState.log.push(`${activePlayer.name} folds.`);
              opponent.points += newState.pot; // Opponent wins the pot
              newState.log.push(`> ${opponent.name} wins the pot of ${newState.pot}.`);
              newState.lastRoundWinnerId = opponent.id;
              const loser = newState.players[newState.activePlayerIndex];
              const gameWinner = loser.points <= 0 ? opponent : null;
              if (gameWinner) {
                  newState.phase = 'GAME_OVER';
                  newState.winner = gameWinner;
                  newState.log.push(`\n--- ${gameWinner.name} wins the game! ---`);
              } else {
                newState.phase = 'END_ROUND';
              }
              return newState;
          }
          case 'PLAY_CARD': {
              const { cardIndex, isOverload } = payload;
              const card = activePlayer.hand[cardIndex];
              const ability = card?.abilities?.[0];
              const cost = isOverload ? ability?.overloadCost ?? 99 : card?.manaCost ?? 99;

              // FIX: Use newState.amountToCall instead of the undefined 'amountToCall'
              if (!card || activePlayer.mana < cost || newState.amountToCall > 0) return newState;
              
              activePlayer.mana -= cost;
              activePlayer.hand.splice(cardIndex, 1);
              newState.log.push(`${activePlayer.name} plays ${card.name}${isOverload ? ' with Overload!' : '.'}`);

              if (isOverload) {
                  activePlayer.manaDebt += cost;
                  newState.log.push(`> ${activePlayer.name} incurs ${cost} mana debt for next turn.`);
              }

              
              // Thriving Market ability
              const isThrivingMarketActive = newState.activeLocation?.abilities?.some(a => a.name === 'Thriving Market');
              if (isThrivingMarketActive && card.type === CardType.Artifact) {
                  activePlayer.mana += 1;
                  newState.log.push(`> ${activePlayer.name} gains 1 mana from Thriving Market.`);
              }

              // Resolve card effects before moving card to zone
              newState = resolveCardEffect(newState, card, newState.activePlayerIndex as 0 | 1, isOverload);

              // Crossroads ability
              const isCrossroadsActive = newState.activeLocation?.abilities?.some(a => a.name === 'Crossroads');
              if (isCrossroadsActive && card.type !== CardType.Event && !activePlayer.hasUsedCrossroadsThisTurn) {
                  if (activePlayer.deck.length > 0) {
                      const [drawnCard] = activePlayer.deck.splice(0, 1);
                      activePlayer.hand.push(drawnCard);
                      newState.log.push(`> ${activePlayer.name} draws a card from Crossroads.`);
                      activePlayer.hasUsedCrossroadsThisTurn = true;
                  }
              }

              switch (card.type) {
                  case CardType.Event:
                      activePlayer.discard.push(card);
                      break;
                  case CardType.Artifact:
                      activePlayer.artifacts.push(card);
                      break;
                  case CardType.Location:
                      if(newState.activeLocation) {
                           const oldLocation = newState.activeLocation;
                           // Find owner of old location
                           const owner = newState.players.find(p => p.artifacts.some(a => a.id === oldLocation.id));
                           if (owner) {
                             owner.artifacts = owner.artifacts.filter(a => a.id !== oldLocation.id);
                             owner.discard.push(oldLocation);
                           }
                      }
                      activePlayer.artifacts.push(card); // Locations are also artifacts for ownership
                      newState.activeLocation = card;
                      break;
                  case CardType.Unit:
                      activePlayer.discard.push(card);
                      break;
              }

              opponent.hasActed = false; // Playing a card is like a bet, opponent must act
              return endTurn(newState);
          }
          case 'DISCARD': {
              const { cardIndex } = payload;
              const card = activePlayer.hand[cardIndex];
              if (!card || opponent.bet > activePlayer.bet || activePlayer.hasDiscarded) {
                  return newState;
              }

              activePlayer.hasDiscarded = true;
              const [discardedCard] = activePlayer.hand.splice(cardIndex, 1);
              activePlayer.discard.push(discardedCard);
              newState.log.push(`${activePlayer.name} discards ${discardedCard.name}.`);

              return endTurn(newState);
          }
          case 'SWAP_CARD': {
              const { cardIndex } = payload;
              const card = activePlayer.hand[cardIndex];
               if (!card || opponent.bet > activePlayer.bet || activePlayer.hasDiscarded || activePlayer.deck.length === 0) {
                  return newState;
              }
              
              activePlayer.hasDiscarded = true; // This action counts as the discard for the turn
              const [discardedCard] = activePlayer.hand.splice(cardIndex, 1);
              activePlayer.discard.push(discardedCard);
              
              const [drawnCard] = activePlayer.deck.splice(0,1);
              activePlayer.hand.push(drawnCard);

              newState.log.push(`${activePlayer.name} discards ${discardedCard.name} to draw a new card.`);
              return endTurn(newState);
          }
          case 'ALCHEMY_DISCARD': {
              const { cardIndex } = payload;
              const card = activePlayer.hand[cardIndex];
              const isAlchemistActive = newState.activeLocation?.abilities?.some(a => a.name === 'Alchemist');

              if (!card || !isAlchemistActive || opponent.bet > activePlayer.bet) {
                  return newState;
              }
              
              const [discardedCard] = activePlayer.hand.splice(cardIndex, 1);
              activePlayer.discard.push(discardedCard);
              activePlayer.mana += 2;
              newState.log.push(`> ${activePlayer.name} discards ${discardedCard.name} to Alchemist, gaining 2 mana.`);
              
              return endTurn(newState);
          }
      }
      return newState;
    });
  }, [initGame, startRound]);

  const getCpuAction = (gs: GameState) => {
      const cpu = gs.players[1];
      const player = gs.players[0];
      const { communityCards, phase, pot, lastBetSize, activeLocation, lastBettor } = gs;

      const playerJustRaised = lastBettor === 0;
      const isHighStakes = activeLocation?.abilities?.some(a => a.name === 'High Stakes');
      const minBetMultiplier = isHighStakes ? 2 : 1;
      
      const playerIntimidateInstances = player.holeCards.filter(c => c.abilities?.some(a => a.name === 'Intimidate')).length;
      const intimidateCost = playerIntimidateInstances;
      const amountToCall = player.bet - cpu.bet;
      const totalCallCost = amountToCall + intimidateCost;
      const cpuHasIntimidate = cpu.holeCards.some(c => c.abilities?.some(a => a.name === 'Intimidate'));
      const isSanctuaryActive = activeLocation?.abilities?.some(a => a.name === 'Sanctuary');

      // --- Enhanced Hand & Board Analysis ---
      const allCards = [...cpu.holeCards, ...communityCards];
      const cpuHand = evaluateHand(allCards);
      const handRank = cpuHand.value[0]; // 1 (High Card) to 10 (Royal Flush)
      
      const ranksOnBoard = communityCards.map(c => c.rank!).filter(Boolean);
      
      const rankOrder = "23456789TJQKA";
      const uniqueRanks = [...new Set(allCards.map(c => c.rank!))].map(r => rankOrder.indexOf(r)).sort((a,b)=>a-b);
      let straightOuts = 0;
      if (uniqueRanks.length >= 4) {
          for(let i=0; i<uniqueRanks.length - 3; i++) {
              if(uniqueRanks[i+3] - uniqueRanks[i] === 3 && uniqueRanks.length === 4) straightOuts = 8; // Open-ended
              if(uniqueRanks[i+3] - uniqueRanks[i] === 4 && uniqueRanks.length === 4) straightOuts = 4; // Gutshot
          }
      }

      const allSuitCounts = allCards.reduce((acc, card) => {
        if(card.suit) acc[card.suit] = (acc[card.suit] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const flushOuts = Object.values(allSuitCounts).some(c => c === 4) ? 9 : 0;
      const totalOuts = straightOuts + flushOuts;

      const boardIsWet = Object.values(allSuitCounts).some(c=>c >= 3) || uniqueRanks.some((r, i) => i > 1 && uniqueRanks[i] - uniqueRanks[i-2] < 3);

      let aggression = Math.random();
      const hasPosition = gs.firstPlayerIndexThisRound === 0; // CPU (p1) acts after player (p0) post-flop
      if (hasPosition) aggression = Math.min(1, aggression + 0.15);


      const isMonster = handRank >= 7; // Full House+
      const isVeryStrong = handRank >= 5; // Straight+
      const isStrong = handRank >= 3; // Two Pair+
      const isDecent = handRank >= 2; // Pair
      const isDrawing = totalOuts > 8 && phase !== 'RIVER';

      // --- Decision Logic ---
      if (amountToCall > 0) { // Facing a bet or raise
          if (cpu.mana < totalCallCost) return handleAction('FOLD');
          let potOdds = totalCallCost / (pot + totalCallCost);
          if (isSanctuaryActive) potOdds -= 0.15; // More likely to call if no points are at risk
          const drawEquity = (totalOuts * (phase === 'FLOP' ? 4.2 : 2.1)) / 100;

          // Anti-raise-loop: If player just raised, be much more cautious.
          if (playerJustRaised && !isMonster) {
              const veryGoodDraw = isDrawing && drawEquity >= potOdds && totalOuts > 8;
              if (isVeryStrong || veryGoodDraw) {
                  return handleAction('CALL');
              }
              return handleAction('FOLD');
          }

          if (isMonster) {
              if (aggression > 0.3) {
                  const raiseIncrement = Math.min(cpu.mana - totalCallCost, Math.max(lastBetSize * minBetMultiplier, Math.ceil(pot * 0.75)));
                  const newTotalBet = player.bet + raiseIncrement;
                  if (raiseIncrement > 0) return handleAction('RAISE', { amount: newTotalBet });
              }
              return handleAction('CALL');
          }
          if (isDrawing && drawEquity >= potOdds) {
              if (aggression > 0.7 && totalOuts > 8) { // Semi-bluff raise on a strong draw
                   const raiseIncrement = Math.min(cpu.mana - totalCallCost, Math.max(lastBetSize * minBetMultiplier, Math.ceil(pot * 0.5)));
                   const newTotalBet = player.bet + raiseIncrement;
                   if (raiseIncrement > 0) return handleAction('RAISE', { amount: newTotalBet });
              }
              return handleAction('CALL');
          }
          if (isDecent) {
              if (potOdds < 0.35) return handleAction('CALL');
          }
          if(potOdds < 0.25 && aggression > 0.8) return handleAction('CALL'); // Float a bluff

          return handleAction('FOLD');
      } 
      else { // Checked to CPU
          // --- Card Playing Logic ---
          if (handRank < 3) { // Don't play utility cards if holding a monster hand, bet for value instead
              const playableCards = cpu.hand
                  .map((card, index) => ({ card, index }))
                  .filter(({ card }) => (card.manaCost ?? 0) <= cpu.mana);

              if (playableCards.length > 0) {
                  let bestCardToPlay: { card: CardData; index: number; score: number } | null = null;
                  const currentLocationOwner = gs.players.find(p => p.artifacts.some(a => a.id === activeLocation?.id));

                  for (const { card, index } of playableCards) {
                      let score = 0;
                      if (card.type === CardType.Location) {
                          if (!activeLocation || (currentLocationOwner && currentLocationOwner.id !== cpu.id)) score += 50;
                      }
                      if (card.type === CardType.Event) {
                          score += (card.manaCost || 1) * 4; // Simple utility score
                      }
                      if (card.type === CardType.Artifact) {
                          if (card.abilities?.some(a => a.name === 'Scrap' && a.description.includes('Draw'))) {
                             score += 40;
                             if(isDrawing) score += 30; // Prioritize when looking for outs
                          }
                          else score += 15;
                      }
                      score += Math.random() * 5;
                      if (!bestCardToPlay || score > bestCardToPlay.score) {
                          bestCardToPlay = { card, index, score };
                      }
                  }

                  if (bestCardToPlay && bestCardToPlay.score > 25 && aggression > 0.3) {
                      return handleAction('PLAY_CARD', { cardIndex: bestCardToPlay.index });
                  }
              }
          }

          const betValue = (strength: number) => Math.min(cpu.mana, Math.max(lastBetSize * minBetMultiplier, Math.ceil(pot * strength)));

          if (isMonster) {
              if (aggression < 0.3 && !boardIsWet) return handleAction('CHECK'); // Slow play
              const amount = betValue(0.8 + aggression * 0.4);
              if (amount > 0) return handleAction('BET', { amount });
          }
          if (isVeryStrong) {
              const amount = betValue(0.6 + aggression * 0.4);
              if (amount > 0) return handleAction('BET', { amount });
          }
          if (isStrong) {
              const betChance = cpuHasIntimidate ? 0.4 : 0.5; // More likely to bet with intimidate
              if (aggression > betChance) {
                const amount = betValue(0.4 + aggression * 0.3);
                if (amount > 0) return handleAction('BET', { amount });
              }
          }

          // Bluffing on scary boards
          if (!isDecent && !isDrawing) {
              const flushDrawOnBoard = Object.values(allSuitCounts).some(c => c >= 3);
              const straightDrawOnBoard = uniqueRanks.some((r, i) => i > 1 && uniqueRanks[i] - uniqueRanks[i - 2] < 4);
              if (aggression > (hasPosition ? 0.7 : 0.85) && (flushDrawOnBoard || straightDrawOnBoard) && phase !== 'PRE_FLOP' && cpu.mana > 0) {
                  const bluffAmount = Math.min(cpu.mana, Math.max(lastBetSize * minBetMultiplier, Math.ceil(pot * (0.66 + Math.random() * 0.34))));
                  if(bluffAmount > 0) return handleAction('BET', { amount: bluffAmount });
              }
          }
          
          // Discard logic: find an unplayable expensive card, prioritizing lower rarity
          if (!cpu.hasDiscarded && aggression > 0.4) {
              const unplayableCards = cpu.hand
                .map((card, index) => ({ card, index }))
                .filter(({ card }) => (card.manaCost ?? 0) > cpu.mana);

              if (unplayableCards.length > 0) {
                  const rarityValue: Record<Rarity, number> = { [Rarity.Common]: 1, [Rarity.Uncommon]: 2, [Rarity.Rare]: 3, [Rarity.SuperRare]: 4, [Rarity.Mythic]: 5, [Rarity.Divine]: 6 };
                  
                  unplayableCards.sort((a, b) => {
                      const costDiff = (b.card.manaCost ?? 0) - (a.card.manaCost ?? 0);
                      if (costDiff !== 0) return costDiff;
                      return rarityValue[a.card.rarity] - rarityValue[b.card.rarity]; // Lower rarity is "worse"
                  });

                  const discardCandidates = unplayableCards.slice(0, 2);
                  const cardToDiscard = discardCandidates[Math.floor(Math.random() * discardCandidates.length)];

                  if (Math.random() < 0.8) {
                      return handleAction('DISCARD', { cardIndex: cardToDiscard.index });
                  }
              }
          }

          return handleAction('CHECK');
      }
  };


  useEffect(() => {
    const isActionPhase = gameState && ['PRE_FLOP', 'FLOP', 'TURN', 'RIVER'].includes(gameState.phase);
    if (gameState && gameState.activePlayerIndex === 1 && isActionPhase && !gameState.winner) {
      const timeoutId = setTimeout(() => getCpuAction(gameState), 1500);
      return () => clearTimeout(timeoutId);
    }
  }, [gameState]);

  if (!gameState) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <h1 className="text-4xl font-serif">Initializing River of Ruin...</h1>
      </div>
    );
  }

  return ( <GameBoard gameState={gameState} onAction={handleAction} theme={theme} setTheme={setTheme} /> );
};

export default App;
