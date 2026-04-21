import React, { useRef, useState } from 'react';
import {
  Article,
  Broadcast,
  Briefcase,
  Buildings,
  Camera,
  ChatsCircle,
  Check,
  Compass,
  DotsThreeCircle,
  Headphones,
  Microphone,
  MonitorPlay,
  Presentation,
  Radio,
  Star,
  Target,
} from '@phosphor-icons/react';
import type { FreelancerType } from '@shared';
import { useAppContext } from '../context/AppContext';
import { PROFESSION_LABELS } from '../lib/professions';

// ─── Profession catalogue ────────────────────────────────────────────────────

const PROFESSIONS: { value: FreelancerType; Icon: React.ElementType }[] = [
  { value: 'content_creator',   Icon: Star },
  { value: 'podcaster',         Icon: Microphone },
  { value: 'streamer',          Icon: MonitorPlay },
  { value: 'radio',             Icon: Radio },
  { value: 'photographer',      Icon: Camera },
  { value: 'copywriter',        Icon: Article },
  { value: 'community_manager', Icon: ChatsCircle },
  { value: 'host_mc',           Icon: Broadcast },
  { value: 'speaker',           Icon: Presentation },
  { value: 'dj',                Icon: Headphones },
  { value: 'recruiter',         Icon: Briefcase },
  { value: 'coach',             Icon: Compass },
  { value: 'other',             Icon: DotsThreeCircle },
];

// ─── Background decoration ───────────────────────────────────────────────────

const BRAND_ORANGE = '#FF4D3D';
const BRAND_PURPLE = '#D61B6D';

function Glows() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div
        className="absolute -top-32 right-[-10%] h-112 w-md rounded-full blur-[120px] opacity-30"
        style={{ backgroundColor: BRAND_ORANGE }}
      />
      <div
        className="absolute bottom-[-8%] left-[-8%] h-96 w-96 rounded-full blur-[120px] opacity-25"
        style={{ backgroundColor: BRAND_PURPLE }}
      />
    </div>
  );
}

// ─── Progress dots ───────────────────────────────────────────────────────────

const STEPS = ['profession', 'partner', 'goal'] as const;
type Step = (typeof STEPS)[number];

const STEP_LABELS = ['Perfil', 'Colaboración', 'Objetivo'] as const;

function ProgressDots({ current }: { current: Step }) {
  const idx = STEPS.indexOf(current);
  return (
    <div className="mb-10 flex items-center justify-center gap-6">
      {STEPS.map((s, i) => {
        const completed = i < idx;
        const active = i === idx;
        return (
          <div key={s} className="flex flex-col items-center gap-1.5">
            <div
              className="flex items-center justify-center rounded-full transition-all duration-300"
              style={{
                width: '2rem',
                height: '2rem',
                backgroundColor: completed
                  ? 'var(--accent-color)'
                  : active
                    ? 'color-mix(in srgb, var(--accent-color) 15%, transparent)'
                    : 'var(--surface-card)',
                borderWidth: '2px',
                borderColor: completed
                  ? 'var(--accent-color)'
                  : active
                    ? 'var(--accent-color)'
                    : 'var(--border-subtle)',
                borderStyle: 'solid',
                animation: completed ? 'check-pop 0.22s ease-out' : 'none',
              }}
            >
              {completed && <Check size={14} weight="bold" color="var(--accent-foreground)" />}
            </div>
            <span
              className="text-[0.625rem] font-semibold transition-colors duration-300"
              style={{
                color: completed
                  ? 'var(--accent-color)'
                  : active
                    ? 'var(--text-secondary)'
                    : 'var(--text-tertiary)',
              }}
            >
              {STEP_LABELS[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function WelcomeOnboarding({ onComplete }: { onComplete: () => void }) {
  const { addPartner, updateProfile, profile } = useAppContext();

  // Profession step — ordered list; index 0 is primary, rest are secondaries
  const [selected, setSelected] = useState<FreelancerType[]>([]);
  const [customProfession, setCustomProfession] = useState('');

  // Partner / goal steps
  const [step, setStep] = useState<Step>('profession');
  const [partnerName, setPartnerName] = useState('');
  const [goalText, setGoalText] = useState('');
  const [saving, setSaving] = useState(false);

  const partnerRef = useRef<HTMLInputElement>(null);
  const goalRef = useRef<HTMLInputElement>(null);

  // ── Profession handlers ──────────────────────────────────────────────────

  const toggleProfession = (value: FreelancerType) => {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const needsCustomLabel = selected.includes('other');

  const handleProfessionNext = async () => {
    if (selected.length === 0) return;
    if (needsCustomLabel && !customProfession.trim()) return;
    const [primary, ...secondaries] = selected;
    setSaving(true);
    try {
      await updateProfile({
        primaryProfession: primary,
        secondaryProfessions: secondaries,
        customProfession: needsCustomLabel ? customProfession.trim() : '',
      });
    } catch {
      // Don't block on failure
    }
    setSaving(false);
    setStep('partner');
    setTimeout(() => partnerRef.current?.focus(), 50);
  };

  // ── Partner handler ──────────────────────────────────────────────────────

  const handlePartnerNext = () => {
    setStep('goal');
    setTimeout(() => goalRef.current?.focus(), 50);
  };

  // ── Finish handler ───────────────────────────────────────────────────────

  const handleFinish = async () => {
    setSaving(true);
    try {
      if (partnerName.trim()) {
        await addPartner({
          name: partnerName.trim(),
          status: 'Activo',
          contacts: [],
          source: 'onboarding',
        });
      }
      if (goalText.trim()) {
        const now = new Date();
        const targetDate = new Date(now);
        targetDate.setMonth(targetDate.getMonth() + 12);
        await updateProfile({
          goals: [
            ...profile.goals,
            {
              id: crypto.randomUUID(),
              area: 'Negocio',
              generalGoal: goalText.trim(),
              successMetric: '',
              timeframe: 12,
              targetDate: targetDate.toISOString(),
              createdAt: now.toISOString(),
              status: 'En Curso',
              priority: 'Alta',
              revenueEstimation: 0,
            },
          ],
        });
      }
    } catch {
      // Don't block on failure
    }
    setSaving(false);
    onComplete();
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-200 overflow-y-auto bg-(--surface-app) font-sans">
      <Glows />

      <div className="relative z-10 mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-6 py-10">
        <ProgressDots current={step} />

        {step === 'profession' && (
          <ProfessionStep
            selected={selected}
            saving={saving}
            customProfession={customProfession}
            onCustomProfessionChange={setCustomProfession}
            onToggle={toggleProfession}
            onNext={handleProfessionNext}
          />
        )}

        {step === 'partner' && (
          <DataStep
            inputRef={partnerRef}
            icon={<Buildings size={28} weight="duotone" style={{ color: 'var(--accent-color)' }} />}
            title="¿Con quién estás trabajando?"
            subtitle="Escribe el nombre de una marca o cliente con el que colaboras ahora mismo."
            value={partnerName}
            onChange={setPartnerName}
            placeholder="Ej. Nike, Marca Bonita, Juan García…"
            ctaLabel="Continuar"
            onNext={handlePartnerNext}
          />
        )}

        {step === 'goal' && (
          <DataStep
            inputRef={goalRef}
            icon={<Target size={28} weight="duotone" style={{ color: 'var(--accent-color)' }} />}
            title="¿Cuál es tu objetivo este año?"
            subtitle="Tu objetivo estratégico principal. Puedes editarlo después con más detalle."
            value={goalText}
            onChange={setGoalText}
            placeholder="Ej. Cerrar 10 colaboraciones pagas este año…"
            ctaLabel="Empecemos"
            saving={saving}
            onNext={handleFinish}
          />
        )}
      </div>
    </div>
  );
}

// ─── Profession step ─────────────────────────────────────────────────────────

function ProfessionStep({
  selected,
  saving,
  customProfession,
  onCustomProfessionChange,
  onToggle,
  onNext,
}: {
  selected: FreelancerType[];
  saving: boolean;
  customProfession: string;
  onCustomProfessionChange: (v: string) => void;
  onToggle: (v: FreelancerType) => void;
  onNext: () => void;
}) {
  const needsCustomLabel = selected.includes('other');
  const canContinue = selected.length > 0 && (!needsCustomLabel || customProfession.trim());
  return (
    <div>
      <h2 className="mb-1 text-center text-xl font-bold text-(--text-primary)">
        ¿Qué actividades te definen?
      </h2>
      <p className="mb-6 text-center text-sm text-(--text-secondary)">
        Toca las que practiques. La primera será tu actividad principal.
      </p>

      <div className="grid grid-cols-2 gap-2.5">
        {PROFESSIONS.map(({ value, Icon }) => {
          const order = selected.indexOf(value);
          const isSelected = order >= 0;
          const isPrimary = order === 0;
          const label = PROFESSION_LABELS[value];
          return (
            <button
              key={value}
              type="button"
              onClick={() => onToggle(value)}
              className="relative flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all duration-150 active:scale-[0.97]"
              style={{
                borderColor: isSelected ? 'var(--accent-color)' : 'var(--border-subtle)',
                backgroundColor: isSelected ? 'color-mix(in srgb, var(--accent-color) 10%, transparent)' : 'var(--surface-card)',
              }}
            >
              <Icon
                size={20}
                weight="duotone"
                style={{ color: isSelected ? 'var(--accent-color)' : 'var(--text-secondary)', flexShrink: 0 }}
              />
              <span
                className="text-xs font-semibold leading-tight"
                style={{ color: isSelected ? 'var(--accent-color)' : 'var(--text-primary)' }}
              >
                {label}
              </span>

              {isSelected && (
                <span
                  className="absolute -top-1.5 -right-1.5 flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none shadow-sm"
                  style={{
                    background: 'var(--accent-gradient, var(--accent-color))',
                    color: 'var(--accent-foreground)',
                    minHeight: '18px',
                  }}
                >
                  {isPrimary ? <>Principal</> : order + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom profession input — appears when "other" is selected */}
      {needsCustomLabel && (
        <div className="mt-5">
          <p className="mb-2.5 text-xs font-medium text-(--text-secondary)">
            ¿Cuál es tu profesión?
          </p>
          <input
            type="text"
            value={customProfession}
            onChange={(e) => onCustomProfessionChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && canContinue && !saving && onNext()}
            placeholder="Ej. Diseñador gráfico, Productor musical…"
            className="w-full rounded-2xl border border-(--border-subtle) bg-(--surface-card) px-4 py-3.5 text-sm text-(--text-primary) outline-none placeholder:text-(--text-tertiary) focus:border-(--accent-color) focus:ring-2 focus:ring-(--accent-color)/20 transition-all"
            autoFocus
          />
        </div>
      )}

      <button
        type="button"
        disabled={!canContinue || saving}
        onClick={onNext}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: 'var(--accent-gradient, var(--accent-color))',
          color: 'var(--accent-foreground)',
        }}
      >
        {saving ? 'Guardando…' : 'Continuar'}
      </button>
    </div>
  );
}

// ─── Shared data-entry step (partner + goal) ─────────────────────────────────

function DataStep({
  inputRef,
  icon,
  title,
  subtitle,
  value,
  onChange,
  placeholder,
  ctaLabel,
  saving = false,
  onNext,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  ctaLabel: string;
  saving?: boolean;
  onNext: () => void;
}) {
  return (
    <div>
      <div className="mb-6 flex justify-center">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ backgroundColor: 'var(--surface-card)' }}
        >
          {icon}
        </div>
      </div>
      <h2 className="mb-2 text-center text-xl font-bold text-(--text-primary)">{title}</h2>
      <p className="mb-8 text-center text-sm text-(--text-secondary)">{subtitle}</p>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !saving && onNext()}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-(--border-subtle) bg-(--surface-card) px-4 py-3.5 text-sm text-(--text-primary) outline-none placeholder:text-(--text-tertiary) focus:border-(--accent-color) focus:ring-2 focus:ring-(--accent-color)/20 transition-all"
      />
      <button
        type="button"
        disabled={saving}
        onClick={onNext}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: 'var(--accent-gradient, var(--accent-color))',
          color: 'var(--accent-foreground)',
        }}
      >
        {saving ? 'Guardando…' : ctaLabel}
      </button>
      <button
        type="button"
        disabled={saving}
        onClick={onNext}
        className="mt-3 w-full py-2 text-xs text-(--text-tertiary) hover:text-(--text-secondary) transition-colors disabled:opacity-50"
      >
        Omitir por ahora
      </button>
    </div>
  );
}
