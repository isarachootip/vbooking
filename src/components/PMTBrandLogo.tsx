import React from 'react';

interface PMTBrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'sidebar' | 'horizontal';
  className?: string;
}

export const PMTBrandLogo: React.FC<PMTBrandLogoProps> = ({ 
  className = ''
}) => {
  return (
    <div 
      className={`w-full overflow-hidden ${className}`}
      style={{ width: '100%', display: 'block' }}
    >
      <img 
        src="/pmt-logo.png" 
        alt="PMT Design & Renovate Project Management"
        style={{ 
          width: '100%', 
          height: 'auto', 
          display: 'block',
          objectFit: 'cover'
        }} 
      />
    </div>
  );
};
