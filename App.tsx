import React, { useState, useCallback, useEffect, useRef } from 'react';
import { CardData } from './types';
import { CARDS } from './constants';
import CardDisplay from './components/CardDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorDisplay from './components/ErrorDisplay';
import { SparklesIcon } from './components/icons/SparklesIcon';

// --- Theme Implementation Start ---

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
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    {...props}
  >
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2Z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7Z"/>
  </svg>
);

interface ThemeSwitcherProps {
  currentTheme: string;
  themes: Theme[];
  setTheme: (theme: string) => void;
}

const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ currentTheme, themes, setTheme }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleThemeChange = (themeKey: string) => {
    setTheme(themeKey);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const currentThemeName = themes.find(t => t.key === currentTheme)?.name || 'Theme';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-brand-surface text-brand-text hover:bg-brand-card transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <SwatchBookIcon className="w-5 h-5" />
        <span className="hidden sm:inline">{currentThemeName}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 w-48 mt-2 origin-top-right bg-brand-surface rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
            {themes.map((theme) => (
              <a
                key={theme.key}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handleThemeChange(theme.key);
                }}
                className={`block px-4 py-2 text-sm ${
                  currentTheme === theme.key
                    ? 'font-bold text-brand-primary'
                    : 'text-brand-text'
                } hover:bg-brand-card hover:text-brand-primary`}
                role="menuitem"
              >
                {theme.name}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Theme Implementation End ---

const App: React.FC = () => {
  const [card, setCard] = useState<CardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<string>('nightdrive');

  useEffect(() => {
    const savedTheme = localStorage.getItem('fry-cards-theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const defaultTheme = savedTheme || (systemPrefersDark ? 'nightdrive' : 'daybreak');
    
    if (themes.some(t => t.key === defaultTheme)) {
      setTheme(defaultTheme);
    } else {
      setTheme('nightdrive');
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('fry-cards-theme', theme);
  }, [theme]);


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
      const randomCard = CARDS[Math.floor(Math.random() * CARDS.length)];
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
    <div className="min-h-screen bg-brand-bg text-brand-text font-sans flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      <div className="w-full max-w-7xl mx-auto flex flex-col items-center">
        <div className="w-full flex justify-between items-start mb-6 px-2">
            <div className="w-1/3"></div>
            <header className="w-1/3 text-center">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-secondary">
                Fry Cards
              </h1>
            </header>
            <div className="w-1/3 flex justify-end pt-2">
                <ThemeSwitcher currentTheme={theme} themes={themes} setTheme={setTheme} />
            </div>
        </div>

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
