import { GameState, CardData, CardType } from '../types';

export const resolveCardEffect = (state: GameState, card: CardData, playerIndex: 0 | 1): GameState => {
    const newState: GameState = JSON.parse(JSON.stringify(state));
    const player = newState.players[playerIndex];
    const opponentIndex = playerIndex === 0 ? 1 : 0;
    const opponent = newState.players[opponentIndex];
    const opponentHasBulwark = opponent.holeCards.some(c => c.abilities?.some(a => a.name === 'Bulwark'));

    // Card-specific effects based on ID
    switch (card.id) {
        // --- Event Cards ---
        case 4: { // Solar Flare (Cost 2)
            let damage = 2;
            if (opponentHasBulwark) {
                damage = Math.max(0, damage - 1);
                newState.log.push(`> ${opponent.name}'s Bulwark reduces the damage!`);
            }
            opponent.points -= damage;
            newState.log.push(`> ${card.name} erupts, dealing ${damage} damage to ${opponent.name}.`);
            break;
        }

        case 7: { // The Cold Doesn't Care (Cost 2)
            let manaLoss = 1;
             if (opponentHasBulwark) {
                manaLoss = Math.max(0, manaLoss - 1);
                newState.log.push(`> ${opponent.name}'s Bulwark resists the mana drain!`);
            }
            if (manaLoss > 0) {
                opponent.mana = Math.max(0, opponent.mana - manaLoss);
                newState.log.push(`> ${card.name} chills ${opponent.name}, who loses ${manaLoss} mana.`);
            }
            break;
        }

        case 10: // Cracked Reality (Cost 3)
            if (opponent.hand.length > 0) {
                const discardIndex = Math.floor(Math.random() * opponent.hand.length);
                const [discardedCard] = opponent.hand.splice(discardIndex, 1);
                opponent.discard.push(discardedCard);
                newState.log.push(`> ${card.name} shatters ${opponent.name}'s thoughts, forcing them to discard ${discardedCard.name}.`);
            }
            break;

        case 45: // Dust of the Cosmos (Cost 1)
            player.mana += 2;
            newState.log.push(`> ${player.name} inhales ${card.name}, gaining 2 mana.`);
            break;

        // --- Artifacts with on-play effects ---
        case 8: // Message from the Stars (Cost 3)
            if (player.deck.length > 0) {
                const [drawnCard] = player.deck.splice(0, 1);
                player.hand.push(drawnCard);
                newState.log.push(`> ${card.name} delivers a message. ${player.name} draws a card.`);
            }
            break;
            
        default:
            // No effect on play
            break;
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
