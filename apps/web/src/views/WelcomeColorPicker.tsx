import React, { useState } from 'react';
import { ArrowRight, Check } from '@phosphor-icons/react';
import { ACCENT_OPTIONS, getAccessibleAccentForeground, getRepresentativeHex, getSwatchCss } from '../lib/accent';

const BRAND_ORANGE = '#F56040';
const BRAND_PURPLE = '#833AB4';

export default function WelcomeColorPicker({
  onSelect,
}: {
  userName: string;
  onSelect: (color: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleContinue = () => {
    if (!selected) return;
    setSaving(true);
    onSelect(selected);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[var(--surface-app)] font-sans">
      {/* Background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-32 right-[-10%] h-[28rem] w-[28rem] rounded-full blur-[120px] opacity-30"
          style={{ backgroundColor: BRAND_ORANGE }}
        />
        <div
          className="absolute bottom-[-8%] left-[-8%] h-96 w-96 rounded-full blur-[120px] opacity-25"
          style={{ backgroundColor: BRAND_PURPLE }}
        />
        {selected && (
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[30rem] w-[30rem] rounded-full blur-[160px] opacity-20 transition-colors duration-700"
            style={{ backgroundColor: getRepresentativeHex(selected) }}
          />
        )}
      </div>

      <div className="relative z-10 w-full max-w-lg px-6">
        <p className="mb-2 text-center text-sm font-medium text-[var(--text-secondary)]">
          Elige un tema
        </p>
        <p className="mb-6 text-center text-xs text-(--text-tertiary)">
          Podrás cambiarlo después en tus ajustes
        </p>

        {/* Color grid */}
        <div className="grid grid-cols-5 gap-3 sm:gap-4">
          {ACCENT_OPTIONS.map((option) => {
            const isSelected = selected === option.value;
            const displayHex = getRepresentativeHex(option.value);
            const fg = getAccessibleAccentForeground(option.value);
            const bg = getSwatchCss(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelected(option.value)}
                className="group flex flex-col items-center gap-2"
              >
                <div
                  className="relative flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-200 sm:h-16 sm:w-16 sm:rounded-[1.2rem]"
                  style={{
                    background: bg,
                    transform: isSelected ? 'scale(1.12)' : undefined,
                    boxShadow: isSelected
                      ? `0 8px 30px -8px ${displayHex}80`
                      : '0 2px 8px -2px rgba(0,0,0,0.1)',
                    outline: isSelected ? `3px solid ${displayHex}` : undefined,
                    outlineOffset: isSelected ? '3px' : undefined,
                  }}
                >
                  {isSelected && (
                    <Check size={22} weight="bold" color={fg} />
                  )}
                </div>
                <span
                  className="text-[10px] font-bold tracking-wide transition-colors sm:text-[11px]"
                  style={{
                    color: isSelected ? displayHex : 'var(--text-secondary)',
                  }}
                >
                  {option.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Continue button */}
        <button
          type="button"
          disabled={!selected || saving}
          onClick={handleContinue}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          style={
            selected
              ? {
                  background: getSwatchCss(selected),
                  color: getAccessibleAccentForeground(selected),
                  boxShadow: `0 12px 30px -12px ${getRepresentativeHex(selected)}60`,
                }
              : {
                  backgroundColor: 'var(--surface-card)',
                  color: 'var(--text-secondary)',
                }
          }
        >
          {saving ? 'Preparando tu workspace…' : 'Continuar'}
          {!saving && <ArrowRight size={16} />}
        </button>
      </div>
    </div>
  );
}
