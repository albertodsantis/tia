# TIA - Technology Stack Definition

## 1. Purpose

This document locks the approved technical stack for taking TIA from the current prototype to a production-ready MVP. Any framework, runtime, or infrastructure change requires an explicit update to this file.

## 2. Language and Product Context

This document is written in English for technical consistency across AI-driven workflows.

Product context still matters:

- TIA is a Spanish-first product
- visible UI copy remains in Spanish
- brand tone remains in Spanish
- engineering documentation remains in English

## 3. Stack Principles

- preserve the current React + TypeScript + Express baseline
- avoid unnecessary rewrites
- move secrets and sensitive integrations to the backend
- introduce real persistence without turning the project into microservices

## 4. Approved Frontend

### 4.1 Runtime and Language

- TypeScript `5.8.2`
- React `19.0.0`
- React DOM `19.0.0`
- Vite `6.2.0`

### 4.2 Styling and UI

- Tailwind CSS `4.1.14`
- `@tailwindcss/vite` `4.1.14`
- `@vitejs/plugin-react` `5.0.4`
- `lucide-react` `0.546.0`
- `react-colorful` `5.6.1`
- `react-joyride` `2.9.3`
- `motion` `12.23.24`

### 4.3 Frontend Conventions

- mobile-first SPA architecture
- remote data consumed through REST
- no API keys in the client bundle
- local state reserved for ephemeral UI state
- business state should originate from a persistent backend

## 5. Approved Backend

### 5.1 Runtime and Framework

- Node.js `20 LTS`
- Express `4.21.2`
- `express-session` `1.19.0` as the temporary HTTP session layer until auth is revisited
- `dotenv` `17.2.3` for local development
- `googleapis` `171.4.0`

### 5.2 Build and Tooling

- `tsx` `4.21.0` for development
- `esbuild` `0.27.4` for the server bundle
- server build target: `node20`

## 6. Approved External Integrations

- Google OAuth 2.0 for app sign-in
- Google Calendar API for deliverable synchronization

Rules:

- any production AI integration must run server-side
- `@google/genai` `1.29.0` is allowed only for prototype or controlled beta work
- direct browser-side production consumption is not approved

## 7. Approved Persistence and Infrastructure

### 7.1 Database

- PostgreSQL `16`

### 7.2 Hosting

- web application: Render Web Service or equivalent persistent Node hosting
- database: Neon PostgreSQL or equivalent managed PostgreSQL provider
- static assets: served by the same backend deployment during the MVP

### 7.3 CI/CD

- GitHub Actions as the official pipeline
- automatic preview deployment on every pull request
- production deployment only from a protected branch

## 8. Approved Architecture

The system is defined as a `modular monolith`.

Approved modules:

- auth
- dashboard
- tasks
- partners
- contacts
- templates
- profile-settings
- integrations-google-calendar

Microservices are not approved for MVP v1.

## 9. Mandatory Technical Policies

- do not store OAuth tokens in volatile memory as the final solution
- do not hardcode secrets
- do not use demo seed data as the primary production source
- every new API must live under `/api/v1`
- every mutation must be validated on the backend
- every authenticated endpoint must require an application user

## 10. Notes on the Current Repository

The current repository already contains:

- React + Vite + Tailwind
- unified Express server
- basic Google Calendar OAuth
- application state held in client memory
- Gemini assistant running in the browser

Required migration work to match the canonical stack:

- introduce a real database
- introduce real app authentication
- move sensitive integrations to the server
- replace demo state with REST fetches and mutations

## 11. Versions Confirmed From the Repository

Versions verified from `package.json` and `package-lock.json`:

- `@google/genai` `1.29.0`
- `@tailwindcss/vite` `4.1.14`
- `@vitejs/plugin-react` `5.0.4`
- `express` `4.21.2`
- `express-session` `1.19.0`
- `dotenv` `17.2.3`
- `googleapis` `171.4.0`
- `lucide-react` `0.546.0`
- `motion` `12.23.24`
- `react` `19.0.0`
- `react-colorful` `5.6.1`
- `react-dom` `19.0.0`
- `react-joyride` `2.9.3`
- `esbuild` `0.27.4`
- `tailwindcss` `4.1.14`
- `tsx` `4.21.0`
- `typescript` `5.8.2`
- `vite` `6.2.0`
