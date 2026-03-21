import React, { useMemo } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { EmptyState, MetricCard, StatusBadge, SurfaceCard } from '../components/ui';
import type { TaskStatus } from '@shared/domain';
import { formatLocalDateISO, parseLocalDate, startOfLocalDay } from '../lib/date';

const PIPELINE_STATUSES: TaskStatus[] = [
  'Pendiente',
  'En Progreso',
  'En Revisión',
  'Completada',
  'Cobro',
];

const statusToneMap: Record<TaskStatus, 'warning' | 'info' | 'accent' | 'success' | 'neutral'> = {
  Pendiente: 'warning',
  'En Progreso': 'info',
  'En Revisión': 'accent',
  Completada: 'success',
  Cobro: 'neutral',
};

export default function Dashboard() {
  const { profile, tasks, partners, accentColor } = useAppContext();
  const today = new Date();
  const todayIso = formatLocalDateISO(today);
  const startOfToday = startOfLocalDay(today);
  const weekEnd = new Date(startOfToday);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const summary = useMemo(() => {
    const activePipelineTasks = tasks.filter((task) => task.status !== 'Cobro');
    const activePipelineValue = activePipelineTasks.reduce((sum, task) => sum + task.value, 0);
    const tasksToday = tasks.filter((task) => task.dueDate === todayIso).length;
    const tasksThisWeek = tasks.filter((task) => {
      const dueDate = startOfLocalDay(parseLocalDate(task.dueDate));
      return dueDate >= startOfToday && dueDate <= weekEnd;
    }).length;
    const activePartners = partners.filter((partner) => partner.status === 'Activo').length;
    const overdue = tasks.filter(
      (task) => startOfLocalDay(parseLocalDate(task.dueDate)) < startOfToday && task.status !== 'Cobro',
    ).length;
    const syncedTasks = tasks.filter((task) => Boolean(task.gcalEventId)).length;

    return {
      activePipelineValue,
      tasksToday,
      tasksThisWeek,
      activePartners,
      overdue,
      syncedTasks,
    };
  }, [partners, tasks, startOfToday, todayIso, weekEnd]);

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

  const greeting = today.getHours() < 12 ? 'Buenos días' : today.getHours() < 20 ? 'Buenas tardes' : 'Buenas noches';
  const firstName = profile.name.split(' ')[0] || profile.name;

  return (
    <div className="space-y-6 p-4 pb-6 lg:px-8 lg:pt-4 lg:pb-8">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <SurfaceCard className="p-6 lg:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{greeting},</p>
              <h1 className="mt-2 text-[2rem] font-extrabold tracking-tight text-slate-900 dark:text-slate-100 lg:text-[2.4rem]">
                {firstName}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Mueve tu semana con foco. Aquí se concentra el valor abierto, lo que vence pronto y
                el estado real de tus colaboraciones.
              </p>
            </div>

            <div className="shrink-0 text-right">
              <img
                src={profile.avatar}
                alt={profile.name}
                className="ml-auto h-14 w-14 rounded-[1rem] border-4 border-white object-cover shadow-sm dark:border-slate-800 lg:h-16 lg:w-16"
              />
              <div className="mt-3 inline-flex items-center gap-2 rounded-[0.85rem] bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                <CalendarDays size={14} />
                {today.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 min-[360px]:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={CircleDollarSign}
              label="Pipeline activo"
              value={`$${summary.activePipelineValue.toLocaleString()}`}
              helper="Valor abierto pendiente de cobro."
              accentColor={accentColor}
            />
            <MetricCard
              icon={CheckCircle2}
              label="Entregas de hoy"
              value={`${summary.tasksToday}`}
              helper="Acciones que vencen en esta jornada."
              accentColor={accentColor}
            />
            <MetricCard
              icon={Users}
              label="Partners activos"
              value={`${summary.activePartners}`}
              helper="Relaciones comerciales actualmente vivas."
              accentColor={accentColor}
            />
            <MetricCard
              icon={CalendarClock}
              label="Esta semana"
              value={`${summary.tasksThisWeek}`}
              helper="Carga prevista para los próximos 7 días."
              accentColor={accentColor}
            />
          </div>
        </SurfaceCard>

        <SurfaceCard tone="muted" className="p-6 lg:p-7">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${accentColor}14`, color: accentColor }}
            >
              <TrendingUp size={20} strokeWidth={2.4} />
            </div>
            <div>
              <p className="text-[11px] font-bold tracking-[0.18em] text-slate-400 dark:text-slate-500 uppercase">
                Pulso del día
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                Señales rápidas
              </h2>
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            <div className="rounded-[1rem] border border-slate-200/80 bg-white/90 px-4 py-4 dark:border-slate-700/60 dark:bg-slate-900/45">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Vencimientos críticos</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Tareas retrasadas que aún no están cerradas.
                  </p>
                </div>
                <StatusBadge tone={summary.overdue > 0 ? 'danger' : 'success'}>
                  {summary.overdue > 0 ? `${summary.overdue} pendientes` : 'En orden'}
                </StatusBadge>
              </div>
            </div>

            <div className="rounded-[1rem] border border-slate-200/80 bg-white/90 px-4 py-4 dark:border-slate-700/60 dark:bg-slate-900/45">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Sincronización</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Tareas conectadas con Google Calendar.
                  </p>
                </div>
                <StatusBadge tone={summary.syncedTasks > 0 ? 'success' : 'neutral'}>
                  {summary.syncedTasks} enlazadas
                </StatusBadge>
              </div>
            </div>

            <div className="rounded-[1rem] border border-slate-200/80 bg-white/90 px-4 py-4 dark:border-slate-700/60 dark:bg-slate-900/45">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Ritmo semanal</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Balance entre entregas inmediatas y carga del resto de la semana.
                  </p>
                </div>
                <StatusBadge tone={summary.tasksThisWeek > 5 ? 'warning' : 'info'}>
                  {summary.tasksThisWeek > 5 ? 'Semana intensa' : 'Semana controlada'}
                </StatusBadge>
              </div>
            </div>
          </div>
        </SurfaceCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(330px,0.95fr)]">
        <SurfaceCard className="p-6 lg:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold tracking-[0.18em] text-slate-400 dark:text-slate-500 uppercase">
                Agenda inmediata
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                Próximos entregables
              </h2>
            </div>
            <StatusBadge tone="info">{upcomingTasks.length} próximos</StatusBadge>
          </div>

          <div className="mt-5 space-y-3">
            {upcomingTasks.length > 0 ? (
              upcomingTasks.map((task) => {
                const partner = partners.find((item) => item.id === task.partnerId);
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-4 rounded-[1rem] border border-slate-100 bg-slate-50/70 px-4 py-4 dark:border-slate-700/60 dark:bg-slate-900/45"
                  >
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold"
                      style={{ backgroundColor: `${accentColor}12`, color: accentColor }}
                    >
                      {(partner?.name || task.title).charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                          {task.title}
                        </h3>
                        <StatusBadge tone={statusToneMap[task.status]} className="hidden sm:inline-flex">
                          {task.status}
                        </StatusBadge>
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                        {partner?.name || 'Sin marca'} · {parseLocalDate(task.dueDate).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        ${task.value.toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState
                icon={CalendarClock}
                title="No hay entregables próximos"
                description="Cuando añadas nuevas tareas o fechas, aparecerán aquí para que puedas priorizarlas."
              />
            )}
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-6 lg:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold tracking-[0.18em] text-slate-400 dark:text-slate-500 uppercase">
                Estado operativo
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                Ritmo del pipeline
              </h2>
            </div>
            <StatusBadge tone="neutral">{tasks.length} tareas</StatusBadge>
          </div>

          <div className="mt-5 space-y-4">
            {breakdown.map((item) => {
              const width = tasks.length > 0 ? Math.max((item.count / tasks.length) * 100, item.count > 0 ? 8 : 0) : 0;
              return (
                <div key={item.status}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge tone={statusToneMap[item.status]}>{item.status}</StatusBadge>
                      <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                        {item.count}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      ${item.value.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${width}%`,
                        backgroundColor: accentColor,
                        opacity: item.count > 0 ? 0.95 : 0.2,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {summary.overdue > 0 ? (
            <div className="mt-6 rounded-[1rem] border border-rose-200/80 bg-rose-50/90 px-4 py-4 dark:border-rose-500/20 dark:bg-rose-500/10">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-rose-500">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-rose-700 dark:text-rose-200">
                    Atención: hay tareas fuera de fecha
                  </p>
                  <p className="mt-1 text-xs leading-5 text-rose-600 dark:text-rose-200/85">
                    Revisa el pipeline para desbloquear {summary.overdue} entrega{summary.overdue === 1 ? '' : 's'} atrasada{summary.overdue === 1 ? '' : 's'}.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </SurfaceCard>
      </section>
    </div>
  );
}
