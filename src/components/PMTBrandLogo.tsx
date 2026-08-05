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
  if (variant === 'sidebar') {
    return (
      <div 
        className={`flex flex-col ${className}`}
        style={{ padding: '0.2rem 0' }}
      >
        <div 
          style={{ 
            fontSize: '24px', 
            fontWeight: 900, 
            color: '#8B0000', 
            lineHeight: 1, 
            letterSpacing: '0.04em',
            fontFamily: 'Impact, "Arial Black", "Trebuchet MS", sans-serif'
          }}
        >
          PMT
        </div>
        <div 
          style={{ 
            fontSize: '9.5px', 
            fontWeight: 800, 
            color: '#8B0000', 
            letterSpacing: '0.05em', 
            whiteSpace: 'nowrap',
            textTransform: 'uppercase',
            marginTop: '3px',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
        >
          Project Management
        </div>
        <div 
          style={{ 
            fontSize: '7px', 
            fontWeight: 700, 
            color: '#666666', 
            letterSpacing: '0.06em', 
            whiteSpace: 'nowrap',
            textTransform: 'uppercase',
            marginTop: '1px'
          }}
        >
          Design &amp; Renovate
        </div>
      </div>
    );
  }

  // Full typography version
  const pmtFontSize = size === 'lg' ? '46px' : size === 'sm' ? '28px' : '36px';

  return (
    <div 
      className={`flex flex-col items-center text-center ${className}`}
      style={{ width: '100%' }}
    >
      <div 
        style={{ 
          fontSize: pmtFontSize, 
          fontWeight: 900, 
          color: '#8B0000', 
          lineHeight: 1, 
          letterSpacing: '0.03em',
          fontFamily: 'Impact, "Arial Black", "Trebuchet MS", sans-serif',
          marginBottom: '3px'
        }}
      >
        PMT
      </div>

      <div 
        style={{ 
          fontSize: size === 'lg' ? '12px' : '9.5px', 
          fontWeight: 800, 
          color: '#8B0000', 
          letterSpacing: '0.06em', 
          whiteSpace: 'nowrap',
          textTransform: 'uppercase',
          marginBottom: '2px'
        }}
      >
        Project Management
      </div>

      <div 
        style={{ 
          fontSize: size === 'lg' ? '9px' : '7.5px', 
          fontWeight: 700, 
          color: '#666666', 
          letterSpacing: '0.08em', 
          whiteSpace: 'nowrap',
          textTransform: 'uppercase'
        }}
      >
        Design &amp; Renovate
      </div>
    </div>
  );
};
