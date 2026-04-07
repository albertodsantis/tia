# CLAUDE.md

## Commands

- `npm run dev` — start Express + Vite dev server (http://127.0.0.1:3000)
- `npm run build` — production build (Vite frontend + esbuild backend)
- `npm run preview` — preview the production build
- `npm run clean` — delete `apps/api/dist` and `apps/web/dist`
- `npm run lint` — type-check with `tsc --noEmit`
- `GET /api/health` — health check endpoint

## Project

Efi is a compact CRM for independent professionals — content creators, podcasters, streamers, photographers, copywriters, DJs, speakers, coaches, and more. It provides a personal operational workspace to manage partnerships, track deliverables, and maintain a professional profile — all from a single responsive web app. Each user has their own isolated data (tasks, partners, profile, settings, templates). No collaborative workspaces — each account is a personal workspace.

Features: Dashboard (Inicio), Pipeline (Kanban/List/Calendar + Google Calendar sync), Directory (Directorio), Strategy (Estrategia), Public Profile (Perfil Público — modular block composer), Settings (Ajustes), AI Assistant (Gemini), Onboarding.

Monorepo structure:

- `apps/web/src/` — React 19 SPA (Vite, Tailwind CSS 4, TypeScript)
  - `components/` — ui.tsx, AIAssistant, BlockPickerDrawer, Confetti, ConfirmDialog, CustomSelect, EfisystemWidget, ErrorBoundary, ImageUpload, LegalModal, MoreOptionsMenu, NotificationBell, OnboardingTour, OverlayModal, TemplatePickerDrawer, Toaster, profile-blocks/
  - `views/` — Dashboard, Directory, Landing, Pipeline, Profile, Settings, StrategicView, WelcomeColorPicker, WelcomeOnboarding
  - `context/AppContext.tsx` — global app state
  - `lib/` — api.ts, accent.ts, blockTemplates.ts, date.ts, professions.ts, supabase.ts, toast.ts
- `apps/api/src/` — Express backend (auth, business logic, integrations)
  - `server.ts`, `app.ts` — entry points
  - `config/` — env.ts (environment config)
  - `routes/` — auth.ts, calendar.ts, mediakit.ts, v1.ts
  - `db/` — connection.ts, repository.ts, migrate.ts, migrations/
  - `lib/` — storage.ts
  - `services/` — gamification.ts
  - `store/` — appStore.ts
- `packages/shared/src/` — domain types and API contracts (no framework deps)
  - `domain.ts`, `contracts/` (appData.ts, auth.ts, googleCalendar.ts)
- `api/index.js` — legacy Vercel serverless entry point (unused)
- `docker-compose.yml` — local PostgreSQL container
- `vercel.json` — legacy Vercel deployment config (unused)

## Language Policy

- UI and user-facing copy: **Spanish**
- Code, comments, docs, file names: **English**

## Current State

- PostgreSQL (Supabase) with multi-tenant data isolation (all tables scoped by `user_id`)
- Email/password + Google OAuth authentication (bcrypt, express-session, connect-pg-simple)
- File uploads via multer; drag-and-drop via @dnd-kit
- Deployed on Railway (production); `vercel.json` and `api/index.js` are legacy artifacts, unused
- No CI/CD pipeline

## Key Conventions

- Design system: `design-system/MASTER.md` (canonical reference for all UI work)
- Sidebar layout on desktop, bottom nav on mobile
- Pipeline statuses: Pendiente → En Progreso → En Revision → Completada → Cobrado

## Detailed Docs

See `Documentation/` for full specs: PRD, APP_FLOW, TECH_STACK, BACKEND_STRUCTURE, FRONTEND_GUIDELINES, IMPLEMENTATION_PLAN, REPOSITORY_STRATEGY.
