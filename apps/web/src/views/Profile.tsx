import React, { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FolderPlus,
  Image,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Target,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import type { Goal, GoalPriority, GoalStatus, MediaKitMetric, MediaKitOffer, MediaKitProfile, Partner, SocialProfiles, UserProfile } from '@shared';
import { useAppContext } from '../context/AppContext';
import { Avatar, Button, SurfaceCard, ModalPanel, cx } from '../components/ui';
import CustomSelect from '../components/CustomSelect';
import ImageUpload from '../components/ImageUpload';
import { appApi } from '../lib/api';
import { toast } from '../lib/toast';

const GOAL_STATUSES: GoalStatus[] = ['Pendiente', 'En Curso', 'Alcanzado', 'Cancelado'];
const GOAL_PRIORITIES: GoalPriority[] = ['Baja', 'Media', 'Alta'];

const fieldClass =
  'w-full rounded-[1rem] border border-[var(--line-soft)] bg-[var(--surface-card-strong)] px-4 py-3.5 text-sm font-medium text-[var(--text-primary)] transition-all placeholder:text-[var(--text-secondary)]/70 focus:outline-none focus:ring-2';

const textareaClass = `${fieldClass} min-h-[116px] resize-y leading-6`;

const socialProfileFields: Array<{
  key: keyof SocialProfiles;
  label: string;
  placeholder: string;
}> = [
  { key: 'instagram', label: 'Instagram', placeholder: '' },
  { key: 'tiktok', label: 'TikTok', placeholder: '' },
  { key: 'x', label: 'X', placeholder: '' },
  { key: 'threads', label: 'Threads', placeholder: '' },
  { key: 'youtube', label: 'YouTube', placeholder: '' },
];

const labelClass =
  'mb-2 block text-[11px] font-bold tracking-[0.16em] text-[var(--text-secondary)]/80 uppercase';

type MetricKey = 'insightStats' | 'audienceGender' | 'ageDistribution' | 'topCountries';

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
  if (!normalized) {
    return '';
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

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
  return safeArr(values).filter((value) => typeof value === 'string' && value.trim()).length;
}

function getFilledMetricCount(values: any) {
  return safeArr(values).filter((item) => item && ((typeof item.label === 'string' && item.label.trim()) || (typeof item.value === 'string' && item.value.trim()))).length;
}

function getFilledOfferCount(values: any) {
  return safeArr(values).filter(
    (item) => item && ((typeof item.title === 'string' && item.title.trim()) || (typeof item.price === 'string' && item.price.trim()) || (typeof item.description === 'string' && item.description.trim())),
  ).length;
}

function SectionHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  accentColor,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  eyebrow: string;
  title: string;
  description?: string;
  accentColor: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface-card-strong)] p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
        >
          <Icon size={16} strokeWidth={2.4} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-[0.18em] text-[var(--text-secondary)]/90 uppercase">{eyebrow}</p>
          <h2 className="text-base font-bold text-[var(--text-primary)] leading-5 truncate">{title}</h2>
        </div>
      </div>
      {description ? (
        <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">{description}</p>
      ) : null}
    </div>
  );
}

export default function Profile() {
  const { profile, updateProfile, accentColor, accentHex, accentGradient, partners, addPartner } = useAppContext();
  const [profileForm, setProfileForm] = useState<UserProfile>(() => {
    const safeGoals = safeArr(profile?.goals).map((g: any, i) =>
          typeof g === 'string'
            ? { id: `legacy-${i}`, area: '', generalGoal: g, successMetric: '', specificTarget: '', timeframe: '', status: 'Pendiente' as GoalStatus, priority: 'Media' as GoalPriority, revenueEstimation: 0 }
            : g,
        )
    return { ...(profile || {}), goals: safeGoals } as UserProfile;
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
  const [uploadsEnabled, setUploadsEnabled] = useState(false);
  const lastSavedProfile = useRef(JSON.stringify(profileForm));
  const updateProfileRef = useRef(updateProfile);
  updateProfileRef.current = updateProfile;
  const profileFormRef = useRef(profileForm);
  profileFormRef.current = profileForm;
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedDisplayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    appApi.getUploadStatus().then((res) => setUploadsEnabled(res.enabled)).catch(() => {});
  }, []);

  // Sync external profile changes into local form state
  useEffect(() => {
    if (!profile) return;
    if (isGoalsModalOpen) return;

    const safeGoals = safeArr(profile.goals).map((g: any, i) =>
      typeof g === 'string'
        ? { id: `legacy-${i}`, area: '', generalGoal: g, successMetric: '', specificTarget: '', timeframe: '', status: 'Pendiente' as GoalStatus, priority: 'Media' as GoalPriority, revenueEstimation: 0 }
        : g,
    );
    const incomingProfile = { ...profile, goals: safeGoals } as UserProfile;
    const incomingString = JSON.stringify(incomingProfile);

    if (incomingString !== lastSavedProfile.current) {
      setProfileForm(incomingProfile);
      profileFormRef.current = incomingProfile;
      lastSavedProfile.current = incomingString;
    }
  }, [profile, isGoalsModalOpen]);

  // Debounced auto-save for profile fields (goals save via modal button)
  useEffect(() => {
    if (isGoalsModalOpen) return;

    const currentString = JSON.stringify(profileForm);
    if (currentString === lastSavedProfile.current) return;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const saved = await updateProfileRef.current(profileFormRef.current);
        // Don't overwrite profileForm — user may have kept typing
        lastSavedProfile.current = JSON.stringify(saved);
        setSaveStatus('saved');
        if (savedDisplayTimer.current) clearTimeout(savedDisplayTimer.current);
        savedDisplayTimer.current = setTimeout(() => setSaveStatus('idle'), 2500);
      } catch {
        setSaveStatus('idle');
        toast.error('Error al guardar');
      }
    }, 1500);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [profileForm, isGoalsModalOpen]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (savedDisplayTimer.current) clearTimeout(savedDisplayTimer.current);
    };
  }, []);

  const mediaKit = profileForm.mediaKit || ({} as any);
  const configuredPortfolio = getFilledCount(mediaKit.portfolioImages);
  const configuredBrands = getFilledCount(mediaKit.trustedBrands);
  const configuredStats =
    getFilledMetricCount(mediaKit.insightStats) +
    getFilledMetricCount(mediaKit.audienceGender) +
    getFilledMetricCount(mediaKit.ageDistribution) +
    getFilledMetricCount(mediaKit.topCountries);
  const configuredOffers = getFilledOfferCount(mediaKit.offerings);

  const setProfileField = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
    setProfileForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const setSocialField = (key: keyof SocialProfiles, value: string) => {
    setProfileForm((current) => ({
      ...current,
      socialProfiles: {
        ...(current.socialProfiles || {}),
        [key]: value,
      } as SocialProfiles,
    }));
  };

  const setMediaKitField = <K extends keyof UserProfile['mediaKit']>(
    key: K,
    value: UserProfile['mediaKit'][K],
  ) => {
    setProfileForm((current) => ({
      ...current,
      mediaKit: {
        ...(current.mediaKit || {}),
        [key]: value,
      } as MediaKitProfile,
    }));
  };

  const setMetricField = (
    key: MetricKey,
    index: number,
    field: keyof MediaKitMetric,
    value: string,
  ) => {
    setProfileForm((current) => ({
      ...current,
      mediaKit: {
        ...(current.mediaKit || {}),
        [key]: safeArr(current.mediaKit?.[key]).map((item: any, itemIndex: number) =>
          itemIndex === index ? { ...item, [field]: value } : item,
        ),
      } as MediaKitProfile,
    }));
  };

  const setOfferingField = (index: number, field: keyof MediaKitOffer, value: string) => {
    setProfileForm((current) => ({
      ...current,
      mediaKit: {
        ...(current.mediaKit || {}),
        offerings: safeArr(current.mediaKit?.offerings).map((item: any, itemIndex: number) =>
          itemIndex === index ? { ...item, [field]: value } : item,
        ),
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
        [key]: safeArr(current.mediaKit?.[key]).map((item: any, itemIndex: number) => (itemIndex === index ? value : item)),
      } as MediaKitProfile,
    }));
  };

  const addMetric = (key: MetricKey) => {
    setProfileForm((current) => ({
      ...current,
      mediaKit: { ...(current.mediaKit || {}), [key]: [...safeArr(current.mediaKit?.[key]), { label: '', value: '' }] } as MediaKitProfile,
    }));
  };

  const removeMetric = (key: MetricKey, index: number) => {
    setProfileForm((current) => ({
      ...current,
      mediaKit: { ...(current.mediaKit || {}), [key]: safeArr(current.mediaKit?.[key]).filter((_: any, i: number) => i !== index) } as MediaKitProfile,
    }));
  };

  const addStringListItem = (key: 'aboutParagraphs' | 'topicTags' | 'portfolioImages' | 'trustedBrands') => {
    setProfileForm((current) => ({
      ...current,
      mediaKit: { ...(current.mediaKit || {}), [key]: [...safeArr(current.mediaKit?.[key]), ''] } as MediaKitProfile,
    }));
  };

  const removeStringListItem = (key: 'aboutParagraphs' | 'topicTags' | 'portfolioImages' | 'trustedBrands', index: number) => {
    setProfileForm((current) => ({
      ...current,
      mediaKit: { ...(current.mediaKit || {}), [key]: safeArr(current.mediaKit?.[key]).filter((_: any, i: number) => i !== index) } as MediaKitProfile,
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

  const setGoalField = <K extends keyof Goal>(index: number, field: K, value: Goal[K]) => {
    setProfileForm((current) => ({
      ...current,
      goals: safeArr(current.goals).map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const addGoal = () => {
    setProfileForm((current) => ({
      ...current,
      goals: [
        ...safeArr(current.goals),
        {
          id: Math.random().toString(36).substring(7),
          area: '',
          generalGoal: '',
          successMetric: '',
          specificTarget: '',
          timeframe: '',
          status: 'Pendiente',
          priority: 'Media',
          revenueEstimation: 0,
        },
      ],
    }));
  };

  const deleteGoal = (index: number) => {
    setProfileForm((current) => ({
      ...current,
      goals: safeArr(current.goals).filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleSaveGoals = async () => {
    setIsSavingProfile(true);
    try {
      const saved = await updateProfile(profileFormRef.current);
      setProfileForm(saved);
      profileFormRef.current = saved;
      lastSavedProfile.current = JSON.stringify(saved);
      toast.success('Plan Estratégico guardado');
      setIsGoalsModalOpen(false);
    } catch (error) {
      toast.error('Ocurrió un error al guardar');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCancelGoals = () => {
    // Revertir al último estado guardado para descartar cambios
    const reverted = JSON.parse(lastSavedProfile.current);
    setProfileForm(reverted);
    profileFormRef.current = reverted;
    setIsGoalsModalOpen(false);
  };

  const generateHtml = () => {
    const socialLinks = socialProfileFields
      .map((field) => {
        const value = (profileForm.socialProfiles?.[field.key] || '').trim();
        const href = buildSocialHref(field.key, value);
        if (!value || !href) {
          return '';
        }

        return `<a class="pill-link" href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${escapeHtml(
          value,
        )}</a>`;
      })
      .filter(Boolean)
      .join('');

    const insightCards = safeArr(mediaKit.insightStats)
      .filter((item: any) => item?.label?.trim() || item?.value?.trim())
      .map(
        (item) => `
          <article class="metric-card">
            <div class="metric-value">${escapeHtml(item.value || '-')}</div>
            <div class="metric-label">${escapeHtml(item.label || 'Dato')}</div>
          </article>
        `,
      )
      .join('');

    const audienceCards = safeArr(mediaKit.audienceGender)
      .filter((item: any) => item?.label?.trim() || item?.value?.trim())
      .map(
        (item) => `
          <article class="list-card">
            <div class="list-label">${escapeHtml(item.label || 'Segmento')}</div>
            <div class="list-value">${escapeHtml(item.value || '-')}</div>
          </article>
        `,
      )
      .join('');

    const ageCards = safeArr(mediaKit.ageDistribution)
      .filter((item: any) => item?.label?.trim() || item?.value?.trim())
      .map(
        (item) => `
          <article class="list-card">
            <div class="list-label">${escapeHtml(item.label || 'Rango')}</div>
            <div class="list-value">${escapeHtml(item.value || '-')}</div>
          </article>
        `,
      )
      .join('');

    const countryRows = safeArr(mediaKit.topCountries)
      .filter((item: any) => item?.label?.trim() || item?.value?.trim())
      .map(
        (item) => `
          <div class="country-row">
            <span>${escapeHtml(item.label || 'Pais')}</span>
            <strong>${escapeHtml(item.value || '-')}</strong>
          </div>
        `,
      )
      .join('');

    const aboutParagraphs = safeArr(mediaKit.aboutParagraphs)
      .filter((paragraph: any) => paragraph?.trim())
      .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
      .join('');

    const topicTags = safeArr(mediaKit.topicTags)
      .filter((tag: any) => tag?.trim())
      .map((tag) => `<span class="tag">#${escapeHtml(tag.replace(/^#/, ''))}</span>`)
      .join('');

    const portfolioImages = safeArr(mediaKit.portfolioImages)
      .filter((image: any) => image?.trim())
      .map(
        (image, index) => `
          <figure class="portfolio-item">
            <img src="${escapeHtml(image)}" alt="Portfolio ${index + 1}" />
          </figure>
        `,
      )
      .join('');

    const offerings = safeArr(mediaKit.offerings)
      .filter((item: any) => item?.title?.trim() || item?.price?.trim() || item?.description?.trim())
      .map(
        (item) => `
          <article class="offer-card">
            <div class="offer-price">${escapeHtml(item.price || '-')}</div>
            <h3>${escapeHtml(item.title || 'Colaboracion')}</h3>
            <p>${escapeHtml(item.description || '')}</p>
          </article>
        `,
      )
      .join('');

    const trustedBrands = safeArr(mediaKit.trustedBrands)
      .filter((brand: any) => brand?.trim())
      .map((brand) => `<span class="brand-chip">${escapeHtml(brand)}</span>`)
      .join('');
    const nameParts = (profileForm.name || '').trim().split(/\s+/).filter(Boolean);
    const leadingName = nameParts[0] || profileForm.name || '';
    const trailingName = nameParts.slice(1).join(' ');

    const mediaKitHtml = `
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
              <h1>${escapeHtml(leadingName)}${
      trailingName ? ` <span class="accent">${escapeHtml(trailingName)}</span>` : ''
    }</h1>
              <p class="tagline">${escapeHtml(mediaKit.tagline)}</p>
              <div class="pill-row">
                ${socialLinks}
                <a class="pill-link" href="mailto:${escapeHtml(mediaKit.contactEmail)}">${escapeHtml(
      mediaKit.contactEmail,
    )}</a>
                <a class="pill-link primary" href="#" onclick="window.print(); return false;">Descargar PDF</a>
              </div>
            </section>

            <div class="grid two-col">
              <section class="section">
                <div class="about-layout">
                  <img class="about-image" src="${escapeHtml(
                    mediaKit.featuredImage || profileForm.avatar,
                  )}" alt="${escapeHtml(profileForm.name)}" />
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
                  <div>
                    <h2 style="font-size:24px;">Audiencia</h2>
                    <div class="list-grid" style="margin-top:16px;">${audienceCards}</div>
                  </div>
                  <div>
                    <h2 style="font-size:24px;">Rango de Edad</h2>
                    <div class="list-grid" style="margin-top:16px;">${ageCards}</div>
                  </div>
                  <div>
                    <h2 style="font-size:24px;">Top Countries</h2>
                    <div class="country-list" style="margin-top:16px;">${countryRows}</div>
                  </div>
                </div>
              </section>
            </div>

            <section class="section" style="margin-top:24px;">
              <div class="section-head">
                <div>
                  <h2>Portfolio</h2>
                  <p class="section-copy">Seleccion de imagenes y piezas destacadas para mostrar el estilo de trabajo.</p>
                </div>
              </div>
              <div class="portfolio-grid">${portfolioImages}</div>
            </section>

            <section class="section" style="margin-top:24px;">
              <div class="section-head">
                <div>
                  <h2>${escapeHtml(mediaKit.servicesTitle)}</h2>
                  <p class="section-copy">${escapeHtml(mediaKit.servicesDescription)}</p>
                </div>
              </div>
              <div class="offer-grid">${offerings}</div>
            </section>

            <section class="section" style="margin-top:24px;">
              <div class="section-head">
                <div>
                  <h2>${escapeHtml(mediaKit.brandsTitle)}</h2>
                </div>
              </div>
              <div class="brand-row">${trustedBrands}</div>
            </section>

            <section class="section footer-section" style="margin-top:24px;">
              <h2>${escapeHtml(mediaKit.closingTitle)}</h2>
              <p class="section-copy">${escapeHtml(mediaKit.closingDescription)}</p>
              <p style="margin-top:18px;">
                <a href="mailto:${escapeHtml(mediaKit.contactEmail)}">${escapeHtml(
      mediaKit.contactEmail,
    )}</a>
              </p>
              <p class="footer-note">© 2026 ${escapeHtml(profileForm.name)}. ${escapeHtml(
      mediaKit.footerNote,
    )}</p>
            </section>
          </main>
        </body>
      </html>
    `;

    return mediaKitHtml;
  };

  const handleOpenMediaKit = () => {
    const handle = (profileForm.handle || '').trim().replace(/^@/, '');
    if (!handle) return;
    window.open(`/mk/${encodeURIComponent(handle)}`, '_blank');
  };

  return (
    <div className="space-y-5 p-4 pb-6 lg:space-y-6 lg:px-8 lg:pt-4 lg:pb-8">
      <div className="flex h-5 items-center justify-end">
        {saveStatus === 'saving' && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] animate-pulse">
            <Loader2 size={13} className="animate-spin" />
            Guardando...
          </span>
        )}
        {saveStatus === 'saved' && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500">
            <CheckCircle2 size={13} />
            Guardado
          </span>
        )}
      </div>
      <SurfaceCard className="relative overflow-hidden p-6 lg:p-7">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at top left, rgba(201, 111, 91, 0.16), transparent 38%), radial-gradient(circle at 85% 10%, rgba(93, 141, 123, 0.12), transparent 34%), linear-gradient(180deg, var(--surface-card), var(--surface-muted))',
          }}
        />

        <div className="relative">
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
              </div>
            </div>

            <div className="flex w-full shrink-0 flex-col gap-3 sm:max-w-sm xl:w-[22rem]">
              <button
                type="button"
                onClick={() => setIsGoalsModalOpen(true)}
                className="group relative w-full overflow-hidden rounded-[1.35rem] border border-[var(--line-soft)] bg-[var(--surface-card)] p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-16px_var(--btn-glow)] active:scale-95"
                style={{ '--btn-glow': `${accentHex}40` } as React.CSSProperties}
              >
                <div
                  className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: `linear-gradient(135deg, ${accentHex}12 0%, transparent 100%)` }}
                />
                <div className="relative flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
                      style={{ background: accentGradient, color: '#fff' }}
                    >
                      <Target size={22} strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-extrabold tracking-[0.18em] text-[var(--text-secondary)]/80 uppercase">
                        Metas y objetivos
                      </p>
                      <p className="mt-0.5 truncate text-[1.05rem] font-black tracking-tight text-[var(--text-primary)]">
                        Plan Estratégico
                      </p>
                      {safeArr(profileForm.goals).length > 0 && (
                        <p className="mt-1 truncate text-[11px] font-medium text-[var(--text-secondary)]">
                          {`${safeArr(profileForm.goals).length} objetivo${safeArr(profileForm.goals).length > 1 ? 's' : ''} en curso`}
                        </p>
                      )}
                    </div>
                  </div>
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-primary)] transition-transform duration-300 group-hover:translate-x-1"
                  >
                    <ChevronRight size={18} strokeWidth={2.5} style={{ color: accentHex }} />
                  </div>
                </div>
              </button>

              <div className="flex items-center justify-end gap-3">
                <Button
                  accentColor={accentGradient}
                  onClick={handleOpenMediaKit}
                  className="flex-1 justify-center sm:flex-none"
                >
                  <ExternalLink size={16} />
                  Abrir Media Kit
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[1rem] border border-[var(--line-soft)] bg-[var(--surface-card-strong)] px-4 py-4">
              <p className="text-[10px] font-bold tracking-[0.16em] text-[var(--text-secondary)]/80 uppercase">
                Portada
              </p>
              <p className="mt-2 text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
                1
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                Identidad, tagline, contacto y enlaces.
              </p>
            </div>
            <div className="rounded-[1rem] border border-[var(--line-soft)] bg-[var(--surface-card-strong)] px-4 py-4">
              <p className="text-[10px] font-bold tracking-[0.16em] text-[var(--text-secondary)]/80 uppercase">
                Insights
              </p>
              <p className="mt-2 text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
                {configuredStats}
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                Metricas y distribuciones con contenido cargado.
              </p>
            </div>
            <div className="rounded-[1rem] border border-[var(--line-soft)] bg-[var(--surface-card-strong)] px-4 py-4">
              <p className="text-[10px] font-bold tracking-[0.16em] text-[var(--text-secondary)]/80 uppercase">
                Portfolio
              </p>
              <p className="mt-2 text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
                {configuredPortfolio}
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                Imagenes cargadas para la galeria.
              </p>
            </div>
            <div className="rounded-[1rem] border border-[var(--line-soft)] bg-[var(--surface-card-strong)] px-4 py-4">
              <p className="text-[10px] font-bold tracking-[0.16em] text-[var(--text-secondary)]/80 uppercase">
                Marcas y tarifas
              </p>
              <p className="mt-2 text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
                {configuredBrands + configuredOffers}
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                Items cargados entre ofertas y marcas.
              </p>
            </div>
          </div>
        </div>
      </SurfaceCard>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <SurfaceCard className="p-6 lg:p-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Nombre</label>
              <input
                value={profileForm.name || ''}
                onChange={(event) => setProfileField('name', event.target.value)}
                className={fieldClass}
                style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                placeholder="Nombre artistico o profesional"
              />
            </div>
            <div>
              <label className={labelClass}>Handle</label>
              <input
                value={profileForm.handle || ''}
                onChange={(event) => setProfileField('handle', event.target.value)}
                className={fieldClass}
                style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                placeholder="@tuusuario"
              />
            </div>
            <div>
              <label className={labelClass}>Avatar</label>
              <ImageUpload
                value={profileForm.avatar || ''}
                onChange={(url) => setProfileField('avatar', url)}
                category="avatar"
                accentColor={accentHex}
                uploadsEnabled={uploadsEnabled}
                aspectRatio="aspect-square"
                placeholder="Subir avatar"
                className={!uploadsEnabled ? '' : 'max-w-[160px]'}
              />
            </div>
            <div>
              <label className={labelClass}>Periodo visible</label>
              <input
                value={mediaKit.periodLabel || ''}
                onChange={(event) => setMediaKitField('periodLabel', event.target.value)}
                className={fieldClass}
                style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                placeholder="Media Kit - Marzo 2026"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Tagline</label>
              <input
                value={mediaKit.tagline || ''}
                onChange={(event) => setMediaKitField('tagline', event.target.value)}
                className={fieldClass}
                style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                placeholder="Humor, estilo, verticales o posicionamiento"
              />
            </div>
            <div>
              <label className={labelClass}>Email de contacto</label>
              <input
                value={mediaKit.contactEmail || ''}
                onChange={(event) => setMediaKitField('contactEmail', event.target.value)}
                className={fieldClass}
                style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                placeholder="contacto@..."
              />
            </div>
            <div>
              <label className={labelClass}>Texto de actualizacion</label>
              <input
                value={mediaKit.updatedLabel || ''}
                onChange={(event) => setMediaKitField('updatedLabel', event.target.value)}
                className={fieldClass}
                style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                placeholder="Marzo 2026"
              />
            </div>
          </div>

          <div className="mt-6 border-t border-[var(--line-soft)] pt-5">
            <p className={labelClass}>Perfiles sociales</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {socialProfileFields.map((field) => (
                <div key={field.key}>
                  <label className={labelClass}>{field.label}</label>
                  <input
                    value={profileForm.socialProfiles?.[field.key] || ''}
                    onChange={(event) => setSocialField(field.key, event.target.value)}
                    className={fieldClass}
                    style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                    placeholder={field.placeholder}
                  />
                </div>
              ))}
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-6 lg:p-7">
          <div className="grid gap-4">
            <div>
              <label className={labelClass}>Imagen principal</label>
              <ImageUpload
                value={mediaKit.featuredImage || ''}
                onChange={(url) => setMediaKitField('featuredImage', url)}
                category="media-kit"
                accentColor={accentHex}
                uploadsEnabled={uploadsEnabled}
                aspectRatio="aspect-video"
                placeholder="Subir portada"
              />
            </div>
            <div>
              <label className={labelClass}>Titulo de presentacion</label>
              <input
                value={mediaKit.aboutTitle || ''}
                onChange={(event) => setMediaKitField('aboutTitle', event.target.value)}
                className={fieldClass}
                style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                placeholder="Hola! Soy..."
              />
            </div>
            <div className="space-y-4">
              {safeArr(mediaKit.aboutParagraphs).map((paragraph: any, index: number) => (
                <div key={index} className="group relative">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-[11px] font-bold tracking-[0.16em] text-[var(--text-secondary)]/80 uppercase">Párrafo {index + 1}</label>
                    <button type="button" onClick={() => removeStringListItem('aboutParagraphs', index)} className="text-[var(--text-secondary)] opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100">
                      <Trash2 size={14} />
                    </button>
                  </div>
                <textarea
                  value={typeof paragraph === 'string' ? paragraph : ''}
                  onChange={(event) =>
                    setStringListField('aboutParagraphs', index, event.target.value)
                  }
                  className={textareaClass}
                  style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                  placeholder="Describe tu voz, tu universo y como trabajas con marcas."
                />
                </div>
              ))}
              <button type="button" onClick={() => addStringListItem('aboutParagraphs')} className="mt-2 flex items-center gap-1.5 text-sm font-bold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
                <Plus size={14} /> Añadir párrafo
              </button>
            </div>
            <div>
              <p className={labelClass}>Tags</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {safeArr(mediaKit.topicTags).map((tag: any, index: number) => (
                  <div key={index} className="group relative">
                    <input
                      value={typeof tag === 'string' ? tag : ''}
                      onChange={(event) => setStringListField('topicTags', index, event.target.value)}
                      className={fieldClass}
                      style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                      placeholder={`#Tag${index + 1}`}
                    />
                    <button type="button" onClick={() => removeStringListItem('topicTags', index)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => addStringListItem('topicTags')} className="mt-3 flex items-center gap-1.5 text-sm font-bold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
                <Plus size={14} /> Añadir tag
              </button>
            </div>
          </div>
        </SurfaceCard>
      </div>

      <SurfaceCard className="p-6 lg:p-7">
        <div className="grid gap-6">
          <div>
            <p className={labelClass}>Metricas principales</p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {safeArr(mediaKit.insightStats).map((item: any, index: number) => (
                <div
                  key={index}
                  className="group relative rounded-[1rem] border border-[var(--line-soft)] bg-[var(--surface-muted)] p-4"
                >
                  <button
                    type="button"
                    onClick={() => removeMetric('insightStats', index)}
                    className="absolute right-3 top-3 text-[var(--text-secondary)] opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                  <label className={labelClass}>Etiqueta</label>
                  <input
                    value={item?.label || ''}
                    onChange={(event) =>
                      setMetricField('insightStats', index, 'label', event.target.value)
                    }
                    className={fieldClass}
                    style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                    placeholder="Seguidores"
                  />
                  <label className={`${labelClass} mt-4`}>Valor</label>
                  <input
                    value={item?.value || ''}
                    onChange={(event) =>
                      setMetricField('insightStats', index, 'value', event.target.value)
                    }
                    className={fieldClass}
                    style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                    placeholder="22K"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => addMetric('insightStats')}
                className="flex min-h-[120px] items-center justify-center rounded-[1rem] border border-dashed border-[var(--line-soft)] bg-[var(--surface-card)] text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
              >
                <div className="flex flex-col items-center gap-2">
                  <Plus size={20} />
                  <span className="text-sm font-bold">Añadir métrica</span>
                </div>
              </button>
            </div>
          </div>

          <div>
            <p className={labelClass}>Audiencia</p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {safeArr(mediaKit.audienceGender).map((item: any, index: number) => (
                <div
                  key={index}
                  className="group relative rounded-[1rem] border border-[var(--line-soft)] bg-[var(--surface-muted)] p-4"
                >
                  <button
                    type="button"
                    onClick={() => removeMetric('audienceGender', index)}
                    className="absolute right-3 top-3 text-[var(--text-secondary)] opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                  <label className={labelClass}>Segmento</label>
                  <input
                    value={item?.label || ''}
                    onChange={(event) =>
                      setMetricField('audienceGender', index, 'label', event.target.value)
                    }
                    className={fieldClass}
                    style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                    placeholder=""
                  />
                  <label className={`${labelClass} mt-4`}>Valor</label>
                  <input
                    value={item?.value || ''}
                    onChange={(event) =>
                      setMetricField('audienceGender', index, 'value', event.target.value)
                    }
                    className={fieldClass}
                    style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                    placeholder=""
                  />
                </div>
              ))}
              <button type="button" onClick={() => addMetric('audienceGender')} className="flex min-h-[120px] items-center justify-center rounded-[1rem] border border-dashed border-[var(--line-soft)] bg-[var(--surface-card)] text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]">
                <div className="flex flex-col items-center gap-2">
                  <Plus size={16} />
                  <span className="text-sm font-bold">Añadir segmento</span>
                </div>
              </button>
            </div>
          </div>

          <div>
            <p className={labelClass}>Rangos de edad</p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {safeArr(mediaKit.ageDistribution).map((item: any, index: number) => (
                <div
                  key={index}
                  className="group relative rounded-[1rem] border border-[var(--line-soft)] bg-[var(--surface-muted)] p-4"
                >
                  <button
                    type="button"
                    onClick={() => removeMetric('ageDistribution', index)}
                    className="absolute right-3 top-3 text-[var(--text-secondary)] opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                  <label className={labelClass}>Rango</label>
                  <input
                    value={item?.label || ''}
                    onChange={(event) =>
                      setMetricField('ageDistribution', index, 'label', event.target.value)
                    }
                    className={fieldClass}
                    style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                    placeholder=""
                  />
                  <label className={`${labelClass} mt-4`}>Valor</label>
                  <input
                    value={item?.value || ''}
                    onChange={(event) =>
                      setMetricField('ageDistribution', index, 'value', event.target.value)
                    }
                    className={fieldClass}
                    style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                    placeholder=""
                  />
                </div>
              ))}
              <button type="button" onClick={() => addMetric('ageDistribution')} className="flex min-h-[120px] items-center justify-center rounded-[1rem] border border-dashed border-[var(--line-soft)] bg-[var(--surface-card)] text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]">
                <div className="flex flex-col items-center gap-2">
                  <Plus size={16} />
                  <span className="text-sm font-bold">Añadir rango</span>
                </div>
              </button>
            </div>
          </div>

          <div>
            <p className={labelClass}>Top countries</p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {safeArr(mediaKit.topCountries).map((item: any, index: number) => (
                <div
                  key={index}
                  className="group relative rounded-[1rem] border border-[var(--line-soft)] bg-[var(--surface-muted)] p-4"
                >
                  <button
                    type="button"
                    onClick={() => removeMetric('topCountries', index)}
                    className="absolute right-3 top-3 text-[var(--text-secondary)] opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                  <label className={labelClass}>Pais</label>
                  <input
                    value={item?.label || ''}
                    onChange={(event) =>
                      setMetricField('topCountries', index, 'label', event.target.value)
                    }
                    className={fieldClass}
                    style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                    placeholder=""
                  />
                  <label className={`${labelClass} mt-4`}>Valor</label>
                  <input
                    value={item?.value || ''}
                    onChange={(event) =>
                      setMetricField('topCountries', index, 'value', event.target.value)
                    }
                    className={fieldClass}
                    style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                    placeholder=""
                  />
                </div>
              ))}
              <button type="button" onClick={() => addMetric('topCountries')} className="flex min-h-[120px] items-center justify-center rounded-[1rem] border border-dashed border-[var(--line-soft)] bg-[var(--surface-card)] text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]">
                <div className="flex flex-col items-center gap-2">
                  <Plus size={16} />
                  <span className="text-sm font-bold">Añadir país</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </SurfaceCard>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
        <SurfaceCard className="p-6 lg:p-7">
          <p className={labelClass}>Imagenes del portfolio</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {safeArr(mediaKit.portfolioImages).map((image: any, index: number) => (
              <div key={index} className="group relative">
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-[11px] font-bold tracking-[0.16em] text-[var(--text-secondary)]/80 uppercase">Imagen {index + 1}</label>
                  <button type="button" onClick={() => removeStringListItem('portfolioImages', index)} className="text-[var(--text-secondary)] opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100">
                    <Trash2 size={14} />
                  </button>
                </div>
                <ImageUpload
                  value={typeof image === 'string' ? image : ''}
                  onChange={(url) => setStringListField('portfolioImages', index, url)}
                  category="portfolio"
                  accentColor={accentHex}
                  uploadsEnabled={uploadsEnabled}
                  aspectRatio="aspect-[4/3]"
                  placeholder={`Imagen ${index + 1}`}
                />
              </div>
            ))}
          </div>
          <button type="button" onClick={() => addStringListItem('portfolioImages')} className="mt-3 flex items-center gap-1.5 text-sm font-bold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
            <Plus size={14} /> Añadir imagen
          </button>
        </SurfaceCard>

        <SurfaceCard className="p-6 lg:p-7">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
            <div>
              <label className={labelClass}>Titulo del bloque de marcas</label>
              <input
                value={mediaKit.brandsTitle || ''}
                onChange={(event) => setMediaKitField('brandsTitle', event.target.value)}
                className={fieldClass}
                style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                placeholder=""
              />
            </div>
            <div className="rounded-[1rem] border border-[var(--line-soft)] bg-[var(--surface-muted)] px-4 py-4">
              <p className="text-[10px] font-bold tracking-[0.16em] text-[var(--text-secondary)]/80 uppercase">
                Marcas cargadas
              </p>
              <p className="mt-2 text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
                {configuredBrands}
                <span className="ml-1 text-sm font-medium text-[var(--text-secondary)]">
                  / {partners.length} en directorio
                </span>
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {safeArr(mediaKit.trustedBrands).map((brand: any, index: number) => (
              <div key={index} className="group relative">
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-[11px] font-bold tracking-[0.16em] text-[var(--text-secondary)]/80 uppercase">Marca {index + 1}</label>
                  <button type="button" onClick={() => removeStringListItem('trustedBrands', index)} className="text-[var(--text-secondary)] opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100">
                    <Trash2 size={14} />
                  </button>
                </div>
                <BrandInput
                  value={typeof brand === 'string' ? brand : ''}
                  onChange={(val) => setStringListField('trustedBrands', index, val)}
                  partners={partners}
                  onCreateInDirectory={async (name) => {
                    await addPartner({ name, status: 'Prospecto', contacts: [] } as any);
                    toast.success(`${name} añadida al directorio`);
                  }}
                  accentColor={accentHex}
                />
              </div>
            ))}
          </div>
          <button type="button" onClick={() => addStringListItem('trustedBrands')} className="mt-3 flex items-center gap-1.5 text-sm font-bold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
            <Plus size={14} /> Añadir marca
          </button>
        </SurfaceCard>

        <SurfaceCard className="p-6 lg:p-7">
          <div className="grid gap-6">
            <div>
              <label className={labelClass}>Titulo del bloque de tarifas</label>
              <input
                value={mediaKit.servicesTitle || ''}
                onChange={(event) => setMediaKitField('servicesTitle', event.target.value)}
                className={fieldClass}
                style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                placeholder=""
              />
            </div>
            <div>
              <label className={labelClass}>Descripcion del bloque de tarifas</label>
              <textarea
                value={mediaKit.servicesDescription || ''}
                onChange={(event) => setMediaKitField('servicesDescription', event.target.value)}
                className={textareaClass}
                style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                placeholder=""
              />
            </div>

            <div className="grid gap-4">
              {safeArr(mediaKit.offerings).map((offering: any, index: number) => (
                <div
                  key={index}
                  className="group relative rounded-[1rem] border border-[var(--line-soft)] bg-[var(--surface-muted)] p-4"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-[11px] font-bold tracking-[0.16em] text-[var(--text-secondary)]/80 uppercase">Oferta {index + 1}</p>
                    <button type="button" onClick={() => removeOffering(index)} className="text-[var(--text-secondary)] opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100"><Trash2 size={14} /></button>
                  </div>
                  <div className="grid gap-4">
                    <input
                      value={offering?.title || ''}
                      onChange={(event) => setOfferingField(index, 'title', event.target.value)}
                      className={fieldClass}
                      style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                      placeholder=""
                    />
                    <input
                      value={offering?.price || ''}
                      onChange={(event) => setOfferingField(index, 'price', event.target.value)}
                      className={fieldClass}
                      style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                      placeholder=""
                    />
                    <textarea
                      value={offering?.description || ''}
                      onChange={(event) =>
                        setOfferingField(index, 'description', event.target.value)
                      }
                      className={textareaClass}
                      style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                      placeholder=""
                    />
                  </div>
                </div>
              ))}
              <button type="button" onClick={addOffering} className="flex min-h-[60px] items-center justify-center gap-2 rounded-[1rem] border border-dashed border-[var(--line-soft)] bg-[var(--surface-card)] text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]">
                <Plus size={16} /> <span className="text-sm font-bold">Añadir oferta</span>
              </button>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-6 lg:p-7">
          <div className="grid gap-4">
            <div>
              <label className={labelClass}>Titulo del cierre</label>
              <input
                value={mediaKit.closingTitle || ''}
                onChange={(event) => setMediaKitField('closingTitle', event.target.value)}
                className={fieldClass}
                style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                placeholder=""
              />
            </div>
            <div>
              <label className={labelClass}>Descripcion del cierre</label>
              <textarea
                value={mediaKit.closingDescription || ''}
                onChange={(event) =>
                  setMediaKitField('closingDescription', event.target.value)
                }
                className={textareaClass}
                style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                placeholder=""
              />
            </div>
            <div>
              <label className={labelClass}>Texto del footer</label>
              <input
                value={mediaKit.footerNote || ''}
                onChange={(event) => setMediaKitField('footerNote', event.target.value)}
                className={fieldClass}
                style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                placeholder=""
              />
            </div>
          </div>
        </SurfaceCard>
      </div>

      {isGoalsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div
            className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-[1.35rem] border bg-[var(--surface-card-strong)] shadow-[var(--shadow-medium)] [border-color:var(--line-soft)] sm:w-[min(1100px,96vw)]"
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: `radial-gradient(circle at top left, var(--accent-soft-strong) 0%, rgba(255,255,255,0.2) 38%, transparent 72%)`,
                opacity: 0.55,
              }}
            />
            <div className="relative border-b px-5 py-5 [border-color:var(--line-soft)] sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
                    Plan Estratégico
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    Define tus metas clave, proyecciones de ingresos y estado general de tus verticales de negocio.
                  </p>
                </div>
                <button type="button" onClick={handleCancelGoals} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--text-secondary)] transition-transform active:scale-95"
                  aria-label="Cerrar modal"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="relative flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <p className="mb-4 text-[13px] font-medium leading-relaxed text-[var(--text-secondary)]">
                <strong className="font-bold text-[var(--text-primary)]">Tip sobre Áreas o Verticales:</strong> Úsalas para categorizar tus distintas líneas de negocio o roles. <span className="opacity-85">Por ejemplo: Creación de contenido, radio, copywriter, host, administrativo.</span>
              </p>
              <div className="grid gap-4">
                {safeArr(profileForm.goals).map((goal: any, index: number) => (
                  <div key={goal?.id || index} className="relative rounded-[1.2rem] border bg-[var(--surface-card)] p-5 shadow-sm [border-color:var(--line-soft)]">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="text-[11px] font-extrabold tracking-[0.16em] text-[var(--text-primary)] uppercase">
                        Meta {index + 1}
                      </h4>
                      <button
                        type="button"
                        onClick={() => deleteGoal(index)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-all hover:bg-rose-50 hover:text-rose-500"
                        title="Eliminar objetivo"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="sm:col-span-1">
                        <label className={labelClass}>Área / Vertical</label>
                        <input
                          value={goal?.area || ''}
                          onChange={(event) => setGoalField(index, 'area', event.target.value)}
                          className={cx(fieldClass, 'bg-[var(--surface-muted)]')}
                          style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                        placeholder=""
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelClass}>Objetivo General</label>
                        <input
                          value={goal?.generalGoal || ''}
                          onChange={(event) => setGoalField(index, 'generalGoal', event.target.value)}
                          className={cx(fieldClass, 'bg-[var(--surface-muted)]')}
                          style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                          placeholder=""
                        />
                      </div>

                      <div className="sm:col-span-1">
                        <label className={labelClass}>Métrica de éxito</label>
                        <input
                          value={goal?.successMetric || ''}
                          onChange={(event) => setGoalField(index, 'successMetric', event.target.value)}
                          className={cx(fieldClass, 'bg-[var(--surface-muted)]')}
                          style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                          placeholder=""
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <label className={labelClass}>Meta específica</label>
                        <input
                          value={goal?.specificTarget || ''}
                          onChange={(event) => setGoalField(index, 'specificTarget', event.target.value)}
                          className={cx(fieldClass, 'bg-[var(--surface-muted)]')}
                          style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                          placeholder=""
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <label className={labelClass}>Plazo</label>
                        <CustomSelect
                          value={goal?.timeframe || '1 año'}
                          onChange={(val) => setGoalField(index, 'timeframe', val)}
                          options={[
                            { value: '1 año', label: '1 año' },
                            { value: '2 años', label: '2 años' },
                            { value: '3 años', label: '3 años' },
                          ]}
                          buttonStyle={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                          buttonClassName="font-medium bg-[var(--surface-muted)]"
                        />
                      </div>

                      <div className="sm:col-span-1">
                        <label className={labelClass}>Estado</label>
                        <CustomSelect
                          value={goal?.status || 'Pendiente'}
                          onChange={(val) => setGoalField(index, 'status', val as GoalStatus)}
                          options={GOAL_STATUSES.map((s) => ({ value: s, label: s }))}
                          buttonStyle={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                          buttonClassName="font-medium bg-[var(--surface-muted)]"
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <label className={labelClass}>Prioridad</label>
                        <CustomSelect
                          value={goal?.priority || 'Media'}
                          onChange={(val) => setGoalField(index, 'priority', val as GoalPriority)}
                          options={GOAL_PRIORITIES.map((s) => ({ value: s, label: s }))}
                          buttonStyle={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                          buttonClassName="font-medium bg-[var(--surface-muted)]"
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <label className={labelClass}>Est. Ingresos (USD)</label>
                        <input
                          type="number"
                          value={goal?.revenueEstimation ?? ''}
                          onChange={(event) => setGoalField(index, 'revenueEstimation', Number(event.target.value))}
                          className={cx(fieldClass, 'bg-[var(--surface-muted)]')}
                          style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
                          placeholder=""
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative border-t px-5 py-4 [border-color:var(--line-soft)] sm:px-6">
              <div className="flex flex-col gap-3">
                <Button
                  tone="secondary"
                  onClick={addGoal}
                  disabled={safeArr(profileForm.goals).length >= 10}
                  className="w-full"
                >
                  Agregar objetivo
                </Button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCancelGoals}
                    className="flex-1 rounded-[1rem] border border-[var(--line-soft)] bg-transparent px-4 py-3 text-sm font-bold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-muted)]/50"
                  >
                    Cancelar
                  </button>
                  <Button
                    accentColor={accentGradient}
                    onClick={handleSaveGoals}
                    disabled={isSavingProfile}
                    className="flex-1"
                  >
                    <Save size={16} />
                    {isSavingProfile ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── BrandInput – autocomplete with directory suggestions ── */

function BrandInput({
  value,
  onChange,
  partners,
  onCreateInDirectory,
  accentColor,
}: {
  value: string;
  onChange: (v: string) => void;
  partners: Partner[];
  onCreateInDirectory: (name: string) => void;
  accentColor: string;
}) {
  const [focused, setFocused] = useState(false);
  const [creatingBrand, setCreatingBrand] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputVal = value.trim().toLowerCase();

  const suggestions = inputVal.length > 0
    ? partners.filter((p) => p.name.toLowerCase().includes(inputVal) && p.name.toLowerCase() !== inputVal)
    : partners;

  const exactMatch = partners.some((p) => p.name.toLowerCase() === inputVal);
  const showDropdown = focused && (suggestions.length > 0 || (inputVal.length > 0 && !exactMatch));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleCreate = async () => {
    setCreatingBrand(true);
    try {
      await onCreateInDirectory(value.trim());
    } finally {
      setCreatingBrand(false);
      setFocused(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        className={fieldClass}
        style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
        placeholder=""
      />
      {showDropdown && (
        <div className="absolute z-[100] mt-2 max-h-52 w-full overflow-auto rounded-[1rem] border bg-[var(--surface-card-strong)] p-1.5 shadow-[var(--shadow-medium)] animate-in fade-in zoom-in-95 duration-100 [border-color:var(--line-soft)]">
          {suggestions.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(p.name); setFocused(false); }}
              className="flex w-full items-center rounded-[0.75rem] px-3 py-2.5 text-left text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)]/60 hover:text-[var(--text-primary)]"
            >
              {p.name}
            </button>
          ))}
          {inputVal.length > 0 && !exactMatch && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCreate}
              disabled={creatingBrand}
              className="flex w-full items-center gap-2 rounded-[0.75rem] px-3 py-2.5 text-left text-sm font-bold transition-colors hover:bg-[var(--surface-muted)]/60"
              style={{ color: accentColor }}
            >
              <FolderPlus size={14} />
              {creatingBrand ? 'Creando...' : `Crear "${value.trim()}" en directorio`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
