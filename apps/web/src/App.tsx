/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Home,
  LayoutDashboard,
  Settings as SettingsIcon,
  User,
  Users,
} from 'lucide-react';
import { AppProvider, useAppContext } from './context/AppContext';
import Dashboard from './views/Dashboard';
import Pipeline from './views/Pipeline';
import Directory from './views/Directory';
import Profile from './views/Profile';
import Settings from './views/Settings';
import AIAssistant from './components/AIAssistant';
import OnboardingTour from './components/OnboardingTour';
import { SurfaceCard, cx } from './components/ui';

type TabId = 'dashboard' | 'pipeline' | 'directory' | 'profile' | 'settings';

const tabs: Array<{
  id: TabId;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}> = [
  {
    id: 'dashboard',
    label: 'Inicio',
    shortLabel: 'Inicio',
    description: 'Resumen general del pipeline, partners y entregables.',
    icon: Home,
  },
  {
    id: 'pipeline',
    label: 'Pipeline',
    shortLabel: 'Pipeline',
    description: 'Gestiona tareas, estados y calendario comercial.',
    icon: LayoutDashboard,
  },
  {
    id: 'directory',
    label: 'Directorio',
    shortLabel: 'Directorio',
    description: 'Organiza marcas, contactos y alcance comercial.',
    icon: Users,
  },
  {
    id: 'profile',
    label: 'Perfil',
    shortLabel: 'Perfil',
    description: 'Define identidad, objetivos y material de presentaci\u00f3n.',
    icon: User,
  },
  {
    id: 'settings',
    label: 'Ajustes',
    shortLabel: 'Ajustes',
    description: 'Tema, plantillas, notificaciones e integraciones.',
    icon: SettingsIcon,
  },
];

function useIsDesktop() {
  const getInitialValue = () =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;

  const [isDesktop, setIsDesktop] = useState(getInitialValue);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
    };

    setIsDesktop(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return isDesktop;
}

function renderActiveView(activeTab: TabId) {
  if (activeTab === 'dashboard') {
    return <Dashboard />;
  }

  if (activeTab === 'pipeline') {
    return <Pipeline />;
  }

  if (activeTab === 'directory') {
    return <Directory />;
  }

  if (activeTab === 'profile') {
    return <Profile />;
  }

  return <Settings />;
}

const DesktopSidebar = ({
  activeTab,
  onTabChange,
  accentColor,
  profileAvatar,
  profileName,
  todayLabel,
}: {
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
  accentColor: string;
  profileAvatar: string;
  profileName: string;
  todayLabel: string;
}) => (
  <aside className="hide-scrollbar hidden lg:sticky lg:top-0 lg:flex lg:h-[100dvh] lg:min-h-[100dvh] lg:min-w-0 lg:flex-col lg:gap-4 lg:overflow-y-auto lg:px-4 lg:py-5">
    <div className="px-1 py-1">
      <div className="flex items-center gap-3">
        <img
          src={profileAvatar}
          alt={profileName}
          className="h-11 w-11 rounded-xl border border-white/80 object-cover shadow-sm dark:border-slate-700/60"
        />
        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500">
            {'Sesi\u00f3n'}
          </p>
          <p className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-slate-100">
            {profileName}
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <CalendarDays size={13} />
            <span className="truncate">{todayLabel}</span>
          </div>
        </div>
      </div>
    </div>

    <SurfaceCard className="p-2.5">
      <p className="px-3 pb-2 text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase dark:text-slate-500">
        {'Navegaci\u00f3n'}
      </p>
      <nav className="space-y-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`nav-${tab.id}`}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cx(
                'w-full rounded-[1rem] border px-3.5 py-3.5 text-left transition-all',
                isActive
                  ? 'border-slate-200/80 shadow-[0_16px_28px_-26px_rgba(15,23,42,0.26)] dark:border-slate-700/60'
                  : 'border-transparent hover:border-slate-200/70 hover:bg-slate-50/80 dark:hover:border-slate-700/60 dark:hover:bg-slate-800/70',
              )}
              style={isActive ? { backgroundColor: `${accentColor}12` } : undefined}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cx(
                    'flex h-10 w-10 items-center justify-center rounded-[0.8rem]',
                    isActive
                      ? 'bg-white/92 dark:bg-slate-900/62'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                  )}
                  style={isActive ? { color: accentColor } : undefined}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.4 : 2.05} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{tab.label}</p>
                  <p className="mt-1 text-[12px] leading-5 text-slate-500 dark:text-slate-400">
                    {tab.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </nav>
    </SurfaceCard>
  </aside>
);

const MobileBottomNav = ({
  activeTab,
  onTabChange,
  accentColor,
}: {
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
  accentColor: string;
}) => (
  <div
    className="fixed left-4 right-4 z-[90] flex justify-between rounded-[1.35rem] border border-white/55 bg-white/90 px-3 shadow-[0_22px_50px_-20px_rgba(15,23,42,0.34)] backdrop-blur-2xl transition-colors duration-300 dark:border-slate-700/40 dark:bg-slate-800/88 lg:hidden"
    style={{
      bottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)',
      paddingTop: '0.7rem',
      paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.7rem)',
    }}
  >
    {tabs.map((tab) => {
      const Icon = tab.icon;
      const isActive = activeTab === tab.id;

      return (
        <button
          key={tab.id}
          id={`nav-${tab.id}`}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className="flex min-w-0 flex-1 justify-center"
        >
          <div
            className={cx(
              'flex w-full max-w-[68px] flex-col items-center gap-1 rounded-[1rem] px-2 py-2.5 transition-all',
              isActive
                ? 'shadow-[0_16px_25px_-22px_rgba(15,23,42,0.45)]'
                : 'text-slate-500 dark:text-slate-400',
            )}
            style={isActive ? { backgroundColor: `${accentColor}16`, color: accentColor } : undefined}
          >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 2.1} />
            <span
              className={cx(
                'text-[10px] font-bold tracking-wide',
                isActive ? '' : 'opacity-75',
              )}
            >
              {tab.shortLabel}
            </span>
          </div>
        </button>
      );
    })}
  </div>
);

const MainLayout = () => {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const isDesktop = useIsDesktop();
  const {
    accentColor,
    profile,
    isBootstrapping,
    bootstrapError,
    actionError,
    dismissActionError,
    refreshAppData,
  } = useAppContext();

  const activeTabConfig = tabs.find((tab) => tab.id === activeTab) || tabs[0];
  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
    [],
  );

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6 dark:bg-slate-950">
        <SurfaceCard className="w-full max-w-lg p-8 text-center">
          <p className="text-[11px] font-bold tracking-[0.18em] text-slate-400 dark:text-slate-500 uppercase">
            {`T\u00eda`}
          </p>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Cargando workspace
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Estamos preparando tus datos y tus vistas de trabajo.
          </p>
        </SurfaceCard>
      </div>
    );
  }

  if (bootstrapError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6 dark:bg-slate-950">
        <SurfaceCard className="w-full max-w-lg p-8 text-center">
          <p className="text-[11px] font-bold tracking-[0.18em] text-rose-500 uppercase">Error</p>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            No pudimos cargar la app
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{bootstrapError}</p>
          <button
            type="button"
            onClick={() => void refreshAppData()}
            className="mt-6 w-full rounded-[1rem] py-3.5 text-sm font-bold shadow-[0_12px_30px_-16px_var(--accent-glow)]"
            style={{ backgroundColor: accentColor, color: 'var(--accent-foreground)' }}
          >
            Reintentar
          </button>
        </SurfaceCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-28 right-[-6%] h-80 w-80 rounded-full blur-3xl opacity-55"
          style={{ backgroundColor: `${accentColor}22` }}
        />
        <div className="absolute bottom-0 left-[-4%] h-72 w-72 rounded-full bg-cyan-200/20 blur-3xl dark:bg-cyan-500/10" />
      </div>

      <div className="relative min-h-[100dvh] w-full">
        <div className="min-h-[100dvh] w-full lg:grid lg:grid-cols-[clamp(240px,18vw,300px)_minmax(0,1fr)] lg:items-start">
          {isDesktop ? (
            <DesktopSidebar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              accentColor={accentColor}
              profileAvatar={profile.avatar}
              profileName={profile.name}
              todayLabel={todayLabel}
            />
          ) : null}

          <main
            className={cx(
              'relative min-w-0 transition-colors duration-300',
              isDesktop
                ? 'flex min-h-[100dvh] flex-col border-l border-slate-200/80 bg-white/86 dark:border-slate-700/60 dark:bg-slate-900/78'
                : 'flex min-h-[100dvh] flex-col bg-white/94 dark:bg-slate-900/96',
            )}
          >
            <div
              className="pointer-events-none absolute left-0 right-0 top-0 h-72 opacity-75 transition-colors duration-700"
              style={{
                background: `linear-gradient(135deg, ${accentColor}18, ${accentColor}08, transparent)`,
              }}
            />

            {isDesktop ? (
              <div className="relative z-10 px-6 pt-7 pb-1 lg:px-8 lg:pt-8">
                <div className="w-full">
                  <p className="text-[11px] font-bold tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500">
                    Panel de trabajo
                  </p>
                  <h2 className="mt-2 text-[2rem] font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                    {activeTabConfig.label}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {activeTabConfig.description}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="relative z-10 flex flex-1 flex-col">
              <div
                className={cx(
                  isDesktop
                    ? 'pb-16'
                    : 'hide-scrollbar flex-1 overflow-y-auto',
                )}
                style={
                  isDesktop
                    ? undefined
                    : {
                        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)',
                        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8.5rem)',
                      }
                }
              >
                {actionError ? (
                  <div className={cx(isDesktop ? 'px-8 pt-1' : 'px-4 pt-1')}>
                    <div className="flex items-start gap-3 rounded-[1rem] border border-rose-200/80 bg-rose-50/90 px-4 py-3 dark:border-rose-500/20 dark:bg-rose-500/10">
                      <div className="flex-1">
                        <p className="text-[11px] font-bold tracking-[0.16em] text-rose-500 uppercase">
                          {'Acci\u00f3n no completada'}
                        </p>
                        <p className="mt-1 text-sm text-rose-700 dark:text-rose-200">{actionError}</p>
                      </div>
                      <button
                        type="button"
                        onClick={dismissActionError}
                        className="text-xs font-bold tracking-[0.14em] text-rose-500 uppercase"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className={cx('min-w-0', isDesktop ? 'w-full' : 'px-0')}>
                  {renderActiveView(activeTab)}
                </div>
              </div>
            </div>

            {!isDesktop ? (
              <MobileBottomNav
                activeTab={activeTab}
                onTabChange={setActiveTab}
                accentColor={accentColor}
              />
            ) : null}

            <AIAssistant isDesktop={isDesktop} />
          </main>
        </div>
      </div>
    </div>
  );
};

const AppShell = () => {
  const { isBootstrapping, bootstrapError } = useAppContext();

  return (
    <>
      {!isBootstrapping && !bootstrapError ? <OnboardingTour /> : null}
      <MainLayout />
    </>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
