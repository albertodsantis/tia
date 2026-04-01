import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Target,
  TrendUp,
  Users as UsersIcon,
  ListChecks,
  CircleNotch,
  Warning,
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
import { appApi } from '../lib/api';
import { toast } from '../lib/toast';
import type { Goal, GoalAggregation, GoalPriority, GoalStatus, StrategicViewResponse } from '@shared';

const formatCurrency = (v: number) => `$${v.toLocaleString('es-ES')}`;

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
  'w-full rounded-[1rem] border border-[var(--line-soft)] bg-[var(--surface-card-strong)] px-4 py-3 text-base sm:text-sm font-medium text-[var(--text-primary)] transition-all placeholder:text-[var(--text-secondary)]/70 focus:outline-none focus:ring-2';

const labelClass =
  'mb-2 block text-[11px] font-bold tracking-[0.16em] text-[var(--text-secondary)]/80 uppercase';

function emptyGoalForm(): Omit<Goal, 'id'> & { id: string } {
  return {
    id: '',
    area: '',
    generalGoal: '',
    successMetric: '',
    specificTarget: '',
    timeframe: '1 año',
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
              ? 'bg-white/85 text-[var(--text-primary)]'
              : 'bg-[var(--surface-muted)] text-[var(--text-secondary)]',
          )}
        >
          <Target size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold leading-tight text-[var(--text-primary)]">
            {goal.generalGoal || 'Sin nombre'}
          </h3>
          <p className="mt-1 text-xs font-medium text-[var(--text-secondary)]">
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
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                {goal.generalGoal || 'Sin nombre'}
              </h2>
              <IconButton icon={PencilLine} label="Editar objetivo" onClick={onEdit} tone="ghost" />
            </div>
            {goal.area && (
              <p className="mt-1 text-sm font-medium text-[var(--text-secondary)]">{goal.area}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge tone={goalStatusToneMap[goal.status]}>{goal.status}</StatusBadge>
            <span className={cx('text-[11px] font-bold', priorityColors[goal.priority] || 'text-[var(--text-secondary)]')}>
              {goal.priority}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        {taskCount > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-[10px] font-bold text-[var(--text-secondary)]">
              <span>Progreso de tareas</span>
              <span>{completedTaskCount}/{taskCount} ({completionPct}%)</span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[var(--surface-inset)]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${completionPct}%`, background: accentGradient }}
              />
            </div>
          </div>
        )}

        {/* Metrics */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-[0.7rem] bg-[var(--surface-muted)]/60 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
              <ListChecks size={12} />
              <span className="text-[10px] font-bold uppercase tracking-wide">Tareas</span>
            </div>
            <p className="mt-1 text-lg font-black text-[var(--text-primary)]">{taskCount}</p>
          </div>
          <div className="rounded-[0.7rem] bg-[var(--surface-muted)]/60 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
              <TrendUp size={12} />
              <span className="text-[10px] font-bold uppercase tracking-wide">Valor</span>
            </div>
            <p className="mt-1 text-lg font-black" style={{ color: accentHex }}>
              {formatCurrency(totalValue)}
            </p>
          </div>
          <div className="rounded-[0.7rem] bg-[var(--surface-muted)]/60 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
              <UsersIcon size={12} />
              <span className="text-[10px] font-bold uppercase tracking-wide">Marcas</span>
            </div>
            <p className="mt-1 text-lg font-black text-[var(--text-primary)]">{partnerCount}</p>
          </div>
        </div>

        {/* Goal details */}
        {(goal.successMetric || goal.specificTarget || goal.timeframe) && (
          <div className="mt-5 space-y-2 rounded-[0.7rem] bg-[var(--surface-muted)]/40 px-4 py-3.5">
            {goal.successMetric && (
              <p className="text-[12px] text-[var(--text-secondary)]">
                <span className="font-bold text-[var(--text-primary)]">Métrica de éxito:</span> {goal.successMetric}
              </p>
            )}
            {goal.specificTarget && (
              <p className="text-[12px] text-[var(--text-secondary)]">
                <span className="font-bold text-[var(--text-primary)]">Meta específica:</span> {goal.specificTarget}
              </p>
            )}
            {goal.timeframe && (
              <p className="text-[12px] text-[var(--text-secondary)]">
                <span className="font-bold text-[var(--text-primary)]">Plazo:</span> {goal.timeframe}
              </p>
            )}
          </div>
        )}

        {/* Partners */}
        {partners.length > 0 && (
          <div className="mt-5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">
              Marcas vinculadas
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {partners.map((p) => (
                <span
                  key={p.id}
                  className="rounded-[0.5rem] bg-[var(--surface-card-strong)] px-2.5 py-1 text-[11px] font-bold text-[var(--text-primary)]"
                >
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Revenue estimation */}
        {goal.revenueEstimation > 0 && (
          <div className="mt-5 flex items-center justify-between rounded-[0.7rem] bg-[var(--surface-muted)]/40 px-4 py-3">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">
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
  onClose,
  onSave,
  onDelete,
}: {
  initial: ReturnType<typeof emptyGoalForm>;
  accentHex: string;
  accentGradient: string;
  onClose: () => void;
  onSave: (goal: ReturnType<typeof emptyGoalForm>) => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState(initial);
  const isNew = !initial.id;

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
                className="flex items-center gap-2 rounded-[1rem] border border-rose-200 bg-transparent px-4 py-3 text-sm font-bold text-rose-500 transition-colors hover:bg-rose-50 dark:border-rose-500/20 dark:hover:bg-rose-500/10"
              >
                <Trash size={14} />
                Eliminar
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-[1rem] border border-[var(--line-soft)] bg-transparent px-4 py-3 text-sm font-bold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-muted)]/50"
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
            <label className={labelClass}>Área / Vertical</label>
            <input
              value={form.area}
              onChange={(e) => setField('area', e.target.value)}
              className={cx(fieldClass, 'bg-[var(--surface-muted)]')}
              style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Objetivo General</label>
            <input
              value={form.generalGoal}
              onChange={(e) => setField('generalGoal', e.target.value)}
              className={cx(fieldClass, 'bg-[var(--surface-muted)]')}
              style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
            />
          </div>

          <div className="sm:col-span-1">
            <label className={labelClass}>Métrica de éxito</label>
            <input
              value={form.successMetric}
              onChange={(e) => setField('successMetric', e.target.value)}
              className={cx(fieldClass, 'bg-[var(--surface-muted)]')}
              style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
            />
          </div>
          <div className="sm:col-span-1">
            <label className={labelClass}>Meta específica</label>
            <input
              value={form.specificTarget}
              onChange={(e) => setField('specificTarget', e.target.value)}
              className={cx(fieldClass, 'bg-[var(--surface-muted)]')}
              style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
            />
          </div>
          <div className="sm:col-span-1">
            <label className={labelClass}>Plazo</label>
            <CustomSelect
              value={form.timeframe || '1 año'}
              onChange={(val) => setField('timeframe', val)}
              options={[
                { value: '1 año', label: '1 año' },
                { value: '2 años', label: '2 años' },
                { value: '3 años', label: '3 años' },
              ]}
              buttonStyle={{ '--tw-ring-color': accentHex } as React.CSSProperties}
              buttonClassName="font-medium bg-[var(--surface-muted)]"
            />
          </div>

          <div className="sm:col-span-1">
            <label className={labelClass}>Estado</label>
            <CustomSelect
              value={form.status || 'Pendiente'}
              onChange={(val) => setField('status', val as GoalStatus)}
              options={GOAL_STATUSES.map((s) => ({ value: s, label: s }))}
              buttonStyle={{ '--tw-ring-color': accentHex } as React.CSSProperties}
              buttonClassName="font-medium bg-[var(--surface-muted)]"
            />
          </div>
          <div className="sm:col-span-1">
            <label className={labelClass}>Prioridad</label>
            <CustomSelect
              value={form.priority || 'Media'}
              onChange={(val) => setField('priority', val as GoalPriority)}
              options={GOAL_PRIORITIES.map((s) => ({ value: s, label: s }))}
              buttonStyle={{ '--tw-ring-color': accentHex } as React.CSSProperties}
              buttonClassName="font-medium bg-[var(--surface-muted)]"
            />
          </div>
          <div className="sm:col-span-1">
            <label className={labelClass}>Est. Ingresos (USD)</label>
            <input
              type="number"
              value={form.revenueEstimation || ''}
              onChange={(e) => setField('revenueEstimation', e.target.value ? Number(e.target.value) : 0)}
              className={cx(fieldClass, 'bg-[var(--surface-muted)]')}
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
  const { accentHex, accentGradient, profile, updateProfile } = useAppContext();
  const [data, setData] = useState<StrategicViewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [modalGoal, setModalGoal] = useState<ReturnType<typeof emptyGoalForm> | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    appApi.getStrategicView()
      .then((res) => {
        setData(res);
        setError(null);
        // Auto-select first goal if nothing selected
        if (!selectedGoalId && res.goals.length > 0) {
          setSelectedGoalId(res.goals[0].goal.id);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar vista estratégica'))
      .finally(() => setLoading(false));
  }, [selectedGoalId]);

  useEffect(() => { loadData(); }, []);

  // Keep selection valid
  useEffect(() => {
    if (!data) return;
    if (data.goals.length === 0) {
      setSelectedGoalId(null);
      return;
    }
    if (!selectedGoalId || !data.goals.some((g) => g.goal.id === selectedGoalId)) {
      setSelectedGoalId(data.goals[0].goal.id);
    }
  }, [data, selectedGoalId]);

  const activeGoal = useMemo(() => {
    if (!data) return null;
    return data.goals.find((g) => g.goal.id === selectedGoalId) ?? data.goals[0] ?? null;
  }, [data, selectedGoalId]);

  const totals = useMemo(() => {
    if (!data) return { goals: 0, tasks: 0, value: 0, partners: 0 };
    return {
      goals: data.goals.length,
      tasks: data.goals.reduce((s, g) => s + g.taskCount, 0) + data.unassigned.taskCount,
      value: data.goals.reduce((s, g) => s + g.totalValue, 0) + data.unassigned.totalValue,
      partners: data.goals.reduce((s, g) => s + g.partnerCount, 0) + data.unassigned.partnerCount,
    };
  }, [data]);

  const saveGoals = async (updatedGoals: Goal[]) => {
    setSaving(true);
    try {
      await updateProfile({ goals: updatedGoals });
      loadData();
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
    setModalGoal({ ...activeGoal.goal });
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
      const newGoal: Goal = {
        ...form,
        id: Math.random().toString(36).substring(2, 10),
      };
      currentGoals.push(newGoal);
    } else {
      const idx = currentGoals.findIndex((g) => g.id === form.id);
      if (idx >= 0) {
        currentGoals[idx] = form as Goal;
      }
    }

    await saveGoals(currentGoals);
    setModalGoal(null);
    toast.success(isNew ? 'Objetivo creado' : 'Objetivo actualizado');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <CircleNotch size={24} className="animate-spin text-[var(--text-secondary)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 lg:px-8">
        <SurfaceCard className="p-6 text-center">
          <Warning size={32} className="mx-auto text-amber-500" />
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{error}</p>
        </SurfaceCard>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 pb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 lg:px-8 lg:pt-4 lg:pb-8">
      {/* Summary KPIs */}
      <div className="flex flex-wrap gap-2">
        {[
          { icon: Target, label: 'Objetivos', value: String(totals.goals) },
          { icon: ListChecks, label: 'Tareas', value: String(totals.tasks) },
          { icon: TrendUp, label: 'Valor', value: formatCurrency(totals.value) },
          { icon: UsersIcon, label: 'Marcas', value: String(totals.partners) },
        ].map((item) => (
          <div key={item.label} className="inline-flex items-center gap-3 px-3 py-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: `${accentHex}14`, color: accentHex }}
            >
              <item.icon size={15} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-[0.18em] text-[var(--text-secondary)]/70 uppercase">
                {item.label}
              </p>
              <p className="text-sm font-bold text-[var(--text-primary)]">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main 2-col grid */}
      <div className="grid gap-4 xl:grid-cols-[minmax(310px,0.92fr)_minmax(0,1.08fr)]">
        {/* Left: goal list */}
        <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <SurfaceCard className="p-3 sm:p-4">
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
                      'w-full rounded-[1rem] border px-4 py-4 text-left transition-all',
                      isActive
                        ? 'border-transparent bg-[var(--surface-card-strong)] shadow-[var(--shadow-soft)]'
                        : 'border-transparent bg-[var(--surface-card)]/75 hover:bg-[var(--surface-muted)]/90',
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

          {/* Unassigned effort */}
          {data && (data.unassigned.taskCount > 0 || data.unassigned.partnerCount > 0) && (
            <SurfaceCard className="p-4" tone="muted">
              <p className="text-[10px] font-bold tracking-[0.18em] text-[var(--text-secondary)] uppercase">
                Sin objetivo asignado
              </p>
              <div className="mt-2 grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Tareas</p>
                  <p className="text-base font-black text-[var(--text-primary)]">{data.unassigned.taskCount}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Valor</p>
                  <p className="text-base font-black text-[var(--text-primary)]">{formatCurrency(data.unassigned.totalValue)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Marcas</p>
                  <p className="text-base font-black text-[var(--text-primary)]">{data.unassigned.partnerCount}</p>
                </div>
              </div>
            </SurfaceCard>
          )}
        </div>

        {/* Right: detail pane */}
        <div className="space-y-4">
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
          onClose={() => setModalGoal(null)}
          onSave={handleSaveModal}
          onDelete={modalGoal.id ? () => { setModalGoal(null); handleDeleteGoal(); } : undefined}
        />
      )}
    </div>
  );
}
