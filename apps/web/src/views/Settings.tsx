import React, { useEffect, useState } from 'react';
import {
  Bell,
  Calendar as CalendarIcon,
  ChevronDown,
  RotateCcw,
  MessageSquare,
  Moon,
  Plus,
  Shield,
  Sun,
  Trash2,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import OverlayModal from '../components/OverlayModal';
import {
  Button,
  EmptyState,
  ModalPanel,
  ScreenHeader,
  SettingRow,
  StatusBadge,
  SurfaceCard,
  ToggleSwitch,
  cx,
} from '../components/ui';

const ACCENT_OPTIONS = [
  { name: 'Violeta', value: '#8B5CF6' },
  { name: 'Índigo', value: '#6366F1' },
  { name: 'Azul', value: '#2563EB' },
  { name: 'Cielo', value: '#0EA5E9' },
  { name: 'Turquesa', value: '#06B6D4' },
  { name: 'Menta', value: '#14B8A6' },
  { name: 'Esmeralda', value: '#10B981' },
  { name: 'Verde', value: '#22C55E' },
  { name: 'Lima', value: '#84CC16' },
  { name: 'Limón', value: '#A3E635' },
  { name: 'Amarillo', value: '#EAB308' },
  { name: 'Ámbar', value: '#F59E0B' },
  { name: 'Naranja', value: '#FC4C00' },
  { name: 'Coral', value: '#FB7185' },
  { name: 'Rojo', value: '#EF4444' },
  { name: 'Cereza', value: '#E11D48' },
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Fucsia', value: '#D946EF' },
  { name: 'Pizarra', value: '#475569' },
  { name: 'Grafito', value: '#334155' },
] as const;

const fieldClass =
  'w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-900 transition-all focus:bg-white focus:outline-none focus:ring-2 dark:border-slate-700 dark:bg-slate-900/50 dark:text-white dark:focus:bg-slate-800';

export default function Settings() {
  const {
    accentColor,
    setAccentColor,
    profile,
    updateProfile,
    templates,
    addTemplate,
    deleteTemplate,
    theme,
    setTheme,
    reportActionError,
  } = useAppContext();
  const [gcalConnected, setGcalConnected] = useState(false);
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [isAccentPaletteOpen, setIsAccentPaletteOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', subject: '', body: '' });

  const activeAccent =
    ACCENT_OPTIONS.find((option) => option.value.toLowerCase() === accentColor.toLowerCase()) ?? {
      name: 'Actual',
      value: accentColor,
    };

  useEffect(() => {
    fetch('/api/auth/status')
      .then((res) => res.json())
      .then((data) => setGcalConnected(data.connected))
      .catch((err) => console.error('Failed to fetch gcal status', err));
  }, []);

  const toggleNotifications = async () => {
    if (!profile.notificationsEnabled) {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          await updateProfile({ notificationsEnabled: true });
        } else {
          reportActionError('Debes permitir las notificaciones del navegador para activarlas.');
        }
      } else {
        reportActionError('Tu navegador no soporta notificaciones push.');
      }
      return;
    }

    await updateProfile({ notificationsEnabled: false });
  };

  const connectGoogleCalendar = async () => {
    if (gcalConnected) {
      await fetch('/api/auth/logout', { method: 'POST' });
      setGcalConnected(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/google/url');
      const { url } = await response.json();
      window.open(url, 'oauth_popup', 'width=600,height=700');

      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
          setGcalConnected(true);
          window.removeEventListener('message', handleMessage);
        }
      };

      window.addEventListener('message', handleMessage);
    } catch (error) {
      console.error('OAuth error:', error);
      reportActionError('No pudimos abrir el flujo de Google Calendar.');
    }
  };

  const handleAddTemplate = async (event: React.FormEvent) => {
    event.preventDefault();
    await addTemplate(newTemplate);
    setIsAddingTemplate(false);
    setNewTemplate({ name: '', subject: '', body: '' });
  };

  const handleResetTour = () => {
    localStorage.removeItem('hasSeenOnboardingTour');
    window.location.reload();
  };

  return (
    <div className="space-y-5 p-4 pb-6 lg:space-y-6 lg:px-8 lg:pt-4 lg:pb-8">
      <ScreenHeader
        mobileOnly
        eyebrow="Ajustes"
        title="Configuración del workspace"
        description="Controla el tema, las integraciones y las plantillas que sostienen tu operación diaria."
        className="px-2"
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <SurfaceCard className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold tracking-[0.18em] text-slate-400 dark:text-slate-500 uppercase">
                Apariencia
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                Tema visual
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Ajusta el color de acento y el modo visual para mantener una experiencia coherente en todas las pantallas.
              </p>
            </div>

            <StatusBadge tone="accent">{activeAccent.name}</StatusBadge>
          </div>

          <div className="mt-5 rounded-[1.1rem] border border-slate-200/80 bg-slate-50/90 p-4 dark:border-slate-700/60 dark:bg-slate-900/45">
            <button
              type="button"
              onClick={() => setIsAccentPaletteOpen((current) => !current)}
              className="flex w-full items-center justify-between gap-4 text-left"
              aria-expanded={isAccentPaletteOpen}
            >
              <div className="flex items-center gap-3">
                <span
                  className="block h-11 w-11 rounded-[0.9rem] border-4 border-white shadow-sm dark:border-slate-700"
                  style={{ backgroundColor: activeAccent.value }}
                />
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {activeAccent.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{activeAccent.value}</p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-[11px] font-bold tracking-[0.16em] text-slate-400 dark:text-slate-500 uppercase">
                  {isAccentPaletteOpen ? 'Ocultar' : 'Cambiar'}
                </p>
                <ChevronDown
                  size={18}
                  className={cx(
                    'ml-auto mt-2 text-slate-400 transition-transform dark:text-slate-500',
                    isAccentPaletteOpen ? 'rotate-180' : '',
                  )}
                />
              </div>
            </button>

            {isAccentPaletteOpen ? (
              <div className="mt-4 grid grid-cols-4 gap-3 min-[390px]:grid-cols-5">
                {ACCENT_OPTIONS.map((option) => {
                  const isSelected = option.value.toLowerCase() === accentColor.toLowerCase();

                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-label={`Seleccionar ${option.name}`}
                      title={option.name}
                      onClick={() => {
                        void setAccentColor(option.value);
                        setIsAccentPaletteOpen(false);
                      }}
                      className="flex items-center justify-center py-1 transition-transform active:scale-95"
                    >
                      <span
                        className={cx(
                          'block h-11 w-11 rounded-[0.9rem] border-4 border-white shadow-sm transition-all dark:border-slate-700',
                          isSelected ? 'scale-110 ring-2 ring-slate-900/20 dark:ring-white/20' : 'hover:scale-105',
                        )}
                        style={{ backgroundColor: option.value }}
                      />
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="mt-4 rounded-[1.1rem] border border-slate-200/80 bg-white/92 p-2 dark:border-slate-700/60 dark:bg-slate-900/45">
            <SettingRow
              icon={theme === 'dark' ? Moon : Sun}
              title="Modo oscuro"
              description="Cambia la iluminación general del workspace."
              onClick={() => void setTheme(theme === 'dark' ? 'light' : 'dark')}
              trailing={<ToggleSwitch checked={theme === 'dark'} accentColor={accentColor} />}
            />
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-6">
          <div>
            <p className="text-[11px] font-bold tracking-[0.18em] text-slate-400 dark:text-slate-500 uppercase">
              Cuenta y sincronización
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
              Ajustes generales
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Activa notificaciones, controla integraciones y mantén la configuración del workspace bajo control.
            </p>
          </div>

          <div className="mt-5 space-y-2 rounded-[1.1rem] border border-slate-200/80 bg-white/92 p-2 dark:border-slate-700/60 dark:bg-slate-900/45">
            <SettingRow
              icon={Bell}
              title="Notificaciones push"
              description="Recibe avisos cuando haya entregas cercanas o cambios relevantes."
              onClick={() => void toggleNotifications()}
              trailing={<ToggleSwitch checked={profile.notificationsEnabled} accentColor={accentColor} />}
            />
            <SettingRow
              icon={CalendarIcon}
              title="Sincronización con Calendar"
              description={gcalConnected ? 'Google Calendar está conectado.' : 'Conecta tu calendario para sincronizar fechas.'}
              onClick={() => void connectGoogleCalendar()}
              trailing={<ToggleSwitch checked={gcalConnected} accentColor={accentColor} />}
            />
            <SettingRow
              icon={Shield}
              title="Privacidad y seguridad"
              description="Próximamente podrás controlar sesiones, permisos y preferencias sensibles."
              trailing={<StatusBadge tone="neutral">Próximamente</StatusBadge>}
            />
          </div>
        </SurfaceCard>
      </div>

      <SurfaceCard className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-bold tracking-[0.18em] text-slate-400 dark:text-slate-500 uppercase">
              Plantillas
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
              Mensajes reutilizables
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Guarda bases de outreach y personalízalas luego desde el directorio.
            </p>
          </div>

          <Button accentColor={accentColor} onClick={() => setIsAddingTemplate(true)}>
            <Plus size={16} />
            Nueva plantilla
          </Button>
        </div>

        <div className="mt-5 space-y-3">
          {templates.length > 0 ? (
            templates.map((template) => (
              <div key={template.id}>
                <SurfaceCard tone="inset" className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      <MessageSquare size={18} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {template.name}
                      </h3>
                      <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                        {template.subject}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void deleteTemplate(template.id)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-500 transition-colors hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/20"
                    aria-label={`Eliminar plantilla ${template.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                </SurfaceCard>
              </div>
            ))
          ) : (
            <EmptyState
              icon={MessageSquare}
              title="Aún no hay plantillas"
              description="Crea una plantilla para acelerar respuestas, follow-ups y primeros contactos."
              action={
                <Button accentColor={accentColor} onClick={() => setIsAddingTemplate(true)}>
                  <Plus size={16} />
                  Crear plantilla
                </Button>
              }
            />
          )}
        </div>
      </SurfaceCard>

      <SurfaceCard tone="muted" className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-bold tracking-[0.18em] text-slate-400 dark:text-slate-500 uppercase">
              Utilidades
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
              Reiniciar onboarding
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Vuelve a mostrar el tour guiado la próxima vez que cargue la app.
            </p>
          </div>

          <Button tone="secondary" className="justify-center sm:min-w-[12rem]" onClick={handleResetTour}>
            <RotateCcw size={16} />
            Reiniciar tour
          </Button>
        </div>
      </SurfaceCard>

      {isAddingTemplate ? (
        <OverlayModal onClose={() => setIsAddingTemplate(false)}>
          <ModalPanel
            title="Nueva plantilla"
            description="Guarda un mensaje base para reutilizarlo después con variables dinámicas."
            onClose={() => setIsAddingTemplate(false)}
            footer={
              <Button type="submit" form="template-form" accentColor={accentColor} className="w-full">
                Guardar plantilla
              </Button>
            }
          >
            <form id="template-form" onSubmit={handleAddTemplate} className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold tracking-[0.14em] text-slate-500 dark:text-slate-400 uppercase">
                  Nombre de la plantilla
                </label>
                <input
                  required
                  value={newTemplate.name}
                  onChange={(event) => setNewTemplate({ ...newTemplate, name: event.target.value })}
                  className={fieldClass}
                  style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                  placeholder="Ej. Primer contacto"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold tracking-[0.14em] text-slate-500 dark:text-slate-400 uppercase">
                  Asunto
                </label>
                <input
                  required
                  value={newTemplate.subject}
                  onChange={(event) => setNewTemplate({ ...newTemplate, subject: event.target.value })}
                  className={fieldClass}
                  style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                  placeholder="Usa {{brandName}}, {{creatorName}}"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold tracking-[0.14em] text-slate-500 dark:text-slate-400 uppercase">
                  Cuerpo del mensaje
                </label>
                <textarea
                  required
                  value={newTemplate.body}
                  onChange={(event) => setNewTemplate({ ...newTemplate, body: event.target.value })}
                  className={cx(fieldClass, 'min-h-[150px]')}
                  style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                  placeholder="Hola {{contactName}}..."
                />
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Variables disponibles: {'{{brandName}}, {{contactName}}, {{creatorName}}, {{deliverable}}'}
                </p>
              </div>
            </form>
          </ModalPanel>
        </OverlayModal>
      ) : null}
    </div>
  );
}
