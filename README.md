<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Efi

Efi is a compact CRM for independent professionals — content creators, podcasters, streamers, photographers, copywriters, DJs, speakers, coaches, and more. It provides a personal operational workspace to manage partnerships, track deliverables, and maintain a professional profile — all from a single responsive web app.

The product UI is Spanish-first. All technical documentation and code comments are in English.

## Features

- **Dashboard (Inicio)** — goals, key metrics, and activity stats at a glance
- **Pipeline** — task management with Kanban, List, and Calendar views; drag-and-drop reordering; Google Calendar sync; status flow: Pendiente → En Progreso → En Revision → Completada → Cobrado
- **Directory (Directorio)** — partner and contact management with financial tracking and messaging
- **Strategy (Estrategia)** — goal tracking, performance metrics, and progress overview
- **Public Profile (Perfil Público)** — modular block composer for building a public profile link
- **Settings (Ajustes)** — theme customization, integrations, and templates
- **AI Assistant** — integrated conversational assistant powered by Google Gemini
- **Onboarding** — guided welcome flow with color picker and tour for new users

Desktop uses a sidebar layout; mobile uses bottom navigation.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS 4 |
| Backend | Express, Helmet |
| Database | PostgreSQL (Supabase) |
| Auth | bcryptjs, express-session, connect-pg-simple |
| File Uploads | multer |
| Drag and Drop | @dnd-kit |
| Animation | motion, canvas-confetti |
| Icons | @phosphor-icons/react |
| Color Picker | react-colorful |
| Onboarding | react-joyride |
| Google APIs | googleapis, @google/genai |

## Repository Structure

```text
efi/
├── Documentation/              # project documentation
│   ├── PRD.md
│   ├── APP_FLOW.md
│   ├── TECH_STACK.md
│   ├── BACKEND_STRUCTURE.md
│   ├── FRONTEND_GUIDELINES.md
│   ├── IMPLEMENTATION_PLAN.md
│   └── REPOSITORY_STRATEGY.md
├── design-system/
│   └── MASTER.md               # canonical design system
├── apps/
│   ├── api/src/                # Express backend
│   │   ├── server.ts
│   │   ├── app.ts
│   │   ├── config/             # env.ts — environment config
│   │   ├── db/                 # connection.ts, repository.ts, migrate.ts, migrations/
│   │   ├── lib/                # storage.ts
│   │   ├── routes/             # auth.ts, calendar.ts, mediakit.ts, v1.ts
│   │   ├── services/           # gamification.ts
│   │   └── store/              # appStore.ts
│   └── web/src/                # React SPA
│       ├── App.tsx, main.tsx, index.css
│       ├── components/         # ui.tsx, AIAssistant, BlockPickerDrawer,
│       │                       # Confetti, ConfirmDialog, CustomSelect,
│       │                       # EfisystemWidget, ErrorBoundary,
│       │                       # ImageUpload, LegalModal, MoreOptionsMenu,
│       │                       # NotificationBell, OnboardingTour,
│       │                       # OverlayModal, TemplatePickerDrawer,
│       │                       # Toaster, profile-blocks/
│       ├── context/AppContext.tsx
│       ├── lib/                # api.ts, accent.ts, blockTemplates.ts,
│       │                       # date.ts, professions.ts, supabase.ts, toast.ts
│       └── views/              # Dashboard, Directory, Landing, Pipeline,
│                               # Profile, Settings, StrategicView,
│                               # WelcomeColorPicker, WelcomeOnboarding
├── packages/shared/src/        # shared types and contracts
│   ├── domain.ts
│   ├── contracts/              # appData.ts, auth.ts, googleCalendar.ts
│   └── index.ts
├── api/
│   └── index.js                # legacy Vercel serverless entry point (unused)
├── docker-compose.yml          # local PostgreSQL container
├── vercel.json                 # legacy Vercel deployment config (unused)
├── README.md
├── package.json
└── tsconfig.json
```

### Responsibilities

- **apps/web** — responsive React application for desktop and mobile browsers
- **apps/api** — Express backend: auth flows, business rules, PostgreSQL persistence, and external integrations
- **packages/shared** — reusable domain types, API contracts, and pure helpers with no framework-specific assumptions

## Local Development

### Prerequisites

- Node.js
- A [Supabase](https://supabase.com) project (provides PostgreSQL + auth keys)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Create a local .env from the example
cp .env.example .env
# Fill in the required variables (see Environment Variables below)

# 3. Start the development server
npm run dev
```

The app will be available at **http://127.0.0.1:3000**.

`npm run dev` starts the Express server and mounts Vite in middleware mode.

### Health Check

`GET /api/health` returns `{ "ok": true }` when the server is running.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Express + Vite in middleware mode |
| `npm run build` | Build the web app (Vite) and backend bundle (esbuild) |
| `npm run lint` | Run TypeScript type checking (`tsc --noEmit`) |
| `npm run preview` | Preview the production build |
| `npm run clean` | Delete `apps/api/dist` and `apps/web/dist` |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Long random string used to sign session cookies |
| `GOOGLE_CLIENT_ID` | Yes (for Google features) | Required for Google OAuth login and Calendar sync |
| `GOOGLE_CLIENT_SECRET` | Yes (for Google features) | Required for Google OAuth login and Calendar sync |
| `APP_URL` | Yes | Base URL for OAuth callbacks (e.g. `http://localhost:3000`) |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase public anon key |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key (server-side only) |
| `GEMINI_API_KEY` | No | API key for the integrated Gemini-based AI assistant |
| `PORT` | No | Server port (defaults to 3000) |
| `NODE_ENV` | No | Runtime environment (defaults to `development`) |

## Current State

Core features are implemented with PostgreSQL persistence and multi-tenant data isolation (all tables scoped by `user_id`). Authentication supports email/password and Google OAuth.

Preparing for official launch:

- CI/CD pipeline
- Production deployment

## Documentation Language Policy

English is used for all technical documentation, architecture notes, implementation plans, code comments, and file naming. The product UI and user-facing copy are in Spanish.

## Canonical Documents

- [design-system/MASTER.md](./design-system/MASTER.md)
- [Documentation/PRD.md](./Documentation/PRD.md)
- [Documentation/APP_FLOW.md](./Documentation/APP_FLOW.md)
- [Documentation/TECH_STACK.md](./Documentation/TECH_STACK.md)
- [Documentation/BACKEND_STRUCTURE.md](./Documentation/BACKEND_STRUCTURE.md)
- [Documentation/FRONTEND_GUIDELINES.md](./Documentation/FRONTEND_GUIDELINES.md)
- [Documentation/IMPLEMENTATION_PLAN.md](./Documentation/IMPLEMENTATION_PLAN.md)
- [Documentation/REPOSITORY_STRATEGY.md](./Documentation/REPOSITORY_STRATEGY.md)
