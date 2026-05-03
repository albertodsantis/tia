/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
const ResetPassword = lazy(() => import('./views/ResetPassword'));
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
import Landing from './views/Landing';

const Dashboard = lazy(() => import('./views/Dashboard'));
const Pipeline = lazy(() => import('./views/Pipeline'));
const Directory = lazy(() => import('./views/Directory'));
const Profile = lazy(() => import('./views/Profile'));
const Settings = lazy(() => import('./views/Settings'));
const StrategicView = lazy(() => import('./views/StrategicView'));
const WelcomeOnboarding = lazy(() => import('./views/WelcomeOnboarding'));
const WelcomeColorPicker = lazy(() => import('./views/WelcomeColorPicker'));
const OnboardingTour = lazy(() => import('./components/OnboardingTour'));
const AIAssistant = lazy(() => import('./components/AIAssistant'));
import Toaster from './components/Toaster';
import Confetti from './components/Confetti';
import MoreOptionsMenu from './components/MoreOptionsMenu';
import NotificationBell from './components/NotificationBell';
import LegalModal from './components/LegalModal';
import type { LegalPage } from './components/LegalModal';
import { Avatar, LoadingMushroom, SurfaceCard, cx } from './components/ui';
import { authApi } from './lib/api';
import { identifyUser, resetPostHog } from './lib/posthog';
import { captureReferralFromUrl, readReferralCode, clearReferralCode } from './lib/referral';
import { supabase } from './lib/supabase';
import { getAccentSecondary } from './lib/accent';
import { registerAndroidBackHandler } from './lib/androidBack';

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
    description: 'Resumen general del pipeline, clientes y entregables.',
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
    description: 'Organiza clientes, contactos y alcance comercial.',
    icon: Users,
  },
  {
    id: 'strategic',
    label: 'Estrategia',
    shortLabel: 'Estrategia',
    description: 'Visualiza cómo tus tareas y clientes contribuyen a tus objetivos.',
    icon: Target,
  },
  {
    id: 'profile',
    label: 'EfiLink',
    shortLabel: 'EfiLink',
    description: 'Tu página de enlace personal para compartir con prospectos y clientes.',
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

const LazyFallback = () => (
  <div className="flex flex-1 items-center justify-center py-16">
    <LoadingMushroom size={72} />
  </div>
);

function renderActiveView(activeTab: TabId) {
  if (activeTab === 'dashboard') {
    return <ErrorBoundary key="dashboard"><Dashboard /></ErrorBoundary>;
  }

  if (activeTab === 'pipeline') {
    return <ErrorBoundary key="pipeline"><Pipeline /></ErrorBoundary>;
  }

  if (activeTab === 'directory') {
    return <ErrorBoundary key="directory"><Directory /></ErrorBoundary>;
  }

  if (activeTab === 'strategic') {
    return <ErrorBoundary key="strategic"><StrategicView /></ErrorBoundary>;
  }

  if (activeTab === 'profile') {
    return <ErrorBoundary key="profile"><Profile /></ErrorBoundary>;
  }

  return <ErrorBoundary key="settings"><Settings /></ErrorBoundary>;
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
const DesktopSidebar = React.memo(({
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
    className="hide-scrollbar hidden lg:sticky lg:top-4 lg:flex lg:max-h-[calc(100dvh-2rem)] lg:min-w-0 lg:self-start lg:flex-col lg:gap-4 lg:overflow-y-auto lg:bg-(--surface-overlay) lg:px-5 lg:py-6"
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
          title="Cerrar sesión"
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
              aria-current={isActive ? 'page' : undefined}
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
));

const MobileBottomNav = React.memo(({
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
    className="fixed inset-x-0 bottom-0 z-[90] flex justify-between bg-(--surface-card-strong) px-3 backdrop-blur-2xl transition-colors duration-300 lg:hidden"
    style={{
      paddingTop: '0.7rem',
      paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.7rem)',
      borderTop: '3px solid var(--accent-secondary, var(--line-soft))',
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
          aria-current={isActive ? 'page' : undefined}
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
));

const MainLayout = () => {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [activeLegalPage, setActiveLegalPage] = useState<LegalPage | null>(null);
  const isDesktop = useIsDesktop();
  const activeTabRef = useRef<TabId>('dashboard');
  activeTabRef.current = activeTab;

  useEffect(() => {
    return registerAndroidBackHandler(
      () => activeTabRef.current,
      setActiveTab,
    );
  }, []);
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
    pendingNewTaskPartner,
    setPendingNewTaskPartner,
  } = useAppContext();

  useEffect(() => {
    if (pendingNewTaskPartner) {
      setActiveTab('pipeline');
    }
  }, [pendingNewTaskPartner]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ tab?: TabId }>).detail;
      if (detail?.tab) setActiveTab(detail.tab);
    };
    window.addEventListener('efi:navigate', handler);
    return () => window.removeEventListener('efi:navigate', handler);
  }, []);

  const accentSecondary = getAccentSecondary(accentColor);

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
    <div className="min-h-screen font-sans text-[var(--text-primary)] transition-colors duration-300">

      <div className="relative min-h-[100dvh] w-full lg:h-[100dvh] lg:p-4">
        <div className="min-h-[100dvh] w-full lg:h-[calc(100dvh-2rem)] lg:min-h-0 lg:overflow-hidden lg:rounded-[2rem] lg:border lg:bg-[var(--surface-shell)] lg:shadow-[var(--shadow-medium)] [border-color:var(--line-soft)]">
          <div className="min-h-[100dvh] w-full lg:grid lg:h-full lg:min-h-0 lg:grid-cols-[clamp(250px,18vw,300px)_minmax(0,1fr)]">
            {isDesktop ? (
              <div className="hidden lg:block lg:h-full" style={{ borderRight: '2px solid var(--accent-secondary, transparent)' }}>
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
              </div>
            ) : null}

            <main
              ref={mainRegionRef}
              tabIndex={-1}
              onKeyDownCapture={handleMainKeyDownCapture}
              className={cx(
                'relative min-w-0 outline-none transition-colors duration-300',
                isDesktop
                  ? cx(
                      'hide-scrollbar flex min-h-[100dvh] flex-col border-l bg-transparent lg:h-full lg:min-h-0 [border-color:var(--line-soft)]',
                      activeTab === 'profile' ? 'lg:overflow-hidden' : 'lg:overflow-y-auto',
                    )
                  : 'flex min-h-[100dvh] flex-col bg-[var(--surface-card)]',
              )}
            >
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
                    'min-w-0 flex flex-wrap items-center gap-4',
                    isDesktop ? 'px-8 py-5' : 'px-4 pb-3 pt-4',
                    isDesktop && activeTab === 'profile' && 'hidden',
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
                  <div className="ml-auto flex items-center shrink-0">
                    <NotificationBell onNavigate={setActiveTab} />
                    <MoreOptionsMenu onSelect={setActiveLegalPage} />
                  </div>
                </div>

                <div
                  className={cx('flex-1 min-h-0', activeTab !== 'profile' && 'hide-scrollbar')}
                  style={
                    activeTab === 'profile'
                      ? { overflow: 'hidden' }
                      : isDesktop
                      ? { paddingBottom: '4rem' }
                      : { paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8.5rem)' }
                  }
                >
                  <div className={cx(
                    'min-w-0',
                    activeTab === 'profile' ? 'h-full' : isDesktop ? 'w-full' : 'px-0',
                  )}>
                    <Suspense fallback={<LazyFallback />}>
                      {activeTab === 'pipeline'
                        ? (
                          <ErrorBoundary key="pipeline">
                            <Pipeline
                              pendingPartnerName={pendingNewTaskPartner}
                              onPendingPartnerConsumed={() => setPendingNewTaskPartner(null)}
                            />
                          </ErrorBoundary>
                        )
                        : renderActiveView(activeTab)}
                    </Suspense>
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

              {activeLegalPage && (
                <LegalModal page={activeLegalPage} onClose={() => setActiveLegalPage(null)} />
              )}

              <Suspense fallback={null}>
                <AIAssistant isDesktop={isDesktop} />
              </Suspense>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};

const AppSplash = () => (
  <div className="flex min-h-dvh items-center justify-center bg-(--surface-app)">
    <div className="text-center">
      <p className="text-[11px] font-bold tracking-[0.18em] text-(--text-secondary) uppercase">
        Efi
      </p>
      <p className="mt-2 text-sm text-(--text-secondary)">Cargando…</p>
    </div>
  </div>
);

const DEFAULT_ACCENT = 'gradient:instagram';

const ONBOARDING_STORAGE_KEY = 'hasSeenOnboardingTour';

const AppShell = ({ isNewRegistration }: { isNewRegistration: boolean }) => {
  const { isBootstrapping, bootstrapError, profile, accentColor, setAccentColor } = useAppContext();
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [colorPicked, setColorPicked] = useState(false);
  const [forceOnboarding, setForceOnboarding] = useState(false);

  if (isBootstrapping && !bootstrapError) {
    return <AppSplash />;
  }

  const needsOnboarding = isNewRegistration && !isBootstrapping && !bootstrapError && !onboardingDone;
  const needsColorPicker = isNewRegistration && !isBootstrapping && !bootstrapError && onboardingDone && !colorPicked && accentColor === DEFAULT_ACCENT;

  const handleColorSelected = async (color: string) => {
    try {
      await setAccentColor(color);
    } catch {
      // Let the user proceed even if the API call fails
    }
    // Always show the tour for new users — clear any stale localStorage key
    // from previous accounts on the same browser.
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    setForceOnboarding(true);
    setColorPicked(true);
  };

  if (needsOnboarding) {
    return (
      <Suspense fallback={<AppSplash />}>
        <WelcomeOnboarding onComplete={() => setOnboardingDone(true)} />
      </Suspense>
    );
  }

  if (needsColorPicker) {
    return (
      <Suspense fallback={<AppSplash />}>
        <WelcomeColorPicker
          userName={profile.name}
          onSelect={handleColorSelected}
        />
      </Suspense>
    );
  }

  return (
    <>
      {!isBootstrapping && !bootstrapError ? (
        <Suspense fallback={null}>
          <OnboardingTour forceRun={forceOnboarding} />
        </Suspense>
      ) : null}
      <MainLayout />
      <Toaster />
      <Confetti />
    </>
  );
};

type AuthPhase = 'checking' | 'unauthenticated' | 'authenticated';

// Capture ?ref= into sessionStorage at module load time, before any route /
// auth logic runs. Also scrubs the ref param from the URL.
captureReferralFromUrl();

function AppInner() {
  const [authPhase, setAuthPhase] = useState<AuthPhase>('checking');
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [isNewRegistration, setIsNewRegistration] = useState(false);

  // Handle password reset token in URL before any auth check
  const resetToken = new URLSearchParams(window.location.search).get('token');
  if (resetToken && window.location.pathname === '/reset-password') {
    const clearToken = () => {
      window.history.replaceState({}, '', '/');
    };
    return (
      <Suspense fallback={<AppSplash />}>
        <ResetPassword token={resetToken} onDone={clearToken} />
      </Suspense>
    );
  }

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
      } catch (err: unknown) {
        // TypeError = network failure (server unreachable, DNS, CORS).
        // ApiError = server responded with an error (e.g. 401 = no session).
        // In both cases we fall through to unauthenticated, but for network
        // failures we surface a message on the landing so the user knows why.
        if (err instanceof TypeError) {
          // Store the flag so Landing can display a "server unreachable" notice.
          sessionStorage.setItem('efi:auth_network_error', '1');
        }
      }

      // 2. Check if Supabase OAuth just completed (redirect with tokens)
      if (supabase) {
        try {
          const { data } = await supabase.auth.getSession();
          if (data.session?.access_token) {
            // Exchange Supabase token for express-session
            const response = await authApi.googleSupabase(
              data.session.access_token,
              readReferralCode(),
            );
            // Sign out of Supabase — we only needed it for identity
            await supabase.auth.signOut();
            if (response.user) {
              setIsNewRegistration(response.isNew === true);
              if (response.isNew) clearReferralCode();
              setSessionUser(response.user);
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

  useEffect(() => {
    if (sessionUser?.id) {
      identifyUser({
        id: sessionUser.id,
        email: sessionUser.email,
        name: sessionUser.name,
        provider: sessionUser.provider,
        plan: sessionUser.plan,
      });
    } else {
      resetPostHog();
    }
  }, [sessionUser?.id, sessionUser?.email, sessionUser?.plan]);

  const handleLogin = (user: SessionUser, isNew = false) => {
    setIsNewRegistration(isNew);
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
    window.addEventListener('efi:unauthorized', handler);
    return () => window.removeEventListener('efi:unauthorized', handler);
  }, [authPhase]);

  if (authPhase === 'checking') {
    return <AppSplash />;
  }

  if (authPhase === 'unauthenticated') {
    return <Landing onLogin={handleLogin} />;
  }

  return (
    <ErrorBoundary>
      <AppProvider
        onLogout={handleLogout}
        email={sessionUser?.email ?? ''}
        provider={sessionUser?.provider ?? 'email'}
        onProviderChange={(p: 'email' | 'google') => setSessionUser((u: SessionUser | null) => u ? { ...u, provider: p } : u)}
        planState={{
          plan: sessionUser?.plan ?? 'pro',
          trialEndsAt: sessionUser?.trialEndsAt ?? null,
          subscribedUntil: sessionUser?.subscribedUntil ?? null,
          earlyAccess: sessionUser?.earlyAccess ?? true,
        }}
      >
        <AppShell isNewRegistration={isNewRegistration} />
      </AppProvider>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
