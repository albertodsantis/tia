import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  FolderKanban,
  LayoutDashboard,
  Sparkles,
  Users,
} from 'lucide-react';
import type { SessionUser } from '@shared';
import { authApi } from '../lib/api';
import { cx } from '../components/ui';

const features = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    description: 'Métricas, metas y actividad reciente en un solo vistazo.',
  },
  {
    icon: FolderKanban,
    title: 'Pipeline',
    description: 'Gestiona entregas con vistas Kanban, lista y calendario.',
  },
  {
    icon: Users,
    title: 'Directorio',
    description: 'Organiza marcas, contactos y seguimiento financiero.',
  },
  {
    icon: BarChart3,
    title: 'Perfil & Media Kit',
    description: 'Tu identidad profesional y materiales de presentación.',
  },
  {
    icon: CalendarDays,
    title: 'Google Calendar',
    description: 'Sincroniza tus entregas con tu calendario personal.',
  },
  {
    icon: Sparkles,
    title: 'Asistente IA',
    description: 'Consulta asistida por inteligencia artificial integrada.',
  },
];

export default function Landing({
  onLogin,
}: {
  onLogin: (user: SessionUser) => void;
}) {
  const [ACCENT, setACCENT] = useState('#C96F5B');

  useEffect(() => {
    const savedAccent = localStorage.getItem('tia_accent_color');
    if (savedAccent) setACCENT(savedAccent);
  }, []);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setLoading(true);
    setError('');

    try {
      const { user } = await authApi.login({ email: email.trim(), name: name.trim() });
      if (user) {
        onLogin(user);
      }
    } catch (err) {
      setError('No se pudo iniciar sesión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { url } = await authApi.googleLoginUrl();

      const popup = window.open(url, 'google-login', 'width=500,height=600');

      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === 'GOOGLE_LOGIN_SUCCESS') {
          window.removeEventListener('message', handleMessage);
          popup?.close();

          const { user } = await authApi.me();
          if (user) {
            onLogin(user);
          }
        }
      };

      window.addEventListener('message', handleMessage);
    } catch {
      setError('No se pudo conectar con Google. Intenta de nuevo.');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[var(--surface-app)] font-sans text-[var(--text-primary)]">
      {/* Background accents */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-32 right-[-8%] h-96 w-96 rounded-full blur-[100px] opacity-50"
          style={{ backgroundColor: `${ACCENT}30` }}
        />
        <div className="absolute bottom-[-5%] left-[-6%] h-80 w-80 rounded-full bg-emerald-200/20 blur-[100px] dark:bg-emerald-400/10" />
        <div
          className="absolute top-1/2 left-1/3 h-64 w-64 rounded-full blur-[120px] opacity-30"
          style={{ backgroundColor: `${ACCENT}18` }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        {/* Nav */}
        <nav className="flex items-center justify-between py-6 sm:py-8">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white text-sm font-extrabold"
              style={{ backgroundColor: ACCENT }}
            >
              T
            </div>
            <span className="text-lg font-extrabold tracking-tight text-[var(--text-primary)]">
              Tía
            </span>
          </div>
          <a
            href="#login"
            className="rounded-full border px-4 py-2 text-xs font-bold transition-colors hover:bg-[var(--surface-card)] [border-color:var(--line-soft)]"
          >
            Iniciar sesión
          </a>
        </nav>

        {/* Hero + Login */}
        <div className="mt-8 grid items-start gap-12 sm:mt-12 lg:mt-20 lg:grid-cols-[1fr_420px] lg:gap-16 xl:grid-cols-[1fr_460px]">
          {/* Left: Hero */}
          <div className="max-w-2xl">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-bold tracking-[0.14em] uppercase"
              style={{ backgroundColor: `${ACCENT}14`, color: ACCENT }}
            >
              <Sparkles size={13} strokeWidth={2.5} />
              CRM para creadores
            </div>

            <h1 className="mt-6 text-[clamp(2.2rem,5.5vw,3.8rem)] font-black leading-[1.08] tracking-tight text-[var(--text-primary)]">
              Tu espacio operativo para{' '}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${ACCENT}, #E8956E)`,
                }}
              >
                partnerships creativos
              </span>
            </h1>

            <p className="mt-5 max-w-lg text-base leading-7 text-[var(--text-secondary)] sm:text-lg sm:leading-8">
              Gestiona colaboraciones, entregables y contactos desde un workspace
              compacto diseñado para influencers y freelancers creativos.
            </p>

            {/* Feature grid - visible on desktop below hero */}
            <div className="mt-12 hidden lg:block">
              <p className="text-[11px] font-bold tracking-[0.18em] text-[var(--text-secondary)]/80 uppercase">
                Todo lo que necesitas
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-3">
                {features.map((feat) => {
                  const Icon = feat.icon;
                  return (
                    <div
                      key={feat.title}
                      className="rounded-[1.05rem] border bg-[var(--surface-card)]/60 p-4 backdrop-blur-sm transition-colors [border-color:var(--line-soft)]"
                    >
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${ACCENT}12`, color: ACCENT }}
                      >
                        <Icon size={16} strokeWidth={2.2} />
                      </div>
                      <p className="mt-3 text-sm font-bold text-[var(--text-primary)]">
                        {feat.title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                        {feat.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Login card */}
          <div id="login" className="w-full lg:sticky lg:top-12">
            <div className="relative overflow-hidden rounded-[1.5rem] border bg-[var(--surface-card-strong)] shadow-[var(--shadow-medium)] backdrop-blur-xl [border-color:var(--line-soft)]">
              {/* Card glow */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: `radial-gradient(circle at top left, ${ACCENT}18 0%, transparent 50%)`,
                }}
              />

              <div className="relative px-6 pb-8 pt-7 sm:px-8 sm:pt-8">
                <h2 className="text-xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-2xl">
                  Iniciar sesión
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Accede a tu workspace personal de Tía.
                </p>

                {/* Google login */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="mt-6 flex w-full items-center justify-center gap-3 rounded-[1rem] border bg-[var(--surface-card)] px-4 py-3.5 text-sm font-bold transition-all hover:shadow-[var(--shadow-soft)] active:scale-[0.98] [border-color:var(--line-soft)]"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                    <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                  Continuar con Google
                </button>

                {/* Divider */}
                <div className="my-6 flex items-center gap-4">
                  <div className="h-px flex-1 bg-[var(--line-soft)]" />
                  <span className="text-[11px] font-bold tracking-[0.14em] text-[var(--text-secondary)]/60 uppercase">
                    o continúa con email
                  </span>
                  <div className="h-px flex-1 bg-[var(--line-soft)]" />
                </div>

                {/* Email form */}
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div>
                    <label
                      htmlFor="login-name"
                      className="mb-1.5 block text-xs font-bold text-[var(--text-secondary)]"
                    >
                      Nombre
                    </label>
                    <input
                      id="login-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Tu nombre"
                      required
                      className="w-full rounded-[0.85rem] border bg-[var(--surface-card)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/40 transition-colors focus:bg-[var(--surface-card-strong)] [border-color:var(--line-soft)]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="login-email"
                      className="mb-1.5 block text-xs font-bold text-[var(--text-secondary)]"
                    >
                      Email
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      required
                      className="w-full rounded-[0.85rem] border bg-[var(--surface-card)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/40 transition-colors focus:bg-[var(--surface-card-strong)] [border-color:var(--line-soft)]"
                    />
                  </div>

                  {error ? (
                    <p className="text-xs font-medium text-rose-500">{error}</p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={loading || !name.trim() || !email.trim()}
                    className="flex w-full items-center justify-center gap-2 rounded-[1rem] px-4 py-3.5 text-sm font-bold shadow-[0_12px_30px_-16px_var(--accent-glow)] transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ backgroundColor: ACCENT, color: '#fff' }}
                  >
                    {loading ? 'Entrando…' : 'Entrar'}
                    {!loading ? <ArrowRight size={16} strokeWidth={2.5} /> : null}
                  </button>
                </form>

                <p className="mt-5 text-center text-[11px] leading-5 text-[var(--text-secondary)]/60">
                  Al continuar, aceptas nuestros términos de servicio y política de privacidad.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Features - mobile only (below login card) */}
        <div className="mt-12 pb-16 lg:hidden">
          <p className="text-[11px] font-bold tracking-[0.18em] text-[var(--text-secondary)]/80 uppercase">
            Todo lo que necesitas
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="rounded-[1.05rem] border bg-[var(--surface-card)]/60 p-4 backdrop-blur-sm transition-colors [border-color:var(--line-soft)]"
                >
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${ACCENT}12`, color: ACCENT }}
                  >
                    <Icon size={16} strokeWidth={2.2} />
                  </div>
                  <p className="mt-3 text-sm font-bold text-[var(--text-primary)]">
                    {feat.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                    {feat.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t py-8 text-center [border-color:var(--line-soft)] lg:mt-16">
          <p className="text-xs text-[var(--text-secondary)]/60">
            Tía — workspace operativo para creadores de contenido
          </p>
        </div>
      </div>
    </div>
  );
}
