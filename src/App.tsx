
import React, { useState, useCallback, useEffect } from 'react';
import { CardData, GameState, PlayerState, GamePhase, CardType, CardSuit, CardRank } from './types';
import { CARDS, RIVER_DECK_UNITS, RANKS, assignRandomPokerValue } from './constants';
import { evaluateHand, compareHands, HandResult } from './lib/poker';
import { resolveCardEffect } from './lib/effects';
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

const advancePhase = (state: GameState): GameState => {
     let newState: GameState = JSON.parse(JSON.stringify(state));
     // Reset for next betting round
     newState.amountToCall = 0;
     newState.lastBettor = null;
     newState.lastBetSize = ANTE; // Minimum bet for the new round
     newState.players.forEach(p => { p.bet = 0; p.hasActed = false; });
     
     switch (state.phase) {
        case 'PRE_FLOP':
            newState.phase = 'FLOP';
            newState.communityCards = state.riverDeck.slice(0, 3);
            newState.riverDeck = state.riverDeck.slice(3);
            newState.log = [...state.log, '--- The Flop ---', ...newState.communityCards.map(c => `Revealed: ${c.name}`)];
            newState.activePlayerIndex = 0;
            return newState;
        case 'FLOP':
             newState.phase = 'TURN';
             newState.communityCards = [...state.communityCards, state.riverDeck[0]];
             newState.riverDeck = state.riverDeck.slice(1);
             newState.log = [...state.log, '--- The Turn ---', `Revealed: ${state.riverDeck[0].name}`];
             newState.activePlayerIndex = 0;
            return newState;
        case 'TURN':
             newState.phase = 'RIVER';
             newState.communityCards = [...state.communityCards, state.riverDeck[0]];
             newState.riverDeck = state.riverDeck.slice(1);
             newState.log = [...state.log, '--- The River ---', `Revealed: ${state.riverDeck[0].name}`];
             newState.activePlayerIndex = 0;
            return newState;
        case 'RIVER': {
            // --- SHOWDOWN LOGIC ---
            const getPlayerShowdownCards = (player: PlayerState, communityCards: CardData[], log: string[]): CardData[] => {
                let holeCards = player.holeCards.map(c => ({ ...c })); // deep copy
                if (player.points <= 5) {
                    holeCards.forEach(card => {
                        if (card.abilities?.some(a => a.name === 'Last Stand')) {
                            const currentRankIndex = RANKS.indexOf(card.rank!);
                            if (currentRankIndex < RANKS.length - 1) { // not an ace
                                card.rank = RANKS[currentRankIndex + 1];
                                log.push(`${player.name}'s ${card.name} triggers Last Stand!`);
                            }
                        }
                    });
                }
                return [...holeCards, ...communityCards];
            };

            let p1Log: string[] = [];
            let p2Log: string[] = [];
            const p1Cards = getPlayerShowdownCards(newState.players[0], newState.communityCards, p1Log);
            const p2Cards = getPlayerShowdownCards(newState.players[1], newState.communityCards, p2Log);
            
            const p1Hand = evaluateHand(p1Cards);
            const p2Hand = evaluateHand(p2Cards);

            let winnerIndex = -1;
            let logMessage = `Showdown!${p1Log.length > 0 ? `\n` + p1Log.join('\n') : ''}${p2Log.length > 0 ? `\n` + p2Log.join('\n') : ''}\nPlayer 1: ${p1Hand.name}\nCPU: ${p2Hand.name}`;

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
                        logMessage += `\n${player.name} gains ${underdogBonus} mana from Underdog.`;
                    }
                }
            });

            const comparison = compareHands(p1Hand, p2Hand);
            if(comparison > 0) winnerIndex = 0;
            else if (comparison < 0) winnerIndex = 1;
            
            if (winnerIndex !== -1) {
                const loserIndex = winnerIndex === 0 ? 1 : 0;
                logMessage += `\n${newState.players[winnerIndex].name} wins the showdown!`;
                newState.players[winnerIndex].points += Math.floor(newState.pot / 2); // Winner gains half the pot in points
                newState.players[loserIndex].points -= newState.pot;
                logMessage += `\n${newState.players[loserIndex].name} loses ${newState.pot} points.`;
            } else {
                logMessage += `\nIt's a tie! The pot is split.`;
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

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [theme, setTheme] = useState<string>(() => document.documentElement.getAttribute('data-theme') || 'nightdrive');

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

    // FIX: Add explicit GameState type to newState to ensure correct type inference for its properties, especially the `players` tuple.
    const newState: GameState = {
      players: [
        { ...currentState.players[0], deck: p1RemainingDeck, hand: p1Hand, holeCards: p1Hole, artifacts: [], discard: [], mana: STARTING_MANA, points: p1Points, bet: 0, hasActed: false, hasDiscarded: false, hasPeeked: false },
        { ...currentState.players[1], deck: p2RemainingDeck, hand: p2Hand, holeCards: p2Hole, artifacts: [], discard: [], mana: STARTING_MANA, points: p2Points, bet: 0, hasActed: false, hasDiscarded: false, hasPeeked: false },
      ],
      riverDeck: shuffle(RIVER_DECK_UNITS),
      communityCards: [],
      activeLocation: null,
      pot: ANTE * 2,
      phase: 'PRE_FLOP',
      log: [`--- New Round ---`, `Both players ante ${ANTE}. Pot is ${ANTE * 2}.`],
      winner: null,
      activePlayerIndex: 0,
      amountToCall: 0,
      lastBettor: null,
      lastBetSize: ANTE,
      showdownResults: null,
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
                newState.log.push(`${player.name} gains ${synergyBonus} mana from Synergy.`);
            }
        }
    });

    return newState;
  }, []);

  const initGame = useCallback(() => {
    const p1: PlayerState = { id: 1, name: 'Player 1', deck: createPlayerDeck(), hand: [], holeCards: [], artifacts: [], discard: [], mana: 0, points: STARTING_POINTS, bet: 0, hasActed: false, hasDiscarded: false, hasPeeked: false };
    const p2: PlayerState = { id: 2, name: 'CPU', deck: createPlayerDeck(), hand: [], holeCards: [], artifacts: [], discard: [], mana: 0, points: STARTING_POINTS, bet: 0, hasActed: false, hasDiscarded: false, hasPeeked: false };

    const initialGameState: GameState = {
      players: [p1, p2], riverDeck: [], communityCards: [], activeLocation: null, pot: 0, activePlayerIndex: 0,
      phase: 'SETUP', log: ['Game Initialized...'], winner: null, amountToCall: 0, lastBettor: null, lastBetSize: ANTE
    };
    setGameState(startRound(initialGameState));
  }, [startRound]);
  
  useEffect(() => { initGame() }, [initGame]);

  const handleAction = useCallback((action: string, payload?: any) => {
    setGameState(prevState => {
      if (!prevState || prevState.phase === 'GAME_OVER' || prevState.phase === 'END_ROUND' || prevState.phase === 'SHOWDOWN') {
         if (action === 'NEXT_ROUND' && prevState?.phase === 'END_ROUND') return startRound(prevState);
         if (action === 'END_SHOWDOWN' && prevState?.phase === 'SHOWDOWN') {
            let newState = JSON.parse(JSON.stringify(prevState)) as GameState;
            newState.phase = 'END_ROUND';
            newState.showdownResults = null;
            return newState;
         }
         if (action === 'NEW_GAME' && prevState?.phase === 'GAME_OVER') {
             initGame();
             return null;
         }
         return prevState;
      }
      
      let newState = JSON.parse(JSON.stringify(prevState)) as GameState;
      const activePlayer = newState.players[newState.activePlayerIndex];
      const opponent = newState.players[newState.activePlayerIndex === 0 ? 1: 0];

      if (action === 'PEEK') {
        if (newState.activePlayerIndex !== 0) return newState; // Player only for now
        const player = newState.players[0];
        const hasPeekAbility = player.holeCards.some(c => c.abilities?.some(a => a.name === 'Peek'));
        if (!hasPeekAbility || player.hasPeeked || player.mana < 1 || newState.phase !== 'PRE_FLOP') {
            return newState;
        }
        player.mana -= 1;
        player.hasPeeked = true;
        newState.log.push(`You peeked at the top of the river: ${newState.riverDeck[0].name}`);
        return newState; // Do not end turn
      }

      const endTurn = () => {
        activePlayer.hasActed = true;
        const opponentIndex = newState.activePlayerIndex === 0 ? 1 : 0;

        // End of betting round condition: both players have acted and bets are equal.
        if (newState.players[opponentIndex].hasActed && activePlayer.bet === opponent.bet) {
            return advancePhase(newState);
        }
        newState.activePlayerIndex = opponentIndex as 0 | 1;
        return newState;
      }
      
      switch(action) {
          case 'CHECK':
              if (activePlayer.bet < opponent.bet) return newState; // Cannot check if there is a bet
              newState.log.push(`${activePlayer.name} checks.`);
              return endTurn();
          case 'BET': {
              const { amount } = payload;
              if (amount <= 0 || activePlayer.mana < amount || opponent.bet > activePlayer.bet) return newState;
              
              activePlayer.mana -= amount;
              activePlayer.bet += amount;
              newState.pot += amount;
              
              newState.amountToCall = activePlayer.bet - opponent.bet;
              newState.lastBetSize = amount;
              newState.lastBettor = newState.activePlayerIndex;
              opponent.hasActed = false;
              newState.log.push(`${activePlayer.name} bets ${amount}.`);
              return endTurn();
          }
           case 'RAISE': {
              const { amount } = payload; // amount is the new total bet for the player
              const costToRaise = amount - activePlayer.bet;
              const currentHighestBet = opponent.bet;
              const raiseAmount = amount - currentHighestBet;

              if (costToRaise <= 0 || activePlayer.mana < costToRaise || raiseAmount < newState.lastBetSize) return newState;

              activePlayer.mana -= costToRaise;
              activePlayer.bet = amount;
              newState.pot += costToRaise;

              newState.amountToCall = raiseAmount;
              newState.lastBetSize = raiseAmount;
              newState.lastBettor = newState.activePlayerIndex;
              opponent.hasActed = false;
              newState.log.push(`${activePlayer.name} raises to ${amount}.`);
              return endTurn();
          }
          case 'CALL': {
              const hasIntimidate = opponent.holeCards.some(c => c.abilities?.some(a => a.name === 'Intimidate'));
              const intimidateCost = hasIntimidate ? 1 : 0;
              const amountToCall = opponent.bet - activePlayer.bet;
              const totalCallCost = amountToCall + intimidateCost;

              if (amountToCall <= 0 || activePlayer.mana < totalCallCost) return newState;

              activePlayer.mana -= totalCallCost;
              activePlayer.bet += amountToCall;
              newState.pot += amountToCall;
              newState.amountToCall = 0;
              if (intimidateCost > 0) {
                  newState.log.push(`${activePlayer.name} calls and pays an extra ${intimidateCost} mana for Intimidate.`);
              } else {
                  newState.log.push(`${activePlayer.name} calls.`);
              }
              return endTurn();
          }
          case 'FOLD': {
              newState.log.push(`${activePlayer.name} folds.`);
              // Opponent wins the pot, but their points don't change. We just subtract from the folder.
              activePlayer.points -= newState.pot;
              newState.log.push(`${opponent.name} wins the pot of ${newState.pot}.`);
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
              const { cardIndex } = payload;
              const card = activePlayer.hand[cardIndex];
              const amountToCall = opponent.bet - activePlayer.bet;
              if (!card || activePlayer.mana < (card.manaCost ?? 0) || amountToCall > 0) return newState;
              
              activePlayer.mana -= card.manaCost!;
              activePlayer.hand.splice(cardIndex, 1);
              newState.log.push(`${activePlayer.name} plays ${card.name}.`);
              newState = resolveCardEffect(newState, card, newState.activePlayerIndex);
              opponent.hasActed = false; // Playing a card is like a bet, opponent must act
              return endTurn();
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

              return endTurn();
          }
          case 'NEXT_ROUND':
              return startRound(newState);
          case 'NEW_GAME':
              initGame();
              return null;
      }
      return newState;
    });
  }, [initGame, startRound]);

  const getCpuAction = (gs: GameState) => {
      const cpu = gs.players[1];
      const player = gs.players[0];
      const { communityCards, phase, pot, lastBetSize } = gs;
      
      const hasIntimidate = player.holeCards.some(c => c.abilities?.some(a => a.name === 'Intimidate'));
      const intimidateCost = hasIntimidate ? 1 : 0;
      const amountToCall = player.bet - cpu.bet;
      const totalCallCost = amountToCall + intimidateCost;

      // --- Enhanced Hand & Board Analysis ---
      const allCards = [...cpu.holeCards, ...communityCards];
      const cpuHand = evaluateHand(allCards);
      const handRank = cpuHand.value[0]; // 1 (High Card) to 10 (Royal Flush)

      const ranksOnBoard = communityCards.map(c => c.rank!).filter(Boolean);
      const suitsOnBoard = communityCards.map(c => c.suit!).filter(Boolean);
      const suitCounts = suitsOnBoard.reduce((acc, suit) => {
          if (suit) acc[suit] = (acc[suit] || 0) + 1;
          return acc;
      }, {} as Record<string, number>);

      const isFlushPossible = Object.values(suitCounts).some(count => count >= 3);
      const isBoardPaired = new Set(ranksOnBoard).size < ranksOnBoard.length;
      
      const rankOrder = "23456789TJQKA";
      const uniqueRanks = [...new Set(allCards.map(c => c.rank!))].map(r => rankOrder.indexOf(r)).sort((a,b)=>a-b);
      let straightOuts = 0;
      if (uniqueRanks.length >= 4) {
          // Simplified straight draw logic: check for open-enders
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

      const boardIsWet = isFlushPossible || uniqueRanks.some((r, i) => i > 0 && uniqueRanks[i] - uniqueRanks[i-1] < 3);

      // --- AI Personality ---
      const aggression = Math.random(); // 0 to 1, higher is more aggressive/bluffy
      const conservativeness = Math.random(); // 0 to 1, higher is tighter/less likely to call lightly

      // --- Hand Strength Tiers ---
      const isMonster = handRank >= 7; // Full House+
      const isVeryStrong = handRank >= 5; // Straight+
      const isStrong = handRank >= 3; // Two Pair+
      const isDecent = handRank >= 2; // Pair
      const isDrawing = totalOuts > 0 && phase !== 'RIVER';

      // --- Decision Logic ---
      
      // 1. FACING A BET
      if (amountToCall > 0) {
          const potOdds = totalCallCost / (pot + totalCallCost);
          const drawEquity = (totalOuts * (phase === 'FLOP' ? 4 : 2)) / 100;

          if (cpu.mana < totalCallCost) return handleAction('FOLD');

          // Monster hands: Raise most of the time, occasionally slow-play by just calling
          if (isMonster) {
              if (aggression > 0.15) { // 85% chance to raise
                  const raiseAmount = Math.min(cpu.mana + cpu.bet, cpu.bet + amountToCall + Math.max(lastBetSize, Math.ceil(pot * (0.75 + aggression * 0.25)))); // Raise pot-sized or more
                  if (raiseAmount > cpu.bet + amountToCall) return handleAction('RAISE', { amount: raiseAmount });
              }
              return handleAction('CALL');
          }

          // Very strong hands: Raise or call
          if (isVeryStrong) {
              if (aggression > 0.5 && !boardIsWet) { // Less likely to raise on wet boards to avoid re-raises
                  const raiseAmount = Math.min(cpu.mana + cpu.bet, cpu.bet + amountToCall + Math.max(lastBetSize, Math.ceil(pot * 0.6)));
                  if (raiseAmount > cpu.bet + amountToCall) return handleAction('RAISE', { amount: raiseAmount });
              }
              return handleAction('CALL');
          }

          // Strong draws (semi-bluff): Raise if aggressive, otherwise call if odds are good
          if (isDrawing && drawEquity > 0.25) { // Has a good draw
              if (aggression > 0.6) {
                  const raiseAmount = Math.min(cpu.mana + cpu.bet, cpu.bet + amountToCall + Math.max(lastBetSize, Math.ceil(pot * 0.8)));
                  if (raiseAmount > cpu.bet + amountToCall) return handleAction('RAISE', { amount: raiseAmount });
              }
              if (drawEquity >= potOdds) return handleAction('CALL');
          }

          // Decent hands: Call if the price is right
          if (isDecent) {
              if (totalCallCost <= pot * 0.6) { // Bet is less than 2/3 pot
                  if (conservativeness < 0.85) return handleAction('CALL');
              }
          }

          // Calling based on pure pot odds for any draw
          if (isDrawing && drawEquity >= potOdds) {
              if (conservativeness < 0.9) return handleAction('CALL');
          }
          
          // Bluff-catching: Call with weak hands if bet is small
          if(totalCallCost <= pot * 0.2 && conservativeness < 0.3) {
             return handleAction('CALL');
          }

          return handleAction('FOLD');
      } 
      // 2. NO BET TO CPU (can check or bet)
      else {
          // Value betting
          if (isMonster) {
              // Slow play monster hands sometimes
              if (aggression < 0.2 && !boardIsWet) return handleAction('CHECK');
              const betAmount = Math.min(cpu.mana, Math.max(lastBetSize, Math.ceil(pot * (0.8 + aggression * 0.4)))); // Bet big: 80%-120% pot
              if (betAmount > 0) return handleAction('BET', { amount: betAmount });
          }
          if (isVeryStrong) {
              const betAmount = Math.min(cpu.mana, Math.max(lastBetSize, Math.ceil(pot * (0.6 + aggression * 0.4)))); // Bet 60-100% pot
              if (betAmount > 0) return handleAction('BET', { amount: betAmount });
          }
          if (isStrong) {
              if (aggression > 0.4) {
                const betAmount = Math.min(cpu.mana, Math.max(lastBetSize, Math.ceil(pot * (0.4 + aggression * 0.3)))); // Bet 40-70% pot
                if (betAmount > 0) return handleAction('BET', { amount: betAmount });
              }
          }

          // Semi-bluffing with draws
          if (isDrawing && aggression > 0.5) {
              const betAmount = Math.min(cpu.mana, Math.max(lastBetSize, Math.ceil(pot * (0.5 + aggression * 0.3))));
              if (betAmount > 0) return handleAction('BET', { amount: betAmount });
          }
          
          // Pure bluffing
          if (!isDecent && !isDrawing && aggression > 0.85 && phase !== 'PRE_FLOP' && cpu.mana > 0) {
              const betAmount = Math.min(cpu.mana, Math.max(lastBetSize, Math.ceil(pot * 0.5)));
              if (betAmount > 0) return handleAction('BET', { amount: betAmount });
          }
          
          if (!cpu.hasDiscarded) {
              let cardToDiscardIndex = -1, maxCost = -1;
              cpu.hand.forEach((card, index) => {
                  const cost = card.manaCost ?? 0;
                  if (cost > cpu.mana && cost > maxCost) {
                      maxCost = cost;
                      cardToDiscardIndex = index;
                  }
              });
              if (cardToDiscardIndex !== -1 && aggression > 0.5) {
                  return handleAction('DISCARD', { cardIndex: cardToDiscardIndex });
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
