import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  DownloadCloud,
  List as ListIcon,
  PencilLine,
  Plus,
  RefreshCw,
  Trello,
  Trash2,
} from 'lucide-react';
import type { Task, TaskStatus } from '@shared/domain';
import { useAppContext } from '../context/AppContext';
import OverlayModal from '../components/OverlayModal';
import {
  Button,
  EmptyState,
  IconButton,
  MetricCard,
  ModalPanel,
  ScreenHeader,
  StatusBadge,
  SurfaceCard,
  cx,
} from '../components/ui';
import ConfirmDialog from '../components/ConfirmDialog';
import { formatLocalDateISO, parseLocalDate, startOfLocalDay } from '../lib/date';

const REVIEW_STATUS = 'En Revisión' as TaskStatus;
const STATUSES: TaskStatus[] = ['Pendiente', 'En Progreso', REVIEW_STATUS, 'Completada', 'Cobro'];
const WEEKDAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const EMPTY_FORM = {
  title: '',
  description: '',
  partnerName: '',
  value: '',
  dueDate: '',
  status: 'Pendiente' as TaskStatus,
};

const fieldClass =
  'w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-900 transition-all focus:bg-white focus:outline-none focus:ring-2 dark:border-slate-700 dark:bg-slate-900/50 dark:text-white dark:focus:bg-slate-800';

const formatCurrency = (value: number) => `$${value.toLocaleString('es-ES')}`;

const formatTaskDate = (value: string, options?: Intl.DateTimeFormatOptions) =>
  parseLocalDate(value).toLocaleDateString(
    'es-ES',
    options ?? {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  );

const getStatusTone = (status: TaskStatus): 'warning' | 'info' | 'accent' | 'success' | 'neutral' => {
  if (status === 'Pendiente') return 'warning';
  if (status === 'En Progreso') return 'info';
  if (status === REVIEW_STATUS) return 'accent';
  if (status === 'Completada') return 'success';
  return 'neutral';
};

export default function Pipeline() {
  const {
    tasks,
    partners,
    accentColor,
    addTask,
    addPartner,
    updateTask,
    updateTaskStatus,
    deleteTask,
    reportActionError,
  } = useAppContext();
  const [view, setView] = useState<'kanban' | 'list' | 'calendar'>('kanban');
  const [currentStatusIdx, setCurrentStatusIdx] = useState(0);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [syncingTaskId, setSyncingTaskId] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [isSyncingDown, setIsSyncingDown] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [taskPendingDeletion, setTaskPendingDeletion] = useState<Task | null>(null);
  const [isWideDesktopCalendar, setIsWideDesktopCalendar] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 1536,
  );

  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => parseLocalDate(a.dueDate).getTime() - parseLocalDate(b.dueDate).getTime()),
    [tasks],
  );
  const tasksByStatus = useMemo(
    () =>
      STATUSES.reduce(
        (accumulator, status) => {
          accumulator[status] = sortedTasks.filter((task) => task.status === status);
          return accumulator;
        },
        {} as Record<TaskStatus, Task[]>,
      ),
    [sortedTasks],
  );

  const currentStatus = STATUSES[currentStatusIdx];
  const visibleTasks = view === 'kanban' ? tasksByStatus[currentStatus] : sortedTasks;
  const todayIso = formatLocalDateISO(new Date());
  const selectedDateTasks = selectedDate ? sortedTasks.filter((task) => task.dueDate === selectedDate) : [];
  const monthTasks = sortedTasks.filter((task) => {
    const dueDate = parseLocalDate(task.dueDate);
    return (
      dueDate.getMonth() === currentMonth.getMonth() &&
      dueDate.getFullYear() === currentMonth.getFullYear()
    );
  });
  const editingTask = editingTaskId ? sortedTasks.find((task) => task.id === editingTaskId) ?? null : null;
  const syncedTasks = sortedTasks.filter((task) => Boolean(task.gcalEventId)).length;
  const weeklyTasks = sortedTasks.filter((task) => {
    const dueDate = parseLocalDate(task.dueDate);
    const start = startOfLocalDay(new Date());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return dueDate >= start && dueDate <= end;
  }).length;
  const openValue = sortedTasks
    .filter((task) => task.status !== 'Cobro')
    .reduce((sum, task) => sum + task.value, 0);
  const calendarPanelTasks = selectedDate ? selectedDateTasks : monthTasks;
  const monthLabel = currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const calendarPanelLabel = selectedDate
    ? formatTaskDate(selectedDate, { day: 'numeric', month: 'long', year: 'numeric' })
    : monthLabel;
  const calendarPanelSummary =
    calendarPanelTasks.length === 1
      ? '1 tarea programada en este bloque de tiempo.'
      : `${calendarPanelTasks.length} tareas programadas en este bloque de tiempo.`;

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleResize = () => {
      setIsWideDesktopCalendar(window.innerWidth >= 1536);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const resetModal = () => {
    setModalMode(null);
    setEditingTaskId(null);
    setForm(EMPTY_FORM);
  };

  const requestTaskDeletion = (task: Task) => {
    setTaskPendingDeletion(task);
  };

  const openCreate = () => {
    setEditingTaskId(null);
    setForm({ ...EMPTY_FORM, dueDate: todayIso, status: currentStatus });
    setModalMode('create');
  };

  const openEdit = (task: Task) => {
    const partnerName = partners.find((partner) => partner.id === task.partnerId)?.name || '';
    setEditingTaskId(task.id);
    setForm({
      title: task.title,
      description: task.description,
      partnerName,
      value: String(task.value),
      dueDate: task.dueDate,
      status: task.status,
    });
    setModalMode('edit');
  };

  const saveTask = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmittingTask(true);

    try {
      const normalizedPartner = form.partnerName.trim();
      let partnerId = partners.find(
        (partner) => partner.name.trim().toLowerCase() === normalizedPartner.toLowerCase(),
      )?.id;

      if (!partnerId) {
        partnerId = await addPartner({ name: normalizedPartner, status: 'Prospecto', contacts: [] });
      }

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        partnerId,
        status: form.status,
        dueDate: form.dueDate,
        value: Number(form.value) || 0,
      };

      if (modalMode === 'edit' && editingTaskId) {
        await updateTask(editingTaskId, payload);
      } else {
        await addTask(payload);
      }

      resetModal();
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const changeStatus = async (taskId: string, status: TaskStatus) => {
    setUpdatingTaskId(taskId);

    try {
      await updateTaskStatus(taskId, status);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const confirmTaskDeletion = async () => {
    if (!taskPendingDeletion) return;

    const task = taskPendingDeletion;
    setDeletingTaskId(task.id);

    try {
      await deleteTask(task.id);
      if (editingTaskId === task.id) resetModal();
      if (
        selectedDate &&
        task.dueDate === selectedDate &&
        selectedDateTasks.filter((item) => item.id !== task.id).length === 0
      ) {
        setSelectedDate(null);
      }
    } finally {
      setDeletingTaskId(null);
      setTaskPendingDeletion(null);
    }
  };

  const syncTask = async (task: Task) => {
    setSyncingTaskId(task.id);

    try {
      const partner = partners.find((item) => item.id === task.partnerId);
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: { ...task, partnerName: partner?.name } }),
      });

      if (!response.ok) {
        reportActionError('No pudimos sincronizar la tarea. Conecta Google Calendar desde Ajustes.');
        return;
      }

      const data = await response.json();
      await updateTask(task.id, { gcalEventId: data.eventId });
    } catch (error) {
      console.error(error);
      reportActionError('Se perdió la conexión al sincronizar la tarea.');
    } finally {
      setSyncingTaskId(null);
    }
  };

  const syncDown = async () => {
    setIsSyncingDown(true);

    try {
      const eventIds = tasks.map((task) => task.gcalEventId).filter((id): id is string => Boolean(id));
      if (eventIds.length === 0) return;

      const response = await fetch('/api/calendar/sync-down', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventIds }),
      });

      if (!response.ok) {
        reportActionError('No pudimos traer cambios desde Google Calendar.');
        return;
      }

      const data = await response.json();
      await Promise.all(
        (data.updatedEvents || []).map(async (updated: { eventId: string; dueDate: string }) => {
          const task = tasks.find((item) => item.gcalEventId === updated.eventId);
          if (task && task.dueDate !== updated.dueDate) {
            await updateTask(task.id, { dueDate: updated.dueDate });
          }
        }),
      );
    } catch (error) {
      console.error(error);
      reportActionError('Se perdió la conexión al traer cambios desde Google Calendar.');
    } finally {
      setIsSyncingDown(false);
    }
  };

  const renderTaskCard = (task: Task, variant: 'kanban' | 'calendar' = 'kanban') => {
    const partner = partners.find((item) => item.id === task.partnerId);
    const isCalendarVariant = variant === 'calendar';

    return (
      <div key={task.id}>
        <SurfaceCard tone="inset" className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[11px] font-bold tracking-[0.16em] text-slate-400 uppercase dark:text-slate-500">
                {partner?.name || 'Sin marca'}
              </p>
              <h3 className="mt-2 text-sm font-bold leading-5 text-slate-900 dark:text-slate-100">
                {task.title}
              </h3>
            </div>
            <p className="shrink-0 text-sm font-black text-slate-900 dark:text-slate-100">
              {formatCurrency(task.value)}
            </p>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge tone={getStatusTone(task.status)}>{task.status}</StatusBadge>
            <span className="rounded-[0.8rem] bg-slate-100 px-3 py-1 text-[11px] font-bold tracking-[0.1em] text-slate-500 uppercase dark:bg-slate-800 dark:text-slate-300">
              {formatTaskDate(task.dueDate, { day: '2-digit', month: 'short' })}
            </span>
          </div>

          <p
            className={cx(
              'mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400',
              isCalendarVariant ? 'line-clamp-3' : 'line-clamp-2',
            )}
          >
            {task.description || 'Sin descripción todavía.'}
          </p>

          <div className="mt-4 space-y-3">
            <select
              value={task.status}
              disabled={updatingTaskId === task.id}
              onChange={(event) => void changeStatus(task.id, event.target.value as TaskStatus)}
              className="w-full rounded-[0.95rem] border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200"
              style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-700/60">
              <span className="inline-flex min-w-0 items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                {task.gcalEventId ? (
                  <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
                ) : (
                  <CalendarIcon size={14} className="shrink-0" />
                )}
                <span className="truncate">{task.gcalEventId ? 'Calendar activo' : 'Sin enlace externo'}</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void syncTask(task)}
                  disabled={syncingTaskId === task.id}
                  className={cx(
                    'inline-flex h-10 items-center justify-center rounded-[0.8rem] px-3 text-xs font-bold transition-all disabled:opacity-50',
                    task.gcalEventId
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300',
                  )}
                  aria-label={task.gcalEventId ? `Actualizar ${task.title} con Calendar` : `Sincronizar ${task.title}`}
                >
                  {syncingTaskId === task.id ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : task.gcalEventId ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <CalendarIcon size={14} />
                  )}
                </button>
                <IconButton
                  icon={PencilLine}
                  label={`Editar ${task.title}`}
                  onClick={() => openEdit(task)}
                  className="h-10 w-10 rounded-[0.8rem]"
                />
                <IconButton
                  icon={Trash2}
                  label={`Eliminar ${task.title}`}
                  onClick={() => requestTaskDeletion(task)}
                  disabled={deletingTaskId === task.id}
                  tone="danger"
                  className="h-10 w-10 rounded-[0.8rem]"
                />
              </div>
            </div>
          </div>
        </SurfaceCard>
      </div>
    );
  };

  const renderListRow = (task: Task) => {
    const partner = partners.find((item) => item.id === task.partnerId);

    return (
      <div
        key={task.id}
        className="grid gap-4 px-4 py-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(8.5rem,0.7fr)_minmax(8.5rem,0.7fr)_auto] xl:items-center xl:px-5"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-bold tracking-[0.16em] text-slate-400 uppercase dark:text-slate-500">
              {partner?.name || 'Sin marca'}
            </p>
            {task.gcalEventId ? (
              <span className="rounded-[0.75rem] bg-emerald-50 px-2.5 py-1 text-[10px] font-bold tracking-[0.12em] text-emerald-600 uppercase dark:bg-emerald-500/15 dark:text-emerald-300">
                Calendar
              </span>
            ) : null}
          </div>
          <h3 className="mt-2 text-sm font-bold leading-5 text-slate-900 dark:text-slate-100">{task.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {task.description || 'Sin descripción todavía.'}
          </p>
        </div>

        <div>
          <p className="text-[11px] font-bold tracking-[0.16em] text-slate-400 uppercase dark:text-slate-500">
            Entrega
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            {formatTaskDate(task.dueDate)}
          </p>
        </div>

        <div>
          <p className="text-[11px] font-bold tracking-[0.16em] text-slate-400 uppercase dark:text-slate-500">
            Valor
          </p>
          <p className="mt-2 text-base font-extrabold text-slate-900 dark:text-slate-100">
            {formatCurrency(task.value)}
          </p>
          <div className="mt-2">
            <StatusBadge tone={getStatusTone(task.status)}>{task.status}</StatusBadge>
          </div>
        </div>

        <div className="flex flex-col gap-2 xl:items-end">
          <select
            value={task.status}
            disabled={updatingTaskId === task.id}
            onChange={(event) => void changeStatus(task.id, event.target.value as TaskStatus)}
            className="w-full rounded-[0.95rem] border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 xl:w-[10.5rem] dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200"
            style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <div className="flex items-center justify-between gap-2 xl:justify-end">
            <button
              type="button"
              onClick={() => void syncTask(task)}
              disabled={syncingTaskId === task.id}
              className={cx(
                'inline-flex h-10 items-center justify-center rounded-[0.8rem] px-3 text-xs font-bold transition-all disabled:opacity-50',
                task.gcalEventId
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300',
              )}
            >
              {syncingTaskId === task.id ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : task.gcalEventId ? (
                <CheckCircle2 size={14} />
              ) : (
                <CalendarIcon size={14} />
              )}
            </button>
            <IconButton
              icon={PencilLine}
              label={`Editar ${task.title}`}
              onClick={() => openEdit(task)}
              className="h-10 w-10 rounded-[0.8rem]"
            />
            <IconButton
              icon={Trash2}
              label={`Eliminar ${task.title}`}
              onClick={() => requestTaskDeletion(task)}
              disabled={deletingTaskId === task.id}
              tone="danger"
              className="h-10 w-10 rounded-[0.8rem]"
            />
          </div>
        </div>
      </div>
    );
  };
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const blanks = Array.from({ length: firstDay }, (_, index) => (
    <div key={`empty-${index}`} className="min-h-[4.5rem] rounded-[0.85rem] sm:min-h-[6.5rem] sm:rounded-[1rem] xl:min-h-[8.5rem]" />
  ));
  const days = Array.from({ length: daysInMonth }, (_, offset) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), offset + 1);
    const iso = formatLocalDateISO(date);
    const dayTasks = sortedTasks.filter((task) => task.dueDate === iso);
    const isToday = iso === todayIso;
    const isSelected = iso === selectedDate;

    return (
      <button
        key={iso}
        type="button"
        onClick={() => setSelectedDate(iso)}
        className={cx(
          'min-h-[4.5rem] rounded-[0.85rem] border p-2 text-left transition-all sm:min-h-[6.5rem] sm:rounded-[1rem] sm:p-3 xl:min-h-[8.5rem]',
          isSelected
            ? 'border-transparent bg-slate-900 text-white shadow-[0_20px_45px_-28px_rgba(15,23,42,0.55)] dark:bg-slate-100 dark:text-slate-900'
            : isToday
              ? 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/55'
              : 'border-transparent bg-white/65 hover:border-slate-200 hover:bg-white dark:bg-slate-900/30 dark:hover:border-slate-700 dark:hover:bg-slate-900/55',
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <span
            className={cx(
              'inline-flex h-7 min-w-7 items-center justify-center rounded-[0.75rem] px-2 text-[11px] font-black sm:h-8 sm:min-w-8 sm:text-xs',
              isSelected
                ? 'bg-white/18 text-white dark:bg-slate-900/10 dark:text-slate-900'
                : dayTasks.length > 0
                  ? ''
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300',
            )}
            style={
              !isSelected && dayTasks.length > 0
                ? { backgroundColor: accentColor, color: 'var(--accent-foreground)' }
                : undefined
            }
          >
            {date.getDate()}
          </span>
          {dayTasks.length > 0 ? (
            <span
              className={cx(
                'rounded-[0.7rem] px-1.5 py-0.5 text-[9px] font-bold tracking-[0.12em] uppercase sm:px-2 sm:py-1 sm:text-[10px]',
                isSelected
                  ? 'bg-white/12 text-white dark:bg-slate-900/10 dark:text-slate-900'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300',
              )}
            >
              {dayTasks.length}
            </span>
          ) : null}
        </div>

        <div className="mt-2 space-y-1 sm:mt-3 sm:space-y-1.5">
          {dayTasks.slice(0, 2).map((task) => (
            <div
              key={task.id}
              className={cx(
                'hidden truncate rounded-[0.7rem] px-2 py-1 text-[11px] font-semibold sm:block',
                isSelected
                  ? 'bg-white/12 text-white dark:bg-slate-900/10 dark:text-slate-900'
                  : 'bg-slate-100/90 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
              )}
            >
              {task.title}
            </div>
          ))}

          {dayTasks.length > 2 ? (
            <p
              className={cx(
                'hidden pt-0.5 text-[11px] font-bold sm:block',
                isSelected ? 'text-white/80 dark:text-slate-700' : 'text-slate-400 dark:text-slate-500',
              )}
            >
              +{dayTasks.length - 2} más
            </p>
          ) : dayTasks.length === 0 ? (
            <p
              className={cx(
                'hidden pt-1 text-[11px] font-medium lg:block',
                isSelected ? 'text-white/75 dark:text-slate-700' : 'text-slate-400 dark:text-slate-500',
              )}
            >
              Sin tareas
            </p>
          ) : null}
        </div>
      </button>
    );
  });
  return (
    <div className="space-y-5 p-4 pb-6 lg:space-y-6 lg:px-8 lg:pt-4 lg:pb-8">
      <ScreenHeader
        mobileOnly
        eyebrow="Pipeline"
        title="Pipeline"
        description="Sigue entregables, mueve fases y revisa sincronizaciones sin perder el control de la semana."
        actions={
          <div className="flex gap-2">
            <IconButton
              icon={DownloadCloud}
              label="Traer cambios desde Google Calendar"
              onClick={() => void syncDown()}
              disabled={isSyncingDown}
            />
            <IconButton
              icon={Plus}
              label="Crear nueva tarea"
              onClick={openCreate}
              tone="primary"
              accentColor={accentColor}
            />
          </div>
        }
        className="px-2"
      />

      <div className="grid gap-3 min-[360px]:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={ListIcon}
          label="Tareas activas"
          value={`${sortedTasks.length}`}
          helper="Volumen total visible en este pipeline."
          accentColor={accentColor}
        />
        <MetricCard
          icon={CalendarDays}
          label="Esta semana"
          value={`${weeklyTasks}`}
          helper="Entregas previstas para los próximos 7 días."
          accentColor={accentColor}
        />
        <MetricCard
          icon={CalendarIcon}
          label="Sincronizadas"
          value={`${syncedTasks}`}
          helper="Tareas vinculadas con Google Calendar."
          accentColor={accentColor}
        />
        <MetricCard
          icon={CheckCircle2}
          label="Valor abierto"
          value={formatCurrency(openValue)}
          helper="Importe pendiente de cierre o cobro."
          accentColor={accentColor}
        />
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <SurfaceCard tone="muted" className="p-1.5">
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'kanban', icon: Trello, label: 'Kanban' },
              { id: 'list', icon: ListIcon, label: 'Lista' },
              { id: 'calendar', icon: CalendarIcon, label: 'Mes' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setView(tab.id as typeof view)}
                className={cx(
                  'flex items-center justify-center gap-2 rounded-[0.85rem] px-3 py-3 text-sm font-bold transition-all',
                  view === tab.id
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
                    : 'text-slate-500 dark:text-slate-400',
                )}
              >
                <tab.icon size={18} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </SurfaceCard>

        <div className="hidden items-center gap-2 xl:flex">
          <Button tone="secondary" onClick={() => void syncDown()} disabled={isSyncingDown}>
            <DownloadCloud size={16} />
            Actualizar Calendar
          </Button>
          <Button accentColor={accentColor} onClick={openCreate}>
            <Plus size={16} />
            Nueva tarea
          </Button>
        </div>
      </div>

      {view === 'kanban' ? (
        <div className="space-y-4">
          <div className="lg:hidden">
            <SurfaceCard tone="muted" className="p-3">
              <div className="flex items-center justify-between gap-3">
                <IconButton
                  icon={ChevronLeft}
                  label="Ver fase anterior"
                  onClick={() => setCurrentStatusIdx(Math.max(0, currentStatusIdx - 1))}
                  disabled={currentStatusIdx === 0}
                  tone="ghost"
                />
                <div className="text-center">
                  <p className="text-[11px] font-bold tracking-[0.16em] text-slate-400 uppercase dark:text-slate-500">
                    Fase {currentStatusIdx + 1} de {STATUSES.length}
                  </p>
                  <h2 className="mt-1 text-lg font-extrabold" style={{ color: accentColor }}>
                    {currentStatus}
                  </h2>
                </div>
                <IconButton
                  icon={ChevronRight}
                  label="Ver siguiente fase"
                  onClick={() => setCurrentStatusIdx(Math.min(STATUSES.length - 1, currentStatusIdx + 1))}
                  disabled={currentStatusIdx === STATUSES.length - 1}
                  tone="ghost"
                />
              </div>
            </SurfaceCard>

            <div className="mt-3 space-y-3">
              {visibleTasks.length > 0 ? (
                visibleTasks.map((task) => renderTaskCard(task))
              ) : (
                <EmptyState
                  icon={Trello}
                  title="No hay tareas en esta fase"
                  description="Cuando muevas tareas o crees una nueva, aparecerán aquí."
                />
              )}
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="grid gap-4 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3">
              {STATUSES.map((status) => {
                const columnTasks = tasksByStatus[status];
                const columnValue = columnTasks.reduce((sum, task) => sum + task.value, 0);

                return (
                  <div key={status}>
                    <SurfaceCard
                      tone="muted"
                      className="flex min-w-0 flex-col self-start p-4"
                    >
                      <div className="flex items-start justify-between gap-3 border-b border-slate-200/70 pb-4 dark:border-slate-700/60">
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold tracking-[0.16em] text-slate-400 uppercase dark:text-slate-500">
                            Fase
                          </p>
                          <h2 className="mt-1 text-base font-extrabold" style={{ color: accentColor }}>
                            {status}
                          </h2>
                          <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                            {formatCurrency(columnValue)}
                          </p>
                        </div>
                        <span className="rounded-[0.8rem] bg-white px-3 py-1.5 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {columnTasks.length}
                        </span>
                      </div>

                      <div className="mt-4 space-y-3">
                        {columnTasks.length > 0 ? (
                          columnTasks.map((task) => renderTaskCard(task))
                        ) : (
                          <EmptyState
                            title="Sin tareas en esta fase"
                            description="Añade una entrega o mueve una tarea para equilibrar el flujo."
                            className="px-4 py-6"
                          />
                        )}
                      </div>
                    </SurfaceCard>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {view === 'list' ? (
        sortedTasks.length > 0 ? (
          <SurfaceCard tone="muted" className="overflow-hidden">
            <div className="hidden grid-cols-[minmax(0,1.45fr)_minmax(8.5rem,0.7fr)_minmax(8.5rem,0.7fr)_auto] gap-4 border-b border-slate-200/70 px-5 py-3 text-[11px] font-bold tracking-[0.16em] text-slate-400 uppercase xl:grid dark:border-slate-700/60 dark:text-slate-500">
              <span>Tarea</span>
              <span>Entrega</span>
              <span>Estado</span>
              <span className="text-right">Acciones</span>
            </div>
            <div className="divide-y divide-slate-200/70 dark:divide-slate-700/60">
              {sortedTasks.map((task) => renderListRow(task))}
            </div>
          </SurfaceCard>
        ) : (
          <EmptyState
            icon={ListIcon}
            title="Todavía no hay tareas"
            description="Añade tu primera entrega para empezar a construir el pipeline."
            action={
              <Button accentColor={accentColor} onClick={openCreate}>
                <Plus size={16} />
                Crear tarea
              </Button>
            }
          />
        )
      ) : null}

      {view === 'calendar' ? (
        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_minmax(18rem,22vw)]">
          <SurfaceCard className="p-5 lg:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <IconButton
                icon={ChevronLeft}
                label="Mes anterior"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                tone="ghost"
              />
              <div className="text-center">
                <p className="text-[11px] font-bold tracking-[0.16em] text-slate-400 uppercase dark:text-slate-500">
                  Vista mensual
                </p>
                <h2 className="mt-1 text-lg font-extrabold capitalize text-slate-900 dark:text-slate-100">
                  {monthLabel}
                </h2>
              </div>
              <IconButton
                icon={ChevronRight}
                label="Mes siguiente"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                tone="ghost"
              />
            </div>

            <div className="mb-3 grid grid-cols-7 gap-1 sm:gap-2">
              {WEEKDAY_LABELS.map((day) => (
                <div
                  key={day}
                  className="py-1.5 text-center text-[9px] font-bold tracking-[0.14em] text-slate-400 uppercase dark:text-slate-500 sm:py-2 sm:text-[10px]"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {blanks}
              {days}
            </div>
          </SurfaceCard>

          <div className="hidden 2xl:block">
            <SurfaceCard tone="muted" className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold tracking-[0.16em] text-slate-400 uppercase dark:text-slate-500">
                    {selectedDate ? 'Agenda del día' : 'Agenda del mes'}
                  </p>
                  <h3 className="mt-1 text-lg font-extrabold capitalize text-slate-900 dark:text-slate-100">
                    {calendarPanelLabel}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {calendarPanelTasks.length > 0
                      ? calendarPanelSummary
                      : 'No hay tareas programadas en este bloque de tiempo.'}
                  </p>
                </div>
                {selectedDate ? (
                  <button
                    type="button"
                    onClick={() => setSelectedDate(null)}
                    className="rounded-[0.8rem] bg-white px-3 py-2 text-xs font-bold text-slate-500 transition-colors hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-white"
                  >
                    Ver mes
                  </button>
                ) : null}
              </div>

              <div className="mt-5 space-y-3">
                {calendarPanelTasks.length > 0 ? (
                  calendarPanelTasks.map((task) => renderTaskCard(task, 'calendar'))
                ) : (
                  <EmptyState
                    icon={CalendarDays}
                    title="Sin tareas programadas"
                    description="Selecciona otro día o crea una nueva entrega para poblar el calendario."
                    className="px-4 py-6"
                  />
                )}
              </div>
            </SurfaceCard>
          </div>
        </div>
      ) : null}

      {selectedDate && !isWideDesktopCalendar ? (
        <div className="2xl:hidden">
          <OverlayModal onClose={() => setSelectedDate(null)}>
            <ModalPanel
              title={formatTaskDate(selectedDate, { day: 'numeric', month: 'long', year: 'numeric' })}
              description="Estas son las tareas programadas para esta fecha."
              onClose={() => setSelectedDate(null)}
              size="lg"
            >
              <div className="space-y-3">
                {selectedDateTasks.length > 0 ? (
                  selectedDateTasks.map((task) => renderTaskCard(task, 'calendar'))
                ) : (
                  <EmptyState title="No hay tareas para este día" />
                )}
              </div>
            </ModalPanel>
          </OverlayModal>
        </div>
      ) : null}
      {taskPendingDeletion ? (
        <ConfirmDialog
          title="Eliminar tarea"
          description={`Se eliminará "${taskPendingDeletion.title}" del pipeline y no podrás recuperarla desde esta vista.`}
          confirmLabel="Eliminar"
          onConfirm={() => void confirmTaskDeletion()}
          onClose={() => setTaskPendingDeletion(null)}
          isConfirming={deletingTaskId === taskPendingDeletion.id}
        />
      ) : null}
      {modalMode ? (
        <OverlayModal onClose={resetModal}>
          <ModalPanel
            title={modalMode === 'edit' ? 'Editar tarea' : 'Nueva tarea'}
            description="Completa la información principal para que el pipeline se mantenga claro y accionable."
            onClose={resetModal}
            footer={
              <div className="flex gap-3">
                {modalMode === 'edit' && editingTask ? (
                  <Button
                    tone="danger"
                    className="flex-1"
                    onClick={() => requestTaskDeletion(editingTask)}
                    disabled={deletingTaskId === editingTask.id}
                  >
                    {deletingTaskId === editingTask.id ? 'Eliminando…' : 'Eliminar'}
                  </Button>
                ) : null}
                <Button
                  type="submit"
                  form="pipeline-task-form"
                  accentColor={accentColor}
                  className="flex-1"
                  disabled={isSubmittingTask}
                >
                  {isSubmittingTask
                    ? 'Guardando…'
                    : modalMode === 'edit'
                      ? 'Guardar cambios'
                      : 'Crear tarea'}
                </Button>
              </div>
            }
          >
            <form id="pipeline-task-form" onSubmit={saveTask} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-bold tracking-[0.14em] text-slate-500 dark:text-slate-400 uppercase">
                    Título
                  </label>
                  <input
                    required
                    value={form.title}
                    onChange={(event) => setForm({ ...form, title: event.target.value })}
                    className={fieldClass}
                    style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                    placeholder="Ej. Reel de lanzamiento"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-bold tracking-[0.14em] text-slate-500 dark:text-slate-400 uppercase">
                    Descripción
                  </label>
                  <textarea
                    required
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                    className={cx(fieldClass, 'min-h-[130px]')}
                    style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                    placeholder="Define el entregable, formato y cualquier detalle operativo."
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-bold tracking-[0.14em] text-slate-500 dark:text-slate-400 uppercase">
                    Partner o marca
                  </label>
                  <input
                    required
                    value={form.partnerName}
                    onChange={(event) => setForm({ ...form, partnerName: event.target.value })}
                    className={fieldClass}
                    style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                    placeholder="Ej. TechBrand"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold tracking-[0.14em] text-slate-500 dark:text-slate-400 uppercase">
                    Valor
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.value}
                    onChange={(event) => setForm({ ...form, value: event.target.value })}
                    className={fieldClass}
                    style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                    placeholder="1500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold tracking-[0.14em] text-slate-500 dark:text-slate-400 uppercase">
                    Fecha
                  </label>
                  <input
                    type="date"
                    required
                    value={form.dueDate}
                    onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
                    className={fieldClass}
                    style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-bold tracking-[0.14em] text-slate-500 dark:text-slate-400 uppercase">
                    Estado inicial
                  </label>
                  <select
                    value={form.status}
                    onChange={(event) => setForm({ ...form, status: event.target.value as TaskStatus })}
                    className={fieldClass}
                    style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </form>
          </ModalPanel>
        </OverlayModal>
      ) : null}
    </div>
  );
}
