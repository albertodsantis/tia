import React, { useEffect, useMemo, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useAppContext } from '../context/AppContext';
import { getAccessibleAccentForeground } from '../lib/accent';

const ONBOARDING_STORAGE_KEY = 'hasSeenOnboardingTour';

export default function OnboardingTour() {
  const { theme, accentColor } = useAppContext();
  const [run, setRun] = useState(false);
  const [tooltipWidth, setTooltipWidth] = useState(() =>
    typeof window === 'undefined' ? 360 : Math.min(window.innerWidth - 64, 384),
  );
  const accentForeground = getAccessibleAccentForeground(accentColor || '#8b5cf6');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    const hasSeenTour = localStorage.getItem(ONBOARDING_STORAGE_KEY);

    if (!isDesktop || hasSeenTour) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setRun(true);
    }, 700);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const syncTooltipWidth = () => {
      setTooltipWidth(Math.min(window.innerWidth - 64, 384));
    };

    syncTooltipWidth();
    window.addEventListener('resize', syncTooltipWidth);

    return () => window.removeEventListener('resize', syncTooltipWidth);
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
    const baseSteps: Step[] = [
      {
        target: 'body',
        content: 'Bienvenida a Tía. Este tour te enseña el flujo base del workspace para que ubiques navegación, pipeline y relaciones.',
        placement: 'center',
        disableBeacon: true,
      },
      {
        target: '#nav-dashboard',
        content: 'Aquí aterrizas con el resumen operativo: valor abierto, entregables cercanos y señales del pipeline.',
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
        target: '#nav-settings',
        content: 'Desde ajustes controlas tema, integraciones y plantillas reutilizables.',
      },
    ];

    if (typeof document !== 'undefined' && document.querySelector('#tia-assistant-btn')) {
      baseSteps.push({
        target: '#tia-assistant-btn',
        content: 'Cuando la IA está disponible, puedes abrirla desde aquí para crear tareas o actualizar estados con lenguaje natural.',
        placement: 'left',
      });
    }

    return baseSteps;
  }, [run]);

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
      steps={steps}
      locale={{
        back: 'Atrás',
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
          primaryColor: accentColor || '#8b5cf6',
          backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
          textColor: theme === 'dark' ? '#f8fafc' : '#1e293b',
          arrowColor: theme === 'dark' ? '#1e293b' : '#ffffff',
        },
        tooltip: {
          width: tooltipWidth,
          maxWidth: 'calc(100vw - 4rem)',
          borderRadius: '1.25rem',
          boxSizing: 'border-box',
        },
        tooltipContainer: {
          textAlign: 'left',
          padding: '1rem',
        },
        tooltipContent: {
          overflowWrap: 'anywhere',
        },
        tooltipFooter: {
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.75rem',
          justifyContent: 'space-between',
        },
        buttonNext: {
          backgroundColor: accentColor || '#8b5cf6',
          color: accentForeground,
          borderRadius: '9999px',
          padding: '8px 16px',
          fontWeight: 'bold',
          marginLeft: 'auto',
          maxWidth: '100%',
        },
        buttonBack: {
          color: theme === 'dark' ? '#94a3b8' : '#64748b',
          marginRight: 0,
        },
        buttonSkip: {
          color: theme === 'dark' ? '#94a3b8' : '#64748b',
          padding: 0,
        },
      }}
    />
  );
}
