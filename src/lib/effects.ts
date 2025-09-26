
import { GameState, CardData, PlayerState, CardType, CardRank, CardSuit } from '../types';
import { shuffle } from './utils';
import { RANK_VALUES } from './poker';

// --- Helper Functions ---

/**
 * A consistent helper to determine damage/effect reduction from Bulwark.
 * Mutates the log array directly.
 */
const getReducedNumericEffect = (base: number, opponent: PlayerState, log: string[]): number => {
    let finalValue = base;
    if (opponent.hasBulwark) {
        finalValue = Math.max(0, finalValue - 1);
        log.push(`> %Bulwark% on *${opponent.name}* reduces the effect!`);
    }
    return finalValue;
};

const updatePlayerFlags = (player: PlayerState): PlayerState => {
    const allPlayerCards = [...player.holeCards, ...player.artifacts];
    player.hasBulwark = allPlayerCards.some(c => c.abilities?.some(a => a.name === 'Bulwark'));
    player.hasIntimidate = allPlayerCards.some(c => c.abilities?.some(a => a.name === 'Intimidate'));
    player.hasFlux = allPlayerCards.some(c => c.abilities?.some(a => a.name === 'Flux'));
    player.hasEconomist = allPlayerCards.some(c => c.abilities?.some(a => a.name === 'Economist'));
    return player;
};

// --- Generic Keyword Effects ---

const resolveCascade = (state: GameState, card: CardData, playerIndex: 0 | 1): GameState => {
    const player = state.players[playerIndex];
    state.log.push(`> Cascading...`);
    if (player.deck.length > 0) {
        const numToReveal = Math.min(3, player.deck.length);
        const revealed = player.deck.splice(0, numToReveal);
        const validTargets = revealed.filter(c => c.type !== CardType.Event && (c.manaCost || 0) < (card.manaCost || 0));
        
        if (validTargets.length > 0) {
            const cardToPlay = validTargets[0];
            const remainingRevealed = revealed.filter(c => c.id !== cardToPlay.id);
            player.deck.push(...shuffle(remainingRevealed)); // Bottom of deck in random order
            
            state.log.push(`> Cascade hits %${cardToPlay.name}%!`);
            // Recursively resolve the cascaded card's effect
            const stateAfterCascade = masterResolveCardEffect(state, cardToPlay, playerIndex, false);
            const playerAfterEffect = stateAfterCascade.players[playerIndex];

            // Place card in appropriate zone after effect
            switch(cardToPlay.type) {
                case CardType.Artifact:
                    playerAfterEffect.artifacts.push(cardToPlay);
                    updatePlayerFlags(playerAfterEffect);
                    break;
                case CardType.Location:
                    stateAfterCascade.activeLocation = cardToPlay;
                    break;
                default: // Unit cards go to discard as they have no "play" zone
                    playerAfterEffect.discard.push(cardToPlay);
                    break;
            }
            return stateAfterCascade;
        } else {
            state.log.push(`> Cascade missed!`);
            player.deck.push(...shuffle(revealed));
        }
    } else {
       state.log.push(`> Cascade fizzles, deck is empty.`);
    }
    return state;
};


// --- Card-Specific Effects ---
type EffectFunction = (state: GameState, card: CardData, playerIndex: 0 | 1, isOverload: boolean) => GameState;

const cardEffects: Record<number, EffectFunction> = {
    1: (state, card, playerIndex) => { // Lost Signal (Fate)
        const player = state.players[playerIndex];
        if (state.riverDeck.length > 0) {
            const topCard = state.riverDeck[0];
            state.log.push(`> %Fate% reveals %${topCard.rank} of ${topCard.suit}%.`);
            const faceCards = [CardRank.Jack, CardRank.Queen, CardRank.King, CardRank.Ace];
            if (faceCards.includes(topCard.rank!)) {
                if(player.deck.length > 0) {
                  player.hand.push(player.deck.shift()!);
                  state.log.push(`> It's a face card! *${player.name}* +draws a card+.`);
                }
            } else {
                if(player.hand.length > 0) {
                  const [discarded] = player.hand.splice(Math.floor(Math.random() * player.hand.length), 1);
                  player.discard.push(discarded);
                  state.log.push(`> Not a face card. *${player.name}* !discards %${discarded.name}%!`);
                }
            }
        }
        return state;
    },
    2: (state, card, playerIndex) => { // Echoes in the Void
        const opponent = state.players[playerIndex === 0 ? 1 : 0];
        opponent.points -= getReducedNumericEffect(1, opponent, state.log);
        state.log.push(`> *${opponent.name}* loses !1 point!.`);
        if (opponent.hand.length > 0) {
          if (opponent.hasFlux) {
              state.log.push(`> *${opponent.name}*'s %Flux% protects them from the discard effect!`);
          } else {
              const discarded = opponent.hand.splice(Math.floor(Math.random() * opponent.hand.length), 1);
              opponent.discard.push(discarded[0]);
              state.log.push(`> *${opponent.name}* !discards a random card! (%${discarded[0].name}%).`);
          }
        }
        return state;
    },
    4: (state, card, playerIndex, isOverload) => { // Solar Flare
        const opponent = state.players[playerIndex === 0 ? 1 : 0];
        const flareDamage = getReducedNumericEffect(isOverload ? 5 : 2, opponent, state.log);
        opponent.points -= flareDamage;
        state.log.push(`> *${opponent.name}* loses !${flareDamage} points!.`);
        return state;
    },
    7: (state, card, playerIndex) => { // The Cold Doesn't Care (Twin)
        const opponent = state.players[playerIndex === 0 ? 1 : 0];
        // Apply effect once
        let manaLoss1 = getReducedNumericEffect(1, opponent, state.log);
        opponent.mana = Math.max(0, opponent.mana - manaLoss1);
        state.log.push(`> *${opponent.name}* loses !${manaLoss1} mana!.`);
        
        // Apply effect a second time if Twinned
        state.log.push(`> %Twinned effect% triggers!`);
        let manaLoss2 = getReducedNumericEffect(1, opponent, state.log);
        opponent.mana = Math.max(0, opponent.mana - manaLoss2);
        state.log.push(`> *${opponent.name}* loses !${manaLoss2} mana!.`);
        return state;
    },
    8: (state, card, playerIndex) => { // Message from the Stars (Scrap)
        const player = state.players[playerIndex];
        const cardsToDraw = Math.min(2, player.deck.length);
        if (cardsToDraw > 0) {
            player.hand.push(...player.deck.splice(0, cardsToDraw));
            state.log.push(`> *${player.name}* uses %Scrap% to +draw ${cardsToDraw} card(s)+.`);
        }
        return state;
    },
    12: (state, card, playerIndex) => { // The Hunger (Wager)
        const opponent = state.players[playerIndex === 0 ? 1 : 0];
        const damageFromHand = opponent.hand.length;
        const hungerDamage = getReducedNumericEffect(damageFromHand, opponent, state.log);
        opponent.points -= hungerDamage;
        state.log.push(`> *${opponent.name}* loses !${hungerDamage} points! from %The Hunger%.`);
        return state;
    },
    17: (state, card, playerIndex) => { // Stardust Memories
        const player = state.players[playerIndex];
        const unitsInDiscard = player.discard.filter(c => c.type === CardType.Unit)
            .sort((a, b) => (b.manaCost || 0) - (a.manaCost || 0));
        const cardsToReturn = unitsInDiscard.slice(0, 2);
        if (cardsToReturn.length > 0) {
            state.log.push(`> Returning %${cardsToReturn.map(c => c.name).join(', ')}% to hand.`);
            player.hand.push(...cardsToReturn);
            player.discard = player.discard.filter(c => !cardsToReturn.find(ret => ret.id === c.id));
        }
        return state;
    },
    23: (state, card, playerIndex) => { // The Last Transmission (Wager)
        const player = state.players[playerIndex];
        const opponent = state.players[playerIndex === 0 ? 1 : 0];
        state.log.push(`> Both players reveal their hole cards!`);
        if (player.holeCards.length > 0 && opponent.holeCards.length > 0) {
             const playerHighCard = Math.max(...player.holeCards.map(c => RANK_VALUES[c.rank!]));
             const opponentHighCard = Math.max(...opponent.holeCards.map(c => RANK_VALUES[c.rank!]));
             if (playerHighCard > opponentHighCard) {
                 const transmissionDamage = getReducedNumericEffect(5, opponent, state.log);
                 opponent.points -= transmissionDamage;
                 state.log.push(`> *${player.name}* has the higher card, dealing !${transmissionDamage} points! to *${opponent.name}*.`);
             } else {
                 // Wager effects that damage the caster are not reduced
                 player.points -= 5;
                 state.log.push(`> *${opponent.name}* has the higher or equal card! *${player.name}* loses !5 points!`);
             }
        }
        return state;
    },
    26: (state, card, playerIndex, isOverload) => { // Singularity of Fear (Overload)
        const opponent = state.players[playerIndex === 0 ? 1 : 0];
        if (isOverload) {
          opponent.points = 1;
          state.log.push(`> The singularity sets *${opponent.name}*'s points to !1!`);
        } else {
          const damage = getReducedNumericEffect(Math.floor(opponent.points / 2), opponent, state.log);
          opponent.points -= damage;
          state.log.push(`> *${opponent.name}* loses !${damage} points! (half their total).`);
        }
        return state;
    },
    29: (state, card, playerIndex) => { // Eternal Eclipse
        const opponent = state.players[playerIndex === 0 ? 1: 0];
        state.spadesRound = true;
        opponent.cardPlayLocked = true;
        state.log.push(`> The eclipse warps reality! All community cards are now Spades. *${opponent.name}* cannot play a card on their next turn.`);
        return state;
    },
    62: (state, card, playerIndex) => { // The Last Plating (Wager)
        const player = state.players[playerIndex];
        player.wager62Active = true;
        state.log.push(`> *${player.name}* goes for the win! This showdown is for the game!`);
        return state;
    },
};

/**
 * The master function for resolving any card's effects.
 * This function mutates the state object that is passed in.
 */
export const masterResolveCardEffect = (state: GameState, card: CardData, playerIndex: 0 | 1, isOverload: boolean = false): GameState => {
    const player = state.players[playerIndex];
    
    // --- GENERIC KEYWORD EFFECTS ---
    card.abilities?.forEach(ability => {
        // Log only on-play effects, not passive abilities
        const onPlayKeywords = ['Cascade'];
        if (onPlayKeywords.includes(ability.name)) {
            state.log.push(`> *${player.name}*'s %${card.name}% triggers '%${ability.name}%'!`);
        }

        if (ability.name === 'Cascade') {
            state = resolveCascade(state, card, playerIndex);
        }
    });
    
    // --- CARD-SPECIFIC EFFECTS ---
    const effectFunction = cardEffects[card.id];
    if (effectFunction) {
        state = effectFunction(state, card, playerIndex, isOverload);
    }

    // Check for game over after effects resolve
    if (state.players[0].points <= 0 || state.players[1].points <= 0) {
        const p1Dead = state.players[0].points <= 0;
        const p2Dead = state.players[1].points <= 0;
        
        if (state.phase !== 'GAME_OVER') { // Prevent multiple game over messages
            state.phase = 'GAME_OVER';
            if (p1Dead && p2Dead) {
                 state.winner = null;
                 state.log.push(`\n--- @Both players were defeated! The game is a draw!@ ---`);
            } else {
                 state.winner = p1Dead ? state.players[1] : state.players[0];
                 state.log.push(`\n--- @*${state.winner.name}* wins the game!@ ---`);
            }
        }
    }
    
    // Ensure flags are up to date after an effect resolves
    state.players[playerIndex] = updatePlayerFlags(state.players[playerIndex]);
    return state;
};
