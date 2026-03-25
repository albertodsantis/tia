import { randomUUID } from 'crypto';
import { Router } from 'express';
import { google } from 'googleapis';
import type {
  AuthStatusResponse,
  GoogleAuthUrlResponse,
  LoginRequest,
  LogoutResponse,
  MeResponse,
  SessionUser,
} from '@shared';

type OAuthClient = InstanceType<typeof google.auth.OAuth2>;

export function createAuthRouter(oauth2Client: OAuthClient, appUrl: string) {
  const router = Router();

  // ── Session user helpers ──────────────────────────────────────

  const getSessionUser = (req: Express.Request): SessionUser | null =>
    (req.session as any).user ?? null;

  const setSessionUser = (req: Express.Request, user: SessionUser) => {
    (req.session as any).user = user;
  };

  // ── GET /me ───────────────────────────────────────────────────

  router.get('/me', (req, res) => {
    const response: MeResponse = { user: getSessionUser(req) };
    res.json(response);
  });

  // ── POST /login  (demo email login) ───────────────────────────

  router.post('/login', (req, res) => {
    const { email, name } = req.body as LoginRequest;

    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }

    const user: SessionUser = {
      email: email.trim(),
      name: name.trim(),
      avatar: '',
      provider: 'email',
    };

    setSessionUser(req, user);

    const response: MeResponse = { user };
    res.json(response);
  });

  // ── POST /logout ──────────────────────────────────────────────

  router.post('/logout', (req, res) => {
    (req.session as any).user = null;
    (req.session as any).tokens = null;
    const response: LogoutResponse = { success: true };
    res.json(response);
  });

  // ── Google OAuth: login flow ──────────────────────────────────

  router.get('/google/login-url', (req, res) => {
    const state = randomUUID();
    (req.session as any).oauthState = state;
    (req.session as any).oauthIntent = 'login';

    const url = oauth2Client.generateAuthUrl({
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

    const url = oauth2Client.generateAuthUrl({
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
      const { tokens } = await oauth2Client.getToken(code as string);
      delete (req.session as any).oauthState;
      delete (req.session as any).oauthIntent;

      if (intent === 'login') {
        // Use tokens to fetch Google profile info
        oauth2Client.setCredentials(tokens);
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const { data } = await oauth2.userinfo.get();

        const user: SessionUser = {
          email: data.email ?? '',
          name: data.name ?? '',
          avatar: data.picture ?? '',
          provider: 'google',
        };

        setSessionUser(req, user);

        // Also store tokens for potential calendar use later
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
        // Calendar integration flow (existing behavior)
        (req.session as any).tokens = tokens;

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

  // ── Calendar auth status ──────────────────────────────────────

  router.get('/status', (req, res) => {
    const response: AuthStatusResponse = {
      connected: Boolean((req.session as any).tokens),
    };
    res.json(response);
  });

  return router;
}
