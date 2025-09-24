
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GameState, PlayerState, CardData } from '../types';
import { evaluateHand, HandResult } from '../lib/poker';
import CardDisplay from './CardDisplay';
import CardInspector from './CardInspector';
import { ManaIcon } from './icons/MagicIcon';
import { HeartIcon } from './icons/HeartIcon';
import { CollectionIcon } from './icons/CollectionIcon';
import { SparklesIcon } from './icons/SparklesIcon';

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
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2Z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7Z"/>
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
    <div className="absolute top-0 right-0 flex flex-col gap-1 p-1">
        {player.activeChronoEffects.length > 0 && 
            <div className="w-6 h-6 bg-brand-secondary/20 rounded-full flex items-center justify-center" title={`Chrono Effects: ${player.activeChronoEffects.length}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brand-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
        }
        {player.trapCard &&
             <div className="w-6 h-6 bg-brand-danger/20 rounded-full flex items-center justify-center" title={`Trap Set: ${player.trapCard.card.name}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brand-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </div>
        }
    </div>
)

const PlayerZone: React.FC<{player: PlayerState, isActive: boolean, isOpponent: boolean, communityCards: CardData[], onHoleCardClick?: (card: CardData) => void, showdownHand?: HandResult | null, revealHoleCards?: boolean}> = ({ player, isActive, isOpponent, communityCards, onHoleCardClick, showdownHand, revealHoleCards }) => (
    <div className={`relative flex items-center justify-between gap-4 w-full p-2 rounded-lg transition-all duration-300 ${isActive ? 'bg-brand-primary/10' : ''}`}>
        <PlayerStatusIcons player={player} />
        <div className={`flex items-center gap-4 ${isOpponent ? 'flex-row-reverse' : 'flex-row'} flex-1`}>
            <div className={`p-3 rounded-lg transition-all duration-300 ${isActive ? 'bg-brand-primary/20 shadow-glow-primary' : 'bg-brand-surface/50'}`}>
                <h2 className={`font-bold text-lg ${isActive ? 'text-brand-primary' : 'text-brand-text'}`}>{player.name}</h2>
                <div className="flex items-center gap-4 text-sm mt-1">
                    <div className="flex items-center gap-1 text-brand-success font-bold" title="Points"><HeartIcon className="w-4 h-4"/><span>{player.points}</span></div>
                    <div className="flex items-center gap-1 text-brand-primary font-bold" title="Mana"><ManaIcon className="w-4 h-4"/><span>{player.mana}</span></div>
                    <div className="flex items-center gap-1 text-brand-accent font-bold" title="Current Bet"><span>Bet:</span><span>{player.bet}</span></div>
                </div>
                {!isOpponent && <PokerHandIndicator cards={[...player.holeCards, ...communityCards]} />}
            </div>
             <div className="flex items-center gap-2">
                <div className={`w-20 h-28 ${!isOpponent && onHoleCardClick ? 'cursor-pointer' : ''}`} onClick={() => !isOpponent && onHoleCardClick && player.holeCards[0] && onHoleCardClick(player.holeCards[0])}>
                    <CardDisplay card={player.holeCards[0]} displayMode={isOpponent && !revealHoleCards ? 'facedown' : 'board'} isInWinningHand={showdownHand?.hand.some(c => c.id === player.holeCards[0]?.id)} />
                </div>
                <div className={`w-20 h-28 ${!isOpponent && onHoleCardClick ? 'cursor-pointer' : ''}`} onClick={() => !isOpponent && onHoleCardClick && player.holeCards[1] && onHoleCardClick(player.holeCards[1])}>
                    <CardDisplay card={player.holeCards[1]} displayMode={isOpponent && !revealHoleCards ? 'facedown' : 'board'} isInWinningHand={showdownHand?.hand.some(c => c.id === player.holeCards[1]?.id)} />
                </div>
            </div>
        </div>
        <div className={`flex items-center gap-2 h-28 min-w-[200px] ${isOpponent ? 'justify-end' : 'justify-start'}`}>
            {player.artifacts.map((card, i) => <div key={i} className="w-20"><CardDisplay card={card} displayMode="board" /></div>)}
        </div>
        <div className={`flex items-center gap-4 ${isOpponent ? 'flex-row-reverse' : 'flex-row'} flex-1 justify-end`}>
            <div className="text-center"><CollectionIcon className="w-8 h-8 mx-auto text-brand-text/50" /><p className="font-bold">{player.deck.length}</p><p className="text-xs">Deck</p></div>
            <div className="text-center"><SparklesIcon className="w-8 h-8 mx-auto text-brand-text/50" /><p className="font-bold">{player.discard.length}</p><p className="text-xs">Discard</p></div>
        </div>
    </div>
);

const ShowdownDisplay: React.FC<{gameState: GameState, onAction: (action: string) => void}> = ({gameState, onAction}) => {
    // FIX: Implement the ShowdownDisplay component to return JSX and fix the return type error.
    const { players, showdownResults, winner: gameWinner } = gameState;
    if (!showdownResults) {
        return null;
    }

    const { p1Hand, p2Hand, winnerIndex } = showdownResults;
    const roundWinner = winnerIndex !== -1 ? players[winnerIndex] : null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center animate-fade-in gap-4 p-8 text-white">
            <h1 className="text-6xl font-serif font-bold text-brand-primary">Showdown!</h1>
            
            <div className="flex gap-16 mt-8 w-full max-w-4xl justify-around">
                <div className="text-center flex flex-col items-center gap-4">
                    <h2 className="text-3xl font-bold">{players[0].name}</h2>
                    <p className="text-xl text-brand-secondary">{p1Hand.name}</p>
                    <div className="flex justify-center gap-2">
                        {p1Hand.hand.slice(0, 5).map(c => <div key={c.id} className="w-24 h-36"><CardDisplay card={c} displayMode="board" isInWinningHand={winnerIndex === 0} /></div>)}
                    </div>
                </div>
                <div className="text-center flex flex-col items-center gap-4">
                    <h2 className="text-3xl font-bold">{players[1].name}</h2>
                    <p className="text-xl text-brand-secondary">{p2Hand.name}</p>
                     <div className="flex justify-center gap-2">
                        {p2Hand.hand.slice(0, 5).map(c => <div key={c.id} className="w-24 h-36"><CardDisplay card={c} displayMode="board" isInWinningHand={winnerIndex === 1} /></div>)}
                    </div>
                </div>
            </div>
            
            <div className="mt-8 text-center">
                {roundWinner ? (
                    <h2 className="text-4xl font-serif text-brand-accent">{roundWinner.name} wins the pot!</h2>
                ) : (
                    <h2 className="text-4xl font-serif text-brand-text/80">It's a tie! The pot is split.</h2>
                )}
                <button 
                  onClick={() => onAction(gameWinner ? 'NEW_GAME' : 'NEXT_ROUND')} 
                  className="mt-8 px-12 py-4 bg-brand-primary text-white font-bold rounded-lg hover:bg-brand-primary/80 transition-colors text-2xl shadow-lg"
                >
                    {gameWinner ? 'Play Again' : 'Next Round'}
                </button>
            </div>
        </div>
    );
};

const MulliganModal: React.FC<{hand: CardData[], onAction: (action: string) => void}> = ({ hand, onAction }) => {
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center animate-fade-in gap-8 p-8">
            <h1 className="text-5xl font-serif font-bold text-brand-primary">Mulligan</h1>
            <p className="text-lg text-brand-text/80">Would you like to keep this hand or draw a new one?</p>
            <div className="flex justify-center items-end gap-4">
                {hand.map((card, index) => (
                    <div key={card.id + '-' + index} className="w-32 h-44">
                        <CardDisplay card={card} displayMode='hand' />
                    </div>
                ))}
            </div>
            <div className="flex gap-8 mt-8">
                <button onClick={() => onAction('KEEP_HAND')} className="px-8 py-3 bg-brand-success text-white font-bold rounded-lg hover:bg-brand-success/80 transition-colors text-xl shadow-lg">Keep Hand</button>
                <button onClick={() => onAction('MULLIGAN')} className="px-8 py-3 bg-brand-danger text-white font-bold rounded-lg hover:bg-brand-danger/80 transition-colors text-xl shadow-lg">Mulligan</button>
            </div>
        </div>
    );
}

interface GameBoardProps {
    gameState: GameState;
    onAction: (action: string, payload?: any) => void;
    theme: string;
    setTheme: (theme: string) => void;
}

const GameBoard: React.FC<GameBoardProps> = ({ gameState, onAction, theme, setTheme }) => {
    const { players, communityCards, pot, activePlayerIndex, phase, winner, log, activeLocation, lastBetSize, showdownResults } = gameState;
    const isActionPhase = ['PRE_FLOP', 'FLOP', 'TURN', 'RIVER'].includes(phase);
    const logContainerRef = useRef<HTMLDivElement>(null);
    const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
    const [betAmount, setBetAmount] = useState<number>(1);

    const activePlayer = players[activePlayerIndex];
    const opponent = players[activePlayerIndex === 0 ? 1 : 0];
    const isMyTurn = activePlayerIndex === 0;

    // ... (existing useMemo hooks are fine) ...

    const selectedCardIndex = useMemo(() => {
        if (!selectedCard) return null;
        const index = players[0].hand.findIndex(c => c.id === selectedCard.id);
        return index === -1 ? null : index;
    }, [selectedCard, players[0].hand]);
    
    // ... (existing useEffects are fine) ...

    const revealOpponentCards = useMemo(() => {
        return !!(activeLocation?.abilities?.some(a => a.name === 'Clarity') || (phase === 'SHOWDOWN' && showdownResults));
    }, [activeLocation, phase, showdownResults]);


    return (
        <div className="w-full h-screen flex bg-brand-bg text-brand-text font-sans">
            {phase === 'SHOWDOWN' && showdownResults && <ShowdownDisplay gameState={gameState} onAction={onAction} />}
            {phase === 'MULLIGAN' && isMyTurn && <MulliganModal hand={players[0].hand} onAction={onAction} />}
            <main className="flex-grow flex flex-col p-4 gap-2">
                <header className="w-full flex justify-between items-center flex-shrink-0">
                    <h1 className="text-4xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-secondary">River of Ruin</h1>
                </header>
                <PlayerZone player={players[1]} isActive={activePlayerIndex === 1} isOpponent={true} communityCards={communityCards} revealHoleCards={revealOpponentCards} />
                <div className="flex-grow flex items-center justify-center gap-4 relative my-2">
                    <div className="w-28 h-40 flex-shrink-0">{activeLocation ? <CardDisplay card={activeLocation} displayMode='board' /> : <div className="w-full h-full bg-brand-surface/30 rounded-lg border-2 border-dashed border-brand-card/50 flex items-center justify-center text-xs text-brand-text/50 p-2 text-center">Location</div>}</div>
                    {Array(5).fill(null).map((_, i) => (<div key={i} className="w-28 h-40 flex-shrink-0"><CardDisplay card={communityCards[i] || null} displayMode="board"/></div>))}
                    <div className="absolute top-0 right-0 flex flex-col items-end gap-2">
                        <div className="bg-brand-surface rounded-lg px-6 py-2 text-right"><h3 className="text-sm uppercase tracking-wider text-brand-text/70">Pot</h3><div className="text-2xl font-bold text-brand-accent">{pot}</div></div>
                        <div className="bg-brand-surface rounded-lg px-4 py-1"><h3 className="text-md font-serif font-bold tracking-wider text-brand-secondary">{phase.replace('_', ' ')}</h3></div>
                    </div>
                </div>
                <PlayerZone player={players[0]} isActive={activePlayerIndex === 0} isOpponent={false} communityCards={communityCards} onHoleCardClick={(card) => setSelectedCard(prev => prev?.id === card.id ? null : card)} />
                <div className="h-48 flex justify-center items-end -mb-8 mt-4">
                    {players[0].hand.map((card, index) => {
                        const isSelected = selectedCard?.id === card.id;
                        const isPlayable = isMyTurn && players[0].mana >= (card.manaCost ?? 0) && (opponent.bet - activePlayer.bet) <= 0;
                        const cardAngle = (index - (players[0].hand.length - 1) / 2) * 6;
                        const marginLeft = players[0].hand.length > 8 ? '-4rem' : '-3rem';
                        return (
                            <div key={card.id + '-' + index} className="w-32 h-44 transition-transform duration-300 ease-in-out origin-bottom" style={{ transform: `rotate(${cardAngle}deg) translateY(${isSelected ? '-1.5rem' : '0'}) scale(${isSelected ? '1.1' : '1'})`, zIndex: isSelected ? 10 : index, marginLeft: index > 0 ? marginLeft : 0 }} onClick={() => setSelectedCard(prev => prev?.id === card.id ? null : card)}>
                                <CardDisplay card={card} displayMode='hand' isSelected={isSelected} isPlayable={isPlayable} />
                            </div>
                        )
                    })}
                </div>
            </main>
            <aside className="w-[400px] flex-shrink-0 bg-brand-surface/50 p-4 flex flex-col gap-4 h-full">
                <header className="flex justify-end"><ThemeSwitcher currentTheme={theme} themes={themes} setTheme={setTheme} /></header>
                <div className="flex-shrink-0 h-[450px]">
                    <CardInspector card={selectedCard} gameState={gameState} onAction={onAction} />
                </div>
                <div className="flex-grow flex flex-col min-h-0">
                    <h3 className="font-serif text-xl border-b border-brand-card pb-2 mb-2 flex-shrink-0">Game Log</h3>
                    <div ref={logContainerRef} className="flex-grow text-sm space-y-2 overflow-y-auto pr-2">{log.map((entry, i) => <p key={i} className="whitespace-pre-wrap">{entry}</p>)}</div>
                </div>
                <div className="pt-4 border-t border-brand-card flex-shrink-0">
                    {winner ? (
                        <div className="text-center"><h3 className="font-serif text-2xl text-brand-accent">{winner.name} wins!</h3><button onClick={() => onAction('NEW_GAME')} className="mt-4 w-full bg-brand-primary text-white font-bold py-2 px-4 rounded hover:bg-brand-primary/80 transition-colors">Play Again</button></div>
                    ) : phase === 'END_ROUND' ? (
                        <button onClick={() => onAction('NEXT_ROUND')} className="w-full bg-brand-primary text-white font-bold py-2 px-4 rounded hover:bg-brand-primary/80 transition-colors">Next Round</button>
                    ) : isActionPhase && isMyTurn ? (
                         <div className="space-y-3">
                            <button onClick={() => onAction('PLAY_CARD', { cardIndex: selectedCardIndex })} disabled={selectedCardIndex === null || activePlayer.mana < (selectedCard?.manaCost ?? 0) || (opponent.bet - activePlayer.bet) > 0} className="w-full bg-brand-secondary text-white font-bold py-2 px-4 rounded disabled:bg-brand-card disabled:cursor-not-allowed">Play Selected Card</button>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => onAction('DISCARD', { cardIndex: selectedCardIndex })} disabled={selectedCardIndex === null || activePlayer.hasDiscarded || (opponent.bet - activePlayer.bet) > 0} className="w-full bg-brand-accent/70 text-white font-bold py-2 px-4 rounded disabled:bg-brand-card disabled:cursor-not-allowed">Discard</button>
                                <button onClick={() => onAction('MANA_SINK_CYCLE', { cardIndex: selectedCardIndex })} disabled={selectedCardIndex === null || activePlayer.mana < 5 || activePlayer.deck.length === 0} className="w-full bg-brand-primary/80 text-white font-bold py-2 px-4 rounded disabled:bg-brand-card disabled:cursor-not-allowed">Cycle (5 Mana)</button>
                            </div>
                            {/* Betting actions here */}
                        </div>
                    ) : (
                        <div className="text-center text-brand-text/70 italic p-4">
                            {phase === 'MULLIGAN' ? 'Deciding...' : isMyTurn ? 'Your Turn' : "CPU's Turn..."}
                        </div>
                    )}
                </div>
            </aside>
        </div>
    );
};

export default GameBoard;
