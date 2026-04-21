import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarDot,
  CheckCircle,
  CaretLeft,
  CaretRight,
  Clock,
  Lock,
  Star,
  Eye,
  Users,
  TrophyIcon as Trophy,
  Medal,
  Rocket,
  CurrencyDollar,
  Money,
  Target,
  X,
  // Nuevos para placas
  PencilSimpleLine,
  UserPlus,
  Compass,
  Palette,
  Stack,
  Sun,
  Moon,
  CheckSquare,
  Lightning,
  Leaf,
  UsersThree,
  Flame,
  CalendarCheck,
  Crown,
  SealCheck,
  Question,
  CalendarHeart,
} from '@phosphor-icons/react';
import { useAppContext } from '../context/AppContext';
import { EmptyState, StatusBadge, SurfaceCard, cx } from '../components/ui';
import { toast } from '../lib/toast';
import type { BadgeKey, Task, TaskStatus } from '@shared/domain';
import { formatLocalDateISO, parseLocalDate, startOfLocalDay } from '../lib/date';
import EfisystemWidget from '../components/EfisystemWidget';
import LevelsModal from '../components/LevelsModal';
import { hapticSuccess } from '../lib/haptics';

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

  const displayGoals = useMemo(() => Array(30).fill(goals).flat(), [goals]);

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
            <CheckCircle size={12} />
            Completar
          </button>
        )}
      </div>
    </div>
  );
}

/* ── GoalEffortWidget ──────────────────────────────────────── */

function GoalEffortWidget({
  tasks,
  goals,
  accentHex,
  accentGradient,
}: {
  tasks: Task[];
  goals: any[];
  accentHex: string;
  accentGradient: string;
}) {
  const distribution = useMemo(() => {
    const goalMap = new Map<string, { name: string; taskCount: number; value: number }>();
    for (const g of goals) {
      if (g.id && g.generalGoal) {
        goalMap.set(g.id, { name: g.generalGoal, taskCount: 0, value: 0 });
      }
    }

    let unassignedCount = 0;
    let unassignedValue = 0;

    for (const t of tasks) {
      if (t.goalId && goalMap.has(t.goalId)) {
        const entry = goalMap.get(t.goalId)!;
        entry.taskCount++;
        entry.value += t.value;
      } else {
        unassignedCount++;
        unassignedValue += t.value;
      }
    }

    const items = [...goalMap.values()]
      .filter((e) => e.taskCount > 0)
      .sort((a, b) => b.value - a.value);

    return { items, unassignedCount, unassignedValue };
  }, [tasks, goals]);

  const totalTasks = tasks.length;
  if (totalTasks === 0 || distribution.items.length === 0) return null;

  const COLORS = [
    accentHex,
    '#059669',
    '#2563eb',
    '#7c3aed',
    '#d97706',
    '#dc2626',
    '#0891b2',
    '#4f46e5',
  ];

  const allItems = [
    ...distribution.items.map((item, i) => ({
      label: item.name,
      count: item.taskCount,
      value: item.value,
      color: COLORS[i % COLORS.length],
    })),
    ...(distribution.unassignedCount > 0
      ? [{ label: 'Sin objetivo', count: distribution.unassignedCount, value: distribution.unassignedValue, color: '#94a3b8' }]
      : []),
  ];

  return (
    <SurfaceCard className="p-5 lg:p-6">
      <div className="flex items-center gap-2">
        <Target size={14} className="text-[var(--text-secondary)]" />
        <p className="text-[11px] font-bold tracking-[0.18em] text-[var(--text-secondary)] uppercase">
          Tareas por objetivo
        </p>
      </div>

      {/* Segmented bar */}
      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-[var(--surface-inset)]">
        {allItems.map((item) => {
          const pct = (item.count / totalTasks) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={item.label}
              className="transition-all duration-300 first:rounded-l-full last:rounded-r-full"
              style={{ width: `${pct}%`, backgroundColor: item.color, opacity: 0.82 }}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3.5 space-y-2">
        {allItems.map((item) => (
          <div key={item.label} className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-[3px]"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate font-medium text-[var(--text-primary)]">{item.label}</span>
              <span className="shrink-0 text-[var(--text-secondary)]">({item.count})</span>
            </div>
            <span className="shrink-0 font-bold text-[var(--text-secondary)]">
              ${item.value.toLocaleString('es-ES')}
            </span>
          </div>
        ))}
      </div>
    </SurfaceCard>
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
    <SurfaceCard className="-mx-4 !rounded-none !border-x-0 px-5 py-5 lg:-mx-8 lg:px-8 lg:py-7">
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
                  isCurrent ? 'font-black' : 'text-[var(--text-secondary)]',
                )}
                style={isCurrent ? { color: accentHex } : undefined}
              >
                {month.label}
              </span>
            </div>
          );
        })}
      </div>
    </SurfaceCard>
  );
}

/* ── Achievements grid ──────────────────────────────────────── */

interface BadgeDef {
  key: BadgeKey;
  label: string;
  description: string;
  icon: React.ElementType;
  secret?: boolean;           // cuando está bloqueada se muestra como "???"
  secretHint?: string;        // descripción críptica mientras está bloqueada
}

interface BadgeSection {
  id: string;
  title: string;
  subtitle: string;
  badges: BadgeDef[];
}

const SECTIONS: BadgeSection[] = [
  {
    id: 'primeros-pasos',
    title: 'Primeros Pasos',
    subtitle: 'Los cimientos de tu operación',
    badges: [
      { key: 'perfil_estelar',    label: 'EfiLink Activado', description: 'Empezaste a construir tu EfiLink',     icon: Star },
      { key: 'primer_trazo',      label: 'Primer Trazo',     description: 'Creaste tu primera entrega',           icon: PencilSimpleLine },
      { key: 'red_inicial',       label: 'Red Inicial',      description: 'Agregaste tu primer socio',            icon: UserPlus },
      { key: 'rumbo_fijo',        label: 'Rumbo Fijo',       description: 'Definiste tu primer objetivo',         icon: Compass },
      { key: 'vision_clara',      label: 'Visión Clara',     description: 'Definiste 3 objetivos estratégicos',   icon: Eye },
      { key: 'identidad_propia',  label: 'Identidad Propia', description: 'Elegiste tu color de acento',          icon: Palette },
    ],
  },
  {
    id: 'hitos',
    title: 'Hitos',
    subtitle: 'La huella de tu volumen',
    badges: [
      { key: 'motor_de_ideas',       label: 'Motor de Ideas',       description: 'Creaste 5 entregas',                     icon: Rocket },
      { key: 'fabrica_de_proyectos', label: 'Fábrica de Proyectos', description: 'Creaste 25 entregas',                    icon: Stack },
      { key: 'promesa_cumplida',     label: 'Promesa Cumplida',     description: 'Completaste 10 entregas',                icon: Medal },
      { key: 'creador_imparable',    label: 'Creador Imparable',    description: 'Completaste 25 entregas',                icon: Target },
      { key: 'negocio_en_marcha',    label: 'Negocio en Marcha',    description: 'Cobraste 5 entregas',                    icon: CurrencyDollar },
      { key: 'lluvia_de_billetes',   label: 'Lluvia de Billetes',   description: 'Cobraste 20 entregas',                   icon: Money },
      { key: 'circulo_intimo',       label: 'Círculo Íntimo',       description: 'Agregaste 5 socios a tu red',            icon: Users },
      { key: 'directorio_dorado',    label: 'Directorio Dorado',    description: '10 socios y 10 contactos en tu red',     icon: Trophy },
    ],
  },
  {
    id: 'habitos',
    title: 'Hábitos',
    subtitle: 'Cómo trabajás, no cuánto',
    badges: [
      { key: 'madrugador',           label: 'Madrugador',           description: 'Creaste entregas antes de las 8am en 5 días distintos',      icon: Sun },
      { key: 'noctambulo',           label: 'Noctámbulo',           description: 'Creaste entregas después de las 11pm en 5 días distintos',   icon: Moon },
      { key: 'cierre_limpio',        label: 'Cierre Limpio',        description: 'Completaste 5 entregas sin mover la fecha original',         icon: CheckSquare },
      { key: 'cobrador_implacable',  label: 'Cobrador Implacable',  description: 'Cobraste 5 entregas en menos de 7 días',                     icon: Lightning },
      { key: 'pipeline_zen',         label: 'Pipeline Zen',         description: '7 días seguidos sin entregas vencidas',                      icon: Leaf },
      { key: 'visionario_cumplido',  label: 'Visionario Cumplido',  description: 'Alcanzaste 3 objetivos estratégicos',                        icon: Eye },
      { key: 'conector',             label: 'Conector',             description: 'Contactaste a 10 socios en los últimos 30 días',             icon: UsersThree },
    ],
  },
  {
    id: 'rachas',
    title: 'Rachas y Constancia',
    subtitle: 'Aparecer todos los días cuenta',
    badges: [
      { key: 'en_la_zona',         label: 'En la Zona',       description: '3 días seguidos activos',                         icon: Flame },
      { key: 'racha_de_hierro',    label: 'Racha de Hierro',  description: '7 días seguidos activos',                         icon: Flame },
      { key: 'inamovible',         label: 'Inamovible',       description: '30 días seguidos activos',                        icon: Flame },
      { key: 'semana_perfecta',    label: 'Semana Perfecta',  description: '1 semana con ≥3 completadas y 0 vencidas',        icon: CalendarCheck },
      { key: 'mes_de_oro',         label: 'Mes de Oro',       description: '4 semanas perfectas en un mismo mes',             icon: CalendarHeart },
    ],
  },
  {
    id: 'leyenda',
    title: 'Leyenda',
    subtitle: 'Las raras — algunas ni siquiera las ves venir',
    badges: [
      { key: 'fundador',       label: 'Fundador',  description: 'Formaste parte de la etapa beta de Efi', icon: SealCheck },
      { key: 'tres_en_un_dia', label: 'Secreta',   description: 'Algunos logros no se anuncian',          icon: Question, secret: true, secretHint: 'Algunos logros no se anuncian' },
      { key: 'cobro_finde',    label: 'Secreta',   description: 'Algunos logros no se anuncian',          icon: Question, secret: true, secretHint: 'Algunos logros no se anuncian' },
      { key: 'icono_efi',      label: 'Ícono Efi', description: 'Desbloqueaste 25 placas',                icon: Crown },
    ],
  },
];

// Labels reales de las placas secretas, mostrados sólo cuando ya están desbloqueadas.
const SECRET_REVEALED: Partial<Record<BadgeKey, { label: string; description: string; icon: React.ElementType }>> = {
  tres_en_un_dia: { label: 'Triple Jornada',  description: 'Completaste 3 entregas el mismo día', icon: Lightning },
  cobro_finde:    { label: 'Fin de Semana ',  description: 'Cobraste una entrega un sábado o domingo', icon: Money },
};

const ALL_BADGES: BadgeDef[] = SECTIONS.flatMap(s => s.badges);

// ── Material tier per badge (progression order: Bronze → Diamond) ─

interface MaterialStyle {
  medallionBg: string;
  medallionShadow: string;
  iconColor: string;
  tileBorderColor: string;
  tileGlowColor: string;
}

// Tiers definidos una vez, luego asignados a cada placa por rareza/dificultad.
type Tier = 'bronce' | 'cobre' | 'plata' | 'oro' | 'oro_rosa' | 'platino' | 'titanio' | 'obsidiana' | 'diamante';

const TIER_STYLES: Record<Tier, MaterialStyle> = {
  bronce: {
    medallionBg: 'linear-gradient(145deg, #8c5a28 0%, #b87830 15%, #d49840 28%, #f0c060 42%, #e8b048 55%, #c07828 70%, #8c5828 85%, #6a4020 100%)',
    medallionShadow: '0 6px 20px -4px rgba(160,100,30,0.75), inset 0 1px 0 rgba(255,215,120,0.5), inset 0 -1px 0 rgba(0,0,0,0.3)',
    iconColor: '#fff8e8',
    tileBorderColor: 'rgba(180,120,50,0.45)',
    tileGlowColor: 'rgba(180,120,50,0.08)',
  },
  cobre: {
    medallionBg: 'linear-gradient(145deg, #7c3818 0%, #a85830 15%, #c87848 28%, #e09868 42%, #cc8050 55%, #aa5828 70%, #7c3818 100%)',
    medallionShadow: '0 6px 20px -4px rgba(160,80,40,0.75), inset 0 1px 0 rgba(255,175,130,0.5), inset 0 -1px 0 rgba(0,0,0,0.3)',
    iconColor: '#fff0e8',
    tileBorderColor: 'rgba(170,90,40,0.45)',
    tileGlowColor: 'rgba(170,90,40,0.08)',
  },
  plata: {
    medallionBg: 'linear-gradient(145deg, #7a7a8a 0%, #9898a8 15%, #b8b8c8 28%, #e0e0f0 42%, #f4f4ff 50%, #d0d0e0 60%, #a8a8b8 75%, #808090 100%)',
    medallionShadow: '0 6px 20px -4px rgba(140,140,170,0.6), inset 0 1px 0 rgba(255,255,255,0.75), inset 0 -1px 0 rgba(0,0,0,0.2)',
    iconColor: '#1a1a2a',
    tileBorderColor: 'rgba(160,160,190,0.4)',
    tileGlowColor: 'rgba(160,160,190,0.07)',
  },
  oro: {
    medallionBg: 'linear-gradient(145deg, #7a5c10 0%, #a88020 15%, #d4a828 28%, #f8d040 40%, #ffe040 48%, #f8c830 58%, #c89020 72%, #906800 87%, #6a4e08 100%)',
    medallionShadow: '0 6px 24px -4px rgba(200,160,20,0.8), inset 0 1px 0 rgba(255,245,150,0.6), inset 0 -1px 0 rgba(0,0,0,0.25)',
    iconColor: '#2a1800',
    tileBorderColor: 'rgba(200,158,20,0.5)',
    tileGlowColor: 'rgba(200,158,20,0.1)',
  },
  oro_rosa: {
    medallionBg: 'linear-gradient(145deg, #8a5858 0%, #b07878 15%, #d0a090 28%, #f0c0b0 42%, #f8c8b8 50%, #e0a898 60%, #c08080 75%, #8a5858 100%)',
    medallionShadow: '0 6px 20px -4px rgba(200,130,130,0.65), inset 0 1px 0 rgba(255,225,215,0.5), inset 0 -1px 0 rgba(0,0,0,0.2)',
    iconColor: '#2a1010',
    tileBorderColor: 'rgba(200,130,130,0.4)',
    tileGlowColor: 'rgba(200,130,130,0.08)',
  },
  platino: {
    medallionBg: 'linear-gradient(145deg, #a0a0b4 0%, #c0c0d4 15%, #d8d8ec 28%, #f0f0fc 40%, #ffffff 50%, #e8e8f8 60%, #ccccde 75%, #a8a8bc 87%, #909098 100%)',
    medallionShadow: '0 6px 24px -4px rgba(180,180,220,0.7), inset 0 1px 0 rgba(255,255,255,0.85), inset 0 -1px 0 rgba(0,0,0,0.15)',
    iconColor: '#18182a',
    tileBorderColor: 'rgba(190,190,230,0.45)',
    tileGlowColor: 'rgba(190,190,230,0.08)',
  },
  titanio: {
    medallionBg: 'linear-gradient(145deg, #2a2f3c 0%, #3c4454 15%, #505a6c 28%, #687080 40%, #747e90 50%, #60686e 62%, #484e5a 75%, #333844 87%, #252830 100%)',
    medallionShadow: '0 6px 20px -4px rgba(60,80,120,0.65), inset 0 1px 0 rgba(200,210,240,0.25), inset 0 -1px 0 rgba(0,0,0,0.4)',
    iconColor: '#d0d8f0',
    tileBorderColor: 'rgba(80,100,150,0.4)',
    tileGlowColor: 'rgba(80,100,150,0.07)',
  },
  obsidiana: {
    medallionBg: 'linear-gradient(220deg, rgba(120,80,240,0.5) 0%, rgba(60,100,255,0.3) 35%, transparent 65%, rgba(160,60,200,0.3) 100%), linear-gradient(145deg, #0c0810 0%, #1c1228 20%, #2e1e42 40%, #22163a 60%, #140c22 80%, #080510 100%)',
    medallionShadow: '0 6px 24px -4px rgba(100,60,220,0.8), inset 0 1px 0 rgba(180,140,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.5)',
    iconColor: '#c8b8ff',
    tileBorderColor: 'rgba(100,60,200,0.5)',
    tileGlowColor: 'rgba(100,60,200,0.1)',
  },
  diamante: {
    medallionBg: 'linear-gradient(135deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.2) 30%, transparent 55%), linear-gradient(125deg, #ff6eb4 0%, #ff9548 14%, #ffe44d 28%, #72ed6a 42%, #4dc8ff 56%, #8b78ff 70%, #ff6eb4 84%, #ff9548 100%)',
    medallionShadow: '0 6px 28px -4px rgba(160,80,255,0.85), 0 0 20px rgba(255,200,50,0.45), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(0,0,0,0.1)',
    iconColor: '#ffffff',
    tileBorderColor: 'rgba(160,100,255,0.5)',
    tileGlowColor: 'rgba(160,100,255,0.12)',
  },
};

const BADGE_TIER: Record<BadgeKey, Tier> = {
  // ── Sección 1 — Primeros Pasos (bronce/cobre, salvo identidad_propia)
  perfil_estelar:        'bronce',
  primer_trazo:          'bronce',
  red_inicial:           'bronce',
  rumbo_fijo:            'bronce',
  vision_clara:          'cobre',
  identidad_propia:      'bronce',
  // ── Sección 2 — Hitos
  motor_de_ideas:        'plata',
  fabrica_de_proyectos:  'oro',
  promesa_cumplida:      'oro_rosa',
  creador_imparable:     'obsidiana',
  negocio_en_marcha:     'platino',
  lluvia_de_billetes:    'diamante',
  circulo_intimo:        'oro',
  directorio_dorado:     'titanio',
  // ── Sección 3 — Hábitos
  madrugador:            'cobre',
  noctambulo:            'plata',
  cierre_limpio:         'plata',
  cobrador_implacable:   'oro',
  pipeline_zen:          'platino',
  visionario_cumplido:   'oro_rosa',
  conector:              'titanio',
  // ── Sección 4 — Rachas
  en_la_zona:            'bronce',
  racha_de_hierro:       'plata',
  inamovible:            'obsidiana',
  semana_perfecta:       'oro',
  mes_de_oro:            'diamante',
  // ── Sección 5 — Leyenda
  fundador:              'diamante',
  tres_en_un_dia:        'obsidiana',
  cobro_finde:           'oro_rosa',
  icono_efi:             'diamante',
};

const BADGE_MATERIALS: Record<BadgeKey, MaterialStyle> = Object.fromEntries(
  (Object.keys(BADGE_TIER) as BadgeKey[]).map(k => [k, TIER_STYLES[BADGE_TIER[k]]]),
) as Record<BadgeKey, MaterialStyle>;

function BadgeTile({ badge, unlocked, accentHex }: { badge: BadgeDef; unlocked: boolean; accentHex: string }) {
  const mat = BADGE_MATERIALS[badge.key];

  // Secret badges show a muted mystery label/icon until unlocked.
  const isSecretLocked = !!badge.secret && !unlocked;
  const revealed = unlocked && badge.secret ? SECRET_REVEALED[badge.key] : null;
  const displayLabel = revealed?.label ?? badge.label;
  const displayDescription = isSecretLocked
    ? (badge.secretHint ?? 'Algunos logros no se anuncian')
    : (revealed?.description ?? badge.description);
  const DisplayIcon = revealed?.icon ?? badge.icon;

  // Extract a more opaque spotlight color from the border color
  const spotlightColor = mat.tileBorderColor.replace(/rgba\(([^,]+,[^,]+,[^,]+),.*\)/, 'rgba($1,0.40)');

  return (
    <div className="flex w-[112px] shrink-0 flex-col items-center snap-start">
      {/* Pedestal area */}
      <div className="relative flex flex-col items-center">
        {unlocked && (
          <div
            className="pointer-events-none absolute -top-5 left-1/2 h-28 w-28 -translate-x-1/2 rounded-full blur-2xl"
            style={{ background: spotlightColor }}
          />
        )}

        {/* Metallic medallion */}
        <div
          className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full"
          style={
            unlocked
              ? { background: mat.medallionBg, boxShadow: mat.medallionShadow }
              : {
                  background: 'linear-gradient(145deg, #1c1c22 0%, #28282e 50%, #1a1a20 100%)',
                  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.85), 0 2px 6px rgba(0,0,0,0.6)',
                }
          }
        >
          {unlocked ? (
            <DisplayIcon size={26} weight="fill" style={{ color: mat.iconColor }} />
          ) : isSecretLocked ? (
            <Question size={22} weight="bold" style={{ color: '#4a4a58' }} />
          ) : (
            <Lock size={20} weight="fill" style={{ color: '#3a3a48' }} />
          )}
        </div>

        {/* Floating shelf plank */}
        <div
          className="relative z-10 mt-1.5 h-2 w-[4.5rem] rounded-sm"
          style={
            unlocked
              ? {
                  background: `linear-gradient(180deg, color-mix(in srgb, ${accentHex} 12%, #1a1a24) 0%, color-mix(in srgb, ${accentHex} 6%, #111118) 100%)`,
                  borderBottom: `3px solid ${mat.tileBorderColor}`,
                  boxShadow: `0 6px 16px -2px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), 0 3px 8px -2px ${mat.tileBorderColor}`,
                }
              : {
                  background: 'linear-gradient(180deg, #181818 0%, #101010 100%)',
                  borderBottom: '3px solid #252528',
                  boxShadow: '0 4px 10px -2px rgba(0,0,0,0.6)',
                }
          }
        />
      </div>

      {/* Museum wall plaque */}
      <div
        className="mt-3 w-full rounded px-2 py-1.5 text-center"
        style={
          unlocked
            ? {
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${mat.tileBorderColor}`,
              }
            : {
                background: 'rgba(255,255,255,0.015)',
                border: '1px solid rgba(255,255,255,0.07)',
                opacity: isSecretLocked ? 0.55 : 0.4,
              }
        }
      >
        <p
          className="text-[11px] font-semibold leading-tight"
          style={{ color: unlocked ? '#d0d0e0' : isSecretLocked ? '#7a7a88' : '#606068' }}
        >
          {isSecretLocked ? '???' : displayLabel}
        </p>
        <p
          className="mt-0.5 text-[10px] leading-tight"
          style={{ color: unlocked ? '#787890' : '#505058' }}
        >
          {displayDescription}
        </p>
      </div>
    </div>
  );
}

/* ── BadgesDrawer ───────────────────────────────────────────── */

function BadgesDrawer({ unlockedBadges, onClose, accentHex }: { unlockedBadges: BadgeKey[]; onClose: () => void; accentHex: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const unlockedSet = useMemo(() => new Set(unlockedBadges), [unlockedBadges]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={`relative flex h-full w-full max-w-md flex-col overflow-hidden shadow-2xl transition-transform duration-300 ease-out ${mounted ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ background: `linear-gradient(180deg, color-mix(in srgb, ${accentHex} 8%, #0c0c14) 0%, #090910 55%, #060608 100%)` }}
      >
        {/* Ambient ceiling glow */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-72"
          style={{ background: `radial-gradient(ellipse at 50% -10%, ${accentHex}70 0%, transparent 68%)` }}
        />

        {/* Header */}
        <div
          className="relative z-10 flex items-center justify-between px-5 py-4 pt-[max(1rem,env(safe-area-inset-top))]"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div>
            <h2 className="text-base font-bold" style={{ color: '#dcdcf0' }}>Sala de Placas</h2>
            <p className="mt-0.5 text-xs" style={{ color: `${accentHex}88` }}>
              {unlockedBadges.length} de {ALL_BADGES.length} ganados
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/5"
            style={{ color: `${accentHex}88` }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body — una sola pared: un único scroll horizontal que arrastra todas las filas juntas */}
        <div
          className="relative z-10 flex-1 overflow-x-auto overflow-y-auto py-2"
          style={{ scrollbarWidth: 'thin' }}
        >
          <div className="flex w-max flex-col">
            {SECTIONS.map((section) => {
              const sectionUnlocked = section.badges.filter(b => unlockedSet.has(b.key)).length;
              return (
                <div key={section.id} className="py-3">
                  {/* Mini-header inline, pegado a la izquierda — queda fijo en la columna 0, no se duplica */}
                  <div className="flex items-baseline justify-between gap-3 px-5" style={{ minWidth: '100%' }}>
                    <div className="flex items-baseline gap-2 min-w-0">
                      <h3
                        className="text-[10px] font-bold tracking-[0.18em] uppercase shrink-0"
                        style={{ color: '#dcdcf0' }}
                      >
                        {section.title}
                      </h3>
                      <p
                        className="truncate text-[10px]"
                        style={{ color: '#787890' }}
                      >
                        {section.subtitle}
                      </p>
                    </div>
                    <span
                      className="shrink-0 text-[10px] font-bold"
                      style={{ color: `${accentHex}bb` }}
                    >
                      {sectionUnlocked}/{section.badges.length}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-3 px-5">
                    {section.badges.map((badge) => (
                      <BadgeTile
                        key={badge.key}
                        badge={badge}
                        unlocked={unlockedSet.has(badge.key)}
                        accentHex={accentHex}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ── Dashboard ──────────────────────────────────────────────── */

export default function Dashboard() {
  const { tasks, partners, accentColor, accentHex, accentGradient, updateTaskStatus, profile, efisystem } = useAppContext();
  const today = new Date();
  const todayIso = formatLocalDateISO(today);
  const startOfToday = startOfLocalDay(today);
  const tomorrow = new Date(startOfToday);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = formatLocalDateISO(tomorrow);
  const weekEnd = new Date(startOfToday);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const [badgesOpen, setBadgesOpen] = useState(false);
  const [levelsOpen, setLevelsOpen] = useState(false);
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
      await hapticSuccess();
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

      {/* Efisystem: level widget */}
      <div className="mb-4">
        <EfisystemWidget
          efisystem={efisystem}
          accentHex={accentHex}
          onOpenBadges={() => setBadgesOpen(true)}
          onOpenLevels={() => setLevelsOpen(true)}
        />
      </div>
      {badgesOpen && (
        <BadgesDrawer unlockedBadges={efisystem.unlockedBadges} onClose={() => setBadgesOpen(false)} accentHex={accentHex} />
      )}
      {levelsOpen && (
        <LevelsModal currentLevel={efisystem.currentLevel} accentHex={accentHex} onClose={() => setLevelsOpen(false)} />
      )}

      {/* Main 2-col grid */}
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
        {/* ── Left: stacked cards ────────────────────────── */}
        <div className="order-2 space-y-5 xl:order-1">
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
                      aria-label="Período anterior"
                      className="rounded-lg p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                    >
                      <CaretLeft size={16} />
                    </button>
                  )}
                  <span className="min-w-[140px] text-center text-[13px] font-bold text-[var(--text-primary)]">
                    {periodLabel}
                  </span>
                  {periodView === 'month' && (
                    <button
                      type="button"
                      onClick={() => navigatePeriod(1)}
                      aria-label="Período siguiente"
                      className="rounded-lg p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                    >
                      <CaretRight size={16} />
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
                    Clientes
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

          {/* Goal Effort Distribution */}
          <GoalEffortWidget
            tasks={periodFilteredTasks}
            goals={profile?.goals || []}
            accentHex={accentHex}
            accentGradient={accentGradient}
          />

        </div>

        {/* ── Right: Agenda ──────────────────────────────── */}
        <SurfaceCard className="order-1 p-5 lg:p-6 xl:order-2">
          <p className="text-[11px] font-bold tracking-[0.18em] text-[var(--text-secondary)] uppercase">
            Agenda
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
              icon={CalendarDot}
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
