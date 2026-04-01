import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  TextAlignLeft,
  Bell,
  CalendarBlank,
  CaretDown,
  SignOut,
  Chat,
  Moon,
  PencilLine,
  Plus,
  ArrowCounterClockwise,
  ShieldCheck,
  Sun,
  Trash,
  TextT,
  UserMinus,
} from '@phosphor-icons/react';
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
import { authApi } from '../lib/api';
import { toast } from '../lib/toast';
import { getGradientCss, isGradientAccent } from '../lib/accent';

const ACCENT_OPTIONS = [
  { name: 'Tia', value: 'gradient:instagram' },
  { name: 'Arcilla', value: '#C96F5B' },
  { name: 'Terracota', value: '#C65D4B' },
  { name: 'Cobre', value: '#B86A45' },
  { name: 'Eucalipto', value: '#5D8D7B' },
  { name: 'Violeta', value: '#8B5CF6' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Cielo', value: '#0EA5E9' },
  { name: 'Turquesa', value: '#06B6D4' },
  { name: 'Fucsia', value: '#D946EF' },
] as const;

const TEMPLATE_VARIABLES = [
  { key: 'brandName', label: 'Marca' },
  { key: 'contactName', label: 'Contacto' },
  { key: 'creatorName', label: 'Creador' },
  { key: 'deliverable', label: 'Entregable' },
  { key: 'mediaKitLink', label: 'Media Kit' },
] as const;

const fieldClass =
  'w-full rounded-[1rem] border border-[color:var(--line-soft)] bg-[var(--surface-card-strong)] px-4 py-3.5 text-base sm:text-sm font-medium text-[var(--text-primary)] transition-all placeholder:text-[var(--text-secondary)]/70 focus:bg-white/96 focus:outline-none focus:ring-2 dark:focus:bg-[var(--surface-card)]';

export default function Settings() {
  const {
    accentColor,
    accentHex,
    accentGradient,
    setAccentColor,
    profile,
    updateProfile,
    templates,
    addTemplate,
    deleteTemplate,
    theme,
    setTheme,
    reportActionError,
    onLogout,
  } = useAppContext();
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [isAccentPaletteOpen, setIsAccentPaletteOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', body: '' });
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const insertVariable = useCallback(
    (varKey: string) => {
      const token = `{{${varKey}}}`;
      const el = bodyRef.current;
      if (!el) return;

      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? start;
      const before = el.value.slice(0, start);
      const after = el.value.slice(end);
      const updated = before + token + after;

      setNewTemplate((prev) => ({ ...prev, body: updated }));

      requestAnimationFrame(() => {
        el.focus();
        const cursor = start + token.length;
        el.setSelectionRange(cursor, cursor);
      });
    },
    [],
  );

  const activeAccent =
    ACCENT_OPTIONS.find((option) => option.value.toLowerCase() === accentColor.toLowerCase()) ?? {
      name: 'Actual',
      value: accentColor,
    };

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

  const handleAddTemplate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (savingTemplate) return;
    setSavingTemplate(true);
    try {
      if (editingTemplateId) {
        await deleteTemplate(editingTemplateId);
        await addTemplate(newTemplate);
        setIsAddingTemplate(false);
        setNewTemplate({ name: '', body: '' });
        setEditingTemplateId(null);
        toast.success('Plantilla actualizada correctamente');
      } else {
        await addTemplate(newTemplate);
        setIsAddingTemplate(false);
        setNewTemplate({ name: '', body: '' });
        toast.success('Plantilla guardada correctamente');
      }
    } finally { setSavingTemplate(false); }
  };

  const handleResetTour = () => {
    localStorage.removeItem('hasSeenOnboardingTour');
    window.location.reload();
  };

  const handleDeleteAccount = async () => {
    try {
      await authApi.deleteAccount();
      onLogout();
    } catch {
      reportActionError('No pudimos eliminar la cuenta. Intenta de nuevo.');
    }
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
                  style={{ background: isGradientAccent(activeAccent.value) ? (getGradientCss(activeAccent.value) || activeAccent.value) : activeAccent.value }}
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
                <CaretDown
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
                        style={{ background: isGradientAccent(option.value) ? (getGradientCss(option.value) || option.value) : option.value }}
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
                trailing={<ToggleSwitch checked={theme === 'dark'} accentColor={accentGradient} />}
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
                trailing={<ToggleSwitch checked={profile.notificationsEnabled} accentColor={accentGradient} />}
                className="px-0 py-3"
              />
              <SettingRow
                icon={CalendarBlank}
                title="Sincronizacion con Calendar"
                description="Proximamente. La integracion con Google Calendar estara disponible en una version futura."
                trailing={<ToggleSwitch checked={false} accentColor={accentGradient} disabled />}
                className="cursor-not-allowed px-0 py-3 opacity-60"
              />
              <SettingRow
                icon={ShieldCheck}
                title="Privacidad y seguridad"
                description="Controla sesiones, permisos y preferencias sensibles."
                trailing={<ToggleSwitch checked={false} accentColor={accentGradient} disabled />}
                className="cursor-not-allowed px-0 py-3"
              />
            </div>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden p-0">
        <div className="grid xl:grid-cols-[minmax(260px,0.72fr)_minmax(0,1.28fr)]">
          <div className="p-6 lg:p-7">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
            <div className="flex shrink-0 items-baseline gap-3">
              <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
                Mensajes reutilizables
              </h2>
              <span className="hidden text-[11px] font-bold tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500 sm:inline-block">
                Plantillas
              </span>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <Button
              accentColor={accentGradient}
              onClick={() => {
                setEditingTemplateId(null);
                setNewTemplate({ name: '', body: '' });
                setIsAddingTemplate(true);
              }}
              className="w-full justify-center"
            >
              <Plus size={16} weight="regular" />
              Nueva plantilla
            </Button>

            <div className="rounded-[1rem] border border-slate-200/70 bg-[var(--surface-card-strong)] p-4 dark:border-slate-700/60">
              <p className="text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase dark:text-slate-500">
                Variables disponibles
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {TEMPLATE_VARIABLES.map((v) => (
                  <span
                    key={v.key}
                    className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  >
                    {v.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
          </div>

          <div className="border-t border-slate-200/70 xl:border-t-0 xl:border-l dark:border-slate-700/60">
          {templates.length > 0 ? (
            <div className="divide-y divide-slate-200/70 dark:divide-slate-700/60">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-start justify-between gap-4 px-5 py-5 transition-colors hover:bg-[var(--surface-muted)]/55 sm:px-6"
                >
                  <div className="flex min-w-0 items-start gap-4">
                    <div
                      className="mt-0.5 flex shrink-0 items-center justify-center"
                      style={{ color: accentHex }}
                    >
                      <Chat size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          {template.name}
                        </h3>
                        <StatusBadge tone="neutral">Base</StatusBadge>
                      </div>
                      <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                        {template.body}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingTemplateId(template.id);
                      setNewTemplate({ name: template.name, body: template.body });
                      setIsAddingTemplate(true);
                    }}
                    className="flex shrink-0 items-center justify-center text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
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
                icon={Chat}
                title="Aun no hay plantillas"
                description="Crea una plantilla para acelerar respuestas, follow-ups y primeros contactos."
                action={
                  <Button accentColor={accentGradient} onClick={() => {
                    setEditingTemplateId(null);
                    setNewTemplate({ name: '', body: '' });
                    setIsAddingTemplate(true);
                  }}>
                    <Plus size={16} weight="regular" />
                    Crear plantilla
                  </Button>
                }
              />
            </div>
          )}
          </div>
        </div>
      </SurfaceCard>

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
            <ArrowCounterClockwise size={16} />
            Reiniciar tour
          </Button>
        </div>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden p-0">
        <div className="p-6 lg:p-7">
          <div className="flex shrink-0 items-baseline gap-3">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Cuenta
            </h2>
            <span className="hidden text-[11px] font-bold tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500 sm:inline-block">
              Sesion
            </span>
          </div>

          <div className="mt-5 space-y-3">
            <SettingRow
              icon={(props: any) => <SignOut {...props} weight="regular" />}
              title="Cerrar sesion"
              description="Cierra tu sesion actual en este dispositivo."
              onClick={onLogout}
              trailing={
                <span className="text-[11px] font-bold tracking-[0.16em] text-slate-400 uppercase dark:text-slate-500">
                  Salir
                </span>
              }
              className="px-0 py-3"
            />

            <div className="border-t border-slate-200/70 pt-3 dark:border-slate-700/60">
              {showDeleteConfirm ? (
                <div className="rounded-[1rem] border border-rose-200 bg-rose-50 p-4 dark:border-rose-800/50 dark:bg-rose-950/30">
                  <p className="text-sm font-bold text-rose-700 dark:text-rose-400">
                    Estas seguro?
                  </p>
                  <p className="mt-1 text-sm text-rose-600/80 dark:text-rose-400/70">
                    Esta accion cerrara tu sesion y eliminara tus datos. No se puede deshacer.
                  </p>
                  <div className="mt-4 flex gap-3">
                    <Button
                      tone="danger"
                      onClick={() => void handleDeleteAccount()}
                      className="justify-center"
                    >
                      <Trash size={16} />
                      Si, eliminar cuenta
                    </Button>
                    <Button
                      tone="secondary"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="justify-center"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <SettingRow
                  icon={UserMinus}
                  title="Eliminar cuenta"
                  description="Elimina tu cuenta y todos los datos asociados de forma permanente."
                  onClick={() => setShowDeleteConfirm(true)}
                  trailing={
                    <span className="text-[11px] font-bold tracking-[0.16em] text-rose-400 uppercase dark:text-rose-500">
                      Eliminar
                    </span>
                  }
                  className="px-0 py-3"
                />
              )}
            </div>
          </div>
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
                    <Trash size={18} />
                  </Button>
                )}
                <Button type="submit" form="template-form" accentColor={accentGradient} className="flex-1 justify-center" disabled={savingTemplate}>
                  {editingTemplateId ? 'Guardar cambios' : 'Guardar plantilla'}
                </Button>
              </div>
            }
          >
          <form id="template-form" onSubmit={handleAddTemplate} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-[var(--text-secondary)]/70 uppercase">
                  <TextT size={14} />
                  Nombre de la plantilla
                </label>
                <input
                  required
                  value={newTemplate.name}
                  onChange={(event) => setNewTemplate({ ...newTemplate, name: event.target.value })}
                  className={fieldClass}
                  style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
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
                    <TextAlignLeft size={14} />
                    Cuerpo del mensaje
                  </label>
                  <textarea
                    ref={bodyRef}
                    required
                    value={newTemplate.body}
                    onChange={(event) => setNewTemplate({ ...newTemplate, body: event.target.value })}
                    className={cx(fieldClass, 'min-h-[150px] bg-[var(--surface-card)]')}
                    style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                    placeholder="Hola {{contactName}}, me encantaria..."
                  />
                </div>

                <div>
                  <p className="mb-2 text-[10px] font-bold tracking-[0.16em] text-[var(--text-secondary)]/70 uppercase">
                    Insertar variable
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {TEMPLATE_VARIABLES.map((v) => (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => insertVariable(v.key)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--line-soft)] bg-[var(--surface-card)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-all hover:border-[color:var(--accent)] hover:text-[var(--accent)] active:scale-95"
                      >
                        <span className="text-[10px] opacity-60">{'{{'}</span>
                        {v.label}
                        <span className="text-[10px] opacity-60">{'}}'}</span>
                      </button>
                    ))}
                  </div>
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
