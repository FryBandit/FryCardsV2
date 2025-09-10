import React from 'react';
import { CardData, CardType, Rarity } from '../types';

interface CardDisplayProps {
  card: CardData | null;
}

const cardTypeStyles: Record<CardType, { border: string; bg: string; text: string }> = {
  [CardType.Unit]: { border: 'border-brand-danger', bg: 'bg-brand-danger/10', text: 'text-brand-danger' },
  [CardType.Location]: { border: 'border-brand-success', bg: 'bg-brand-success/10', text: 'text-brand-success' },
  [CardType.Event]: { border: 'border-brand-primary', bg: 'bg-brand-primary/10', text: 'text-brand-primary' },
  [CardType.Artifact]: { border: 'border-brand-accent', bg: 'bg-brand-accent/10', text: 'text-brand-accent' },
};

const rarityStyles: Record<Rarity, { text: string; bg: string; border?: string }> = {
    [Rarity.Common]: { text: 'text-brand-text/80', bg: 'bg-brand-text/10', border: 'border-brand-card' },
    [Rarity.Uncommon]: { text: 'text-brand-success', bg: 'bg-brand-success/10', border: 'border-brand-success' },
    [Rarity.Rare]: { text: 'text-brand-primary', bg: 'bg-brand-primary/10', border: 'border-brand-primary' },
    [Rarity.SuperRare]: { text: 'text-brand-secondary', bg: 'bg-brand-secondary/10', border: 'border-brand-secondary' },
    [Rarity.Mythic]: { text: 'text-brand-accent', bg: 'bg-brand-accent/10', border: 'border-brand-accent' },
    [Rarity.Divine]: { text: 'text-transparent bg-clip-text bg-gradient-to-r from-brand-secondary to-brand-accent', bg: 'bg-gradient-to-r from-brand-secondary/10 to-brand-accent/10' },
};


const PlaceholderCard: React.FC = () => (
    <div className="w-full h-full bg-brand-surface border-2 border-dashed border-brand-card/50 rounded-2xl flex flex-col items-center justify-center p-6 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-brand-card/70 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="font-serif text-2xl text-brand-text/80">Draw Your Card</h3>
        <p className="text-brand-text/60 mt-2">Click "Draw a Card" to bring a creation to life.</p>
    </div>
);

const Particles: React.FC<{ rarity: Rarity }> = ({ rarity }) => {
    const particleCount = rarity === Rarity.Mythic ? 20 : 40;
    const particles = Array.from({ length: particleCount });

    return (
        <div className="absolute inset-0 overflow-hidden z-[15] pointer-events-none" aria-hidden="true">
            {particles.map((_, i) => {
                const style = {
                    left: `${Math.random() * 100}%`,
                    animationDuration: `${Math.random() * 10 + 10}s`,
                    animationDelay: `${Math.random() * 15}s`,
                };
                const sizeClass = Math.random() > 0.5 ? 'w-1 h-1' : 'w-[3px] h-[3px]';
                const colorClass = rarity === Rarity.Mythic 
                    ? 'bg-brand-accent'
                    : 'bg-white';

                return (
                    <div
                        key={i}
                        className={`absolute top-full rounded-full animate-floating-particles ${sizeClass} ${colorClass} shadow-glow-secondary`}
                        style={style}
                    ></div>
                );
            })}
        </div>
    );
};

const CardContent: React.FC<{ card: CardData }> = ({ card }) => {
  const typeStyle = cardTypeStyles[card.type];
  const rarityStyle = rarityStyles[card.rarity];
  const isVideo = card.imageUrl.endsWith('.mp4');

  const isSuperRareOrHigher = [Rarity.SuperRare, Rarity.Mythic, Rarity.Divine].includes(card.rarity);
  const isMythicOrHigher = [Rarity.Mythic, Rarity.Divine].includes(card.rarity);

  const cardLayers = (
    <>
      {/* Layer 0: Media */}
      {isVideo ? (
        <video 
          src={card.imageUrl} 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="absolute top-0 left-0 w-full h-full object-cover z-0" 
        />
      ) : (
        <img 
          src={card.imageUrl} 
          alt={card.name} 
          className="absolute top-0 left-0 w-full h-full object-cover z-0" 
        />
      )}

      {/* Layer 1: Holographic Sheen */}
      {isSuperRareOrHigher && (
          <div className={`absolute inset-0 z-[5] bg-gradient-to-r from-transparent via-white/50 to-transparent bg-[length:200%_100%] bg-no-repeat mix-blend-overlay animate-holographic-sheen ${isMythicOrHigher ? 'opacity-30' : 'opacity-20'}`}></div>
      )}

      {/* Layer 2: Readability Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10"></div>

      {/* Layer 3: Particles */}
      {isMythicOrHigher && <Particles rarity={card.rarity} />}

      {/* Layer 4: UI Content */}
      <div className="relative z-20 flex flex-col h-full p-4 justify-between">
        {/* Top Section: Name */}
        <header className="text-center">
          <h2 className="font-serif text-2xl font-bold tracking-wider" style={{ textShadow: '0px 2px 10px rgba(0, 0, 0, 1), 0px 1px 2px rgba(0, 0, 0, 0.8)' }}>
            {card.name}
          </h2>
        </header>
        
        {/* Bottom Section */}
        <footer className="space-y-3">
            {/* Type & Rarity Banners */}
            <div className="grid grid-cols-2 gap-2">
                <div className={`text-center font-bold text-sm uppercase tracking-widest ${typeStyle.text} bg-brand-bg/70 backdrop-blur-sm rounded-md py-1 border border-white/10`}>
                    {card.type}
                </div>
                <div className={`text-center font-bold text-sm uppercase tracking-widest ${rarityStyle.text} bg-brand-bg/70 backdrop-blur-sm rounded-md py-1 border border-white/10`}>
                    {card.rarity.replace('-', ' ')}
                </div>
            </div>
            
            {/* Description Box */}
            <div className="bg-brand-bg/70 backdrop-blur-sm rounded-lg p-3 text-sm italic text-brand-text/90 min-h-[6rem] border border-white/10">
              {card.description}
            </div>
            
            {/* Set Info */}
            <div className="text-right text-xs text-brand-text/60 font-serif italic" style={{ textShadow: '0 1px 2px rgba(0,0,0,1)' }}>
              {card.set}
            </div>
        </footer>
      </div>
    </>
  );

  const rarityAnimationClass = {
      [Rarity.Rare]: 'animate-pulse-glow-primary',
      [Rarity.SuperRare]: 'animate-pulse-glow-secondary',
      [Rarity.Mythic]: 'animate-pulse-glow-accent',
  }[card.rarity] || '';


  if (card.rarity === Rarity.Divine) {
    return (
      <div className="relative w-full h-full rounded-2xl p-[2px] bg-gradient-to-br from-brand-secondary via-brand-accent to-brand-primary bg-[length:200%_200%] animate-shimmer-border shadow-2xl shadow-black/50 animate-card-breath">
          <div className="relative w-full h-full rounded-[14px] flex flex-col overflow-hidden text-white">
              {cardLayers}
          </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full rounded-2xl border-2 ${rarityStyle.border} shadow-2xl shadow-black/50 flex flex-col overflow-hidden text-white ${rarityAnimationClass}`}>
      {cardLayers}
    </div>
  );
};

const CardDisplay: React.FC<CardDisplayProps> = ({ card }) => {
  return (
    <div className="w-full h-full perspective-1000">
      {card ? <CardContent card={card} /> : <PlaceholderCard />}
    </div>
  );
};

export default CardDisplay;