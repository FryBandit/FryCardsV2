
import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="w-full h-full bg-brand-surface border-2 border-brand-card/50 rounded-2xl flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mb-4"></div>
      <h3 className="font-serif text-2xl text-brand-text/80">Drawing a Card...</h3>
    </div>
  );
};

export default LoadingSpinner;
