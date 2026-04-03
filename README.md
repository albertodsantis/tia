<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Efi

Efi is a micro SaaS CRM built for content creators, influencers, and creative freelancers. It provides a compact operational workspace to manage partnerships, track deliverables, and maintain a professional profile — all from a single responsive web app.

The product UI is Spanish-first. All technical documentation and code comments are in English.

## Features

- **Dashboard (Inicio)** — goals, key metrics, and activity stats at a glance
- **Pipeline** — task management with Kanban, List, and Calendar views; drag-and-drop reordering; Google Calendar sync; status flow: Pendiente, En Progreso, En Revision, Completada, Cobrado
- **Directory (Directorio)** — partner and contact management with financial tracking and messaging
- **Profile (Perfil)** — media kit, linked social profiles, and personal goals
- **Settings (Ajustes)** — theme customization, integrations, and templates
- **AI Assistant** — experimental conversational assistant powered by Google Gemini
- **Onboarding Tour** — guided walkthrough for new users

Desktop uses a sidebar layout; mobile uses bottom navigation.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS 4 |
| Backend | Express |
| Drag and Drop | @dnd-kit |
| Animation | motion |
| Color Picker | react-colorful |
| Icons | lucide-react |
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
│   │   ├── routes/             # auth.ts, calendar.ts, v1.ts
│   │   └── store/appStore.ts
│   └── web/src/                # React SPA
│       ├── App.tsx, main.tsx, index.css
│       ├── components/         # ui.tsx, AIAssistant, ConfirmDialog,
│       │                       # CustomSelect, OnboardingTour,
│       │                       # OverlayModal, Toaster
│       ├── context/AppContext.tsx
│       ├── lib/                # api.ts, accent.ts, date.ts, toast.ts
│       └── views/              # Dashboard, Pipeline, Directory,
│                               # Profile, Settings
├── packages/shared/src/        # shared types and contracts
│   ├── domain.ts
│   ├── contracts/              # appData.ts, auth.ts, googleCalendar.ts
│   └── index.ts
├── README.md
├── package.json
└── tsconfig.json
```

### Responsibilities

- **apps/web** — responsive React application for desktop and mobile browsers
- **apps/api** — Express backend: auth flows, business rules, in-memory persistence, and external integrations
- **packages/shared** — reusable domain types, API contracts, and pure helpers with no framework-specific assumptions

## Local Development

### Prerequisites

- Node.js

### Setup

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Create a local .env from the example for Google integrations
cp .env.example .env

# 3. Start the development server
npm run dev
```

The app will be available at **http://127.0.0.1:3000**.

`npm run dev` starts the Express server and mounts Vite in middleware mode. The base UI works without a `.env` file; Google OAuth and Calendar integration require the environment variables below.

### Health Check

`GET /api/health` returns `{ "ok": true }` when the server is running.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Express + Vite in middleware mode |
| `npm run build` | Build the web app (Vite) and backend bundle (esbuild) |
| `npm run lint` | Run TypeScript type checking (`tsc --noEmit`) |
| `npm run preview` | Preview the production build |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | No | API key for the experimental Gemini-based AI assistant |
| `GOOGLE_CLIENT_ID` | Yes (for OAuth) | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes (for OAuth) | Google OAuth client secret |
| `APP_URL` | Yes (for OAuth) | Base URL for OAuth callbacks (e.g. `http://localhost:3000`) |

## Current State

All core features are implemented with in-memory storage. Pending work:

- PostgreSQL persistence
- Real authentication
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
