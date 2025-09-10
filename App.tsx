import React, { useState, useCallback } from 'react';
import { CardData } from './types';
import { CARDS } from './constants';
import CardDisplay from './components/CardDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorDisplay from './components/ErrorDisplay';
import { SparklesIcon } from './components/icons/SparklesIcon';

const App: React.FC = () => {
  const [card, setCard] = useState<CardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const preloadMedia = (url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (url.endsWith('.mp4')) {
        const video = document.createElement('video');
        video.src = url;
        video.oncanplaythrough = () => resolve();
        video.onerror = () => reject(new Error(`Video failed to load: ${url}`));
        video.load();
      } else {
        const img = new Image();
        img.src = url;
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Image failed to load: ${url}`));
      }
    });
  };

  const handleDrawCard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Pick a random card from the deck
      const randomCard = CARDS[Math.floor(Math.random() * CARDS.length)];

      // Preload the image or video for a smooth reveal
      await preloadMedia(randomCard.imageUrl);

      setCard(randomCard);

    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred while loading the card media.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text font-sans flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 transition-colors duration-500">
      <div className="w-full max-w-7xl mx-auto flex flex-col items-center">
        <header className="text-center mb-6">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-secondary mb-2">
            Fry Cards
          </h1>
        </header>

        <main className="w-full flex flex-col items-center justify-center flex-grow mt-4">
          <div className="w-full max-w-sm h-[32rem] mb-8">
            {isLoading && <LoadingSpinner />}
            {error && <ErrorDisplay message={error} />}
            {!isLoading && !error && <CardDisplay card={card} />}
          </div>

          <button
            onClick={handleDrawCard}
            disabled={isLoading}
            className="relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-300 bg-brand-secondary rounded-lg shadow-lg hover:shadow-glow-secondary focus:outline-none focus:ring-4 focus:ring-brand-secondary/50 disabled:bg-brand-card disabled:text-brand-text/50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <SparklesIcon className="w-6 h-6 mr-3 animate-pulse" />
            {isLoading ? 'Drawing...' : 'Draw a Card'}
          </button>
        </main>
      </div>
    </div>
  );
};

export default App;
