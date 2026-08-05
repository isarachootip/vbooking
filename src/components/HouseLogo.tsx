import React from 'react';

interface HouseLogoProps {
  size?: number;
  className?: string;
  color?: string;
}

export const HouseLogo: React.FC<HouseLogoProps> = ({ 
  size = 120, 
  className = '', 
  color = '#8B0000' 
}) => {
  const height = size * 0.55;

  return (
    <svg 
      width={size} 
      height={height} 
      viewBox="0 0 200 110" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      {/* Ground Line */}
      <rect x="5" y="99" width="190" height="3" fill={color} />

      {/* Main Building Structure */}
      <path 
        fillRule="evenodd" 
        clipRule="evenodd" 
        d="
          M15 70 H65 V99 H15 V70 Z
          M65 70 H165 V99 H65 V70 Z
        " 
        fill={color} 
      />

      {/* Main Pitched Roof */}
      <path
        d="M45 70 L115 32 L180 75 H168 L115 40 L55 70 H45 Z"
        fill={color}
      />

      {/* Right side flat canopy/carport */}
      <path
        d="M142 66 H188 V72 H180 V99 H175 V72 H142 V66 Z"
        fill={color}
      />

      {/* Left building window cutout */}
      <rect x="22" y="75" width="38" height="19" fill="#ffffff" />
      <rect x="34" y="75" width="2" height="19" fill={color} />
      <rect x="47" y="75" width="2" height="19" fill={color} />

      {/* Center/Right windows under sloped roof */}
      <rect x="72" y="75" width="40" height="17" fill="#ffffff" />
      <rect x="116" y="75" width="44" height="17" fill="#ffffff" />

      {/* Window frame vertical divisions */}
      <rect x="85" y="75" width="2" height="17" fill={color} />
      <rect x="98" y="75" width="2" height="17" fill={color} />
      <rect x="130" y="75" width="2" height="17" fill={color} />
      <rect x="144" y="75" width="2" height="17" fill={color} />

      {/* Stairs/Steps in center */}
      <rect x="82" y="91" width="65" height="2" fill="#ffffff" />
      <rect x="88" y="94" width="53" height="2" fill="#ffffff" />
      <rect x="94" y="97" width="41" height="2" fill="#ffffff" />
    </svg>
  );
};
