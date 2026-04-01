# Tia - Implementation Plan

## 1. Purpose

This plan tracks the implementation progress of the Tia web app and defines the remaining work needed to reach production readiness. It reflects the actual state of the codebase as of March 2026.

## 2. Execution Language Policy

This document is written in English for implementation clarity.

Product constraints still apply:

- Tia is a Spanish-first product
- visible UI text should remain in Spanish
- internal planning and engineering docs remain in English

## 3. Completed Work

The following milestones have been fully or substantially completed.

### Milestone 0 - Canon Alignment [DONE]

- PRD, APP_FLOW, TECH_STACK, BACKEND_STRUCTURE, FRONTEND_GUIDELINES, and REPOSITORY_STRATEGY reviewed and approved
- MVP scope frozen as a web-first micro SaaS with mobile web support

### Milestone 1 - Repository Realignment [DONE]

- browser code moved into `apps/web`
- backend moved into `apps/api`
- shared domain types and contracts extracted into `packages/shared`
- build scripts normalized; repository builds and runs from root

### Milestone 2 - Foundation Hardening [PARTIALLY DONE]

Completed:

- backend route, service, integration, and config layers created inside `apps/api`
- frontend API client and centralized fetch layer created inside `apps/web` (`api.ts`)

Not completed:

- CI pipeline with typecheck, build, and smoke tests

### Milestone 3 - Core CRUD APIs [DONE]

All CRUD endpoints implemented and working (in-memory storage):

- partners API
- contacts API
- tasks API
- templates, profile, and settings APIs
- `dashboard/summary` endpoint

Note: data is stored in-memory. PostgreSQL persistence is not yet implemented.

### Milestone 4 - Frontend Views [DONE]

All 6 views implemented with full features:

- Dashboard (493 lines) - summary metrics and overview with goal effort widget
- Pipeline (1373 lines) - task management with full CRUD and goal selector
- Directory - partner/contact directory with full CRUD
- StrategicView - goal management with master-detail layout and aggregated metrics
- Profile - user profile with auto-save and debounce
- Settings (516 lines) - app configuration and integrations

Frontend state management:

- `AppContext.tsx` (516 lines) provides central state with optimistic updates, push notifications, and error tracking
- Views consume backend data through the typed API client
- Loading, empty, and error states handled across all views

### Milestone 5 - Google Calendar Integration [DONE]

- Google OAuth flow implemented
- Calendar sync working (create, update, delete events)
- Settings UI for connecting/disconnecting Google Calendar
- Pipeline UI reflects calendar-synced tasks

### Milestone 6 - Design System [MOSTLY DONE]

Completed:

- reusable component library in `ui.tsx`: `cx()`, `SurfaceCard`, `ScreenHeader`, `MetricCard`, `StatusBadge`, `EmptyState`, `Button`, `IconButton`, `ToggleSwitch`, `ModalPanel`, `SettingRow`
- standalone components: `AIAssistant`, `ConfirmDialog`, `CustomSelect`, `OnboardingTour`, `OverlayModal`, `Toaster`
- CSS token system in `index.css` (144 lines): surfaces, text, borders, shadows, accent system, dark mode
- accent color system with WCAG contrast enforcement (`accent.ts`)
- responsive layout: desktop sidebar + mobile bottom nav
- light/dark theme support
- shimmer loading animation, focus-visible outlines, radial gradients

Remaining:

- accessibility audit (contrast spot-checks, label coverage, screen reader testing)

### Milestone 7 - Additional Features [DONE]

- AI Assistant (Gemini + voice input) implemented as experimental feature behind env var
- Onboarding tour implemented using Joyride
- Push notifications for task reminders (today/tomorrow)
- Template variable substitution
- Partner auto-creation during task creation
- Keyboard-accessible custom select
- Portal-based modals
- Event-based toast system

### Milestone 8 - Strategic View [DONE]

- Database migration adding `goal_id` FK to `tasks` and `partners` tables (ON DELETE SET NULL)
- Backend `GET /api/v1/strategic-view` endpoint with aggregated metrics per goal
- `StrategicView` component with master-detail layout for goal management (CRUD)
- Goal selector dropdown in Pipeline task creation/edit form for bidirectional linking
- Dashboard goal effort distribution widget
- Goals management moved from Profile to Strategic View
- Partial indexes on `goal_id` columns for query performance

## 4. Remaining Work

The following milestones represent the work still needed for production readiness.

### Milestone A - PostgreSQL Persistence

#### Step A.1

- work: provision development and production PostgreSQL instances
- dependency: none
- estimate: 0.5 day

#### Step A.2

- work: implement database migrations for `users`, `user_settings`, `partners`, `contacts`, `tasks`, `templates`, and `oauth_connections`
- dependency: Step A.1
- estimate: 1.5 days

#### Step A.3

- work: replace in-memory stores in `apps/api` with PostgreSQL-backed repositories
- dependency: Step A.2
- estimate: 2 days

#### Step A.4

- work: load optional seed data for development only
- dependency: Step A.2
- estimate: 0.5 day

### Milestone B - Authentication and User Isolation

#### Step B.1

- work: replace the current session-based setup with production-ready auth using a real secret and persistent session storage
- dependency: Step A.2
- estimate: 1 day

#### Step B.2

- work: implement app login with Google OAuth and a secure session endpoint
- dependency: Step B.1
- estimate: 1.5 days

#### Step B.3

- work: protect all authenticated API routes with user middleware; ensure all queries are scoped to the authenticated user
- dependency: Step B.2
- estimate: 1 day

#### Step B.4

- work: add login/logout UI flow to the frontend
- dependency: Step B.3
- estimate: 1 day

### Milestone C - CI/CD Pipeline

#### Step C.1

- work: set up CI with typecheck, lint, build verification
- dependency: none
- estimate: 0.5 day

#### Step C.2

- work: add automated deployment pipeline for preview and production environments
- dependency: Step C.1
- estimate: 1 day

### Milestone D - Automated Tests

#### Step D.1

- work: add API integration tests for auth, tasks, partners, contacts, and templates
- dependency: Step A.3, Step B.3
- estimate: 2 days

#### Step D.2

- work: add critical UI tests for login, task creation, calendar sync, and contact creation
- dependency: Step D.1
- estimate: 1.5 days

#### Step D.3

- work: add error monitoring and a healthcheck endpoint
- dependency: Step D.1
- estimate: 0.5 day

### Milestone E - Production Deployment

#### Step E.1

- work: prepare production environment (hosting, domain, SSL, environment variables)
- dependency: Step C.2
- estimate: 1 day

#### Step E.2

- work: harden Google Calendar OAuth tokens in secure storage using the `oauth_connections` model
- dependency: Step A.3, Step B.2
- estimate: 1 day

#### Step E.3

- work: run manual QA against PRD acceptance criteria
- dependency: Step E.1, Step E.2
- estimate: 1 day

#### Step E.4

- work: decide AI Assistant release state (if it still exposes secrets or lacks cost controls, it stays out of production)
- dependency: Step E.3
- estimate: 0.5 day

#### Step E.5

- work: production launch
- dependency: Step E.4
- estimate: 0.5 day

## 5. Mobile App Readiness Gate

Creating a native mobile app becomes valid only when:

- auth is stable
- core domain contracts are stable
- the backend is the source of truth (PostgreSQL, not in-memory)
- shared contracts are reusable without depending on the web app

Before that point, mobile effort must stay focused on mobile web quality.

## 6. Remaining Effort Estimate

Operational estimate for a small team:

- PostgreSQL persistence: 1 to 1.5 weeks
- authentication and user isolation: 1 week
- CI/CD pipeline: 0.5 week
- automated tests: 1 week
- production deployment and QA: 1 week

Estimated total remaining for production readiness:

- `4 to 5 weeks`

## 7. Definition of Done

An implementation task is complete only when:

- code is merged
- types pass
- build passes
- the main error path is covered
- affected documentation is updated
