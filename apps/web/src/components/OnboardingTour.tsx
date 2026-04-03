import React, { useEffect, useMemo, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useAppContext } from '../context/AppContext';
import { getAccessibleAccentForeground } from '../lib/accent';

const ONBOARDING_STORAGE_KEY = 'hasSeenOnboardingTour';

export default function OnboardingTour({ forceRun }: { forceRun?: boolean }) {
  const { theme, accentColor, accentHex, accentGradient } = useAppContext();
  const [run, setRun] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia('(min-width: 1024px)').matches,
  );
  const [tooltipWidth, setTooltipWidth] = useState(() =>
    typeof window === 'undefined'
      ? 360
      : Math.min(window.innerWidth - 24, window.innerWidth >= 1024 ? 384 : 320),
  );
  const accentForeground = getAccessibleAccentForeground(accentHex);
  const isDark = theme === 'dark';
  const tooltipBackground = isDark ? '#261f1b' : '#fffaf4';
  const tooltipSurface = isDark ? '#2f2722' : '#fffdf9';
  const tooltipText = isDark ? '#f7f2ec' : '#201a17';
  const tooltipSecondary = isDark ? '#b6aba2' : '#6b625c';
  const tooltipBorder = isDark ? 'rgba(247, 242, 236, 0.12)' : 'rgba(96, 78, 66, 0.1)';
  const tooltipShadow = isDark
    ? '0 28px 80px -38px rgba(0, 0, 0, 0.72)'
    : '0 28px 76px -40px rgba(59, 43, 34, 0.34)';

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const hasSeenTour = localStorage.getItem(ONBOARDING_STORAGE_KEY);

    if (hasSeenTour && !forceRun) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setRun(true);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [forceRun]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const syncTooltipWidth = () => {
      setIsDesktop(mediaQuery.matches);
      setTooltipWidth(Math.min(window.innerWidth - 24, mediaQuery.matches ? 384 : 320));
    };

    syncTooltipWidth();
    window.addEventListener('resize', syncTooltipWidth);
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncTooltipWidth);
    } else {
      mediaQuery.addListener(syncTooltipWidth);
    }

    return () => {
      window.removeEventListener('resize', syncTooltipWidth);
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', syncTooltipWidth);
      } else {
        mediaQuery.removeListener(syncTooltipWidth);
      }
    };
  }, []);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    }
  };

  const steps = useMemo<Step[]>(() => {
    const baseSteps: Step[] = isDesktop
      ? [
          {
            target: 'body',
            content:
              'Bienvenid@ a Efi. Este tour te muestra el flujo base del workspace para ubicar navegacion, pipeline y relaciones.',
            placement: 'center',
            disableBeacon: true,
          },
          {
            target: '#nav-dashboard',
            content:
              'Aqui aterrizas con el resumen operativo: valor abierto, entregables cercanos y senales del pipeline.',
          },
          {
            target: '#nav-pipeline',
            content: 'El pipeline concentra tareas, fases y calendario en una misma superficie.',
          },
          {
            target: '#nav-directory',
            content: 'El directorio te da contexto de marca, contactos y outreach sin salir del workspace.',
          },
          {
            target: '#nav-strategic',
            content: 'Estrategia visualiza cómo tus tareas y marcas contribuyen a tus objetivos de negocio.',
          },
          {
            target: '#nav-profile',
            content: 'Perfil define tu identidad, objetivos y material de presentación ante marcas.',
          },
          {
            target: '#nav-settings',
            content: 'Desde ajustes controlas tema, integraciones y plantillas reutilizables.',
          },
        ]
      : [
          {
            target: 'body',
            content:
              'Bienvenid@ a Efi. En movil vas a moverte sobre todo con la barra inferior y siempre volveras rapido a cada modulo.',
            placement: 'center',
            disableBeacon: true,
          },
          {
            target: '#nav-dashboard',
            content: 'Inicio te devuelve al resumen del dia y al estado general del workspace.',
            placement: 'top',
          },
          {
            target: '#nav-pipeline',
            content: 'Pipeline es tu mesa operativa para tareas, fases y calendario.',
            placement: 'top',
          },
          {
            target: '#nav-directory',
            content: 'Directorio concentra marcas, contactos y outreach sin salir de la app.',
            placement: 'top',
          },
          {
            target: '#nav-strategic',
            content: 'Estrategia conecta tus tareas y marcas con los objetivos de negocio.',
            placement: 'top',
          },
          {
            target: '#nav-profile',
            content: 'Perfil es tu identidad y material de presentación ante marcas.',
            placement: 'top',
          },
          {
            target: '#nav-settings',
            content: 'Ajustes agrupa tema, integraciones, plantillas y utilidades del sistema.',
            placement: 'top',
          },
        ];

    if (typeof document !== 'undefined' && document.querySelector('#efi-assistant-btn')) {
      baseSteps.push({
        target: '#efi-assistant-btn',
        content:
          'Cuando la IA esta disponible, puedes abrirla desde aqui para crear tareas o actualizar estados con lenguaje natural.',
        placement: isDesktop ? 'left' : 'top',
      });
    }

    return baseSteps;
  }, [isDesktop]);

  if (!run) {
    return null;
  }

  return (
    <Joyride
      callback={handleJoyrideCallback}
      continuous
      hideCloseButton
      run={run}
      scrollToFirstStep
      showSkipButton
      scrollOffset={isDesktop ? 88 : 24}
      spotlightPadding={isDesktop ? 8 : 12}
      steps={steps}
      locale={{
        back: 'Atras',
        close: 'Cerrar',
        last: 'Finalizar',
        next: 'Siguiente',
        nextLabelWithProgress: 'Siguiente',
        skip: 'Saltar',
      }}
      styles={{
        options: {
          zIndex: 10000,
          width: tooltipWidth,
          primaryColor: accentHex,
          backgroundColor: tooltipBackground,
          textColor: tooltipText,
          arrowColor: tooltipBackground,
        },
        tooltip: {
          width: tooltipWidth,
          maxWidth: 'calc(100vw - 4rem)',
          borderRadius: '1.5rem',
          boxSizing: 'border-box',
          boxShadow: tooltipShadow,
          backgroundColor: tooltipBackground,
          border: `1px solid ${tooltipBorder}`,
          overflow: 'hidden',
        },
        tooltipContainer: {
          textAlign: 'left',
          padding: '1rem 1rem 0.9rem',
          background: `linear-gradient(180deg, ${tooltipSurface}, ${tooltipBackground})`,
          color: tooltipText,
        },
        tooltipContent: {
          overflowWrap: 'anywhere',
          lineHeight: 1.65,
          fontSize: '13px',
          color: tooltipSecondary,
          paddingTop: '0.2rem',
        },
        tooltipFooter: {
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.65rem',
          justifyContent: 'space-between',
          marginTop: '0.75rem',
          paddingTop: '0.9rem',
          borderTop: `1px solid ${tooltipBorder}`,
        },
        buttonNext: {
          background: accentGradient,
          color: accentForeground,
          borderRadius: '9999px',
          padding: '9px 18px',
          fontWeight: 'bold',
          marginLeft: 'auto',
          maxWidth: '100%',
          boxShadow: '0 16px 28px -20px rgba(0, 0, 0, 0.28)',
        },
        buttonBack: {
          color: tooltipSecondary,
          marginRight: 0,
        },
        buttonSkip: {
          color: tooltipSecondary,
          padding: 0,
        },
        spotlight: {
          borderRadius: '1.4rem',
        },
        beaconInner: {
          background: accentGradient,
        },
        beaconOuter: {
          borderColor: accentHex,
        },
      }}
    />
  );
}
