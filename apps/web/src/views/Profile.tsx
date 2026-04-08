import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowSquareOut,
  ArrowUp,
  ArrowDown,
  Check,
  CheckCircle,
  CircleNotch,
  Copy,
  DeviceMobile,
  Desktop,
  FilePdf,
  GlobeSimple,
  InstagramLogo,
  Link,
  Moon,
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
import { cx } from '../components/ui';
import { appApi } from '../lib/api';
import { toast } from '../lib/toast';
import ImageUpload from '../components/ImageUpload';
import {
  ACCENT_OPTIONS,
  getAccessibleAccentForeground,
  getRepresentativeHex,
  getSwatchCss,
  isRetroAccent,
} from '../lib/accent';

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
}[] = [
  { key: 'instagram', label: 'Instagram',   Icon: InstagramLogo },
  { key: 'tiktok',    label: 'TikTok',      Icon: TiktokLogo },
  { key: 'x',         label: 'X (Twitter)', Icon: XLogo },
  { key: 'youtube',   label: 'YouTube',     Icon: YoutubeLogo },
  { key: 'threads',   label: 'Threads',     Icon: ThreadsLogo },
  { key: 'linkedin',  label: 'LinkedIn',    Icon: LinkedinLogoIcon },
];

type SaveStatus = 'idle' | 'saving' | 'saved';
type PreviewDevice = 'mobile' | 'desktop';
type ActiveTab = 'editor' | 'preview';

function nanoid() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}

const inputClass =
  'w-full rounded-[0.8rem] border border-[color:var(--line-soft)] bg-[var(--surface-card-strong)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/40 transition-all';

const sectionLabel =
  'text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]/80';

// ─── Preview iframe ───────────────────────────────────────────────────────────

function ProfilePreview({
  form,
  accentColor,
  forceDark,
  device,
}: {
  form: ProfileForm;
  accentColor: string;
  forceDark: boolean;
  device: PreviewDevice;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/v1/preview-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ ...form, accentColor, forceDark }),
        });
        if (!res.ok) return;
        const html = await res.text();
        if (iframeRef.current) iframeRef.current.srcdoc = html;
      } catch {
        // silent — preview is best-effort
      }
    }, 400);
  }, [form, accentColor, forceDark]);

  useEffect(() => {
    refresh();
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [refresh]);

  const isMobile = device === 'mobile';

  return (
    <div
      className={cx(
        'transition-all duration-300 mx-auto',
        isMobile ? 'w-[375px]' : 'w-full',
      )}
      style={{ height: '100%' }}
    >
      <iframe
        ref={iframeRef}
        title="Vista previa del perfil público"
        className={cx(
          'w-full h-full border-0 bg-transparent rounded-2xl overflow-hidden',
          isMobile && 'shadow-2xl ring-1 ring-white/10',
        )}
        sandbox="allow-same-origin"
      />
    </div>
  );
}

// ─── Editor sections ──────────────────────────────────────────────────────────

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="border-b border-[color:var(--line-soft)] last:border-b-0">
      <div className="px-6 py-5">
        <div className="flex items-center justify-between mb-4">
          <p className={sectionLabel}>{title}</p>
          {action}
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Profile() {
  const { profile, profileAccentColor, profileForceDark, setProfileAccentColor, setProfileForceDark, updateProfile } = useAppContext();
  const accentHex = getRepresentativeHex(profileAccentColor);

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
  const [device, setDevice] = useState<PreviewDevice>('mobile');
  const [activeTab, setActiveTab] = useState<ActiveTab>('editor');
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

  // ─── Editor panel ─────────────────────────────────────────────────────────

  const editorPanel = (
    <div className="flex flex-col h-full">
      {/* Scrollable sections */}
      <div className="flex-1 overflow-y-auto pb-24 lg:pb-8">

        {/* ── Identity ──────────────────────────────────────────────── */}
        <Section title="Identidad">
          <div className="flex gap-4 items-start">
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
                <div className="flex items-center rounded-[0.8rem] border border-[color:var(--line-soft)] bg-[var(--surface-card-strong)] overflow-hidden focus-within:ring-2 focus-within:ring-[var(--accent-color)]/40 transition-all">
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
            <div className="mt-4 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[var(--surface-muted)] border border-[color:var(--line-soft)]">
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
        </Section>

        {/* ── Tema / Accent ──────────────────────────────────────────── */}
        <Section title="Tema">
          <div className="grid grid-cols-6 gap-2 mb-4">
            {ACCENT_OPTIONS.map((option) => {
              const isSelected = profileAccentColor === option.value;
              const displayHex = getRepresentativeHex(option.value);
              const fg = getAccessibleAccentForeground(option.value);
              const bg = getSwatchCss(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setProfileAccentColor(option.value)}
                  title={option.name}
                  className="group flex flex-col items-center gap-1.5"
                >
                  <div
                    className="relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200"
                    style={{
                      background: bg,
                      transform: isSelected ? 'scale(1.15)' : undefined,
                      boxShadow: isSelected
                        ? `0 6px 20px -6px ${displayHex}90`
                        : '0 2px 6px -2px rgba(0,0,0,0.12)',
                      outline: isSelected ? `2px solid ${displayHex}` : undefined,
                      outlineOffset: isSelected ? '2px' : undefined,
                    }}
                  >
                    {isSelected && <Check size={16} weight="bold" color={fg} />}
                  </div>
                  <span
                    className="text-[9px] font-semibold tracking-wide leading-none transition-colors truncate w-full text-center"
                    style={{ color: isSelected ? displayHex : 'var(--text-secondary)' }}
                  >
                    {option.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Dark mode toggle — disabled for retro themes (they force dark automatically) */}
          <button
            type="button"
            onClick={() => setProfileForceDark(!profileForceDark)}
            disabled={isRetroAccent(profileAccentColor)}
            className={cx(
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all',
              profileForceDark || isRetroAccent(profileAccentColor)
                ? 'border-[color:var(--line-soft)] bg-[var(--surface-card-strong)]'
                : 'border-[color:var(--line-soft)] bg-[var(--surface-muted)]',
              isRetroAccent(profileAccentColor) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-[var(--surface-card-strong)]',
            )}
          >
            <Moon size={16} className="text-[var(--text-secondary)] shrink-0" />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-[var(--text-primary)]">Forzar modo oscuro</p>
              <p className="text-xs text-[var(--text-secondary)]">
                {isRetroAccent(profileAccentColor)
                  ? 'Activo automáticamente con este tema'
                  : 'La página pública siempre se mostrará en oscuro'}
              </p>
            </div>
            <div
              className={cx(
                'w-9 h-5 rounded-full transition-colors shrink-0 relative',
                profileForceDark || isRetroAccent(profileAccentColor)
                  ? 'bg-[var(--accent-color)]'
                  : 'bg-[var(--line-soft)]',
              )}
            >
              <div
                className={cx(
                  'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                  profileForceDark || isRetroAccent(profileAccentColor) ? 'translate-x-4' : 'translate-x-0.5',
                )}
              />
            </div>
          </button>
        </Section>

        {/* ── Redes sociales ────────────────────────────────────────── */}
        <Section title="Redes sociales">
          <div className="flex flex-col gap-3">
            {SOCIAL_PLATFORMS.map(({ key, label, Icon }) => {
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
                      placeholder={label}
                      aria-label={label}
                      className={inputClass}
                    />
                    {showSuggestion && (
                      <div className="absolute left-0 right-0 top-full mt-1 z-10 rounded-[0.8rem] border border-[color:var(--line-soft)] bg-[var(--surface-card)] shadow-lg overflow-hidden">
                        <button
                          onMouseDown={() => { patchSocial(key, suggestion!); setFocusedSocial(null); }}
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
        </Section>

        {/* ── Mis enlaces ───────────────────────────────────────────── */}
        <Section
          title="Mis enlaces"
          action={
            <button
              onClick={addLink}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-[color:var(--line-soft)] bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <Plus size={12} />
              Añadir
            </button>
          }
        >
          {form.efiProfile.links.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-[var(--text-secondary)]">
              <Link size={26} className="opacity-30" />
              <p className="text-sm">Agrega tus enlaces más importantes</p>
              <p className="text-xs opacity-60">YouTube, newsletter, booking, portfolio…</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {form.efiProfile.links.map((link, idx) => (
                <div key={link.id} className="flex items-center gap-2">
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
        </Section>

        {/* ── Documento PDF ─────────────────────────────────────────── */}
        <Section title="Documento (PDF)">
          <p className="mb-4 text-xs text-[var(--text-secondary)]">
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
                  'w-full flex flex-col items-center justify-center gap-2.5 py-8 rounded-xl border-2 border-dashed transition-colors',
                  'border-[color:var(--line-soft)] text-[var(--text-secondary)]',
                  uploadsEnabled && !pdfUploading
                    ? 'hover:border-[var(--accent-color)] hover:text-[var(--text-primary)] cursor-pointer'
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
        </Section>

      </div>
    </div>
  );

  // ─── Preview panel ─────────────────────────────────────────────────────────

  const previewPanel = (
    <div className="flex flex-col h-full">
      {/* Device toggle */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--line-soft)] shrink-0">
        <span className="text-xs font-medium text-[var(--text-secondary)]">Vista previa</span>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--surface-muted)] border border-[color:var(--line-soft)]">
          <button
            onClick={() => setDevice('mobile')}
            className={cx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              device === 'mobile'
                ? 'bg-[var(--surface-card)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
            )}
          >
            <DeviceMobile size={14} />
            Móvil
          </button>
          <button
            onClick={() => setDevice('desktop')}
            className={cx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              device === 'desktop'
                ? 'bg-[var(--surface-card)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
            )}
          >
            <Desktop size={14} />
            Desktop
          </button>
        </div>
        {publicUrl && (
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-[color:var(--line-soft)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowSquareOut size={13} />
            Abrir
          </a>
        )}
      </div>

      {/* iframe */}
      <div className="flex-1 overflow-hidden p-4 flex items-start justify-center">
        <div className={cx(
          'transition-all duration-300 h-full',
          device === 'mobile' ? 'w-[375px]' : 'w-full',
        )}>
          <ProfilePreview form={form} accentColor={profileAccentColor} forceDark={profileForceDark} device={device} />
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">

      {/* ── Desktop: split pane ──────────────────────────────────── */}
      <div className="hidden lg:flex flex-1 min-h-0 overflow-hidden">

        {/* Editor — left column */}
        <div className="w-[420px] shrink-0 flex flex-col border-r border-[color:var(--line-soft)] overflow-hidden">
          <div className="px-6 py-5 border-b border-[color:var(--line-soft)] shrink-0 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold tracking-tight text-[var(--text-primary)]">Perfil público</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Tu página de enlace personal</p>
            </div>
            {publicUrl && (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-[color:var(--line-soft)] bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <ArrowSquareOut size={13} />
                Ver página
              </a>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {editorPanel}
          </div>
        </div>

        {/* Preview — right column */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[var(--surface-muted)]/50">
          {previewPanel}
        </div>
      </div>

      {/* ── Mobile: tabs ─────────────────────────────────────────── */}
      <div className="flex lg:hidden flex-col flex-1 min-h-0 overflow-hidden">

        {/* Tab bar */}
        <div className="flex items-center gap-1 px-4 pt-3 pb-0 shrink-0">
          <button
            onClick={() => setActiveTab('editor')}
            className={cx(
              'flex-1 py-2.5 text-sm font-medium rounded-t-xl border-b-2 transition-all',
              activeTab === 'editor'
                ? 'text-[var(--text-primary)] border-[var(--accent-color)]'
                : 'text-[var(--text-secondary)] border-transparent',
            )}
          >
            Editor
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={cx(
              'flex-1 py-2.5 text-sm font-medium rounded-t-xl border-b-2 transition-all',
              activeTab === 'preview'
                ? 'text-[var(--text-primary)] border-[var(--accent-color)]'
                : 'text-[var(--text-secondary)] border-transparent',
            )}
          >
            Vista previa
          </button>
        </div>
        <div className="border-b border-[color:var(--line-soft)] shrink-0" />

        {/* Panel */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {activeTab === 'editor' ? (
            <div className="h-full overflow-y-auto">
              {editorPanel}
            </div>
          ) : (
            <div className="h-full bg-[var(--surface-muted)]/50">
              {previewPanel}
            </div>
          )}
        </div>
      </div>

      {/* ── Save status pill ──────────────────────────────────────── */}
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
