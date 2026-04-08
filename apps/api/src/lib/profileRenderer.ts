import type { EfiProfile, SocialProfiles } from '@shared';

// ─── HTML escape ──────────────────────────────────────────────────────────────

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Accent resolution ────────────────────────────────────────────────────────

const GRADIENT_PRESETS: Record<string, { gradient: string; representative: string }> = {
  instagram: {
    gradient: 'linear-gradient(135deg, #FCAF45, #F56040, #E1306C, #833AB4)',
    representative: '#E1306C',
  },
  dawn: {
    gradient: 'linear-gradient(180deg, #FF4E36 0%, #FFA100 45%, #FFD93D 100%)',
    representative: '#FFA100',
  },
};

const CONIC_PRESETS: Record<string, { conic: string; representative: string }> = {
  tiktok: {
    conic: 'conic-gradient(#25F4EE 0deg 180deg, #FE2C55 180deg 360deg)',
    representative: '#FE2C55',
  },
};

const RETRO_PRESETS: Record<string, { representative: string }> = {
  crt: { representative: '#FFB000' },
};

export interface ResolvedAccent {
  /** The hex to use for --accent CSS variable (solid color fallback) */
  hex: string;
  /** The CSS value to use for gradient buttons/highlights (may be a gradient string) */
  gradient: string;
  /** Whether this is a retro/dark-only theme */
  isRetro: boolean;
  /** Whether the public page should force dark mode */
  forceDark: boolean;
}

export function resolveAccent(accentColor: string): ResolvedAccent {
  if (accentColor.startsWith('gradient:')) {
    const key = accentColor.replace('gradient:', '');
    const preset = GRADIENT_PRESETS[key];
    const hex = preset?.representative ?? '#C96F5B';
    return { hex, gradient: preset?.gradient ?? hex, isRetro: false, forceDark: false };
  }
  if (accentColor.startsWith('conic:')) {
    const key = accentColor.replace('conic:', '');
    const preset = CONIC_PRESETS[key];
    const hex = preset?.representative ?? '#C96F5B';
    return { hex, gradient: preset?.conic ?? hex, isRetro: false, forceDark: false };
  }
  if (accentColor.startsWith('retro:')) {
    const key = accentColor.replace('retro:', '');
    const hex = RETRO_PRESETS[key]?.representative ?? '#FFB000';
    return { hex, gradient: hex, isRetro: true, forceDark: true };
  }
  // plain hex
  return { hex: accentColor, gradient: accentColor, isRetro: false, forceDark: false };
}

// ─── Social platforms ─────────────────────────────────────────────────────────

const SOCIAL_PLATFORMS: Array<{
  key: keyof SocialProfiles;
  label: string;
  base: string;
  icon: string;
}> = [
  {
    key: 'instagram',
    label: 'Instagram',
    base: 'https://instagram.com/',
    icon: '<path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>',
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    base: 'https://www.tiktok.com/@',
    icon: '<path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/>',
  },
  {
    key: 'x',
    label: 'X',
    base: 'https://x.com/',
    icon: '<path d="M4 4l16 16M4 20L20 4"/>',
  },
  {
    key: 'youtube',
    label: 'YouTube',
    base: 'https://youtube.com/@',
    icon: '<path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.54C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75,15.02 15.5,12 9.75,8.98 9.75,15.02"/>',
  },
  {
    key: 'threads',
    label: 'Threads',
    base: 'https://www.threads.net/@',
    icon: '<path d="M19 7.5c-1.333-3-3.667-4.5-7-4.5-5 0-8 3.582-8 9s3.5 9 8 9c3 0 5.5-1 7-4"/><path d="M15 11c-.667-2-2-3-4-3-2.667 0-4 1.667-4 5s1.333 5 4 5c1.5 0 2.833-.5 4-1.5"/>',
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    base: 'https://linkedin.com/in/',
    icon: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>',
  },
];

function buildSocialHref(platform: keyof SocialProfiles, value: string): string {
  const normalized = value.trim();
  if (!normalized) return '';
  if (/^https?:\/\//i.test(normalized)) return normalized;
  const cleanHandle = normalized.replace(/^@/, '');
  const entry = SOCIAL_PLATFORMS.find((p) => p.key === platform);
  return entry ? `${entry.base}${cleanHandle}` : '';
}

function socialIcon(svgPath: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svgPath}</svg>`;
}

function pdfIcon(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 13h6M9 17h6M9 9h1"/></svg>`;
}

function linkIcon(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
}

// ─── Main renderer ────────────────────────────────────────────────────────────

export function generateEfiLinkHtml(params: {
  name: string;
  handle: string;
  tagline: string;
  avatar: string;
  socialProfiles: SocialProfiles;
  efiProfile: EfiProfile;
  accentColor: string;
  forceDark?: boolean;
}): string {
  const { name, handle, tagline, avatar, socialProfiles, efiProfile, accentColor, forceDark = false } = params;
  const accent = resolveAccent(accentColor);
  const isDark = accent.forceDark || forceDark;

  const displayHandle = handle.startsWith('@') ? handle : `@${handle}`;

  // Social links
  const activeSocials = SOCIAL_PLATFORMS.filter((p) => {
    const val = socialProfiles[p.key]?.trim();
    return val && buildSocialHref(p.key, val);
  });

  const socialsHtml = activeSocials.length > 0
    ? `<div class="socials">
        ${activeSocials.map((p) => {
          const href = buildSocialHref(p.key, socialProfiles[p.key]);
          return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="social-icon" aria-label="${escapeHtml(p.label)}" title="${escapeHtml(p.label)}">${socialIcon(p.icon)}</a>`;
        }).join('\n        ')}
      </div>`
    : '';

  // Link buttons
  const activeLinks = efiProfile.links.filter((l) => l.url?.trim() && l.label?.trim());
  const linksHtml = activeLinks.map((link) => `
      <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" class="link-btn">
        <span class="link-icon">${linkIcon()}</span>
        <span class="link-label">${escapeHtml(link.label)}</span>
        <span class="link-arrow">↗</span>
      </a>`).join('\n');

  // PDF button
  const pdfHtml = efiProfile.pdf_url
    ? `<a href="${escapeHtml(efiProfile.pdf_url)}" target="_blank" rel="noopener noreferrer" class="link-btn link-btn--pdf">
        <span class="link-icon">${pdfIcon()}</span>
        <span class="link-label">${escapeHtml(efiProfile.pdf_label || 'Ver mi media kit')}</span>
        <span class="link-arrow">↓</span>
      </a>`
    : '';

  // Avatar
  const avatarHtml = avatar
    ? `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(name)}" class="avatar" />`
    : `<div class="avatar avatar--placeholder">${escapeHtml(name.charAt(0).toUpperCase())}</div>`;

  // Retro CRT overlay
  const crtOverlay = accent.isRetro
    ? `<div class="crt-overlay" aria-hidden="true"></div>`
    : '';

  // Gradient CSS for buttons
  const accentGradientCss = accent.gradient !== accent.hex
    ? `background: ${accent.gradient};`
    : `background: ${accent.hex};`;

  // Background glow derived from accent — stronger for dark mode
  const glowColor = accent.hex;
  const bgGlow = accent.isRetro
    ? `radial-gradient(ellipse 70% 40% at 50% 0%, rgba(255,176,0,0.18) 0%, transparent 70%)`
    : isDark
      ? `radial-gradient(ellipse 90% 60% at 50% -5%, ${glowColor}30 0%, transparent 65%)`
      : `radial-gradient(ellipse 80% 50% at 50% -10%, ${glowColor}28 0%, transparent 65%)`;

  return `<!DOCTYPE html>
<html lang="es"${isDark ? ' data-theme="dark"' : ''}>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(name)} — Efi</title>
  <meta name="description" content="${escapeHtml(tagline || name)}" />
  <meta property="og:title" content="${escapeHtml(name)}" />
  <meta property="og:description" content="${escapeHtml(tagline || name)}" />
  ${avatar ? `<meta property="og:image" content="${escapeHtml(avatar)}" />` : ''}
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --accent: ${escapeHtml(accent.hex)};
      --accent-gradient: ${escapeHtml(accent.gradient)};
      --bg: #0d0d0d;
      --surface: rgba(255,255,255,0.05);
      --surface-hover: rgba(255,255,255,0.08);
      --border: rgba(255,255,255,0.09);
      --border-hover: rgba(255,255,255,0.18);
      --text: #f2f2f2;
      --text-secondary: rgba(242,242,242,0.48);
      --radius: 16px;
      --shadow: 0 2px 16px rgba(0,0,0,0.35);
    }

    ${accent.isRetro ? `
    :root {
      --bg: #0a0700;
      --surface: rgba(255,176,0,0.05);
      --surface-hover: rgba(255,176,0,0.09);
      --border: rgba(255,176,0,0.12);
      --border-hover: rgba(255,176,0,0.28);
      --text: #ffd077;
      --text-secondary: rgba(255,176,0,0.45);
    }
    ` : ''}

    @media (prefers-color-scheme: light) {
      ${isDark ? '' : `
      :root {
        --bg: #f7f7f7;
        --surface: rgba(0,0,0,0.04);
        --surface-hover: rgba(0,0,0,0.07);
        --border: rgba(0,0,0,0.08);
        --border-hover: rgba(0,0,0,0.18);
        --text: #0f0f0f;
        --text-secondary: rgba(15,15,15,0.45);
        --shadow: 0 2px 16px rgba(0,0,0,0.08);
      }
      `}
    }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      min-height: 100dvh;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 56px 20px 96px;
      position: relative;
      -webkit-font-smoothing: antialiased;
    }

    /* ── Background glow ──────────────────────────── */

    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background: ${bgGlow};
      pointer-events: none;
      z-index: 0;
    }

    .page {
      width: 100%;
      max-width: 460px;
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      z-index: 1;
    }

    /* ── Identity ─────────────────────────────────── */

    .identity {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      margin-bottom: 28px;
      text-align: center;
      width: 100%;
    }

    .avatar-wrap {
      position: relative;
      margin-bottom: 4px;
    }

    .avatar-ring {
      position: absolute;
      inset: -3px;
      border-radius: 50%;
      background: ${escapeHtml(accent.gradient)};
      opacity: 0.6;
      filter: blur(6px);
    }

    .avatar {
      position: relative;
      width: 88px;
      height: 88px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid var(--border);
      display: block;
    }

    .avatar--placeholder {
      position: relative;
      width: 88px;
      height: 88px;
      border-radius: 50%;
      ${accentGradientCss}
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 34px;
      font-weight: 700;
      color: #fff;
      letter-spacing: -0.02em;
    }

    .name {
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.03em;
      line-height: 1.15;
    }

    .handle {
      font-size: 0.82rem;
      color: var(--text-secondary);
      font-weight: 500;
      letter-spacing: 0.01em;
    }

    .tagline {
      font-size: 0.9rem;
      color: var(--text-secondary);
      line-height: 1.55;
      max-width: 320px;
      margin-top: 2px;
    }

    /* ── Divider ──────────────────────────────────── */

    .divider {
      width: 100%;
      height: 1px;
      background: ${escapeHtml(accent.gradient)};
      opacity: 0.35;
      margin: 4px 0 20px;
    }

    /* ── Social icons ─────────────────────────────── */

    .socials {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin-bottom: 28px;
      flex-wrap: wrap;
    }

    .social-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text-secondary);
      text-decoration: none;
      transition: color 0.18s, border-color 0.18s, background 0.18s, transform 0.15s;
    }

    .social-icon:hover {
      color: var(--accent);
      border-color: var(--accent);
      background: ${escapeHtml(accent.hex)}18;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px -4px ${escapeHtml(accent.hex)}44;
    }

    /* ── Link buttons ─────────────────────────────── */

    .links {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .link-btn {
      display: flex;
      align-items: center;
      gap: 14px;
      width: 100%;
      padding: 15px 18px;
      background: ${escapeHtml(accent.gradient)};
      border: none;
      border-radius: var(--radius);
      color: #fff;
      text-decoration: none;
      transition: filter 0.18s, transform 0.15s, box-shadow 0.18s;
      position: relative;
      overflow: hidden;
      box-shadow: 0 4px 18px -4px ${escapeHtml(accent.hex)}66;
    }

    .link-btn::after {
      content: '';
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0);
      transition: background 0.18s;
    }

    .link-btn:hover {
      filter: brightness(1.08);
      transform: translateY(-2px);
      box-shadow: 0 8px 28px -6px ${escapeHtml(accent.hex)}80;
    }

    .link-btn:hover::after {
      background: rgba(255,255,255,0.06);
    }

    .link-btn:active {
      transform: translateY(0);
      filter: brightness(0.96);
    }

    .link-icon {
      color: rgba(255,255,255,0.75);
      display: flex;
      align-items: center;
      flex-shrink: 0;
      position: relative;
      z-index: 1;
    }

    .link-label {
      flex: 1;
      font-size: 0.95rem;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      position: relative;
      z-index: 1;
      letter-spacing: -0.01em;
    }

    .link-arrow {
      font-size: 0.85rem;
      color: rgba(255,255,255,0.65);
      flex-shrink: 0;
      position: relative;
      z-index: 1;
      transition: transform 0.15s;
    }

    .link-btn:hover .link-arrow {
      transform: translate(1px, -1px);
    }

    .link-btn--pdf {
      background: var(--surface);
      border: 1.5px dashed var(--accent);
      color: var(--text);
      box-shadow: none;
    }

    .link-btn--pdf .link-icon,
    .link-btn--pdf .link-arrow {
      color: var(--text-secondary);
    }

    .link-btn--pdf:hover {
      border-style: solid;
      background: var(--surface-hover);
      filter: none;
      box-shadow: none;
    }

    /* ── CRT overlay ──────────────────────────────── */

    .crt-overlay {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 9999;
      background:
        repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          rgba(0,0,0,0.07) 2px,
          rgba(0,0,0,0.07) 4px
        );
    }

    /* ── Footer ───────────────────────────────────── */

    .footer {
      margin-top: 48px;
      text-align: center;
    }

    .footer a {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.75rem;
      color: var(--text-secondary);
      text-decoration: none;
      opacity: 0.4;
      transition: opacity 0.15s;
      font-weight: 500;
      letter-spacing: 0.01em;
    }

    .footer a:hover {
      opacity: 0.8;
    }
  </style>
</head>
<body>
  ${crtOverlay}
  <div class="page">
    <div class="identity">
      <div class="avatar-wrap">
        <div class="avatar-ring"></div>
        ${avatarHtml}
      </div>
      <div class="name">${escapeHtml(name)}</div>
      <div class="handle">${escapeHtml(displayHandle)}</div>
      ${tagline ? `<div class="tagline">${escapeHtml(tagline)}</div>` : ''}
    </div>

    ${activeSocials.length > 0 ? socialsHtml : ''}

    <div class="divider"></div>

    <div class="links">
      ${linksHtml}
      ${pdfHtml}
    </div>

    <div class="footer">
      <a href="/" rel="noopener noreferrer">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        Crea tu página con Efi
      </a>
    </div>
  </div>
</body>
</html>`;
}
