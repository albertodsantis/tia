# Efi - Technology Stack Definition

## 1. Purpose

This document defines the approved technical stack for Efi, a micro SaaS CRM for content creators and influencers. It reflects the current state of the codebase and serves as the canonical reference for all technology decisions.

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
      server.ts        Entry point, Vite middleware, OAuth client
      routes/
        auth.ts        Google OAuth (url, callback, status, logout)
        calendar.ts    Calendar sync and sync-down
        v1.ts          All CRUD endpoints
      store/
        appStore.ts    In-memory state with validation
    build.ts           esbuild bundling

  web/               React SPA
    src/
      App.tsx          Shell, navigation, responsive layout
      main.tsx         React root
      index.css        CSS tokens, theme variables
      context/
        AppContext.tsx  Central state, API calls
      views/           Dashboard, Pipeline, Directory, Profile, Settings
      components/      ui.tsx, AIAssistant, ConfirmDialog, CustomSelect,
                       OnboardingTour, OverlayModal, Toaster
      lib/             api.ts, accent.ts, date.ts, toast.ts
    vite.config.ts

packages/
  shared/            Shared TypeScript layer
    src/
      domain.ts        Core types (Task, Partner, Contact, Template,
                       UserProfile, MediaKit, Goal, etc.)
      contracts/
        appData.ts     CRUD request/response contracts
        auth.ts        Auth contracts
        googleCalendar.ts  Calendar contracts
      index.ts
```

Rules:

- `apps/web` owns browser delivery for desktop and mobile web
- `apps/api` owns auth, business rules, persistence access, and integrations
- `packages/shared` owns shared types, contracts, and pure utilities
- `apps/mobile` is not approved yet as an active runtime

## 5. Frontend

### 5.1 Runtime and Language

- TypeScript `5.8.2`
- React `19.0.0`
- React DOM `19.0.0`
- Vite `6.2.0`

### 5.2 Styling and UI

- Tailwind CSS `4.1.14`
- `@tailwindcss/vite` `4.1.14`
- `@vitejs/plugin-react` `5.0.4`
- `lucide-react` `0.546.0`
- `react-colorful` `5.6.1` for accent color picker
- `react-joyride` `2.9.3` for onboarding tours
- `motion` `12.23.24` for animations

### 5.3 Interaction

- `@dnd-kit/core` `6.3.1` for drag-and-drop (pipeline board)

### 5.4 AI Integration (Client-Side, Prototype Only)

- `@google/genai` `1.29.0` for prototype AI assistant features

### 5.5 Frontend Conventions

- responsive SPA architecture (desktop sidebar + mobile bottom nav)
- web-first delivery with strong mobile web support
- remote data consumed through REST
- no secrets in the client bundle
- local state reserved for UI state and temporary optimistic state
- business state originates from the backend via `/api/v1/bootstrap`

## 6. Backend

### 6.1 Runtime and Framework

- Node.js `20 LTS` target for deployment
- Express `4.21.2`
- `express-session` `1.19.0` as the HTTP session layer
- `dotenv` `17.2.3` for local development
- `googleapis` `171.4.0` for Google Calendar and OAuth

### 6.2 Build and Tooling

- `tsx` `4.21.0` for development
- `esbuild` `0.27.4` for the backend bundle
- server build target: `node20`

### 6.3 Development Server

In development, the Express server runs Vite in middleware mode to serve the SPA. In production, Express serves the pre-built static files from `apps/web/dist`.

## 7. Shared Layer

The shared layer contains:

- domain types (`Task`, `Partner`, `Contact`, `Template`, `UserProfile`, `MediaKitProfile`, `Goal`, `SocialProfiles`, `AppState`)
- request and response contracts for all API endpoints
- pure utilities (`getPartnerLookupKey`, `createEmptySocialProfiles`, `createDefaultMediaKitProfile`)

The shared layer must not depend on:

- React
- Express
- browser globals
- Node-only runtime behavior unless explicitly isolated

## 8. External Integrations

- Google OAuth 2.0 for Google Calendar authorization (popup flow)
- Google Calendar API for task-to-calendar synchronization (sync up and sync down)

Rules:

- production AI integrations must run server-side
- `@google/genai` `1.29.0` is allowed only for prototype or controlled beta work
- direct browser-side production consumption is not approved

## 9. Persistence and Infrastructure

### 9.1 Current State: In-Memory Store

All application state is currently held in an in-memory store (`InMemoryAppStore` class in `apps/api/src/store/appStore.ts`). Data resets on every server restart. The store includes seed data for development purposes.

### 9.2 Planned: PostgreSQL 16

PostgreSQL 16 is the approved target database. Migration from the in-memory store to PostgreSQL is a planned milestone. The hosting target is Neon PostgreSQL or an equivalent managed provider.

### 9.3 Hosting

- web application: served by the backend deployment during MVP, or split into dedicated web hosting later if needed
- backend: persistent Node hosting
- database: Neon PostgreSQL or equivalent managed PostgreSQL provider (planned)

### 9.4 CI/CD

- GitHub Actions as the official pipeline
- automatic preview deployment on every pull request
- production deployment only from a protected branch

## 10. Architecture

The system is defined as a `modular monolith`.

Current modules:

- auth (Google OAuth via popup, session tokens)
- dashboard (summary statistics)
- tasks (CRUD with validation)
- partners (CRUD with duplicate-name detection)
- contacts (CRUD nested under partners)
- templates (email template CRUD)
- profile (user profile including social profiles, media kit, goals)
- settings (accent color, theme)
- integrations/google-calendar (sync up, sync down)

Microservices are not approved for MVP v1.

## 11. Technical Policies

- every new API must live under `/api/v1`
- every mutation must be validated on the backend (via normalize functions)
- every authenticated endpoint must require an application user
- critical business logic must not live only in the frontend
- the repository must stay ready for a future second client without prematurely creating it

## 12. Versions Confirmed From the Repository

Versions verified from `package.json`:

- `@dnd-kit/core` `6.3.1`
- `@google/genai` `1.29.0`
- `@tailwindcss/vite` `4.1.14`
- `@vitejs/plugin-react` `5.0.4`
- `dotenv` `17.2.3`
- `esbuild` `0.27.4`
- `express` `4.21.2`
- `express-session` `1.19.0`
- `googleapis` `171.4.0`
- `lucide-react` `0.546.0`
- `motion` `12.23.24`
- `react` `19.0.0`
- `react-colorful` `5.6.1`
- `react-dom` `19.0.0`
- `react-joyride` `2.9.3`
- `tailwindcss` `4.1.14`
- `tsx` `4.21.0`
- `typescript` `5.8.2`
- `vite` `6.2.0`
