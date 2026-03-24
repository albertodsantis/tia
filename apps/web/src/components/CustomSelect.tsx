import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cx } from './ui';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  buttonStyle?: React.CSSProperties;
  ariaLabel?: string;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Seleccionar...',
  disabled = false,
  className,
  buttonClassName,
  buttonStyle,
  ariaLabel,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  return (
    <div ref={containerRef} className={cx('relative w-full', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={ariaLabel}
        className={cx(
          'flex w-full items-center justify-between appearance-none rounded-[1rem] border bg-[var(--surface-card-strong)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] transition-all focus:outline-none focus:ring-2 disabled:opacity-50 [border-color:var(--line-soft)]',
          buttonClassName,
        )}
        style={buttonStyle}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown
          size={16}
          className={cx(
            'shrink-0 text-[var(--text-secondary)]/70 transition-transform',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-[100] mt-2 max-h-60 w-full overflow-auto rounded-[1rem] border bg-[var(--surface-card-strong)] p-1.5 shadow-[var(--shadow-medium)] animate-in fade-in zoom-in-95 duration-100 [border-color:var(--line-soft)]">
          {options.map((option) => {
            const isSelected = String(option.value) === String(value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cx(
                  'flex w-full items-center rounded-[0.75rem] px-3 py-2.5 text-left text-sm font-medium transition-colors',
                  isSelected
                    ? 'bg-[var(--surface-muted)] text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]/60 hover:text-[var(--text-primary)]',
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}