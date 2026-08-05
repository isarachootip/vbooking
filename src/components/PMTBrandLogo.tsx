import React from 'react';

interface PMTBrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'sidebar' | 'horizontal';
  className?: string;
}

export const PMTBrandLogo: React.FC<PMTBrandLogoProps> = ({ 
  size = 'md',
  variant = 'sidebar',
  className = ''
}) => {
  const logoWidth = variant === 'sidebar' 
    ? '190px' 
    : size === 'lg' 
      ? '280px' 
      : size === 'sm' 
        ? '150px' 
        : '220px';

  return (
    <div 
      className={`flex items-center justify-center ${className}`}
      style={{ width: '100%', padding: variant === 'sidebar' ? '0.25rem 0' : '0.5rem 0' }}
    >
      <img 
        src="/pmt-logo.png" 
        alt="PMT Design & Renovate Project Management"
        style={{ 
          maxWidth: logoWidth, 
          width: '100%', 
          height: 'auto', 
          objectFit: 'contain',
          display: 'block'
        }} 
      />
    </div>
  );
};
