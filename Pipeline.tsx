﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlignLeft,
  Building2,
  Calendar as CalendarIcon,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  DownloadCloud,
  List as ListIcon,
  PencilLine,
  Plus,
  RefreshCw,
  Search,
  Trello,
  Type,
} from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import { getPartnerLookupKey, type Task, type TaskStatus } from '@shared';
import { useAppContext } from '../context/AppContext';
import OverlayModal from '../components/OverlayModal';
import {
  Button,
  EmptyState,
  IconButton,
  ModalPanel,
  StatusBadge,
  SurfaceCard,
  cx,
} from '../components/ui';
import CustomSelect from '../components/CustomSelect';
import ConfirmDialog from '../components/ConfirmDialog';
import { formatLocalDateISO, parseLocalDate, startOfLocalDay } from '../lib/date';
import { toast } from '../lib/toast';

const REVIEW_STATUS = 'En Revisión' as TaskStatus;
const STATUSES: TaskStatus[] = ['Pendiente', 'En Progreso', REVIEW_STATUS, 'Completada', 'Cobrado'];
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
  'w-full rounded-[1rem] border bg-[var(--surface-muted)] px-4 py-3.5 text-sm font-medium text-[var(--text-primary)] transition-all placeholder:text-[var(--text-secondary)] focus:border-transparent focus:bg-[var(--surface-card)] focus:outline-none focus:ring-2 [border-color:var(--line-soft)]';

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

const getStatusSelectStyle = (status: TaskStatus, accentColor: string): React.CSSProperties => {
  if (status === 'Pendiente') {
    return {
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      borderColor: 'rgba(245, 158, 11, 0.32)',
      color: '#b45309',
      '--tw-ring-color': 'rgba(245, 158, 11, 0.28)',
    } as React.CSSProperties;
  }

  if (status === 'En Progreso') {
    return {
      backgroundColor: 'rgba(59, 130, 246, 0.12)',
      borderColor: 'rgba(59, 130, 246, 0.28)',
      color: '#1d4ed8',
      '--tw-ring-color': 'rgba(59, 130, 246, 0.26)',
    } as React.CSSProperties;
  }

  if (status === REVIEW_STATUS) {
    return {
      backgroundColor: `${accentColor}14`,
      borderColor: `${accentColor}45`,
      color: accentColor,
      '--tw-ring-color': accentColor,
    } as React.CSSProperties;
  }

  if (status === 'Completada') {
    return {
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      borderColor: 'rgba(16, 185, 129, 0.28)',
      color: '#047857',
      '--tw-ring-color': 'rgba(16, 185, 129, 0.24)',
    } as React.CSSProperties;
  }

  return {
    backgroundColor: 'rgba(100, 116, 139, 0.12)',
    borderColor: 'rgba(100, 116, 139, 0.24)',
    color: '#475569',
    '--tw-ring-color': 'rgba(100, 116, 139, 0.22)',
  } as React.CSSProperties;
};

const getStatusDotStyle = (status: TaskStatus, accentColor: string): React.CSSProperties => {
  if (status === 'Pendiente') {
    return { backgroundColor: '#f59e0b' };
  }

  if (status === 'En Progreso') {
    return { backgroundColor: '#3b82f6' };
  }

  if (status === REVIEW_STATUS) {
    return { backgroundColor: accentColor };
  }

  if (status === 'Completada') {
    return { backgroundColor: '#10b981' };
  }

  return { backgroundColor: '#64748b' };
};

const getRelativeTimeLabel = (dateString: string) => {
  const today = startOfLocalDay(new Date());
  const target = startOfLocalDay(parseLocalDate(dateString));
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Mañana';
  if (diffDays === -1) return 'Ayer';
  if (diffDays > 1 && diffDays <= 6) return `En ${diffDays} días`;
  if (diffDays < -1 && diffDays >= -6) return `Hace ${Math.abs(diffDays)} días`;
  return null;
};

const getPartnerMatchRank = (partnerName: string, query: string) => {
  const lookupKey = getPartnerLookupKey(partnerName);

  if (!query) {
    return 2;
  }

  if (lookupKey === query) {
    return 0;
  }

  if (lookupKey.startsWith(query)) {
    return 1;
  }

  return 2;
};

function DroppableColumn({
  id,
  isDraggingTask,
  children,
}: {
  id: string;
  isDraggingTask: boolean;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className="flex min-w-0 flex-col h-full">
      <SurfaceCard
        tone="muted"
        className={cx(
          'flex min-h-[16rem] max-h-[calc(100dvh-18rem)] min-w-0 flex-col p-4 transition-all duration-200 overflow-y-auto hide-scrollbar',
          isOver && isDraggingTask
            ? 'border-transparent bg-[var(--accent-soft)] shadow-[0_18px_34px_-26px_rgba(15,23,42,0.18)]'
            : 'border-transparent',
        )}
      >
        {children}
      </SurfaceCard>
    </div>
  );
}

function DraggableTaskWrapper({
  task,
  disabled,
  children,
}: {
  task: Task;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: task,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cx(
        'transition-opacity',
        !disabled && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-40',
      )}
    >
      {children}
    </div>
  );
}

export default function Pipeline() {
  const {
    tasks,
    partners,
    accentColor,
    addTask,
    findPartnerByName,
    ensurePartnerByName,
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
  const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);
  const [isPartnerPickerOpen, setIsPartnerPickerOpen] = useState(false);
  const [isWideDesktopCalendar, setIsWideDesktopCalendar] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 1536,
  );
  const [searchQuery, setSearchQuery] = useState('');

  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => parseLocalDate(a.dueDate).getTime() - parseLocalDate(b.dueDate).getTime()),
    [tasks],
  );

  const filteredSortedTasks = useMemo(() => {
    if (!searchQuery.trim()) return sortedTasks;
    const query = searchQuery.toLowerCase().trim();
    return sortedTasks.filter((task) => {
      const partner = partners.find((p) => p.id === task.partnerId);
      return (
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query) ||
        (partner?.name.toLowerCase().includes(query))
      );
    });
  }, [sortedTasks, searchQuery, partners]);

  const listTasks = useMemo(
    () =>
      [...filteredSortedTasks].sort((a, b) => {
        const aIsSettled = a.status === 'Cobrado';
        const bIsSettled = b.status === 'Cobrado';

        if (aIsSettled !== bIsSettled) {
          return aIsSettled ? 1 : -1;
        }

        return parseLocalDate(a.dueDate).getTime() - parseLocalDate(b.dueDate).getTime();
      }),
    [filteredSortedTasks],
  );
  const tasksByStatus = useMemo(
    () =>
      STATUSES.reduce(
        (accumulator, status) => {
          accumulator[status] = filteredSortedTasks.filter((task) => task.status === status);
          return accumulator;
        },
        {} as Record<TaskStatus, Task[]>,
      ),
    [filteredSortedTasks],
  );

  const currentStatus = STATUSES[currentStatusIdx];
  const visibleTasks = view === 'kanban' ? tasksByStatus[currentStatus] : filteredSortedTasks;
  const todayIso = formatLocalDateISO(new Date());
  const selectedDateTasks = selectedDate ? filteredSortedTasks.filter((task) => task.dueDate === selectedDate) : [];
  const monthTasks = filteredSortedTasks.filter((task) => {
    const dueDate = parseLocalDate(task.dueDate);
    return (
      dueDate.getMonth() === currentMonth.getMonth() &&
      dueDate.getFullYear() === currentMonth.getFullYear()
    );
  });
  const editingTask = editingTaskId ? sortedTasks.find((task) => task.id === editingTaskId) ?? null : null;
  const calendarPanelTasks = selectedDate ? selectedDateTasks : monthTasks;
  const monthLabel = currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const calendarPanelLabel = selectedDate
    ? formatTaskDate(selectedDate, { day: 'numeric', month: 'long', year: 'numeric' })
    : monthLabel;
  const partnerInputLookupKey = getPartnerLookupKey(form.partnerName);
  const selectedPartner = findPartnerByName(form.partnerName);
  const partnerSuggestions = useMemo(() => {
    const sortedPartners = [...partners].sort((a, b) => a.name.localeCompare(b.name, 'es-ES'));

    if (!partnerInputLookupKey) {
      return sortedPartners.slice(0, 6);
    }

    return sortedPartners
      .filter((partner) => getPartnerLookupKey(partner.name).includes(partnerInputLookupKey))
      .sort((a, b) => {
        const rankDiff =
          getPartnerMatchRank(a.name, partnerInputLookupKey) - getPartnerMatchRank(b.name, partnerInputLookupKey);

        if (rankDiff !== 0) {
          return rankDiff;
        }

        return a.name.localeCompare(b.name, 'es-ES');
      })
      .slice(0, 6);
  }, [partnerInputLookupKey, partners]);
  const shouldCreatePartnerOnSave = Boolean(form.partnerName.trim()) && !selectedPartner;
  const shouldShowPartnerSuggestions = isPartnerPickerOpen && partnerSuggestions.length > 0;
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
    setIsPartnerPickerOpen(false);
  };

  const requestTaskDeletion = (task: Task) => {
    setTaskPendingDeletion(task);
  };

  const openCreate = () => {
    setEditingTaskId(null);
    setForm({ ...EMPTY_FORM, dueDate: todayIso, status: currentStatus });
    setIsPartnerPickerOpen(false);
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
    setIsPartnerPickerOpen(false);
    setModalMode('edit');
  };

  const selectPartnerSuggestion = (partnerName: string) => {
    setForm((current) => ({ ...current, partnerName }));
    setIsPartnerPickerOpen(false);
  };

  const saveTask = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmittingTask(true);

    try {
      const partner = await ensurePartnerByName(form.partnerName);

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        partnerId: partner.id,
        status: form.status,
        dueDate: form.dueDate,
        value: Number(form.value) || 0,
      };

      if (modalMode === 'edit' && editingTaskId) {
        await updateTask(editingTaskId, payload);
        toast.success('Tarea actualizada correctamente');
      } else {
        await addTask(payload);
        toast.success('Nueva tarea añadida al pipeline');
      }

      resetModal();
    } catch (error) {
      toast.error('Revisa los datos de la tarea');
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

  const moveTaskToStatus = async (taskId: string, nextStatus: TaskStatus) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.status === nextStatus || updatingTaskId === taskId) return;
    await changeStatus(taskId, nextStatus);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: any) => {
    setActiveDragTask(event.active.data.current as Task);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    setActiveDragTask(null);

    if (over && over.id !== active.data.current?.status) {
      await moveTaskToStatus(active.id as string, over.id as TaskStatus);
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
      toast.info('Tarea eliminada');
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

  const renderTaskCard = (task: Task, variant: 'kanban' | 'calendar' = 'kanban', isOverlay = false) => {
    const partner = partners.find((item) => item.id === task.partnerId);
    const isCalendarVariant = variant === 'calendar';
    const isOverdue =
      startOfLocalDay(parseLocalDate(task.dueDate)) < startOfLocalDay(new Date()) && task.status !== 'Cobrado';
    const relativeTime = getRelativeTimeLabel(task.dueDate);

    return (
        <SurfaceCard
          tone="inset"
          className={cx(
            'group border p-4 transition-all duration-200',
            !isOverlay && 'border-transparent hover:border-[var(--line-soft)] hover:shadow-[0_20px_40px_-30px_rgba(59,43,34,0.18)]',
            variant === 'kanban' && !isOverlay && 'hover:-translate-y-0.5',
            isOverlay && 'rotate-2 scale-[1.03] shadow-[0_30px_60px_-20px_rgba(15,23,42,0.3)] border-[color:var(--line-soft)] cursor-grabbing'
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accentColor }} />
                <p className="truncate text-[11px] font-bold tracking-[0.16em] text-[var(--text-secondary)]/70 uppercase">
                  {partner?.name || 'Sin marca'}
                </p>
              </div>
              <h3 className="mt-2 text-sm font-bold leading-5 text-[var(--text-primary)]">
                {task.title}
              </h3>
            </div>
            <p className="shrink-0 text-sm font-black text-[var(--text-primary)]">
              {formatCurrency(task.value)}
            </p>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge tone={isOverdue ? 'danger' : 'neutral'}>
              {formatTaskDate(task.dueDate, { day: '2-digit', month: 'short' })}{relativeTime ? ` · ${relativeTime}` : ''}
            </StatusBadge>
          </div>

          <p
            className={cx(
              'mt-3 text-sm leading-6 text-[var(--text-secondary)]',
              isCalendarVariant ? 'line-clamp-3' : 'line-clamp-2',
            )}
          >
            {task.description || 'Sin descripción todavía.'}
          </p>

          <div className="mt-4 space-y-3">
            <CustomSelect
              value={task.status}
              disabled={updatingTaskId === task.id}
              onChange={(val) => void changeStatus(task.id, val as TaskStatus)}
              options={STATUSES.map(s => ({ value: s, label: s }))}
              buttonStyle={getStatusSelectStyle(task.status, accentColor)}
              buttonClassName="py-2.5 px-3 rounded-[0.8rem]"
            />

            <div className="flex items-center justify-between gap-3 border-t pt-3 [border-color:var(--line-soft)]">
              <span className="inline-flex min-w-0 items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
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
                    'inline-flex h-10 items-center justify-center rounded-[0.8rem] border px-3 text-xs font-bold transition-all disabled:opacity-50 [border-color:var(--line-soft)]',
                    task.gcalEventId
                      ? 'bg-emerald-50/70 text-emerald-700'
                      : 'bg-[var(--surface-card)] text-[var(--text-secondary)]',
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
                  tone="ghost"
                  className="h-10 w-8 rounded-[0.45rem]"
                  iconSize={16}
                />
              </div>
            </div>
          </div>
        </SurfaceCard>
    );
  };

  const renderListRow = (task: Task) => {
    const partner = partners.find((item) => item.id === task.partnerId);
    const isOverdue =
      startOfLocalDay(parseLocalDate(task.dueDate)) < startOfLocalDay(new Date()) && task.status !== 'Cobrado';
    const relativeTime = getRelativeTimeLabel(task.dueDate);

    return (
      <div
        key={task.id}
        className="grid gap-4 px-4 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--surface-muted)]/70 xl:grid-cols-[minmax(0,1.5fr)_minmax(8rem,0.7fr)_minmax(7.5rem,0.65fr)_minmax(11rem,0.9fr)] xl:items-start xl:px-5"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-bold tracking-[0.16em] text-[var(--text-secondary)]/70 uppercase">
              {partner?.name || 'Sin marca'}
            </p>
            {task.gcalEventId ? (
              <span className="rounded-[0.75rem] bg-emerald-50 px-2.5 py-1 text-[10px] font-bold tracking-[0.12em] text-emerald-600 uppercase dark:bg-emerald-500/15 dark:text-emerald-300">
                Calendar
              </span>
            ) : null}
          </div>
          <h3 className="mt-2 text-sm font-bold leading-5 text-[var(--text-primary)]">{task.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
            {task.description || 'Sin descripción todavía.'}
          </p>
        </div>

        <div className="xl:pt-[1.55rem]">
          <StatusBadge tone={isOverdue ? 'danger' : 'neutral'}>
            {formatTaskDate(task.dueDate)}{relativeTime ? ` · ${relativeTime}` : ''}
          </StatusBadge>
        </div>

        <div className="xl:pt-[1.3rem]">
          <p className="text-base font-extrabold text-[var(--text-primary)]">
            {formatCurrency(task.value)}
          </p>
        </div>

        <div className="flex flex-col gap-2 xl:items-start">
          <CustomSelect
            value={task.status}
            disabled={updatingTaskId === task.id}
            onChange={(val) => void changeStatus(task.id, val as TaskStatus)}
            options={STATUSES.map(s => ({ value: s, label: s }))}
            buttonStyle={getStatusSelectStyle(task.status, accentColor)}
            buttonClassName="py-2.5 px-3 rounded-[0.8rem]"
            className="w-full xl:w-[10.5rem]"
          />

          <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void syncTask(task)}
                  disabled={syncingTaskId === task.id}
                  className={cx(
                    'inline-flex h-10 items-center justify-center rounded-[0.8rem] border px-3 text-xs font-bold transition-all disabled:opacity-50 [border-color:var(--line-soft)]',
                    task.gcalEventId
                      ? 'bg-emerald-50/70 text-emerald-700'
                      : 'bg-[var(--surface-card)] text-[var(--text-secondary)]',
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
              tone="ghost"
              className="h-10 w-8 rounded-[0.45rem]"
              iconSize={16}
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
    const dayTasks = filteredSortedTasks.filter((task) => task.dueDate === iso);
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
            ? 'border-transparent shadow-[0_20px_45px_-28px_rgba(15,23,42,0.55)]'
            : isToday
              ? 'border-[var(--line-soft)] bg-[var(--surface-muted)]'
              : 'border-transparent bg-[var(--surface-card)]/70 hover:border-[var(--line-soft)] hover:bg-[var(--surface-card)]',
        )}
        style={isSelected ? { backgroundColor: 'var(--accent-color)', color: 'var(--accent-foreground)' } : undefined}
      >
        <div className="flex items-start justify-between gap-2">
          <span
            className={cx(
              'inline-flex h-7 min-w-7 items-center justify-center rounded-[0.75rem] px-2 text-[11px] font-black sm:h-8 sm:min-w-8 sm:text-xs',
              isSelected
                ? 'bg-white/18 text-inherit'
                : dayTasks.length > 0
                  ? 'text-[var(--text-primary)]'
                  : 'bg-[var(--surface-muted)] text-[var(--text-secondary)]',
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
                  ? 'bg-white/12 text-inherit'
                  : 'bg-[var(--surface-muted)] text-[var(--text-secondary)]',
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
                  ? 'bg-white/12 text-inherit'
                  : 'bg-[var(--surface-muted)]/90 text-[var(--text-secondary)]',
              )}
            >
              {task.title}
            </div>
          ))}

          {dayTasks.length > 2 ? (
              <p
                className={cx(
                  'hidden pt-0.5 text-[11px] font-bold sm:block',
                  isSelected ? 'text-inherit opacity-80' : 'text-[var(--text-secondary)]/70',
                )}
              >
                +{dayTasks.length - 2} más
            </p>
          ) : dayTasks.length === 0 ? (
              <p
                className={cx(
                  'hidden pt-1 text-[11px] font-medium lg:block',
                  isSelected ? 'text-inherit opacity-75' : 'text-[var(--text-secondary)]/70',
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
    <div className="space-y-5 p-4 pb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 lg:space-y-6 lg:px-8 lg:pt-4 lg:pb-8">
      <section>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="h-12 rounded-[1.1rem] border bg-[var(--surface-muted)] p-1 [border-color:var(--line-soft)]">
            <div className="grid h-full grid-cols-3 gap-1">
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
                    'flex h-full items-center justify-center gap-2 rounded-[0.8rem] px-3 text-sm font-bold transition-all',
                    view === tab.id
                      ? 'bg-[var(--surface-card-strong)] text-[var(--text-primary)] shadow-[var(--shadow-soft)]'
                      : 'text-[var(--text-secondary)]',
                  )}
                >
                  <tab.icon size={18} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex-1 lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
            <input
              type="text"
              placeholder="Buscar en tareas o marcas..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-12 w-full rounded-[1.1rem] border bg-[var(--surface-muted)] pl-10 pr-4 text-sm font-medium text-[var(--text-primary)] transition-all placeholder:text-[var(--text-secondary)]/70 focus:border-transparent focus:bg-[var(--surface-card)] focus:outline-none focus:ring-2 [border-color:var(--line-soft)]"
              style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
            />
          </div>

          <div className="flex flex-wrap gap-2 xl:justify-end">
            <Button
              tone="secondary"
              onClick={() => void syncDown()}
              disabled={isSyncingDown}
              className="h-12 flex-1 rounded-[1.1rem] sm:flex-none"
            >
              <DownloadCloud size={16} />
              Actualizar Calendar
            </Button>
            <Button accentColor={accentColor} onClick={openCreate} className="h-12 flex-1 rounded-[1.1rem] sm:flex-none">
              <Plus size={16} />
              Nueva tarea
            </Button>
          </div>
        </div>
      </section>
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
                  <p className="text-[11px] font-bold tracking-[0.16em] text-[var(--text-secondary)]/70 uppercase">
                    {currentStatusIdx + 1} de {STATUSES.length}
                  </p>
                  <div className="mt-1 flex items-center justify-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={getStatusDotStyle(currentStatus, accentColor)} />
                    <h2 className="text-lg font-extrabold text-[var(--text-primary)]">{currentStatus}</h2>
                  </div>
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
                visibleTasks.map((task) => <div key={task.id}>{renderTaskCard(task)}</div>)
              ) : (
                <EmptyState
                  icon={Trello}
                  title="No hay tareas aquí"
                  description="Cuando muevas tareas o crees una nueva, aparecerán aquí."
                />
              )}
            </div>
          </div>

          <div className="hidden lg:block">
            <DndContext
              sensors={sensors}
              collisionDetection={pointerWithin}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="hide-scrollbar flex gap-4 overflow-x-auto pb-4 items-start">
                {STATUSES.map((status) => {
                  const columnTasks = tasksByStatus[status];
                  const columnValue = columnTasks.reduce((sum, task) => sum + task.value, 0);

                  return (
                    <div key={status} className="min-w-[19.5rem] max-w-[19.5rem] shrink-0 space-y-3">
                      <div className="px-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={getStatusDotStyle(status, accentColor)}
                              />
                              <h2 className="text-[1rem] font-extrabold text-[var(--text-primary)]">
                                {status}
                              </h2>
                            </div>
                            <p className="mt-1 text-xs font-medium text-[var(--text-secondary)]">
                              {formatCurrency(columnValue)}
                            </p>
                          </div>
                          <span className="rounded-[0.8rem] border bg-[var(--surface-card)] px-3 py-1.5 text-xs font-black text-[var(--text-primary)] shadow-[var(--shadow-soft)] [border-color:var(--line-soft)]">
                            {columnTasks.length}
                          </span>
                        </div>
                      </div>

                      <DroppableColumn id={status} isDraggingTask={!!activeDragTask}>
                        <div className="space-y-3">
                          {columnTasks.length > 0 ? (
                            columnTasks.map((task) => {
                              const isDraggable =
                                updatingTaskId !== task.id &&
                                syncingTaskId !== task.id &&
                                deletingTaskId !== task.id;
                              return (
                                <DraggableTaskWrapper key={task.id} task={task} disabled={!isDraggable}>
                                  {renderTaskCard(task)}
                                </DraggableTaskWrapper>
                              );
                            })
                          ) : (
                            <EmptyState
                              title="Sin tareas aquí"
                              description="Añade una entrega o mueve una tarea para equilibrar el flujo."
                              className="px-4 py-6"
                            />
                          )}
                        </div>
                      </DroppableColumn>
                    </div>
                  );
                })}
              </div>
              <DragOverlay dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
                {activeDragTask ? renderTaskCard(activeDragTask, 'kanban', true) : null}
              </DragOverlay>
            </DndContext>
          </div>
        </div>
      ) : null}

      {view === 'list' ? (
        listTasks.length > 0 ? (
          <SurfaceCard tone="muted" className="overflow-hidden p-0">
            <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(8rem,0.7fr)_minmax(7.5rem,0.65fr)_minmax(11rem,0.9fr)] gap-4 border-b px-5 py-3 text-[11px] font-bold tracking-[0.16em] text-[var(--text-secondary)]/70 uppercase xl:grid [border-color:var(--line-soft)]">
              <span>Tarea</span>
              <span>Entrega</span>
              <span>Valor</span>
              <span>Estado</span>
            </div>
            <div className="space-y-0">
              {listTasks.map((task, index) => (
                <div key={task.id} className={cx(index > 0 && 'border-t [border-color:var(--line-soft)]')}>
                  {renderListRow(task)}
                </div>
              ))}
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
                <p className="text-[11px] font-bold tracking-[0.16em] text-[var(--text-secondary)]/70 uppercase">
                  Vista mensual
                </p>
                <h2 className="mt-1 text-lg font-extrabold capitalize text-[var(--text-primary)]">
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
                  className="py-1.5 text-center text-[9px] font-bold tracking-[0.14em] text-[var(--text-secondary)]/70 uppercase sm:py-2 sm:text-[10px]"
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
                  <p className="text-[11px] font-bold tracking-[0.16em] text-[var(--text-secondary)]/70 uppercase">
                    {selectedDate ? 'Agenda del día' : 'Agenda del mes'}
                  </p>
                  <h3 className="mt-1 text-lg font-extrabold capitalize text-[var(--text-primary)]">
                    {calendarPanelLabel}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {calendarPanelTasks.length > 0
                      ? calendarPanelSummary
                      : 'No hay tareas programadas en este bloque de tiempo.'}
                  </p>
                </div>
                {selectedDate ? (
                  <button
                    type="button"
                    onClick={() => setSelectedDate(null)}
                    className="rounded-[0.8rem] border bg-[var(--surface-card)] px-3 py-2 text-xs font-bold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] [border-color:var(--line-soft)]"
                  >
                    Ver mes
                  </button>
                ) : null}
              </div>

              <div className="mt-5 space-y-3">
                {calendarPanelTasks.length > 0 ? (
                  calendarPanelTasks.map((task) => <div key={task.id}>{renderTaskCard(task, 'calendar')}</div>)
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
                  selectedDateTasks.map((task) => <div key={task.id}>{renderTaskCard(task, 'calendar')}</div>)
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
                    {deletingTaskId === editingTask.id ? 'Eliminando...' : 'Eliminar'}
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
                    ? 'Guardando...'
                    : modalMode === 'edit'
                      ? 'Guardar cambios'
                      : 'Crear tarea'}
                </Button>
              </div>
            }
          >
        <form id="pipeline-task-form" onSubmit={saveTask} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="mb-2 flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-[var(--text-secondary)]/70 uppercase">
                <Type size={14} />
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

            <div>
              <label className="mb-2 flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-[var(--text-secondary)]/70 uppercase">
                <AlignLeft size={14} />
                Descripción
              </label>
              <textarea
                required
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                className={cx(fieldClass, 'min-h-[110px]')}
                style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                placeholder="Define el entregable, formato y cualquier detalle operativo."
              />
            </div>
          </div>

          <div className="rounded-[1.2rem] border bg-[var(--surface-muted)]/50 p-4 sm:p-5 [border-color:var(--line-soft)]">
            <h4 className="mb-4 text-[11px] font-extrabold tracking-[0.16em] text-[var(--text-primary)] uppercase">
              Detalles Operativos
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-2 flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-[var(--text-secondary)]/70 uppercase">
                  <Building2 size={14} />
                  Partner o marca
                </label>
                <div className="relative">
                  <input
                    required
                    autoComplete="off"
                    value={form.partnerName}
                    onFocus={() => setIsPartnerPickerOpen(true)}
                    onBlur={() => {
                      window.setTimeout(() => setIsPartnerPickerOpen(false), 120);
                    }}
                    onChange={(event) => {
                      setForm({ ...form, partnerName: event.target.value });
                      setIsPartnerPickerOpen(true);
                    }}
                    className={cx(fieldClass, 'bg-[var(--surface-card)]')}
                    style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                    placeholder="Busca en Directorio o escribe una marca nueva"
                  />

                  {shouldShowPartnerSuggestions ? (
                    <div className="absolute inset-x-0 top-[calc(100%+0.55rem)] z-20 overflow-hidden rounded-[1rem] border bg-[var(--surface-card)] p-2 shadow-[0_22px_40px_-28px_rgba(59,43,34,0.3)] [border-color:var(--line-soft)]">
                      <p className="px-2 pb-2 text-[10px] font-bold tracking-[0.16em] text-[var(--text-secondary)]/70 uppercase">
                        Directorio
                      </p>

                      <div className="space-y-1">
                        {partnerSuggestions.map((partner) => {
                          const isExactMatch = getPartnerLookupKey(partner.name) === partnerInputLookupKey;

                          return (
                            <button
                              key={partner.id}
                              type="button"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                selectPartnerSuggestion(partner.name);
                              }}
                              className="flex w-full items-center justify-between gap-3 rounded-[0.9rem] px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-muted)]"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                                  {partner.name}
                                </p>
                                <p className="truncate text-xs text-[var(--text-secondary)]">
                                  {partner.contacts.length} contactos
                                </p>
                              </div>
                              <StatusBadge tone={isExactMatch ? 'accent' : 'neutral'}>
                                {isExactMatch ? 'Seleccionada' : partner.status}
                              </StatusBadge>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>

                <p className="mt-2 text-[11px] leading-5 text-[var(--text-secondary)]">
                  {selectedPartner
                    ? `Se vinculara con ${selectedPartner.name}, existente en el directorio.`
                    : shouldCreatePartnerOnSave
                      ? `No existe todavia. ${form.partnerName.trim()} se creara como nueva marca.`
                      : 'Selecciona una marca existente o escribe una nueva.'}
                </p>
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-[var(--text-secondary)]/70 uppercase">
                  <CircleDollarSign size={14} />
                  Valor
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.value}
                  onChange={(event) => setForm({ ...form, value: event.target.value })}
                  className={cx(fieldClass, 'bg-[var(--surface-card)]')}
                  style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                  placeholder="1500"
                />
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-[var(--text-secondary)]/70 uppercase">
                  <CalendarDays size={14} />
                  Fecha
                </label>
                <input
                  type="date"
                  required
                  value={form.dueDate}
                  onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
                  className={cx(fieldClass, 'bg-[var(--surface-card)]')}
                  style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                />
              </div>

              <div className="sm:col-span-2 mt-1">
                <label className="mb-2 flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-[var(--text-secondary)]/70 uppercase">
                  <Activity size={14} />
                  Estado inicial
                </label>
                <CustomSelect
                  value={form.status}
                  onChange={(val) => setForm({ ...form, status: val as TaskStatus })}
                  options={STATUSES.map(s => ({ value: s, label: s }))}
                  buttonStyle={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                  buttonClassName="py-3.5 font-medium bg-[var(--surface-card)] border-[var(--line-soft)] focus:border-transparent"
                />
              </div>
            </div>
          </div>
            </form>
          </ModalPanel>
        </OverlayModal>
      ) : null}
    </div>
  );
}
