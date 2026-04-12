import React, { useRef, useState } from 'react';
import {
  ArrowRight,
  Article,
  Broadcast,
  Briefcase,
  Buildings,
  Camera,
  ChatsCircle,
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

const BRAND_ORANGE = '#F56040';
const BRAND_PURPLE = '#833AB4';

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

function ProgressDots({ current }: { current: Step }) {
  const idx = STEPS.indexOf(current);
  return (
    <div className="mb-10 flex items-center justify-center gap-2">
      {STEPS.map((s, i) => (
        <div
          key={s}
          className="h-1.5 rounded-full transition-all duration-300"
          style={{
            width: i === idx ? '2rem' : '0.5rem',
            backgroundColor: i === idx ? 'var(--accent)' : 'var(--text-tertiary)',
            opacity: i === idx ? 1 : i < idx ? 0.6 : 0.3,
          }}
        />
      ))}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function WelcomeOnboarding({ onComplete }: { onComplete: () => void }) {
  const { addPartner, updateProfile, profile } = useAppContext();

  // Profession step
  const [primary, setPrimary] = useState<FreelancerType | null>(null);
  const [secondaries, setSecondaries] = useState<FreelancerType[]>([]);
  const [customProfession, setCustomProfession] = useState('');

  // Partner / goal steps
  const [step, setStep] = useState<Step>('profession');
  const [partnerName, setPartnerName] = useState('');
  const [goalText, setGoalText] = useState('');
  const [saving, setSaving] = useState(false);

  const partnerRef = useRef<HTMLInputElement>(null);
  const goalRef = useRef<HTMLInputElement>(null);

  // ── Profession handlers ──────────────────────────────────────────────────

  const toggleSecondary = (value: FreelancerType) => {
    setSecondaries((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const needsCustomLabel =
    primary === 'other' || secondaries.includes('other');

  const handleProfessionNext = async () => {
    if (!primary) return;
    if (needsCustomLabel && !customProfession.trim()) return;
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
            primary={primary}
            secondaries={secondaries}
            saving={saving}
            customProfession={customProfession}
            onCustomProfessionChange={setCustomProfession}
            onSelectPrimary={setPrimary}
            onToggleSecondary={toggleSecondary}
            onNext={handleProfessionNext}
          />
        )}

        {step === 'partner' && (
          <DataStep
            inputRef={partnerRef}
            icon={<Buildings size={28} weight="duotone" style={{ color: 'var(--accent)' }} />}
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
            icon={<Target size={28} weight="duotone" style={{ color: 'var(--accent)' }} />}
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
  primary,
  secondaries,
  saving,
  customProfession,
  onCustomProfessionChange,
  onSelectPrimary,
  onToggleSecondary,
  onNext,
}: {
  primary: FreelancerType | null;
  secondaries: FreelancerType[];
  saving: boolean;
  customProfession: string;
  onCustomProfessionChange: (v: string) => void;
  onSelectPrimary: (v: FreelancerType) => void;
  onToggleSecondary: (v: FreelancerType) => void;
  onNext: () => void;
}) {
  const needsCustomLabel = primary === 'other' || secondaries.includes('other');
  const canContinue = primary && (!needsCustomLabel || customProfession.trim());
  return (
    <div>
      <h2 className="mb-1 text-center text-xl font-bold text-(--text-primary)">
        ¿Cuál es tu actividad principal?
      </h2>
      <p className="mb-6 text-center text-sm text-(--text-secondary)">
        Selecciona la que mejor te define.
      </p>

      {/* Primary grid — 2 columns */}
      <div className="grid grid-cols-2 gap-2.5">
        {PROFESSIONS.map(({ value, Icon }) => {
          const selected = primary === value;
          const label = PROFESSION_LABELS[value];
          return (
            <button
              key={value}
              type="button"
              onClick={() => onSelectPrimary(value)}
              className="flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all duration-150 active:scale-[0.97]"
              style={{
                borderColor: selected ? 'var(--accent)' : 'var(--border-subtle)',
                backgroundColor: selected ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--surface-card)',
              }}
            >
              <Icon
                size={20}
                weight="duotone"
                style={{ color: selected ? 'var(--accent)' : 'var(--text-secondary)', flexShrink: 0 }}
              />
              <span
                className="text-xs font-semibold leading-tight"
                style={{ color: selected ? 'var(--accent)' : 'var(--text-primary)' }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Secondary section — appears once primary is chosen */}
      {primary && (
        <div className="mt-5">
          <p className="mb-2.5 text-xs font-medium text-(--text-secondary)">
            ¿También haces alguna de estas? <span className="text-(--text-tertiary)">(opcional)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {PROFESSIONS.map(({ value }) => {
              const isPrimary = value === primary;
              const active = secondaries.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => !isPrimary && onToggleSecondary(value)}
                  disabled={isPrimary}
                  className="rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150 disabled:cursor-not-allowed"
                  style={{
                    borderColor: isPrimary ? 'var(--accent)' : active ? 'var(--accent)' : 'var(--border-subtle)',
                    backgroundColor: isPrimary ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : active ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--surface-card)',
                    color: isPrimary ? 'var(--accent)' : active ? 'var(--accent)' : 'var(--text-secondary)',
                    opacity: isPrimary ? 0.45 : 1,
                  }}
                >
                  {PROFESSION_LABELS[value]}
                </button>
              );
            })}
          </div>
        </div>
      )}

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
            className="w-full rounded-2xl border border-(--border-subtle) bg-(--surface-card) px-4 py-3.5 text-sm text-(--text-primary) outline-none placeholder:text-(--text-tertiary) focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/20 transition-all"
            autoFocus
          />
        </div>
      )}

      <button
        type="button"
        disabled={!canContinue || saving}
        onClick={onNext}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-(--accent) py-4 text-sm font-bold text-(--accent-foreground) transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saving ? 'Guardando…' : 'Continuar'}
        {!saving && <ArrowRight size={16} />}
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
        className="w-full rounded-2xl border border-(--border-subtle) bg-(--surface-card) px-4 py-3.5 text-sm text-(--text-primary) outline-none placeholder:text-(--text-tertiary) focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/20 transition-all"
      />
      <button
        type="button"
        disabled={saving}
        onClick={onNext}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-(--accent) py-4 text-sm font-bold text-(--accent-foreground) transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Guardando…' : ctaLabel}
        {!saving && <ArrowRight size={16} />}
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
