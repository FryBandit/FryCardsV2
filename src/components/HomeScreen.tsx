
import React from 'react';

interface HomeScreenProps {
  onPlay: () => void;
  onRules: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onPlay, onRules }) => {
  return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-brand-bg text-brand-text p-8 text-center">
      <h1 className="text-7xl md:text-8xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-secondary animate-divine-glow">
        River of Ruin
      </h1>
      <p className="mt-4 text-xl text-brand-text/70">A cosmic horror poker card game.</p>
      <div className="mt-12 flex flex-col sm:flex-row gap-6">
        <button
          onClick={onPlay}
          className="px-10 py-4 bg-brand-primary text-white font-bold rounded-lg text-2xl shadow-lg shadow-brand-primary/30 hover:bg-brand-primary/80 hover:shadow-xl hover:shadow-brand-primary/40 transition-all duration-300 transform hover:scale-105"
        >
          Play Game
        </button>
        <button
          onClick={onRules}
          className="px-10 py-4 bg-brand-surface text-brand-text font-bold rounded-lg text-2xl shadow-lg hover:bg-brand-card hover:shadow-xl transition-all duration-300 transform hover:scale-105"
        >
          View Rules
        </button>
      </div>
    </div>
  );
};

export default HomeScreen;
