import React, { useState } from 'react';
import { Eye, EyeSlash } from '@phosphor-icons/react';
import { authApi } from '../lib/api';

const BRAND_ORANGE = '#FF4D3D';
const BRAND_PINK = '#FF1E7A';
const BRAND_PURPLE = '#D61B6D';

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
          <img src="/brand/isotipo.png" alt="" width={48} height={48} className="mx-auto mb-4 select-none" draggable={false} />
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
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
