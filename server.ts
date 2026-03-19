import express from 'express';
import { createServer as createViteServer } from 'vite';
import session from 'express-session';
import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = 3000;

app.use(express.json());

app.use(session({
  secret: 'super-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none',
    httpOnly: true,
  }
}));

// Google OAuth Setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.APP_URL}/api/auth/google/callback`
);

app.get('/api/auth/google/url', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly'
    ],
    prompt: 'consent'
  });
  res.json({ url });
});

app.get('/api/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    (req.session as any).tokens = tokens;
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error retrieving access token', error);
    res.status(500).send('Authentication failed');
  }
});

app.get('/api/auth/status', (req, res) => {
  res.json({ connected: !!(req.session as any).tokens });
});

app.post('/api/auth/logout', (req, res) => {
  (req.session as any).tokens = null;
  res.json({ success: true });
});

app.post('/api/calendar/sync', async (req, res) => {
  const tokens = (req.session as any).tokens;
  if (!tokens) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  oauth2Client.setCredentials(tokens);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const { task } = req.body;

  try {
    const event = {
      summary: `Entrega: ${task.title}`,
      description: `Partner: ${task.partnerName}\n\n${task.description}`,
      start: {
        date: task.dueDate,
        timeZone: 'UTC',
      },
      end: {
        date: task.dueDate,
        timeZone: 'UTC',
      },
    };

    let result;
    if (task.gcalEventId) {
      result = await calendar.events.update({
        calendarId: 'primary',
        eventId: task.gcalEventId,
        requestBody: event,
      });
    } else {
      result = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });
    }

    res.json({ success: true, eventId: result.data.id });
  } catch (error) {
    console.error('Error syncing to calendar', error);
    res.status(500).json({ error: 'Failed to sync to calendar' });
  }
});

app.post('/api/calendar/sync-down', async (req, res) => {
  const tokens = (req.session as any).tokens;
  if (!tokens) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  oauth2Client.setCredentials(tokens);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const { eventIds } = req.body;

  if (!eventIds || !Array.isArray(eventIds)) {
    return res.status(400).json({ error: 'eventIds array is required' });
  }

  try {
    const updatedEvents = [];
    for (const eventId of eventIds) {
      try {
        const response = await calendar.events.get({
          calendarId: 'primary',
          eventId: eventId,
        });
        
        if (response.data && response.data.start) {
          const date = response.data.start.date || (response.data.start.dateTime ? response.data.start.dateTime.split('T')[0] : null);
          if (date) {
            updatedEvents.push({
              eventId,
              dueDate: date,
            });
          }
        }
      } catch (err: any) {
        if (err.code !== 404) {
          console.error(`Error fetching event ${eventId}`, err);
        }
      }
    }

    res.json({ success: true, updatedEvents });
  } catch (error) {
    console.error('Error syncing down from calendar', error);
    res.status(500).json({ error: 'Failed to sync down from calendar' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
