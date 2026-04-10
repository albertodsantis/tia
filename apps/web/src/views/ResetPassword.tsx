import React, { useState } from 'react';
import { ArrowRight, Eye, EyeSlash } from '@phosphor-icons/react';
import { authApi } from '../lib/api';

const BRAND_ORANGE = '#F56040';
const BRAND_PINK = '#E1306C';
const BRAND_PURPLE = '#833AB4';

export default function ResetPassword({ token, onDone }: { token: string; onDone: () => void }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo restablecer la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const fieldClass =
    'w-full rounded-[0.85rem] border bg-[var(--surface-card)] px-4 py-3 text-base sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/40 transition-colors focus:bg-[var(--surface-card-strong)] focus:outline-none [border-color:var(--line-soft)]';

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--surface-app)] px-5 font-sans">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <svg width="40" height="40" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4">
            <defs>
              <linearGradient id="logo-grad-rp" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FCAF45"/>
                <stop offset="30%" stopColor={BRAND_ORANGE}/>
                <stop offset="60%" stopColor={BRAND_PINK}/>
                <stop offset="100%" stopColor={BRAND_PURPLE}/>
              </linearGradient>
            </defs>
            <rect x="26" y="18" width="12" height="28" rx="6" fill="url(#logo-grad-rp)" opacity="0.65"/>
            <path d="M10,24 C10,15 18,9 32,9 C46,9 54,15 54,24 C54,27 48,28 40,26 C36,25 34,22 32,22 C30,22 28,25 24,26 C16,28 10,27 10,24Z" fill="url(#logo-grad-rp)"/>
          </svg>
          <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
            Nueva contraseña
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Elige una contraseña segura para tu cuenta Efi.
          </p>
        </div>

        <div className="overflow-hidden rounded-[1.5rem] border bg-[var(--surface-card-strong)] shadow-[var(--shadow-medium)] [border-color:var(--line-soft)]">
          <div className="px-6 pb-8 pt-7 sm:px-8">
            {success ? (
              <div className="space-y-5 text-center">
                <div
                  className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
                  style={{ background: `linear-gradient(135deg, ${BRAND_ORANGE}, ${BRAND_PINK})` }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-base font-bold text-[var(--text-primary)]">
                  Contraseña actualizada
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Ya puedes iniciar sesión con tu nueva contraseña.
                </p>
                <button
                  type="button"
                  onClick={onDone}
                  className="flex w-full items-center justify-center gap-2 rounded-[1rem] px-4 py-3.5 text-sm font-bold text-white transition-all active:scale-[0.98]"
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${BRAND_ORANGE}, ${BRAND_PINK}, ${BRAND_PURPLE})`,
                  }}
                >
                  Ir a iniciar sesión
                  <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[var(--text-secondary)]">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      required
                      autoComplete="new-password"
                      className={`${fieldClass} pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute top-1/2 right-3 -translate-y-1/2 p-1 text-[var(--text-secondary)]/50 transition-colors hover:text-[var(--text-secondary)]"
                    >
                      {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[var(--text-secondary)]">
                    Confirmar contraseña
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repite la contraseña"
                    required
                    autoComplete="new-password"
                    className={fieldClass}
                  />
                </div>

                {error ? (
                  <p className="text-xs font-medium text-rose-500">{error}</p>
                ) : null}

                <button
                  type="submit"
                  disabled={loading || !newPassword || !confirm}
                  className="flex w-full items-center justify-center gap-2 rounded-[1rem] px-4 py-3.5 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${BRAND_ORANGE}, ${BRAND_PINK}, ${BRAND_PURPLE})`,
                  }}
                >
                  {loading ? 'Guardando…' : 'Guardar contraseña'}
                  {!loading ? <ArrowRight size={16} /> : null}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
