<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# TIA

TIA is a mobile-first operational CRM for content creators and influencers. It helps a creator manage deliverables, brand relationships, contacts, and calendar coordination from a single workspace.

## Documentation Language Policy

This repository uses English for:

- technical documentation
- architecture notes
- implementation plans
- code comments when needed
- file and section naming conventions

TIA itself is designed for a Spanish-speaking audience. Product copy, brand tone, and user-facing labels should remain in Spanish unless a specific feature requires another language.

## Product Context

TIA started as an experiment in Google AI Studio. The current repository continues that work as a standalone product codebase with a broader direction and fewer assumptions about the final AI provider.

The current codebase still contains prototype-era decisions:

- some product state still lives only in the client
- Google Calendar integration exists in an experimental form
- the current AI assistant implementation still reflects Gemini-based prototype work

Those details describe the current implementation, not the final product direction.

## Local Development

Requirement:

- Node.js

Setup:

1. Install dependencies with `npm install`.
2. If you want to test external integrations, create a local environment file from `.env.example`.
3. Start the app with `npm run dev`.

## Environment Variables

Current environment variables reflect the prototype and transition state of the project:

- `GEMINI_API_KEY`
  Used only by the current inherited Gemini-based assistant implementation.
- `GOOGLE_CLIENT_ID`
  Required for local Google OAuth and Calendar integration.
- `GOOGLE_CLIENT_SECRET`
  Required for local Google OAuth and Calendar integration.
- `APP_URL`
  Base application URL used for OAuth callbacks. Example: `http://localhost:3000`.

If the project moves to a different AI provider later, this documentation should be updated to reflect that decision.

## Current Runtime Shape

- Frontend: React + TypeScript + Vite
- Backend: Express
- Styling: Tailwind CSS
- External integration: Google Calendar via Google OAuth

See the rest of the Markdown canon for the approved product, flow, stack, backend structure, implementation plan, and frontend guidelines.
