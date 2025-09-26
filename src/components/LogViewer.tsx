
import React, { useEffect, useRef } from 'react';

const LogEntry: React.FC<{ text: string }> = React.memo(({ text }) => {
    const formatText = (inputText: string) => {
      return inputText
        .replace(/\*(.*?)\*/g, '<strong class="text-brand-text/90 font-bold">$1</strong>')
        .replace(/!(.*?)!/g, '<strong class="text-brand-danger">$1</strong>')
        .replace(/\+(.*?)\+/g, '<strong class="text-brand-success">$1</strong>')
        .replace(/~(.*?)~/g, '<strong class="text-brand-accent">$1</strong>')
        .replace(/%(.*?)%/g, '<strong class="text-brand-secondary">$1</strong>')
        .replace(/@(.*?)@/g, '<span class="text-brand-primary/80 font-serif tracking-wider">$1</span>');
    };
    return <p className="text-brand-text/80 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatText(text) }} />;
});


interface LogViewerProps {
  log: string[];
  onClose: () => void;
}

const LogViewer: React.FC<LogViewerProps> = ({ log, onClose }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [log]);

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center animate-fade-in p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-viewer-title"
    >
      <div
        className="bg-brand-surface rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col p-6 border-2 border-brand-card shadow-2xl"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 id="log-viewer-title" className="text-3xl font-serif font-bold text-brand-primary">Game Log</h2>
          <button
            onClick={onClose}
            className="text-brand-text/70 hover:text-brand-primary transition-colors"
            aria-label="Close log viewer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div ref={logContainerRef} className="flex-grow text-base space-y-1 overflow-y-auto pr-2 bg-brand-bg/30 p-4 rounded-md">
            {log.map((entry, i) => <LogEntry key={i} text={entry} />)}
        </div>
      </div>
    </div>
  );
};

export default LogViewer;
