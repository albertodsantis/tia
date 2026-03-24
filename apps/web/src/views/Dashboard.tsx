import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  TrendingUp,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Button, EmptyState, StatusBadge, SurfaceCard, cx } from '../components/ui';
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

function GoalsMarquee({ goals, accentColor }: { goals: string[]; accentColor: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInteractingRef = useRef(false);
  const dragRef = useRef({ isDragging: false, startX: 0, scrollLeft: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let animationId: number;
    let scrollPos = el.scrollLeft;
    const speed = 0.25; // Velocidad del auto-scroll más lenta

    const scroll = () => {
      if (!isInteractingRef.current) {
        scrollPos += speed;
        const maxScroll = el.scrollWidth / 2;

        // Creamos el loop infinito volviendo al inicio cuando cruzamos la mitad
        if (scrollPos >= maxScroll) {
          scrollPos -= maxScroll;
        }
        el.scrollLeft = scrollPos;
      } else {
        scrollPos = el.scrollLeft;
      }
      animationId = requestAnimationFrame(scroll);
    };

    animationId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animationId);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    isInteractingRef.current = true;
    if (e.pointerType === 'mouse') {
      dragRef.current.isDragging = true;
      dragRef.current.startX = e.pageX;
      dragRef.current.scrollLeft = containerRef.current?.scrollLeft || 0;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX;
    const walk = (x - dragRef.current.startX) * 1.5;
    containerRef.current.scrollLeft = dragRef.current.scrollLeft - walk;
  };

  const handlePointerUp = () => {
    dragRef.current.isDragging = false;
    isInteractingRef.current = false;
  };

  // Multiplicamos los objetivos muchas veces para garantizar que llene pantallas muy anchas sin cortarse
  const displayGoals = Array(30).fill(goals).flat();

  return (
    <div className="relative flex items-center overflow-hidden py-2 [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
      <div
        ref={containerRef}
        className="hide-scrollbar flex w-full cursor-grab select-none items-center gap-8 overflow-x-auto px-4 active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onMouseEnter={() => (isInteractingRef.current = true)}
      >
        {displayGoals.map((goal, i) => (
          <div key={i} className="flex shrink-0 items-center gap-8">
            <div className="flex items-center gap-3 opacity-80 transition-opacity hover:opacity-100">
              <div
                className="h-1 w-1 shrink-0 rounded-full"
                style={{ backgroundColor: accentColor }}
              />
              <span className="text-[13px] font-medium tracking-wide text-[var(--text-secondary)]">
                {goal}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { tasks, partners, accentColor, updateTaskStatus, profile } = useAppContext();
  const today = new Date();
  const todayIso = formatLocalDateISO(today);
  const startOfToday = startOfLocalDay(today);
  const tomorrow = new Date(startOfToday);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = formatLocalDateISO(tomorrow);
  const weekEnd = new Date(startOfToday);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const [period, setPeriod] = useState<'month' | 'last_month' | 'year' | 'all'>('month');

  const periodFilteredTasks = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return tasks.filter((task) => {
      if (period === 'all') return true;
      const taskDate = parseLocalDate(task.dueDate);
      if (period === 'year') return taskDate.getFullYear() === currentYear;
      if (period === 'month') return taskDate.getMonth() === currentMonth && taskDate.getFullYear() === currentYear;
      if (period === 'last_month') {
        const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
        return taskDate.getMonth() === lastMonthDate.getMonth() && taskDate.getFullYear() === lastMonthDate.getFullYear();
      }
      return true;
    });
  }, [tasks, period]);

  const handleCompleteTask = async (taskId: string) => {
    try {
      await updateTaskStatus(taskId, 'Completada');
      toast.success('¡Tarea completada!');
    } catch (error) {
      toast.error('Error al actualizar la tarea');
    }
  };

  const summary = useMemo(() => {
    const activePipelineTasks = periodFilteredTasks.filter((task) => task.status !== 'Cobrado');
    const activePipelineValue = activePipelineTasks.reduce((sum, task) => sum + task.value, 0);
    const closedPipelineValue = periodFilteredTasks
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
  }, [partners, tasks, periodFilteredTasks, startOfToday, todayIso, tomorrowIso, weekEnd]);

  const generalGoals = useMemo(() => {
    return (profile?.goals || [])
      .map((g: any) => (typeof g === 'string' ? g : g.generalGoal))
      .filter((goal) => typeof goal === 'string' && goal.trim().length > 0);
  }, [profile?.goals]);

  const estimatedRevenue = useMemo(() => {
    return (profile?.goals || []).reduce((sum, goal: any) => {
      if (typeof goal === 'string') return sum;
      return sum + (Number(goal.revenueEstimation) || 0);
    }, 0);
  }, [profile?.goals]);

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
        const statusTasks = periodFilteredTasks.filter((task) => task.status === status);
        const value = statusTasks.reduce((sum, task) => sum + task.value, 0);

        return {
          status,
          count: statusTasks.length,
          value,
        };
      }),
    [periodFilteredTasks],
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

  return (
    <div className="space-y-5 p-4 pb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 lg:px-8 lg:pt-4 lg:pb-8">
      {generalGoals.length > 0 && (
        <GoalsMarquee goals={generalGoals} accentColor={accentColor} />
      )}

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
              <div className="flex flex-wrap items-center gap-4">
                <p className="text-[11px] font-bold tracking-[0.18em] text-[var(--text-secondary)] uppercase">
                  Resumen operativo
                </p>
                <div className="hidden h-4 w-px bg-[var(--line-soft)] sm:block" />
                <div className="flex items-center gap-1 rounded-[0.85rem] bg-[var(--surface-muted)]/70 p-1">
                  {(['month', 'last_month', 'year', 'all'] as const).map((p) => {
                    const label = p === 'month' ? 'Este mes' : p === 'last_month' ? 'Mes pasado' : p === 'year' ? 'Este año' : 'Total';
                    const isActive = period === p;
                    return (
                      <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={cx(
                          'px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] transition-all rounded-[0.6rem] sm:text-[10px]',
                          isActive ? 'bg-[var(--surface-card)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <StatusBadge tone={summary.overdue > 0 ? 'warning' : 'success'}>
                {summary.overdue > 0 ? `${summary.overdue} retrasadas` : 'Todo en orden'}
              </StatusBadge>
            </div>

            <div className="mt-8 mb-8 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-6 xl:gap-10">
              <div>
                <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.18em] text-[var(--text-secondary)] uppercase">
                  <TrendingUp size={14} className="text-blue-500 dark:text-blue-400" />
                  Meta Anual
                </p>
                <p className="mt-2 text-3xl font-black tracking-tight text-[var(--text-primary)] xl:text-4xl">
                  {formatCurrency(estimatedRevenue)}
                </p>
                <p className="mt-1 text-xs font-medium text-[var(--text-secondary)]">Ingreso proyectado</p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.18em] text-[var(--text-secondary)] uppercase">
                  <CircleDollarSign size={14} style={{ color: accentColor }} />
                  Valor abierto
                </p>
                <p className="mt-2 text-3xl font-black tracking-tight text-[var(--text-primary)] xl:text-4xl">
                  {formatCurrency(summary.activePipelineValue)}
                </p>
                <p className="mt-1 text-xs font-medium text-[var(--text-secondary)]">En negociación</p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.18em] text-[var(--text-secondary)] uppercase">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  Valor cerrado
                </p>
                <p className="mt-2 text-3xl font-black tracking-tight text-[var(--text-primary)] xl:text-4xl">
                  {formatCurrency(summary.closedPipelineValue)}
                </p>
                <p className="mt-1 text-xs font-medium text-[var(--text-secondary)]">Facturado</p>
              </div>
            </div>

            <div className="border-t border-[var(--line-soft)] pt-6">
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.16em] text-[var(--text-secondary)] uppercase">Entregas Hoy</p>
                  <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">
                    {summary.tasksToday} <span className="text-[var(--text-secondary)] text-sm font-medium">/ {summary.tasksTomorrow} mñn</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-[0.16em] text-[var(--text-secondary)] uppercase">Esta semana</p>
                  <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">{summary.tasksThisWeek}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-[0.16em] text-[var(--text-secondary)] uppercase">Marcas Activas</p>
                  <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">
                    {summary.activePartners} <span className="text-[var(--text-secondary)] text-sm font-medium">/ {summary.totalPartners}</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-[0.16em] text-[var(--text-secondary)] uppercase">Contactos</p>
                  <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">{summary.totalContacts}</p>
                </div>
              </div>
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
