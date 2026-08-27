import React, { useRef } from 'react';
import { Calendar } from 'lucide-react';
import { formatToDDMMYYYY } from '../utils';

interface CustomDateInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  style?: React.CSSProperties;
  required?: boolean;
  min?: string;
  max?: string;
  placeholder?: string;
  className?: string;
}

export const CustomDateInput = ({ 
  value, 
  onChange, 
  style, 
  required, 
  min, 
  max,
  placeholder = 'DD/MM/YYYY',
  className = ''
}: CustomDateInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const formatted = value ? formatToDDMMYYYY(value) : placeholder;

  const handleClick = () => {
    if (inputRef.current) {
      if ('showPicker' in inputRef.current && typeof (inputRef.current as any).showPicker === 'function') {
        try {
          (inputRef.current as any).showPicker();
        } catch {
          inputRef.current.focus();
        }
      } else {
        inputRef.current.focus();
      }
    }
  };

  return (
    <div 
      onClick={handleClick}
      className={className}
      style={{ 
        position: 'relative', 
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
        boxSizing: 'border-box',
        ...style
      }}
    >
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={onChange}
        required={required}
        min={min}
        max={max}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          cursor: 'pointer',
          zIndex: 2
        }}
      />
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        color: value ? 'var(--text-primary)' : 'var(--text-muted)',
        pointerEvents: 'none',
        fontSize: '0.85rem',
        fontWeight: value ? 600 : 400,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        width: '100%'
      }}>
        <Calendar size={14} color="#64748b" style={{ flexShrink: 0 }} />
        <span>{formatted}</span>
      </div>
    </div>
  );
};

