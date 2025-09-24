import React from 'react';
import { CardData, Rarity, CardSuit } from '../types';
import { ManaIcon } from '../../components/icons/MagicIcon';
import { SparklesIcon } from '../../components/icons/SparklesIcon';

interface CardDisplayProps {
  card: CardData | null;
  displayMode?: 'full' | 'board' | 'hand' | 'facedown';
  onClick?: () => void;
  isSelected?: boolean;
  isPlayable?: boolean;
  isInWinningHand?: boolean;
}

const suitSymbols: Record<CardSuit, string> = {
  [CardSuit.Spades]: '♠',
  [CardSuit.Hearts]: '♥',
  [CardSuit.Diamonds]: '♦',
  [CardSuit.Clubs]: '♣',
};

const rarityStyles: Record<Rarity, { text: string; bg: string; border?: string }> = {
    [Rarity.Common]: { text: 'text-rarity-common', bg: 'bg-rarity-common/10', border: 'border-rarity-common' },
    [Rarity.Uncommon]: { text: 'text-rarity-uncommon', bg: 'bg-rarity-uncommon/10', border: 'border-rarity-uncommon' },
    [Rarity.Rare]: { text: 'text-rarity-rare', bg: 'bg-rarity-rare/10', border: 'border-rarity-rare' },
    [Rarity.SuperRare]: { text: 'text-rarity-super-rare', bg: 'bg-rarity-super-rare/10', border: 'border-rarity-super-rare' },
    [Rarity.Mythic]: { text: 'text-rarity-mythic', bg: 'bg-rarity-mythic/10', border: 'border-rarity-mythic' },
    [Rarity.Divine]: { text: 'text-transparent bg-clip-text bg-gradient-to-r from-rarity-super-rare to-rarity-mythic', bg: 'bg-gradient-to-r from-rarity-super-rare/10 to-rarity-mythic/10', border: 'border-rarity-mythic' },
};

const CardBack: React.FC<{onClick?: ()=>void}> = ({onClick}) => (
    <div onClick={onClick} className="w-full h-full bg-brand-surface rounded-lg border-2 border-brand-primary/20 flex items-center justify-center cursor-pointer hover:border-brand-primary transition-colors">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary opacity-30 animate-pulse"></div>
    </div>
);


const BoardCard: React.FC<{ card: CardData; isInWinningHand?: boolean }> = ({ card, isInWinningHand }) => {
    const isVideo = card.imageUrl.endsWith('.mp4');
    const rarityStyle = rarityStyles[card.rarity];
    const winningHandClasses = isInWinningHand ? 'ring-4 ring-brand-accent scale-105 shadow-glow-primary' : `${rarityStyle.border} shadow-lg shadow-black/30`;
    return (
        <div className={`relative w-full h-full rounded-lg border overflow-hidden text-white group transition-all duration-300 ${winningHandClasses}`}>
            {isVideo ? (
              <video src={card.imageUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0" />
            ) : (
              <img src={card.imageUrl} alt={card.name} className="absolute inset-0 w-full h-full object-cover z-0" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10"></div>
            <div className="relative z-20 flex flex-col h-full p-2 justify-end">
                <h3 className="font-serif text-sm font-bold leading-tight" style={{ textShadow: '0 1px 3px #000' }}>{card.name}</h3>
                {card.rank && card.suit && (
                    <div className="absolute top-1 left-1 bg-black/50 backdrop-blur-sm rounded-sm px-1.5 py-0.5 text-sm font-bold" style={{ textShadow: '0 1px 2px #000' }}>
                        {card.rank}{suitSymbols[card.suit]}
                    </div>
                )}
            </div>
        </div>
    );
};

const HandCard: React.FC<{ card: CardData; onClick?: () => void; isSelected?: boolean; isPlayable?: boolean; }> = ({ card, onClick, isSelected, isPlayable = true }) => {
    const isVideo = card.imageUrl.endsWith('.mp4');
    const rarityStyle = rarityStyles[card.rarity];
    const playableClasses = isPlayable ? 'cursor-pointer hover:-translate-y-2' : 'grayscale opacity-70';

    return (
        <div className={`relative group w-full h-full transition-all duration-200 ${playableClasses}`} onClick={onClick}>
          {/* Tooltip */}
          <div className="absolute bottom-full mb-4 w-64 p-3 bg-brand-surface border-2 border-brand-card rounded-lg shadow-2xl text-xs z-[100] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none -translate-x-1/4">
              <h4 className="font-bold font-serif text-base text-brand-primary">{card.name}</h4>
              <p className="italic text-brand-text/80 my-1">"{card.description}"</p>
              {card.abilities && card.abilities.length > 0 && (
                <div className="mt-2 pt-2 border-t border-brand-card/50 space-y-2">
                    {card.abilities.map((ability, index) => (
                        <div key={index}>
                            <p className="font-bold text-brand-secondary">{ability.name}</p>
                            <p className="text-brand-text/80 text-[11px]">{ability.description}</p>
                        </div>
                    ))}
                </div>
            )}
          </div>

          <div className={`relative w-full h-full rounded-lg shadow-lg shadow-black/30 overflow-hidden text-white transition-all duration-200 ${isSelected ? 'ring-4 ring-brand-accent' : `${rarityStyle.border} border`}`}>
              {isVideo ? (
                <video src={card.imageUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0" />
              ) : (
                <img src={card.imageUrl} alt={card.name} className="absolute inset-0 w-full h-full object-cover z-0" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-10"></div>
              {!isPlayable && <div className="absolute inset-0 bg-black/40 z-10"></div>}
              <div className="relative z-20 flex flex-col h-full p-2 justify-end">
                  <h3 className="font-sans text-xs font-bold leading-tight" style={{ textShadow: '0 1px 3px #000' }}>{card.name}</h3>
                  {card.abilities && card.abilities.length > 0 && (
                      <SparklesIcon className="w-4 h-4 text-brand-accent absolute top-1 right-1" style={{filter: 'drop-shadow(0 0 3px #ff9e64aa)'}} />
                  )}
                  <div className="flex justify-between items-center text-xs mt-1">
                      <span className={`font-bold px-1.5 py-0.5 rounded-full text-[10px] ${rarityStyle.bg} ${rarityStyle.text}`}>{card.rarity.replace('-', ' ')}</span>
                      {card.manaCost !== undefined && (
                          <div className={`flex items-center gap-1 font-bold bg-brand-surface px-1.5 py-0.5 rounded-full text-[10px] ${isPlayable ? 'text-brand-primary' : 'text-brand-danger'}`}>
                              <ManaIcon className="w-2.5 h-2.5"/>
                              <span>{card.manaCost}</span>
                          </div>
                      )}
                  </div>
              </div>
          </div>
        </div>
    )
};


const CardDisplay: React.FC<CardDisplayProps> = ({ card, displayMode = 'board', onClick, isSelected, isPlayable, isInWinningHand }) => {
  if (displayMode === 'facedown') {
    return <CardBack onClick={onClick} />;
  }
  if (!card) {
    return <div className="w-full h-full bg-brand-surface rounded-lg border border-brand-card/30"></div>;
  }
  
  switch(displayMode) {
    case 'hand':
        return <HandCard card={card} onClick={onClick} isSelected={isSelected} isPlayable={isPlayable}/>
    case 'board':
        return <BoardCard card={card} isInWinningHand={isInWinningHand} />
    case 'full': 
    default:
        return <BoardCard card={card} isInWinningHand={isInWinningHand} />;
  }
};

export default CardDisplay;