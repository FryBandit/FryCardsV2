
import React from 'react';
import { CardData, Rarity, PlayerState } from '../types';
import { ManaIcon } from '../../components/icons/MagicIcon';

interface CardInspectorProps {
  card: CardData | null;
  player?: PlayerState;
  isMyTurn?: boolean;
  onAction?: (action: string, payload?: any) => void;
}

const rarityStyles: Record<Rarity, { text: string; bg: string; }> = {
    [Rarity.Common]: { text: 'text-rarity-common', bg: 'bg-rarity-common/20' },
    [Rarity.Uncommon]: { text: 'text-rarity-uncommon', bg: 'bg-rarity-uncommon/20' },
    [Rarity.Rare]: { text: 'text-rarity-rare', bg: 'bg-rarity-rare/20' },
    [Rarity.SuperRare]: { text: 'text-rarity-super-rare', bg: 'bg-rarity-super-rare/20' },
    [Rarity.Mythic]: { text: 'text-rarity-mythic', bg: 'bg-rarity-mythic/20' },
    [Rarity.Divine]: { text: 'text-transparent bg-clip-text bg-gradient-to-r from-rarity-super-rare to-rarity-mythic', bg: 'bg-gradient-to-r from-rarity-super-rare/20 to-rarity-mythic/20' },
};

const CardInspector: React.FC<CardInspectorProps> = ({ card, player, isMyTurn, onAction }) => {
  const selectedHoleCard = player?.holeCards.find(c => c.id === card?.id);
  const canPeek = isMyTurn && selectedHoleCard?.abilities?.some(a => a.name === 'Peek') && player?.hasPeeked === false && (player?.mana ?? 0) >= 1 && onAction;

  const selectedArtifactCard = player?.artifacts.find(c => c.id === card?.id);
  const canUseCharge = isMyTurn && selectedArtifactCard && card && (player?.charges[card.id] ?? 0) > 0 && onAction;

  const imbueAbility = selectedArtifactCard?.abilities?.find(a => a.name === 'Imbue');
  const canImbue = isMyTurn && selectedArtifactCard && imbueAbility && (player?.mana ?? 0) >= (imbueAbility.cost ?? 99) && onAction;

  const getDisabledTitle = (action: string): string => {
      if (action === 'peek') {
          if (!isMyTurn) return "Not your turn";
          if (player?.hasPeeked) return "Already peeked this turn";
          if ((player?.mana ?? 0) < 1) return "Not enough mana";
          return "Activate Peek ability";
      }
      if (action === 'charge') {
          if (!isMyTurn) return "Not your turn";
          if (!card || (player?.charges[card.id] ?? 0) <= 0) return "No charges left";
          return "Use a charge to draw a card";
      }
      if (action === 'imbue') {
          if (!isMyTurn) return "Not your turn";
          if (!imbueAbility) return "No Imbue ability";
          if ((player?.mana ?? 0) < (imbueAbility.cost ?? 99)) return "Not enough mana";
          return "Activate Imbue ability";
      }
      return "";
  }


  if (!card) {
    return (
      <div className="w-full aspect-[3/4] flex flex-col items-center justify-center text-center text-brand-text/50 p-4 bg-brand-bg/50 rounded-2xl">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
        <h4 className="font-bold text-lg font-serif">Card Inspector</h4>
        <p className="text-sm mt-1">Select a card to see a larger view and its details.</p>
      </div>
    );
  }

  const isVideo = card.imageUrl.endsWith('.mp4');
  const rarityStyle = rarityStyles[card.rarity];

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden shadow-2xl shadow-black/50 flex-shrink-0">
        {isVideo ? (
          <video src={card.imageUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <img src={card.imageUrl} alt={card.name} className="absolute inset-0 w-full h-full object-cover" />
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 flex flex-col justify-end">
          <h3 className="font-serif text-2xl font-bold text-white" style={{ textShadow: '0 2px 4px #000' }}>{card.name}</h3>
          <div className="flex items-center gap-2 my-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${rarityStyle.bg} ${rarityStyle.text}`}>{card.rarity.replace('-', ' ')}</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-brand-surface text-brand-text">{card.type}</span>
            {card.manaCost !== undefined && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-brand-primary/20 text-brand-primary"><ManaIcon className="w-3 h-3"/> {card.manaCost} Mana</span>
            )}
          </div>
          <p className="text-sm text-brand-text/90 italic" style={{ textShadow: '0 1px 3px #000' }}>"{card.description}"</p>
          {card.abilities && card.abilities.length > 0 && (
              <div className="mt-2 pt-2 border-t border-brand-card/30 space-y-2 max-h-32 overflow-y-auto">
                  {card.abilities.map((ability, index) => (
                      <div key={index}>
                          <h4 className="font-bold text-brand-secondary" style={{ textShadow: '0 1px 3px #000' }}>{ability.name}{ability.cost && ` (${ability.cost} Mana)`}</h4>
                          <p className="text-sm text-brand-text/90" style={{ textShadow: '0 1px 3px #000' }}>{ability.description}</p>
                           {ability.overloadDescription && (
                                <p className="text-brand-text/80 text-xs mt-1" style={{ textShadow: '0 1px 3px #000' }}><strong className="text-brand-accent">Overload:</strong> {ability.overloadDescription}</p>
                            )}
                      </div>
                  ))}
              </div>
          )}
        </div>
      </div>
      <div className="flex-grow space-y-2">
        {canPeek && (
            <button 
                onClick={() => onAction('PEEK', { cardId: card.id })} 
                disabled={!canPeek}
                title={getDisabledTitle('peek')}
                className="w-full bg-brand-accent/80 text-white font-bold py-2 px-4 rounded disabled:bg-brand-card disabled:text-brand-text/50 disabled:cursor-not-allowed hover:bg-brand-accent transition-colors">
                Activate Peek (1 Mana)
            </button>
        )}
        {canUseCharge && player && (
            <button 
                onClick={() => onAction('USE_CHARGE', { cardId: card.id })} 
                disabled={!canUseCharge}
                title={getDisabledTitle('charge')}
                className="w-full bg-brand-secondary text-white font-bold py-2 px-4 rounded disabled:bg-brand-card disabled:text-brand-text/50 disabled:cursor-not-allowed hover:bg-brand-secondary/80 transition-colors">
                Use Charge ({player.charges[card.id] || 0} left)
            </button>
        )}
        {canImbue && (
            <button 
                onClick={() => onAction('ACTIVATE_IMBUE', { cardId: card.id })} 
                disabled={!canImbue}
                title={getDisabledTitle('imbue')}
                className="w-full bg-brand-success text-white font-bold py-2 px-4 rounded disabled:bg-brand-card disabled:text-brand-text/50 disabled:cursor-not-allowed hover:bg-brand-success/80 transition-colors">
                Activate Imbue ({imbueAbility?.cost} Mana)
            </button>
        )}
      </div>
    </div>
  );
};

export default CardInspector;
