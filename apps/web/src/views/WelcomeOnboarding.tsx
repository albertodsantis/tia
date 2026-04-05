import React, { useRef, useState } from 'react';
import { ArrowRight, Buildings, Target } from '@phosphor-icons/react';
import { useAppContext } from '../context/AppContext';

const BRAND_ORANGE = '#F56040';
const BRAND_PURPLE = '#833AB4';

type Step = 'partner' | 'goal';

export default function WelcomeOnboarding({ onComplete }: { onComplete: () => void }) {
  const { addPartner, updateProfile, profile } = useAppContext();
  const [step, setStep] = useState<Step>('partner');
  const [partnerName, setPartnerName] = useState('');
  const [goalText, setGoalText] = useState('');
  const [saving, setSaving] = useState(false);
  const partnerRef = useRef<HTMLInputElement>(null);
  const goalRef = useRef<HTMLInputElement>(null);

  const handlePartnerNext = () => {
    setStep('goal');
    setTimeout(() => goalRef.current?.focus(), 50);
  };

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
      // Don't block progress on API failures
    }
    setSaving(false);
    onComplete();
  };

  const isPartnerStep = step === 'partner';

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
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Progress dots */}
        <div className="mb-10 flex items-center justify-center gap-2">
          <div
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: isPartnerStep ? '2rem' : '0.5rem',
              backgroundColor: isPartnerStep ? 'var(--accent)' : 'var(--text-tertiary)',
              opacity: isPartnerStep ? 1 : 0.4,
            }}
          />
          <div
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: !isPartnerStep ? '2rem' : '0.5rem',
              backgroundColor: !isPartnerStep ? 'var(--accent)' : 'var(--text-tertiary)',
              opacity: !isPartnerStep ? 1 : 0.4,
            }}
          />
        </div>

        {/* Step content */}
        {isPartnerStep ? (
          <div key="partner">
            <div className="mb-6 flex justify-center">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ backgroundColor: 'var(--surface-card)' }}
              >
                <Buildings size={28} weight="duotone" style={{ color: 'var(--accent)' }} />
              </div>
            </div>
            <h2 className="mb-2 text-center text-xl font-bold text-[var(--text-primary)]">
              ¿Con quién estás trabajando?
            </h2>
            <p className="mb-8 text-center text-sm text-[var(--text-secondary)]">
              Escribe el nombre de una marca o cliente con el que colaboras ahora mismo.
            </p>
            <input
              ref={partnerRef}
              autoFocus
              type="text"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePartnerNext()}
              placeholder="Ej. Nike, Marca Bonita, Juan García…"
              className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3.5 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all"
            />
            <button
              type="button"
              onClick={handlePartnerNext}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] py-4 text-sm font-bold text-[var(--accent-foreground)] transition-all active:scale-[0.98] hover:opacity-90"
            >
              Continuar <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={handlePartnerNext}
              className="mt-3 w-full py-2 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            >
              Omitir por ahora
            </button>
          </div>
        ) : (
          <div key="goal">
            <div className="mb-6 flex justify-center">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ backgroundColor: 'var(--surface-card)' }}
              >
                <Target size={28} weight="duotone" style={{ color: 'var(--accent)' }} />
              </div>
            </div>
            <h2 className="mb-2 text-center text-xl font-bold text-[var(--text-primary)]">
              ¿Cuál es tu objetivo este año?
            </h2>
            <p className="mb-8 text-center text-sm text-[var(--text-secondary)]">
              Tu objetivo estratégico principal. Puedes editarlo después con más detalle.
            </p>
            <input
              ref={goalRef}
              type="text"
              value={goalText}
              onChange={(e) => setGoalText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !saving && handleFinish()}
              placeholder="Ej. Cerrar 10 colaboraciones pagas este año…"
              className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3.5 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all"
            />
            <button
              type="button"
              disabled={saving}
              onClick={handleFinish}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] py-4 text-sm font-bold text-[var(--accent-foreground)] transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Guardando…' : 'Empecemos'}
              {!saving && <ArrowRight size={16} />}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleFinish}
              className="mt-3 w-full py-2 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors disabled:opacity-50"
            >
              Omitir por ahora
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
