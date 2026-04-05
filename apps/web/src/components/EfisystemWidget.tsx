import { LightningIcon as Lightning, TrophyIcon as Trophy } from '@phosphor-icons/react';
import type { BadgeKey, EfisystemSnapshot } from '@shared';

// ── Level config ──────────────────────────────────────────────

const LEVEL_THRESHOLDS: Record<number, number> = {
  1: 0,
  2: 250,
  3: 750,
  4: 1500,
  5: 3000,
  6: 4167,
  7: 5334,
  8: 6501,
  9: 7668,
  10: 10000,
};

const LEVEL_LABELS: Record<number, string> = {
  1: 'Emergente',
  2: 'Explorer',
  3: 'Vibing',
  4: 'Máquina',
  5: 'Crack',
  6: 'Master',
  7: 'Élite',
  8: 'Authority',
  9: 'Ícono',
  10: 'Leyenda',
};

function getThresholds(level: number): { current: number; next: number } {
  const current = LEVEL_THRESHOLDS[level] ?? 0;
  const nextLevel = Math.min(level + 1, 10);
  const next = LEVEL_THRESHOLDS[nextLevel] ?? LEVEL_THRESHOLDS[10];
  return { current, next };
}

// ── Prompt suggestions ────────────────────────────────────────

const PROMPTS: Array<{ badge: BadgeKey; text: string }> = [
  { badge: 'perfil_estelar', text: 'Activa tu perfil público para ganar +100 ⚡' },
  { badge: 'vision_clara', text: 'Define 3 objetivos estratégicos para desbloquear un emblema' },
  { badge: 'motor_de_ideas', text: 'Crea 5 entregas en tu pipeline para ganar tu próximo emblema' },
  { badge: 'circulo_intimo', text: 'Agrega 5 socios a tu red para ganar tu próximo emblema' },
  { badge: 'promesa_cumplida', text: 'Completa 10 entregas para ganar tu próximo emblema' },
  { badge: 'negocio_en_marcha', text: 'Cobra 5 entregas para desbloquear Negocio en Marcha' },
  { badge: 'directorio_dorado', text: 'Llega a 10 socios y 10 contactos para el Directorio Dorado' },
  { badge: 'creador_imparable', text: 'Completa 25 entregas para ganar Creador Imparable' },
  { badge: 'lluvia_de_billetes', text: 'Cobra 20 entregas para ganar Lluvia de Billetes' },
];

function getPromptText(unlockedBadges: BadgeKey[]): string {
  const unmet = PROMPTS.filter(({ badge }) => !unlockedBadges.includes(badge));
  if (unmet.length === 0) return '¡Eres una Leyenda! Sigue creando ⚡';
  const candidates = unmet.slice(0, 3);
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  return candidates[dayIndex % candidates.length].text;
}

// ── Component ─────────────────────────────────────────────────

interface Props {
  efisystem: EfisystemSnapshot;
  accentHex: string;
  onOpenBadges?: () => void;
}

export default function EfisystemWidget({ efisystem, accentHex, onOpenBadges }: Props) {
  const { totalPoints, currentLevel, unlockedBadges } = efisystem;
  const { current: currentThreshold, next: nextThreshold } = getThresholds(currentLevel);
  const isMaxLevel = currentLevel >= 10;

  const progressPct = isMaxLevel
    ? 100
    : Math.min(
        100,
        ((totalPoints - currentThreshold) / (nextThreshold - currentThreshold)) * 100,
      );

  const promptText = getPromptText(unlockedBadges);

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Lightning size={18} weight="fill" style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
          <span className="text-sm font-semibold text-(--text-primary) truncate">
            Nivel {currentLevel} · {LEVEL_LABELS[currentLevel]}
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
            <span>{nextThreshold.toLocaleString('es')} pts · {LEVEL_LABELS[currentLevel + 1]}</span>
          </div>
        )}
      </div>

      {/* Prompt + Emblemas button */}
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-xs text-(--text-secondary) leading-relaxed">{promptText}</p>
        {onOpenBadges && (
          <button
            type="button"
            onClick={onOpenBadges}
            className="flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${accentHex}22 0%, ${accentHex}38 100%)`,
              color: accentHex,
              border: `1px solid ${accentHex}44`,
            }}
          >
            <Trophy size={13} weight="fill" />
            Placas
          </button>
        )}
      </div>
    </div>
  );
}
