import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { CaretDown, X } from '@phosphor-icons/react';
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
  useBottomSheet?: boolean;
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
  useBottomSheet = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (useBottomSheet) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [useBottomSheet]);

  // Lock body scroll when bottom sheet is open
  useEffect(() => {
    if (!useBottomSheet) return;
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, useBottomSheet]);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  const bottomSheet = isOpen && useBottomSheet && !disabled
    ? ReactDOM.createPortal(
        <div
          className="fixed inset-0 z-9999 flex items-end"
          onClick={() => setIsOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Sheet */}
          <div
            className="relative w-full rounded-t-3xl bg-(--surface-card-strong) pb-safe animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-(--line-soft)" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-(--line-soft)">
              <span className="text-sm font-bold text-[var(--text-primary)]">Cambiar etapa</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-(--text-secondary) hover:bg-(--surface-muted)"
              >
                <X size={16} />
              </button>
            </div>

            {/* Options */}
            <div className="p-3 space-y-1">
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
                      'flex w-full items-center rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors',
                      isSelected
                        ? 'bg-(--surface-muted) text-(--text-primary)'
                        : 'text-(--text-secondary) hover:bg-(--surface-muted)/60 hover:text-(--text-primary)',
                    )}
                  >
                    {option.label}
                    {isSelected && (
                      <span className="ml-auto text-xs font-bold text-(--accent) opacity-80">✓</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Safe area spacer for iOS home bar */}
            <div className="h-6" />
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div ref={containerRef} className={cx('relative w-full', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={ariaLabel}
        className={cx(
          'flex w-full items-center justify-between appearance-none rounded-[1rem] border bg-[var(--surface-card-strong)] px-4 py-3 text-base sm:text-sm font-bold text-[var(--text-primary)] transition-all focus:outline-none focus:ring-2 disabled:opacity-50 [border-color:var(--line-soft)]',
          buttonClassName,
        )}
        style={buttonStyle}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        {!useBottomSheet && (
          <CaretDown
            size={16}
            className={cx(
              'shrink-0 text-(--text-secondary)/70 transition-transform',
              isOpen && 'rotate-180',
            )}
          />
        )}
      </button>

      {/* Inline dropdown (non-mobile) */}
      {isOpen && !disabled && !useBottomSheet && (
        <div className="absolute z-100 mt-2 max-h-60 w-full overflow-auto rounded-2xl border bg-(--surface-card-strong) p-1.5 shadow-(--shadow-medium) animate-in fade-in zoom-in-95 duration-100 border-(--line-soft)">
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
                  'flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors',
                  isSelected
                    ? 'bg-(--surface-muted) text-(--text-primary)'
                    : 'text-(--text-secondary) hover:bg-(--surface-muted)/60 hover:text-(--text-primary)',
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}

      {bottomSheet}
    </div>
  );
}
