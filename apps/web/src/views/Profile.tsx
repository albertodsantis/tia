import React, { useState } from 'react';
import { Download, Edit2, Sparkles, Target, UserCircle2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import OverlayModal from '../components/OverlayModal';
import {
  Button,
  MetricCard,
  ModalPanel,
  ScreenHeader,
  SurfaceCard,
} from '../components/ui';
import { getAccessibleAccentForeground } from '../lib/accent';

const fieldClass =
  'w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-900 transition-all focus:bg-white focus:outline-none focus:ring-2 dark:border-slate-700 dark:bg-slate-900/50 dark:text-white dark:focus:bg-slate-800';

export default function Profile() {
  const { profile, accentColor, updateProfile, tasks, partners } = useAppContext();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: profile.name,
    handle: profile.handle,
    avatar: profile.avatar,
  });
  const openTasks = tasks.filter((task) => task.status !== 'Cobro');
  const activePartners = partners.filter((partner) => partner.status === 'Activo').length;
  const openPipelineValue = openTasks.reduce((sum, task) => sum + task.value, 0);
  const accentForeground = getAccessibleAccentForeground(accentColor);

  const openProfileEditor = () => {
    setProfileForm({
      name: profile.name,
      handle: profile.handle,
      avatar: profile.avatar,
    });
    setIsEditingProfile(true);
  };

  const handleGoalChange = (index: number, value: string) => {
    const newGoals = [...profile.goals] as [string, string, string];
    newGoals[index] = value;
    void updateProfile({ goals: newGoals });
  };

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSavingProfile(true);

    try {
      await updateProfile(profileForm);
      setIsEditingProfile(false);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleGenerateMediaKit = () => {
    const generatedAt = new Date().toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const mediaKitHtml = `
      <html>
        <head>
          <title>Resumen comercial - ${profile.name}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 13px; color: #1f2937; margin: 0; padding: 40px; background: #f8fafc; -webkit-font-smoothing: antialiased; }
            .container { max-width: 54rem; margin: 0 auto; background: white; padding: 40px; border-radius: 18px; box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08); }
            .header { display: flex; align-items: center; gap: 24px; margin-bottom: 32px; }
            .avatar { width: 120px; height: 120px; border-radius: 18px; object-fit: cover; }
            h1 { margin: 0; font-size: 38px; font-weight: 800; letter-spacing: -1px; }
            .handle { color: #475569; font-size: 20px; font-weight: 700; margin-top: 6px; }
            .meta { margin-top: 12px; display: inline-flex; align-items: center; gap: 10px; padding: 8px 14px; border-radius: 999px; background: ${accentColor}; color: ${accentForeground}; font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
            h2 { font-size: 24px; font-weight: 800; margin-top: 32px; margin-bottom: 18px; }
            .goals { list-style: none; padding: 0; }
            .goals li { background: #f8fafc; padding: 16px 18px; border-radius: 12px; margin-bottom: 12px; font-weight: 700; font-size: 16px; display: flex; align-items: center; gap: 12px; }
            .dot { width: 10px; height: 10px; border-radius: 999px; background: ${accentColor}; }
            .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 32px; }
            .stat-card { background: #f8fafc; padding: 24px; border-radius: 14px; }
            .stat-value { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 0 14px; border-radius: 999px; background: ${accentColor}; color: ${accentForeground}; font-size: 24px; font-weight: 800; }
            .stat-label { font-size: 14px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 8px; }
            .summary { margin-top: 24px; color: #475569; font-size: 15px; line-height: 1.7; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${profile.avatar}" alt="${profile.name}" class="avatar" />
              <div>
                <h1>${profile.name}</h1>
                <div class="handle">${profile.handle}</div>
                <div class="meta">Actualizado ${generatedAt}</div>
              </div>
            </div>
            <div class="summary">
              Snapshot actual del workspace para compartir foco comercial, ritmo del pipeline y prioridades de marca.
            </div>
            <div class="stats">
              <div class="stat-card">
                <div class="stat-value">$${openPipelineValue.toLocaleString('es-ES')}</div>
                <div class="stat-label">Pipeline abierto</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${activePartners}</div>
                <div class="stat-label">Partners activos</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${openTasks.length}</div>
                <div class="stat-label">Entregas abiertas</div>
              </div>
            </div>
            <h2>Objetivos del año</h2>
            <ul class="goals">
              ${profile.goals.map((goal) => `<li><span class="dot"></span>${goal}</li>`).join('')}
            </ul>
          </div>
          <script>
            window.onload = () => window.print();
          </script>
        </body>
      </html>
    `;

    const blob = new Blob([mediaKitHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-5 p-4 pb-6 lg:space-y-6 lg:px-8 lg:pt-4 lg:pb-8">
      <ScreenHeader
        mobileOnly
        eyebrow="Perfil"
        title="Identidad y materiales"
        description="Define cómo te presentas, qué objetivos persigues y qué materiales compartes con tus partners."
        className="px-2"
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <SurfaceCard className="p-6 lg:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <img
                src={profile.avatar}
                alt={profile.name}
                className="h-24 w-24 rounded-[1.2rem] border-4 border-white object-cover shadow-[0_20px_50px_-26px_rgba(15,23,42,0.35)] dark:border-slate-800"
              />
              <div className="min-w-0">
                <p className="text-[11px] font-bold tracking-[0.18em] text-slate-400 dark:text-slate-500 uppercase">
                  Perfil activo
                </p>
                <h1 className="mt-1 text-[2rem] font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                  {profile.name}
                </h1>
                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {profile.handle}
                </p>
              </div>
            </div>

            <div className="flex gap-2 sm:justify-end">
              <Button tone="secondary" onClick={openProfileEditor}>
                <Edit2 size={16} />
                Editar
              </Button>
              <Button accentColor={accentColor} onClick={handleGenerateMediaKit}>
                <Download size={16} />
                Media kit
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <MetricCard
              icon={Target}
              label="Objetivos"
              value={`${profile.goals.length}`}
              helper="Focos estratégicos activos."
              accentColor={accentColor}
            />
            <MetricCard
              icon={Sparkles}
              label="Estado"
              value="Live"
              helper="Tu perfil está listo para compartir."
              accentColor={accentColor}
            />
            <MetricCard
              icon={Download}
              label="Material"
              value="PDF"
              helper="Salida rápida para partners y marcas."
              accentColor={accentColor}
            />
          </div>

          <SurfaceCard tone="muted" className="mt-5 p-5">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${accentColor}14`, color: accentColor }}
              >
                <UserCircle2 size={20} />
              </div>
              <div>
                <p className="text-[11px] font-bold tracking-[0.18em] text-slate-400 dark:text-slate-500 uppercase">
                  Identidad
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                  Resumen de marca personal
                </h2>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1rem] border border-slate-200/80 bg-white/90 p-4 dark:border-slate-700/60 dark:bg-slate-900/45">
                <p className="text-[11px] font-bold tracking-[0.16em] text-slate-400 dark:text-slate-500 uppercase">
                  Nombre
                </p>
                <p className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                  {profile.name}
                </p>
              </div>
              <div className="rounded-[1rem] border border-slate-200/80 bg-white/90 p-4 dark:border-slate-700/60 dark:bg-slate-900/45">
                <p className="text-[11px] font-bold tracking-[0.16em] text-slate-400 dark:text-slate-500 uppercase">
                  Handle
                </p>
                <p className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                  {profile.handle}
                </p>
              </div>
            </div>
          </SurfaceCard>
        </SurfaceCard>

        <SurfaceCard className="p-6 lg:p-7">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${accentColor}14`, color: accentColor }}
            >
              <Target size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold tracking-[0.18em] text-slate-400 dark:text-slate-500 uppercase">
                Dirección
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                Objetivos del año
              </h2>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {profile.goals.map((goal, index) => (
              <div key={index} className="rounded-[1rem] border border-slate-200/80 bg-slate-50/90 p-4 dark:border-slate-700/60 dark:bg-slate-900/45">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-[0.85rem] text-sm font-black"
                    style={{ backgroundColor: accentColor, color: 'var(--accent-foreground)' }}
                  >
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold tracking-[0.16em] text-slate-400 dark:text-slate-500 uppercase">
                      Objetivo {index + 1}
                    </p>
                    <input
                      type="text"
                      value={goal}
                      onChange={(event) => handleGoalChange(index, event.target.value)}
                      className="mt-2 w-full border-none bg-transparent p-0 text-sm font-bold text-slate-900 focus:outline-none focus:ring-0 dark:text-slate-100"
                      placeholder="Escribe un objetivo..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <SurfaceCard tone="muted" className="mt-5 p-5">
            <p className="text-[11px] font-bold tracking-[0.18em] text-slate-400 dark:text-slate-500 uppercase">
              Uso recomendado
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Mantén estos objetivos cortos, concretos y accionables. Piensa en ellos como el guion
              que debería guiar tus negociaciones, tu media kit y tus decisiones de pipeline.
            </p>
          </SurfaceCard>
        </SurfaceCard>
      </div>

      {isEditingProfile ? (
        <OverlayModal onClose={() => setIsEditingProfile(false)}>
          <ModalPanel
            title="Editar perfil"
            description="Actualiza tu identidad básica para que toda la app y el material comercial mantengan el mismo tono."
            onClose={() => setIsEditingProfile(false)}
            footer={
              <Button
                type="submit"
                form="profile-form"
                accentColor={accentColor}
                className="w-full"
                disabled={isSavingProfile}
              >
                {isSavingProfile ? 'Guardando…' : 'Guardar perfil'}
              </Button>
            }
          >
            <form id="profile-form" onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold tracking-[0.14em] text-slate-500 dark:text-slate-400 uppercase">
                  Nombre
                </label>
                <input
                  required
                  value={profileForm.name}
                  onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })}
                  className={fieldClass}
                  style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                  placeholder="Nombre"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold tracking-[0.14em] text-slate-500 dark:text-slate-400 uppercase">
                  Handle
                </label>
                <input
                  required
                  value={profileForm.handle}
                  onChange={(event) => setProfileForm({ ...profileForm, handle: event.target.value })}
                  className={fieldClass}
                  style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                  placeholder="@tuusuario"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold tracking-[0.14em] text-slate-500 dark:text-slate-400 uppercase">
                  URL del avatar
                </label>
                <input
                  required
                  value={profileForm.avatar}
                  onChange={(event) => setProfileForm({ ...profileForm, avatar: event.target.value })}
                  className={fieldClass}
                  style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                  placeholder="https://..."
                />
              </div>
            </form>
          </ModalPanel>
        </OverlayModal>
      ) : null}
    </div>
  );
}
