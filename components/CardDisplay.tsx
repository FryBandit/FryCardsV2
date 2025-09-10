import React, { useRef, useEffect } from 'react';
import { CardData, CardType, Rarity } from '../types';

interface CardDisplayProps {
  card: CardData | null;
}

const cardTypeStyles: Record<CardType, { border: string; bg: string; text: string }> = {
  [CardType.Unit]: { border: 'border-type-unit', bg: 'bg-type-unit/10', text: 'text-type-unit' },
  [CardType.Location]: { border: 'border-type-location', bg: 'bg-type-location/10', text: 'text-type-location' },
  [CardType.Event]: { border: 'border-type-event', bg: 'bg-type-event/10', text: 'text-type-event' },
  [CardType.Artifact]: { border: 'border-type-artifact', bg: 'bg-type-artifact/10', text: 'text-type-artifact' },
};

const rarityStyles: Record<Rarity, { text: string; bg: string; border?: string }> = {
    [Rarity.Common]: { text: 'text-rarity-common', bg: 'bg-rarity-common/10', border: 'border-rarity-common' },
    [Rarity.Uncommon]: { text: 'text-rarity-uncommon', bg: 'bg-rarity-uncommon/10', border: 'border-rarity-uncommon' },
    [Rarity.Rare]: { text: 'text-rarity-rare', bg: 'bg-rarity-rare/10', border: 'border-rarity-rare' },
    [Rarity.SuperRare]: { text: 'text-rarity-super-rare', bg: 'bg-rarity-super-rare/10', border: 'border-rarity-super-rare' },
    [Rarity.Mythic]: { text: 'text-rarity-mythic', bg: 'bg-rarity-mythic/10', border: 'border-rarity-mythic' },
    [Rarity.Divine]: { text: 'text-transparent bg-clip-text bg-gradient-to-r from-rarity-super-rare to-rarity-mythic', bg: 'bg-gradient-to-r from-rarity-super-rare/10 to-rarity-mythic/10' },
};


const PlaceholderCard: React.FC = () => (
    <div className="w-full h-full bg-brand-surface border-2 border-dashed border-brand-card/50 rounded-2xl flex flex-col items-center justify-center p-6 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-brand-card/70 mb-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    ? 'bg-rarity-mythic'
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

const DefaultCardLayout: React.FC<{ card: CardData; containerRef: React.RefObject<HTMLDivElement> }> = ({ card, containerRef }) => {
  const typeStyle = cardTypeStyles[card.type];
  const rarityStyle = rarityStyles[card.rarity];
  const isVideo = card.imageUrl.endsWith('.mp4');

  const isSuperRare = card.rarity === Rarity.SuperRare;
  
  useEffect(() => {
    const element = containerRef.current;
    if (!isSuperRare || !element) return;

    element.style.transition = 'transform 0.1s ease-out';

    const handleMouseMove = (e: MouseEvent) => {
      const { left, top, width, height } = element.getBoundingClientRect();
      const x = (e.clientX - left) / width;
      const y = (e.clientY - top) / height;
      const rotateX = (y - 0.5) * -16;
      const rotateY = (x - 0.5) * 16;
      element.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
    };

    const handleMouseLeave = () => {
      element.style.transform = 'perspective(1200px) rotateX(0) rotateY(0) scale(1)';
    };

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      if (element) {
        element.removeEventListener('mousemove', handleMouseMove);
        element.removeEventListener('mouseleave', handleMouseLeave);
        element.style.transform = '';
        element.style.transition = '';
      }
    };
  }, [isSuperRare, containerRef]);


  const cardLayers = (
    <>
      {isVideo ? (
        <video src={card.imageUrl} autoPlay loop muted playsInline className="absolute top-0 left-0 w-full h-full object-cover z-0" />
      ) : (
        <img src={card.imageUrl} alt={card.name} className="absolute top-0 left-0 w-full h-full object-cover z-0" />
      )}
      {isSuperRare && (
          <div className="absolute inset-0 z-[5] bg-gradient-to-r from-transparent via-white/50 to-transparent bg-[length:200%_100%] bg-no-repeat mix-blend-overlay animate-holographic-sheen opacity-20"></div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10"></div>
      <div className="relative z-20 flex flex-col h-full p-4 justify-between">
        <header className="text-center">
          <h2 className="font-serif text-2xl font-bold tracking-wider" style={{ textShadow: '0px 2px 10px rgba(0, 0, 0, 1), 0px 1px 2px rgba(0, 0, 0, 0.8)' }}>
            {card.name}
          </h2>
        </header>
        <footer className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
                <div className={`text-center font-bold text-sm uppercase tracking-widest ${typeStyle.text} bg-brand-bg/70 backdrop-blur-sm rounded-md py-1 border border-white/10`}>
                    {card.type}
                </div>
                <div className={`text-center font-bold text-sm uppercase tracking-widest ${rarityStyle.text} bg-brand-bg/70 backdrop-blur-sm rounded-md py-1 border border-white/10`}>
                    {card.rarity.replace('-', ' ')}
                </div>
            </div>
            <div className="bg-brand-bg/70 backdrop-blur-sm rounded-lg p-3 text-sm italic text-brand-text/90 min-h-[6rem] border border-white/10">
              {card.description}
            </div>
            <div className="text-right text-xs text-brand-text/60 font-serif italic" style={{ textShadow: '0 1px 2px rgba(0,0,0,1)' }}>
              {card.set}
            </div>
        </footer>
      </div>
    </>
  );

  const rarityAnimationClass = card.rarity === Rarity.Rare
    ? 'animate-pulse-glow-rare'
    : card.rarity === Rarity.SuperRare
    ? 'animate-pulse-glow-super-rare'
    : '';

  if (isSuperRare) {
    return (
      <div
        ref={containerRef}
        className={`relative w-full h-full rounded-2xl p-[2px] bg-gradient-to-r from-rarity-super-rare via-rarity-rare to-rarity-super-rare bg-[length:200%_200%] animate-shimmer-border shadow-2xl shadow-black/50 ${rarityAnimationClass} animate-card-draw`}
      >
        <div className="relative w-full h-full rounded-[14px] overflow-hidden flex flex-col text-white">
          {cardLayers}
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full rounded-2xl border-2 ${rarityStyle.border} shadow-2xl shadow-black/50 flex flex-col overflow-hidden text-white ${rarityAnimationClass} animate-card-draw`}>
      {cardLayers}
    </div>
  );
};

const MythicCardLayout: React.FC<{ card: CardData; containerRef: React.RefObject<HTMLDivElement> }> = ({ card, containerRef }) => {
    const isVideo = card.imageUrl.endsWith('.mp4');

    useEffect(() => {
        const element = containerRef.current;
        if (!element) return;

        element.style.transition = 'transform 0.1s ease-out';

        const handleMouseMove = (e: MouseEvent) => {
            const { left, top, width, height } = element.getBoundingClientRect();
            const x = (e.clientX - left) / width;
            const y = (e.clientY - top) / height;
            const rotateX = (y - 0.5) * -16;
            const rotateY = (x - 0.5) * 16;
            element.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
        };

        const handleMouseLeave = () => {
            element.style.transform = 'perspective(1200px) rotateX(0) rotateY(0) scale(1)';
        };

        element.addEventListener('mousemove', handleMouseMove);
        element.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            if (element) {
                element.removeEventListener('mousemove', handleMouseMove);
                element.removeEventListener('mouseleave', handleMouseLeave);
                element.style.transform = '';
                element.style.transition = '';
            }
        };
    }, [containerRef]);

    return (
        <div 
          ref={containerRef}
          className="relative w-full h-full rounded-2xl border-2 border-rarity-mythic shadow-2xl shadow-black/50 flex flex-col overflow-hidden text-white animate-pulse-glow-mythic animate-card-draw">
            {isVideo ? <video src={card.imageUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0" /> : <img src={card.imageUrl} alt={card.name} className="absolute inset-0 w-full h-full object-cover z-0" />}
            <div className="absolute inset-0 z-[5] bg-gradient-to-r from-transparent via-white/50 to-transparent bg-[length:200%_100%] bg-no-repeat mix-blend-overlay animate-holographic-sheen opacity-30"></div>
            <Particles rarity={card.rarity} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-10"></div>
            
            <div className="relative z-20 flex flex-col h-full p-4 justify-end text-center">
                <div className="bg-gradient-to-t from-black/50 to-transparent p-4 -m-4">
                    <div className="font-serif text-lg tracking-[0.2em] uppercase text-rarity-mythic" style={{ textShadow: '0 0 8px #f59e0b'}}>
                        MYTHIC
                    </div>
                    <div className="w-2/3 h-[1px] bg-gradient-to-r from-transparent via-rarity-mythic to-transparent mx-auto my-3"></div>
                    <h2 className="font-serif text-4xl font-bold tracking-wide" style={{ textShadow: '0px 2px 10px rgba(0, 0, 0, 1)' }}>
                        {card.name}
                    </h2>
                    <p className="text-sm italic text-brand-text/90 mt-4 max-w-xs mx-auto min-h-[4rem]">
                        {card.description}
                    </p>
                    <div className="mt-4 text-xs text-brand-text/60 font-serif italic flex justify-between items-center">
                        <span>{card.type}</span>
                        <span>{card.set}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DivineCardLayout: React.FC<{ card: CardData; containerRef: React.RefObject<HTMLDivElement> }> = ({ card, containerRef }) => {
    const isVideo = card.imageUrl.endsWith('.mp4');

    useEffect(() => {
        const element = containerRef.current;
        if (!element) return;

        element.style.transition = 'transform 0.1s ease-out';

        const handleMouseMove = (e: MouseEvent) => {
            const { left, top, width, height } = element.getBoundingClientRect();
            const x = (e.clientX - left) / width;
            const y = (e.clientY - top) / height;
            const rotateX = (y - 0.5) * -16;
            const rotateY = (x - 0.5) * 16;
            element.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
        };

        const handleMouseLeave = () => {
            element.style.transform = 'perspective(1200px) rotateX(0) rotateY(0) scale(1)';
        };

        element.addEventListener('mousemove', handleMouseMove);
        element.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            if (element) {
                element.removeEventListener('mousemove', handleMouseMove);
                element.removeEventListener('mouseleave', handleMouseLeave);
                element.style.transform = '';
                element.style.transition = '';
            }
        };
    }, [containerRef]);

    return (
        <div 
            ref={containerRef}
            className="relative w-full h-full rounded-2xl p-[2px] bg-gradient-to-br from-rarity-super-rare via-rarity-mythic to-rarity-rare shadow-2xl shadow-black/50 animate-card-breath animate-card-draw">
            <div className="absolute inset-[-2px] rounded-[18px] animate-lightning-flash pointer-events-none"></div>
            <div className="relative w-full h-full rounded-[14px] flex flex-col overflow-hidden text-white">
                {isVideo ? <video src={card.imageUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0" /> : <img src={card.imageUrl} alt={card.name} className="absolute inset-0 w-full h-full object-cover z-0" />}
                <div className="absolute inset-0 z-[5] bg-gradient-to-r from-transparent via-white/50 to-transparent bg-[length:200%_100%] bg-no-repeat mix-blend-overlay animate-holographic-sheen opacity-30"></div>
                <Particles rarity={card.rarity} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-10"></div>
                
                <div className="relative z-20 flex flex-col h-full p-4 justify-between text-center">
                    <header className="flex-grow flex items-center justify-center">
                        <div className="font-serif text-3xl tracking-[0.3em] uppercase animate-divine-glow">
                            D I V I N E
                        </div>
                    </header>
                    <footer className="space-y-3">
                        <h2 className="font-serif text-3xl font-bold" style={{ textShadow: '0px 2px 10px rgba(0, 0, 0, 1)' }}>
                            {card.name}
                        </h2>
                        <div className="bg-black/30 backdrop-blur-sm rounded-lg p-3 text-sm italic text-brand-text/90 min-h-[4rem] border border-white/10">
                            {card.description}
                        </div>
                        <div className="text-right text-xs text-brand-text/60 font-serif italic" style={{ textShadow: '0 1px 2px rgba(0,0,0,1)' }}>
                           {card.type} - {card.set}
                        </div>
                    </footer>
                </div>
            </div>
        </div>
    );
};

const CardContent: React.FC<{ card: CardData }> = ({ card }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  switch (card.rarity) {
    case Rarity.Divine:
      return <DivineCardLayout card={card} containerRef={containerRef} />;
    case Rarity.Mythic:
      return <MythicCardLayout card={card} containerRef={containerRef} />;
    default:
      return <DefaultCardLayout card={card} containerRef={containerRef} />;
  }
};

const CardDisplay: React.FC<CardDisplayProps> = ({ card }) => {
  return (
    <div className="w-full h-full perspective-1000">
      {card ? <CardContent card={card} key={card.id} /> : <PlaceholderCard />}
    </div>
  );
};

export default CardDisplay;