import { LightningIcon as Lightning } from '@phosphor-icons/react';
import OverlayModal from './OverlayModal';
import { ModalPanel } from './ui';
import { TIERS, ROMAN } from './EfisystemWidget';

interface Props {
  currentLevel: number;
  accentHex: string;
  onClose: () => void;
}

export default function LevelsModal({ currentLevel, accentHex, onClose }: Props) {
  return (
    <OverlayModal onClose={onClose}>
      <ModalPanel
        title="Todos los niveles"
        description="Avanza a través de 10 rangos con 50 niveles en total."
        onClose={onClose}
        size="md"
      >
        <div className="space-y-4">
          {TIERS.map((tier) => {
            const subCount = tier.to - tier.from + 1;
            const isCurrentTier = currentLevel >= tier.from && currentLevel <= tier.to;
            const isPastTier = currentLevel > tier.to;

            return (
              <div
                key={tier.name}
                className="rounded-[1rem] border px-4 py-3.5 transition-colors"
                style={{
                  borderColor: isCurrentTier ? `${accentHex}66` : 'var(--line-soft)',
                  background: isCurrentTier
                    ? `linear-gradient(135deg, ${accentHex}12 0%, ${accentHex}22 100%)`
                    : 'var(--surface-card)',
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Lightning
                      size={16}
                      weight="fill"
                      style={{
                        color: isPastTier || isCurrentTier ? accentHex : 'var(--text-tertiary)',
                        flexShrink: 0,
                      }}
                    />
                    <span
                      className="text-sm font-bold truncate"
                      style={{
                        color: isPastTier || isCurrentTier ? 'var(--text-primary)' : 'var(--text-secondary)',
                      }}
                    >
                      {tier.name}
                    </span>
                  </div>
                  <span className="shrink-0 text-[11px] font-medium text-[var(--text-tertiary)]">
                    Niveles {tier.from}–{tier.to}
                  </span>
                </div>

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {Array.from({ length: subCount }, (_, i) => {
                    const level = tier.from + i;
                    const roman = ROMAN[i] ?? '';
                    const isCurrent = level === currentLevel;
                    const isReached = level <= currentLevel;

                    return (
                      <span
                        key={level}
                        className="inline-flex h-7 min-w-[2rem] items-center justify-center rounded-md px-2 text-[11px] font-bold transition-colors"
                        style={{
                          background: isCurrent
                            ? accentHex
                            : isReached
                              ? `${accentHex}22`
                              : 'var(--surface-muted)',
                          color: isCurrent
                            ? '#fff'
                            : isReached
                              ? 'var(--text-primary)'
                              : 'var(--text-tertiary)',
                          border: isCurrent
                            ? `1px solid ${accentHex}`
                            : `1px solid ${isReached ? `${accentHex}33` : 'var(--line-soft)'}`,
                        }}
                      >
                        {roman}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ModalPanel>
    </OverlayModal>
  );
}
