
import React from 'react';

interface ErrorDisplayProps {
  message: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message }) => {
  return (
    <div className="w-full h-full bg-brand-danger/10 border-2 border-brand-danger rounded-2xl flex flex-col items-center justify-center p-6 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-brand-danger mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h3 className="font-serif text-2xl text-brand-danger">An Error Occurred</h3>
      <p className="text-brand-text/80 mt-2 max-w-xs">{message}</p>
    </div>
  );
};

export default ErrorDisplay;
