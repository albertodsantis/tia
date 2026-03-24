import React, { useMemo } from 'react';
import {
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  CircleDollarSign,
  Users,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Button, EmptyState, StatusBadge, SurfaceCard } from '../components/ui';
import { toast } from '../lib/toast';
import type { Task, TaskStatus } from '@shared/domain';
import { formatLocalDateISO, parseLocalDate, startOfLocalDay } from '../lib/date';

const PIPELINE_STATUSES: TaskStatus[] = [
  'Pendiente',
  'En Progreso',
  'En Revisi\u00f3n',
  'Completada',
  'Cobrado',
];

const statusToneMap: Record<TaskStatus, 'warning' | 'info' | 'accent' | 'success' | 'neutral'> = {
  Pendiente: 'warning',
  'En Progreso': 'info',
  'En Revisi\u00f3n': 'accent',
  Completada: 'success',
  Cobrado: 'neutral',
};

const formatCurrency = (value: number) => `$${value.toLocaleString('es-ES')}`;

const formatTaskDate = (task: Task) =>
  parseLocalDate(task.dueDate).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

type OverviewItem = {
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
    style?: React.CSSProperties;
  }>;
  label: string;
  value: string;
  helper: string;
  emphasis?: 'accent' | 'success';
};

export default function Dashboard() {
  const { tasks, partners, accentColor, updateTaskStatus } = useAppContext();
  const today = new Date();
  const todayIso = formatLocalDateISO(today);
  const startOfToday = startOfLocalDay(today);
  const tomorrow = new Date(startOfToday);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = formatLocalDateISO(tomorrow);
  const weekEnd = new Date(startOfToday);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const handleCompleteTask = async (taskId: string) => {
    try {
      await updateTaskStatus(taskId, 'Completada');
      toast.success('¡Tarea completada!');
    } catch (error) {
      toast.error('Error al actualizar la tarea');
    }
  };

  const summary = useMemo(() => {
    const activePipelineTasks = tasks.filter((task) => task.status !== 'Cobrado');
    const activePipelineValue = activePipelineTasks.reduce((sum, task) => sum + task.value, 0);
    const closedPipelineValue = tasks
      .filter((task) => task.status === 'Cobrado')
      .reduce((sum, task) => sum + task.value, 0);
    const tasksToday = tasks.filter((task) => task.dueDate === todayIso).length;
    const tasksTomorrow = tasks.filter((task) => task.dueDate === tomorrowIso).length;
    const tasksThisWeek = tasks.filter((task) => {
      const dueDate = startOfLocalDay(parseLocalDate(task.dueDate));
      return dueDate >= startOfToday && dueDate <= weekEnd;
    }).length;
    const activePartners = partners.filter((partner) => partner.status === 'Activo').length;
    const totalPartners = partners.length;
    const totalContacts = partners.reduce((sum, partner) => sum + partner.contacts.length, 0);
    const overdue = tasks.filter(
      (task) => startOfLocalDay(parseLocalDate(task.dueDate)) < startOfToday && task.status !== 'Cobrado',
    ).length;
    return {
      activePipelineValue,
      closedPipelineValue,
      tasksToday,
      tasksTomorrow,
      tasksThisWeek,
      activePartners,
      totalPartners,
      totalContacts,
      overdue,
    };
  }, [partners, tasks, startOfToday, todayIso, tomorrowIso, weekEnd]);

  const upcomingTasks = useMemo(
    () =>
      [...tasks]
        .sort((a, b) => parseLocalDate(a.dueDate).getTime() - parseLocalDate(b.dueDate).getTime())
        .slice(0, 4),
    [tasks],
  );

  const breakdown = useMemo(
    () =>
      PIPELINE_STATUSES.map((status) => {
        const statusTasks = tasks.filter((task) => task.status === status);
        const value = statusTasks.reduce((sum, task) => sum + task.value, 0);

        return {
          status,
          count: statusTasks.length,
          value,
        };
      }),
    [tasks],
  );

  const maxBreakdownCount = Math.max(...breakdown.map((item) => item.count), 1);
  const busiestStage = breakdown.reduce(
    (current, item) => {
      if (!current || item.count > current.count) {
        return item;
      }

      return current;
    },
    null as (typeof breakdown)[number] | null,
  );

  const overviewItems: OverviewItem[] = [
    {
      icon: CircleDollarSign,
      label: 'Valor abierto',
      value: formatCurrency(summary.activePipelineValue),
      helper: 'Pipeline activo',
      emphasis: 'accent',
    },
    {
      icon: CheckCircle2,
      label: 'Valor cerrado',
      value: formatCurrency(summary.closedPipelineValue),
      helper: 'Ya cobrado',
      emphasis: 'success',
    },
    {
      icon: CalendarClock,
      label: 'Hoy',
      value: String(summary.tasksToday),
      helper: 'Entregas previstas',
    },
    {
      icon: CalendarDays,
      label: 'Ma\u00f1ana',
      value: String(summary.tasksTomorrow),
      helper: 'Siguiente tanda',
    },
    {
      icon: CalendarRange,
      label: 'Semana',
      value: String(summary.tasksThisWeek),
      helper: 'Pr\u00f3ximos 7 d\u00edas',
    },
    {
      icon: Users,
      label: 'Partners',
      value: String(summary.totalPartners),
      helper: 'Total registrados',
    },
    {
      icon: Users,
      label: 'Partners activos',
      value: String(summary.activePartners),
      helper: 'Relaciones activas',
    },
    {
      icon: Users,
      label: 'Contactos',
      value: String(summary.totalContacts),
      helper: 'Base activa',
    },
  ];

  return (
    <div className="space-y-5 p-4 pb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 lg:px-8 lg:pt-4 lg:pb-8">

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)]">
        <SurfaceCard className="relative overflow-hidden p-6 lg:p-8">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(circle at top left, ${accentColor}30 0%, ${accentColor}10 35%, transparent 62%)`,
              opacity: 0.5,
            }}
          />

          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-[11px] font-bold tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500">
                Resumen operativo
              </p>
              <StatusBadge tone={summary.overdue > 0 ? 'warning' : 'success'}>
                {summary.overdue > 0 ? `${summary.overdue} retrasadas` : 'Todo en orden'}
              </StatusBadge>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {overviewItems.map((item, index) => {
                const Icon = item.icon;
                const isAccent = item.emphasis === 'accent';
                const isSuccess = item.emphasis === 'success';

                return (
                  <div
                    key={item.label}
                    className="rounded-[1rem] border border-slate-200/70 bg-white/72 px-4 py-4 shadow-[0_10px_24px_-22px_rgba(15,23,42,0.16)] transition-transform duration-200 hover:-translate-y-0.5 dark:border-slate-700/60 dark:bg-slate-900/38"
                    style={
                      isAccent
                        ? {
                            borderColor: 'var(--accent-border)',
                            backgroundColor: 'var(--accent-soft)',
                          }
                        : isSuccess
                          ? {
                              borderColor: 'rgba(16, 185, 129, 0.22)',
                              backgroundColor: 'rgba(16, 185, 129, 0.07)',
                            }
                          : undefined
                    }
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500">
                          {item.label}
                        </p>
                        <p className="mt-2 text-[1.4rem] font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
                          {item.value}
                        </p>
                        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                          {item.helper}
                        </p>
                      </div>
                      <Icon
                        size={18}
                        strokeWidth={2.3}
                        className="mt-1 shrink-0"
                        style={{
                          color: isSuccess ? 'rgb(5, 150, 105)' : accentColor,
                          opacity: index === 0 || isSuccess ? 1 : 0.72,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-6 lg:px-7 lg:py-7">
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-bold tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500">
                Agenda inmediata
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {upcomingTasks.length > 0 ? (
                upcomingTasks.map((task, index) => {
                  const partner = partners.find((item) => item.id === task.partnerId);

                  return (
                    <div
                      key={task.id}
                      className="group rounded-[1rem] border border-slate-200/70 bg-white/78 px-4 py-4 shadow-[0_10px_20px_-24px_rgba(15,23,42,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 dark:border-slate-700/60 dark:bg-slate-950/14 dark:hover:border-slate-600"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.9rem] text-sm font-black"
                          style={{ backgroundColor: `${accentColor}14`, color: accentColor }}
                        >
                          {String(index + 1).padStart(2, '0')}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                              {task.title}
                            </h3>
                            <StatusBadge tone={statusToneMap[task.status]}>{task.status}</StatusBadge>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {partner?.name || 'Sin marca'} {'\u00b7'} {formatTaskDate(task)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <p className="text-sm font-black text-[var(--text-primary)]">
                            {formatCurrency(task.value)}
                          </p>
                          {task.status !== 'Completada' && task.status !== 'Cobrado' && (
                            <button
                              type="button"
                              onClick={() => void handleCompleteTask(task.id)}
                              className="flex items-center gap-1.5 rounded-[0.8rem] bg-[var(--surface-muted)] px-3 py-1.5 text-[11px] font-bold text-[var(--text-secondary)] transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/15 dark:hover:text-emerald-400"
                            >
                              <CheckCircle2 size={14} />
                              Completar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <EmptyState
                  icon={CalendarClock}
                  title="Día libre de entregas"
                  description="Aprovecha el tiempo para prospectar nuevas marcas o planificar contenido."
                  className="py-8"
                />
              )}
            </div>
          </div>
        </SurfaceCard>
      </section>

      <section>
        <SurfaceCard className="p-6 lg:p-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500">
                Estado operativo
              </p>
            </div>
            <StatusBadge tone="neutral">{tasks.length} tareas</StatusBadge>
          </div>

          <div className="mt-6 flex flex-col gap-4 rounded-[1.05rem] bg-slate-50/80 px-4 py-4 dark:bg-slate-900/34 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[1.35rem] font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
                {formatCurrency(summary.activePipelineValue)}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                Valor abierto en el pipeline actual
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {busiestStage?.status ?? 'Sin carga'}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                {busiestStage ? `${busiestStage.count} tareas en la fase mas cargada` : 'No hay tareas activas'}
              </p>
            </div>
          </div>

          <div className="mt-6 divide-y divide-slate-200/70 dark:divide-slate-700/60">
            {breakdown.map((item) => {
              const width = item.count > 0 ? Math.max((item.count / maxBreakdownCount) * 100, 16) : 8;

              return (
                <div
                  key={item.status}
                  className="grid gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_220px]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{item.status}</p>
                      <StatusBadge tone={statusToneMap[item.status]}>{item.count} tareas</StatusBadge>
                    </div>
                    <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {formatCurrency(item.value)} en esta fase
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800/88">
                      <div
                        className="rounded-full transition-all duration-300"
                        style={{
                          width: `${width}%`,
                          backgroundColor: accentColor,
                          opacity: item.count > 0 ? 0.92 : 0.18,
                        }}
                      />
                    </div>
                    <p className="w-11 shrink-0 text-right text-sm font-black text-slate-800 dark:text-slate-100">
                      {item.count}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </SurfaceCard>
      </section>
    </div>
  );
}
