import React, { useState } from 'react';
import { ChartBar, CalendarDots, Image, Rocket, Sparkle, X } from '@phosphor-icons/react';

const BRAND_GOLD = '#FCAF45';
const BRAND_ORANGE = '#F56040';
const BRAND_PINK = '#E1306C';
const BRAND_PURPLE = '#833AB4';

const ROADMAP_ITEMS = [
  {
    icon: Sparkle,
    title: 'Asistente IA',
    description: 'Consultas inteligentes sobre tu pipeline, contactos y metricas con contexto completo.',
    color: BRAND_PURPLE,
  },
  {
    icon: CalendarDots,
    title: 'Google Calendar',
    description: 'Sincronizacion bidireccional de entregas y deadlines con tu calendario.',
    color: BRAND_ORANGE,
  },
  {
    icon: Image,
    title: 'Media Kit avanzado',
    description: 'Generacion automatica con datos en vivo, exportacion PDF y link publico.',
    color: BRAND_PINK,
  },
  {
    icon: ChartBar,
    title: 'Gamification',
    description: 'Logros, rachas y niveles que premian tu consistencia y productividad.',
    color: BRAND_GOLD,
  },
];

export default function RoadmapButton({ compact }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);

  // Usamos los colores por defecto de la marca para que funcione fuera del AppProvider
  const accentColor = BRAND_ORANGE;
  const accentGradient = `linear-gradient(135deg, ${BRAND_ORANGE}, ${BRAND_PINK}, ${BRAND_PURPLE})`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="group relative flex items-center gap-2 overflow-hidden rounded-full py-2 pl-3 pr-4 text-xs font-extrabold transition-all hover:scale-105 hover:shadow-lg active:scale-[0.97]"
        style={{
          background: accentGradient,
          color: '#ffffff',
          boxShadow: `0 4px 20px -6px ${accentColor}90`,
          ...(compact ? { padding: '0.375rem 0.75rem 0.375rem 0.625rem', fontSize: '11px' } : {}),
        }}
      >
        <span className="pointer-events-none absolute inset-0 bg-white/0 transition-colors group-hover:bg-white/10" />
        <Rocket size={compact ? 12 : 13} />
        Lo que se viene
        <span className="relative flex h-2 w-2">
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
            style={{ backgroundColor: accentColor }}
          />
          <span
            className="relative inline-flex h-2 w-2 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-3 top-auto z-50 mt-3 animate-in fade-in zoom-in-95 duration-150 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:w-96">
            <div className="overflow-hidden rounded-2xl border bg-[var(--surface-card-strong)] shadow-[0_25px_60px_-16px_rgba(0,0,0,0.25)] backdrop-blur-xl [border-color:var(--line-soft)]">
              {/* Header */}
              <div
                className="relative px-5 pb-3 pt-5"
                style={{ background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}12, ${accentColor}10)` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-lg"
                      style={{ background: accentGradient, color: '#ffffff' }}
                    >
                      <Rocket size={13} />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-[var(--text-primary)]">Roadmap</p>
                      <p
                        className="text-[10px] font-bold tracking-[0.14em] uppercase"
                        style={{ color: accentColor }}
                      >
                        Beta
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                  >
                    <X size={15} weight="regular" />
                  </button>
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                  Funcionalidades en desarrollo para las proximas versiones.
                </p>
              </div>

              {/* Items */}
              <div className="divide-y divide-[var(--line-soft)] px-2 pb-2">
                {ROADMAP_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="flex gap-3 px-3 py-3.5 first:mt-1">
                      <div
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${item.color}14`, color: item.color }}
                      >
                        <Icon size={15} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[var(--text-primary)]">{item.title}</p>
                        <p className="mt-0.5 text-xs leading-5 text-[var(--text-secondary)]">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  );
}
