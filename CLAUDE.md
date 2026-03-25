# CLAUDE.md

## Commands

- `npm run dev` — start Express + Vite dev server (http://127.0.0.1:3000)
- `npm run build` — production build (Vite frontend + esbuild backend)
- `npm run lint` — type-check with `tsc --noEmit`
- `GET /api/health` — health check endpoint

## Project

Tia is a multi-user personal CRM for content creators/influencers. Each user has their own isolated data (tasks, partners, profile, settings, templates). No collaborative workspaces — each account is a personal workspace. Monorepo structure:

- `apps/web/src/` — React 19 SPA (Vite, Tailwind CSS 4, TypeScript)
- `apps/api/src/` — Express backend (auth, business logic, integrations)
- `packages/shared/src/` — domain types and API contracts (no framework deps)

## Language Policy

- UI and user-facing copy: **Spanish**
- Code, comments, docs, file names: **English**

## Current State

- PostgreSQL (Supabase) with multi-tenant data isolation (all tables scoped by user_id)
- Email/password + Google OAuth authentication (bcrypt, express-session)
- No CI/CD or production deployment

## Key Conventions

- Design system: `design-system/MASTER.md` (canonical reference for all UI work)
- Sidebar layout on desktop, bottom nav on mobile
- Pipeline statuses: Pendiente → En Progreso → En Revision → Completada → Cobrado

## Detailed Docs

See `Documentation/` for full specs: PRD, APP_FLOW, TECH_STACK, BACKEND_STRUCTURE, FRONTEND_GUIDELINES, IMPLEMENTATION_PLAN, REPOSITORY_STRATEGY.
