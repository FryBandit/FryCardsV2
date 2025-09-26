
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { GameState, PlayerState, CardData, CardRank } from '../types';
import { evaluateHand, HandResult } from '../lib/poker';
import CardDisplay from './CardDisplay';
import CardInspector from './CardInspector';
import { ManaIcon } from '../../components/icons/MagicIcon';
import { HeartIcon } from '../../components/icons/HeartIcon';
import { CollectionIcon } from '../../components/icons/CollectionIcon';
import { SparklesIcon } from '../../components/icons/SparklesIcon';
import DiscardPileViewer from './DiscardPileViewer';
import LogViewer from './LogViewer';
import { ANTE } from '../constants';
import { ScrollTextIcon } from './icons/ScrollTextIcon';

// --- Theme Implementation ---
interface Theme {
  name: string;
  key: string;
}
const themes: Theme[] = [
  { name: 'Nightdrive', key: 'nightdrive' },
  { name: 'Daybreak', key: 'daybreak' },
  { name: 'Arcane', key: 'arcane' },
];

const SwatchBookIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2Z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7Z"/>
  </svg>
);

const HomeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const ThemeSwitcher: React.FC<{ currentTheme: string; themes: Theme[]; setTheme: (theme: string) => void; }> = ({ currentTheme, themes, setTheme }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-brand-surface text-brand-text hover:bg-brand-card transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary">
        <SwatchBookIcon className="w-5 h-5" />
      </button>
      {isOpen && (
        <div className="absolute right-0 w-48 mt-2 origin-top-right bg-brand-surface rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="py-1">
            {themes.map((theme) => (
              <button key={theme.key} onClick={() => { setTheme(theme.key); setIsOpen(false); }} className={`w-full text-left block px-4 py-2 text-sm ${currentTheme === theme.key ? 'font-bold text-brand-primary' : 'text-brand-text'} hover:bg-brand-card hover:text-brand-primary`}>{theme.name}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const PokerHandIndicator: React.FC<{ cards: CardData[] }> = ({ cards }) => {
    const [handResult, setHandResult] = useState<HandResult | null>(null);
    useEffect(() => {
        if (cards.length >= 2) {
            setHandResult(evaluateHand(cards));
        } else {
            setHandResult(null);
        }
    }, [cards]);

    if (!handResult || handResult.value[0] < 2) {
        return <div className="text-center bg-brand-surface/50 px-3 py-1 mt-1 rounded-full h-8 flex items-center justify-center"><p className="text-xs font-bold text-brand-text/50">High Card</p></div>;
    }

    return <div className="text-center bg-brand-secondary/10 border border-brand-secondary/30 px-3 py-1 mt-1 rounded-full h-8 flex items-center justify-center"><p className="text-xs font-bold text-brand-secondary animate-pulse">{handResult.name}</p></div>;
};


const PlayerStatusIcons: React.FC<{player: PlayerState}> = ({player}) => (
    <div className="absolute top-2 right-2 flex flex-wrap-reverse justify-end gap-2 w-28">
        {player.activeChronoEffects.length > 0 && 
            <div className="w-6 h-6 bg-brand-secondary/20 rounded-full flex items-center justify-center" title={`Chrono Effects: ${player.activeChronoEffects.length}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brand-secondary" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
        }
        {player.trapCard &&
             <div className="w-6 h-6 bg-brand-danger/20 rounded-full flex items-center justify-center" title={`Trap Set: ${player.trapCard.card.name}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brand-danger" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </div>
        }
        {player.hasBulwark &&
             <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center" title="Bulwark Active">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
        }
        {player.hasIntimidate &&
             <div className="w-6 h-6 bg-red-600/20 rounded-full flex items-center justify-center" title="Intimidate Active">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
        }
        {player.hasFlux &&
             <div className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center" title="Flux Active">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5" /><path d="M4 9a9 9 0 0114.49-2.51" /><path d="M20 15a9 9 0 01-14.49 2.51" /></svg>
            </div>
        }
        {player.hasEconomist &&
             <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center" title="Economist Active">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8v1m0 8v1m-6-5h12" /></svg>
            </div>
        }
    </div>
)

const PlayerZone: React.FC<{player: PlayerState, isActive: boolean, isOpponent: boolean, communityCards: CardData[], phase: GameState['phase'], onHoleCardClick?: (card: CardData) => void, showdownHand?: HandResult | null, revealHoleCards?: boolean, onViewDiscard: (player: PlayerState) => void}> = ({ player, isActive, isOpponent, communityCards, phase, onHoleCardClick, showdownHand, revealHoleCards, onViewDiscard }) => (
    <div className={`relative flex items-center justify-between gap-4 w-full p-2 rounded-lg transition-all duration-300 ${isActive ? 'bg-brand-primary/10 ring-2 ring-brand-primary animate-pulse-glow-rare' : ''}`}>
        <PlayerStatusIcons player={player} />
        <div className={`flex items-center gap-4 ${isOpponent ? 'flex-row-reverse' : 'flex-row'} flex-1`}>
            <div className={`relative p-3 rounded-lg transition-all duration-300 ${isActive ? 'bg-brand-primary/20' : 'bg-brand-surface/50'}`}>
                <h2 className={`font-bold text-lg ${isActive ? 'text-brand-primary' : 'text-brand-text'}`}>{player.name}</h2>
                {player.points <= 0 && phase !== 'SHOWDOWN' && phase !== 'GAME_OVER' && (
                  <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-brand-danger text-white text-xs font-bold rounded-full animate-pulse z-10">ALL-IN</div>
                )}
                <div className="flex items-center gap-4 text-sm mt-1">
                    <div className="flex items-center gap-1 text-brand-success font-bold" title="Points"><HeartIcon className="w-4 h-4"/><span>{player.points}</span></div>
                    <div className="flex items-center gap-1 text-brand-primary font-bold" title="Mana"><ManaIcon className="w-4 h-4"/><span>{player.mana}</span></div>
                    <div className="flex items-center gap-1 text-brand-accent font-bold" title="Current Bet"><span>Bet:</span><span>{player.bet}</span></div>
                </div>
                {!isOpponent && <PokerHandIndicator cards={[...player.holeCards, ...communityCards]} />}
            </div>
             <div className="flex items-center gap-2">
                <div className={`w-20 h-28 ${!isOpponent && onHoleCardClick ? 'cursor-pointer' : ''}`} onClick={() => !isOpponent && onHoleCardClick && player.holeCards[0] && onHoleCardClick(player.holeCards[0])}>
                    <CardDisplay card={player.holeCards[0]} displayMode='board' hidePokerValue={isOpponent && !revealHoleCards} isInWinningHand={showdownHand?.hand.some(c => c.id === player.holeCards[0]?.id)} />
                </div>
                <div className={`w-20 h-28 ${!isOpponent && onHoleCardClick ? 'cursor-pointer' : ''}`} onClick={() => !isOpponent && onHoleCardClick && player.holeCards[1] && onHoleCardClick(player.holeCards[1])}>
                    <CardDisplay card={player.holeCards[1]} displayMode='board' hidePokerValue={isOpponent && !revealHoleCards} isInWinningHand={showdownHand?.hand.some(c => c.id === player.holeCards[1]?.id)} />
                </div>
            </div>
        </div>
        <div className={`flex items-center gap-2 h-28 min-w-[200px] ${isOpponent ? 'justify-end' : 'justify-start'}`}>
            {player.artifacts.map((card, i) => <div key={i} className="w-20" onClick={() => !isOpponent && onHoleCardClick && onHoleCardClick(card)}><CardDisplay card={card} displayMode="board" /></div>)}
        </div>
        <div className={`flex items-center gap-4 ${isOpponent ? 'flex-row-reverse' : 'flex-row'} flex-1 justify-end`}>
            <div className="text-center p-2 rounded-lg"><CollectionIcon className="w-8 h-8 mx-auto text-brand-text/50" /><p className="font-bold">{player.deck.length}</p><p className="text-xs">Deck</p></div>
            <button onClick={() => onViewDiscard(player)} className="text-center group p-2 rounded-lg hover:bg-brand-card/50 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-colors">
                <SparklesIcon className="w-8 h-8 mx-auto text-brand-text/50 group-hover:text-brand-primary transition-colors" />
                <p className="font-bold group-hover:text-brand-primary transition-colors">{player.discard.length}</p>
                <p className="text-xs group-hover:text-brand-primary transition-colors">Discard</p>
            </button>
        </div>
    </div>
);

const ShowdownDisplay: React.FC<{gameState: GameState, onAction: (action: string) => void}> = ({gameState, onAction}) => {
    const { players, showdownResults, winner: gameWinner, communityCards, pot } = gameState;
    if (!showdownResults) return null;

    const { p1Hand, p2Hand, winnerIndex } = showdownResults;
    const roundWinner = winnerIndex !== -1 ? players[winnerIndex] : null;

    const ShowdownHand: React.FC<{player: PlayerState, hand: HandResult, isWinner: boolean}> = ({player, hand, isWinner}) => (
        <div className="text-center flex flex-col items-center gap-2">
            <h2 className="text-3xl font-bold">{player.name}</h2>
            <p className={`text-xl font-bold ${isWinner ? 'text-brand-accent' : 'text-brand-secondary'}`}>{hand.name}</p>
            <div className="flex items-center gap-4">
                <div className="flex flex-col gap-2 items-center">
                    <div className="flex gap-2">
                        {player.holeCards.map(c => <div key={c.id} className="w-20 h-28"><CardDisplay card={c} displayMode="board" isInWinningHand={hand.hand.some(hc => hc.id === c.id)} /></div>)}
                    </div>
                    <span className="text-xs text-brand-text/60">Hole Cards</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center animate-fade-in gap-4 p-8 text-white">
            <h1 className="text-6xl font-serif font-bold text-brand-primary animate-divine-glow">Showdown!</h1>
            
            <div className="flex gap-16 mt-4 w-full max-w-5xl justify-around items-start">
                <ShowdownHand player={players[0]} hand={p1Hand} isWinner={winnerIndex === 0} />
                <div className="flex flex-col gap-2 items-center pt-10">
                     <div className="flex justify-center gap-2">
                        {communityCards.map(c => <div key={c.id} className="w-24 h-36"><CardDisplay card={c} displayMode="board" isInWinningHand={p1Hand.hand.some(hc => hc.id === c.id) || p2Hand.hand.some(hc => hc.id === c.id)} /></div>)}
                    </div>
                    <span className="text-sm text-brand-text/60">Community Cards</span>
                </div>
                <ShowdownHand player={players[1]} hand={p2Hand} isWinner={winnerIndex === 1} />
            </div>
            
            <div className="mt-4 text-center">
                {roundWinner ? (
                    <h2 className="text-4xl font-serif text-brand-accent">{roundWinner.name} wins the pot of {pot}!</h2>
                ) : (
                    <h2 className="text-4xl font-serif text-brand-text/80">It's a tie! The pot is split.</h2>
                )}
                <button 
                  onClick={() => onAction(gameWinner ? 'NEW_GAME' : 'NEXT_ROUND')} 
                  className="mt-6 px-12 py-4 bg-brand-primary text-white font-bold rounded-lg hover:bg-brand-primary/80 transition-colors text-2xl shadow-lg"
                >
                    {gameWinner ? 'Play Again' : 'Next Round'}
                </button>
            </div>
        </div>
    );
};

const MulliganModal: React.FC<{hand: CardData[], holeCards: CardData[], onAction: (action: string) => void}> = ({ hand, holeCards, onAction }) => {
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center animate-fade-in gap-8 p-8">
            <h1 className="text-5xl font-serif font-bold text-brand-primary">Mulligan</h1>
            <p className="text-lg text-brand-text/80">Would you like to keep this opening draw?</p>
            <div className="flex justify-center items-center gap-4 bg-brand-surface/30 p-6 rounded-xl border border-brand-card/50">
                <div className="flex flex-col items-center">
                    <div className="flex gap-2">
                        {holeCards.map((card, index) => (
                            <div key={`hole-${index}`} className="w-32 h-44"><CardDisplay card={card} displayMode='board'/></div>
                        ))}
                    </div>
                    <p className="text-sm mt-2 text-brand-text/60 font-serif">Your Hole Cards</p>
                </div>
                <div className="w-px h-32 bg-brand-card/50 mx-4"></div>
                <div className="flex flex-col items-center">
                    <div className="flex items-end -space-x-12">
                        {hand.map((card, index) => (
                            <div key={`hand-${index}`} className="w-28 h-40" style={{zIndex: index}}>
                                <CardDisplay card={card} displayMode='hand' isPlayable={false} />
                            </div>
                        ))}
                    </div>
                     <p className="text-sm mt-2 text-brand-text/60 font-serif">Your Starting Hand</p>
                </div>
            </div>
            <div className="flex gap-8 mt-4">
                <button onClick={() => onAction('KEEP_HAND')} className="px-8 py-3 bg-brand-success text-white font-bold rounded-lg hover:bg-brand-success/80 transition-colors text-xl shadow-lg">Keep</button>
                <button onClick={() => onAction('MULLIGAN')} className="px-8 py-3 bg-brand-danger text-white font-bold rounded-lg hover:bg-brand-danger/80 transition-colors text-xl shadow-lg">Mulligan</button>
            </div>
        </div>
    );
}

const PhaseIndicator: React.FC<{ currentPhase: string }> = ({ currentPhase }) => {
    const PHASES = ['PRE_FLOP', 'FLOP', 'TURN', 'RIVER'];
    const currentIndex = PHASES.indexOf(currentPhase);

    if (currentIndex === -1) {
        return <div className="bg-brand-surface rounded-lg px-4 py-1"><h3 className="text-md font-serif font-bold tracking-wider text-brand-secondary">{currentPhase.replace('_', ' ')}</h3></div>
    }

    return (
        <div className="flex items-center gap-2 bg-brand-surface/50 p-1.5 rounded-lg">
            {PHASES.map((p, i) => (
                <React.Fragment key={p}>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold transition-colors duration-300 ${i <= currentIndex ? 'bg-brand-primary text-white shadow-md' : 'bg-brand-bg/50 text-brand-text/50'}`}>
                        {p.replace('_', ' ')}
                    </div>
                    {i < PHASES.length - 1 && <div className={`w-3 h-px transition-colors duration-300 ${i < currentIndex ? 'bg-brand-primary' : 'bg-brand-card/50'}`}></div>}
                </React.Fragment>
            ))}
        </div>
    );
};


interface GameBoardProps {
    gameState: GameState;
    onAction: (action: string, payload?: any) => void;
    theme: string;
    setTheme: (theme: string) => void;
    onGoHome: () => void;
}

const GameBoard: React.FC<GameBoardProps> = ({ gameState, onAction, theme, setTheme, onGoHome }) => {
    const { players, communityCards, pot, activePlayerIndex, phase, winner, log, activeLocation, lastBetSize, showdownResults } = gameState;
    const isActionPhase = ['PRE_FLOP', 'FLOP', 'TURN', 'RIVER'].includes(phase);
    const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
    const [viewingDiscard, setViewingDiscard] = useState<PlayerState | null>(null);
    const [isLogVisible, setIsLogVisible] = useState(false);
    const [asideWidth, setAsideWidth] = useState(400);
    
    const player = players[0];
    const opponent = players[1];
    const isMyTurn = activePlayerIndex === 0;

    const amountToCall = opponent.bet - player.bet;
    const maxTotalBet = player.points + player.bet;
    const minBet = ANTE;
    const minRaise = opponent.bet + lastBetSize;

    const [betAmount, setBetAmount] = useState<number>(minBet);

    const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
        mouseDownEvent.preventDefault();
        const startWidth = asideWidth;
        const startPosition = mouseDownEvent.clientX;

        const onMouseMove = (mouseMoveEvent: MouseEvent) => {
            const newWidth = startWidth - (mouseMoveEvent.clientX - startPosition);
            if (newWidth >= 350 && newWidth <= 800) {
                setAsideWidth(newWidth);
            }
        };
        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }, [asideWidth]);


    const selectedCardIndex = useMemo(() => {
        if (!selectedCard) return null;
        const index = players[0].hand.findIndex(c => c.id === selectedCard.id);
        return index === -1 ? null : index;
    }, [selectedCard, players[0].hand]);
    
    useEffect(() => {
        if (!isMyTurn || !isActionPhase) return;
        
        if (amountToCall > 0) {
            const defaultRaise = Math.min(minRaise, maxTotalBet);
            setBetAmount(defaultRaise > 0 ? defaultRaise : minRaise);
        } else {
            const defaultBet = Math.min(minBet, maxTotalBet);
            setBetAmount(defaultBet);
        }
    }, [isMyTurn, isActionPhase, amountToCall, minRaise, maxTotalBet, minBet, pot]);

    const revealOpponentCards = useMemo(() => {
        return !!(activeLocation?.abilities?.some(a => a.name === 'Clarity') || (phase === 'SHOWDOWN' && showdownResults));
    }, [activeLocation, phase, showdownResults]);
    
    const canPlaySelectedCard = selectedCardIndex !== null && isMyTurn && player.mana >= (selectedCard?.manaCost ?? 99) && amountToCall <= 0 && !player.cardPlayLocked;
    const selectedCardOverload = selectedCard?.abilities?.find(a => a.name === 'Overload');
    const canOverload = canPlaySelectedCard && selectedCardOverload && player.mana >= (selectedCardOverload.overloadCost ?? 99);
    
    const canDiscard = selectedCardIndex !== null && !player.hasDiscarded && amountToCall <= 0;
    const canCycle = selectedCardIndex !== null && player.mana >= 2 && player.deck.length > 0;
    
    const callAmount = Math.min(amountToCall, player.points);
    const callText = amountToCall >= player.points ? `All-in (${callAmount})` : `Call (${callAmount})`;
    const requiredManaToCall = opponent.hasIntimidate && !player.hasUsedEconomistThisRound ? 1 : 0;
    const canAffordManaForCall = player.mana >= requiredManaToCall;

    const getDisabledTitle = (action: string): string => {
        if (action === 'play') {
            if (player.cardPlayLocked) return "Card play locked by opponent's effect";
            if (amountToCall > 0) return "Must call, raise, or fold before playing a card";
            if (selectedCardIndex === null) return "Select a card from your hand to play";
            if (player.mana < (selectedCard?.manaCost ?? 99)) return "Not enough mana";
            return "";
        }
        if (action === 'overload') {
             if (player.mana < (selectedCardOverload?.overloadCost ?? 99)) return "Not enough mana for Overload";
             return getDisabledTitle('play');
        }
        if (action === 'discard') {
            if (selectedCardIndex === null) return "Select a card from your hand to discard";
            if (player.hasDiscarded) return "You can only discard once per turn";
            if (amountToCall > 0) return "Cannot discard when facing a bet";
            return "";
        }
        if (action === 'cycle') {
            if (selectedCardIndex === null) return "Select a card from your hand to cycle";
            if (player.mana < 2) return "Not enough mana to cycle (costs 2)";
            if (player.deck.length === 0) return "No cards left in deck to draw";
            return "";
        }
         if (action === 'call') {
            if (!canAffordManaForCall) return `Not enough mana to call (costs ${requiredManaToCall})`;
            return "";
        }
        if(action === 'raise' || action === 'bet') {
            if (maxTotalBet <= (amountToCall > 0 ? minRaise : minBet)) return "Not enough points to bet or raise";
            return "";
        }
        return "Action is currently unavailable";
    }

    return (
        <div className="w-full h-screen flex bg-brand-bg text-brand-text font-sans overflow-hidden">
            {phase === 'SHOWDOWN' && showdownResults && <ShowdownDisplay gameState={gameState} onAction={onAction} />}
            {phase === 'MULLIGAN' && isMyTurn && !players[0].mulliganed && <MulliganModal hand={players[0].hand} holeCards={players[0].holeCards} onAction={onAction} />}
            {viewingDiscard && <DiscardPileViewer player={viewingDiscard} onClose={() => setViewingDiscard(null)} />}
            {isLogVisible && <LogViewer log={log} onClose={() => setIsLogVisible(false)} />}
            
            <main className="flex-grow flex flex-col p-4 gap-2 overflow-auto">
                <header className="w-full flex justify-between items-center flex-shrink-0">
                    <h1 className="text-4xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-secondary">River of Ruin</h1>
                </header>
                <PlayerZone player={players[1]} isActive={activePlayerIndex === 1} isOpponent={true} communityCards={communityCards} phase={phase} revealHoleCards={revealOpponentCards} showdownHand={phase === 'SHOWDOWN' ? showdownResults?.p2Hand : null} onViewDiscard={setViewingDiscard} />
                <div className="flex-grow flex items-center justify-center gap-4 relative my-2">
                    <div className="w-28 h-40 flex-shrink-0" onClick={() => activeLocation && setSelectedCard(activeLocation)}><CardDisplay card={activeLocation} displayMode='board' /></div>
                    {Array(5).fill(null).map((_, i) => (<div key={i} className="w-28 h-40 flex-shrink-0"><CardDisplay card={communityCards[i] || null} displayMode="board" isInWinningHand={showdownResults?.p1Hand?.hand.some(c => c.id === communityCards[i]?.id) || showdownResults?.p2Hand?.hand.some(c => c.id === communityCards[i]?.id)} /></div>))}
                    <div className="absolute top-0 right-0 flex flex-col items-end gap-2">
                        <div className="bg-brand-surface rounded-lg px-6 py-2 text-right"><h3 className="text-sm uppercase tracking-wider text-brand-text/70">Pot</h3><div className="text-2xl font-bold text-brand-accent">{pot}</div></div>
                        <PhaseIndicator currentPhase={phase} />
                    </div>
                </div>
                <PlayerZone player={players[0]} isActive={activePlayerIndex === 0} isOpponent={false} communityCards={communityCards} phase={phase} onHoleCardClick={(card) => setSelectedCard(prev => prev?.id === card.id ? null : card)} showdownHand={phase === 'SHOWDOWN' ? showdownResults?.p1Hand : null} onViewDiscard={setViewingDiscard} />
                <div className="relative h-48 flex justify-center items-end -mb-8 mt-4">
                    {player.cardPlayLocked && (
                        <div className="absolute -top-12 z-50 flex flex-col items-center text-center animate-pulse" title="You cannot play cards this turn due to an opponent's effect.">
                            <div className="w-16 h-16 bg-brand-danger/20 rounded-full flex items-center justify-center ring-4 ring-brand-danger mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-brand-danger" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            </div>
                            <p className="font-bold text-brand-danger bg-brand-surface px-3 py-1 rounded-md shadow-lg">Card Play Locked</p>
                        </div>
                    )}
                    {players[0].hand.map((card, index) => {
                        const isSelected = selectedCard?.id === card.id;
                        const isPlayable = isMyTurn && players[0].mana >= (card.manaCost ?? 0) && amountToCall <= 0 && !player.cardPlayLocked;
                        const totalCards = players[0].hand.length;
                        const cardAngle = (index - (totalCards - 1) / 2) * (totalCards > 8 ? 5 : 7);
                        const overlap = totalCards > 7 ? 75 : 65;
                        const marginLeft = index > 0 ? `-${overlap}px` : '0px';
                        const yOffset = (Math.pow(Math.abs(index - (totalCards - 1) / 2), 1.9) * (totalCards > 8 ? 1.5 : 2.5));

                        return (
                            <div 
                                key={card.id + '-' + index} 
                                className="w-32 h-44 transition-transform duration-300 ease-in-out origin-bottom flex-shrink-0" 
                                style={{ 
                                    transform: `translateY(${yOffset + (isSelected ? -24 : 0)}px) rotate(${cardAngle}deg)`, 
                                    zIndex: isSelected ? 100 : index, 
                                    marginLeft: marginLeft 
                                }} 
                                onClick={() => setSelectedCard(prev => prev?.id === card.id ? null : card)}
                            >
                                <CardDisplay card={card} displayMode='hand' isSelected={isSelected} isPlayable={isPlayable} isPlayerTurn={isMyTurn} />
                            </div>
                        )
                    })}
                </div>
            </main>
            <div 
                onMouseDown={startResizing}
                className="w-1.5 h-full cursor-col-resize bg-brand-card/20 hover:bg-brand-primary transition-colors flex-shrink-0"
                title="Drag to resize panel"
            />
            <aside className="flex-shrink-0 bg-brand-surface/50 p-4 flex flex-col gap-4 h-full" style={{ width: `${asideWidth}px` }}>
                <header className="flex justify-end gap-2">
                    <button onClick={onGoHome} title="Back to Title Screen" className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-brand-surface text-brand-text hover:bg-brand-card transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary">
                      <HomeIcon className="w-5 h-5" />
                    </button>
                    <button onClick={() => setIsLogVisible(true)} title="View Game Log" className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-brand-surface text-brand-text hover:bg-brand-card transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary">
                        <ScrollTextIcon className="w-5 h-5" />
                    </button>
                    <ThemeSwitcher currentTheme={theme} themes={themes} setTheme={setTheme} />
                </header>
                <div className="flex-grow flex flex-col gap-4 min-h-0 overflow-y-auto pr-2">
                    <div className="flex-shrink-0">
                        <CardInspector card={selectedCard} player={player} isMyTurn={isMyTurn} onAction={onAction} />
                    </div>
                    <div className="pt-4 border-t border-brand-card">
                        {winner ? (
                            <div className="text-center"><h3 className="font-serif text-2xl text-brand-accent">{winner.name} wins!</h3><button onClick={() => onAction('NEW_GAME')} className="mt-4 w-full bg-brand-primary text-white font-bold py-2 px-4 rounded hover:bg-brand-primary/80 transition-colors">Play Again</button></div>
                        ) : phase === 'END_ROUND' ? (
                            <button onClick={() => onAction('NEXT_ROUND')} className="w-full bg-brand-primary text-white font-bold py-2 px-4 rounded hover:bg-brand-primary/80 transition-colors">Next Round</button>
                        ) : isActionPhase && isMyTurn ? (
                            <div className="space-y-4">
                                <div className="p-3 rounded-lg bg-brand-surface/50 border border-brand-card">
                                    <h4 className="text-center font-bold text-brand-primary mb-2">Betting Actions</h4>
                                    {amountToCall > 0 ? (
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-2 gap-2">
                                                <button onClick={() => onAction('FOLD')} className="w-full bg-brand-danger/80 text-white font-bold py-3 px-4 rounded hover:bg-brand-danger transition-colors">Fold</button>
                                                <button onClick={() => onAction('CALL')} disabled={!canAffordManaForCall} title={getDisabledTitle('call')} className="w-full bg-brand-success/80 text-white font-bold py-3 px-4 rounded hover:bg-brand-success transition-colors disabled:bg-brand-card disabled:text-brand-text/50 disabled:cursor-not-allowed">
                                                    {callText}
                                                </button>
                                            </div>
                                            <div>
                                                <div className="flex justify-between items-center text-sm mb-1">
                                                <label htmlFor="raise-amount" className="font-bold">Raise to</label>
                                                <span className="font-mono bg-brand-bg/50 px-2 py-0.5 rounded">{betAmount}</span>
                                                </div>
                                                <input id="raise-amount" type="range" min={minRaise} max={maxTotalBet} value={betAmount} onChange={(e) => setBetAmount(parseInt(e.target.value))} className="w-full h-2 bg-brand-card rounded-lg appearance-none cursor-pointer disabled:opacity-50" disabled={minRaise > maxTotalBet}/>
                                                <div className="flex justify-between text-xs text-brand-text/60 mt-1">
                                                    <span>{minRaise}</span>
                                                    <span>{maxTotalBet}</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-1 text-xs mt-1">
                                                    <button onClick={() => setBetAmount(Math.min(maxTotalBet, Math.max(minRaise, opponent.bet + Math.floor(pot * 0.5))))} disabled={minRaise > maxTotalBet} className="bg-brand-bg/50 rounded py-1 hover:bg-brand-card disabled:opacity-50">1/2 Pot</button>
                                                    <button onClick={() => setBetAmount(Math.min(maxTotalBet, Math.max(minRaise, opponent.bet + pot)))} disabled={minRaise > maxTotalBet} className="bg-brand-bg/50 rounded py-1 hover:bg-brand-card disabled:opacity-50">Pot</button>
                                                    <button onClick={() => setBetAmount(maxTotalBet)} disabled={minRaise > maxTotalBet} className="bg-brand-bg/50 rounded py-1 hover:bg-brand-card disabled:opacity-50">All In</button>
                                                </div>
                                                <button onClick={() => onAction('RAISE', { amount: betAmount })} disabled={betAmount < minRaise || betAmount > maxTotalBet} title={getDisabledTitle('raise')} className="w-full mt-2 bg-brand-primary text-white font-bold py-2 px-4 rounded disabled:bg-brand-card disabled:cursor-not-allowed">Raise</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3">
                                            <button onClick={() => onAction('CHECK')} className="w-full bg-brand-surface text-brand-text font-bold py-3 px-4 rounded hover:bg-brand-card transition-colors">Check</button>
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center text-sm">
                                                <label htmlFor="bet-amount" className="font-bold">Bet</label>
                                                <span className="font-mono bg-brand-bg/50 px-2 py-0.5 rounded">{betAmount}</span>
                                                </div>
                                                <input id="bet-amount" type="range" min={minBet} max={maxTotalBet} value={betAmount} onChange={(e) => setBetAmount(parseInt(e.target.value))} className="w-full h-2 bg-brand-card rounded-lg appearance-none cursor-pointer disabled:opacity-50" disabled={minBet > maxTotalBet} />
                                                <div className="flex justify-between text-xs text-brand-text/60 mt-1">
                                                    <span>{minBet}</span>
                                                    <span>{maxTotalBet}</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-1 text-xs mt-1">
                                                    <button onClick={() => setBetAmount(Math.min(maxTotalBet, Math.max(minBet, Math.floor(pot * 0.5))))} disabled={minBet > maxTotalBet} className="bg-brand-bg/50 rounded py-1 hover:bg-brand-card disabled:opacity-50">1/2 Pot</button>
                                                    <button onClick={() => setBetAmount(Math.min(maxTotalBet, Math.max(minBet, pot)))} disabled={minBet > maxTotalBet} className="bg-brand-bg/50 rounded py-1 hover:bg-brand-card disabled:opacity-50">Pot</button>
                                                    <button onClick={() => setBetAmount(maxTotalBet)} disabled={minBet > maxTotalBet} className="bg-brand-bg/50 rounded py-1 hover:bg-brand-card disabled:opacity-50">All In</button>
                                                </div>
                                                <button onClick={() => onAction('BET', { amount: betAmount })} disabled={betAmount < minBet || betAmount > maxTotalBet} title={getDisabledTitle('bet')} className="w-full bg-brand-primary text-white font-bold py-2 px-4 rounded disabled:bg-brand-card disabled:cursor-not-allowed">Bet</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 rounded-lg bg-brand-surface/50 border border-brand-card">
                                    <h4 className="text-center font-bold text-brand-secondary mb-2">Card Actions</h4>
                                    {selectedCardOverload ? (
                                        <div className="grid grid-cols-2 gap-2">
                                            <button onClick={() => onAction('PLAY_CARD', { cardIndex: selectedCardIndex, isOverload: false })} disabled={!canPlaySelectedCard} title={getDisabledTitle('play')} className="w-full bg-brand-secondary/80 text-white font-bold py-2 px-4 rounded disabled:bg-brand-card disabled:text-brand-text/50 disabled:cursor-not-allowed">Play ({selectedCard?.manaCost} Mana)</button>
                                            <button onClick={() => onAction('PLAY_CARD', { cardIndex: selectedCardIndex, isOverload: true })} disabled={!canOverload} title={getDisabledTitle('overload')} className="w-full bg-brand-accent text-white font-bold py-2 px-4 rounded disabled:bg-brand-card disabled:text-brand-text/50 disabled:cursor-not-allowed animate-pulse-glow-mythic">Overload ({selectedCardOverload.overloadCost} Mana)</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => onAction('PLAY_CARD', { cardIndex: selectedCardIndex, isOverload: false })} disabled={!canPlaySelectedCard} title={getDisabledTitle('play')} className="w-full bg-brand-secondary text-white font-bold py-2 px-4 rounded disabled:bg-brand-card disabled:text-brand-text/50 disabled:cursor-not-allowed">Play Selected Card</button>
                                    )}
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        <button onClick={() => onAction('DISCARD', { cardIndex: selectedCardIndex })} disabled={!canDiscard} title={getDisabledTitle('discard')} className="w-full bg-brand-accent/70 text-white font-bold py-2 px-4 rounded disabled:bg-brand-card disabled:text-brand-text/50 disabled:cursor-not-allowed">Discard (+1 Mana)</button>
                                        <button onClick={() => onAction('MANA_SINK_CYCLE', { cardIndex: selectedCardIndex })} disabled={!canCycle} title={getDisabledTitle('cycle')} className="w-full bg-brand-primary/80 text-white font-bold py-2 px-4 rounded disabled:bg-brand-card disabled:text-brand-text/50 disabled:cursor-not-allowed">Cycle (-2 Mana)</button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-center text-brand-text/70 italic p-4 text-xl font-serif animate-pulse">
                                {phase === 'MULLIGAN' && !isMyTurn ? "Opponent is Deciding..." : (phase === 'MULLIGAN' && isMyTurn) ? "Choose to keep or mulligan" : isMyTurn ? 'Your Turn' : "Opponent's Turn..."}
                            </div>
                        )}
                    </div>
                </div>
            </aside>
        </div>
    );
};

export default GameBoard;
