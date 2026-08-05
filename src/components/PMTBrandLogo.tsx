import React from 'react';
import { HouseLogo } from './HouseLogo';

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
        className={`flex items-center gap-3.5 ${className}`}
        style={{ padding: '0.2rem 0' }}
      >
        {/* House Logo Box with subtle background shadow */}
        <div 
          style={{ 
            background: 'linear-gradient(135deg, #8B0000 0%, #a81212 100%)', 
            borderRadius: '10px', 
            padding: '5px 7px',
            boxShadow: '0 4px 12px rgba(139, 0, 0, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <HouseLogo size={52} color="#ffffff" />
        </div>

        {/* Text Section matching Image 1 font hierarchy */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
          <div 
            style={{ 
              fontSize: '22px', 
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
              fontSize: '8.5px', 
              fontWeight: 800, 
              color: '#8B0000', 
              letterSpacing: '0.04em', 
              whiteSpace: 'nowrap',
              textTransform: 'uppercase',
              marginTop: '2px',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
          >
            DESIGN &amp; RENOVATE
          </div>
          <div 
            style={{ 
              fontSize: '6.5px', 
              fontWeight: 700, 
              color: '#666666', 
              letterSpacing: '0.06em', 
              whiteSpace: 'nowrap',
              textTransform: 'uppercase',
              marginTop: '1px'
            }}
          >
            PROJECT MANAGEMENT
          </div>
        </div>
      </div>
    );
  }

  // Full stacked logo matching Image 1
  const logoSize = size === 'lg' ? 220 : size === 'sm' ? 120 : 170;
  const pmtFontSize = size === 'lg' ? '42px' : size === 'sm' ? '24px' : '32px';

  return (
    <div 
      className={`flex flex-col items-center text-center ${className}`}
      style={{ width: '100%' }}
    >
      {/* Top Title: PMT */}
      <div 
        style={{ 
          fontSize: pmtFontSize, 
          fontWeight: 900, 
          color: '#8B0000', 
          lineHeight: 1, 
          letterSpacing: '0.03em',
          fontFamily: 'Impact, "Arial Black", "Trebuchet MS", sans-serif',
          marginBottom: '2px'
        }}
      >
        PMT
      </div>

      {/* Subtitle: DESIGN & RENOVATE PROJECT MANAGEMENT */}
      <div 
        style={{ 
          fontSize: size === 'lg' ? '10px' : '7.5px', 
          fontWeight: 800, 
          color: '#8B0000', 
          letterSpacing: '0.05em', 
          whiteSpace: 'nowrap',
          textTransform: 'uppercase',
          marginBottom: '6px'
        }}
      >
        DESIGN &amp; RENOVATE PROJECT MANAGEMENT
      </div>

      {/* House Logo Vector */}
      <HouseLogo size={logoSize} color="#8B0000" />
    </div>
  );
};
