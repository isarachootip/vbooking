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
        } catch (e) {
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
        display: 'inline-flex',
        alignItems: 'center',
        cursor: 'pointer'
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
          width: '100%',
          ...style,
          color: 'transparent',
          caretColor: 'transparent',
          cursor: 'pointer'
        }}
      />
      <div style={{
        position: 'absolute',
        left: '0.75rem',
        right: '2rem',
        top: '50%',
        transform: 'translateY(-50%)',
        color: value ? 'var(--text-primary)' : 'var(--text-muted)',
        pointerEvents: 'none',
        fontSize: '0.85rem',
        fontWeight: value ? 600 : 400,
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        <Calendar size={14} color="#64748b" />
        <span>{formatted}</span>
      </div>
    </div>
  );
};

