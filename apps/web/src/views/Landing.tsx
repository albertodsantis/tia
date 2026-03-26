import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Eye,
  EyeOff,
  FolderKanban,
  LayoutDashboard,
  Sparkles,
  Users,
} from 'lucide-react';
import type { SessionUser } from '@shared';
import { authApi, ApiError } from '../lib/api';
import { supabase } from '../lib/supabase';
import { cx } from '../components/ui';

type AuthMode = 'login' | 'register';

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

  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    if (mode === 'register' && !name.trim()) return;

    setLoading(true);
    setError('');

    try {
      if (mode === 'register') {
        const { user } = await authApi.register({
          email: email.trim(),
          password,
          name: name.trim(),
        });
        if (user) onLogin(user);
      } else {
        const { user } = await authApi.login({
          email: email.trim(),
          password,
        });
        if (user) onLogin(user);
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'USER_NOT_FOUND') {
        setMode('register');
        setError('No encontramos una cuenta con ese email. Crea una aqui.');
        return;
      }
      setError(err instanceof Error ? err.message : 'Ocurrio un error. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!supabase) {
      setError('Login con Google no disponible. Configuracion pendiente.');
      return;
    }

    try {
      const { error: sbError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (sbError) {
        setError('No se pudo conectar con Google. Intenta de nuevo.');
      }
    } catch {
      setError('No se pudo conectar con Google. Intenta de nuevo.');
    }
  };

  const isLogin = mode === 'login';

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
            <svg width="36" height="36" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="logo-grad" x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" stopColor="#FF2D9B"/>
                  <stop offset="100%" stopColor="#00D4FF"/>
                </linearGradient>
              </defs>
              <ellipse cx="32" cy="22" rx="22" ry="12" fill="url(#logo-grad)"/>
              <rect x="26" y="22" width="12" height="22" rx="6" fill="url(#logo-grad)" opacity="0.65"/>
            </svg>
            <span className="text-lg font-extrabold tracking-tight text-[var(--text-primary)]">
              Tía
            </span>
          </div>
          <a
            href="#login"
            className="rounded-full border px-4 py-2 text-xs font-bold transition-colors hover:bg-[var(--surface-card)] [border-color:var(--line-soft)]"
          >
            Acceder
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

          {/* Right: Auth card */}
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
                {/* Mode tabs */}
                <div className="flex gap-1 rounded-[0.85rem] border bg-[var(--surface-card)] p-1 [border-color:var(--line-soft)]">
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className={cx(
                      'flex-1 rounded-[0.7rem] py-2.5 text-sm font-bold transition-all',
                      isLogin
                        ? 'bg-[var(--surface-card-strong)] shadow-sm text-[var(--text-primary)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                    )}
                  >
                    Iniciar sesion
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className={cx(
                      'flex-1 rounded-[0.7rem] py-2.5 text-sm font-bold transition-all',
                      !isLogin
                        ? 'bg-[var(--surface-card-strong)] shadow-sm text-[var(--text-primary)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                    )}
                  >
                    Crear cuenta
                  </button>
                </div>

                <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
                  {isLogin
                    ? 'Ingresa con tu cuenta existente.'
                    : 'Crea tu workspace en segundos.'}
                </p>

                {/* Google login */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="mt-5 flex w-full items-center justify-center gap-3 rounded-[1rem] border bg-[var(--surface-card)] px-4 py-3.5 text-sm font-bold transition-all hover:shadow-[var(--shadow-soft)] active:scale-[0.98] [border-color:var(--line-soft)]"
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
                <div className="my-5 flex items-center gap-4">
                  <div className="h-px flex-1 bg-[var(--line-soft)]" />
                  <span className="text-[11px] font-bold tracking-[0.14em] text-[var(--text-secondary)]/60 uppercase">
                    o con email
                  </span>
                  <div className="h-px flex-1 bg-[var(--line-soft)]" />
                </div>

                {/* Email form */}
                <form onSubmit={handleSubmit} className="space-y-3.5">
                  {!isLogin ? (
                    <div>
                      <label
                        htmlFor="auth-name"
                        className="mb-1.5 block text-xs font-bold text-[var(--text-secondary)]"
                      >
                        Nombre
                      </label>
                      <input
                        id="auth-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Tu nombre"
                        required={!isLogin}
                        autoComplete="name"
                        className="w-full rounded-[0.85rem] border bg-[var(--surface-card)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/40 transition-colors focus:bg-[var(--surface-card-strong)] [border-color:var(--line-soft)]"
                      />
                    </div>
                  ) : null}

                  <div>
                    <label
                      htmlFor="auth-email"
                      className="mb-1.5 block text-xs font-bold text-[var(--text-secondary)]"
                    >
                      Email
                    </label>
                    <input
                      id="auth-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      required
                      autoComplete="email"
                      className="w-full rounded-[0.85rem] border bg-[var(--surface-card)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/40 transition-colors focus:bg-[var(--surface-card-strong)] [border-color:var(--line-soft)]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="auth-password"
                      className="mb-1.5 block text-xs font-bold text-[var(--text-secondary)]"
                    >
                      Contraseña
                    </label>
                    <div className="relative">
                      <input
                        id="auth-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={isLogin ? 'Tu contraseña' : 'Minimo 6 caracteres'}
                        required
                        minLength={isLogin ? undefined : 6}
                        autoComplete={isLogin ? 'current-password' : 'new-password'}
                        className="w-full rounded-[0.85rem] border bg-[var(--surface-card)] px-4 py-3 pr-12 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/40 transition-colors focus:bg-[var(--surface-card-strong)] [border-color:var(--line-soft)]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                        className="absolute top-1/2 right-3 -translate-y-1/2 p-1 text-[var(--text-secondary)]/50 transition-colors hover:text-[var(--text-secondary)]"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {error ? (
                    <p className="text-xs font-medium text-rose-500">{error}</p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={loading || !email.trim() || !password || (!isLogin && !name.trim())}
                    className="flex w-full items-center justify-center gap-2 rounded-[1rem] px-4 py-3.5 text-sm font-bold shadow-[0_12px_30px_-16px_var(--accent-glow)] transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ backgroundColor: ACCENT, color: '#fff' }}
                  >
                    {loading
                      ? (isLogin ? 'Ingresando…' : 'Creando cuenta…')
                      : (isLogin ? 'Iniciar sesion' : 'Crear cuenta')}
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
