﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pulse,
  TextAlignLeft,
  Buildings,
  CalendarBlank,
  CalendarDots,
  CheckCircle,
  Circle,
  CaretDown,
  CaretLeft,
  CaretRight,
  CurrencyCircleDollar,
  CloudArrowDown,
  List,
  ListChecks,
  PencilLine,
  Plus,
  ArrowClockwise,
  MagnifyingGlass,
  Kanban,
  TextT,
  X,
} from '@phosphor-icons/react';
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
import { getPartnerLookupKey, type ChecklistItem, type Task, type TaskStatus } from '@shared';
import { Target } from '@phosphor-icons/react';
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
  goalId: '',
};

const fieldClass =
  'w-full rounded-[1rem] border bg-[var(--surface-muted)] px-4 py-3.5 text-base sm:text-sm font-medium text-[var(--text-primary)] transition-all placeholder:text-[var(--text-secondary)] focus:border-transparent focus:bg-[var(--surface-card)] focus:outline-none focus:ring-2 [border-color:var(--line-soft)]';

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

const getStatusTone = (status: TaskStatus): 'warning' | 'info' | 'review' | 'success' | 'neutral' => {
  if (status === 'Pendiente') return 'warning';
  if (status === 'En Progreso') return 'info';
  if (status === REVIEW_STATUS) return 'review';
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
      backgroundColor: 'rgba(124, 58, 237, 0.12)',
      borderColor: 'rgba(124, 58, 237, 0.32)',
      color: '#6d28d9',
      '--tw-ring-color': 'rgba(124, 58, 237, 0.28)',
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
    return { backgroundColor: '#7c3aed' };
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

type DraggableTaskWrapperProps = {
  task: Task;
  disabled: boolean;
  children: React.ReactNode;
  key?: React.Key;
};

function DraggableTaskWrapper({
  task,
  disabled,
  children,
}: DraggableTaskWrapperProps) {
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

/* ── SwipeableTaskCard (mobile only) ─────────────────────────── */

const SWIPE_THRESHOLD = 70;

function SwipeableTaskCard({
  task,
  onSwipe,
  accentColor,
  children,
}: {
  task: Task;
  onSwipe: (taskId: string, direction: 'left' | 'right') => void;
  accentColor: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const touchRef = useRef({ startX: 0, startY: 0, currentX: 0, swiping: false });
  const [offset, setOffset] = useState(0);
  const [released, setReleased] = useState(false);

  const statusIdx = STATUSES.indexOf(task.status);
  const canSwipeRight = statusIdx < STATUSES.length - 1;
  const canSwipeLeft = statusIdx > 0;
  const nextStatus = canSwipeRight ? STATUSES[statusIdx + 1] : null;
  const prevStatus = canSwipeLeft ? STATUSES[statusIdx - 1] : null;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchRef.current = { startX: touch.clientX, startY: touch.clientY, currentX: touch.clientX, swiping: false };
    setReleased(false);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const dx = touch.clientX - touchRef.current.startX;
    const dy = touch.clientY - touchRef.current.startY;

    // Lock into horizontal swipe if horizontal movement dominates
    if (!touchRef.current.swiping && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      touchRef.current.swiping = true;
    }

    if (!touchRef.current.swiping) return;

    e.preventDefault();
    touchRef.current.currentX = touch.clientX;

    // Clamp the offset based on available directions
    let clamped = dx;
    if (!canSwipeRight && clamped > 0) clamped = 0;
    if (!canSwipeLeft && clamped < 0) clamped = 0;
    // Rubber-band effect past threshold
    if (Math.abs(clamped) > SWIPE_THRESHOLD) {
      const excess = Math.abs(clamped) - SWIPE_THRESHOLD;
      clamped = (SWIPE_THRESHOLD + excess * 0.3) * Math.sign(clamped);
    }
    setOffset(clamped);
  }, [canSwipeLeft, canSwipeRight]);

  const handleTouchEnd = useCallback(() => {
    if (!touchRef.current.swiping) {
      setOffset(0);
      return;
    }

    const dx = touchRef.current.currentX - touchRef.current.startX;
    setReleased(true);

    if (dx > SWIPE_THRESHOLD && canSwipeRight) {
      setOffset(0);
      onSwipe(task.id, 'right');
    } else if (dx < -SWIPE_THRESHOLD && canSwipeLeft) {
      setOffset(0);
      onSwipe(task.id, 'left');
    } else {
      setOffset(0);
    }

    touchRef.current.swiping = false;
  }, [task.id, canSwipeLeft, canSwipeRight, onSwipe]);

  const showHint = Math.abs(offset) > 20;
  const hintStatus = offset > 0 ? nextStatus : prevStatus;
  const hintTone = hintStatus ? getStatusTone(hintStatus) : 'neutral';

  return (
    <div className="relative overflow-hidden rounded-[1.05rem]">
      {/* Background hint */}
      {showHint && hintStatus && (
        <div
          className={cx(
            'absolute inset-0 flex items-center px-4 text-[11px] font-bold uppercase tracking-wide',
            offset > 0 ? 'justify-start' : 'justify-end',
          )}
          style={{
            backgroundColor: `${accentColor}15`,
            color: accentColor,
          }}
        >
          <StatusBadge tone={hintTone}>{hintStatus}</StatusBadge>
        </div>
      )}
      {/* Card */}
      <div
        ref={ref}
        className="relative touch-pan-y"
        style={{
          transform: `translateX(${offset}px)`,
          transition: released ? 'transform 0.25s ease-out' : 'none',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

export default function Pipeline() {
  const {
    tasks,
    partners,
    accentColor,
    accentHex,
    accentGradient,
    addTask,
    findPartnerByName,
    ensurePartnerByName,
    updateTask,
    updateTaskStatus,
    deleteTask,
    reportActionError,
    profile,
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
  const [searchQuery, setMagnifyingGlassQuery] = useState('');
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [poppingId, setPoppingId] = useState<string | null>(null);
  const [expandedChecklists, setExpandedChecklists] = useState<Set<string>>(new Set());
  const newItemInputRef = useRef<HTMLInputElement>(null);

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
    setChecklistItems([]);
    setNewItemText('');
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
      goalId: task.goalId || '',
    });
    setChecklistItems(task.checklistItems ?? []);
    setIsPartnerPickerOpen(false);
    setModalMode('edit');
  };

  const selectPartnerSuggestion = (partnerName: string) => {
    const partner = findPartnerByName(partnerName);
    setForm((current) => ({
      ...current,
      partnerName,
      ...(!current.value && partner?.monthlyRevenue
        ? { value: String(partner.monthlyRevenue) }
        : {}),
    }));
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
        goalId: form.goalId || undefined,
        checklistItems,
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

  const saveChecklist = async (items: ChecklistItem[]) => {
    if (!editingTaskId) return;
    try {
      await updateTask(editingTaskId, { checklistItems: items } as any);
    } catch {
      toast.error('Error al guardar el checklist');
    }
  };

  const toggleChecklistItem = (id: string) => {
    setPoppingId(id);
    setTimeout(() => setPoppingId(null), 250);
    const updated = checklistItems.map((item) =>
      item.id === id ? { ...item, done: !item.done } : item,
    );
    setChecklistItems(updated);
    void saveChecklist(updated);
  };

  const addChecklistItem = () => {
    const text = newItemText.trim();
    if (!text) return;
    const newItem: ChecklistItem = { id: crypto.randomUUID(), text, done: false };
    const updated = [...checklistItems, newItem];
    setChecklistItems(updated);
    setNewItemText('');
    void saveChecklist(updated);
  };

  const deleteChecklistItem = (id: string) => {
    const updated = checklistItems.filter((item) => item.id !== id);
    setChecklistItems(updated);
    void saveChecklist(updated);
  };

  const toggleExpandedChecklist = (taskId: string) => {
    setExpandedChecklists((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const toggleChecklistItemOnCard = async (taskId: string, itemId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const updated = task.checklistItems.map((item) =>
      item.id === itemId ? { ...item, done: !item.done } : item,
    );
    try {
      await updateTask(taskId, { checklistItems: updated } as any);
    } catch {
      toast.error('Error al actualizar la sub-tarea');
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

  const handleSwipe = useCallback((taskId: string, direction: 'left' | 'right') => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const idx = STATUSES.indexOf(task.status);
    const nextIdx = direction === 'right' ? idx + 1 : idx - 1;
    if (nextIdx < 0 || nextIdx >= STATUSES.length) return;
    void moveTaskToStatus(taskId, STATUSES[nextIdx]);
  }, [tasks, moveTaskToStatus]);

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
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: accentGradient }} />
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

          {task.checklistItems.length > 0 && (
            <div className="mt-3 space-y-1.5 border-t pt-3 [border-color:var(--line-soft)]">
              {[...task.checklistItems.filter((i) => !i.done), ...task.checklistItems.filter((i) => i.done)]
                .slice(0, expandedChecklists.has(task.id) ? undefined : 3)
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); void toggleChecklistItemOnCard(task.id, item.id); }}
                    className="flex w-full items-center gap-2.5 text-left"
                  >
                    {item.done ? (
                      <CheckCircle size={13} className="shrink-0 text-emerald-500" />
                    ) : (
                      <Circle size={13} className="shrink-0 text-[var(--text-secondary)]/40" />
                    )}
                    <span className={cx(
                      'text-xs leading-4',
                      item.done ? 'line-through text-[var(--text-secondary)]/40' : 'text-[var(--text-secondary)]',
                    )}>
                      {item.text}
                    </span>
                  </button>
                ))}
              {task.checklistItems.length > 3 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleExpandedChecklist(task.id); }}
                  className="flex items-center gap-1 pt-0.5 text-xs font-semibold text-[var(--text-secondary)]/60 transition-colors hover:text-[var(--text-primary)]"
                >
                  <CaretDown size={11} className={cx('transition-transform duration-150', expandedChecklists.has(task.id) && 'rotate-180')} />
                  {expandedChecklists.has(task.id) ? 'Ver menos' : `Ver ${task.checklistItems.length - 3} más`}
                </button>
              )}
            </div>
          )}

          <div className="mt-4 space-y-3">
            <CustomSelect
              value={task.status}
              disabled={updatingTaskId === task.id}
              onChange={(val) => void changeStatus(task.id, val as TaskStatus)}
              options={STATUSES.map(s => ({ value: s, label: s }))}
              buttonStyle={getStatusSelectStyle(task.status, accentHex)}
              buttonClassName="py-2.5 px-3 rounded-[0.8rem]"
            />

            <div className="flex items-center justify-between gap-3 border-t pt-3 [border-color:var(--line-soft)]">
              <span className="inline-flex min-w-0 items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                {task.gcalEventId ? (
                  <CheckCircle size={14} className="shrink-0 text-emerald-500" />
                ) : (
                  <CalendarBlank size={14} className="shrink-0" />
                )}
                <span className="truncate">{task.gcalEventId ? 'Calendar activo' : 'Sin enlace externo'}</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled
                  title="Proximamente"
                  className="inline-flex h-10 cursor-not-allowed items-center justify-center rounded-[0.8rem] border px-3 text-xs font-bold opacity-40 [border-color:var(--line-soft)] bg-[var(--surface-card)] text-[var(--text-secondary)]"
                  aria-label="Google Calendar — Proximamente"
                >
                  <CalendarBlank size={14} />
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
          {task.checklistItems.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {[...task.checklistItems.filter((i) => !i.done), ...task.checklistItems.filter((i) => i.done)]
                .slice(0, expandedChecklists.has(task.id) ? undefined : 3)
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void toggleChecklistItemOnCard(task.id, item.id)}
                    className="flex w-full items-center gap-2.5 text-left"
                  >
                    {item.done ? (
                      <CheckCircle size={13} className="shrink-0 text-emerald-500" />
                    ) : (
                      <Circle size={13} className="shrink-0 text-[var(--text-secondary)]/40" />
                    )}
                    <span className={cx(
                      'text-xs leading-4',
                      item.done ? 'line-through text-[var(--text-secondary)]/40' : 'text-[var(--text-secondary)]',
                    )}>
                      {item.text}
                    </span>
                  </button>
                ))}
              {task.checklistItems.length > 3 && (
                <button
                  type="button"
                  onClick={() => toggleExpandedChecklist(task.id)}
                  className="flex items-center gap-1 pt-0.5 text-xs font-semibold text-[var(--text-secondary)]/60 transition-colors hover:text-[var(--text-primary)]"
                >
                  <CaretDown size={11} className={cx('transition-transform duration-150', expandedChecklists.has(task.id) && 'rotate-180')} />
                  {expandedChecklists.has(task.id) ? 'Ver menos' : `Ver ${task.checklistItems.length - 3} más`}
                </button>
              )}
            </div>
          )}
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
            buttonStyle={getStatusSelectStyle(task.status, accentHex)}
            buttonClassName="py-2.5 px-3 rounded-[0.8rem]"
            className="w-full xl:w-[10.5rem]"
          />

          <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled
                  title="Proximamente"
                  className="inline-flex h-10 cursor-not-allowed items-center justify-center rounded-[0.8rem] border px-3 text-xs font-bold opacity-40 [border-color:var(--line-soft)] bg-[var(--surface-card)] text-[var(--text-secondary)]"
                  aria-label="Google Calendar — Proximamente"
                >
                  <CalendarBlank size={14} />
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
        className="group min-h-[4.5rem] rounded-[0.85rem] border border-transparent bg-[var(--surface-card)]/70 p-2 text-left sm:min-h-[6.5rem] sm:rounded-[1rem] sm:p-3 xl:min-h-[8.5rem]"
      >
        <div className="flex items-start justify-between gap-2">
          <span
            className={cx(
              'inline-flex h-7 min-w-7 items-center justify-center rounded-[0.75rem] px-2 text-[11px] font-black transition-transform duration-150 group-hover:scale-110 sm:h-8 sm:min-w-8 sm:text-xs',
              isSelected
                ? 'scale-110'
                : '',
              isToday
                ? 'ring-2 ring-[var(--accent-color)] text-[var(--text-primary)]'
                : dayTasks.length > 0
                  ? 'text-[var(--text-primary)]'
                  : 'bg-[var(--surface-muted)] text-[var(--text-secondary)]',
            )}
            style={
              dayTasks.length > 0
                ? { background: accentGradient, color: 'var(--accent-foreground)' }
                : undefined
            }
          >
            {date.getDate()}
          </span>
        </div>

        <div className="mt-2 space-y-1 sm:mt-3 sm:space-y-1.5">
          {dayTasks.slice(0, 2).map((task) => (
            <div
              key={task.id}
              className={cx(
                'hidden truncate rounded-[0.7rem] px-2 py-1 text-[11px] font-semibold sm:block',
                'bg-[var(--surface-muted)]/90 text-[var(--text-secondary)]',
              )}
            >
              {task.title}
            </div>
          ))}

          {dayTasks.length > 2 ? (
              <p
                className={cx(
                  'hidden pt-0.5 text-[11px] font-bold sm:block',
                  'text-[var(--text-secondary)]/70',
                )}
              >
                +{dayTasks.length - 2} más
            </p>
          ) : dayTasks.length === 0 ? (
              <p
                className={cx(
                  'hidden pt-1 text-[11px] font-medium lg:block',
                  'text-[var(--text-secondary)]/70',
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
          <div className="flex h-12 items-center gap-1 sm:gap-2">
            {[
              { id: 'kanban', icon: Kanban, label: 'Kanban' },
              { id: 'list', icon: List, label: 'Lista' },
              { id: 'calendar', icon: CalendarBlank, label: 'Mes' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setView(tab.id as typeof view)}
                className={cx(
                  'flex h-full items-center justify-center gap-2 rounded-[1rem] border px-4 text-sm font-bold transition-all',
                  view === tab.id
                    ? 'bg-[var(--surface-card-strong)] text-[var(--text-primary)] shadow-sm [border-color:var(--line-soft)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]/50 hover:text-[var(--text-primary)]',
                )}
              >
                <tab.icon size={18} style={view === tab.id ? { color: accentHex } : undefined} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="relative flex-1 lg:max-w-sm">
            <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
            <input
              type="text"
              placeholder="Buscar en tareas o marcas..."
              value={searchQuery}
              onChange={(event) => setMagnifyingGlassQuery(event.target.value)}
              className="w-full rounded-[1rem] border bg-[var(--surface-muted)] py-3 pl-10 pr-4 text-base sm:text-sm font-medium text-[var(--text-primary)] transition-all placeholder:text-[var(--text-secondary)]/70 focus:border-transparent focus:bg-[var(--surface-card)] focus:outline-none focus:ring-2 [border-color:var(--line-soft)]"
              style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
            />
          </div>

          <div className="flex flex-wrap gap-2 xl:justify-end">
            <Button
              tone="secondary"
              disabled
              title="Proximamente"
              className="flex-1 cursor-not-allowed opacity-40 sm:flex-none"
            >
              <CloudArrowDown size={16} />
              Actualizar Calendar
            </Button>
            <Button accentColor={accentGradient} onClick={openCreate} className="flex-1 sm:flex-none">
              <Plus size={16} weight="regular" />
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
                  icon={CaretLeft}
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
                    <span className="h-2.5 w-2.5 rounded-full" style={getStatusDotStyle(currentStatus, accentHex)} />
                    <h2 className="text-lg font-extrabold text-[var(--text-primary)]">{currentStatus}</h2>
                  </div>
                </div>
                <IconButton
                  icon={CaretRight}
                  label="Ver siguiente fase"
                  onClick={() => setCurrentStatusIdx(Math.min(STATUSES.length - 1, currentStatusIdx + 1))}
                  disabled={currentStatusIdx === STATUSES.length - 1}
                  tone="ghost"
                />
              </div>
            </SurfaceCard>

            <div className="mt-3 space-y-3">
              {visibleTasks.length > 0 ? (
                visibleTasks.map((task) => (
                  <React.Fragment key={task.id}>
                    <SwipeableTaskCard task={task} onSwipe={handleSwipe} accentColor={accentHex}>
                      {renderTaskCard(task)}
                    </SwipeableTaskCard>
                  </React.Fragment>
                ))
              ) : (
                <EmptyState
                  icon={Kanban}
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
                                style={getStatusDotStyle(status, accentHex)}
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
            icon={List}
            title="Todavía no hay tareas"
            description="Añade tu primera entrega para empezar a construir el pipeline."
            action={
              <Button accentColor={accentGradient} onClick={openCreate}>
                <Plus size={16} weight="regular" />
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
                icon={CaretLeft}
                label="Mes anterior"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                tone="ghost"
              />
              <div className="text-center">
                <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-2">
                  <h2 className="text-lg font-extrabold capitalize text-[var(--text-primary)]">
                    {monthLabel}
                  </h2>
                  <span className="text-[10px] font-bold tracking-[0.16em] text-[var(--text-secondary)]/70 uppercase sm:text-[11px]">
                    Vista mensual
                  </span>
                </div>
              </div>
              <IconButton
                icon={CaretRight}
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
                <div className="flex flex-col gap-1">
                  <div className="flex items-baseline gap-3">
                    <h3 className="text-lg font-extrabold capitalize text-[var(--text-primary)]">
                      {calendarPanelLabel}
                    </h3>
                    <span className="hidden text-[11px] font-bold tracking-[0.16em] text-[var(--text-secondary)]/70 uppercase sm:inline-block">
                      {selectedDate ? 'Agenda del día' : 'Agenda del mes'}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">
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
                    icon={CalendarDots}
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
              description={selectedDateTasks.length === 1 ? '1 tarea programada para esta fecha.' : `${selectedDateTasks.length} tareas programadas para esta fecha.`}
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
                  accentColor={accentGradient}
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
        <form id="pipeline-task-form" onSubmit={saveTask} className="min-w-0 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="mb-2 flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-[var(--text-secondary)]/70 uppercase">
                <TextT size={14} />
                Título
              </label>
              <input
                required
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                className={fieldClass}
                style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                placeholder=""
              />
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-[var(--text-secondary)]/70 uppercase">
                <TextAlignLeft size={14} />
                Descripción
              </label>
              <textarea
                required
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                className={cx(fieldClass, 'min-h-[56px]')}
                style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                placeholder=""
              />
            </div>
          </div>

          <div className="rounded-[1.2rem] border bg-[var(--surface-muted)]/50 p-4 sm:p-5 [border-color:var(--line-soft)]">
            <h4 className="mb-4 text-[11px] font-extrabold tracking-[0.16em] text-[var(--text-primary)] uppercase">
              Detalles Operativos
            </h4>
            <div className="grid min-w-0 gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-2 flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-[var(--text-secondary)]/70 uppercase">
                  <Buildings size={14} />
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
                    style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
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

              <div className="min-w-0">
                <label className="mb-2 flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-[var(--text-secondary)]/70 uppercase">
                  <CurrencyCircleDollar size={14} />
                  Valor
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.value}
                  onChange={(event) => setForm({ ...form, value: event.target.value })}
                  className={cx(fieldClass, 'bg-[var(--surface-card)]')}
                  style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                  placeholder=""
                />
              </div>

              <div className="min-w-0">
                <label className="mb-2 flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-[var(--text-secondary)]/70 uppercase">
                  <CalendarDots size={14} />
                  Fecha límite
                </label>
                <input
                  type="date"
                  required
                  value={form.dueDate}
                  onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
                  className={cx(fieldClass, 'appearance-none bg-[var(--surface-card)]')}
                  style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                />
              </div>

              <div className="sm:col-span-2 mt-1">
                <label className="mb-2 flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-[var(--text-secondary)]/70 uppercase">
                  <Pulse size={14} />
                  Estado inicial
                </label>
                <CustomSelect
                  value={form.status}
                  onChange={(val) => setForm({ ...form, status: val as TaskStatus })}
                  options={STATUSES.map(s => ({ value: s, label: s }))}
                  buttonStyle={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                  buttonClassName="py-3.5 font-medium bg-[var(--surface-card)] border-[var(--line-soft)] focus:border-transparent"
                />
              </div>

              {profile?.goals && profile.goals.length > 0 && (
                <div className="sm:col-span-2 mt-1">
                  <label className="mb-2 flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-[var(--text-secondary)]/70 uppercase">
                    <Target size={14} />
                    Objetivo estratégico
                  </label>
                  <CustomSelect
                    value={form.goalId}
                    onChange={(val) => setForm({ ...form, goalId: val })}
                    options={[
                      { value: '', label: 'Sin objetivo' },
                      ...profile.goals.map(g => ({ value: g.id, label: g.generalGoal || g.area || 'Sin nombre' })),
                    ]}
                    buttonStyle={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                    buttonClassName="py-3.5 font-medium bg-[var(--surface-card)] border-[var(--line-soft)] focus:border-transparent"
                  />
                </div>
              )}
            </div>
          </div>

          <div>
              <div className="mb-3 flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-[var(--text-secondary)]/70 uppercase">
                  <ListChecks size={14} />
                  Sub-Tareas
                </label>
                {checklistItems.length > 0 && (
                  <span className="text-xs font-bold tabular-nums text-[var(--text-secondary)]">
                    {checklistItems.filter((i) => i.done).length}/{checklistItems.length}
                  </span>
                )}
              </div>

              <div className="overflow-hidden rounded-[1.2rem] border [border-color:var(--line-soft)]">
                {[...checklistItems.filter((i) => !i.done), ...checklistItems.filter((i) => i.done)].map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center gap-3 border-b px-4 py-3 transition-colors last:border-b-0 [border-color:var(--line-soft)]"
                  >
                    <button
                      type="button"
                      onClick={() => toggleChecklistItem(item.id)}
                      className="shrink-0"
                      aria-label={item.done ? 'Marcar pendiente' : 'Marcar completado'}
                    >
                      <span className={cx('inline-flex', poppingId === item.id && 'animate-check-pop')}>
                        {item.done ? (
                          <CheckCircle weight="fill" size={20} style={{ color: accentHex }} />
                        ) : (
                          <Circle size={20} className="text-[var(--text-secondary)]/30" />
                        )}
                      </span>
                    </button>

                    <span
                      className={cx(
                        'flex-1 text-sm leading-5 transition-all duration-200',
                        item.done
                          ? 'text-[var(--text-secondary)]/40 line-through'
                          : 'text-[var(--text-primary)]',
                      )}
                    >
                      {item.text}
                    </span>

                    <button
                      type="button"
                      onClick={() => deleteChecklistItem(item.id)}
                      className="shrink-0 text-[var(--text-secondary)]/40 opacity-0 transition-opacity hover:text-[var(--text-secondary)] group-hover:opacity-100"
                      aria-label="Eliminar elemento"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}

                <div className="flex items-center gap-3 px-4 py-3">
                  <Plus size={20} className="shrink-0 text-[var(--text-secondary)]/30" />
                  <input
                    ref={newItemInputRef}
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addChecklistItem();
                      }
                    }}
                    onBlur={addChecklistItem}
                    placeholder="Añadir elemento..."
                    className="flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]/40"
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
