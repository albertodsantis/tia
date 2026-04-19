import { LightningIcon as Lightning, TrophyIcon as Trophy } from '@phosphor-icons/react';
import type { BadgeKey, EfisystemSnapshot } from '@shared';

// ── Level config ──────────────────────────────────────────────

const MAX_LEVEL = 50;

const LEVEL_THRESHOLDS: Record<number, number> = {
  1: 0,
  2: 100,
  3: 250,
  4: 475,
  5: 725,
  6: 1000,
  7: 1300,
  8: 1625,
  9: 1900,
  10: 2200,
  11: 2525,
  12: 2875,
  13: 3375,
  14: 3900,
  15: 4450,
  16: 5025,
  17: 5625,
  18: 6250,
  19: 7100,
  20: 7975,
  21: 8875,
  22: 9800,
  23: 10750,
  24: 11725,
  25: 12725,
  26: 14100,
  27: 15500,
  28: 16925,
  29: 18375,
  30: 19850,
  31: 21350,
  32: 22875,
  33: 24950,
  34: 27050,
  35: 29175,
  36: 31325,
  37: 33500,
  38: 35700,
  39: 37925,
  40: 41000,
  41: 44100,
  42: 47225,
  43: 50375,
  44: 53550,
  45: 58100,
  46: 62675,
  47: 67275,
  48: 71900,
  49: 78825,
  50: 85775,
};

// Tier definitions: each tier spans a range of levels and maps to a display name.
// Sub-level within the tier is rendered as a Roman numeral (I, II, III, ...).
export const TIERS: { name: string; from: number; to: number }[] = [
  { name: 'Emergente', from: 1,  to: 3  },
  { name: 'Explorer',  from: 4,  to: 7  },
  { name: 'Vibing',    from: 8,  to: 12 },
  { name: 'Máquina',   from: 13, to: 18 },
  { name: 'Crack',     from: 19, to: 25 },
  { name: 'Master',    from: 26, to: 32 },
  { name: 'Élite',     from: 33, to: 39 },
  { name: 'Authority', from: 40, to: 44 },
  { name: 'Ícono',     from: 45, to: 48 },
  { name: 'Leyenda',   from: 49, to: 50 },
];

export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
export const MAX_LEVEL_EXPORT = MAX_LEVEL;

export function getLevelLabel(level: number): string {
  const tier = TIERS.find(t => level >= t.from && level <= t.to);
  if (!tier) return '';
  const subIndex = level - tier.from;
  return `${tier.name} ${ROMAN[subIndex] ?? ''}`.trim();
}

function getThresholds(level: number): { current: number; next: number } {
  const current = LEVEL_THRESHOLDS[level] ?? 0;
  const nextLevel = Math.min(level + 1, MAX_LEVEL);
  const next = LEVEL_THRESHOLDS[nextLevel] ?? LEVEL_THRESHOLDS[MAX_LEVEL];
  return { current, next };
}

// ── Badge preview config ──────────────────────────────────────
// Ordered list of all badges — used to render the preview row in the same
// canonical order regardless of unlock order.

const BADGE_ORDER: BadgeKey[] = [
  'perfil_estelar',
  'vision_clara',
  'motor_de_ideas',
  'circulo_intimo',
  'promesa_cumplida',
  'negocio_en_marcha',
  'directorio_dorado',
  'creador_imparable',
  'lluvia_de_billetes',
];

// A compact accent color per badge used for the preview dot glow.
const BADGE_DOT_COLOR: Record<BadgeKey, string> = {
  perfil_estelar:    '#d49840',
  vision_clara:      '#c87848',
  motor_de_ideas:    '#b8b8c8',
  circulo_intimo:    '#f8d040',
  promesa_cumplida:  '#f0c0b0',
  negocio_en_marcha: '#e0e0f8',
  directorio_dorado: '#687080',
  creador_imparable: '#8b78ff',
  lluvia_de_billetes:'#ff9548',
};

// ── Component ─────────────────────────────────────────────────

interface Props {
  efisystem: EfisystemSnapshot;
  accentHex: string;
  onOpenBadges?: () => void;
  onOpenLevels?: () => void;
}

export default function EfisystemWidget({ efisystem, accentHex, onOpenBadges, onOpenLevels }: Props) {
  const { totalPoints, currentLevel, unlockedBadges } = efisystem;
  const { current: currentThreshold, next: nextThreshold } = getThresholds(currentLevel);
  const isMaxLevel = currentLevel >= MAX_LEVEL;

  const progressPct = isMaxLevel
    ? 100
    : Math.min(
        100,
        ((totalPoints - currentThreshold) / (nextThreshold - currentThreshold)) * 100,
      );

  const unlockedCount = unlockedBadges.length;
  const totalBadges = BADGE_ORDER.length;

  const LevelBlock = (
    <>
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Lightning size={18} weight="fill" style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
          <span className="text-sm font-semibold text-(--text-primary) truncate">
            Nivel {currentLevel} · {getLevelLabel(currentLevel)}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Lightning size={14} weight="fill" style={{ color: 'var(--accent-color)' }} />
          <span className="text-sm font-bold" style={{ color: 'var(--accent-color)' }}>
            {totalPoints.toLocaleString('es')}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="h-2 rounded-full bg-(--surface-muted) overflow-hidden" style={{ boxShadow: `0 0 0 1px ${accentHex}33` }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%`, backgroundColor: 'var(--accent-color)' }}
          />
        </div>
        {!isMaxLevel && (
          <div className="mt-1 flex justify-between text-[11px] text-(--text-tertiary)">
            <span>{totalPoints.toLocaleString('es')} pts</span>
            <span>{nextThreshold.toLocaleString('es')} pts · {getLevelLabel(currentLevel + 1)}</span>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div>
      {onOpenLevels ? (
        <button
          type="button"
          onClick={onOpenLevels}
          className="block w-full text-left rounded-lg -m-1 p-1 transition-colors hover:bg-(--surface-muted)/40 active:bg-(--surface-muted)/60"
          aria-label="Ver todos los niveles"
        >
          {LevelBlock}
        </button>
      ) : (
        LevelBlock
      )}

      {/* Badge preview row */}
      {onOpenBadges && (
        <div className="mt-3">
          <button
            type="button"
            onClick={onOpenBadges}
            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background: `linear-gradient(135deg, ${accentHex}18 0%, ${accentHex}2a 100%)`,
              border: `1px solid ${accentHex}30`,
            }}
          >
            {/* Badge dots */}
            <div className="flex items-center gap-1 flex-1 min-w-0">
              {BADGE_ORDER.map((key) => {
                const isUnlocked = unlockedBadges.includes(key);
                const color = BADGE_DOT_COLOR[key];
                return (
                  <div
                    key={key}
                    className="h-3 w-3 rounded-full shrink-0 transition-all duration-300"
                    style={
                      isUnlocked
                        ? {
                            background: color,
                            boxShadow: `0 0 5px ${color}cc`,
                          }
                        : {
                            background: `${accentHex}20`,
                            border: `1px solid ${accentHex}25`,
                          }
                    }
                  />
                );
              })}
            </div>

            {/* Label + trophy */}
            <div className="flex items-center gap-1 shrink-0">
              <Trophy size={12} weight="fill" style={{ color: accentHex }} />
              <span
                className="text-[11px] font-bold"
                style={{ color: accentHex }}
              >
                {unlockedCount}/{totalBadges}
              </span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
