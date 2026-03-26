import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { EmptyState, StatusBadge, SurfaceCard, cx } from '../components/ui';
import { toast } from '../lib/toast';
import type { Task, TaskStatus } from '@shared/domain';
import { formatLocalDateISO, parseLocalDate, startOfLocalDay } from '../lib/date';

/* ── constants ──────────────────────────────────────────────── */

const PIPELINE_STATUSES: TaskStatus[] = [
  'Pendiente',
  'En Progreso',
  'En Revisión',
  'Completada',
  'Cobrado',
];

const statusToneMap: Record<TaskStatus, 'warning' | 'info' | 'review' | 'success' | 'neutral'> = {
  Pendiente: 'warning',
  'En Progreso': 'info',
  'En Revisión': 'review',
  Completada: 'success',
  Cobrado: 'neutral',
};

const pipelineBarColors: Record<TaskStatus, string> = {
  Pendiente: '#d97706',
  'En Progreso': '#2563eb',
  'En Revisión': '#7c3aed',
  Completada: '#059669',
  Cobrado: '#64748b',
};

const formatCurrency = (v: number) => `$${v.toLocaleString('es-ES')}`;

const formatTaskDate = (task: Task) =>
  parseLocalDate(task.dueDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

/* ── GoalsMarquee ───────────────────────────────────────────── */

function GoalsMarquee({ goals, accentHex, accentGradient }: { goals: string[]; accentHex: string; accentGradient: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInteractingRef = useRef(false);
  const dragRef = useRef({ isDragging: false, startX: 0, scrollLeft: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let animationId: number;
    let scrollPos = el.scrollLeft;
    const speed = 0.25;

    const scroll = () => {
      if (!isInteractingRef.current) {
        scrollPos += speed;
        const maxScroll = el.scrollWidth / 2;
        if (scrollPos >= maxScroll) scrollPos -= maxScroll;
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
    containerRef.current.scrollLeft =
      dragRef.current.scrollLeft - (e.pageX - dragRef.current.startX) * 1.5;
  };

  const handlePointerUp = () => {
    dragRef.current.isDragging = false;
    isInteractingRef.current = false;
  };

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
                style={{ background: accentGradient }}
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

/* ── TaskCard ───────────────────────────────────────────────── */

function TaskCard({
  task,
  partner,
  accentHex,
  onComplete,
}: {
  task: Task;
  partner: { id: string; name: string } | undefined;
  accentHex: string;
  onComplete: (id: string) => void;
}) {
  return (
    <div className="group flex items-start gap-3 rounded-[0.85rem] border border-[var(--line-soft)] bg-[var(--surface-card)]/80 px-3.5 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-[13px] font-bold text-[var(--text-primary)]">
            {task.title}
          </h3>
          <StatusBadge tone={statusToneMap[task.status]}>{task.status}</StatusBadge>
        </div>
        <p className="mt-1.5 text-[11px] font-medium text-[var(--text-secondary)]">
          {partner?.name || 'Sin marca'} · {formatTaskDate(task)}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <p className="text-[13px] font-black text-[var(--text-primary)]">
          {formatCurrency(task.value)}
        </p>
        {task.status !== 'Completada' && task.status !== 'Cobrado' && (
          <button
            type="button"
            onClick={() => void onComplete(task.id)}
            className="flex items-center gap-1 rounded-[0.7rem] bg-[var(--surface-muted)] px-2 py-1 text-[10px] font-bold text-[var(--text-secondary)] transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/15 dark:hover:text-emerald-400"
          >
            <CheckCircle2 size={12} />
            Completar
          </button>
        )}
      </div>
    </div>
  );
}

/* ── RevenueChart ───────────────────────────────────────────── */

function RevenueChart({ tasks, accentHex, accentGradient }: { tasks: Task[]; accentHex: string; accentGradient: string }) {
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      index: i,
      label: new Date(currentYear, i).toLocaleDateString('es-ES', { month: 'short' }),
      projected: 0,
      collected: 0,
    }));

    tasks.forEach((task) => {
      const dueDate = parseLocalDate(task.dueDate);
      if (dueDate.getFullYear() === currentYear) {
        months[dueDate.getMonth()].projected += task.value;
      }

      if (task.status === 'Cobrado' && task.cobradoAt) {
        const cobradoDate = new Date(task.cobradoAt);
        if (cobradoDate.getFullYear() === currentYear) {
          months[cobradoDate.getMonth()].collected += task.actualPayment ?? task.value;
        }
      }
    });

    return months;
  }, [tasks, currentYear]);

  const maxValue = Math.max(...monthlyData.flatMap((m) => [m.projected, m.collected]), 1);
  const BAR_HEIGHT = 140;
  const yearProjected = monthlyData.reduce((s, m) => s + m.projected, 0);
  const yearCollected = monthlyData.reduce((s, m) => s + m.collected, 0);

  return (
    <SurfaceCard className="p-5 lg:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-[0.18em] text-[var(--text-secondary)] uppercase">
            Ingresos {currentYear}
          </p>
          <div className="mt-2 flex items-center gap-4 text-[11px] font-medium text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-[3px]"
                style={{ backgroundColor: `${accentHex}35` }}
              />
              Proyectado
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-[3px]"
                style={{ background: accentGradient }}
              />
              Cobrado
            </span>
          </div>
        </div>
        <div className="flex gap-6 text-right">
          <div>
            <p className="text-[10px] font-bold tracking-[0.12em] text-[var(--text-secondary)] uppercase">
              Proyectado
            </p>
            <p className="text-lg font-black text-[var(--text-primary)]">
              {formatCurrency(yearProjected)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.12em] text-[var(--text-secondary)] uppercase">
              Cobrado
            </p>
            <p className="text-lg font-black" style={{ color: accentHex }}>
              {formatCurrency(yearCollected)}
            </p>
          </div>
        </div>
      </div>

      {/* Chart area */}
      <div
        className="relative mt-6 flex items-end gap-1 sm:gap-1.5"
        style={{ height: BAR_HEIGHT + 30 }}
      >
        {monthlyData.map((month) => {
          const projH =
            month.projected > 0
              ? Math.max((month.projected / maxValue) * BAR_HEIGHT, 4)
              : 2;
          const collH =
            month.collected > 0
              ? Math.max((month.collected / maxValue) * BAR_HEIGHT, 4)
              : 2;
          const isCurrent = month.index === currentMonth;
          const isHovered = hoveredMonth === month.index;

          return (
            <div
              key={month.index}
              className="relative flex flex-1 flex-col items-center"
              onMouseEnter={() => setHoveredMonth(month.index)}
              onMouseLeave={() => setHoveredMonth(null)}
            >
              {/* Tooltip */}
              {isHovered && (month.projected > 0 || month.collected > 0) && (
                <div className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 -translate-y-full rounded-[0.7rem] bg-[var(--surface-card)] px-3 py-2 text-center shadow-lg ring-1 ring-[var(--line-soft)]">
                  <p className="whitespace-nowrap text-[10px] font-bold uppercase text-[var(--text-secondary)]">
                    {month.label} {currentYear}
                  </p>
                  <p className="mt-0.5 whitespace-nowrap text-[11px] font-bold text-[var(--text-primary)]">
                    {formatCurrency(month.projected)} proy.
                  </p>
                  <p
                    className="whitespace-nowrap text-[11px] font-bold"
                    style={{ color: accentHex }}
                  >
                    {formatCurrency(month.collected)} cobr.
                  </p>
                </div>
              )}

              <div
                className="flex w-full items-end justify-center gap-[2px] sm:gap-1"
                style={{ height: BAR_HEIGHT }}
              >
                <div
                  className="w-full max-w-[14px] rounded-t-[3px] transition-all duration-200 sm:max-w-[18px]"
                  style={{
                    height: projH,
                    backgroundColor: `${accentHex}35`,
                  }}
                />
                <div
                  className="w-full max-w-[14px] rounded-t-[3px] transition-all duration-200 sm:max-w-[18px]"
                  style={{
                    height: collH,
                    background: accentGradient,
                    opacity: month.collected > 0 ? 1 : 0.15,
                  }}
                />
              </div>

              <span
                className={cx(
                  'mt-2 text-[9px] font-medium uppercase tracking-wide sm:text-[10px]',
                  isCurrent
                    ? 'font-black text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)]',
                )}
              >
                {month.label}
              </span>
              {isCurrent && (
                <div
                  className="mt-0.5 h-1 w-1 rounded-full"
                  style={{ background: accentGradient }}
                />
              )}
            </div>
          );
        })}
      </div>
    </SurfaceCard>
  );
}

/* ── Dashboard ──────────────────────────────────────────────── */

export default function Dashboard() {
  const { tasks, partners, accentColor, accentHex, accentGradient, updateTaskStatus, profile } = useAppContext();
  const today = new Date();
  const todayIso = formatLocalDateISO(today);
  const startOfToday = startOfLocalDay(today);
  const tomorrow = new Date(startOfToday);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = formatLocalDateISO(tomorrow);
  const weekEnd = new Date(startOfToday);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const [periodView, setPeriodView] = useState<'month' | 'year' | 'all'>('month');
  const [periodMonth, setPeriodMonth] = useState(today.getMonth());
  const [periodYear, setPeriodYear] = useState(today.getFullYear());

  const periodLabel = useMemo(() => {
    if (periodView === 'all') return 'Todo';
    if (periodView === 'year') return String(periodYear);
    return new Date(periodYear, periodMonth).toLocaleDateString('es-ES', {
      month: 'long',
      year: 'numeric',
    }).replace(/^\w/, (c) => c.toUpperCase());
  }, [periodView, periodMonth, periodYear]);

  const navigatePeriod = (dir: -1 | 1) => {
    if (periodView === 'month') {
      const d = new Date(periodYear, periodMonth + dir, 1);
      setPeriodMonth(d.getMonth());
      setPeriodYear(d.getFullYear());
    } else if (periodView === 'year') {
      setPeriodYear((y) => y + dir);
    }
  };

  const cyclePeriodView = () => {
    if (periodView === 'month') setPeriodView('year');
    else if (periodView === 'year') setPeriodView('all');
    else {
      setPeriodView('month');
      setPeriodMonth(today.getMonth());
      setPeriodYear(today.getFullYear());
    }
  };

  /* ── handlers ─────────────────────────────────────────────── */

  const handleCompleteTask = async (taskId: string) => {
    try {
      await updateTaskStatus(taskId, 'Completada');
      toast.success('¡Tarea completada!');
    } catch {
      toast.error('Error al actualizar la tarea');
    }
  };

  /* ── derived data ─────────────────────────────────────────── */

  const periodFilteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (periodView === 'all') return true;
      const d = parseLocalDate(t.dueDate);
      if (periodView === 'year') return d.getFullYear() === periodYear;
      return d.getMonth() === periodMonth && d.getFullYear() === periodYear;
    });
  }, [tasks, periodView, periodMonth, periodYear]);

  const generalGoals = useMemo(
    () =>
      (profile?.goals || [])
        .map((g: any) => (typeof g === 'string' ? g : g.generalGoal))
        .filter((g) => typeof g === 'string' && g.trim().length > 0),
    [profile?.goals],
  );

  const estimatedRevenue = useMemo(
    () =>
      (profile?.goals || []).reduce((s, g: any) => {
        if (typeof g === 'string') return s;
        return s + (Number(g.revenueEstimation) || 0);
      }, 0),
    [profile?.goals],
  );

  const globalSummary = useMemo(() => {
    const overdue = tasks.filter(
      (t) =>
        startOfLocalDay(parseLocalDate(t.dueDate)) < startOfToday &&
        t.status !== 'Cobrado' &&
        t.status !== 'Completada',
    ).length;
    const tasksToday = tasks.filter((t) => t.dueDate === todayIso && t.status !== 'Cobrado').length;
    const tasksThisWeek = tasks.filter((t) => {
      const d = startOfLocalDay(parseLocalDate(t.dueDate));
      return d >= startOfToday && d <= weekEnd && t.status !== 'Cobrado';
    }).length;
    const activePipelineValue = tasks
      .filter((t) => t.status !== 'Cobrado')
      .reduce((s, t) => s + t.value, 0);
    return { overdue, tasksToday, tasksThisWeek, activePipelineValue };
  }, [tasks, startOfToday, todayIso, weekEnd]);

  const periodSummary = useMemo(() => {
    const activePipelineValue = periodFilteredTasks
      .filter((t) => t.status !== 'Cobrado')
      .reduce((s, t) => s + t.value, 0);
    const closedPipelineValue = periodFilteredTasks
      .filter((t) => t.status === 'Cobrado')
      .reduce((s, t) => s + (t.actualPayment ?? t.value), 0);
    const pendingPaymentValue = periodFilteredTasks
      .filter((t) => t.status === 'Completada')
      .reduce((s, t) => s + t.value, 0);
    const deliveriesCount = periodFilteredTasks
      .filter((t) => t.status === 'Completada' || t.status === 'Cobrado').length;
    const activePartners = new Set(
      periodFilteredTasks.map((t) => t.partnerId),
    ).size;
    return {
      activePipelineValue,
      closedPipelineValue,
      pendingPaymentValue,
      deliveriesCount,
      activePartners,
      totalPartners: partners.length,
      totalContacts: partners.reduce((s, p) => s + p.contacts.length, 0),
    };
  }, [partners, periodFilteredTasks]);

  const groupedAgenda = useMemo(() => {
    const overdue: Task[] = [];
    const todayTasks: Task[] = [];
    const tomorrowTasks: Task[] = [];
    const thisWeekTasks: Task[] = [];

    const sorted = [...tasks]
      .filter((t) => t.status !== 'Cobrado')
      .sort((a, b) => parseLocalDate(a.dueDate).getTime() - parseLocalDate(b.dueDate).getTime());

    sorted.forEach((task) => {
      const d = startOfLocalDay(parseLocalDate(task.dueDate));
      if (d < startOfToday) overdue.push(task);
      else if (task.dueDate === todayIso) todayTasks.push(task);
      else if (task.dueDate === tomorrowIso) tomorrowTasks.push(task);
      else if (d <= weekEnd) thisWeekTasks.push(task);
    });

    return { overdue, todayTasks, tomorrowTasks, thisWeekTasks };
  }, [tasks, startOfToday, todayIso, tomorrowIso, weekEnd]);

  const hasAgendaItems =
    groupedAgenda.overdue.length > 0 ||
    groupedAgenda.todayTasks.length > 0 ||
    groupedAgenda.tomorrowTasks.length > 0 ||
    groupedAgenda.thisWeekTasks.length > 0;

  const breakdown = useMemo(
    () =>
      PIPELINE_STATUSES.map((status) => {
        const sts = periodFilteredTasks.filter((t) => t.status === status);
        return { status, count: sts.length, value: sts.reduce((s, t) => s + t.value, 0) };
      }),
    [periodFilteredTasks],
  );

  const totalBreakdownCount = breakdown.reduce((s, b) => s + b.count, 0);

  /* ── render ───────────────────────────────────────────────── */

  return (
    <div className="space-y-5 p-4 pb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 lg:px-8 lg:pt-4 lg:pb-8">
      {/* Goals Marquee */}
      {generalGoals.length > 0 && (
        <GoalsMarquee goals={generalGoals} accentHex={accentHex} accentGradient={accentGradient} />
      )}

      {/* Main 2-col grid */}
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
        {/* ── Left: stacked cards ────────────────────────── */}
        <div className="space-y-5">
          {/* Financial Flow */}
          <SurfaceCard className="relative overflow-hidden p-5 lg:p-6">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: `radial-gradient(circle at top right, ${accentHex}20 0%, transparent 55%)`,
                opacity: 0.6,
              }}
            />
            <div className="relative">
              {/* Period navigator */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-1">
                  {periodView === 'month' && (
                    <button
                      type="button"
                      onClick={() => navigatePeriod(-1)}
                      className="rounded-lg p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                    >
                      <ChevronLeft size={16} />
                    </button>
                  )}
                  <span className="min-w-[140px] text-center text-[13px] font-bold text-[var(--text-primary)]">
                    {periodLabel}
                  </span>
                  {periodView === 'month' && (
                    <button
                      type="button"
                      onClick={() => navigatePeriod(1)}
                      className="rounded-lg p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                    >
                      <ChevronRight size={16} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1 rounded-[0.6rem] bg-[var(--surface-muted)]/70 p-0.5">
                  {([
                    { key: 'month' as const, label: 'Mes' },
                    { key: 'year' as const, label: 'Año' },
                    { key: 'all' as const, label: 'Todo' },
                  ]).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setPeriodView(opt.key);
                        if (opt.key === 'month') {
                          setPeriodMonth(today.getMonth());
                          setPeriodYear(today.getFullYear());
                        }
                        if (opt.key === 'year') {
                          setPeriodYear(today.getFullYear());
                        }
                      }}
                      className={cx(
                        'rounded-[0.4rem] px-2.5 py-1 text-[10px] tracking-wide transition-all',
                        periodView === opt.key
                          ? 'bg-[var(--surface-card)] font-extrabold text-[var(--text-primary)] shadow-sm'
                          : 'font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* KPIs grid */}
              <div className="mt-4 grid grid-cols-3 gap-x-4 gap-y-4">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.14em] text-[var(--text-secondary)] uppercase">
                    Abierto
                  </p>
                  <p className="mt-1 text-xl font-black tracking-tight text-[var(--text-primary)]">
                    {formatCurrency(periodSummary.activePipelineValue)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-[0.14em] text-[var(--text-secondary)] uppercase">
                    Cobrado
                  </p>
                  <p
                    className="mt-1 text-xl font-black tracking-tight"
                    style={{ color: accentHex }}
                  >
                    {formatCurrency(periodSummary.closedPipelineValue)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-[0.14em] text-[var(--text-secondary)] uppercase">
                    Por cobrar
                  </p>
                  <p className="mt-1 text-xl font-black tracking-tight text-amber-600 dark:text-amber-400">
                    {formatCurrency(periodSummary.pendingPaymentValue)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-[0.14em] text-[var(--text-secondary)] uppercase">
                    Entregas
                  </p>
                  <p className="mt-1 text-xl font-black tracking-tight text-[var(--text-primary)]">
                    {periodSummary.deliveriesCount}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-[0.14em] text-[var(--text-secondary)] uppercase">
                    Marcas
                  </p>
                  <p className="mt-1 text-xl font-black tracking-tight text-[var(--text-primary)]">
                    {periodSummary.activePartners}
                    <span className="text-sm font-medium text-[var(--text-secondary)]">
                      {' '}/ {periodSummary.totalPartners}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-[0.14em] text-[var(--text-secondary)] uppercase">
                    Contactos
                  </p>
                  <p className="mt-1 text-xl font-black tracking-tight text-[var(--text-primary)]">
                    {periodSummary.totalContacts}
                  </p>
                </div>
              </div>

              {/* Annual goal progress */}
              {estimatedRevenue > 0 && (
                <div className="mt-4 rounded-[0.7rem] bg-[var(--surface-muted)]/60 px-3.5 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold tracking-[0.12em] text-[var(--text-secondary)] uppercase">
                      Meta anual
                    </p>
                    <p className="text-[11px] font-bold text-[var(--text-secondary)]">
                      {formatCurrency(periodSummary.closedPipelineValue)} /{' '}
                      {formatCurrency(estimatedRevenue)}
                    </p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-inset)]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min((periodSummary.closedPipelineValue / estimatedRevenue) * 100, 100)}%`,
                        background: accentGradient,
                      }}
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] font-medium text-[var(--text-secondary)]">
                    {Math.round((periodSummary.closedPipelineValue / estimatedRevenue) * 100)}% alcanzado
                  </p>
                </div>
              )}
            </div>
          </SurfaceCard>

          {/* Pipeline */}
          <SurfaceCard className="p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold tracking-[0.18em] text-[var(--text-secondary)] uppercase">
                Pipeline
              </p>
              <StatusBadge tone="neutral">{totalBreakdownCount} tareas</StatusBadge>
            </div>

            {/* Segmented bar */}
            {totalBreakdownCount > 0 && (
              <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-[var(--surface-inset)]">
                {breakdown.map((item) => {
                  if (item.count === 0) return null;
                  const pct = (item.count / totalBreakdownCount) * 100;
                  return (
                    <div
                      key={item.status}
                      className="transition-all duration-300 first:rounded-l-full last:rounded-r-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: pipelineBarColors[item.status],
                        opacity: 0.82,
                      }}
                    />
                  );
                })}
              </div>
            )}

            {/* Legend */}
            <div className="mt-4 space-y-2">
              {breakdown.map((item) => (
                <div
                  key={item.status}
                  className="flex items-center justify-between text-[11px]"
                >
                  <div className="flex items-center gap-2">
                    <StatusBadge tone={statusToneMap[item.status]}>{item.count}</StatusBadge>
                    <span className="font-medium text-[var(--text-primary)]">{item.status}</span>
                  </div>
                  <span className="font-bold text-[var(--text-secondary)]">
                    {formatCurrency(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </SurfaceCard>

        </div>

        {/* ── Right: Tu día ──────────────────────────────── */}
        <SurfaceCard className="p-5 lg:p-6">
          <p className="text-[11px] font-bold tracking-[0.18em] text-[var(--text-secondary)] uppercase">
            Tu día
          </p>

          {hasAgendaItems ? (
            <div className="mt-4 space-y-5">
              {/* Overdue */}
              {groupedAgenda.overdue.length > 0 && (
                <AgendaGroup
                  label={`Retrasadas (${groupedAgenda.overdue.length})`}
                  icon={<Clock size={13} className="text-amber-500" />}
                  labelClassName="text-amber-600 dark:text-amber-400"
                  tasks={groupedAgenda.overdue}
                  partners={partners}
                  accentHex={accentHex}
                  onComplete={handleCompleteTask}
                />
              )}

              {/* Today */}
              {groupedAgenda.todayTasks.length > 0 && (
                <AgendaGroup
                  label={`Hoy (${groupedAgenda.todayTasks.length})`}
                  tasks={groupedAgenda.todayTasks}
                  partners={partners}
                  accentHex={accentHex}
                  onComplete={handleCompleteTask}
                />
              )}

              {/* Tomorrow */}
              {groupedAgenda.tomorrowTasks.length > 0 && (
                <AgendaGroup
                  label={`Mañana (${groupedAgenda.tomorrowTasks.length})`}
                  tasks={groupedAgenda.tomorrowTasks}
                  partners={partners}
                  accentHex={accentHex}
                  onComplete={handleCompleteTask}
                />
              )}

              {/* This week */}
              {groupedAgenda.thisWeekTasks.length > 0 && (
                <AgendaGroup
                  label={`Esta semana (${groupedAgenda.thisWeekTasks.length})`}
                  tasks={groupedAgenda.thisWeekTasks}
                  partners={partners}
                  accentHex={accentHex}
                  onComplete={handleCompleteTask}
                />
              )}
            </div>
          ) : (
            <EmptyState
              icon={CalendarClock}
              title="Día libre de entregas"
              description="Aprovecha el tiempo para prospectar nuevas marcas o planificar contenido."
              className="py-10"
            />
          )}
        </SurfaceCard>
      </section>

      {/* Revenue Chart – full width */}
      <RevenueChart tasks={tasks} accentHex={accentHex} accentGradient={accentGradient} />
    </div>
  );
}

/* ── AgendaGroup ────────────────────────────────────────────── */

function AgendaGroup({
  label,
  icon,
  labelClassName,
  tasks,
  partners,
  accentHex,
  onComplete,
}: {
  label: string;
  icon?: React.ReactNode;
  labelClassName?: string;
  tasks: Task[];
  partners: Array<{ id: string; name: string }>;
  accentHex: string;
  onComplete: (id: string) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <p
          className={cx(
            'text-[10px] font-bold tracking-[0.14em] uppercase',
            labelClassName || 'text-[var(--text-secondary)]',
          )}
        >
          {label}
        </p>
      </div>
      <div className="space-y-2">
        {tasks.map((task) => {
          const partner = partners.find((p) => p.id === task.partnerId);
          return (
            <React.Fragment key={task.id}>
              <TaskCard
                task={task}
                partner={partner}
                accentHex={accentHex}
                onComplete={onComplete}
              />
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
