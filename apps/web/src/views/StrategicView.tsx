import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Target,
  TrendUp,
  Users as UsersIcon,
  ListChecks,
  Plus,
  PencilLine,
  Trash,
  FloppyDisk,
} from '@phosphor-icons/react';
import { useAppContext } from '../context/AppContext';
import {
  Button,
  EmptyState,
  IconButton,
  ModalPanel,
  StatusBadge,
  SurfaceCard,
  cx,
} from '../components/ui';
import OverlayModal from '../components/OverlayModal';
import CustomSelect from '../components/CustomSelect';
import { toast } from '../lib/toast';
import { PROFESSION_LABELS } from '../lib/professions';
import type { Goal, GoalAggregation, GoalPriority, GoalStatus, StrategicViewResponse } from '@shared';

const formatCurrency = (v: number) => `$${v.toLocaleString('es-ES')}`;

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function formatTargetDate(isoDate: string): string {
  if (!isoDate) return '';
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function computeTargetDate(createdAtIso: string, months: number): string {
  const base = createdAtIso ? new Date(createdAtIso) : new Date();
  return addMonths(base, months).toISOString().split('T')[0];
}

const GOAL_STATUSES: GoalStatus[] = ['Pendiente', 'En Curso', 'Alcanzado', 'Cancelado'];
const GOAL_PRIORITIES: GoalPriority[] = ['Baja', 'Media', 'Alta'];

const goalStatusToneMap: Record<GoalStatus, 'warning' | 'info' | 'success' | 'neutral'> = {
  Pendiente: 'warning',
  'En Curso': 'info',
  Alcanzado: 'success',
  Cancelado: 'neutral',
};

const priorityColors: Record<string, string> = {
  Alta: 'text-rose-600 dark:text-rose-400',
  Media: 'text-amber-600 dark:text-amber-400',
  Baja: 'text-sky-600 dark:text-sky-400',
};

const fieldClass =
  'w-full rounded-2xl border border-(--line-soft) bg-(--surface-card-strong) px-4 py-3 text-base sm:text-sm font-medium text-(--text-primary) transition-all placeholder:text-(--text-secondary)/70 focus:outline-none focus:ring-2';

const labelClass =
  'mb-2 block text-[11px] font-bold tracking-[0.16em] text-(--text-secondary)/80 uppercase';

function emptyGoalForm(): Omit<Goal, 'id'> & { id: string } {
  return {
    id: '',
    area: '',
    generalGoal: '',
    successMetric: '',
    timeframe: 12,
    targetDate: computeTargetDate(new Date().toISOString(), 12),
    createdAt: '',
    status: 'Pendiente',
    priority: 'Media',
    revenueEstimation: 0,
  };
}

/* ── GoalCard (sidebar item) ──────────────────────────────── */

function GoalListItem({
  item,
  isActive,
  accentHex,
}: {
  item: GoalAggregation;
  isActive: boolean;
  accentHex: string;
}) {
  const { goal, taskCount, totalValue, completedTaskCount } = item;
  const completionPct = taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0;

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-3">
        <div
          className={cx(
            'flex h-11 w-11 items-center justify-center rounded-[0.95rem] text-sm font-black',
            isActive
              ? 'bg-white/85 text-(--text-primary)'
              : 'bg-(--surface-muted) text-(--text-secondary)',
          )}
        >
          <Target size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold leading-tight text-(--text-primary)">
            {goal.generalGoal || 'Sin nombre'}
          </h3>
          <p className="mt-1 text-xs font-medium text-(--text-secondary)">
            {taskCount} tareas · {formatCurrency(totalValue)}
            {taskCount > 0 ? ` · ${completionPct}%` : ''}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── GoalDetail (right pane) ──────────────────────────────── */

function GoalDetail({
  item,
  accentHex,
  accentGradient,
  onEdit,
}: {
  item: GoalAggregation;
  accentHex: string;
  accentGradient: string;
  onEdit: () => void;
}) {
  const { goal, taskCount, totalValue, completedTaskCount, partnerCount, partners } = item;
  const completionPct = taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0;

  return (
    <SurfaceCard className="overflow-hidden p-0">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-3">
              <h2 className="min-w-0 wrap-break-word text-xl font-bold tracking-tight text-(--text-primary)">
                {goal.generalGoal || 'Sin nombre'}
              </h2>
              <IconButton icon={PencilLine} label="Editar objetivo" onClick={onEdit} tone="ghost" />
            </div>
            {goal.area && (
              <p className="mt-1 text-sm font-medium text-(--text-secondary)">{goal.area}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge tone={goalStatusToneMap[goal.status]}>{goal.status}</StatusBadge>
            <span className={cx('text-[11px] font-bold', priorityColors[goal.priority] || 'text-(--text-secondary)')}>
              {goal.priority}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        {taskCount > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-[10px] font-bold text-(--text-secondary)">
              <span>Progreso de tareas</span>
              <span>{completedTaskCount}/{taskCount} ({completionPct}%)</span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-(--surface-inset)">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${completionPct}%`, background: accentGradient }}
              />
            </div>
          </div>
        )}

        {/* Metrics */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-[0.7rem] bg-(--surface-muted)/60 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-(--text-secondary)">
              <ListChecks size={12} />
              <span className="text-[10px] font-bold uppercase tracking-wide">Tareas</span>
            </div>
            <p className="mt-1 text-lg font-black text-(--text-primary)">{taskCount}</p>
          </div>
          <div className="rounded-[0.7rem] bg-(--surface-muted)/60 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-(--text-secondary)">
              <TrendUp size={12} />
              <span className="text-[10px] font-bold uppercase tracking-wide">Valor</span>
            </div>
            <p className="mt-1 text-lg font-black" style={{ color: accentHex }}>
              {formatCurrency(totalValue)}
            </p>
          </div>
          <div className="rounded-[0.7rem] bg-(--surface-muted)/60 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-(--text-secondary)">
              <UsersIcon size={12} />
              <span className="text-[10px] font-bold uppercase tracking-wide">Clientes</span>
            </div>
            <p className="mt-1 text-lg font-black text-(--text-primary)">{partnerCount}</p>
          </div>
        </div>

        {/* Goal details */}
        {(goal.successMetric || goal.timeframe) && (
          <div className="mt-5 space-y-2 rounded-[0.7rem] bg-(--surface-muted)/40 px-4 py-3.5">
            {goal.successMetric && (
              <p className="wrap-break-word text-[12px] text-(--text-secondary)">
                <span className="font-bold text-(--text-primary)">Métrica de éxito:</span> {goal.successMetric}
              </p>
            )}
            {goal.timeframe > 0 && (
              <p className="text-[12px] text-(--text-secondary)">
                <span className="font-bold text-(--text-primary)">Plazo:</span>{' '}
                {goal.timeframe} {goal.timeframe === 1 ? 'mes' : 'meses'}
                {goal.targetDate && (
                  <span className="ml-1.5 font-semibold text-(--text-primary)">
                    · {formatTargetDate(goal.targetDate)}
                  </span>
                )}
              </p>
            )}
          </div>
        )}

        {/* Partners */}
        {partners.length > 0 && (
          <div className="mt-5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-(--text-secondary)">
              Clientes vinculados
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {partners.map((p) => (
                <span
                  key={p.id}
                  className="rounded-[0.5rem] bg-(--surface-card-strong) px-2.5 py-1 text-[11px] font-bold text-(--text-primary)"
                >
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Revenue estimation */}
        {goal.revenueEstimation > 0 && (
          <div className="mt-5 flex items-center justify-between rounded-[0.7rem] bg-(--surface-muted)/40 px-4 py-3">
            <span className="text-[10px] font-bold uppercase tracking-wide text-(--text-secondary)">
              Ingreso estimado
            </span>
            <span className="text-[14px] font-black" style={{ color: accentHex }}>
              {formatCurrency(goal.revenueEstimation)}
            </span>
          </div>
        )}

      </div>
    </SurfaceCard>
  );
}

/* ── GoalFormModal ─────────────────────────────────────────── */

function GoalFormModal({
  initial,
  accentHex,
  accentGradient,
  professionSuggestions,
  onClose,
  onSave,
  onDelete,
}: {
  initial: ReturnType<typeof emptyGoalForm>;
  accentHex: string;
  accentGradient: string;
  professionSuggestions: string[];
  onClose: () => void;
  onSave: (goal: ReturnType<typeof emptyGoalForm>) => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isNew = !initial.id;

  const handleAreaFocus = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (professionSuggestions.length > 0) setShowSuggestions(true);
  };

  const handleAreaBlur = () => {
    hideTimer.current = setTimeout(() => setShowSuggestions(false), 150);
  };

  const handleSuggestionPick = (label: string) => {
    setField('area', label);
    setShowSuggestions(false);
  };

  const setField = <K extends keyof typeof form>(field: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!form.generalGoal.trim()) {
      toast.error('El objetivo general es obligatorio.');
      return;
    }
    onSave(form);
  };

  return (
    <OverlayModal onClose={onClose}>
      <ModalPanel
        title={isNew ? 'Nuevo objetivo' : 'Editar objetivo'}
        description="Define tu meta clave, proyección de ingresos y estado."
        onClose={onClose}
        size="lg"
        footer={
          <div className="flex gap-3">
            {!isNew && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-transparent px-4 py-3 text-sm font-bold text-rose-500 transition-colors hover:bg-rose-50 dark:border-rose-500/20 dark:hover:bg-rose-500/10"
              >
                <Trash size={14} />
                Eliminar
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-(--line-soft) bg-transparent px-4 py-3 text-sm font-bold text-(--text-primary) transition-colors hover:bg-(--surface-muted)/50"
            >
              Cancelar
            </button>
            <Button accentColor={accentGradient} onClick={handleSubmit} className="flex-1">
              <FloppyDisk size={16} />
              {isNew ? 'Crear' : 'Guardar'}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label className={labelClass}>Actividad</label>
            <div className="relative">
              <input
                value={form.area}
                onChange={(e) => setField('area', e.target.value)}
                onFocus={handleAreaFocus}
                onBlur={handleAreaBlur}
                className={cx(fieldClass, 'bg-(--surface-muted)')}
                style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
              />
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 overflow-hidden rounded-2xl border border-(--line-soft) bg-(--surface-card) shadow-lg">
                  {professionSuggestions.map((label) => (
                    <button
                      key={label}
                      type="button"
                      onMouseDown={() => handleSuggestionPick(label)}
                      className="w-full px-4 py-2.5 text-left text-sm font-medium text-(--text-primary) hover:bg-(--surface-muted) transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Objetivo General</label>
            <input
              value={form.generalGoal}
              onChange={(e) => setField('generalGoal', e.target.value)}
              className={cx(fieldClass, 'bg-(--surface-muted)')}
              style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>Métrica de éxito</label>
            <input
              value={form.successMetric}
              onChange={(e) => setField('successMetric', e.target.value)}
              className={cx(fieldClass, 'bg-(--surface-muted)')}
              style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
            />
          </div>
          <div className="sm:col-span-3">
            <label className={labelClass}>
              Plazo &mdash;{' '}
              <span className="normal-case font-semibold tracking-normal text-(--text-primary)">
                {form.timeframe} {form.timeframe === 1 ? 'mes' : 'meses'}
              </span>
              {form.targetDate && (
                <span className="ml-2 normal-case font-normal tracking-normal text-(--text-secondary)/80">
                  · Objetivo al {formatTargetDate(form.targetDate)}
                </span>
              )}
            </label>
            <div className="relative flex items-center gap-3 pt-1">
              <span className="shrink-0 text-[11px] font-bold text-(--text-secondary)">1m</span>
              <input
                type="range"
                min={1}
                max={36}
                step={1}
                value={form.timeframe}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const months = Number(e.target.value);
                  const base = form.createdAt || new Date().toISOString();
                  setForm((prev: ReturnType<typeof emptyGoalForm>) => ({
                    ...prev,
                    timeframe: months,
                    targetDate: computeTargetDate(base, months),
                  }));
                }}
                className="w-full cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-transparent"
                style={{ '--tw-ring-color': accentHex, accentColor: accentHex } as React.CSSProperties}
              />
              <span className="shrink-0 text-[11px] font-bold text-(--text-secondary)">36m</span>
            </div>
          </div>

          <div className="sm:col-span-1">
            <label className={labelClass}>Estado</label>
            <CustomSelect
              value={form.status || 'Pendiente'}
              onChange={(val) => setField('status', val as GoalStatus)}
              options={GOAL_STATUSES.map((s) => ({ value: s, label: s }))}
              buttonStyle={{ '--tw-ring-color': accentHex } as React.CSSProperties}
              buttonClassName="font-medium bg-(--surface-muted)"
            />
          </div>
          <div className="sm:col-span-1">
            <label className={labelClass}>Prioridad</label>
            <CustomSelect
              value={form.priority || 'Media'}
              onChange={(val) => setField('priority', val as GoalPriority)}
              options={GOAL_PRIORITIES.map((s) => ({ value: s, label: s }))}
              buttonStyle={{ '--tw-ring-color': accentHex } as React.CSSProperties}
              buttonClassName="font-medium bg-(--surface-muted)"
            />
          </div>
          <div className="sm:col-span-1">
            <label className={labelClass}>Est. Ingresos (USD)</label>
            <input
              type="number"
              value={form.revenueEstimation || ''}
              onChange={(e) => setField('revenueEstimation', e.target.value ? Number(e.target.value) : 0)}
              className={cx(fieldClass, 'bg-(--surface-muted)')}
              style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
            />
          </div>
        </div>
      </ModalPanel>
    </OverlayModal>
  );
}

/* ── StrategicView ─────────────────────────────────────────── */

export default function StrategicView() {
  const { accentHex, accentGradient, profile, updateProfile, tasks, partners } = useAppContext();

  const professionSuggestions = useMemo(() => {
    const labels: string[] = [];
    const resolveLabel = (key: string) =>
      key === 'other' && profile.customProfession
        ? profile.customProfession
        : PROFESSION_LABELS[key as keyof typeof PROFESSION_LABELS];
    if (profile.primaryProfession) labels.push(resolveLabel(profile.primaryProfession));
    for (const s of profile.secondaryProfessions ?? []) labels.push(resolveLabel(s));
    return labels;
  }, [profile.primaryProfession, profile.secondaryProfessions, profile.customProfession]);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [modalGoal, setModalGoal] = useState<ReturnType<typeof emptyGoalForm> | null>(null);
  const [saving, setSaving] = useState(false);

  const data = useMemo((): StrategicViewResponse => {
    const goals = profile.goals ?? [];
    return {
      goals: goals.map((goal) => {
        const goalTasks = tasks.filter((t) => t.goalId === goal.id);
        const goalPartners = partners.filter((p) => p.goalId === goal.id);
        const completedTasks = goalTasks.filter(
          (t) => t.status === 'Completada' || t.status === 'Cobrado',
        );
        return {
          goal,
          taskCount: goalTasks.length,
          totalValue: goalTasks.reduce((sum, t) => sum + (t.value ?? 0), 0),
          completedTaskCount: completedTasks.length,
          partnerCount: goalPartners.length,
          partners: goalPartners.map((p) => ({ id: p.id, name: p.name })),
        };
      }),
      unassigned: {
        taskCount: tasks.filter((t) => !t.goalId).length,
        totalValue: tasks.filter((t) => !t.goalId).reduce((sum, t) => sum + (t.value ?? 0), 0),
        partnerCount: partners.filter((p) => !p.goalId).length,
      },
    };
  }, [profile.goals, tasks, partners]);

  // Keep selection valid
  useEffect(() => {
    if (data.goals.length === 0) {
      setSelectedGoalId(null);
      return;
    }
    if (!selectedGoalId || !data.goals.some((g) => g.goal.id === selectedGoalId)) {
      setSelectedGoalId(data.goals[0].goal.id);
    }
  }, [data, selectedGoalId]);

  const activeGoal = useMemo(() => {
    return data.goals.find((g) => g.goal.id === selectedGoalId) ?? data.goals[0] ?? null;
  }, [data, selectedGoalId]);

  const saveGoals = async (updatedGoals: Goal[]) => {
    setSaving(true);
    try {
      await updateProfile({ goals: updatedGoals });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`Error al guardar: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateGoal = () => {
    setModalGoal(emptyGoalForm());
  };

  const handleEditGoal = () => {
    if (!activeGoal) return;
    const g = activeGoal.goal;
    setModalGoal({
      ...g,
      timeframe: Number(g.timeframe) || 12,
    });
  };

  const handleDeleteGoal = async () => {
    if (!activeGoal || !profile) return;
    const currentGoals: Goal[] = profile.goals || [];
    const filtered = currentGoals.filter((g) => g.id !== activeGoal.goal.id);
    await saveGoals(filtered);
    toast.success('Objetivo eliminado');
  };

  const handleSaveModal = async (form: ReturnType<typeof emptyGoalForm>) => {
    if (!profile) return;
    const currentGoals: Goal[] = [...(profile.goals || [])];
    const isNew = !form.id;

    if (isNew) {
      const createdAt = new Date().toISOString();
      const newGoal: Goal = {
        ...form,
        id: Math.random().toString(36).substring(2, 10),
        createdAt,
        targetDate: computeTargetDate(createdAt, form.timeframe),
      };
      currentGoals.push(newGoal);
    } else {
      const idx = currentGoals.findIndex((g) => g.id === form.id);
      if (idx >= 0) {
        // Preserve original createdAt; recompute targetDate if timeframe changed
        const original = currentGoals[idx];
        const base = original.createdAt || form.createdAt || new Date().toISOString();
        currentGoals[idx] = {
          ...form,
          createdAt: base,
          targetDate: computeTargetDate(base, form.timeframe),
        } as Goal;
      }
    }

    await saveGoals(currentGoals);
    setModalGoal(null);
    toast.success(isNew ? 'Objetivo creado' : 'Objetivo actualizado');
  };

  return (
    <div className="space-y-5 p-4 pb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 lg:px-8 lg:pt-4 lg:pb-8">
      {/* Main 2-col grid */}
      <div className="grid gap-4 xl:grid-cols-[minmax(310px,0.92fr)_minmax(0,1.08fr)]">
        {/* Left: goal list */}
        <div className="min-w-0 space-y-4 xl:sticky xl:top-4 xl:self-start">
          <SurfaceCard className="overflow-hidden p-3 sm:p-4">
            <div className="mb-3 px-2 pt-1">
              <Button accentColor={accentGradient} onClick={handleCreateGoal} className="w-full py-2.5 text-xs">
                <Plus size={14} weight="regular" />
                Nuevo objetivo
              </Button>
            </div>

            <div className="space-y-2">
              {data && data.goals.map((item) => {
                const isActive = activeGoal?.goal.id === item.goal.id;
                return (
                  <button
                    key={item.goal.id}
                    type="button"
                    onClick={() => setSelectedGoalId(item.goal.id)}
                    className={cx(
                      'w-full rounded-2xl border px-4 py-4 text-left transition-all',
                      isActive
                        ? 'border-transparent bg-(--surface-card-strong) shadow-(--shadow-soft)'
                        : 'border-transparent bg-(--surface-card)/75 hover:bg-(--surface-muted)/90',
                    )}
                    style={isActive ? { borderColor: 'var(--accent-border)', backgroundColor: 'var(--accent-soft)' } : undefined}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <GoalListItem item={item} isActive={isActive} accentHex={accentHex} />
                      <StatusBadge tone={goalStatusToneMap[item.goal.status]}>
                        {item.goal.status}
                      </StatusBadge>
                    </div>
                  </button>
                );
              })}

              {(!data || data.goals.length === 0) && (
                <EmptyState
                  icon={Target}
                  title="Sin objetivos"
                  description="Crea tu primer objetivo para empezar a mapear el esfuerzo estratégico."
                  className="border-dashed"
                  action={
                    <Button accentColor={accentGradient} onClick={handleCreateGoal}>
                      <Plus size={16} weight="regular" />
                      Nuevo objetivo
                    </Button>
                  }
                />
              )}
            </div>
          </SurfaceCard>

        </div>

        {/* Right: detail pane */}
        <div className="min-w-0 space-y-4">
          {activeGoal ? (
            <GoalDetail
              item={activeGoal}
              accentHex={accentHex}
              accentGradient={accentGradient}
              onEdit={handleEditGoal}
            />
          ) : (
            <SurfaceCard className="p-8">
              <EmptyState
                icon={Target}
                title="Selecciona un objetivo"
                description="Elige un objetivo de la lista o crea uno nuevo para ver los detalles."
                className="py-12"
              />
            </SurfaceCard>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalGoal && (
        <GoalFormModal
          initial={modalGoal}
          accentHex={accentHex}
          accentGradient={accentGradient}
          professionSuggestions={professionSuggestions}
          onClose={() => setModalGoal(null)}
          onSave={handleSaveModal}
          onDelete={modalGoal.id ? () => { setModalGoal(null); handleDeleteGoal(); } : undefined}
        />
      )}
    </div>
  );
}
