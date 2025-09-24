
import { GameState, CardData, CardType } from '../types';

export const resolveCardEffect = (state: GameState, card: CardData, playerIndex: 0 | 1): GameState => {
    const newState = JSON.parse(JSON.stringify(state)); // Deep copy for safety
    const player = newState.players[playerIndex];

    // Handle where the card goes after being played
    switch (card.type) {
        case CardType.Event:
            player.discard.push(card);
            break;
        case CardType.Artifact:
            player.artifacts.push(card);
            break;
        case CardType.Location:
            if(newState.activeLocation) {
                 const oldLocation = newState.activeLocation;
                 const ownerIndex = newState.players[0].artifacts.some(a => a.id === oldLocation.id) ? 0 : 1;
                 newState.players[ownerIndex].discard.push(oldLocation);
            }
            player.artifacts.push(card); // Locations are also artifacts for ownership
            newState.activeLocation = card;
            break;
        case CardType.Unit:
             // Units cannot be played from hand under the new rules. This case is for future use.
            player.discard.push(card);
            break;
    }

    return newState;
}
