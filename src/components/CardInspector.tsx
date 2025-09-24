
import React from 'react';
import { CardData, Rarity } from '../types';

interface CardInspectorProps {
  card: CardData | null;
}

const rarityStyles: Record<Rarity, { text: string; bg: string; }> = {
    [Rarity.Common]: { text: 'text-rarity-common', bg: 'bg-rarity-common/20' },
    [Rarity.Uncommon]: { text: 'text-rarity-uncommon', bg: 'bg-rarity-uncommon/20' },
    [Rarity.Rare]: { text: 'text-rarity-rare', bg: 'bg-rarity-rare/20' },
    [Rarity.SuperRare]: { text: 'text-rarity-super-rare', bg: 'bg-rarity-super-rare/20' },
    [Rarity.Mythic]: { text: 'text-rarity-mythic', bg: 'bg-rarity-mythic/20' },
    [Rarity.Divine]: { text: 'text-transparent bg-clip-text bg-gradient-to-r from-rarity-super-rare to-rarity-mythic', bg: 'bg-gradient-to-r from-rarity-super-rare/20 to-rarity-mythic/20' },
};

const CardInspector: React.FC<CardInspectorProps> = ({ card }) => {
  if (!card) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center text-brand-text/50 p-4 bg-brand-bg/50 rounded-2xl">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
        <h4 className="font-bold text-lg font-serif">Card Inspector</h4>
        <p className="text-sm mt-1">Select a card from your hand or your hole cards to see a larger view.</p>
        <p className="text-xs mt-2 text-brand-text/40">Hover over the enlarged card to see details.</p>
      </div>
    );
  }

  const isVideo = card.imageUrl.endsWith('.mp4');
  const rarityStyle = rarityStyles[card.rarity];

  return (
    <div className="h-full flex flex-col p-1">
      <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden shadow-2xl shadow-black/50 group">
        {isVideo ? (
          <video src={card.imageUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <img src={card.imageUrl} alt={card.name} className="absolute inset-0 w-full h-full object-cover" />
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <h3 className="font-serif text-2xl font-bold text-white" style={{ textShadow: '0 2px 4px #000' }}>{card.name}</h3>
          <div className="flex items-center gap-2 my-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${rarityStyle.bg} ${rarityStyle.text}`}>{card.rarity.replace('-', ' ')}</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-brand-surface text-brand-text">{card.type}</span>
            {card.manaCost !== undefined && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-brand-primary/20 text-brand-primary">{card.manaCost} Mana</span>
            )}
          </div>
          <p className="text-sm text-brand-text/90 italic" style={{ textShadow: '0 1px 3px #000' }}>"{card.description}"</p>
        </div>
      </div>
    </div>
  );
};

export default CardInspector;
