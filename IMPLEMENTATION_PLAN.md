# TIA - Implementation Plan

## 1. Purpose

This plan translates the product and technical canon into an executable sequence. It assumes a small product and engineering team working from the current repository. In practice, that team may consist of one human operator coordinating AI agents.

## 2. Execution Language Policy

This document is written in English for implementation clarity.

Product constraints still apply:

- TIA is a Spanish-first product
- visible UI text should remain in Spanish
- internal planning and engineering docs remain in English

## 3. Milestone 0 - Canon Approval

### Step 0.1

- work: review and approve `PRD.md`, `APP_FLOW.md`, `TECH_STACK.md`, `FRONTEND_GUIDELINES.md`, and `BACKEND_STRUCTURE.md`
- dependency: none
- suggested owner: product + tech lead
- estimate: 0.5 day

### Step 0.2

- work: freeze MVP scope and record out-of-scope backlog items
- dependency: Step 0.1
- suggested owner: product
- estimate: 0.5 day

## 4. Milestone 1 - Foundation and Repo Hardening

### Step 1.1

- work: normalize cross-platform scripts and document local setup
- dependency: Step 0.2
- suggested owner: full-stack
- estimate: 0.5 day

### Step 1.2

- work: create modular backend structure and base frontend folders for services, API client code, and shared UI
- dependency: Step 1.1
- suggested owner: full-stack
- estimate: 1 day

### Step 1.3

- work: introduce CI with typecheck, build, and smoke tests
- dependency: Step 1.1
- suggested owner: platform
- estimate: 1 day

## 5. Milestone 2 - Persistence Layer

### Step 2.1

- work: provision development and production PostgreSQL
- dependency: Step 1.3
- suggested owner: platform
- estimate: 0.5 day

### Step 2.2

- work: implement initial migrations for `users`, `user_settings`, `partners`, `contacts`, `tasks`, `templates`, and `oauth_connections`
- dependency: Step 2.1
- suggested owner: backend
- estimate: 1.5 days

### Step 2.3

- work: load optional seed data for development only
- dependency: Step 2.2
- suggested owner: backend
- estimate: 0.5 day

## 6. Milestone 3 - Auth and Session

### Step 3.1

- work: replace the current insecure session setup with a production-ready session configuration using a real secret and persistent storage
- dependency: Step 2.2
- suggested owner: backend
- estimate: 1 day

### Step 3.2

- work: implement app login with Google OAuth and a session endpoint
- dependency: Step 3.1
- suggested owner: backend
- estimate: 1.5 days

### Step 3.3

- work: protect authenticated API routes and add user middleware
- dependency: Step 3.2
- suggested owner: backend
- estimate: 0.5 day

## 7. Milestone 4 - Core CRUD APIs

### Step 4.1

- work: implement partners API
- dependency: Step 3.3
- suggested owner: backend
- estimate: 1 day

### Step 4.2

- work: implement contacts API
- dependency: Step 4.1
- suggested owner: backend
- estimate: 0.5 day

### Step 4.3

- work: implement tasks API
- dependency: Step 4.1
- suggested owner: backend
- estimate: 1 day

### Step 4.4

- work: implement templates, profile, and settings APIs
- dependency: Step 3.3
- suggested owner: backend
- estimate: 1 day

### Step 4.5

- work: implement `dashboard/summary` endpoint
- dependency: Step 4.3
- suggested owner: backend
- estimate: 0.5 day

## 8. Milestone 5 - Frontend Data Migration

### Step 5.1

- work: create a typed API client and centralized fetch layer
- dependency: Step 4.5
- suggested owner: frontend
- estimate: 1 day

### Step 5.2

- work: replace demo `AppContext` state with server-based state
- dependency: Step 5.1
- suggested owner: frontend
- estimate: 1.5 days

### Step 5.3

- work: connect Dashboard to real data
- dependency: Step 5.2
- suggested owner: frontend
- estimate: 0.5 day

### Step 5.4

- work: connect Pipeline CRUD and real views
- dependency: Step 5.2
- suggested owner: frontend
- estimate: 2 days

### Step 5.5

- work: connect Directory and real contacts
- dependency: Step 5.2
- suggested owner: frontend
- estimate: 1.5 days

### Step 5.6

- work: connect Profile and Settings to real data
- dependency: Step 5.2
- suggested owner: frontend
- estimate: 1 day

## 9. Milestone 6 - Google Calendar Integration Hardening

### Step 6.1

- work: move OAuth tokens to secure storage and the `oauth_connections` model
- dependency: Step 3.2
- suggested owner: backend
- estimate: 1 day

### Step 6.2

- work: refactor Calendar endpoints under `/api/v1`
- dependency: Step 6.1
- suggested owner: backend
- estimate: 0.5 day

### Step 6.3

- work: connect the Settings and Pipeline UI to the production Calendar flow
- dependency: Step 6.2
- suggested owner: frontend
- estimate: 1 day

### Step 6.4

- work: cover permission errors, token expiry, and reconnection flows
- dependency: Step 6.3
- suggested owner: full-stack
- estimate: 0.5 day

## 10. Milestone 7 - Design System Cleanup

### Step 7.1

- work: extract reusable components defined in `FRONTEND_GUIDELINES.md`
- dependency: Step 5.6
- suggested owner: frontend
- estimate: 1.5 days

### Step 7.2

- work: unify labels, empty states, error states, and loaders
- dependency: Step 7.1
- suggested owner: frontend
- estimate: 1 day

### Step 7.3

- work: review focus visibility, contrast, and labels for accessibility
- dependency: Step 7.2
- suggested owner: frontend
- estimate: 0.5 day

## 11. Milestone 8 - Quality Gates

### Step 8.1

- work: add API tests for auth, tasks, partners, and templates
- dependency: Step 6.4
- suggested owner: backend
- estimate: 1.5 days

### Step 8.2

- work: add critical UI tests for login, task creation, calendar sync, and contact creation
- dependency: Step 7.3
- suggested owner: frontend
- estimate: 1.5 days

### Step 8.3

- work: add error monitoring and a healthcheck
- dependency: Step 8.1
- suggested owner: platform
- estimate: 0.5 day

## 12. Milestone 9 - Release Readiness

### Step 9.1

- work: prepare preview and production environments
- dependency: Step 8.3
- suggested owner: platform
- estimate: 0.5 day

### Step 9.2

- work: run manual QA against PRD acceptance criteria
- dependency: Step 9.1
- suggested owner: product + QA
- estimate: 1 day

### Step 9.3

- work: decide the AI assistant release state
- dependency: Step 9.2
- suggested owner: product + tech lead
- estimate: 0.5 day

Rule:

- if AI still exposes secrets or lacks cost controls, it stays out of production

## 13. Critical Dependencies

- frontend migration to real data cannot start before auth and base CRUD exist
- Google Calendar cannot be considered production-ready before tokens and users persist correctly
- release readiness is blocked until demo state is no longer the primary source of truth

## 14. Global Estimate

Operational estimate for a small team:

- foundation and backend base: 1.5 to 2 weeks
- frontend migration and integrations: 1.5 to 2 weeks
- quality, deployment, and stabilization: 1 week

Estimated total for MVP v1:

- `4 to 5 weeks`

## 15. Definition of Done

An implementation task is complete only when:

- code is merged
- types pass
- build passes
- the main error path is covered
- affected documentation is updated
