import { Router } from 'express';
import type pg from 'pg';
import { createEmptySocialProfiles, createDefaultEfiProfile } from '@shared';
import type { EfiProfile, SocialProfiles } from '@shared';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const SOCIAL_PLATFORMS: Array<{
  key: keyof SocialProfiles;
  label: string;
  base: string;
  icon: string; // inline SVG path
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

function generateEfiLinkHtml(params: {
  name: string;
  handle: string;
  tagline: string;
  avatar: string;
  socialProfiles: SocialProfiles;
  efiProfile: EfiProfile;
  accentColor: string;
}): string {
  const { name, handle, tagline, avatar, socialProfiles, efiProfile, accentColor } = params;

  const displayHandle = handle.startsWith('@') ? handle : `@${handle}`;

  // Accent color for buttons
  const isGradient = accentColor.startsWith('gradient:') || accentColor.startsWith('conic:') || accentColor.startsWith('retro:');
  const accentHex = isGradient ? '#C96F5B' : accentColor;

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

  return `<!DOCTYPE html>
<html lang="es">
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
      --accent: ${escapeHtml(accentHex)};
      --bg: #0f0f0f;
      --surface: #1a1a1a;
      --border: rgba(255,255,255,0.08);
      --text: #f0f0f0;
      --text-secondary: rgba(240,240,240,0.5);
      --radius: 14px;
    }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      min-height: 100dvh;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 48px 16px 80px;
    }

    .page {
      width: 100%;
      max-width: 480px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0;
    }

    /* ── Identity ─────────────────────────────────── */

    .identity {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
      text-align: center;
    }

    .avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid var(--border);
    }

    .avatar--placeholder {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      font-weight: 700;
      color: #fff;
    }

    .name {
      font-size: 1.4rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }

    .handle {
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin-top: -6px;
    }

    .tagline {
      font-size: 0.9rem;
      color: var(--text-secondary);
      line-height: 1.5;
      max-width: 340px;
    }

    /* ── Social icons ─────────────────────────────── */

    .socials {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .social-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text-secondary);
      text-decoration: none;
      transition: color 0.15s, border-color 0.15s, background 0.15s;
    }

    .social-icon:hover {
      color: var(--text);
      border-color: var(--accent);
      background: rgba(255,255,255,0.06);
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
      gap: 12px;
      width: 100%;
      padding: 14px 16px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      color: var(--text);
      text-decoration: none;
      transition: background 0.15s, border-color 0.15s, transform 0.1s;
      cursor: pointer;
    }

    .link-btn:hover {
      background: rgba(255,255,255,0.06);
      border-color: var(--accent);
      transform: translateY(-1px);
    }

    .link-btn:active {
      transform: translateY(0);
    }

    .link-icon {
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .link-label {
      flex: 1;
      font-size: 0.95rem;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .link-arrow {
      font-size: 0.8rem;
      color: var(--text-secondary);
      flex-shrink: 0;
    }

    .link-btn--pdf {
      border-style: dashed;
    }

    .link-btn--pdf:hover {
      border-style: solid;
    }

    /* ── Footer ───────────────────────────────────── */

    .footer {
      margin-top: 40px;
      text-align: center;
    }

    .footer a {
      font-size: 0.78rem;
      color: var(--text-secondary);
      text-decoration: none;
      opacity: 0.5;
      transition: opacity 0.15s;
    }

    .footer a:hover {
      opacity: 1;
    }

    @media (prefers-color-scheme: light) {
      :root {
        --bg: #f5f5f5;
        --surface: #ffffff;
        --border: rgba(0,0,0,0.08);
        --text: #111111;
        --text-secondary: rgba(0,0,0,0.45);
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="identity">
      ${avatarHtml}
      <div>
        <div class="name">${escapeHtml(name)}</div>
        <div class="handle">${escapeHtml(displayHandle)}</div>
      </div>
      ${tagline ? `<div class="tagline">${escapeHtml(tagline)}</div>` : ''}
    </div>

    ${socialsHtml}

    <div class="links">
      ${linksHtml}
      ${pdfHtml}
    </div>

    <div class="footer">
      <a href="/" rel="noopener noreferrer">Crea tu página con Efi</a>
    </div>
  </div>
</body>
</html>`;
}

export function createMediaKitRouter(pool: pg.Pool, isDev = false): Router {
  const router = Router();

  // Regex ensures we only match /@somehandle (no slashes) — avoids intercepting Vite's /@vite/client etc.
  // In dev mode we also skip Vite plugin paths like /@react-refresh which have no slash but aren't user handles.
  router.get(/^\/@([^/]+)$/, async (req, res, next) => {
    try {
      const rawHandle = (req.params as any)[0] as string;

      if (isDev && /^(react-refresh|vite|id|fs)/.test(rawHandle)) {
        return next();
      }
      const handle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`;

      const { rows } = await pool.query(
        'SELECT name, avatar, handle, tagline, social_profiles, efi_profile FROM user_profile WHERE LOWER(handle) = LOWER($1)',
        [handle],
      );

      const { rows: settingsRows } = await pool.query(
        `SELECT us.accent_color
         FROM user_settings us
         JOIN user_profile up ON up.user_id = us.user_id
         WHERE LOWER(up.handle) = LOWER($1)`,
        [handle],
      );

      if (rows.length === 0) {
        return res.status(404).send('<h1>Perfil no encontrado</h1>');
      }

      const row = rows[0];
      console.log('[mediakit] efi_profile from DB:', JSON.stringify(row.efi_profile));
      const settingsRow = settingsRows[0];

      const socialProfiles: SocialProfiles = {
        ...createEmptySocialProfiles(),
        ...(row.social_profiles || {}),
      };

      const efiProfile: EfiProfile = {
        ...createDefaultEfiProfile(),
        ...(row.efi_profile || {}),
      };

      const html = generateEfiLinkHtml({
        name: row.name || '',
        handle: row.handle || handle,
        tagline: row.tagline || '',
        avatar: row.avatar || '',
        socialProfiles,
        efiProfile,
        accentColor: settingsRow?.accent_color || '#C96F5B',
      });

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.send(html);
    } catch (error) {
      console.error('EfiLink page error:', error);
      res.status(500).send('<h1>Error interno</h1>');
    }
  });

  return router;
}
