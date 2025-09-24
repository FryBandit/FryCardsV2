
import React from 'react';

export const ManaIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <path d="M12 3V3C12 3 6 6 6 12S12 21 12 21 18 18 18 12 12 3 12 3z"/>
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
  </svg>
);
