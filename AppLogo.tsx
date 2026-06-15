import React from 'react';

interface AppLogoProps {
  className?: string;
  size?: number | string;
  variant?: 'color' | 'white' | 'transparent-color' | 'navy-striped';
  rounded?: boolean;
}

export const AppLogo: React.FC<AppLogoProps> = ({ 
  className = '', 
  size = '100%', 
  variant = 'color',
  rounded = true
}) => {
  const strokeColor = variant === 'transparent-color' ? '#4f46e5' : '#FFFFFF';
  const rxValue = rounded ? "24" : "0";

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
        {/* Perfect crisp horizontal stripes pattern matching the uploaded reference image */}
        <pattern id="logoStripes" width="100" height="2" patternUnits="userSpaceOnUse">
          <line x1="0" y1="1" x2="100" y2="1" stroke="#12377a" strokeWidth="0.8" />
        </pattern>
      </defs>

      {variant === 'color' && (
        <>
          {/* Main Vibrant Indigo background matching reference image */}
          <rect 
            width="100" 
            height="100" 
            rx={rxValue} 
            fill="#4f46e5" 
          />
        </>
      )}

      {variant === 'navy-striped' && (
        <>
          {/* Main Deep Navy background matching reference image */}
          <rect 
            width="100" 
            height="100" 
            rx={rxValue} 
            fill="#06153a" 
          />
          {/* Fine horizontal stripes overlay */}
          <rect 
            width="100" 
            height="100" 
            rx={rxValue} 
            fill="url(#logoStripes)" 
          />
        </>
      )}

      {/* Scaled Icon Group (Centered scaling) */}
      <g transform="translate(50, 50) scale(0.75) translate(-50, -50)">
        {/* Left Slanted Parallelogram Shape */}
        <polygon 
          points="38.25,22 57,22 47,62 20.75,62" 
          stroke={strokeColor} 
          strokeWidth="8.5" 
          strokeLinejoin="round" 
          fill="none" 
        />

        {/* Right Slanted Parallelogram Shape */}
        <polygon 
          points="53,38 79.25,38 61.75,78 43,78" 
          stroke={strokeColor} 
          strokeWidth="8.5" 
          strokeLinejoin="round" 
          fill="none" 
        />
      </g>
    </svg>
  );
};
