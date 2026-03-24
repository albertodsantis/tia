import React, { useEffect, useState } from 'react';
import {
  AlignLeft,
  Bell,
  Calendar as CalendarIcon,
  ChevronDown,
  MessageSquare,
  Moon,
  PencilLine,
  Plus,
  RotateCcw,
  Shield,
  Sun,
  Trash2,
  Type,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import OverlayModal from '../components/OverlayModal';
import {
  Button,
  EmptyState,
  ModalPanel,
  SettingRow,
  StatusBadge,
  SurfaceCard,
  ToggleSwitch,
  cx,
} from '../components/ui';
import { toast } from '../lib/toast';

const ACCENT_OPTIONS = [
  { name: 'Arcilla', value: '#C96F5B' },
  { name: 'Terracota', value: '#C65D4B' },
  { name: 'Cobre', value: '#B86A45' },
  { name: 'Eucalipto', value: '#5D8D7B' },
  { name: 'Salvia', value: '#6F8A74' },
  { name: 'Violeta', value: '#8B5CF6' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Azul', value: '#2563EB' },
  { name: 'Cielo', value: '#0EA5E9' },
  { name: 'Turquesa', value: '#06B6D4' },
  { name: 'Menta', value: '#14B8A6' },
  { name: 'Esmeralda', value: '#10B981' },
  { name: 'Verde', value: '#22C55E' },
  { name: 'Lima', value: '#84CC16' },
  { name: 'Limon', value: '#A3E635' },
  { name: 'Amarillo', value: '#EAB308' },
  { name: 'Ambar', value: '#F59E0B' },
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
  'w-full rounded-[1rem] border border-[color:var(--line-soft)] bg-[var(--surface-card-strong)] px-4 py-3.5 text-sm font-medium text-[var(--text-primary)] transition-all placeholder:text-[var(--text-secondary)]/70 focus:bg-white/96 focus:outline-none focus:ring-2 dark:focus:bg-[var(--surface-card)]';

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
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [isAccentPaletteOpen, setIsAccentPaletteOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', subject: '', body: '' });

  const activeAccent =
    ACCENT_OPTIONS.find((option) => option.value.toLowerCase() === accentColor.toLowerCase()) ?? {
      name: 'Actual',
      value: accentColor,
    };
  const templatesLabel =
    templates.length === 1 ? '1 plantilla activa' : `${templates.length} plantillas activas`;

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
          toast.success('Notificaciones activadas');
        } else {
          reportActionError('Debes permitir las notificaciones del navegador para activarlas.');
        }
      } else {
        reportActionError('Tu navegador no soporta notificaciones push.');
      }
      return;
    }

    await updateProfile({ notificationsEnabled: false });
    toast.info('Notificaciones desactivadas');
  };

  const connectGoogleCalendar = async () => {
    if (gcalConnected) {
      await fetch('/api/auth/logout', { method: 'POST' });
      setGcalConnected(false);
      toast.info('Calendar desconectado');
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
          toast.success('Calendar conectado con éxito');
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
    if (editingTemplateId) {
      await deleteTemplate(editingTemplateId);
      await addTemplate(newTemplate);
      setIsAddingTemplate(false);
      setNewTemplate({ name: '', subject: '', body: '' });
      setEditingTemplateId(null);
      toast.success('Plantilla actualizada correctamente');
    } else {
      await addTemplate(newTemplate);
      setIsAddingTemplate(false);
      setNewTemplate({ name: '', subject: '', body: '' });
      toast.success('Plantilla guardada correctamente');
    }
  };

  const handleResetTour = () => {
    localStorage.removeItem('hasSeenOnboardingTour');
    window.location.reload();
  };

  return (
    <div className="space-y-5 p-4 pb-6 lg:space-y-6 lg:px-8 lg:pt-4 lg:pb-8">
      <SurfaceCard className="overflow-hidden p-0">
        <div className="grid xl:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]">
          <div className="p-6 lg:p-7">
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
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Paleta de acento
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Actual: {activeAccent.name}.
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-[11px] font-bold tracking-[0.16em] text-slate-400 uppercase dark:text-slate-500">
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

            <div className="mt-5 border-t border-slate-200/70 pt-3 dark:border-slate-700/60">
              <SettingRow
                icon={theme === 'dark' ? Moon : Sun}
                title="Modo oscuro"
                description="Cambia la iluminacion general del workspace."
                onClick={() => void setTheme(theme === 'dark' ? 'light' : 'dark')}
                trailing={<ToggleSwitch checked={theme === 'dark'} accentColor={accentColor} />}
                className="px-0 py-3"
              />
            </div>
          </div>

          <div className="border-t border-slate-200/70 p-6 xl:border-t-0 xl:border-l lg:p-7 dark:border-slate-700/60">
            <div className="space-y-1">
              <SettingRow
                icon={Bell}
                title="Notificaciones push"
                description="Recibe avisos cuando haya entregas cercanas o cambios relevantes."
                onClick={() => void toggleNotifications()}
                trailing={<ToggleSwitch checked={profile.notificationsEnabled} accentColor={accentColor} />}
                className="px-0 py-3"
              />
              <SettingRow
                icon={CalendarIcon}
                title="Sincronizacion con Calendar"
                description={
                  gcalConnected
                    ? 'Google Calendar esta conectado.'
                    : 'Conecta tu calendario para sincronizar fechas.'
                }
                onClick={() => void connectGoogleCalendar()}
                trailing={<ToggleSwitch checked={gcalConnected} accentColor={accentColor} />}
                className="px-0 py-3"
              />
              <SettingRow
                icon={Shield}
                title="Privacidad y seguridad"
                description="Controla sesiones, permisos y preferencias sensibles."
                trailing={<ToggleSwitch checked={false} accentColor={accentColor} disabled />}
                className="cursor-not-allowed px-0 py-3"
              />
            </div>
          </div>
        </div>
      </SurfaceCard>

      <div className="grid gap-4 xl:grid-cols-[minmax(260px,0.72fr)_minmax(0,1.28fr)]">
        <SurfaceCard tone="muted" className="p-6 lg:p-7">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
            <div className="flex shrink-0 items-baseline gap-3">
              <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
                Mensajes reutilizables
              </h2>
              <span className="hidden text-[11px] font-bold tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500 sm:inline-block">
                Plantillas
              </span>
            </div>
            <div className="hidden h-4 w-px bg-[var(--line-soft)] sm:block" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Guarda bases de outreach y personalizalas luego desde el directorio.
            </p>
          </div>

          <div className="mt-5 space-y-4">
            <div className="rounded-[1rem] border border-white/70 bg-white/88 p-4 shadow-[0_16px_34px_-28px_rgba(59,43,34,0.2)] dark:border-slate-700/60 dark:bg-slate-950/28">
              <p className="text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase dark:text-slate-500">
                Biblioteca
              </p>
              <p className="mt-2 text-base font-bold text-slate-800 dark:text-slate-100">
                {templatesLabel}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Usa plantillas cortas, faciles de adaptar y con variables claras para acelerar las
                conversaciones sin sonar rigida.
              </p>
            </div>

            <Button
              accentColor={accentColor}
              onClick={() => {
                setEditingTemplateId(null);
                setNewTemplate({ name: '', subject: '', body: '' });
                setIsAddingTemplate(true);
              }}
              className="w-full justify-center"
            >
              <Plus size={16} />
              Nueva plantilla
            </Button>

            <div className="rounded-[1rem] border border-slate-200/70 bg-[var(--surface-card-strong)] p-4 dark:border-slate-700/60">
              <p className="text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase dark:text-slate-500">
                Variables
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {'{{brandName}}, {{contactName}}, {{creatorName}}, {{deliverable}}, {{mediaKitLink}}'}
              </p>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="overflow-hidden p-0">
          {templates.length > 0 ? (
            <div className="divide-y divide-slate-200/70 dark:divide-slate-700/60">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-start justify-between gap-4 px-5 py-5 transition-colors hover:bg-[var(--surface-muted)]/55 sm:px-6"
                >
                  <div className="flex min-w-0 items-start gap-4">
                    <div
                      className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.95rem]"
                      style={{ backgroundColor: `${accentColor}12`, color: accentColor }}
                    >
                      <MessageSquare size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          {template.name}
                        </h3>
                        <StatusBadge tone="neutral">Base</StatusBadge>
                      </div>
                      <p className="mt-2 text-xs font-semibold tracking-[0.08em] text-slate-400 uppercase dark:text-slate-500">
                        {template.subject}
                      </p>
                      <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                        {template.body}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingTemplateId(template.id);
                      setNewTemplate({ name: template.name, subject: template.subject, body: template.body });
                      setIsAddingTemplate(true);
                    }}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-card-strong)] hover:text-[var(--text-primary)]"
                    aria-label={`Editar plantilla ${template.name}`}
                  >
                    <PencilLine size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 sm:p-8">
              <EmptyState
                icon={MessageSquare}
                title="Aun no hay plantillas"
                description="Crea una plantilla para acelerar respuestas, follow-ups y primeros contactos."
                action={
                  <Button accentColor={accentColor} onClick={() => {
                    setEditingTemplateId(null);
                    setNewTemplate({ name: '', subject: '', body: '' });
                    setIsAddingTemplate(true);
                  }}>
                    <Plus size={16} />
                    Crear plantilla
                  </Button>
                }
              />
            </div>
          )}
        </SurfaceCard>
      </div>

      <SurfaceCard tone="muted" className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
            <div className="flex shrink-0 items-baseline gap-3">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Reiniciar onboarding
              </h2>
              <span className="hidden text-[11px] font-bold tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500 sm:inline-block">
                Utilidades
              </span>
            </div>
            <div className="hidden h-4 w-px bg-[var(--line-soft)] sm:block" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Vuelve a mostrar el tour guiado la proxima vez que cargue la app.
            </p>
          </div>

          <Button
            tone="secondary"
            className="justify-center sm:min-w-[12rem]"
            onClick={handleResetTour}
          >
            <RotateCcw size={16} />
            Reiniciar tour
          </Button>
        </div>
      </SurfaceCard>

      {isAddingTemplate ? (
        <OverlayModal onClose={() => {
          setIsAddingTemplate(false);
          setEditingTemplateId(null);
        }}>
          <ModalPanel
            title={editingTemplateId ? 'Editar plantilla' : 'Nueva plantilla'}
            description={editingTemplateId ? 'Ajusta los detalles de tu mensaje reutilizable.' : 'Guarda un mensaje base para reutilizarlo despues con variables dinamicas.'}
            onClose={() => {
              setIsAddingTemplate(false);
              setEditingTemplateId(null);
            }}
            footer={
              <div className="flex w-full gap-3">
                {editingTemplateId && (
                  <Button
                    type="button"
                    tone="danger"
                    onClick={() => {
                      void deleteTemplate(editingTemplateId);
                      setIsAddingTemplate(false);
                      setEditingTemplateId(null);
                      toast.info('Plantilla eliminada');
                    }}
                    className="px-4"
                    aria-label="Eliminar plantilla"
                  >
                    <Trash2 size={18} />
                  </Button>
                )}
                <Button type="submit" form="template-form" accentColor={accentColor} className="flex-1 justify-center">
                  {editingTemplateId ? 'Guardar cambios' : 'Guardar plantilla'}
                </Button>
              </div>
            }
          >
          <form id="template-form" onSubmit={handleAddTemplate} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-[var(--text-secondary)]/70 uppercase">
                  <Type size={14} />
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
            </div>

            <div className="rounded-[1.2rem] border bg-[var(--surface-muted)]/50 p-4 sm:p-5 [border-color:var(--line-soft)]">
              <h4 className="mb-4 text-[11px] font-extrabold tracking-[0.16em] text-[var(--text-primary)] uppercase">
                Contenido del mensaje
              </h4>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-[var(--text-secondary)]/70 uppercase">
                    <Type size={14} />
                    Asunto
                  </label>
                  <input
                    required
                    value={newTemplate.subject}
                    onChange={(event) => setNewTemplate({ ...newTemplate, subject: event.target.value })}
                    className={cx(fieldClass, 'bg-[var(--surface-card)]')}
                    style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                    placeholder="Usa {{brandName}}, {{creatorName}}"
                  />
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-[var(--text-secondary)]/70 uppercase">
                    <AlignLeft size={14} />
                    Cuerpo del mensaje
                  </label>
                  <textarea
                    required
                    value={newTemplate.body}
                    onChange={(event) => setNewTemplate({ ...newTemplate, body: event.target.value })}
                    className={cx(fieldClass, 'min-h-[150px] bg-[var(--surface-card)]')}
                    style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                    placeholder="Hola {{contactName}}..."
                  />
                  <p className="mt-2 text-[11px] font-medium text-[var(--text-secondary)]">
                    Variables disponibles: {'{{brandName}}, {{contactName}}, {{creatorName}}, {{deliverable}}, {{mediaKitLink}}'}
                  </p>
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
