/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  HouseLine,
  CircleNotch,
  Kanban,
  SignOut,
  SlidersHorizontal,
  Target,
  User,
  Users,
} from '@phosphor-icons/react';
import type { SessionUser } from '@shared';
import { AppProvider, useAppContext } from './context/AppContext';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './views/Dashboard';
import Pipeline from './views/Pipeline';
import Directory from './views/Directory';
import Profile from './views/Profile';
import Settings from './views/Settings';
import StrategicView from './views/StrategicView';
import Landing from './views/Landing';
import AIAssistant from './components/AIAssistant';
import OnboardingTour from './components/OnboardingTour';
import WelcomeColorPicker from './views/WelcomeColorPicker';
import Toaster from './components/Toaster';
import { Avatar, SurfaceCard, cx } from './components/ui';
import { authApi } from './lib/api';
import { supabase } from './lib/supabase';

type TabId = 'dashboard' | 'pipeline' | 'directory' | 'strategic' | 'profile' | 'settings';

const tabs: Array<{
  id: TabId;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: 'dashboard',
    label: 'Inicio',
    shortLabel: 'Inicio',
    description: 'Resumen general del pipeline, partners y entregables.',
    icon: HouseLine,
  },
  {
    id: 'pipeline',
    label: 'Pipeline',
    shortLabel: 'Pipeline',
    description: 'Gestiona tareas, estados y calendario comercial.',
    icon: Kanban,
  },
  {
    id: 'directory',
    label: 'Directorio',
    shortLabel: 'Directorio',
    description: 'Organiza marcas, contactos y alcance comercial.',
    icon: Users,
  },
  {
    id: 'strategic',
    label: 'Estrategia',
    shortLabel: 'Estrategia',
    description: 'Visualiza cómo tus tareas y marcas contribuyen a tus objetivos.',
    icon: Target,
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
    icon: SlidersHorizontal,
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

/* ── Pull-to-refresh (mobile only) ──────────────────────── */

function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const THRESHOLD = 120;
  const DEAD_ZONE = 12;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0 && !refreshing) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, [refreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > DEAD_ZONE) {
      setPullDistance(Math.min((delta - DEAD_ZONE) * 0.5, THRESHOLD * 1.5));
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(THRESHOLD * 0.6);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, refreshing, onRefresh]);

  return { pullDistance, refreshing, handleTouchStart, handleTouchMove, handleTouchEnd };
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

  if (activeTab === 'strategic') {
    return <StrategicView />;
  }

  if (activeTab === 'profile') {
    return <Profile />;
  }

  return <Settings />;
}

function canScrollElementInDirection(element: HTMLElement, deltaY: number) {
  if (typeof window === 'undefined' || deltaY === 0) {
    return false;
  }

  const { overflowY } = window.getComputedStyle(element);
  const allowsVerticalScroll =
    overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay';

  if (!allowsVerticalScroll || element.scrollHeight <= element.clientHeight + 1) {
    return false;
  }

  if (deltaY < 0) {
    return element.scrollTop > 0;
  }

  return element.scrollTop + element.clientHeight < element.scrollHeight - 1;
}

function hasScrollableAncestorThatCanConsume(target: HTMLElement | null, deltaY: number) {
  let current: HTMLElement | null = target;

  while (current) {
    if (canScrollElementInDirection(current, deltaY)) {
      return true;
    }

    current = current.parentElement;
  }

  return false;
}

// Desktop scroll safety:
// the workspace `main` owns vertical scrolling, while the sidebar only forwards
// wheel input into `main` when it cannot consume that movement itself.
const DesktopSidebar = ({
  activeTab,
  onTabChange,
  onWheelCapture,
  onLogout,
  accentColor,
  accentGradient,
  profileAvatar,
  profileName,
}: {
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
  onWheelCapture?: React.WheelEventHandler<HTMLElement>;
  onLogout: () => void;
  accentColor: string;
  accentGradient: string;
  profileAvatar: string;
  profileName: string;
}) => (
  <aside
    onWheelCapture={onWheelCapture}
    className="hide-scrollbar hidden lg:sticky lg:top-4 lg:flex lg:max-h-[calc(100dvh-2rem)] lg:min-w-0 lg:self-start lg:flex-col lg:gap-4 lg:overflow-y-auto lg:bg-[color:var(--surface-overlay)] lg:px-5 lg:py-6"
  >
    <div className="px-1">
      <div className="flex items-center gap-3 px-3">
        <Avatar
          src={profileAvatar}
          name={profileName}
          size={48}
          className="border shadow-sm [border-color:var(--line-soft)]"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[var(--text-primary)]">{profileName}</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          title="Cerrar sesion"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-card-strong)] hover:text-[var(--text-primary)]"
        >
          <SignOut size={16} weight="regular" />
        </button>
      </div>
    </div>

    <div className="px-1">
      <nav className="space-y-1.5">
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
                'w-full rounded-[1.1rem] px-3 py-3 text-left transition-all',
                isActive
                  ? 'bg-[var(--surface-card-strong)]'
                  : 'hover:bg-[var(--surface-card)]/80',
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-[0.95rem] text-[var(--text-secondary)] transition-colors"
                  style={isActive ? { color: accentColor } : undefined}
                >
                  <Icon size={18} weight={isActive ? 'duotone' : 'regular'} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {isActive ? (
                      <span
                        aria-hidden="true"
                        className="h-5 w-1 shrink-0 rounded-full"
                        style={{ background: accentGradient }}
                      />
                    ) : null}
                    <p className="truncate text-sm font-bold" style={isActive ? { color: accentColor } : { color: 'var(--text-primary)' }}>{tab.label}</p>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  </aside>
);

const MobileBottomNav = ({
  activeTab,
  onTabChange,
  accentColor,
  accentGradient,
}: {
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
  accentColor: string;
  accentGradient: string;
}) => (
  <div
    className="fixed inset-x-0 bottom-0 z-[90] flex justify-between border-t bg-[var(--surface-card-strong)] px-3 backdrop-blur-2xl transition-colors duration-300 [border-color:var(--line-soft)] lg:hidden"
    style={{
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
                ? ''
                : 'text-[var(--text-secondary)]',
            )}
            style={isActive ? { color: accentColor } : undefined}
          >
            <Icon size={22} weight={isActive ? 'duotone' : 'regular'} />
            <span
              className={cx(
                'text-[10px] font-bold tracking-wide hidden min-[480px]:inline',
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
  const mainRegionRef = useRef<HTMLElement | null>(null);
  const {
    accentColor,
    accentHex,
    accentGradient,
    profile,
    isBootstrapping,
    bootstrapError,
    actionError,
    dismissActionError,
    refreshAppData,
    onLogout,
  } = useAppContext();

  const activeTabConfig = tabs.find((tab) => tab.id === activeTab) || tabs[0];
  const { pullDistance, refreshing, handleTouchStart, handleTouchMove, handleTouchEnd } = usePullToRefresh(refreshAppData);

  useEffect(() => {
    if (isDesktop) {
      mainRegionRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    } else if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }

    requestAnimationFrame(() => {
      mainRegionRef.current?.focus({ preventScroll: true });
    });
  }, [activeTab, isDesktop]);

  const handleMainKeyDownCapture = (event: React.KeyboardEvent<HTMLElement>) => {
    const mainRegion = mainRegionRef.current;

    if (!mainRegion || typeof window === 'undefined') {
      return;
    }

    const target = event.target as HTMLElement | null;

    if (target?.closest('input, textarea, select, [contenteditable="true"]')) {
      return;
    }

    const scrollTarget = isDesktop ? mainRegion : window;
    const viewportHeight = isDesktop ? mainRegion.clientHeight : window.innerHeight;
    const pageStep = Math.max(viewportHeight * 0.88, 240);

    if (event.key === 'PageDown' || (event.key === ' ' && !event.shiftKey)) {
      event.preventDefault();
      scrollTarget.scrollBy({ top: pageStep, behavior: 'auto' });
      return;
    }

    if (event.key === 'PageUp' || (event.key === ' ' && event.shiftKey)) {
      event.preventDefault();
      scrollTarget.scrollBy({ top: -pageStep, behavior: 'auto' });
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      scrollTarget.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      if (isDesktop) {
        mainRegion.scrollTo({ top: mainRegion.scrollHeight, behavior: 'auto' });
      } else {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'auto' });
      }
    }
  };

  const handleDesktopSidebarWheelCapture = (event: React.WheelEvent<HTMLElement>) => {
    if (!isDesktop || Math.abs(event.deltaY) < 1) {
      return;
    }

    const mainRegion = mainRegionRef.current;

    if (!mainRegion) {
      return;
    }

    const target = event.target as HTMLElement | null;

    if (hasScrollableAncestorThatCanConsume(target, event.deltaY)) {
      return;
    }

    if (!canScrollElementInDirection(mainRegion, event.deltaY)) {
      return;
    }

    event.preventDefault();
    mainRegion.scrollBy({ top: event.deltaY, behavior: 'auto' });
  };

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-app)] px-6">
        <SurfaceCard className="w-full max-w-lg p-8 text-center">
          <p className="text-[11px] font-bold tracking-[0.18em] text-[var(--text-secondary)] uppercase">
            {`T\u00eda`}
          </p>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
            Cargando workspace
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Estamos preparando tus datos y tus vistas de trabajo.
          </p>
        </SurfaceCard>
      </div>
    );
  }

  if (bootstrapError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-app)] px-6">
        <SurfaceCard className="w-full max-w-lg p-8 text-center">
          <p className="text-[11px] font-bold tracking-[0.18em] text-rose-500 uppercase">Error</p>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
            No pudimos cargar la app
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{bootstrapError}</p>
          <button
            type="button"
            onClick={() => void refreshAppData()}
            className="mt-6 w-full rounded-[1rem] py-3.5 text-sm font-bold shadow-[0_12px_30px_-16px_var(--accent-glow)]"
            style={{ background: accentGradient, color: 'var(--accent-foreground)' }}
          >
            Reintentar
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="mt-3 w-full rounded-2xl py-3.5 text-sm font-bold text-(--text-secondary) hover:text-(--text-primary) transition-colors"
          >
            Cerrar sesión
          </button>
        </SurfaceCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-app)] font-sans text-[var(--text-primary)] transition-colors duration-300">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-28 right-[-6%] h-80 w-80 rounded-full blur-3xl opacity-60"
          style={{ backgroundColor: `${accentHex}22` }}
        />
        <div className="absolute bottom-0 left-[-4%] h-72 w-72 rounded-full bg-emerald-200/20 blur-3xl dark:bg-emerald-400/10" />
      </div>

      <div className="relative min-h-[100dvh] w-full lg:h-[100dvh] lg:p-4">
        <div className="min-h-[100dvh] w-full lg:h-[calc(100dvh-2rem)] lg:min-h-0 lg:overflow-hidden lg:rounded-[2rem] lg:border lg:bg-[var(--surface-shell)] lg:shadow-[var(--shadow-medium)] [border-color:var(--line-soft)]">
          <div className="min-h-[100dvh] w-full lg:grid lg:h-full lg:min-h-0 lg:grid-cols-[clamp(250px,18vw,300px)_minmax(0,1fr)] lg:items-start">
            {isDesktop ? (
              <DesktopSidebar
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onWheelCapture={handleDesktopSidebarWheelCapture}
                onLogout={onLogout}
                accentColor={accentHex}
                accentGradient={accentGradient}
                profileAvatar={profile.avatar}
                profileName={profile.name}
              />
            ) : null}

            <main
              ref={mainRegionRef}
              tabIndex={-1}
              onKeyDownCapture={handleMainKeyDownCapture}
              className={cx(
                'relative min-w-0 outline-none transition-colors duration-300',
                isDesktop
                  ? 'hide-scrollbar flex min-h-[100dvh] flex-col border-l bg-transparent lg:h-full lg:min-h-0 lg:overflow-y-auto [border-color:var(--line-soft)]'
                  : 'flex min-h-[100dvh] flex-col bg-[var(--surface-card)]',
              )}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-75 transition-colors duration-700"
                style={{
                  background: `radial-gradient(circle at top left, ${accentHex}30 0%, ${accentHex}10 35%, transparent 65%)`,
                }}
              />

              {/* Pull-to-refresh indicator (mobile) */}
              {!isDesktop && pullDistance > 0 && (
                <div
                  className="relative z-20 flex items-center justify-center overflow-hidden transition-all"
                  style={{ height: pullDistance }}
                >
                  <CircleNotch
                    size={20}
                    className={cx('text-[var(--text-secondary)]', refreshing && 'animate-spin')}
                    style={{ opacity: Math.min(pullDistance / 80, 1) }}
                  />
                </div>
              )}

              <div
                className="relative z-10 flex flex-1 min-h-0 flex-col"
                onTouchStart={!isDesktop ? handleTouchStart : undefined}
                onTouchMove={!isDesktop ? handleTouchMove : undefined}
                onTouchEnd={!isDesktop ? handleTouchEnd : undefined}
              >
                <div
                  className={cx(
                    'min-w-0 flex flex-wrap items-baseline gap-4',
                    isDesktop ? 'px-8 py-5' : 'px-4 pb-3 pt-4',
                  )}
                  style={
                    isDesktop
                      ? undefined
                      : {
                          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.55rem)',
                        }
                  }
                >
                  <h2 className={cx('font-bold tracking-tight text-[var(--text-primary)] whitespace-nowrap', isDesktop ? 'text-[1.5rem]' : 'text-lg')}>
                    {activeTabConfig.label}
                  </h2>
                  <p className={cx('text-[var(--text-secondary)] flex-1 min-w-0 hidden lg:block', isDesktop ? 'text-sm leading-6' : 'text-xs leading-5')}>
                    {activeTabConfig.description}
                  </p>
                </div>

                <div
                  className="hide-scrollbar flex-1 min-h-0"
                  style={
                    isDesktop
                      ? {
                          paddingBottom: '4rem',
                        }
                      : {
                          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8.5rem)',
                        }
                  }
                >
                  <div className={cx('min-w-0', isDesktop ? 'w-full' : 'px-0')}>
                    {renderActiveView(activeTab)}
                  </div>
                </div>
              </div>

              {!isDesktop ? (
                <MobileBottomNav
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  accentColor={accentHex}
                  accentGradient={accentGradient}
                />
              ) : null}

              <AIAssistant isDesktop={isDesktop} />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};

const DEFAULT_ACCENT = '#C96F5B';

const ONBOARDING_STORAGE_KEY = 'hasSeenOnboardingTour';

const AppShell = () => {
  const { isBootstrapping, bootstrapError, profile, accentColor, setAccentColor } = useAppContext();
  const [colorPicked, setColorPicked] = useState(false);
  const [forceOnboarding, setForceOnboarding] = useState(false);

  const needsColorPicker = !isBootstrapping && !bootstrapError && !colorPicked && accentColor === DEFAULT_ACCENT;

  const handleColorSelected = async (color: string) => {
    try {
      await setAccentColor(color);
    } catch {
      // Let the user proceed even if the API call fails
    }
    if (!localStorage.getItem(ONBOARDING_STORAGE_KEY)) {
      setForceOnboarding(true);
    }
    setColorPicked(true);
  };

  if (needsColorPicker) {
    return (
      <WelcomeColorPicker
        userName={profile.name}
        onSelect={handleColorSelected}
      />
    );
  }

  return (
    <>
      {!isBootstrapping && !bootstrapError ? <OnboardingTour forceRun={forceOnboarding} /> : null}
      <MainLayout />
      <Toaster />
    </>
  );
};

type AuthPhase = 'checking' | 'unauthenticated' | 'authenticated';

export default function App() {
  const [authPhase, setAuthPhase] = useState<AuthPhase>('checking');
  const [, setSessionUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    async function checkAuth() {
      // 1. Check if we already have an express-session
      try {
        const { user } = await authApi.me();
        if (user) {
          setSessionUser(user);
          setAuthPhase('authenticated');
          return;
        }
      } catch {
        // No existing session, continue
      }

      // 2. Check if Supabase OAuth just completed (redirect with tokens)
      if (supabase) {
        try {
          const { data } = await supabase.auth.getSession();
          if (data.session?.access_token) {
            // Exchange Supabase token for express-session
            const { user } = await authApi.googleSupabase(data.session.access_token);
            // Sign out of Supabase — we only needed it for identity
            await supabase.auth.signOut();
            if (user) {
              setSessionUser(user);
              setAuthPhase('authenticated');
              return;
            }
          }
        } catch {
          // Supabase auth failed, fall through to unauthenticated
        }
      }

      setAuthPhase('unauthenticated');
    }

    checkAuth();
  }, []);

  const handleLogin = (user: SessionUser) => {
    setSessionUser(user);
    setAuthPhase('authenticated');
  };

  const handleLogout = () => {
    authApi.logout().catch(() => {});
    setSessionUser(null);
    setAuthPhase('unauthenticated');
  };

  useEffect(() => {
    if (authPhase !== 'authenticated') return;
    const handler = () => {
      authApi.logout().catch(() => {});
      setSessionUser(null);
      setAuthPhase('unauthenticated');
    };
    window.addEventListener('tia:unauthorized', handler);
    return () => window.removeEventListener('tia:unauthorized', handler);
  }, [authPhase]);

  if (authPhase === 'checking') {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--surface-app)]">
        <div className="text-center">
          <p className="text-[11px] font-bold tracking-[0.18em] text-[var(--text-secondary)] uppercase">
            Tia
          </p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Cargando…</p>
        </div>
      </div>
    );
  }

  if (authPhase === 'unauthenticated') {
    return <Landing onLogin={handleLogin} />;
  }

  return (
    <ErrorBoundary>
      <AppProvider onLogout={handleLogout}>
        <AppShell />
      </AppProvider>
    </ErrorBoundary>
  );
}
