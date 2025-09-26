
import React from 'react';
import { CardData, PlayerState } from '../types';
import CardDisplay from './CardDisplay';

interface DiscardPileViewerProps {
  player: PlayerState;
  onClose: () => void;
}

const DiscardPileViewer: React.FC<DiscardPileViewerProps> = ({ player, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center animate-fade-in p-4 sm:p-8 text-white">
      <div className="bg-brand-surface rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col p-4 sm:p-6 border-2 border-brand-card">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-brand-primary">{player.name}'s Discard Pile ({player.discard.length})</h2>
          <button
            onClick={onClose}
            className="text-brand-text/70 hover:text-brand-primary transition-colors"
            aria-label="Close discard pile viewer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {player.discard.length === 0 ? (
          <div className="flex-grow flex items-center justify-center text-brand-text/50 text-xl italic">
            Discard pile is empty.
          </div>
        ) : (
          <div className="flex-grow overflow-y-auto pr-2 sm:pr-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {player.discard.map((card, index) => (
              <div key={card.id + '-' + index} className="w-full aspect-[3/4]">
                <CardDisplay card={card} displayMode="board" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DiscardPileViewer;
