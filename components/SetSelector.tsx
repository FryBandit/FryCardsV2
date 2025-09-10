import React, { useState, useEffect, useRef } from 'react';
import { CollectionIcon } from './icons/CollectionIcon';

interface SetSelectorProps {
  sets: string[];
  selectedSet: string;
  onSetChange: (set: string) => void;
}

const SetSelector: React.FC<SetSelectorProps> = ({ sets, selectedSet, onSetChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSetChange = (set: string) => {
    onSetChange(set);
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-brand-surface text-brand-text hover:bg-brand-card transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <CollectionIcon className="w-5 h-5" />
        <span className="hidden sm:inline whitespace-nowrap">{selectedSet}</span>
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 w-56 mb-2 max-h-60 overflow-y-auto origin-bottom-right bg-brand-surface rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="py-1" role="menu" aria-orientation="vertical">
            <button
              onClick={() => handleSetChange("All Sets")}
              className={`w-full text-left block px-4 py-2 text-sm ${
                selectedSet === "All Sets"
                  ? 'font-bold text-brand-primary'
                  : 'text-brand-text'
              } hover:bg-brand-card hover:text-brand-primary`}
              role="menuitem"
            >
              All Sets
            </button>
            {sets.map((set) => (
              <button
                key={set}
                onClick={() => handleSetChange(set)}
                className={`w-full text-left block px-4 py-2 text-sm ${
                  selectedSet === set
                    ? 'font-bold text-brand-primary'
                    : 'text-brand-text'
                } hover:bg-brand-card hover:text-brand-primary`}
                role="menuitem"
              >
                {set}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SetSelector;
