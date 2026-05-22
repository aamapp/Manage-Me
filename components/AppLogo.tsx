import React from 'react';

interface AppLogoProps {
  className?: string;
  size?: number | string;
  variant?: 'color' | 'white';
}

export const AppLogo: React.FC<AppLogoProps> = ({ 
  className = '', 
  size = '100%', 
  variant = 'color' 
}) => {
  const gradientId = "logoBlueGradient";
  
  return (
    <svg 
      viewBox="0 0 100 100" 
      width={size} 
      height={size} 
      className={`${className} overflow-visible`} 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {variant === 'color' && (
          <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
        )}
      </defs>

      {/* Pill 1 (Leftmost Bar) */}
      <path 
        d="M 24 77 L 44 47" 
        stroke={variant === 'white' ? '#FFFFFF' : `url(#${gradientId})`} 
        strokeWidth="13.5" 
        strokeLinecap="round" 
      />
      
      {/* Pill 2 (Middle Tall Bar) */}
      <path 
        d="M 41 83 L 69 41" 
        stroke={variant === 'white' ? '#FFFFFF' : `url(#${gradientId})`} 
        strokeWidth="13.5" 
        strokeLinecap="round" 
      />
      
      {/* Pill 3 (Rightmost Bar) */}
      <path 
        d="M 64 80 L 82 53" 
        stroke={variant === 'white' ? '#FFFFFF' : `url(#${gradientId})`} 
        strokeWidth="13.5" 
        strokeLinecap="round" 
      />

      {/* Starting Circle Node */}
      <circle 
        cx="21" 
        cy="53.5" 
        r="5.5" 
        fill={variant === 'white' ? '#FFFFFF' : `url(#${gradientId})`} 
      />

      {/* Trendline Path */}
      <path 
        d="M 21 53.5 L 35 33 L 55 33 L 73 15" 
        fill="none" 
        stroke={variant === 'white' ? '#FFFFFF' : `url(#${gradientId})`} 
        strokeWidth="5.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />

      {/* Arrowhead */}
      <path 
        d="M 58 18.5 L 74.5 12.5 L 68.5 29 Z" 
        fill={variant === 'white' ? '#FFFFFF' : `url(#${gradientId})`} 
        stroke={variant === 'white' ? '#FFFFFF' : `url(#${gradientId})`}
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
};
