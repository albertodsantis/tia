import { Router } from 'express';
import type pg from 'pg';
import { createEmptySocialProfiles, createDefaultEfiProfile } from '@shared';
import type { EfiProfile, SocialProfiles } from '@shared';
import { generateEfiLinkHtml } from '../lib/profileRenderer';

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
        `SELECT us.accent_color, us.profile_accent_color, us.profile_force_dark
         FROM user_settings us
         JOIN user_profile up ON up.user_id = us.user_id
         WHERE LOWER(up.handle) = LOWER($1)`,
        [handle],
      );

      if (rows.length === 0) {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const notFoundHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Perfil no encontrado — Efi</title>
  <meta name="description" content="Este perfil no existe en Efi. Crea el tuyo gratis." />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="Perfil no encontrado — Efi" />
  <meta property="og:description" content="Este perfil no existe en Efi. Crea el tuyo gratis." />
  <meta property="og:url" content="${baseUrl}${req.path}" />
  <meta property="og:image" content="${baseUrl}/icons/icon-512.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Perfil no encontrado — Efi" />
  <meta name="twitter:description" content="Este perfil no existe en Efi. Crea el tuyo gratis." />
  <meta name="twitter:image" content="${baseUrl}/icons/icon-512.png" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0d0d0d;
      color: #f2f2f2;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      text-align: center;
      max-width: 460px;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 12px;
      letter-spacing: -0.03em;
    }
    p {
      font-size: 0.9rem;
      color: rgba(242, 242, 242, 0.6);
      line-height: 1.55;
      margin-bottom: 28px;
    }
    a {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      background: linear-gradient(180deg, #FF1E7A 0%, #FF4D3D 55%, #FFA500 100%);
      color: white;
      text-decoration: none;
      border-radius: 12px;
      font-size: 0.95rem;
      font-weight: 600;
      transition: filter 0.15s, transform 0.15s;
    }
    a:hover {
      filter: brightness(1.08);
      transform: translateY(-2px);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Perfil no encontrado</h1>
    <p>Este enlace no existe o ha sido eliminado.</p>
    <a href="/">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
      Crea tu página con Efi
    </a>
  </div>
</body>
</html>`;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=300');
        return res.status(404).send(notFoundHtml);
      }

      const row = rows[0];
      const settingsRow = settingsRows[0];

      const socialProfiles: SocialProfiles = {
        ...createEmptySocialProfiles(),
        ...(row.social_profiles || {}),
      };

      const efiProfile: EfiProfile = {
        ...createDefaultEfiProfile(),
        ...(row.efi_profile || {}),
      };

      const profileAccent = settingsRow?.profile_accent_color ?? settingsRow?.accent_color ?? 'gradient:instagram';
      const publicUrl = `${req.protocol}://${req.get('host')}/@${row.handle.replace(/^@/, '')}`;
      const html = generateEfiLinkHtml({
        name: row.name || '',
        handle: row.handle || handle,
        tagline: row.tagline || '',
        avatar: row.avatar || '',
        socialProfiles,
        efiProfile,
        accentColor: profileAccent,
        forceDark: settingsRow?.profile_force_dark ?? false,
        publicUrl,
        posthogKey: process.env.VITE_POSTHOG_KEY || process.env.POSTHOG_API_KEY || '',
        posthogHost: process.env.VITE_POSTHOG_HOST || process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
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
