import React from 'react';

interface PMTBrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'sidebar' | 'horizontal';
  className?: string;
  logoUrl?: string;
  altText?: string;
}

export const PMTBrandLogo: React.FC<PMTBrandLogoProps> = ({ 
  className = '',
  logoUrl = '/pmt-logo.png',
  altText = 'PMT Design & Renovate Project Management'
}) => {
  return (
    <div 
      className={`w-full overflow-hidden ${className}`}
      style={{ width: '100%', display: 'block' }}
    >
      <img 
        src={logoUrl || '/pmt-logo.png'} 
        alt={altText}
        style={{ 
          width: '100%', 
          height: 'auto', 
          display: 'block',
          objectFit: 'contain'
        }} 
      />
    </div>
  );
};
