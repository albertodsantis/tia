import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Article,
  ArrowSquareOut,
  Broadcast,
  BriefcaseMetal,
  Briefcase,
  Camera,
  ChartBar,
  ChatsCircle,
  CheckCircle,
  CircleNotch,
  Compass,
  Copy,
  FloppyDisk,
  Headphones,
  Microphone,
  MonitorPlay,
  PencilLine,
  Plus,
  Presentation,
  Radio,
  Sparkle,
  Star,
  Warning,
  X,
} from '@phosphor-icons/react';
import type {
  BlockType,
  FreelancerType,
  MediaKitMetric,
  MediaKitOffer,
  MediaKitProfile,
  SocialProfiles,
  UserProfile,
} from '@shared';
import OverlayModal from '../components/OverlayModal';
import { PROFESSION_LABELS } from '../lib/professions';
import { useAppContext } from '../context/AppContext';
import { Avatar, Button, SurfaceCard, cx } from '../components/ui';
import { appApi } from '../lib/api';
import { toast } from '../lib/toast';

import BlockWrapper from '../components/profile-blocks/BlockWrapper';
import BlockPickerDrawer from '../components/BlockPickerDrawer';
import TemplatePickerDrawer from '../components/TemplatePickerDrawer';
import IdentityBlock from '../components/profile-blocks/IdentityBlock';
import AboutBlock from '../components/profile-blocks/AboutBlock';
import MetricsBlock from '../components/profile-blocks/MetricsBlock';
import PortfolioBlock from '../components/profile-blocks/PortfolioBlock';
import BrandsBlock from '../components/profile-blocks/BrandsBlock';
import ServicesBlock from '../components/profile-blocks/ServicesBlock';
import ClosingBlock from '../components/profile-blocks/ClosingBlock';
import LinksBlock from '../components/profile-blocks/LinksBlock';

// ─── Profession catalogue (icons + labels) ───────────────────────────────────

const PROFESSION_ICONS: Record<FreelancerType, React.ElementType> = {
  content_creator:   Star,
  podcaster:         Microphone,
  streamer:          MonitorPlay,
  radio:             Radio,
  photographer:      Camera,
  copywriter:        Article,
  community_manager: ChatsCircle,
  host_mc:           Broadcast,
  speaker:           Presentation,
  dj:                Headphones,
  recruiter:         Briefcase,
  coach:             Compass,
};

const PROFESSIONS_LIST = Object.keys(PROFESSION_LABELS) as FreelancerType[];

// ─── Block labels (for BlockWrapper headers) ──────────────────────────────────

const BLOCK_LABELS: Record<BlockType, string> = {
  about:           'Sobre mí',
  metrics:         'Métricas',
  portfolio:       'Portfolio',
  brands:          'Marcas',
  services:        'Servicios',
  closing:         'Cierre',
  testimonials:    'Testimoniales',
  press:           'Prensa',
  speaking_topics: 'Temas de conferencia',
  video_reel:      'Reel / Video',
  equipment:       'Equipo / Gear',
  awards:          'Premios',
  faq:             'FAQ',
  episodes:        'Episodios',
  releases:        'Lanzamientos',
  links:           'Links',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildSocialHref(platform: keyof SocialProfiles, value: string) {
  const normalized = value.trim();
  if (!normalized) return '';
  if (/^https?:\/\//i.test(normalized)) return normalized;
  const cleanHandle = normalized.replace(/^@/, '');
  const baseByPlatform: Record<keyof SocialProfiles, string> = {
    instagram: 'https://instagram.com/',
    tiktok: 'https://www.tiktok.com/@',
    x: 'https://x.com/',
    threads: 'https://www.threads.net/@',
    youtube: 'https://youtube.com/@',
  };
  return `${baseByPlatform[platform]}${cleanHandle}`;
}

function safeArr(val: any): any[] {
  return Array.isArray(val) ? val : [];
}

function getFilledCount(values: any) {
  return safeArr(values).filter((v) => typeof v === 'string' && v.trim()).length;
}

function getFilledMetricCount(values: any) {
  return safeArr(values).filter(
    (item) => item && ((typeof item.label === 'string' && item.label.trim()) || (typeof item.value === 'string' && item.value.trim())),
  ).length;
}

function getFilledOfferCount(values: any) {
  return safeArr(values).filter(
    (item) => item && ((typeof item.title === 'string' && item.title.trim()) || (typeof item.price === 'string' && item.price.trim()) || (typeof item.description === 'string' && item.description.trim())),
  ).length;
}

const socialProfileFields: Array<{ key: keyof SocialProfiles; label: string }> = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'x', label: 'X' },
  { key: 'threads', label: 'Threads' },
  { key: 'youtube', label: 'YouTube' },
];

// ─── ProfessionModal ──────────────────────────────────────────────────────────

function ProfessionModal({
  primaryProfession,
  secondaryProfessions,
  accentHex,
  accentGradient,
  onClose,
  onSave,
}: {
  primaryProfession: FreelancerType | undefined;
  secondaryProfessions: FreelancerType[];
  accentHex: string;
  accentGradient: string;
  onClose: () => void;
  onSave: (primary: FreelancerType, secondaries: FreelancerType[]) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [primary, setPrimary] = useState<FreelancerType | null>(primaryProfession ?? null);
  const [secondaries, setSecondaries] = useState<FreelancerType[]>(secondaryProfessions);
  const [saving, setSaving] = useState(false);

  const toggleSecondary = (value: FreelancerType) => {
    setSecondaries((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const handleSave = async () => {
    if (!primary) return;
    setSaving(true);
    try {
      await onSave(primary, secondaries);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = () => {
    setPrimary(primaryProfession ?? null);
    setSecondaries(secondaryProfessions);
    setEditing(true);
  };

  const PrimaryIcon = primary ? PROFESSION_ICONS[primary] : null;

  return (
    <OverlayModal onClose={onClose}>
      <div className="relative mx-auto w-full max-w-md rounded-[1.5rem] border border-[var(--line-soft)] bg-[var(--surface-card-strong)] shadow-[var(--shadow-floating)]">
        <div className="flex items-center justify-between border-b border-[var(--line-soft)] px-6 py-4">
          <p className="text-[11px] font-bold tracking-[0.16em] text-[var(--text-secondary)]/80 uppercase">
            Tu actividad
          </p>
          <div className="flex items-center gap-2">
            {!editing && (
              <button
                type="button"
                onClick={handleStartEdit}
                className="flex items-center gap-1.5 rounded-xl border border-[var(--line-soft)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                <PencilLine size={12} />
                Editar
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          {!editing ? (
            <div>
              {primaryProfession ? (
                <>
                  <p className="mb-2 text-[10px] font-bold tracking-widest text-[var(--text-secondary)]/60 uppercase">
                    Principal
                  </p>
                  <div
                    className="flex items-center gap-3 rounded-2xl px-4 py-3"
                    style={{ backgroundColor: `${accentHex}15`, border: `1px solid ${accentHex}30` }}
                  >
                    {PrimaryIcon && (
                      <PrimaryIcon size={20} weight="duotone" style={{ color: accentHex, flexShrink: 0 }} />
                    )}
                    <span className="text-sm font-bold" style={{ color: accentHex }}>
                      {PROFESSION_LABELS[primaryProfession]}
                    </span>
                  </div>
                  {secondaryProfessions.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-[10px] font-bold tracking-widest text-[var(--text-secondary)]/60 uppercase">
                        También
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {secondaryProfessions.map((s) => {
                          const Icon = PROFESSION_ICONS[s];
                          return (
                            <span
                              key={s}
                              className="flex items-center gap-1.5 rounded-full border border-[var(--line-soft)] bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]"
                            >
                              <Icon size={12} weight="duotone" />
                              {PROFESSION_LABELS[s]}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <p className="mt-5 text-[11px] leading-5 text-[var(--text-secondary)]/60">
                    Diseño estándar activo. Pronto: plantillas por profesión para resaltar tu talento.
                  </p>
                </>
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">
                  No has definido tu actividad principal todavía.
                </p>
              )}
            </div>
          ) : (
            <div>
              <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-500/10">
                <Warning size={16} weight="fill" className="mt-0.5 shrink-0 text-amber-500" />
                <p className="text-xs leading-5 text-amber-700 dark:text-amber-300">
                  Cambiar tu actividad principal afectará la plantilla de tu perfil público en el futuro. Hazlo con cuidado.
                </p>
              </div>
              <p className="mb-2 text-[10px] font-bold tracking-widest text-[var(--text-secondary)]/60 uppercase">
                Actividad principal
              </p>
              <div className="grid grid-cols-2 gap-2">
                {PROFESSIONS_LIST.map((value) => {
                  const selected = primary === value;
                  const Icon = PROFESSION_ICONS[value];
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPrimary(value)}
                      className="flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-all duration-100 active:scale-[0.97]"
                      style={{
                        borderColor: selected ? accentHex : 'var(--line-soft)',
                        backgroundColor: selected ? `${accentHex}12` : 'var(--surface-card)',
                        color: selected ? accentHex : 'var(--text-primary)',
                      }}
                    >
                      <Icon
                        size={16}
                        weight="duotone"
                        style={{ color: selected ? accentHex : 'var(--text-secondary)', flexShrink: 0 }}
                      />
                      {PROFESSION_LABELS[value]}
                    </button>
                  );
                })}
              </div>
              {primary && (
                <div className="mt-4">
                  <p className="mb-2 text-[10px] font-bold tracking-widest text-[var(--text-secondary)]/60 uppercase">
                    También hago{' '}
                    <span className="normal-case font-normal tracking-normal text-[var(--text-tertiary)]">
                      (opcional)
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PROFESSIONS_LIST.filter((v) => v !== primary).map((value) => {
                      const active = secondaries.includes(value);
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => toggleSecondary(value)}
                          className="rounded-full border px-3 py-1 text-xs font-medium transition-all duration-100"
                          style={{
                            borderColor: active ? accentHex : 'var(--line-soft)',
                            backgroundColor: active ? `${accentHex}12` : 'var(--surface-card)',
                            color: active ? accentHex : 'var(--text-secondary)',
                          }}
                        >
                          {PROFESSION_LABELS[value]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex-1 rounded-2xl border border-[var(--line-soft)] py-3 text-sm font-bold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-muted)]/50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!primary || saving}
                  onClick={handleSave}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: accentGradient }}
                >
                  {saving ? <CircleNotch size={15} className="animate-spin" /> : <FloppyDisk size={15} />}
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </OverlayModal>
  );
}

// ─── Profile view ─────────────────────────────────────────────────────────────

export default function Profile() {
  const { profile, updateProfile, accentColor, accentHex, accentGradient, partners, addPartner } = useAppContext();
  const [profileForm, setProfileForm] = useState<UserProfile>(() => {
    const safeGoals = safeArr(profile?.goals).map((g: any, i: number) =>
      typeof g === 'string'
        ? { id: `legacy-${i}`, area: '', generalGoal: g, successMetric: '', timeframe: '', status: 'Pendiente' as const, priority: 'Media' as const, revenueEstimation: 0 }
        : g,
    );
    return { ...(profile || {}), goals: safeGoals } as UserProfile;
  });
  const [uploadsEnabled, setUploadsEnabled] = useState(false);
  const lastSavedProfile = useRef(JSON.stringify(profileForm));
  const updateProfileRef = useRef(updateProfile);
  updateProfileRef.current = updateProfile;
  const profileFormRef = useRef(profileForm);
  profileFormRef.current = profileForm;
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [socialDropdown, setSocialDropdown] = useState<keyof SocialProfiles | null>(null);
  const [professionModalOpen, setProfessionModalOpen] = useState(false);
  const [blockPickerOpen, setBlockPickerOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedDisplayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    appApi.getUploadStatus().then((res) => setUploadsEnabled(res.enabled)).catch(() => {});
  }, []);

  // One-time migration: if enabledBlocks is undefined (existing user), auto-enable blocks that have data
  useEffect(() => {
    const mk = profile?.mediaKit;
    if (!mk) return;
    if (mk.enabledBlocks !== undefined && mk.enabledBlocks !== null) return;

    const auto: BlockType[] = [];
    if (mk.featuredImage || mk.aboutTitle || safeArr(mk.aboutParagraphs).some((p: any) => p?.trim()) || safeArr(mk.topicTags).some((t: any) => t?.trim())) auto.push('about');
    if (getFilledMetricCount(mk.insightStats) || getFilledMetricCount(mk.audienceGender) || getFilledMetricCount(mk.ageDistribution) || getFilledMetricCount(mk.topCountries)) auto.push('metrics');
    if (getFilledCount(mk.portfolioImages)) auto.push('portfolio');
    if (mk.brandsTitle || getFilledCount(mk.trustedBrands)) auto.push('brands');
    if (mk.servicesTitle || mk.servicesDescription || getFilledOfferCount(mk.offerings)) auto.push('services');
    if (mk.closingTitle || mk.closingDescription || mk.footerNote) auto.push('closing');

    setProfileForm((current) => ({
      ...current,
      mediaKit: {
        ...(current.mediaKit || {}),
        enabledBlocks: auto,
        blockOrder: auto,
      } as MediaKitProfile,
    }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync external profile changes into local form state
  useEffect(() => {
    if (!profile) return;
    const safeGoals = safeArr(profile.goals).map((g: any, i: number) =>
      typeof g === 'string'
        ? { id: `legacy-${i}`, area: '', generalGoal: g, successMetric: '', timeframe: '', status: 'Pendiente' as const, priority: 'Media' as const, revenueEstimation: 0 }
        : g,
    );
    const incomingProfile = { ...profile, goals: safeGoals } as UserProfile;
    const incomingString = JSON.stringify(incomingProfile);
    if (incomingString !== lastSavedProfile.current) {
      setProfileForm(incomingProfile);
      profileFormRef.current = incomingProfile;
      lastSavedProfile.current = incomingString;
    }
  }, [profile]);

  // Debounced auto-save
  useEffect(() => {
    const currentString = JSON.stringify(profileForm);
    if (currentString === lastSavedProfile.current) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const saved = await updateProfileRef.current(profileFormRef.current);
        lastSavedProfile.current = JSON.stringify(saved);
        setSaveStatus('saved');
        if (savedDisplayTimer.current) clearTimeout(savedDisplayTimer.current);
        savedDisplayTimer.current = setTimeout(() => setSaveStatus('idle'), 2500);
      } catch {
        setSaveStatus('idle');
        toast.error('Error al guardar');
      }
    }, 1500);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [profileForm]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (savedDisplayTimer.current) clearTimeout(savedDisplayTimer.current);
    };
  }, []);

  // ── Derived state ──────────────────────────────────────────────────────────

  const mediaKit = profileForm.mediaKit || ({} as any);

  const enabledBlocks: BlockType[] = safeArr(mediaKit.enabledBlocks);
  const blockOrder: BlockType[] = safeArr(mediaKit.blockOrder).filter((b: any) => enabledBlocks.includes(b));

  const configuredBrands = getFilledCount(mediaKit.trustedBrands);

  // ── Setters ────────────────────────────────────────────────────────────────

  const setProfileField = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
    setProfileForm((current) => ({ ...current, [key]: value }));
  };

  const setSocialField = (key: keyof SocialProfiles, value: string) => {
    setProfileForm((current) => ({
      ...current,
      socialProfiles: { ...(current.socialProfiles || {}), [key]: value } as SocialProfiles,
    }));
  };

  const setMediaKitField = <K extends keyof MediaKitProfile>(key: K, value: MediaKitProfile[K]) => {
    setProfileForm((current) => ({
      ...current,
      mediaKit: { ...(current.mediaKit || {}), [key]: value } as MediaKitProfile,
    }));
  };

  const setMetricField = (
    key: 'insightStats' | 'audienceGender' | 'ageDistribution' | 'topCountries',
    index: number,
    field: keyof MediaKitMetric,
    value: string,
  ) => {
    setProfileForm((current) => ({
      ...current,
      mediaKit: {
        ...(current.mediaKit || {}),
        [key]: safeArr(current.mediaKit?.[key]).map((item: any, i: number) =>
          i === index ? { ...item, [field]: value } : item,
        ),
      } as MediaKitProfile,
    }));
  };

  const addMetric = (key: 'insightStats' | 'audienceGender' | 'ageDistribution' | 'topCountries') => {
    setProfileForm((current) => ({
      ...current,
      mediaKit: {
        ...(current.mediaKit || {}),
        [key]: [...safeArr(current.mediaKit?.[key]), { label: '', value: '' }],
      } as MediaKitProfile,
    }));
  };

  const removeMetric = (key: 'insightStats' | 'audienceGender' | 'ageDistribution' | 'topCountries', index: number) => {
    setProfileForm((current) => ({
      ...current,
      mediaKit: {
        ...(current.mediaKit || {}),
        [key]: safeArr(current.mediaKit?.[key]).filter((_: any, i: number) => i !== index),
      } as MediaKitProfile,
    }));
  };

  const setStringListField = (
    key: 'aboutParagraphs' | 'topicTags' | 'portfolioImages' | 'trustedBrands',
    index: number,
    value: string,
  ) => {
    setProfileForm((current) => ({
      ...current,
      mediaKit: {
        ...(current.mediaKit || {}),
        [key]: safeArr(current.mediaKit?.[key]).map((item: any, i: number) => (i === index ? value : item)),
      } as MediaKitProfile,
    }));
  };

  const addStringListItem = (key: 'aboutParagraphs' | 'topicTags' | 'portfolioImages' | 'trustedBrands') => {
    setProfileForm((current) => ({
      ...current,
      mediaKit: {
        ...(current.mediaKit || {}),
        [key]: [...safeArr(current.mediaKit?.[key]), ''],
      } as MediaKitProfile,
    }));
  };

  const removeStringListItem = (
    key: 'aboutParagraphs' | 'topicTags' | 'portfolioImages' | 'trustedBrands',
    index: number,
  ) => {
    setProfileForm((current) => ({
      ...current,
      mediaKit: {
        ...(current.mediaKit || {}),
        [key]: safeArr(current.mediaKit?.[key]).filter((_: any, i: number) => i !== index),
      } as MediaKitProfile,
    }));
  };

  const setOfferingField = (index: number, field: keyof MediaKitOffer, value: string) => {
    setProfileForm((current) => ({
      ...current,
      mediaKit: {
        ...(current.mediaKit || {}),
        offerings: safeArr(current.mediaKit?.offerings).map((item: any, i: number) =>
          i === index ? { ...item, [field]: value } : item,
        ),
      } as MediaKitProfile,
    }));
  };

  const addOffering = () => {
    setProfileForm((current) => ({
      ...current,
      mediaKit: {
        ...(current.mediaKit || {}),
        offerings: [...safeArr(current.mediaKit?.offerings), { title: '', price: '', description: '' }],
      } as MediaKitProfile,
    }));
  };

  const removeOffering = (index: number) => {
    setProfileForm((current) => ({
      ...current,
      mediaKit: {
        ...(current.mediaKit || {}),
        offerings: safeArr(current.mediaKit?.offerings).filter((_: any, i: number) => i !== index),
      } as MediaKitProfile,
    }));
  };

  // ── Block management ───────────────────────────────────────────────────────

  const addBlock = (type: BlockType) => {
    setProfileForm((current) => {
      const enabled = safeArr(current.mediaKit?.enabledBlocks);
      if (enabled.includes(type)) return current;
      return {
        ...current,
        mediaKit: {
          ...(current.mediaKit || {}),
          enabledBlocks: [...enabled, type],
          blockOrder: [...safeArr(current.mediaKit?.blockOrder), type],
        } as MediaKitProfile,
      };
    });
  };

  const removeBlock = (type: BlockType) => {
    setProfileForm((current) => ({
      ...current,
      mediaKit: {
        ...(current.mediaKit || {}),
        enabledBlocks: safeArr(current.mediaKit?.enabledBlocks).filter((b: any) => b !== type),
        blockOrder: safeArr(current.mediaKit?.blockOrder).filter((b: any) => b !== type),
      } as MediaKitProfile,
    }));
  };

  const moveBlock = (type: BlockType, dir: 'up' | 'down') => {
    setProfileForm((current) => {
      const order = [...safeArr(current.mediaKit?.blockOrder)];
      const idx = order.indexOf(type);
      if (idx === -1) return current;
      const newIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= order.length) return current;
      [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
      return {
        ...current,
        mediaKit: { ...(current.mediaKit || {}), blockOrder: order } as MediaKitProfile,
      };
    });
  };

  const applyTemplate = (blocks: BlockType[]) => {
    setProfileForm((current) => ({
      ...current,
      mediaKit: {
        ...(current.mediaKit || {}),
        enabledBlocks: blocks,
        blockOrder: blocks,
      } as MediaKitProfile,
    }));
  };

  // ── HTML generation (legacy, block-aware in Phase 2) ──────────────────────

  const generateHtml = () => {
    const socialLinks = socialProfileFields
      .map((field) => {
        const value = (profileForm.socialProfiles?.[field.key] || '').trim();
        const href = buildSocialHref(field.key, value);
        if (!value || !href) return '';
        return `<a class="pill-link" href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${escapeHtml(value)}</a>`;
      })
      .filter(Boolean)
      .join('');

    const insightCards = safeArr(mediaKit.insightStats)
      .filter((item: any) => item?.label?.trim() || item?.value?.trim())
      .map((item) => `<article class="metric-card"><div class="metric-value">${escapeHtml(item.value || '-')}</div><div class="metric-label">${escapeHtml(item.label || 'Dato')}</div></article>`)
      .join('');

    const audienceCards = safeArr(mediaKit.audienceGender)
      .filter((item: any) => item?.label?.trim() || item?.value?.trim())
      .map((item) => `<article class="list-card"><div class="list-label">${escapeHtml(item.label || 'Segmento')}</div><div class="list-value">${escapeHtml(item.value || '-')}</div></article>`)
      .join('');

    const ageCards = safeArr(mediaKit.ageDistribution)
      .filter((item: any) => item?.label?.trim() || item?.value?.trim())
      .map((item) => `<article class="list-card"><div class="list-label">${escapeHtml(item.label || 'Rango')}</div><div class="list-value">${escapeHtml(item.value || '-')}</div></article>`)
      .join('');

    const countryRows = safeArr(mediaKit.topCountries)
      .filter((item: any) => item?.label?.trim() || item?.value?.trim())
      .map((item) => `<div class="country-row"><span>${escapeHtml(item.label || 'Pais')}</span><strong>${escapeHtml(item.value || '-')}</strong></div>`)
      .join('');

    const aboutParagraphs = safeArr(mediaKit.aboutParagraphs)
      .filter((p: any) => p?.trim())
      .map((p) => `<p>${escapeHtml(p)}</p>`)
      .join('');

    const topicTags = safeArr(mediaKit.topicTags)
      .filter((tag: any) => tag?.trim())
      .map((tag) => `<span class="tag">#${escapeHtml(tag.replace(/^#/, ''))}</span>`)
      .join('');

    const portfolioImages = safeArr(mediaKit.portfolioImages)
      .filter((img: any) => img?.trim())
      .map((img, i) => `<figure class="portfolio-item"><img src="${escapeHtml(img)}" alt="Portfolio ${i + 1}" /></figure>`)
      .join('');

    const offerings = safeArr(mediaKit.offerings)
      .filter((item: any) => item?.title?.trim() || item?.price?.trim() || item?.description?.trim())
      .map((item) => `<article class="offer-card"><div class="offer-price">${escapeHtml(item.price || '-')}</div><h3>${escapeHtml(item.title || 'Colaboracion')}</h3><p>${escapeHtml(item.description || '')}</p></article>`)
      .join('');

    const trustedBrands = safeArr(mediaKit.trustedBrands)
      .filter((brand: any) => brand?.trim())
      .map((brand) => `<span class="brand-chip">${escapeHtml(brand)}</span>`)
      .join('');

    const nameParts = (profileForm.name || '').trim().split(/\s+/).filter(Boolean);
    const leadingName = nameParts[0] || profileForm.name || '';
    const trailingName = nameParts.slice(1).join(' ');

    return `
      <html>
        <head>
          <title>Media kit - ${escapeHtml(profileForm.name)}</title>
          <style>
            :root { --accent: ${accentHex}; --text: #1f2937; --muted: #64748b; --surface: #ffffff; --soft: #f8fafc; --line: rgba(148, 163, 184, 0.22); }
            * { box-sizing: border-box; }
            body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: var(--text); background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%); -webkit-font-smoothing: antialiased; }
            .page { max-width: 1120px; margin: 0 auto; padding: 48px 28px 72px; }
            .hero, .section { background: rgba(255,255,255,0.92); border: 1px solid var(--line); border-radius: 28px; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.06); }
            .hero { padding: 40px; }
            .eyebrow { font-size: 12px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted); }
            h1 { margin: 14px 0 0; font-size: 64px; line-height: 0.96; letter-spacing: -0.06em; }
            .accent { color: var(--accent); }
            .tagline { margin: 18px 0 0; max-width: 680px; font-size: 18px; line-height: 1.6; color: #334155; }
            .pill-row { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
            .pill-link { display: inline-flex; align-items: center; min-height: 44px; padding: 0 18px; border-radius: 999px; background: var(--soft); color: var(--text); font-size: 13px; font-weight: 700; text-decoration: none; }
            .pill-link.primary { background: var(--accent); color: white; }
            .grid { display: grid; gap: 24px; margin-top: 24px; }
            .two-col { grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr); }
            .section { padding: 32px; }
            .section h2 { margin: 0; font-size: 30px; letter-spacing: -0.04em; }
            .section-head { display: flex; justify-content: space-between; gap: 16px; align-items: end; margin-bottom: 24px; }
            .section-copy { margin-top: 10px; color: var(--muted); line-height: 1.7; }
            .about-layout { display: grid; grid-template-columns: 320px minmax(0, 1fr); gap: 28px; align-items: start; }
            .about-image { width: 100%; height: 420px; object-fit: cover; border-radius: 24px; }
            .about-copy p { margin: 0 0 16px; line-height: 1.8; color: #334155; }
            .tag-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
            .tag { display: inline-flex; align-items: center; min-height: 38px; padding: 0 14px; border-radius: 999px; background: rgba(15, 23, 42, 0.04); font-size: 12px; font-weight: 700; color: #334155; }
            .metrics-grid, .list-grid, .offer-grid { display: grid; gap: 16px; }
            .metrics-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
            .list-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .metric-card, .list-card, .offer-card { border-radius: 22px; background: var(--soft); padding: 22px; }
            .metric-value, .list-value, .offer-price { font-size: 32px; font-weight: 800; letter-spacing: -0.05em; }
            .metric-label, .list-label { margin-top: 8px; font-size: 12px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
            .country-list { display: grid; gap: 12px; }
            .country-row { display: flex; justify-content: space-between; gap: 16px; align-items: center; padding: 16px 18px; border-radius: 18px; background: var(--soft); }
            .country-row span { color: #334155; font-weight: 600; }
            .portfolio-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
            .portfolio-item { margin: 0; border-radius: 22px; overflow: hidden; background: var(--soft); min-height: 220px; }
            .portfolio-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
            .offer-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .offer-card h3 { margin: 16px 0 0; font-size: 20px; letter-spacing: -0.03em; }
            .offer-card p { margin: 10px 0 0; color: var(--muted); line-height: 1.7; }
            .brand-row { display: flex; flex-wrap: wrap; gap: 10px; }
            .brand-chip { display: inline-flex; align-items: center; min-height: 42px; padding: 0 16px; border-radius: 999px; background: var(--soft); font-size: 13px; font-weight: 700; }
            .footer-section { text-align: center; padding: 36px 32px; }
            .footer-section a { color: var(--text); font-weight: 700; text-decoration: none; }
            .footer-note { margin-top: 18px; color: var(--muted); font-size: 13px; }
            @media (max-width: 900px) { h1 { font-size: 48px; } .two-col, .about-layout, .metrics-grid, .offer-grid, .list-grid, .portfolio-grid { grid-template-columns: 1fr; } .hero, .section { padding: 24px; } }
          </style>
        </head>
        <body>
          <main class="page">
            <section class="hero">
              <div class="eyebrow">${escapeHtml(mediaKit.periodLabel)}</div>
              <h1>${escapeHtml(leadingName)}${trailingName ? ` <span class="accent">${escapeHtml(trailingName)}</span>` : ''}</h1>
              <p class="tagline">${escapeHtml(mediaKit.tagline)}</p>
              <div class="pill-row">
                ${socialLinks}
                <a class="pill-link" href="mailto:${escapeHtml(mediaKit.contactEmail)}">${escapeHtml(mediaKit.contactEmail)}</a>
                <a class="pill-link primary" href="#" onclick="window.print(); return false;">Descargar PDF</a>
              </div>
            </section>
            <div class="grid two-col">
              <section class="section">
                <div class="about-layout">
                  <img class="about-image" src="${escapeHtml(mediaKit.featuredImage || profileForm.avatar)}" alt="${escapeHtml(profileForm.name)}" />
                  <div class="about-copy">
                    <h2>${escapeHtml(mediaKit.aboutTitle)}</h2>
                    <div class="section-copy">${aboutParagraphs}</div>
                    <div class="tag-row">${topicTags}</div>
                  </div>
                </div>
              </section>
              <section class="section">
                <div class="section-head">
                  <div>
                    <h2>Community Insights</h2>
                    <p class="section-copy">Actualizado: ${escapeHtml(mediaKit.updatedLabel)}</p>
                  </div>
                </div>
                <div class="metrics-grid">${insightCards}</div>
                <div class="grid">
                  <div><h2 style="font-size:24px;">Audiencia</h2><div class="list-grid" style="margin-top:16px;">${audienceCards}</div></div>
                  <div><h2 style="font-size:24px;">Rango de Edad</h2><div class="list-grid" style="margin-top:16px;">${ageCards}</div></div>
                  <div><h2 style="font-size:24px;">Top Countries</h2><div class="country-list" style="margin-top:16px;">${countryRows}</div></div>
                </div>
              </section>
            </div>
            <section class="section" style="margin-top:24px;"><div class="section-head"><div><h2>Portfolio</h2><p class="section-copy">Seleccion de imagenes y piezas destacadas.</p></div></div><div class="portfolio-grid">${portfolioImages}</div></section>
            <section class="section" style="margin-top:24px;"><div class="section-head"><div><h2>${escapeHtml(mediaKit.servicesTitle)}</h2><p class="section-copy">${escapeHtml(mediaKit.servicesDescription)}</p></div></div><div class="offer-grid">${offerings}</div></section>
            <section class="section" style="margin-top:24px;"><div class="section-head"><div><h2>${escapeHtml(mediaKit.brandsTitle)}</h2></div></div><div class="brand-row">${trustedBrands}</div></section>
            <section class="section footer-section" style="margin-top:24px;"><h2>${escapeHtml(mediaKit.closingTitle)}</h2><p class="section-copy">${escapeHtml(mediaKit.closingDescription)}</p><p style="margin-top:18px;"><a href="mailto:${escapeHtml(mediaKit.contactEmail)}">${escapeHtml(mediaKit.contactEmail)}</a></p><p class="footer-note">© 2026 ${escapeHtml(profileForm.name)}. ${escapeHtml(mediaKit.footerNote)}</p></section>
          </main>
        </body>
      </html>
    `;
  };

  const handleOpenMediaKit = () => {
    const handle = (profileForm.handle || '').trim().replace(/^@/, '');
    if (!handle) return;
    window.open(`/mk/${encodeURIComponent(handle)}`, '_blank');
  };

  const handleCopyLink = async () => {
    const handle = (profileForm.handle || '').trim().replace(/^@/, '');
    if (!handle) return;
    const url = `${window.location.origin}/mk/${encodeURIComponent(handle)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Enlace copiado');
    } catch {
      toast.error('Error al copiar enlace');
    }
  };

  // ── Block renderer ─────────────────────────────────────────────────────────

  const renderBlockContent = (type: BlockType) => {
    switch (type) {
      case 'about':
        return (
          <AboutBlock
            mediaKit={mediaKit}
            accentHex={accentHex}
            uploadsEnabled={uploadsEnabled}
            onFeaturedImageChange={(url) => setMediaKitField('featuredImage', url)}
            onAboutTitleChange={(v) => setMediaKitField('aboutTitle', v)}
            onParagraphChange={(i, v) => setStringListField('aboutParagraphs', i, v)}
            onAddParagraph={() => addStringListItem('aboutParagraphs')}
            onRemoveParagraph={(i) => removeStringListItem('aboutParagraphs', i)}
            onTagChange={(i, v) => setStringListField('topicTags', i, v)}
            onAddTag={() => addStringListItem('topicTags')}
            onRemoveTag={(i) => removeStringListItem('topicTags', i)}
          />
        );
      case 'metrics':
        return (
          <MetricsBlock
            mediaKit={mediaKit}
            accentHex={accentHex}
            onMetricChange={setMetricField}
            onAddMetric={addMetric}
            onRemoveMetric={removeMetric}
          />
        );
      case 'portfolio':
        return (
          <PortfolioBlock
            mediaKit={mediaKit}
            accentHex={accentHex}
            uploadsEnabled={uploadsEnabled}
            onImageChange={(i, url) => setStringListField('portfolioImages', i, url)}
            onAddImage={() => addStringListItem('portfolioImages')}
            onRemoveImage={(i) => removeStringListItem('portfolioImages', i)}
          />
        );
      case 'brands':
        return (
          <BrandsBlock
            mediaKit={mediaKit}
            accentHex={accentHex}
            partners={partners}
            totalPartnersCount={partners.length}
            configuredBrands={configuredBrands}
            onTitleChange={(v) => setMediaKitField('brandsTitle', v)}
            onBrandChange={(i, v) => setStringListField('trustedBrands', i, v)}
            onAddBrand={() => addStringListItem('trustedBrands')}
            onRemoveBrand={(i) => removeStringListItem('trustedBrands', i)}
            onCreatePartner={async (name) => {
              await addPartner({ name, status: 'Prospecto', contacts: [] } as any);
              toast.success(`${name} añadida al directorio`);
            }}
          />
        );
      case 'services':
        return (
          <ServicesBlock
            mediaKit={mediaKit}
            accentHex={accentHex}
            onTitleChange={(v) => setMediaKitField('servicesTitle', v)}
            onDescriptionChange={(v) => setMediaKitField('servicesDescription', v)}
            onOfferingChange={setOfferingField}
            onAddOffering={addOffering}
            onRemoveOffering={removeOffering}
          />
        );
      case 'closing':
        return (
          <ClosingBlock
            mediaKit={mediaKit}
            accentHex={accentHex}
            onTitleChange={(v) => setMediaKitField('closingTitle', v)}
            onDescriptionChange={(v) => setMediaKitField('closingDescription', v)}
            onFooterNoteChange={(v) => setMediaKitField('footerNote', v)}
          />
        );
      case 'links':
        return (
          <LinksBlock
            mediaKit={mediaKit}
            accentHex={accentHex}
            onLinkChange={(index, field, value) =>
              setProfileForm((current) => ({
                ...current,
                mediaKit: {
                  ...(current.mediaKit || {}),
                  links: safeArr(current.mediaKit?.links).map((item: any, i: number) =>
                    i === index ? { ...item, [field]: value } : item,
                  ),
                } as MediaKitProfile,
              }))
            }
            onAddLink={() =>
              setProfileForm((current) => ({
                ...current,
                mediaKit: {
                  ...(current.mediaKit || {}),
                  links: [...safeArr(current.mediaKit?.links), { label: '', url: '' }],
                } as MediaKitProfile,
              }))
            }
            onRemoveLink={(index) =>
              setProfileForm((current) => ({
                ...current,
                mediaKit: {
                  ...(current.mediaKit || {}),
                  links: safeArr(current.mediaKit?.links).filter((_: any, i: number) => i !== index),
                } as MediaKitProfile,
              }))
            }
          />
        );
      default:
        return null;
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="relative">
      {/* Save status toast */}
      <div
        className={cx(
          'pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] left-1/2 z-150 -translate-x-1/2 lg:bottom-6',
          'transition-all duration-300',
          saveStatus !== 'idle' ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
        )}
      >
        <div className="rounded-full border border-(--line-soft) bg-(--surface-card-strong)/95 px-4 py-2 shadow-(--shadow-floating) backdrop-blur-md">
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-2 text-xs font-semibold text-(--text-secondary) animate-pulse">
              <CircleNotch size={13} className="animate-spin" />
              Guardando...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-2 text-xs font-semibold text-emerald-500 dark:text-emerald-300">
              <CheckCircle size={13} />
              Guardado
            </span>
          )}
        </div>
      </div>

      <div className="space-y-5 p-4 pb-6 lg:space-y-6 lg:px-8 lg:pt-4 lg:pb-8">
        {/* ── Profile header ── */}
        <div className="relative px-2 pb-2 lg:px-4">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <Avatar
                src={profileForm.avatar}
                name={profileForm.name || 'Usuario'}
                size={96}
                className="border border-white/70 shadow-[0_22px_42px_-24px_rgba(63,43,34,0.38)]"
              />
              <div className="min-w-0">
                <h1 className="mt-2 text-[1.75rem] font-extrabold tracking-tight text-[var(--text-primary)] lg:text-[2.15rem]">
                  {profileForm.name || 'Sin nombre'}
                </h1>
                <p className="mt-2 text-sm font-semibold text-[var(--text-secondary)]">
                  {profileForm.handle || '@usuario'}
                </p>
                {(() => {
                  const prof = profile.primaryProfession;
                  const Icon = prof ? PROFESSION_ICONS[prof] : null;
                  return (
                    <button
                      type="button"
                      onClick={() => setProfessionModalOpen(true)}
                      className="mt-2 flex items-center gap-1.5 rounded-full border border-[var(--line-soft)] bg-[var(--surface-card)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
                    >
                      {Icon && <Icon size={12} weight="duotone" style={{ color: accentHex }} />}
                      {prof ? PROFESSION_LABELS[prof] : 'Definir actividad'}
                    </button>
                  );
                })()}
              </div>
            </div>

            <div className="flex w-full shrink-0 flex-col gap-3 sm:max-w-sm xl:w-[22rem]">
              <div className="flex items-center justify-end gap-3">
                <Button
                  accentColor={accentGradient}
                  onClick={handleOpenMediaKit}
                  className="flex-1 justify-center sm:flex-none"
                >
                  <ArrowSquareOut size={16} />
                  <span className="italic text-sm">{`/mk/${(profileForm.handle || '').trim().replace(/^@/, '')}`}</span>
                </Button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                  title="Copiar enlace"
                >
                  <Copy size={18} />
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* ── Identity block (mandatory) ── */}
        <SurfaceCard className="p-6 lg:p-7">
          <p className="mb-5 text-[11px] font-bold tracking-[0.16em] text-[var(--text-secondary)]/70 uppercase">
            Identidad
          </p>
          <IdentityBlock
            name={profileForm.name || ''}
            handle={profileForm.handle || ''}
            avatar={profileForm.avatar || ''}
            socialProfiles={profileForm.socialProfiles || {} as SocialProfiles}
            mediaKit={mediaKit}
            accentHex={accentHex}
            uploadsEnabled={uploadsEnabled}
            socialDropdown={socialDropdown}
            onNameChange={(v) => setProfileField('name', v)}
            onHandleChange={(v) => setProfileField('handle', v)}
            onAvatarChange={(url) => setProfileField('avatar', url)}
            onSocialChange={setSocialField}
            onSocialDropdownChange={setSocialDropdown}
            onMediaKitChange={(key, v) => setMediaKitField(key, v)}
          />
        </SurfaceCard>

        {/* ── Optional blocks in order ── */}
        {blockOrder.map((type, index) => {
          const content = renderBlockContent(type);
          if (!content) return null;
          return (
            <BlockWrapper
              key={type}
              title={BLOCK_LABELS[type]}
              onMoveUp={index > 0 ? () => moveBlock(type, 'up') : undefined}
              onMoveDown={index < blockOrder.length - 1 ? () => moveBlock(type, 'down') : undefined}
              onRemove={() => removeBlock(type)}
            >
              {content}
            </BlockWrapper>
          );
        })}

        {/* ── Empty state ── */}
        {blockOrder.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--line-soft)] bg-[var(--surface-card)] px-6 py-12 text-center">
            <Sparkle size={28} className="mx-auto mb-3 text-[var(--text-secondary)]/50" weight="duotone" />
            <p className="text-sm font-bold text-[var(--text-primary)]">Tu perfil está vacío</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              ¿Cómo quieres empezar?
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setTemplatePickerOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold text-white transition-all active:scale-[0.98]"
                style={{ background: `${accentHex}` }}
              >
                <Sparkle size={15} weight="fill" />
                Usar plantilla
              </button>
              <button
                type="button"
                onClick={() => setBlockPickerOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-[var(--line-soft)] bg-[var(--surface-card-strong)] px-5 py-2.5 text-sm font-bold text-[var(--text-primary)] transition-all hover:bg-[var(--surface-muted)] active:scale-[0.98]"
              >
                <Plus size={15} />
                Elegir bloques
              </button>
            </div>
          </div>
        )}

        {/* ── Add block button ── */}
        {blockOrder.length > 0 && (
          <button
            type="button"
            onClick={() => setBlockPickerOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--line-soft)] bg-[var(--surface-card)] py-4 text-sm font-bold text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] active:scale-[0.99]"
          >
            <Plus size={15} />
            Agregar bloque
          </button>
        )}
      </div>

      {/* ── Modals ── */}
      {blockPickerOpen && (
        <BlockPickerDrawer
          enabledBlocks={enabledBlocks}
          accentHex={accentHex}
          onAdd={addBlock}
          onClose={() => setBlockPickerOpen(false)}
        />
      )}

      {templatePickerOpen && (
        <TemplatePickerDrawer
          accentHex={accentHex}
          onApply={applyTemplate}
          onClose={() => setTemplatePickerOpen(false)}
        />
      )}

      {professionModalOpen && (
        <ProfessionModal
          primaryProfession={profile.primaryProfession}
          secondaryProfessions={profile.secondaryProfessions ?? []}
          accentHex={accentHex}
          accentGradient={accentGradient}
          onClose={() => setProfessionModalOpen(false)}
          onSave={async (primary, secondaries) => {
            await updateProfile({ primaryProfession: primary, secondaryProfessions: secondaries });
            toast.success('Actividad actualizada');
          }}
        />
      )}
    </div>
  );
}
