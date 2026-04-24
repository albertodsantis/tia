import { useEffect, useState } from 'react';
import { Gift, Copy, Check, ShareNetwork } from '@phosphor-icons/react';
import {
  REFERRAL_QUALIFY_TASK_CHANGES,
  REFERRAL_QUALIFY_ACTIVE_DAYS,
  REFERRAL_QUALIFY_WINDOW_DAYS,
  type ReferralStats,
} from '@shared';
import { referralsApi } from '../lib/api';
import { toast } from '../lib/toast';
import { Button, StatusBadge, SurfaceCard } from './ui';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  } catch {
    return iso;
  }
}

function buildShareUrl(code: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://efidesk.com';
  return `${origin}/?ref=${encodeURIComponent(code)}`;
}

export default function ReferralsSection() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { stats } = await referralsApi.getMe();
        if (active) setStats(stats);
      } catch {
        if (active) setStats(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const code = stats?.referralCode ?? '';
  const shareUrl = code ? buildShareUrl(code) : '';

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Enlace copiado');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const handleShare = async () => {
    if (!shareUrl) return;
    const shareData = {
      title: 'Prueba Efi',
      text: 'Te comparto Efi, el CRM personal para creadores y profesionales independientes.',
      url: shareUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await handleCopy();
      }
    } catch {
      // User cancelled share — nothing to do
    }
  };

  return (
    <SurfaceCard className="overflow-hidden p-0">
      <div className="p-6 lg:p-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft-strong)] text-[var(--accent-solid)]">
            <Gift size={22} weight="fill" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">
              Invita a un amigo
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Por cada amigo que invites y use Efi, ambos ganan 1 mes gratis cuando salgamos
              de la etapa beta. Máximo {stats?.cap ?? 3} amigos.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 h-24 animate-pulse rounded-2xl bg-[var(--surface-card-strong)]" />
        ) : !stats || !code ? (
          <p className="mt-6 text-sm text-[var(--text-secondary)]">
            No pudimos cargar tu enlace de invitación. Intenta recargar la página.
          </p>
        ) : (
          <>
            <div className="mt-6 space-y-2">
              <p className="text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase dark:text-slate-500">
                Tu enlace
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="flex-1 overflow-hidden rounded-[1rem] border border-[color:var(--line-soft)] bg-[var(--surface-card-strong)] px-4 py-3 text-sm font-medium text-[var(--text-primary)]">
                  <div className="truncate">{shareUrl}</div>
                </div>
                <div className="flex gap-2">
                  <Button tone="secondary" onClick={handleCopy} className="flex-1 justify-center sm:flex-none">
                    {copied ? <Check size={16} weight="bold" /> : <Copy size={16} weight="regular" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </Button>
                  <Button onClick={handleShare} className="flex-1 justify-center sm:flex-none">
                    <ShareNetwork size={16} weight="regular" />
                    Compartir
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard label="Amigos activos" value={`${stats.qualifiedCount} / ${stats.cap}`} />
              <StatCard label="En proceso" value={String(stats.pendingCount)} />
              <StatCard
                label="Meses ganados"
                value={String(stats.creditsEarned)}
                hint={
                  stats.creditsRedeemed > 0
                    ? `${stats.creditsRedeemed} canjeado${stats.creditsRedeemed === 1 ? '' : 's'}`
                    : 'Se activan al salir de beta'
                }
              />
            </div>

            {stats.invitees.length > 0 && (
              <div className="mt-6">
                <p className="text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase dark:text-slate-500">
                  Tus invitaciones
                </p>
                <ul className="mt-3 space-y-2">
                  {stats.invitees.map((i) => (
                    <li
                      key={i.referralId}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--line-soft)] bg-[var(--surface-card-strong)] px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[var(--text-primary)]">
                          Invitado el {formatDate(i.createdAt)}
                        </div>
                        <div className="text-xs text-[var(--text-secondary)]">
                          {i.status === 'qualified' && i.qualifiedAt
                            ? `Calificado el ${formatDate(i.qualifiedAt)}`
                            : i.status === 'expired'
                              ? 'Ventana de 60 días vencida'
                              : `Vence el ${formatDate(i.expiresAt)}`}
                        </div>
                      </div>
                      <StatusBadge
                        tone={
                          i.status === 'qualified'
                            ? 'success'
                            : i.status === 'expired'
                              ? 'neutral'
                              : 'warning'
                        }
                      >
                        {i.status === 'qualified' ? 'Calificado' : i.status === 'expired' ? 'Vencido' : 'Pendiente'}
                      </StatusBadge>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="mt-6 text-xs text-[var(--text-secondary)]">
              Un amigo califica cuando al trabaja al menos {REFERRAL_QUALIFY_TASK_CHANGES}
              tareas a lo largo de {REFERRAL_QUALIFY_ACTIVE_DAYS} días distintos,
            </p>
          </>
        )}
      </div>
    </SurfaceCard>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--line-soft)] bg-[var(--surface-card-strong)] px-4 py-3">
      <div className="text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase dark:text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-xl font-bold tracking-tight text-[var(--text-primary)]">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-[var(--text-secondary)]">{hint}</div>}
    </div>
  );
}
