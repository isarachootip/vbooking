import React from 'react';

interface HouseLogoProps {
  size?: number;
  className?: string;
  color?: string;
}

export const HouseLogo: React.FC<HouseLogoProps> = ({ 
  size = 120, 
  className = '', 
  color = 'currentColor' 
}) => {
  return (
    <svg 
      width={size} 
      height={size * 0.55} 
      viewBox="0 0 200 110" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      {/* Ground Line */}
      <rect x="10" y="99" width="180" height="2" fill={color} />

      {/* House Main Body (combines left block and main block) */}
      <path 
        fillRule="evenodd" 
        clipRule="evenodd" 
        d="
          /* Left building structure */
          M20 70 H65 V99 H20 V70 Z
          
          /* Main building structure under the roof */
          M65 70 H165 V99 H65 V70 Z
        " 
        fill={color} 
      />

      {/* Main Pitched Roof */}
      <path
        d="M50 70 L115 35 L175 75 H165 L115 44 L60 70 H50 Z"
        fill={color}
      />

      {/* Right side flat canopy/carport */}
      <path
        d="M145 68 H185 V73 H178 V99 H174 V73 H145 V68 Z"
        fill={color}
      />

      {/* Left building window cutout */}
      <rect x="25" y="75" width="35" height="19" fill="var(--bg-secondary, #ffffff)" />
      
      {/* Left window frame vertical divisions */}
      <rect x="36" y="75" width="2" height="19" fill={color} />
      <rect x="48" y="75" width="2" height="19" fill={color} />

      {/* Center/Right windows under sloped roof */}
      <rect x="72" y="75" width="38" height="17" fill="var(--bg-secondary, #ffffff)" />
      <rect x="115" y="75" width="43" height="17" fill="var(--bg-secondary, #ffffff)" />

      {/* Center/Right window frame vertical divisions */}
      <rect x="84" y="75" width="1.5" height="17" fill={color} />
      <rect x="96" y="75" width="1.5" height="17" fill={color} />
      <rect x="128" y="75" width="1.5" height="17" fill={color} />
      <rect x="142" y="75" width="1.5" height="17" fill={color} />

      {/* Stairs/Steps in center */}
      <rect x="85" y="92" width="60" height="2" fill="var(--bg-secondary, #ffffff)" />
      <rect x="90" y="95" width="50" height="2" fill="var(--bg-secondary, #ffffff)" />
      <rect x="95" y="97" width="40" height="2" fill="var(--bg-secondary, #ffffff)" />
    </svg>
  );
};
