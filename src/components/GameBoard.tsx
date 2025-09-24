import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GameState, PlayerState, CardData } from '../types';
import { evaluateHand, HandResult } from '../lib/poker';
import CardDisplay from './CardDisplay';
import CardInspector from './CardInspector';
import { ManaIcon } from '../../components/icons/MagicIcon';
import { HeartIcon } from '../../components/icons/HeartIcon';

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
        if (cards.length >= 2) { // Show potential from hole cards
            setHandResult(evaluateHand(cards));
        } else {
            setHandResult(null);
        }
    }, [cards]);

    if (!handResult || handResult.value[0] < 2) {
        return <div className="text-center bg-brand-surface/50 px-3 py-1 mt-1 rounded-md h-8 flex items-center justify-center"><p className="text-xs font-bold text-brand-text/50">High Card</p></div>;
    }

    return <div className="text-center bg-brand-secondary/10 border border-brand-secondary/30 px-3 py-1 mt-1 rounded-md h-8 flex items-center justify-center"><p className="text-xs font-bold text-brand-secondary animate-pulse">{handResult.name}</p></div>;
};

const DeckPile: React.FC<{ count: number }> = ({ count }) => (
    <div className="relative w-20 h-28 flex-shrink-0">
        <div className="absolute w-full h-full bg-brand-surface rounded-lg border-2 border-brand-primary/20 -translate-x-1 -translate-y-1"></div>
        <div className="absolute w-full h-full bg-brand-surface rounded-lg border-2 border-brand-primary/30 -translate-x-0.5 -translate-y-0.5"></div>
        <div className="relative w-full h-full bg-brand-surface rounded-lg border-2 border-brand-primary/50 flex flex-col items-center justify-center text-center p-2">
            <div className="font-bold text-2xl">{count}</div>
            <div className="text-xs uppercase tracking-wider">Deck</div>
        </div>
    </div>
);

const DiscardPile: React.FC<{ card: CardData | undefined }> = ({ card }) => (
    <div className="w-20 h-28 flex-shrink-0">
        {card ? <CardDisplay card={card} displayMode="board" /> : <div className="w-full h-full bg-brand-surface/30 rounded-lg border-2 border-dashed border-brand-card/50 flex items-center justify-center text-xs text-brand-text/50 p-2 text-center">Discard</div>}
    </div>
);

const PlayerZone: React.FC<{player: PlayerState, isActive: boolean, isOpponent: boolean, communityCards: CardData[], opponentBet: number, onHoleCardClick?: (card: CardData) => void, showdownHand?: HandResult | null, revealHoleCards?: boolean}> = ({ player, isActive, isOpponent, communityCards, onHoleCardClick, showdownHand, revealHoleCards }) => (
    <div className={`flex items-center justify-between gap-4 w-full p-2 rounded-lg transition-all duration-300 ${isActive ? 'bg-brand-primary/10' : ''}`}>
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
            <DeckPile count={player.deck.length} />
            <DiscardPile card={player.discard[player.discard.length - 1]} />
        </div>
    </div>
);

const ShowdownDisplay: React.FC<{gameState: GameState, onAction: (action: string) => void}> = ({gameState, onAction}) => {
    const { players, communityCards, showdownResults } = gameState;
    const { p1Hand, p2Hand, winnerIndex } = showdownResults!;
    
    const renderPlayerShowdown = (player: PlayerState, hand: HandResult, isWinner: boolean) => (
      <div className={`flex flex-col items-center gap-4 p-6 rounded-2xl transition-all duration-500 ${isWinner ? 'bg-brand-accent/20 scale-105 shadow-glow-primary' : 'bg-brand-surface/50 grayscale opacity-80'}`}>
          <h2 className="text-3xl font-serif">{player.name}</h2>
          <div className="bg-brand-primary/20 text-brand-primary font-bold px-4 py-2 rounded-lg text-xl animate-pulse">{hand.name}</div>
          <div className="flex gap-2">
            {player.holeCards.map(c => <div key={c.id} className="w-24 h-36"><CardDisplay card={c} isInWinningHand={hand.hand.some(hc => hc.id === c.id)} /></div>)}
          </div>
           {isWinner && <div className="font-serif text-4xl font-bold text-brand-accent tracking-widest animate-bounce mt-2">WINNER</div>}
      </div>
    );

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center animate-fade-in gap-8 p-8">
            <h1 className="text-6xl font-serif font-bold text-brand-accent animate-divine-glow">SHOWDOWN</h1>
            <div className="flex items-start justify-center gap-8 w-full">
                {renderPlayerShowdown(players[0], p1Hand, winnerIndex === 0)}
                <div className="flex flex-col items-center gap-4 pt-16">
                    <h3 className="font-serif text-2xl">Community Cards</h3>
                    <div className="flex gap-2">
                        {communityCards.map(c => <div key={c.id} className="w-24 h-36"><CardDisplay card={c} isInWinningHand={p1Hand.hand.some(hc => hc.id === c.id) || p2Hand.hand.some(hc => hc.id === c.id)} /></div>)}
                    </div>
                </div>
                {renderPlayerShowdown(players[1], p2Hand, winnerIndex === 1)}
            </div>
             <div className="mt-8">
                <button onClick={() => onAction('END_SHOWDOWN')} className="px-8 py-3 bg-brand-primary text-white font-bold rounded-lg hover:bg-brand-primary/80 transition-colors text-xl shadow-lg">
                    Continue
                </button>
            </div>
        </div>
    );
};

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
    
    const selectedCardIndex = useMemo(() => {
        if (!selectedCard) return null;
        const index = players[0].hand.findIndex(c => c.id === selectedCard.id);
        return index === -1 ? null : index;
    }, [selectedCard, players[0].hand]);

    const amountToCall = useMemo(() => opponent.bet - activePlayer.bet, [opponent.bet, activePlayer.bet]);
    const minRaiseTotal = useMemo(() => opponent.bet + lastBetSize, [opponent.bet, lastBetSize]);

    useEffect(() => { if(logContainerRef.current) logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight; }, [log]);
    useEffect(() => { setSelectedCard(null); }, [activePlayerIndex]);
    
    useEffect(() => {
        if (amountToCall > 0) {
            setBetAmount(minRaiseTotal);
        } else {
            setBetAmount(lastBetSize);
        }
    }, [amountToCall, minRaiseTotal, lastBetSize, activePlayerIndex]);

    const handleBetAmountChange = (value: number) => {
        const minBet = (amountToCall > 0) ? minRaiseTotal : lastBetSize;
        const maxBet = activePlayer.mana + activePlayer.bet;
        const clampedValue = Math.max(minBet, Math.min(value, maxBet));
        setBetAmount(clampedValue);
    };
    
    const handleCardClick = (card: CardData, isPlayable: boolean) => {
        if (isPlayable) {
            setSelectedCard(prev => prev?.id === card.id ? null : card);
        } else {
            // Allow inspecting non-playable cards, but don't select for play
            setSelectedCard(prev => prev?.id === card.id ? null : card);
        }
    };

    const canPeek = isMyTurn && phase === 'PRE_FLOP' && !activePlayer.hasPeeked && activePlayer.holeCards.some(c => c.abilities?.some(a => a.name === 'Peek'));

    return (
        <div className="w-full h-screen flex bg-brand-bg text-brand-text font-sans">
            {phase === 'SHOWDOWN' && showdownResults && <ShowdownDisplay gameState={gameState} onAction={onAction} />}
            <main className="flex-grow flex flex-col p-4 gap-2">
                <header className="w-full flex justify-between items-center flex-shrink-0">
                    <h1 className="text-4xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-secondary">River of Ruin</h1>
                </header>
                <PlayerZone player={players[1]} isActive={activePlayerIndex === 1} isOpponent={true} communityCards={communityCards} opponentBet={players[0].bet} />
                <div className="flex-grow flex items-center justify-center gap-4 relative my-2">
                    <div className="w-28 h-40 flex-shrink-0">{activeLocation ? <CardDisplay card={activeLocation} displayMode='board' /> : <div className="w-full h-full bg-brand-surface/30 rounded-lg border-2 border-dashed border-brand-card/50 flex items-center justify-center text-xs text-brand-text/50 p-2 text-center">Location</div>}</div>
                    {Array(5).fill(null).map((_, i) => (<div key={i} className="w-28 h-40 flex-shrink-0"><CardDisplay card={communityCards[i] || null} displayMode="board"/></div>))}
                    <div className="absolute top-0 right-0 flex flex-col items-end gap-2">
                        <div className="bg-brand-surface rounded-lg px-6 py-2 text-right"><h3 className="text-sm uppercase tracking-wider text-brand-text/70">Pot</h3><div className="text-2xl font-bold text-brand-accent">{pot}</div></div>
                        <div className="bg-brand-surface rounded-lg px-4 py-1"><h3 className="text-md font-serif font-bold tracking-wider text-brand-secondary">{phase.replace('_', ' ')}</h3></div>
                    </div>
                </div>
                <PlayerZone player={players[0]} isActive={activePlayerIndex === 0} isOpponent={false} communityCards={communityCards} opponentBet={players[1].bet} onHoleCardClick={(card) => setSelectedCard(prev => prev?.id === card.id ? null : card)} />
                <div className="h-48 flex justify-center items-end -mb-8 mt-4">
                    {players[0].hand.map((card, index) => {
                        const isSelected = selectedCard?.id === card.id;
                        const isPlayable = isMyTurn && players[0].mana >= (card.manaCost ?? 0) && amountToCall <= 0;
                        const cardAngle = (index - (players[0].hand.length - 1) / 2) * 6;
                        return (
                            <div key={card.id + '-' + index} className="w-32 h-44 transition-transform duration-300 ease-in-out origin-bottom" style={{ transform: `rotate(${cardAngle}deg) translateY(${isSelected ? '-1.5rem' : '0'}) scale(${isSelected ? '1.1' : '1'})`, zIndex: isSelected ? 10 : index, marginLeft: '-3rem' }} onClick={() => handleCardClick(card, isPlayable)}>
                                <CardDisplay card={card} displayMode='hand' isSelected={isSelected} isPlayable={isPlayable} />
                            </div>
                        )
                    })}
                </div>
            </main>
            <aside className="w-[400px] flex-shrink-0 bg-brand-surface/50 p-4 flex flex-col gap-4 h-full">
                <header className="flex justify-end"><ThemeSwitcher currentTheme={theme} themes={themes} setTheme={setTheme} /></header>
                <div className="flex-shrink-0">
                    <CardInspector card={selectedCard} gameState={gameState} onAction={onAction} />
                </div>
                <div className="flex-grow flex flex-col min-h-0">
                    <h3 className="font-serif text-xl border-b border-brand-card pb-2 mb-2 flex-shrink-0">Game Log</h3>
                    <div ref={logContainerRef} className="flex-grow text-sm space-y-2 overflow-y-auto pr-2">{log.map((entry, i) => <p key={i} className="whitespace-pre-wrap">{entry}</p>)}</div>
                </div>
                <div className="pt-4 border-t border-brand-card flex-shrink-0">
                    {winner ? (<div className="text-center"><h3 className="font-serif text-2xl text-brand-accent">{winner.name} wins!</h3><button onClick={() => onAction('NEW_GAME')} className="mt-4 w-full bg-brand-primary text-white font-bold py-2 px-4 rounded hover:bg-brand-primary/80 transition-colors">Play Again</button></div>) 
                    : phase === 'END_ROUND' ? (<button onClick={() => onAction('NEXT_ROUND')} className="w-full bg-brand-primary text-white font-bold py-2 px-4 rounded hover:bg-brand-primary/80 transition-colors">Next Round</button>) 
                    : isActionPhase ? (
                        <div className={`p-2 rounded-lg transition-all duration-300 ${isMyTurn ? 'bg-brand-primary/10' : ''}`}>
                            <h3 className="font-bold text-lg text-center mb-2">{isMyTurn ? "Your Turn" : "CPU's Turn"}</h3>
                            {isMyTurn && (<div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => onAction('PLAY_CARD', { cardIndex: selectedCardIndex })} disabled={selectedCardIndex === null || activePlayer.mana < (selectedCard?.manaCost ?? 0) || amountToCall > 0} className="w-full bg-brand-secondary text-white font-bold py-2 px-4 rounded disabled:bg-brand-card disabled:cursor-not-allowed">Play Card</button>
                                    <button onClick={() => onAction('DISCARD', { cardIndex: selectedCardIndex })} disabled={selectedCardIndex === null || activePlayer.hasDiscarded || amountToCall > 0} className="w-full bg-brand-accent/80 text-white font-bold py-2 px-4 rounded disabled:bg-brand-card disabled:cursor-not-allowed">Discard</button>
                                </div>
                                {canPeek && (
                                    <button onClick={() => onAction('PEEK')} disabled={activePlayer.mana < 1} className="w-full bg-brand-accent/80 text-white font-bold py-2 px-4 rounded disabled:bg-brand-card disabled:cursor-not-allowed">
                                        Peek (1 Mana)
                                    </button>
                                )}
                                
                                {amountToCall > 0 ? (
                                    <div className="space-y-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <button onClick={() => onAction('CALL')} disabled={activePlayer.mana < amountToCall} className="w-full bg-brand-success text-white font-bold py-3 px-4 rounded disabled:bg-brand-card disabled:cursor-not-allowed">Call {amountToCall}</button>
                                            <button onClick={() => onAction('FOLD')} className="w-full bg-brand-danger text-white font-bold py-3 px-4 rounded">Fold</button>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleBetAmountChange(betAmount - 1)} className="px-3 py-1 bg-brand-surface rounded">-</button>
                                                <input type="number" value={betAmount} onChange={(e) => handleBetAmountChange(parseInt(e.target.value))} className="w-full bg-brand-surface text-center font-bold p-2 rounded border border-brand-card" />
                                                <button onClick={() => handleBetAmountChange(betAmount + 1)} className="px-3 py-1 bg-brand-surface rounded">+</button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                                                <button onClick={() => handleBetAmountChange(minRaiseTotal)} className="bg-brand-surface/50 rounded p-1">Min Raise</button>
                                                <button onClick={() => handleBetAmountChange(activePlayer.bet + activePlayer.mana)} className="bg-brand-surface/50 rounded p-1">All In</button>
                                            </div>
                                            <button onClick={() => onAction('RAISE', { amount: betAmount })} disabled={activePlayer.mana < (betAmount - activePlayer.bet)} className="w-full mt-2 bg-brand-primary text-white font-bold py-3 px-4 rounded disabled:bg-brand-card disabled:cursor-not-allowed">Raise to {betAmount}</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleBetAmountChange(betAmount - 1)} className="px-3 py-1 bg-brand-surface rounded">-</button>
                                            <input type="number" value={betAmount} onChange={(e) => handleBetAmountChange(parseInt(e.target.value) || 0)} className="w-full bg-brand-surface text-center font-bold p-2 rounded border border-brand-card" />
                                            <button onClick={() => handleBetAmountChange(betAmount + 1)} className="px-3 py-1 bg-brand-surface rounded">+</button>
                                        </div>
                                        <div className="grid grid-cols-4 gap-2 mt-2 text-sm">
                                             <button onClick={() => handleBetAmountChange(lastBetSize)} className="bg-brand-surface/50 rounded p-1">Min</button>
                                             <button onClick={() => handleBetAmountChange(Math.ceil(pot/2))} className="bg-brand-surface/50 rounded p-1">1/2 Pot</button>
                                             <button onClick={() => handleBetAmountChange(pot)} className="bg-brand-surface/50 rounded p-1">Pot</button>
                                             <button onClick={() => handleBetAmountChange(activePlayer.mana)} className="bg-brand-surface/50 rounded p-1">All In</button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button onClick={() => onAction('CHECK')} className="w-full bg-brand-surface font-bold py-3 px-4 rounded hover:bg-brand-card">Check</button>
                                            <button onClick={() => onAction('BET', { amount: betAmount - activePlayer.bet })} disabled={(betAmount - activePlayer.bet) <= 0 || activePlayer.mana < (betAmount - activePlayer.bet)} className="w-full bg-brand-primary text-white font-bold py-3 px-4 rounded disabled:bg-brand-card disabled:cursor-not-allowed">Bet {betAmount - activePlayer.bet}</button>
                                        </div>
                                    </div>
                                )}
                            </div>)}
                        </div>
                    ) : (<p className="text-center text-brand-text/70 italic">Waiting...</p>)}
                </div>
            </aside>
        </div>
    );
};

export default GameBoard;