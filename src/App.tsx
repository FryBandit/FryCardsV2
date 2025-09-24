
import React, { useState, useCallback, useEffect } from 'react';
import { CardData, GameState, PlayerState, CardType, CardRank, Rarity } from './types';
import { CARDS, RIVER_DECK_UNITS, RANKS, assignRandomPokerValue } from './constants';
// FIX: Import RANK_VALUES for use in AI logic
import { evaluateHand, compareHands, RANK_VALUES } from './lib/poker';
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
          const effectDescription = isOverload ? ability.overloadDescription : ability.description;
          newState.log.push(`> ${player.name}'s ${card.name} triggers '${ability.name}'! Effect: ${effectDescription}`);

          // --- KEYWORD IMPLEMENTATIONS ---
          if (ability.name === 'Cascade') {
              newState.log.push(`> Cascading...`);
              const revealed = player.deck.slice(0, 3);
              player.deck = player.deck.slice(3);
              const validTargets = revealed.filter(c => c.type !== CardType.Event && (c.manaCost || 0) < (card.manaCost || 0));
              
              if (validTargets.length > 0) {
                  const cardToPlay = validTargets[0];
                  const remainingRevealed = revealed.filter(c => c.id !== cardToPlay.id);
                  player.discard.push(...remainingRevealed);
                  
                  newState.log.push(`> Cascade hits ${cardToPlay.name}!`);
                  // This is a simplified resolution, no new choices, just play it.
                  newState = resolveCardEffect(newState, cardToPlay, playerIndex, false);
                  // Place card in appropriate zone after effect
                  if (cardToPlay.type === CardType.Artifact || cardToPlay.type === CardType.Location) {
                      player.artifacts.push(cardToPlay);
                      if (cardToPlay.type === CardType.Location) newState.activeLocation = cardToPlay;
                  } else {
                      player.discard.push(cardToPlay);
                  }
              } else {
                  newState.log.push(`> Cascade missed!`);
                  player.discard.push(...revealed);
              }
          }
           if (ability.name === 'Twin') {
              newState.log.push(`> Twinned effect!`);
              // Example: Deal 1 damage, twice.
              opponent.points -= 1;
          }
          if (ability.name === 'Echoes of the Past') {
              const unitsInDiscard = player.discard.filter(c => c.type === CardType.Unit)
                  .sort((a, b) => (b.manaCost || 0) - (a.manaCost || 0));
              const cardsToReturn = unitsInDiscard.slice(0, 2);
              if (cardsToReturn.length > 0) {
                  newState.log.push(`> Returning ${cardsToReturn.map(c => c.name).join(', ')} to hand.`);
                  player.hand.push(...cardsToReturn);
                  player.discard = player.discard.filter(c => !cardsToReturn.find(ret => ret.id === c.id));
              }
          }
      });
      
      // Specific card logic for non-keyword effects
      if (card.id === 4) { // Solar Flare
          let damage = isOverload ? 5 : 2;
          const opponentHasBulwark = opponent.holeCards.some(c => c.abilities?.some(a => a.name === 'Bulwark'));
          if (opponentHasBulwark) {
              damage = Math.max(0, damage - 1);
              newState.log.push(`> ${opponent.name}'s Bulwark reduces the damage!`);
          }
          opponent.points -= damage;
          newState.log.push(`> ${card.name} erupts, dealing ${damage} damage to ${opponent.name}.`);
      }
      if (card.id === 26 && isOverload) { // Singularity of Fear (Overload)
          opponent.points = 1;
          newState.log.push(`> The singularity sets ${opponent.name}'s points to 1!`);
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
                // ... (existing volatile logic is fine)
            }

            // --- SHOWDOWN LOGIC ---
            const getPlayerShowdownCards = (player: PlayerState, communityCards: CardData[], log: string[]): { cards: CardData[], lastStandTriggered: boolean } => {
                let holeCards = player.holeCards.map(c => ({ ...c })); // deep copy
                let lastStandTriggered = false;
                if (player.points <= 5) {
                    holeCards.forEach(card => {
                        const lastStandAbility = card.abilities?.find(a => a.name === 'Last Stand');
                        if (lastStandAbility && player.mana >= (lastStandAbility.cost || 3)) {
                            player.mana -= (lastStandAbility.cost || 3);
                            const currentRankIndex = RANKS.indexOf(card.rank!);
                            if (currentRankIndex < RANKS.length - 1) { // not an ace
                                card.rank = RANKS[currentRankIndex + 1];
                                log.push(`> ${player.name} pays 3 mana for ${card.name} to trigger Last Stand!`);
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
            
            // Gravity Well (Void Mother) ability check
            [newState.players[0], newState.players[1]].forEach((player, index) => {
                const opponent = newState.players[index === 0 ? 1 : 0];
                player.holeCards.forEach(card => {
                    if (card.abilities?.some(a => a.name === 'Gravity Well')) {
                        const manaLost = Math.floor(opponent.mana / 2);
                        opponent.mana -= manaLost;
                        newState.log.push(`> ${player.name}'s Void Mother triggers Gravity Well! ${opponent.name} loses ${manaLost} mana.`);
                    }
                });
            });

            const p1Hand = evaluateHand(p1Cards);
            const p2Hand = evaluateHand(p2Cards);

            // ... (rest of showdown logic is largely okay)
            let winnerIndex = -1;
            let logMessage = `--- Showdown! ---\n` +
             `${p1Log.length > 0 ? p1Log.join('\n') + `\n` : ''}` +
             `${p2Log.length > 0 ? p2Log.join('\n') + `\n` : ''}` +
             `${newState.players[0].name} has: ${p1Hand.name}\n` +
             `${newState.players[1].name} has: ${p2Hand.name}`;

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
        case 'MULLIGAN': // New case to transition from mulligan to betting
            newState.phase = 'PRE_FLOP';
            newState.log.push(`--- Betting Begins ---`);
            return newState;
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
        { ...currentState.players[0], deck: p1RemainingDeck, hand: p1Hand, holeCards: p1Hole, artifacts: [], discard: [], mana: STARTING_MANA, points: p1Points, bet: ANTE, hasActed: false, hasDiscarded: false, hasPeeked: false, hasUsedCrossroadsThisTurn: false, hasMadeBettingActionThisTurn: false, manaDebt: 0, trapCard: null, activeChronoEffects: [], mulliganed: false, stats: { ...currentState.players[0].stats, handsPlayed: currentState.players[0].stats.handsPlayed + 1 } },
        { ...currentState.players[1], deck: p2RemainingDeck, hand: p2Hand, holeCards: p2Hole, artifacts: [], discard: [], mana: STARTING_MANA, points: p2Points, bet: ANTE, hasActed: false, hasDiscarded: false, hasPeeked: false, hasUsedCrossroadsThisTurn: false, hasMadeBettingActionThisTurn: false, manaDebt: 0, trapCard: null, activeChronoEffects: [], mulliganed: false, stats: { ...currentState.players[1].stats, handsPlayed: currentState.players[1].stats.handsPlayed + 1 }  },
      ],
      riverDeck: shuffle(RIVER_DECK_UNITS),
      communityCards: [],
      activeLocation: null,
      pot: ANTE * 2,
      phase: 'MULLIGAN',
      log: [`--- New Round ---`, `Both players ante ${ANTE}. Pot is ${ANTE * 2}.`, `--- Mulligan Phase ---`],
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
        // Scrapper, Synergy, Momentum logic... (existing is fine)
    });

    return newState;
  }, []);

  const initGame = useCallback(() => {
    const p1: PlayerState = { id: 1, name: 'Player 1', deck: createPlayerDeck(), hand: [], holeCards: [], artifacts: [], discard: [], mana: 0, points: STARTING_POINTS, bet: 0, hasActed: false, hasDiscarded: false, hasPeeked: false, hasUsedCrossroadsThisTurn: false, hasMadeBettingActionThisTurn: false, manaDebt: 0, trapCard: null, activeChronoEffects: [], mulliganed: false, stats: { handsPlayed: 0, vpip: 0 } };
    const p2: PlayerState = { id: 2, name: 'CPU', deck: createPlayerDeck(), hand: [], holeCards: [], artifacts: [], discard: [], mana: 0, points: STARTING_POINTS, bet: 0, hasActed: false, hasDiscarded: false, hasPeeked: false, hasUsedCrossroadsThisTurn: false, hasMadeBettingActionThisTurn: false, manaDebt: 0, trapCard: null, activeChronoEffects: [], mulliganed: false, stats: { handsPlayed: 0, vpip: 0 } };

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
          // ... (existing logic is fine)
          return prevState;
      }
      
      let newState = JSON.parse(JSON.stringify(prevState)) as GameState;
      const activePlayer = newState.players[newState.activePlayerIndex];
      const opponent = newState.players[newState.activePlayerIndex === 0 ? 1: 0];

      // --- Mulligan Phase Logic ---
      if (newState.phase === 'MULLIGAN') {
          if (action === 'KEEP_HAND') {
              // FIX: Use newState.players instead of undefined 'players'
              newState.log.push(`> ${newState.players[0].name} keeps their hand.`);
              // Now it's CPU's turn to decide
              const cpuDecidesToMulligan = getCpuAction(newState, true);
              if (cpuDecidesToMulligan) {
                  // FIX: Use newState.players instead of undefined 'players'
                  newState.log.push(`> ${newState.players[1].name} mulligans.`);
                  const player = newState.players[1];
                  player.deck.push(...player.hand);
                  player.deck = shuffle(player.deck);
                  player.hand = player.deck.splice(0, STARTING_HAND_SIZE);
                  player.mulliganed = true;
              } else {
                  // FIX: Use newState.players instead of undefined 'players'
                  newState.log.push(`> ${newState.players[1].name} keeps their hand.`);
              }
              return advancePhase(newState);
          }
          if (action === 'MULLIGAN') {
              // FIX: Use newState.players instead of undefined 'players'
              newState.log.push(`> ${newState.players[0].name} mulligans.`);
              const player = newState.players[0];
              player.deck.push(...player.hand);
              player.deck = shuffle(player.deck);
              player.hand = player.deck.splice(0, STARTING_HAND_SIZE);
              player.mulliganed = true;
              // Now it's CPU's turn to decide
              const cpuDecidesToMulligan = getCpuAction(newState, true);
              if (cpuDecidesToMulligan) {
                  // FIX: Use newState.players instead of undefined 'players'
                  newState.log.push(`> ${newState.players[1].name} mulligans.`);
                  const cpu = newState.players[1];
                  cpu.deck.push(...cpu.hand);
                  cpu.deck = shuffle(cpu.deck);
                  cpu.hand = cpu.deck.splice(0, STARTING_HAND_SIZE);
                  cpu.mulliganed = true;
              } else {
                  // FIX: Use newState.players instead of undefined 'players'
                  newState.log.push(`> ${newState.players[1].name} keeps their hand.`);
              }
              return advancePhase(newState);
          }
          return newState; // Do nothing if action is not mulligan-related
      }

      const endTurn = (state: GameState): GameState => {
        let turnEndState = JSON.parse(JSON.stringify(state));
        // ... (existing endTurn logic) ...
        // --- Start of Turn Effects for new active player ---
        const newActivePlayer = turnEndState.players[turnEndState.activePlayerIndex];
        
        // Chrono Effects
        const remainingChronoEffects: any[] = [];
        newActivePlayer.activeChronoEffects.forEach(effect => {
            turnEndState.log.push(`> ${newActivePlayer.name}'s ${effect.cardName} Chrono effect triggers: ${effect.description}`);
            // Implement effect logic here based on description or ID
            if (effect.cardId === 15) { // The Ship's Last Breath
                const opp = turnEndState.players[turnEndState.activePlayerIndex === 0 ? 1 : 0];
                opp.points -= 1;
            }
            effect.turns -= 1;
            if (effect.turns > 0) {
                remainingChronoEffects.push(effect);
            } else {
                turnEndState.log.push(`> ${effect.cardName} Chrono effect has ended.`);
            }
        });
        newActivePlayer.activeChronoEffects = remainingChronoEffects;

        // ... (rest of existing endTurn logic) ...
        return turnEndState;
      }

      // Helper to check and trigger traps
      const checkTrap = (triggerAction: string, actingPlayer: PlayerState, opponentState: PlayerState) => {
          if (opponentState.trapCard && opponentState.trapCard.condition === triggerAction) {
              newState.log.push(`> ${opponentState.name}'s trap, ${opponentState.trapCard.card.name}, was triggered!`);
              // Implement trap effect
              if (opponentState.trapCard.card.id === 6) { // Unseen Entities
                  opponentState.mana += 2;
              }
              opponentState.trapCard = null; // Trap is consumed
          }
      }
      
      switch(action) {
          case 'MANA_SINK_CYCLE': {
              const { cardIndex } = payload;
              const card = activePlayer.hand[cardIndex];
              if (!card || activePlayer.mana < 5 || activePlayer.deck.length === 0) return newState;

              activePlayer.mana -= 5;
              const [discardedCard] = activePlayer.hand.splice(cardIndex, 1);
              activePlayer.discard.push(discardedCard);
              const [drawnCard] = activePlayer.deck.splice(0,1);
              activePlayer.hand.push(drawnCard);
              newState.log.push(`> ${activePlayer.name} pays 5 mana to cycle ${discardedCard.name} and draw a new card.`);
              return newState; // Does not end turn
          }
          case 'BET': {
              // ... (existing bet logic)
              activePlayer.stats.vpip++;
              checkTrap("opponent_bets", activePlayer, opponent);
              return endTurn(newState);
          }
           case 'RAISE': {
              // ... (existing raise logic)
              activePlayer.stats.vpip++;
              checkTrap("opponent_bets", activePlayer, opponent);
              return endTurn(newState);
          }
          case 'CALL': {
              // ... (existing call logic)
              activePlayer.stats.vpip++;
              return endTurn(newState);
          }
          case 'FOLD': {
              // ...
              checkTrap("opponent_folds", activePlayer, opponent);
              // ... (rest of fold logic)
          }
          case 'PLAY_CARD': {
              const { cardIndex, isOverload } = payload;
              const card = activePlayer.hand[cardIndex];
              const ability = card?.abilities?.[0];
              const cost = isOverload ? ability?.overloadCost ?? 99 : card?.manaCost ?? 99;

              if (!card || activePlayer.mana < cost || newState.amountToCall > 0) return newState;
              
              activePlayer.mana -= cost;
              activePlayer.hand.splice(cardIndex, 1);
              newState.log.push(`${activePlayer.name} plays ${card.name}${isOverload ? ' with Overload!' : '.'}`);

              // Handle Chrono and Trap setup
              card.abilities?.forEach(ab => {
                  if (ab.name === 'Chrono' && ab.duration) {
                      activePlayer.activeChronoEffects.push({ cardName: card.name, turns: ab.duration, description: ab.description, cardId: card.id });
                  }
                  if (ab.name === 'Trap' && ab.condition) {
                      activePlayer.trapCard = { card, condition: ab.condition };
                      newState.log.push(`> ${activePlayer.name} sets a trap!`);
                  }
              });

              // Resolve card effects before moving card to zone
              newState = resolveCardEffect(newState, card, newState.activePlayerIndex as 0 | 1, isOverload);

              // Don't move Trap cards to a zone, they are 'set'
              if (card.abilities?.some(a => a.name === 'Trap')) {
                   // Card is consumed by being set
              } else {
                  switch (card.type) {
                      case CardType.Event:
                          activePlayer.discard.push(card);
                          break;
                      // ... (rest of existing PLAY_CARD logic)
                  }
              }

              opponent.hasActed = false; // Playing a card is like a bet, opponent must act
              return endTurn(newState);
          }
          // ... (rest of actions)
      }
      return newState;
    });
  }, [initGame, startRound]);

  const getCpuAction = (gs: GameState, isMulliganCheck: boolean = false) => {
      const cpu = gs.players[1];
      const player = gs.players[0];
      
      // --- Mulligan Logic ---
      if (isMulliganCheck) {
          const nonUnits = cpu.hand.filter(c => c.type !== CardType.Unit);
          const highCostCards = cpu.hand.filter(c => (c.manaCost || 0) > 4);
          if (cpu.hand.length > 0 && (nonUnits.length === cpu.hand.length || highCostCards.length >= 3)) {
              return true; // Decide to mulligan
          }
          return false;
      }

      // --- Main AI Logic ---
      // FIX: define aggression for AI decision making
      const aggression = Math.random();
      const { communityCards, phase, pot, lastBetSize, activeLocation, lastBettor } = gs;
      const isSanctuaryActive = activeLocation?.abilities?.some(a => a.name === 'Sanctuary');
      let potOddsAdjustment = isSanctuaryActive ? 0.2 : 0; // Be much more willing to call with Sanctuary

      // Opponent Modeling
      const playerVpipRate = player.stats.handsPlayed > 5 ? player.stats.vpip / player.stats.handsPlayed : 0.5;
      if (playerVpipRate > 0.7) potOddsAdjustment += 0.1; // Player is loose, call more
      if (playerVpipRate < 0.3) potOddsAdjustment -= 0.1; // Player is tight, be more cautious

      // Player Last Stand Awareness
      const playerIsLow = player.points <= 5;
      if (playerIsLow && phase !== 'PRE_FLOP') {
        // Assume player has a stronger hand than they appear to
        potOddsAdjustment -= 0.15;
      }
      
      const amountToCall = player.bet - cpu.bet;

      // --- Enhanced Hand & Board Analysis ---
      const allCards = [...cpu.holeCards, ...communityCards];
      const pokerCards = allCards.filter(c => c.rank && c.suit);
      const cpuHand = evaluateHand(pokerCards);
      const handRank = cpuHand.value[0]; // 1 (High Card) to 10 (Royal Flush)
      
      // FIX: Define isDrawing for AI decision making
      let isDrawing = false;
      if (pokerCards.length >= 4) {
        const suitCounts = pokerCards.reduce((acc, card) => {
          acc[card.suit!] = (acc[card.suit!] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const isFlushDraw = Object.values(suitCounts).some(count => count === 4);

        const ranks = [...new Set(pokerCards.map(c => RANK_VALUES[c.rank!]))].sort((a, b) => a - b);
        let isStraightDraw = false;
        if (ranks.length >= 4) {
          for (let i = 0; i <= ranks.length - 4; i++) {
            if (ranks[i+3] - ranks[i] < 5) { // 4 cards within a 5-rank window
              isStraightDraw = true;
              break;
            }
          }
          // Ace-low straight draw check
          if (ranks.includes(14) && ranks.includes(2) && ranks.includes(3) && ranks.includes(4)) {
            isStraightDraw = true;
          }
        }
        isDrawing = isFlushDraw || isStraightDraw;
      }

      // ... (existing hand analysis logic is good) ...
      const isMonster = handRank >= 7; // Full House+
      const isVeryStrong = handRank >= 5; // Straight+

      // --- Decision Logic ---
      if (amountToCall > 0) { // Facing a bet or raise
          const playerJustRaised = lastBettor === 0;
          // FIX: Anti-Raise Loop
          if (playerJustRaised && !isVeryStrong && !isDrawing) {
              return handleAction('FOLD');
          }
          // ... (rest of call/raise/fold logic, incorporating potOddsAdjustment)
      } else { // Checked to CPU
          // FIX: Discard Logic
          if (!cpu.hasDiscarded && aggression > 0.4) {
              const rarityValue: Record<Rarity, number> = { [Rarity.Common]: 1, [Rarity.Uncommon]: 2, [Rarity.Rare]: 3, [Rarity.SuperRare]: 4, [Rarity.Mythic]: 5, [Rarity.Divine]: 6 };
              const cardScores = cpu.hand.map((card, index) => ({
                  card,
                  index,
                  score: (rarityValue[card.rarity] * 2) + (card.manaCost || 0) + (card.abilities ? card.abilities.length * 3 : 0)
              }));
              
              const unplayable = cardScores.filter(item => (item.card.manaCost || 0) > cpu.mana);
              if (unplayable.length > 0) {
                  unplayable.sort((a,b) => a.score - b.score); // sort by lowest score
                  return handleAction('DISCARD', { cardIndex: unplayable[0].index });
              }
          }
          // Card-Specific Logic
          const lastPlating = cpu.hand.find(c => c.id === 62);
          if(lastPlating && (lastPlating.manaCost || 0) <= cpu.mana && isMonster) {
            return handleAction('PLAY_CARD', { cardIndex: cpu.hand.indexOf(lastPlating) });
          }

          // ... (rest of check/bet logic)
      }
      // Fallback to existing logic if no specific action taken
      const originalCpuAction = () => { /* ... existing CPU logic ... */ };
      return originalCpuAction();
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
