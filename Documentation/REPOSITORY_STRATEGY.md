# Efi - Repository Strategy

## 1. Purpose

This document defines how the repository is structured to support Efi as a micro SaaS and how it should evolve as the product matures.

It is not a product roadmap. It is the engineering and repository strategy that keeps product delivery aligned with the intended distribution model.

## 2. Product Delivery Strategy

Efi is delivered in this order:

1. Web application as the primary product surface
2. Mobile web experience from the same responsive web application
3. Native mobile application only after backend and domain contracts are stable

The repository is optimized for `web-first`, `API-first`, and `shared-domain-first` development.

## 3. Non-Negotiable Repository Principles

- The web app is the primary product client until further notice
- Mobile web is a required quality target, not a separate codebase
- Backend APIs are the source of truth for business state
- Critical business logic must not live only in the client
- Shared types and contracts must be reusable by future clients
- Native mobile is a later delivery surface, not a current implementation driver

## 4. Repository Structure

The monorepo is organized into three workspaces:

```text
efi/
├── Documentation/          # all project documentation
│   ├── PRD.md
│   ├── APP_FLOW.md
│   ├── TECH_STACK.md
│   ├── BACKEND_STRUCTURE.md
│   ├── FRONTEND_GUIDELINES.md
│   ├── IMPLEMENTATION_PLAN.md
│   └── REPOSITORY_STRATEGY.md
├── design-system/
│   └── MASTER.md
├── apps/
│   ├── api/                # Express backend
│   └── web/                # React SPA
├── packages/
│   └── shared/             # shared domain types and contracts
├── README.md
├── package.json
└── tsconfig.json
```

### Responsibilities

- **apps/web** — Responsive web application for desktop and mobile browsers. React 19, TypeScript, Vite, Tailwind CSS 4. Includes all views (Dashboard, Pipeline, Directory, Profile, Settings), UI components, and the client-side application context.

- **apps/api** — Backend application: auth flows, business rules, in-memory persistence, and external integrations (Google OAuth, Google Calendar, Gemini AI). Express with TypeScript, built with esbuild.

- **packages/shared** — Shared domain models (`domain.ts`), API contracts (`contracts/`), and pure reusable helpers. No React-specific or Express-specific assumptions. Consumed by both `apps/web` and `apps/api`.

- **Documentation/** — All project documentation: PRD, application flow, tech stack, backend structure, frontend guidelines, implementation plan, and this repository strategy.

- **design-system/** — Canonical design system authority (`MASTER.md`). The single source of truth for the visual system and reusable UI rules.

## 5. What Changed from the Prototype

The following structural changes have been completed:

- Frontend and backend source code moved out of a flat root structure into `apps/web` and `apps/api`
- API and domain contracts extracted into explicit types in `packages/shared`
- External integrations (Google Calendar, Google OAuth, Gemini AI) are backend-owned
- Project documentation consolidated into the `Documentation/` folder
- The repository supports more than one client without prematurely building them
- A unified dev server (`npm run dev`) runs Express with Vite middleware mode
- Build pipeline produces both a Vite frontend bundle and an esbuild backend bundle

Current transitional state: all features are implemented with **in-memory storage**. Client-side state is synced through the API layer, but the backend does not yet persist to a database.

## 6. Current Development Rules

- Keep one repository (monorepo)
- Avoid microservices
- Avoid a native mobile app codebase
- Prefer incremental structural changes over rewrites
- Run `npm run lint` (TypeScript type checking) to validate changes

## 7. Forward-Looking Roadmap

The next phases of repository evolution, in order:

1. **PostgreSQL persistence** — replace in-memory storage with a real database
2. **Real authentication** — replace the prototype auth flow with production-grade auth
3. **CI/CD pipeline** — automated testing, linting, and deployment
4. **Production deployment** — hosting, environment management, monitoring
5. **Native mobile client** — revisit only after the API contracts are mature and stable

`apps/mobile` is intentionally not created yet. It becomes valid only after the web and API contracts are stable enough to justify a second client runtime.

## 8. Definition of Success

The repository is aligned with this strategy when:

- A contributor can identify where web, backend, and shared code belong
- Product logic is not trapped in the browser
- The web app can evolve without blocking a future mobile client
- The backend contracts are reusable for future channels
- The repository structure reflects the intended business model of a micro SaaS
