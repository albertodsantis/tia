# Efi - Technology Stack Definition

## 1. Purpose

This document defines the approved technical stack for Efi, a micro SaaS CRM for content creators and independent professionals. It reflects the current state of the codebase and serves as the canonical reference for all technology decisions.

## 2. Language and Product Context

This document is written in English for technical consistency across AI-driven workflows.

Product context still matters:

- Efi is a Spanish-first product
- visible UI copy remains in Spanish
- brand tone remains in Spanish
- engineering documentation remains in English

## 3. Stack Principles

- preserve the current React + TypeScript + Express baseline
- optimize for a web-first micro SaaS, not a native-mobile-first build
- keep the backend as the source of truth for business state
- extract shared contracts that can later serve a native mobile app
- avoid unnecessary rewrites and avoid microservices for MVP

## 4. Repository Topology

The repository is a TypeScript monorepo with three packages:

```text
apps/
  api/               Express backend
    src/
      server.ts        Entry point, Vite middleware (dev), graceful shutdown
      app.ts           App factory — DB init, migrations, session, middleware, routes
      config/
        env.ts         Environment config and validation
      routes/
        auth.ts        App auth (register, login, Google OAuth, logout, me, delete account)
        calendar.ts    Google Calendar sync and sync-down
        mediakit.ts    Public media kit renderer (HTML, no auth)
        v1.ts          All authenticated CRUD endpoints
      db/
        connection.ts  PostgreSQL pool initialization
        migrate.ts     Migration runner
        repository.ts  PostgresAppStore — all data access
        migrations/    001–014 SQL migration files
      lib/
        storage.ts     Supabase Storage upload/delete helpers
      services/
        gamification.ts GamificationService — XP, levels, badges (Efisystem)
    build.ts           esbuild bundling

  web/               React SPA
    src/
      App.tsx          Shell, navigation, responsive layout, accent theming
      main.tsx         React root, IconContext.Provider
      index.css        CSS tokens, theme variables, shimmer, CRT overlay
      context/
        AppContext.tsx  Central state, API calls, optimistic mutations, gamification
      views/           Dashboard, Pipeline, Directory, Profile, Settings, StrategicView,
                       Landing, WelcomeColorPicker, WelcomeOnboarding
      components/      ui.tsx, AIAssistant, BlockPickerDrawer, Confetti, ConfirmDialog,
                       CustomSelect, EfisystemWidget, ErrorBoundary, ImageUpload,
                       LegalModal, MoreOptionsMenu, NotificationBell, OnboardingTour,
                       OverlayModal, TemplatePickerDrawer, Toaster, profile-blocks/
      lib/             api.ts, accent.ts, blockTemplates.ts, date.ts, professions.ts,
                       supabase.ts, toast.ts
    vite.config.ts

packages/
  shared/            Shared TypeScript layer
    src/
      domain.ts        Core types (Task, Partner, Contact, Template,
                       UserProfile, MediaKitProfile, Goal, BlockType, Efisystem, etc.)
      contracts/
        appData.ts     CRUD request/response contracts
        auth.ts        Auth contracts (Register, Login, Me, Session, ChangePassword, etc.)
        googleCalendar.ts  Calendar contracts
      index.ts
```

Rules:

- `apps/web` owns browser delivery for desktop and mobile web
- `apps/api` owns auth, business rules, PostgreSQL persistence, and integrations
- `packages/shared` owns shared types, contracts, and pure utilities
- `apps/mobile` is not approved yet as an active runtime

## 5. Frontend

### 5.1 Runtime and Language

- TypeScript `~5.8.2`
- React `^19.0.0`
- React DOM `^19.0.0`
- Vite `^6.2.0`

### 5.2 Styling and UI

- Tailwind CSS `^4.1.14`
- `@tailwindcss/vite` `^4.1.14`
- `@vitejs/plugin-react` `^5.0.4`
- `@phosphor-icons/react` `^2.1.10` — icon library (duotone weight, globally via `IconContext.Provider`)
- `react-colorful` `^5.6.1` — accent color picker
- `react-joyride` `^2.9.3` — onboarding tours
- `motion` `^12.23.24` — animations and transitions
- `canvas-confetti` `^1.9.4` — gamification confetti

### 5.3 Interaction

- `@dnd-kit/core` `^6.3.1` — drag-and-drop (pipeline kanban board)

### 5.4 Auth and External Services

- `@supabase/supabase-js` `^2.100.0` — used in two places: (1) browser client (`supabase.ts`) initiates Google OAuth redirect via `signInWithOAuth`; (2) server-side Admin client in `routes/auth.ts` validates the Supabase `access_token` sent by the client after redirect

### 5.5 AI Integration (Client-Side, Experimental)

- `@google/genai` `^1.29.0` — Gemini-powered AI assistant (behind `GEMINI_API_KEY`)

### 5.6 Frontend Conventions

- responsive SPA architecture (desktop sidebar + mobile bottom nav)
- web-first delivery with strong mobile web support
- remote data consumed through REST
- no secrets in the client bundle
- local state reserved for UI state and temporary optimistic state
- business state originates from the backend via `GET /api/v1/bootstrap`
- icon weight set globally to `duotone` via `IconContext.Provider` in `main.tsx`

## 6. Backend

### 6.1 Runtime and Framework

- Node.js `20 LTS` target for deployment
- Express `^4.21.2`
- `express-session` `^1.19.0` — HTTP session layer
- `connect-pg-simple` `^10.0.0` — PostgreSQL-backed session store
- `helmet` `^8.1.0` — security headers
- `express-rate-limit` `^8.3.1` — rate limiting (auth endpoints)
- `dotenv` `^17.2.3` — local development environment loading
- `googleapis` `^171.4.0` — Google Calendar and Google OAuth
- `multer` `^2.1.1` — multipart file uploads (avatar, portfolio images)

### 6.2 Authentication

- `bcryptjs` `^3.0.3` — password hashing (email/password auth)
- Authentication supports two providers:
  - email/password (bcrypt, 10 rounds)
  - Google OAuth: browser initiates a full-page redirect via `supabase.auth.signInWithOAuth`; after redirect, the backend validates the Supabase `access_token` using the Admin client and issues an Express session (stored as `provider = 'google'`)
- Sessions stored in PostgreSQL via `connect-pg-simple`

### 6.3 Build and Tooling

- `tsx` `^4.21.0` — development runtime
- `esbuild` `^0.27.4` — production backend bundle
- server build target: `node20`

### 6.4 Development Server

In development, the Express server runs Vite in middleware mode to serve the SPA. In production, Express serves the pre-built static files from `apps/web/dist`.

## 7. Shared Layer

The shared layer contains:

- domain types (`Task`, `Partner`, `Contact`, `Template`, `UserProfile`, `MediaKitProfile`, `Goal`, `BlockType`, `ChecklistItem`, `EfisystemSnapshot`, `BadgeKey`, `FreelancerType`, `AppState`, etc.)
- request and response contracts for all API endpoints
- pure utilities (`getPartnerLookupKey`, `createEmptySocialProfiles`, `createDefaultMediaKitProfile`)

The shared layer must not depend on:

- React
- Express
- browser globals
- Node-only runtime behavior unless explicitly isolated

## 8. Persistence and Infrastructure

### 8.1 Database

- PostgreSQL via Supabase (hosted)
- `pg` `^8.20.0` — Node.js PostgreSQL client
- 14 migrations in `apps/api/src/db/migrations/`
- Full multi-tenant data isolation: all tables scoped by `user_id`
- Row-level security enabled (`006_enable_rls.sql`)
- Sessions persisted in `session` table via `connect-pg-simple`
- Supabase Storage used for file uploads (avatars, portfolio images)

### 8.2 Hosting

- **Railway** — live production deployment (persistent Node 20 server)
- Database: Supabase-managed PostgreSQL
- `vercel.json` + `api/index.js` are legacy artifacts, unused

### 8.3 CI/CD

- No CI/CD pipeline

## 9. External Integrations

- **Google OAuth 2.0** — two separate grants: (1) app login via Supabase redirect flow; (2) Google Calendar authorization via direct `googleapis` popup
- **Google Calendar API** — task-to-calendar synchronization (sync up and sync down)
- **Supabase Storage** — image storage for avatars and portfolio images
- **Supabase Auth** — used for the Google OAuth redirect flow: browser-side to initiate sign-in, server-side Admin client to validate the returned access_token

Rules:

- production AI integrations must run server-side
- `@google/genai` is allowed for the experimental AI assistant only
- direct browser-side production consumption of AI APIs is not approved

## 10. Architecture

The system is a `modular monolith`.

Modules:

- auth (email/password registration and login, Google OAuth, session management, account deletion)
- dashboard (summary statistics, period filtering)
- tasks (CRUD, checklist items, Google Calendar event tracking)
- partners (CRUD, duplicate-name detection, status and financial tracking)
- contacts (CRUD nested under partners)
- templates (email/WhatsApp template CRUD)
- profile (user profile, social profiles, modular block composer, profession)
- settings (accent color, theme, notification preferences)
- integrations/google-calendar (sync up, sync down)
- public-mediakit (server-rendered HTML profile at `/mk/:handle`)
- gamification/efisystem (XP points, levels, badges via `GamificationService`)

Microservices are not approved for MVP v1.

## 11. Technical Policies

- every new API must live under `/api/v1`
- every mutation must be validated on the backend
- every authenticated endpoint must require a valid session user
- critical business logic must not live only in the frontend
- the repository must stay ready for a future second client without prematurely creating it
- all database queries are scoped by `user_id` for multi-tenant isolation

## 12. Versions Confirmed From the Repository

Versions from `package.json`:

| Package | Version |
|---------|---------|
| `@dnd-kit/core` | `^6.3.1` |
| `@google/genai` | `^1.29.0` |
| `@phosphor-icons/react` | `^2.1.10` |
| `@supabase/supabase-js` | `^2.100.0` |
| `@tailwindcss/vite` | `^4.1.14` |
| `@vitejs/plugin-react` | `^5.0.4` |
| `bcryptjs` | `^3.0.3` |
| `canvas-confetti` | `^1.9.4` |
| `connect-pg-simple` | `^10.0.0` |
| `dotenv` | `^17.2.3` |
| `esbuild` | `^0.27.4` |
| `express` | `^4.21.2` |
| `express-rate-limit` | `^8.3.1` |
| `express-session` | `^1.19.0` |
| `googleapis` | `^171.4.0` |
| `helmet` | `^8.1.0` |
| `motion` | `^12.23.24` |
| `multer` | `^2.1.1` |
| `pg` | `^8.20.0` |
| `react` | `^19.0.0` |
| `react-colorful` | `^5.6.1` |
| `react-dom` | `^19.0.0` |
| `react-joyride` | `^2.9.3` |
| `tailwindcss` | `^4.1.14` |
| `tsx` | `^4.21.0` |
| `typescript` | `~5.8.2` |
| `vite` | `^6.2.0` |
