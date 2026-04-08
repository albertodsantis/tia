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
        return res.status(404).send('<h1>Perfil no encontrado</h1>');
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

      const profileAccent = settingsRow?.profile_accent_color ?? settingsRow?.accent_color ?? '#C96F5B';
      const html = generateEfiLinkHtml({
        name: row.name || '',
        handle: row.handle || handle,
        tagline: row.tagline || '',
        avatar: row.avatar || '',
        socialProfiles,
        efiProfile,
        accentColor: profileAccent,
        forceDark: settingsRow?.profile_force_dark ?? false,
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
