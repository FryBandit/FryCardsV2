import React from 'react';

export const CollectionIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <rect x="3" y="3" width="12" height="12" rx="2" ry="2"/>
    <path d="M7 19h10a2 2 0 0 0 2-2V7"/>
  </svg>
);
