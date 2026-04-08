import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowSquareOut,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  CircleNotch,
  Copy,
  FilePdf,
  GlobeSimple,
  InstagramLogo,
  Link,
  Plus,
  Trash,
  TiktokLogo,
  XLogo,
  YoutubeLogo,
  ThreadsLogo,
  LinkedinLogoIcon,
} from '@phosphor-icons/react';
import type { EfiProfile, ProfileLink, SocialProfiles } from '@shared';
import { useAppContext } from '../context/AppContext';
import { ScreenHeader, SurfaceCard, cx } from '../components/ui';
import { appApi } from '../lib/api';
import { toast } from '../lib/toast';
import ImageUpload from '../components/ImageUpload';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileForm {
  name: string;
  handle: string;
  tagline: string;
  avatar: string;
  socialProfiles: SocialProfiles;
  efiProfile: EfiProfile;
}

// ─── Social platform config ───────────────────────────────────────────────────

const SOCIAL_PLATFORMS: {
  key: keyof SocialProfiles;
  label: string;
  Icon: React.ElementType;
  placeholder: string;
}[] = [
  { key: 'instagram', label: 'Instagram',   Icon: InstagramLogo, placeholder: '' },
  { key: 'tiktok',    label: 'TikTok',      Icon: TiktokLogo,    placeholder: '' },
  { key: 'x',         label: 'X (Twitter)', Icon: XLogo,         placeholder: '' },
  { key: 'youtube',   label: 'YouTube',     Icon: YoutubeLogo,   placeholder: '' },
  { key: 'threads',   label: 'Threads',     Icon: ThreadsLogo,   placeholder: '' },
  { key: 'linkedin',  label: 'LinkedIn',    Icon: LinkedinLogoIcon,  placeholder: '' },
];

type SaveStatus = 'idle' | 'saving' | 'saved';

function nanoid() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}

// ─── Shared input class ───────────────────────────────────────────────────────

const inputClass =
  'w-full rounded-[0.8rem] border border-[color:var(--line-soft)] bg-[var(--surface-card-strong)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 transition-all';

// ─── Component ────────────────────────────────────────────────────────────────

export default function Profile() {
  const { profile, accentHex, updateProfile } = useAppContext();

  const [form, setForm] = useState<ProfileForm>({
    name: profile.name,
    handle: profile.handle,
    tagline: profile.tagline,
    avatar: profile.avatar,
    socialProfiles: { ...profile.socialProfiles },
    efiProfile: {
      links: profile.efiProfile.links.map((l) => ({ ...l })),
      pdf_url: profile.efiProfile.pdf_url,
      pdf_label: profile.efiProfile.pdf_label,
    },
  });

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [focusedSocial, setFocusedSocial] = useState<keyof SocialProfiles | null>(null);
  const [uploadsEnabled, setUploadsEnabled] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setForm({
      name: profile.name,
      handle: profile.handle,
      tagline: profile.tagline,
      avatar: profile.avatar,
      socialProfiles: { ...profile.socialProfiles },
      efiProfile: {
        links: profile.efiProfile.links.map((l) => ({ ...l })),
        pdf_url: profile.efiProfile.pdf_url,
        pdf_label: profile.efiProfile.pdf_label,
      },
    });
  }, [profile]);

  useEffect(() => {
    appApi.getUploadStatus().then((s) => setUploadsEnabled(s.enabled)).catch(() => {});
  }, []);

  // ── Debounced auto-save ───────────────────────────────────────────────────

  const triggerSave = (updated: ProfileForm) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus('saving');
    saveTimerRef.current = setTimeout(async () => {
      try {
        await updateProfile({
          name: updated.name,
          handle: updated.handle,
          tagline: updated.tagline,
          avatar: updated.avatar,
          socialProfiles: updated.socialProfiles,
          efiProfile: updated.efiProfile,
        });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err: any) {
        toast.error(err.message ?? 'Error al guardar.');
        setSaveStatus('idle');
      }
    }, 1500);
  };

  const patch = (partial: Partial<ProfileForm>) => {
    const updated = { ...form, ...partial };
    setForm(updated);
    triggerSave(updated);
  };

  const patchSocial = (key: keyof SocialProfiles, value: string) => {
    patch({ socialProfiles: { ...form.socialProfiles, [key]: value } });
  };

  const patchEfi = (partial: Partial<EfiProfile>) => {
    patch({ efiProfile: { ...form.efiProfile, ...partial } });
  };

  // ── Link management ───────────────────────────────────────────────────────

  const addLink = () => {
    const newLink: ProfileLink = { id: nanoid(), label: '', url: '' };
    patchEfi({ links: [...form.efiProfile.links, newLink] });
  };

  const updateLink = (id: string, field: keyof Omit<ProfileLink, 'id'>, value: string) => {
    patchEfi({
      links: form.efiProfile.links.map((l) => (l.id === id ? { ...l, [field]: value } : l)),
    });
  };

  const removeLink = (id: string) => {
    patchEfi({ links: form.efiProfile.links.filter((l) => l.id !== id) });
  };

  const moveLink = (id: string, dir: 'up' | 'down') => {
    const links = [...form.efiProfile.links];
    const idx = links.findIndex((l) => l.id === id);
    if (idx === -1) return;
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= links.length) return;
    [links[idx], links[swap]] = [links[swap], links[idx]];
    patchEfi({ links });
  };

  // ── PDF upload ────────────────────────────────────────────────────────────

  const handlePdfFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Solo se permiten archivos PDF.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('El PDF no puede superar 20 MB.');
      return;
    }
    setPdfUploading(true);
    try {
      const result = await appApi.uploadFile(file, 'pdf');
      patchEfi({ pdf_url: result.url });
    } catch (err: any) {
      toast.error(err.message ?? 'Error al subir el PDF.');
    } finally {
      setPdfUploading(false);
    }
  };

  // ── Public URL ────────────────────────────────────────────────────────────

  const publicHandle = form.handle.replace(/^@/, '');
  const publicUrl = publicHandle ? `${window.location.origin}/@${publicHandle}` : null;

  const copyPublicUrl = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl).then(() => toast.success('Enlace copiado'));
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 p-4 pb-6 lg:space-y-6 lg:px-8 lg:pt-4 lg:pb-8">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <ScreenHeader
        actions={
          publicUrl ? (
            <div className="pt-2">
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-xl border border-[color:var(--line-soft)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <ArrowSquareOut size={13} />
                Ver página
              </a>
            </div>
          ) : undefined
        }
      />

      {/* ── Identity ────────────────────────────────────────────────────── */}
      <SurfaceCard className="overflow-hidden">
        <div className="p-6 lg:p-7">
          <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]/80">
            Identidad
          </p>

          <div className="flex gap-5 items-start">
            {/* Avatar */}
            <div className="shrink-0">
              <ImageUpload
                value={form.avatar}
                onChange={(url) => patch({ avatar: url })}
                category="avatar"
                accentColor={accentHex}
                aspectRatio="aspect-square"
                className="!w-20 !h-20 !rounded-full"
                uploadsEnabled={uploadsEnabled}
                placeholder="Foto"
              />
            </div>

            {/* Fields */}
            <div className="flex-1 flex flex-col gap-3 min-w-0">
              <div>
                <label className="block mb-1.5 text-xs font-medium text-[var(--text-secondary)]">Nombre</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  placeholder="Tu nombre"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-medium text-[var(--text-secondary)]">Handle</label>
                <div className="flex items-center rounded-[0.8rem] border border-[color:var(--line-soft)] bg-[var(--surface-card-strong)] overflow-hidden focus-within:ring-2 focus-within:ring-[var(--accent)]/40 transition-all">
                  <span className="px-3 py-3 text-sm text-[var(--text-secondary)] select-none shrink-0">@</span>
                  <input
                    type="text"
                    value={form.handle.replace(/^@/, '')}
                    onChange={(e) => patch({ handle: e.target.value.replace(/^@/, '') })}
                    placeholder="tuhandle"
                    className="flex-1 bg-transparent px-1 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-medium text-[var(--text-secondary)]">Bio corta</label>
                <input
                  type="text"
                  value={form.tagline}
                  onChange={(e) => patch({ tagline: e.target.value })}
                  placeholder=""
                  maxLength={120}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Public URL bar */}
          {publicUrl && (
            <div className="mt-5 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[var(--surface-muted)] border border-[color:var(--line-soft)]">
              <GlobeSimple size={13} className="text-[var(--text-secondary)] shrink-0" />
              <span className="text-xs text-[var(--text-secondary)] flex-1 truncate font-mono">{publicUrl}</span>
              <button
                onClick={copyPublicUrl}
                title="Copiar enlace"
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0"
              >
                <Copy size={13} />
              </button>
            </div>
          )}
        </div>
      </SurfaceCard>

      {/* ── Redes sociales ──────────────────────────────────────────────── */}
      <SurfaceCard className="overflow-hidden">
        <div className="p-6 lg:p-7">
          <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]/80">
            Redes sociales
          </p>
          <div className="flex flex-col gap-3">
            {SOCIAL_PLATFORMS.map(({ key, label, Icon, placeholder }) => {
              const suggestion = publicHandle ? `@${publicHandle}` : null;
              const showSuggestion =
                focusedSocial === key &&
                suggestion !== null &&
                form.socialProfiles[key] !== suggestion;
              return (
                <div key={key} className="flex items-center gap-3">
                  <Icon size={18} className="text-[var(--text-secondary)] shrink-0" />
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={form.socialProfiles[key]}
                      onChange={(e) => patchSocial(key, e.target.value)}
                      onFocus={() => setFocusedSocial(key)}
                      onBlur={() => setTimeout(() => setFocusedSocial(null), 150)}
                      placeholder={placeholder}
                      aria-label={label}
                      className={inputClass}
                    />
                    {showSuggestion && (
                      <div className="absolute left-0 right-0 top-full mt-1 z-10 rounded-[0.8rem] border border-[color:var(--line-soft)] bg-[var(--surface-card)] shadow-lg overflow-hidden">
                        <button
                          onMouseDown={() => {
                            patchSocial(key, suggestion!);
                            setFocusedSocial(null);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-[var(--surface-muted)] transition-colors"
                        >
                          <span className="text-[var(--text-secondary)] font-mono">{suggestion}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </SurfaceCard>

      {/* ── Mis enlaces ─────────────────────────────────────────────────── */}
      <SurfaceCard className="overflow-hidden">
        <div className="p-6 lg:p-7">
          <div className="flex items-center justify-between mb-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]/80">
              Mis enlaces
            </p>
            <button
              onClick={addLink}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-[color:var(--line-soft)] bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <Plus size={12} />
              Añadir
            </button>
          </div>

          {form.efiProfile.links.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-[var(--text-secondary)]">
              <Link size={28} className="opacity-30" />
              <p className="text-sm">Agrega tus enlaces más importantes</p>
              <p className="text-xs opacity-60">YouTube, newsletter, booking, portfolio…</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {form.efiProfile.links.map((link, idx) => (
                <div key={link.id} className="flex items-center gap-2">
                  {/* Reorder buttons */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      onClick={() => moveLink(link.id, 'up')}
                      disabled={idx === 0}
                      className="p-0.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-20 transition-colors"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      onClick={() => moveLink(link.id, 'down')}
                      disabled={idx === form.efiProfile.links.length - 1}
                      className="p-0.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-20 transition-colors"
                    >
                      <ArrowDown size={12} />
                    </button>
                  </div>

                  <div className="flex flex-col gap-1.5 flex-1 min-w-0 sm:flex-row sm:gap-2">
                    <input
                      type="text"
                      value={link.label}
                      onChange={(e) => updateLink(link.id, 'label', e.target.value)}
                      placeholder="Etiqueta"
                      className={cx(inputClass, 'sm:w-32 sm:shrink-0')}
                    />
                    <input
                      type="url"
                      value={link.url}
                      onChange={(e) => updateLink(link.id, 'url', e.target.value)}
                      placeholder="https://…"
                      className={cx(inputClass, 'sm:flex-1')}
                    />
                  </div>

                  <button
                    onClick={() => removeLink(link.id)}
                    className="shrink-0 p-1 text-[var(--text-secondary)] hover:text-red-500 transition-colors"
                  >
                    <Trash size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </SurfaceCard>

      {/* ── Documento PDF ───────────────────────────────────────────────── */}
      <SurfaceCard className="overflow-hidden">
        <div className="p-6 lg:p-7">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]/80">
            Documento (PDF)
          </p>
          <p className="mb-5 text-xs text-[var(--text-secondary)]">
            Sube tu dossier, media kit o portafolio. Aparecerá como botón en tu página.
          </p>

          {form.efiProfile.pdf_url ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--surface-muted)] border border-[color:var(--line-soft)]">
                <FilePdf size={18} className="text-[var(--text-secondary)] shrink-0" />
                <span className="text-sm flex-1 truncate text-[var(--text-secondary)]">PDF subido</span>
                <a
                  href={form.efiProfile.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <ArrowSquareOut size={15} />
                </a>
                <button
                  onClick={() => patchEfi({ pdf_url: null })}
                  className="text-[var(--text-secondary)] hover:text-red-500 transition-colors"
                >
                  <Trash size={15} />
                </button>
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-medium text-[var(--text-secondary)]">
                  Texto del botón
                </label>
                <input
                  type="text"
                  value={form.efiProfile.pdf_label}
                  onChange={(e) => patchEfi({ pdf_label: e.target.value })}
                  placeholder="Ver mi media kit"
                  className={inputClass}
                />
              </div>
            </div>
          ) : (
            <>
              <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePdfFile(file);
                  e.target.value = '';
                }}
              />
              <button
                onClick={() => pdfInputRef.current?.click()}
                disabled={pdfUploading || !uploadsEnabled}
                className={cx(
                  'w-full flex flex-col items-center justify-center gap-2.5 py-10 rounded-xl border-2 border-dashed transition-colors',
                  'border-[color:var(--line-soft)] text-[var(--text-secondary)]',
                  uploadsEnabled && !pdfUploading
                    ? 'hover:border-[var(--accent)] hover:text-[var(--text-primary)] cursor-pointer'
                    : 'opacity-50 cursor-not-allowed',
                )}
              >
                {pdfUploading ? (
                  <CircleNotch size={22} className="animate-spin" />
                ) : (
                  <FilePdf size={22} />
                )}
                <span className="text-sm">
                  {pdfUploading
                    ? 'Subiendo…'
                    : uploadsEnabled
                    ? 'Subir PDF (máx. 20 MB)'
                    : 'Almacenamiento no configurado'}
                </span>
              </button>
            </>
          )}
        </div>
      </SurfaceCard>

      {/* ── Save status pill ────────────────────────────────────────────── */}
      {saveStatus !== 'idle' && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 lg:bottom-6 lg:left-auto lg:right-6 lg:translate-x-0 pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--surface-card)] border border-[color:var(--line-soft)] shadow-lg text-sm text-[var(--text-secondary)]">
            {saveStatus === 'saving' ? (
              <>
                <CircleNotch className="animate-spin" size={14} />
                Guardando…
              </>
            ) : (
              <>
                <CheckCircle size={14} />
                Guardado
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
