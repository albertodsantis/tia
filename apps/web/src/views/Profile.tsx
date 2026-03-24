import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  BriefcaseBusiness,
  Download,
  Eye,
  Image,
  Save,
  Sparkles,
  Target,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import type { MediaKitMetric, MediaKitOffer, SocialProfiles, UserProfile } from '@shared';
import { useAppContext } from '../context/AppContext';
import { Button, SurfaceCard, ModalPanel } from '../components/ui';
import { toast } from '../lib/toast';

const fieldClass =
  'w-full rounded-[1rem] border border-[var(--line-soft)] bg-[var(--surface-card-strong)] px-4 py-3.5 text-sm font-medium text-[var(--text-primary)] transition-all placeholder:text-[var(--text-secondary)]/70 focus:outline-none focus:ring-2';

const textareaClass = `${fieldClass} min-h-[116px] resize-y leading-6`;

const socialProfileFields: Array<{
  key: keyof SocialProfiles;
  label: string;
  placeholder: string;
}> = [
  { key: 'instagram', label: 'Instagram', placeholder: '@tuinstagram' },
  { key: 'tiktok', label: 'TikTok', placeholder: '@tutiktok' },
  { key: 'x', label: 'X', placeholder: '@tuusuario' },
  { key: 'threads', label: 'Threads', placeholder: '@tuperfil' },
  { key: 'youtube', label: 'YouTube', placeholder: 'youtube.com/@tucanal' },
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

function getFilledCount(values: string[]) {
  return values.filter((value) => value.trim()).length;
}

function getFilledMetricCount(values: MediaKitMetric[]) {
  return values.filter((item) => item.label.trim() || item.value.trim()).length;
}

function getFilledOfferCount(values: MediaKitOffer[]) {
  return values.filter(
    (item) => item.title.trim() || item.price.trim() || item.description.trim(),
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
    <div className="flex items-start gap-3">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.95rem]"
        style={{ backgroundColor: `${accentColor}14`, color: accentColor }}
      >
        <Icon size={19} strokeWidth={2.4} />
      </div>
      <div>
        <p className="text-[11px] font-bold tracking-[0.18em] text-[var(--text-secondary)]/80 uppercase">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-bold text-[var(--text-primary)]">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function Profile() {
  const { profile, accentColor, updateProfile } = useAppContext();
  const [profileForm, setProfileForm] = useState<UserProfile>(profile);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  useEffect(() => {
    setProfileForm(profile);
  }, [profile]);

  const mediaKit = profileForm.mediaKit;
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
        ...current.socialProfiles,
        [key]: value,
      },
    }));
  };

  const setMediaKitField = <K extends keyof UserProfile['mediaKit']>(
    key: K,
    value: UserProfile['mediaKit'][K],
  ) => {
    setProfileForm((current) => ({
      ...current,
      mediaKit: {
        ...current.mediaKit,
        [key]: value,
      },
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
        ...current.mediaKit,
        [key]: current.mediaKit[key].map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item,
        ),
      },
    }));
  };

  const setOfferingField = (index: number, field: keyof MediaKitOffer, value: string) => {
    setProfileForm((current) => ({
      ...current,
      mediaKit: {
        ...current.mediaKit,
        offerings: current.mediaKit.offerings.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item,
        ),
      },
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
        ...current.mediaKit,
        [key]: current.mediaKit[key].map((item, itemIndex) => (itemIndex === index ? value : item)),
      },
    }));
  };

  const setGoalField = (index: number, value: string) => {
    setProfileForm((current) => ({
      ...current,
      goals: current.goals.map((item, itemIndex) => (itemIndex === index ? value : item)),
    }));
  };

  const addGoal = () => {
    setProfileForm((current) => ({
      ...current,
      goals: [...current.goals, ''],
    }));
  };

  const deleteGoal = (index: number) => {
    setProfileForm((current) => ({
      ...current,
      goals: current.goals.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);

    try {
      await updateProfile(profileForm);
      toast.success('Perfil guardado correctamente');
    } catch (error) {
      toast.error('Ocurrió un error al guardar');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const generateHtml = (autoPrint = false) => {
    const socialLinks = socialProfileFields
      .map((field) => {
        const value = profileForm.socialProfiles[field.key].trim();
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

    const insightCards = mediaKit.insightStats
      .filter((item) => item.label.trim() || item.value.trim())
      .map(
        (item) => `
          <article class="metric-card">
            <div class="metric-value">${escapeHtml(item.value || '-')}</div>
            <div class="metric-label">${escapeHtml(item.label || 'Dato')}</div>
          </article>
        `,
      )
      .join('');

    const audienceCards = mediaKit.audienceGender
      .filter((item) => item.label.trim() || item.value.trim())
      .map(
        (item) => `
          <article class="list-card">
            <div class="list-label">${escapeHtml(item.label || 'Segmento')}</div>
            <div class="list-value">${escapeHtml(item.value || '-')}</div>
          </article>
        `,
      )
      .join('');

    const ageCards = mediaKit.ageDistribution
      .filter((item) => item.label.trim() || item.value.trim())
      .map(
        (item) => `
          <article class="list-card">
            <div class="list-label">${escapeHtml(item.label || 'Rango')}</div>
            <div class="list-value">${escapeHtml(item.value || '-')}</div>
          </article>
        `,
      )
      .join('');

    const countryRows = mediaKit.topCountries
      .filter((item) => item.label.trim() || item.value.trim())
      .map(
        (item) => `
          <div class="country-row">
            <span>${escapeHtml(item.label || 'Pais')}</span>
            <strong>${escapeHtml(item.value || '-')}</strong>
          </div>
        `,
      )
      .join('');

    const aboutParagraphs = mediaKit.aboutParagraphs
      .filter((paragraph) => paragraph.trim())
      .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
      .join('');

    const topicTags = mediaKit.topicTags
      .filter((tag) => tag.trim())
      .map((tag) => `<span class="tag">#${escapeHtml(tag.replace(/^#/, ''))}</span>`)
      .join('');

    const portfolioImages = mediaKit.portfolioImages
      .filter((image) => image.trim())
      .map(
        (image, index) => `
          <figure class="portfolio-item">
            <img src="${escapeHtml(image)}" alt="Portfolio ${index + 1}" />
          </figure>
        `,
      )
      .join('');

    const offerings = mediaKit.offerings
      .filter((item) => item.title.trim() || item.price.trim() || item.description.trim())
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

    const trustedBrands = mediaKit.trustedBrands
      .filter((brand) => brand.trim())
      .map((brand) => `<span class="brand-chip">${escapeHtml(brand)}</span>`)
      .join('');
    const nameParts = profileForm.name.trim().split(/\s+/).filter(Boolean);
    const leadingName = nameParts[0] || profileForm.name;
    const trailingName = nameParts.slice(1).join(' ');

    const autoPrintScript = autoPrint ? '<script>window.onload = () => window.print();</script>' : '';

    const mediaKitHtml = `
      <html>
        <head>
          <title>Media kit - ${escapeHtml(profileForm.name)}</title>
          <style>
            :root { --accent: ${accentColor}; --text: #1f2937; --muted: #64748b; --surface: #ffffff; --soft: #f8fafc; --line: rgba(148, 163, 184, 0.22); }
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
          ${autoPrintScript}
        </body>
      </html>
    `;

    return mediaKitHtml;
  };

  const handleGenerateMediaKit = () => {
    const mediaKitHtml = generateHtml(true);
    const blob = new Blob([mediaKitHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-5 p-4 pb-6 lg:space-y-6 lg:px-8 lg:pt-4 lg:pb-8">
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
              <img
                src={profileForm.avatar}
                alt={profileForm.name}
                className="h-24 w-24 shrink-0 rounded-[1.25rem] border border-white/70 object-cover shadow-[0_22px_42px_-24px_rgba(63,43,34,0.38)]"
              />
              <div className="min-w-0">
                <h1 className="mt-2 text-[1.75rem] font-extrabold tracking-tight text-[var(--text-primary)] lg:text-[2.15rem]">
                  {profileForm.name}
                </h1>
                <p className="mt-2 text-sm font-semibold text-[var(--text-secondary)]">
                  {profileForm.handle}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setIsGoalsModalOpen(true)}
                className="w-full rounded-[1.2rem] border-2 border-dashed p-4 transition-all hover:bg-[var(--surface-muted)]/40 [border-color:var(--accent-border)]"
                style={{ borderColor: `${accentColor}40` }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${accentColor}14`, color: accentColor }}
                    >
                      <Target size={18} strokeWidth={2.4} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold tracking-[0.14em] uppercase text-[var(--text-secondary)]">
                        Objetivos del año
                      </p>
                      <p className="mt-1 text-sm font-bold text-[var(--text-primary)]">
                        {profileForm.goals.filter((g) => g.trim()).length > 0 ? `${profileForm.goals.filter((g) => g.trim()).length} objetivo${profileForm.goals.filter((g) => g.trim()).length > 1 ? 's' : ''} definido${profileForm.goals.filter((g) => g.trim()).length > 1 ? 's' : ''}` : 'Sin definir'}
                      </p>
                    </div>
                  </div>
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-black"
                    style={{ backgroundColor: `${accentColor}14`, color: accentColor }}
                  >
                    +
                  </div>
                </div>
              </button>

              <div className="flex flex-wrap gap-2">
                <Button
                  tone="secondary"
                  onClick={() => void handleSaveProfile()}
                  disabled={isSavingProfile}
                >
                  <Save size={16} />
                  {isSavingProfile ? 'Guardando...' : 'Guardar cambios'}
                </Button>
                <Button tone="secondary" onClick={() => setPreviewHtml(generateHtml(false))}>
                  <Eye size={16} />
                  Vista previa
                </Button>
                <Button accentColor={accentColor} onClick={handleGenerateMediaKit}>
                  <Download size={16} />
                  Generar PDF
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
          <SectionHeader
            icon={Target}
            eyebrow="Portada"
            title="Identidad y contacto"
            description="Estos datos alimentan el bloque superior del media kit."
            accentColor={accentColor}
          />

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Nombre</label>
              <input
                value={profileForm.name}
                onChange={(event) => setProfileField('name', event.target.value)}
                className={fieldClass}
                style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                placeholder="Nombre artistico o profesional"
              />
            </div>
            <div>
              <label className={labelClass}>Handle</label>
              <input
                value={profileForm.handle}
                onChange={(event) => setProfileField('handle', event.target.value)}
                className={fieldClass}
                style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                placeholder="@tuusuario"
              />
            </div>
            <div>
              <label className={labelClass}>Avatar</label>
              <input
                value={profileForm.avatar}
                onChange={(event) => setProfileField('avatar', event.target.value)}
                className={fieldClass}
                style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className={labelClass}>Periodo visible</label>
              <input
                value={mediaKit.periodLabel}
                onChange={(event) => setMediaKitField('periodLabel', event.target.value)}
                className={fieldClass}
                style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                placeholder="Media Kit - Marzo 2026"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Tagline</label>
              <input
                value={mediaKit.tagline}
                onChange={(event) => setMediaKitField('tagline', event.target.value)}
                className={fieldClass}
                style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                placeholder="Humor, estilo, verticales o posicionamiento"
              />
            </div>
            <div>
              <label className={labelClass}>Email de contacto</label>
              <input
                value={mediaKit.contactEmail}
                onChange={(event) => setMediaKitField('contactEmail', event.target.value)}
                className={fieldClass}
                style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                placeholder="contacto@..."
              />
            </div>
            <div>
              <label className={labelClass}>Texto de actualizacion</label>
              <input
                value={mediaKit.updatedLabel}
                onChange={(event) => setMediaKitField('updatedLabel', event.target.value)}
                className={fieldClass}
                style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
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
                    value={profileForm.socialProfiles[field.key]}
                    onChange={(event) => setSocialField(field.key, event.target.value)}
                    className={fieldClass}
                    style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                    placeholder={field.placeholder}
                  />
                </div>
              ))}
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-6 lg:p-7">
          <SectionHeader
            icon={Sparkles}
            eyebrow="Sobre Ti"
            title="Historia y tono"
            description="Equivale al bloque de presentacion, foto principal y tags tematicos."
            accentColor={accentColor}
          />

          <div className="mt-6 grid gap-4">
            <div>
              <label className={labelClass}>Imagen principal</label>
              <input
                value={mediaKit.featuredImage}
                onChange={(event) => setMediaKitField('featuredImage', event.target.value)}
                className={fieldClass}
                style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                placeholder="https://..."
              />
            </div>
            <div className="overflow-hidden rounded-[1.15rem] border border-[var(--line-soft)] bg-[var(--surface-muted)]">
              <img
                src={mediaKit.featuredImage || profileForm.avatar}
                alt={profileForm.name}
                className="h-64 w-full object-cover"
              />
            </div>
            <div>
              <label className={labelClass}>Titulo de presentacion</label>
              <input
                value={mediaKit.aboutTitle}
                onChange={(event) => setMediaKitField('aboutTitle', event.target.value)}
                className={fieldClass}
                style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                placeholder="Hola! Soy..."
              />
            </div>
            {mediaKit.aboutParagraphs.map((paragraph, index) => (
              <div key={index}>
                <label className={labelClass}>Parrafo {index + 1}</label>
                <textarea
                  value={paragraph}
                  onChange={(event) =>
                    setStringListField('aboutParagraphs', index, event.target.value)
                  }
                  className={textareaClass}
                  style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                  placeholder="Describe tu voz, tu universo y como trabajas con marcas."
                />
              </div>
            ))}
            <div>
              <p className={labelClass}>Tags</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {mediaKit.topicTags.map((tag, index) => (
                  <input
                    key={index}
                    value={tag}
                    onChange={(event) => setStringListField('topicTags', index, event.target.value)}
                    className={fieldClass}
                    style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                    placeholder={`Tag ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </SurfaceCard>
      </div>

      <SurfaceCard className="p-6 lg:p-7">
        <SectionHeader
          icon={BarChart3}
          eyebrow="Insights"
          title="Metricas y audiencia"
          description="Replica las piezas de Community Insights, Audiencia, Rangos de edad y Top Countries."
          accentColor={accentColor}
        />

        <div className="mt-6 grid gap-6">
          <div>
            <p className={labelClass}>Metricas principales</p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {mediaKit.insightStats.map((item, index) => (
                <div
                  key={index}
                  className="rounded-[1rem] border border-[var(--line-soft)] bg-[var(--surface-muted)] p-4"
                >
                  <label className={labelClass}>Etiqueta</label>
                  <input
                    value={item.label}
                    onChange={(event) =>
                      setMetricField('insightStats', index, 'label', event.target.value)
                    }
                    className={fieldClass}
                    style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                    placeholder="Seguidores"
                  />
                  <label className={`${labelClass} mt-4`}>Valor</label>
                  <input
                    value={item.value}
                    onChange={(event) =>
                      setMetricField('insightStats', index, 'value', event.target.value)
                    }
                    className={fieldClass}
                    style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                    placeholder="22K"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.68fr)_minmax(0,1.32fr)]">
            <div>
              <p className={labelClass}>Audiencia</p>
              <div className="grid gap-4">
                {mediaKit.audienceGender.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-[1rem] border border-[var(--line-soft)] bg-[var(--surface-muted)] p-4"
                  >
                    <label className={labelClass}>Segmento</label>
                    <input
                      value={item.label}
                      onChange={(event) =>
                        setMetricField('audienceGender', index, 'label', event.target.value)
                      }
                      className={fieldClass}
                      style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                      placeholder="Mujeres"
                    />
                    <label className={`${labelClass} mt-4`}>Valor</label>
                    <input
                      value={item.value}
                      onChange={(event) =>
                        setMetricField('audienceGender', index, 'value', event.target.value)
                      }
                      className={fieldClass}
                      style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                      placeholder="43%"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-6">
              <div>
                <p className={labelClass}>Rangos de edad</p>
                <div className="grid gap-4 md:grid-cols-2">
                  {mediaKit.ageDistribution.map((item, index) => (
                    <div
                      key={index}
                      className="rounded-[1rem] border border-[var(--line-soft)] bg-[var(--surface-muted)] p-4"
                    >
                      <label className={labelClass}>Rango</label>
                      <input
                        value={item.label}
                        onChange={(event) =>
                          setMetricField('ageDistribution', index, 'label', event.target.value)
                        }
                        className={fieldClass}
                        style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                        placeholder="25-34"
                      />
                      <label className={`${labelClass} mt-4`}>Valor</label>
                      <input
                        value={item.value}
                        onChange={(event) =>
                          setMetricField('ageDistribution', index, 'value', event.target.value)
                        }
                        className={fieldClass}
                        style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                        placeholder="41%"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className={labelClass}>Top countries</p>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {mediaKit.topCountries.map((item, index) => (
                    <div
                      key={index}
                      className="rounded-[1rem] border border-[var(--line-soft)] bg-[var(--surface-muted)] p-4"
                    >
                      <label className={labelClass}>Pais</label>
                      <input
                        value={item.label}
                        onChange={(event) =>
                          setMetricField('topCountries', index, 'label', event.target.value)
                        }
                        className={fieldClass}
                        style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                        placeholder="Venezuela"
                      />
                      <label className={`${labelClass} mt-4`}>Valor</label>
                      <input
                        value={item.value}
                        onChange={(event) =>
                          setMetricField('topCountries', index, 'value', event.target.value)
                        }
                        className={fieldClass}
                        style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                        placeholder="43%"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SurfaceCard>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
        <SurfaceCard className="p-6 lg:p-7">
          <SectionHeader
            icon={Image}
            eyebrow="Portfolio"
            title="Galeria y marcas"
            description="Llena la galeria visual y el bloque de marcas que confian en ti."
            accentColor={accentColor}
          />

          <div className="mt-6 grid gap-6">
            <div>
              <p className={labelClass}>Imagenes del portfolio</p>
              <div className="grid gap-4">
                {mediaKit.portfolioImages.map((image, index) => (
                  <div key={index}>
                    <label className={labelClass}>Imagen {index + 1}</label>
                    <input
                      value={image}
                      onChange={(event) =>
                        setStringListField('portfolioImages', index, event.target.value)
                      }
                      className={fieldClass}
                      style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                      placeholder={`https://.../${index + 1}.jpg`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {mediaKit.portfolioImages.map((image, index) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-[1rem] border border-[var(--line-soft)] bg-[var(--surface-muted)]"
                >
                  {image.trim() ? (
                    <img
                      src={image}
                      alt={`Portfolio ${index + 1}`}
                      className="h-36 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-36 items-center justify-center text-sm font-medium text-[var(--text-secondary)]">
                      Slot {index + 1}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-[var(--line-soft)] pt-5">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
                <div>
                  <label className={labelClass}>Titulo del bloque de marcas</label>
                  <input
                    value={mediaKit.brandsTitle}
                    onChange={(event) => setMediaKitField('brandsTitle', event.target.value)}
                    className={fieldClass}
                    style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                    placeholder="Marcas que confian en mi"
                  />
                </div>
                <div className="rounded-[1rem] border border-[var(--line-soft)] bg-[var(--surface-muted)] px-4 py-4">
                  <p className="text-[10px] font-bold tracking-[0.16em] text-[var(--text-secondary)]/80 uppercase">
                    Marcas cargadas
                  </p>
                  <p className="mt-2 text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
                    {configuredBrands}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {mediaKit.trustedBrands.map((brand, index) => (
                  <div key={index}>
                    <label className={labelClass}>Marca {index + 1}</label>
                    <input
                      value={brand}
                      onChange={(event) =>
                        setStringListField('trustedBrands', index, event.target.value)
                      }
                      className={fieldClass}
                      style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                      placeholder="Nombre de la marca"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-6 lg:p-7">
          <SectionHeader
            icon={BriefcaseBusiness}
            eyebrow="Colaboraciones"
            title="Ofertas y cierre"
            description="Cubre la grilla de tarifas y el bloque final de contacto del media kit."
            accentColor={accentColor}
          />

          <div className="mt-6 grid gap-6">
            <div>
              <label className={labelClass}>Titulo del bloque de tarifas</label>
              <input
                value={mediaKit.servicesTitle}
                onChange={(event) => setMediaKitField('servicesTitle', event.target.value)}
                className={fieldClass}
                style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                placeholder="Trabajemos juntos!"
              />
            </div>
            <div>
              <label className={labelClass}>Descripcion del bloque de tarifas</label>
              <textarea
                value={mediaKit.servicesDescription}
                onChange={(event) => setMediaKitField('servicesDescription', event.target.value)}
                className={textareaClass}
                style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                placeholder="Describe como colaborar contigo y que esperar de la propuesta."
              />
            </div>

            <div className="grid gap-4">
              {mediaKit.offerings.map((offering, index) => (
                <div
                  key={index}
                  className="rounded-[1rem] border border-[var(--line-soft)] bg-[var(--surface-muted)] p-4"
                >
                  <p className={labelClass}>Oferta {index + 1}</p>
                  <div className="grid gap-4">
                    <input
                      value={offering.title}
                      onChange={(event) => setOfferingField(index, 'title', event.target.value)}
                      className={fieldClass}
                      style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                      placeholder="Nombre del formato"
                    />
                    <input
                      value={offering.price}
                      onChange={(event) => setOfferingField(index, 'price', event.target.value)}
                      className={fieldClass}
                      style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                      placeholder="$550"
                    />
                    <textarea
                      value={offering.description}
                      onChange={(event) =>
                        setOfferingField(index, 'description', event.target.value)
                      }
                      className={textareaClass}
                      style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                      placeholder="Describe el entregable o la colaboracion."
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[var(--line-soft)] pt-5">
              <div className="grid gap-4">
                <div>
                  <label className={labelClass}>Titulo del cierre</label>
                  <input
                    value={mediaKit.closingTitle}
                    onChange={(event) => setMediaKitField('closingTitle', event.target.value)}
                    className={fieldClass}
                    style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                    placeholder="Let's create magic."
                  />
                </div>
                <div>
                  <label className={labelClass}>Descripcion del cierre</label>
                  <textarea
                    value={mediaKit.closingDescription}
                    onChange={(event) =>
                      setMediaKitField('closingDescription', event.target.value)
                    }
                    className={textareaClass}
                    style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                    placeholder="Cierre final y llamada a la accion."
                  />
                </div>
                <div>
                  <label className={labelClass}>Texto del footer</label>
                  <input
                    value={mediaKit.footerNote}
                    onChange={(event) => setMediaKitField('footerNote', event.target.value)}
                    className={fieldClass}
                    style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                    placeholder="Todos los derechos reservados."
                  />
                </div>
              </div>
            </div>
          </div>
        </SurfaceCard>
      </div>

      {isGoalsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div
            className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-[1.35rem] border bg-[var(--surface-card-strong)] shadow-[var(--shadow-medium)] [border-color:var(--line-soft)] sm:w-[min(680px,92vw)]"
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
                    Objetivos del año
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    Define 3 o 4 objetivos clave que guíen tu estrategia de contenido este año.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGoalsModalOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--text-secondary)] transition-transform active:scale-95"
                  aria-label="Cerrar modal"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="relative flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="grid gap-4">
                {profileForm.goals.map((goal, index) => (
                  <div key={index} className="group">
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <label className={labelClass}>Objetivo {index + 1}</label>
                        <input
                          value={goal}
                          onChange={(event) => setGoalField(index, event.target.value)}
                          className={fieldClass}
                          style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                          placeholder="Escribe un objetivo..."
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteGoal(index)}
                        className="mb-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50/80 text-rose-500 transition-all hover:bg-rose-100 active:scale-95"
                        title="Eliminar objetivo"
                      >
                        <Trash2 size={16} />
                      </button>
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
                  disabled={profileForm.goals.length >= 5}
                  className="w-full"
                >
                  Agregar objetivo
                </Button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsGoalsModalOpen(false)}
                    className="flex-1 rounded-[1rem] border border-[var(--line-soft)] bg-transparent px-4 py-3 text-sm font-bold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-muted)]/50"
                  >
                    Cancelar
                  </button>
                  <Button
                    accentColor={accentColor}
                    onClick={async () => {
                      await handleSaveProfile();
                      setIsGoalsModalOpen(false);
                    }}
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

      {previewHtml && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm sm:p-6 animate-in fade-in duration-200">
          <div className="relative flex h-full w-full max-w-[1100px] flex-col overflow-hidden rounded-2xl bg-[var(--surface-card)] shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[var(--line-soft)] px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Vista Previa</h3>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                  Así se verá tu Media Kit al exportarlo
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button accentColor={accentColor} onClick={handleGenerateMediaKit}>
                  <Download size={16} />
                  Generar PDF
                </Button>
                <button
                  type="button"
                  onClick={() => setPreviewHtml(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--text-secondary)] transition-transform active:scale-95"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden bg-slate-50 dark:bg-slate-900/50">
              <iframe
                srcDoc={previewHtml}
                className="h-full w-full border-none"
                title="Previsualización del Media Kit"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
