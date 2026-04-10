import { randomUUID, randomBytes } from 'crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import type pg from 'pg';
import type {
  AuthStatusResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  ChangeEmailRequest,
  DeleteAccountResponse,
  ForgotPasswordRequest,
  GoogleAuthUrlResponse,
  LoginRequest,
  LogoutResponse,
  MeResponse,
  RegisterRequest,
  ResetPasswordRequest,
  SessionUser,
  SimpleSuccessResponse,
} from '@shared';
import { sendPasswordResetEmail, sendEmailChangeVerification } from '../lib/email';
import type { GoogleCreds } from './calendar';

/** Create a fresh OAuth2 client — safe to mutate per-request. */
function makeOAuth2Client(creds: GoogleCreds) {
  return new google.auth.OAuth2(creds.clientId, creds.clientSecret, creds.redirectUri);
}

const BCRYPT_ROUNDS = 10;

/** Create profile + settings rows for a new user (idempotent via ON CONFLICT). */
async function ensureUserData(
  pool: pg.Pool,
  userId: string,
  name: string,
  email: string,
  avatar = '',
) {
  await pool.query(
    `INSERT INTO user_profile (user_id, name, avatar)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET name = $2, avatar = $3`,
    [userId, name, avatar],
  );
  await pool.query(
    `INSERT INTO user_settings (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId],
  );
}

export function createAuthRouter(
  googleCreds: GoogleCreds,
  appUrl: string,
  pool: pg.Pool,
) {
  const router = Router();

  // ── Session user helpers ──────────────────────────────────────

  const getSessionUser = (req: Express.Request): SessionUser | null =>
    (req.session as any).user ?? null;

  const setSessionUser = (req: Express.Request, user: SessionUser) => {
    (req.session as any).user = user;
  };

  // ── GET /me ───────────────────────────────────────────────────

  router.get('/me', async (req, res) => {
    try {
      const sessionUser = getSessionUser(req);

      if (sessionUser?.id) {
        const { rows } = await pool.query('SELECT id FROM users WHERE id = $1', [sessionUser.id]);
        if (rows.length === 0) {
          req.session.destroy(() => {});
          const response: MeResponse = { user: null };
          return res.json(response);
        }
      }

      const response: MeResponse = { user: sessionUser };
      res.json(response);
    } catch (error) {
      console.error('Auth /me error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ── POST /register ────────────────────────────────────────────

  router.post('/register', async (req, res) => {
    const { email, password, name } = req.body as RegisterRequest;

    if (!email?.trim() || !password || !name?.trim()) {
      return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    try {
      const { rows: existing } = await pool.query(
        'SELECT id FROM users WHERE LOWER(email) = $1',
        [trimmedEmail],
      );

      if (existing.length > 0) {
        return res.status(409).json({ error: 'Ya existe una cuenta con ese email.' });
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const userId = randomUUID();

      await pool.query(
        `INSERT INTO users (id, email, password_hash, name, provider)
         VALUES ($1, $2, $3, $4, 'email')`,
        [userId, trimmedEmail, passwordHash, trimmedName],
      );

      await ensureUserData(pool, userId, trimmedName, trimmedEmail);

      const user: SessionUser = {
        id: userId,
        email: trimmedEmail,
        name: trimmedName,
        avatar: '',
        provider: 'email',
      };

      setSessionUser(req, user);

      const response: MeResponse = { user, isNew: true };
      res.status(201).json(response);
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Error al crear la cuenta.' });
    }
  });

  // ── POST /login ───────────────────────────────────────────────

  router.post('/login', async (req, res) => {
    const { email, password } = req.body as LoginRequest;

    if (!email?.trim() || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios.' });
    }

    const trimmedEmail = email.trim().toLowerCase();

    try {
      const { rows } = await pool.query(
        'SELECT id, email, password_hash, name, avatar, provider FROM users WHERE LOWER(email) = $1',
        [trimmedEmail],
      );

      if (rows.length === 0) {
        return res
          .status(404)
          .json({ error: 'No encontramos una cuenta con ese email.', code: 'USER_NOT_FOUND' });
      }

      const dbUser = rows[0];
      const valid = await bcrypt.compare(password, dbUser.password_hash);

      if (!valid) {
        return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
      }

      // Ensure profile/settings exist (idempotent — handles legacy users)
      await ensureUserData(pool, dbUser.id, dbUser.name, dbUser.email, dbUser.avatar || '');

      const user: SessionUser = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        avatar: dbUser.avatar || '',
        provider: dbUser.provider,
      };

      setSessionUser(req, user);

      const response: MeResponse = { user };
      res.json(response);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Error al iniciar sesion.' });
    }
  });

  // ── POST /logout ──────────────────────────────────────────────

  router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session on logout:', err);
      }
      const response: LogoutResponse = { success: true };
      res.json(response);
    });
  });

  // ── DELETE /account ─────────────────────────────────────────

  router.delete('/account', async (req, res) => {
    const sessionUser = getSessionUser(req);

    if (!sessionUser?.id) {
      const response: DeleteAccountResponse = { success: false };
      return res.status(401).json(response);
    }

    try {
      // CASCADE deletes profile, settings, tasks, partners, etc.
      await pool.query('DELETE FROM users WHERE id = $1', [sessionUser.id]);
    } catch (err) {
      console.error('Error deleting user row:', err);
      const response: DeleteAccountResponse = { success: false };
      return res.status(500).json(response);
    }

    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
      }
    });

    const response: DeleteAccountResponse = { success: true };
    res.json(response);
  });

  // ── Google OAuth: login flow ──────────────────────────────────

  router.get('/google/login-url', (req, res) => {
    const state = randomUUID();
    (req.session as any).oauthState = state;
    (req.session as any).oauthIntent = 'login';

    const client = makeOAuth2Client(googleCreds);
    const url = client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'openid',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
      prompt: 'consent',
      state,
    });

    const response: GoogleAuthUrlResponse = { url };
    res.json(response);
  });

  // ── Google OAuth: calendar integration flow ───────────────────

  router.get('/google/url', (req, res) => {
    const state = randomUUID();
    (req.session as any).oauthState = state;
    (req.session as any).oauthIntent = 'calendar';

    const client = makeOAuth2Client(googleCreds);
    const url = client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.readonly',
      ],
      prompt: 'consent',
      state,
    });

    const response: GoogleAuthUrlResponse = { url };
    res.json(response);
  });

  // ── Google OAuth: shared callback ─────────────────────────────

  router.get('/google/callback', async (req, res) => {
    const { code, state } = req.query;

    if (!state || state !== (req.session as any).oauthState) {
      return res.status(403).send('Invalid OAuth state parameter');
    }

    const intent: string = (req.session as any).oauthIntent ?? 'calendar';

    try {
      const client = makeOAuth2Client(googleCreds);
      const { tokens } = await client.getToken(code as string);
      delete (req.session as any).oauthState;
      delete (req.session as any).oauthIntent;

      if (intent === 'login') {
        client.setCredentials(tokens);
        const oauth2 = google.oauth2({ version: 'v2', auth: client });
        const { data } = await oauth2.userinfo.get();

        const googleEmail = (data.email ?? '').toLowerCase();
        const googleName = data.name ?? '';
        const googleAvatar = data.picture ?? '';

        // Upsert user row for Google auth
        const { rows: existing } = await pool.query(
          'SELECT id FROM users WHERE LOWER(email) = $1',
          [googleEmail],
        );

        let userId: string;

        if (existing.length === 0) {
          userId = randomUUID();
          await pool.query(
            `INSERT INTO users (id, email, password_hash, name, avatar, provider)
             VALUES ($1, $2, '', $3, $4, 'google')`,
            [userId, googleEmail, googleName, googleAvatar],
          );
        } else {
          userId = existing[0].id;
          await pool.query(
            `UPDATE users SET name = $1, avatar = $2, provider = 'google', updated_at = NOW()
             WHERE id = $3`,
            [googleName, googleAvatar, userId],
          );
        }

        await ensureUserData(pool, userId, googleName, googleEmail, googleAvatar);

        const user: SessionUser = {
          id: userId,
          email: googleEmail,
          name: googleName,
          avatar: googleAvatar,
          provider: 'google',
        };

        setSessionUser(req, user);
        (req.session as any).tokens = tokens;

        res.send(`
          <html>
            <body>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ type: 'GOOGLE_LOGIN_SUCCESS' }, '${appUrl}');
                  window.close();
                } else {
                  window.location.href = '/';
                }
              </script>
              <p>Login successful. This window should close automatically.</p>
            </body>
          </html>
        `);
      } else {
        (req.session as any).tokens = tokens;

        // Persist tokens to DB so calendar connection survives session expiry
        const sessionUser = (req.session as any).user;
        if (sessionUser?.id && tokens.access_token) {
          await pool.query(
            `UPDATE users
             SET gcal_access_token = $1, gcal_refresh_token = $2, gcal_token_expiry = $3
             WHERE id = $4`,
            [
              tokens.access_token,
              tokens.refresh_token ?? null,
              tokens.expiry_date ? new Date(tokens.expiry_date) : null,
              sessionUser.id,
            ],
          );
        }

        res.send(`
          <html>
            <body>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '${appUrl}');
                  window.close();
                } else {
                  window.location.href = '/';
                }
              </script>
              <p>Authentication successful. This window should close automatically.</p>
            </body>
          </html>
        `);
      }
    } catch (error) {
      console.error('Error retrieving access token', error);
      res.status(500).send('Authentication failed');
    }
  });

  // ── Google OAuth via Supabase ────────────────────────────────

  router.post('/google/supabase', async (req, res) => {
    const { access_token } = req.body as { access_token?: string };

    if (!access_token) {
      return res.status(400).json({ error: 'Token requerido.' });
    }

    const sbUrl = process.env.SUPABASE_URL;
    const sbKey = process.env.SUPABASE_SERVICE_KEY;

    if (!sbUrl || !sbKey) {
      return res.status(503).json({ error: 'Supabase no configurado.' });
    }

    try {
      const supabaseAdmin = createClient(sbUrl, sbKey);
      const { data, error: sbError } = await supabaseAdmin.auth.getUser(access_token);

      if (sbError || !data.user) {
        return res.status(401).json({ error: 'Token invalido o expirado.' });
      }

      const sbUser = data.user;
      const googleEmail = (sbUser.email ?? '').toLowerCase();
      const googleName =
        sbUser.user_metadata?.full_name ||
        sbUser.user_metadata?.name ||
        googleEmail.split('@')[0];
      const googleAvatar = sbUser.user_metadata?.avatar_url || '';

      if (!googleEmail) {
        return res.status(400).json({ error: 'No se pudo obtener el email de Google.' });
      }

      // Upsert user
      const { rows: existing } = await pool.query(
        'SELECT id FROM users WHERE LOWER(email) = $1',
        [googleEmail],
      );

      let userId: string;
      const isNewUser = existing.length === 0;

      if (isNewUser) {
        userId = randomUUID();
        await pool.query(
          `INSERT INTO users (id, email, password_hash, name, avatar, provider)
           VALUES ($1, $2, '', $3, $4, 'google')`,
          [userId, googleEmail, googleName, googleAvatar],
        );
      } else {
        userId = existing[0].id;
        await pool.query(
          `UPDATE users SET name = $1, avatar = $2, provider = 'google', updated_at = NOW()
           WHERE id = $3`,
          [googleName, googleAvatar, userId],
        );
      }

      await ensureUserData(pool, userId, googleName, googleEmail, googleAvatar);

      const user: SessionUser = {
        id: userId,
        email: googleEmail,
        name: googleName,
        avatar: googleAvatar,
        provider: 'google',
      };

      setSessionUser(req, user);

      const response: MeResponse = { user, isNew: isNewUser };
      res.json(response);
    } catch (error) {
      console.error('Supabase Google auth error:', error);
      res.status(500).json({ error: 'Error al autenticar con Google.' });
    }
  });

  // ── Calendar auth status ──────────────────────────────────────

  // ── POST /password ──────────────────────────────────────────
  // Change password (email users) or add password (Google users).

  router.post('/password', async (req, res) => {
    const sessionUser = getSessionUser(req);
    if (!sessionUser) {
      res.status(401).json({ error: 'No autenticado.' });
      return;
    }

    const { currentPassword, newPassword } = req.body as ChangePasswordRequest;

    if (!newPassword || newPassword.length < 8) {
      res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
      return;
    }

    try {
      const { rows } = await pool.query<{ password_hash: string; provider: string }>(
        'SELECT password_hash, provider FROM users WHERE id = $1',
        [sessionUser.id],
      );
      const user = rows[0];
      if (!user) {
        res.status(404).json({ error: 'Usuario no encontrado.' });
        return;
      }

      if (user.provider === 'email') {
        if (!currentPassword) {
          res.status(400).json({ error: 'La contraseña actual es obligatoria.' });
          return;
        }
        const valid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!valid) {
          res.status(401).json({ error: 'La contraseña actual es incorrecta.' });
          return;
        }
      }

      const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      await pool.query(
        'UPDATE users SET password_hash = $1, provider = $2, updated_at = NOW() WHERE id = $3',
        [newHash, 'email', sessionUser.id],
      );

      const updatedUser: SessionUser = { ...sessionUser, provider: 'email' };
      setSessionUser(req, updatedUser);

      const response: ChangePasswordResponse = { success: true, updatedProvider: 'email' };
      res.json(response);
    } catch (err) {
      console.error('Error changing password:', err);
      res.status(500).json({ error: 'No se pudo cambiar la contraseña.' });
    }
  });

  router.get('/status', (req, res) => {
    const response: AuthStatusResponse = {
      connected: Boolean((req.session as any).tokens),
    };
    res.json(response);
  });

  // ── POST /forgot-password ─────────────────────────────────────
  // Always returns 200 to avoid email enumeration.

  router.post('/forgot-password', async (req, res) => {
    const { email } = req.body as ForgotPasswordRequest;
    const response: SimpleSuccessResponse = { success: true };

    if (!email?.trim()) {
      return res.json(response);
    }

    const trimmedEmail = email.trim().toLowerCase();

    try {
      const { rows } = await pool.query(
        'SELECT id FROM users WHERE LOWER(email) = $1 AND password_hash != $2',
        [trimmedEmail, ''],
      );

      if (rows.length === 0) {
        return res.json(response);
      }

      const userId = rows[0].id;
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Invalidate any existing reset tokens for this user
      await pool.query(
        `DELETE FROM auth_tokens WHERE user_id = $1 AND type = 'password_reset'`,
        [userId],
      );

      await pool.query(
        `INSERT INTO auth_tokens (user_id, token, type, expires_at)
         VALUES ($1, $2, 'password_reset', $3)`,
        [userId, token, expiresAt],
      );

      await sendPasswordResetEmail(trimmedEmail, token);
    } catch (err) {
      console.error('Forgot password error:', err);
    }

    res.json(response);
  });

  // ── POST /reset-password ──────────────────────────────────────

  router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body as ResetPasswordRequest;

    if (!token || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Token y contraseña (mín. 8 caracteres) son obligatorios.' });
    }

    try {
      const { rows } = await pool.query(
        `SELECT id, user_id FROM auth_tokens
         WHERE token = $1 AND type = 'password_reset'
           AND expires_at > NOW() AND used_at IS NULL`,
        [token],
      );

      if (rows.length === 0) {
        return res.status(400).json({ error: 'El enlace no es válido o ha expirado.' });
      }

      const { id: tokenId, user_id: userId } = rows[0];
      const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

      await pool.query(
        `UPDATE users SET password_hash = $1, provider = 'email', updated_at = NOW() WHERE id = $2`,
        [newHash, userId],
      );

      await pool.query(
        `UPDATE auth_tokens SET used_at = NOW() WHERE id = $1`,
        [tokenId],
      );

      const response: SimpleSuccessResponse = { success: true };
      res.json(response);
    } catch (err) {
      console.error('Reset password error:', err);
      res.status(500).json({ error: 'No se pudo restablecer la contraseña.' });
    }
  });

  // ── POST /change-email ────────────────────────────────────────

  router.post('/change-email', async (req, res) => {
    const sessionUser = getSessionUser(req);
    if (!sessionUser) {
      return res.status(401).json({ error: 'No autenticado.' });
    }

    const { newEmail, currentPassword } = req.body as ChangeEmailRequest;

    if (!newEmail?.trim()) {
      return res.status(400).json({ error: 'El nuevo correo es obligatorio.' });
    }

    const trimmedNew = newEmail.trim().toLowerCase();

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedNew)) {
      return res.status(400).json({ error: 'El correo no tiene un formato válido.' });
    }

    try {
      // Check not already taken
      const { rows: existing } = await pool.query(
        'SELECT id FROM users WHERE LOWER(email) = $1 AND id != $2',
        [trimmedNew, sessionUser.id],
      );
      if (existing.length > 0) {
        return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
      }

      // Email-provider users must confirm current password
      const { rows } = await pool.query(
        'SELECT password_hash, provider FROM users WHERE id = $1',
        [sessionUser.id],
      );
      const dbUser = rows[0];

      if (dbUser.provider === 'email') {
        if (!currentPassword) {
          return res.status(400).json({ error: 'Confirma tu contraseña actual para cambiar el correo.' });
        }
        const valid = await bcrypt.compare(currentPassword, dbUser.password_hash);
        if (!valid) {
          return res.status(401).json({ error: 'La contraseña actual es incorrecta.' });
        }
      }

      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await pool.query(
        `DELETE FROM auth_tokens WHERE user_id = $1 AND type = 'email_change'`,
        [sessionUser.id],
      );

      await pool.query(
        `INSERT INTO auth_tokens (user_id, token, type, new_email, expires_at)
         VALUES ($1, $2, 'email_change', $3, $4)`,
        [sessionUser.id, token, trimmedNew, expiresAt],
      );

      await sendEmailChangeVerification(trimmedNew, token);

      const response: SimpleSuccessResponse = { success: true };
      res.json(response);
    } catch (err) {
      console.error('Change email error:', err);
      res.status(500).json({ error: 'No se pudo solicitar el cambio de correo.' });
    }
  });

  // ── GET /confirm-email ────────────────────────────────────────

  router.get('/confirm-email', async (req, res) => {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.redirect(`${appUrl}/?email_confirm=invalid`);
    }

    try {
      const { rows } = await pool.query(
        `SELECT id, user_id, new_email FROM auth_tokens
         WHERE token = $1 AND type = 'email_change'
           AND expires_at > NOW() AND used_at IS NULL`,
        [token],
      );

      if (rows.length === 0) {
        return res.redirect(`${appUrl}/?email_confirm=invalid`);
      }

      const { id: tokenId, user_id: userId, new_email: newEmail } = rows[0];

      await pool.query(
        `UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2`,
        [newEmail, userId],
      );

      await pool.query(
        `UPDATE auth_tokens SET used_at = NOW() WHERE id = $1`,
        [tokenId],
      );

      // Update session if the user is currently logged in
      const sessionUser = getSessionUser(req);
      if (sessionUser?.id === userId) {
        setSessionUser(req, { ...sessionUser, email: newEmail });
      }

      res.redirect(`${appUrl}/?email_confirm=success`);
    } catch (err) {
      console.error('Confirm email error:', err);
      res.redirect(`${appUrl}/?email_confirm=invalid`);
    }
  });

  return router;
}
