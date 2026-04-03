# Efi - Backend Structure

## 1. Purpose

This document defines the backend architecture, data model, API contract, and validation layer for Efi. The backend is a modular monolith with a REST API, currently backed by an in-memory store with PostgreSQL 16 planned as the target database.

## 2. Language and Audience Context

This document is written in English for technical consistency.

Product-facing behavior still follows these rules:

- Efi serves Spanish-speaking users
- visible UI text remains in Spanish
- backend contracts and engineering documentation remain in English

Repository strategy still applies:

- the backend is the system of record for desktop web, mobile web, and future native clients
- backend contracts must not assume a single long-term client surface

## 3. Architecture

Architecture type: `modular monolith`

Layers:

1. `HTTP Layer` - Express routes (`server.ts`, `routes/v1.ts`, `routes/auth.ts`, `routes/calendar.ts`)
2. `Application Store` - In-memory state with validation (`store/appStore.ts`)
3. `Shared Contracts` - TypeScript types and interfaces (`packages/shared`)
4. `External Integrations` - Google OAuth 2.0, Google Calendar API

Canonical modules:

- auth
- dashboard
- tasks
- partners
- contacts
- templates
- profile
- settings
- integrations/google-calendar

Client rule:

- the backend must remain usable by the current web client and by a later mobile app without redesigning the domain model

## 4. Current Persistence: In-Memory Store

### 4.1 Implementation

All state is held in an `InMemoryAppStore` class (`apps/api/src/store/appStore.ts`). The store is initialized with seed data on server startup and resets on every restart. It uses `structuredClone` for safe copy semantics on all reads and writes.

### 4.2 Planned Migration: PostgreSQL 16

PostgreSQL 16 is the approved target database. The migration will preserve the same domain model and API contracts. Hosting target: Neon PostgreSQL or equivalent managed provider.

## 5. Data Model

All domain types are defined in `packages/shared/src/domain.ts`.

### 5.1 Enumerations

`TaskStatus`

- `Pendiente`
- `En Progreso`
- `En Revision`
- `Completada`
- `Cobrado`

`PartnerStatus`

- `Prospecto`
- `En Negociacion`
- `Activo`
- `Inactivo`
- `On Hold`
- `Relacion Culminada`

`PartnershipType`

- `Permanente`
- `One Time`
- `Por definir`

`AppTheme`

- `light`
- `dark`

`GoalStatus`

- `Pendiente`
- `En Curso`
- `Alcanzado`
- `Cancelado`

`GoalPriority`

- `Baja`
- `Media`
- `Alta`

### 5.2 Core Entities

#### Task

| field | type | rules |
| --- | --- | --- |
| id | string | generated UUID |
| title | string | required, trimmed |
| description | string | required, trimmed |
| partnerId | string | required, must reference existing partner |
| goalId | string? | optional, references a goal (FK with ON DELETE SET NULL) |
| status | TaskStatus | required |
| dueDate | string | required, valid date |
| value | number | required, >= 0 |
| gcalEventId | string? | optional, Google Calendar event ID |

#### Partner

| field | type | rules |
| --- | --- | --- |
| id | string | generated UUID |
| name | string | required, trimmed, collapsed whitespace, unique (case-insensitive) |
| status | PartnerStatus | required |
| goalId | string? | optional, references a goal (FK with ON DELETE SET NULL) |
| logo | string? | optional |
| contacts | Contact[] | nested array |
| keyTerms | string? | optional |
| partnershipType | PartnershipType? | defaults to `Por definir` |
| startDate | string? | optional |
| endDate | string? | optional |
| monthlyRevenue | number? | defaults to 0 |
| annualRevenue | number? | defaults to 0 |
| mainChannel | string? | optional |

#### Contact

| field | type | rules |
| --- | --- | --- |
| id | string | generated UUID |
| name | string | required, trimmed |
| role | string | required, trimmed |
| email | string | required, validated email format, lowercased |
| ig | string | optional, auto-prefixed with `@` |
| phone | string? | optional |

#### Template

| field | type | rules |
| --- | --- | --- |
| id | string | generated UUID |
| name | string | required, trimmed |
| subject | string | required, trimmed |
| body | string | required, trimmed |

#### UserProfile

| field | type | rules |
| --- | --- | --- |
| name | string | required, trimmed |
| avatar | string | required, trimmed |
| handle | string | required, auto-prefixed with `@` |
| socialProfiles | SocialProfiles | 5-platform object |
| mediaKit | MediaKitProfile | 13-section media kit |
| goals | Goal[] | array of career goals |
| notificationsEnabled | boolean | default false |

#### SocialProfiles

| field | type |
| --- | --- |
| instagram | string |
| tiktok | string |
| x | string |
| threads | string |
| youtube | string |

#### MediaKitProfile

A rich profile document with the following sections:

| field | type | description |
| --- | --- | --- |
| periodLabel | string | display period |
| updatedLabel | string | last updated label |
| tagline | string | creator tagline |
| contactEmail | string | contact email |
| featuredImage | string | hero image path |
| aboutTitle | string | about section heading |
| aboutParagraphs | string[] | bio paragraphs |
| topicTags | string[] | content topic tags |
| insightStats | MediaKitMetric[] | follower/engagement stats |
| audienceGender | MediaKitMetric[] | gender breakdown |
| ageDistribution | MediaKitMetric[] | age range breakdown |
| topCountries | MediaKitMetric[] | audience geography |
| portfolioImages | string[] | portfolio image paths |
| servicesTitle | string | services section heading |
| servicesDescription | string | services intro text |
| offerings | MediaKitOffer[] | service/pricing items |
| brandsTitle | string | brands section heading |
| trustedBrands | string[] | brand name list |
| closingTitle | string | CTA heading |
| closingDescription | string | CTA text |
| footerNote | string | footer text |

`MediaKitMetric`: `{ label: string, value: string }`

`MediaKitOffer`: `{ title: string, price: string, description: string }`

#### Goal

| field | type | rules |
| --- | --- | --- |
| id | string | generated UUID or preserved |
| area | string | career area |
| generalGoal | string | goal description |
| successMetric | string | how success is measured |
| specificTarget | string | target value |
| timeframe | string | time horizon |
| status | GoalStatus | defaults to `Pendiente` |
| priority | GoalPriority | defaults to `Media` |
| revenueEstimation | number | defaults to 0 |

#### AppState

| field | type |
| --- | --- |
| tasks | Task[] |
| partners | Partner[] |
| profile | UserProfile |
| accentColor | string |
| templates | Template[] |
| theme | AppTheme |

### 5.3 Relationships

```text
AppState contains:
  tasks[]         (each task references a partner by partnerId, optionally a goal by goalId)
  partners[]      (each partner contains contacts[], optionally references a goal by goalId)
  profile         (contains socialProfiles, mediaKit, goals[])
  templates[]
  accentColor
  theme

Goal relationships:
  goals[] are stored in profile
  tasks.goal_id   -> goals.id (FK, ON DELETE SET NULL)
  partners.goal_id -> goals.id (FK, ON DELETE SET NULL)
```

## 6. Validation Layer

The in-memory store includes a comprehensive validation layer with the following normalizer functions:

| function | behavior |
| --- | --- |
| `normalizeRequiredText` | trims input, throws if empty |
| `normalizeOptionalText` | trims input, returns undefined if empty |
| `normalizeText` | trims input, returns empty string if empty |
| `normalizePartnerName` | trims and collapses whitespace, throws if empty |
| `normalizeDate` | trims, validates as parseable date |
| `normalizeMoney` | validates number >= 0 |
| `normalizeEmail` | trims, validates email format, lowercases |
| `normalizeAccentColor` | trims, validates 6-digit hex color |
| `normalizeMetricList` | normalizes arrays of `{ label, value }` with fallbacks |
| `normalizeOfferList` | normalizes arrays of `{ title, price, description }` with fallbacks |
| `normalizeStringList` | normalizes string arrays with fallbacks |
| `normalizeMediaKitProfile` | deep normalization of all media kit sections |
| `findPartnerByName` | case-insensitive, whitespace-normalized partner lookup |

All mutations are validated at the store level before state is modified. Validation errors are surfaced as HTTP 400 responses with Spanish-language error messages.

## 7. API Endpoints

### 7.1 Route Mounting

Routes are mounted in `apps/api/src/server.ts`:

```text
/api/health        health check (inline)
/api/v1/*          CRUD endpoints (routes/v1.ts)
/api/auth/*        OAuth endpoints (routes/auth.ts)
/api/calendar/*    Calendar endpoints (routes/calendar.ts)
```

### 7.2 Health

#### `GET /api/health`

- auth: none
- response 200:

```json
{ "ok": true }
```

### 7.3 Bootstrap

#### `GET /api/v1/bootstrap`

Returns the full application state in a single request. Used by the frontend on initial load.

- auth: none (session not enforced in current implementation)
- response 200:

```json
{
  "appState": {
    "tasks": [],
    "partners": [],
    "profile": { ... },
    "accentColor": "#C96F5B",
    "templates": [],
    "theme": "light"
  }
}
```

### 7.4 Dashboard

#### `GET /api/v1/dashboard/summary`

- auth: none (session not enforced in current implementation)
- response 200:

```json
{
  "activePipelineValue": 4300,
  "tasksToday": 2,
  "upcomingTasks": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "partnerId": "string",
      "status": "Pendiente",
      "dueDate": "2026-04-01",
      "value": 1500
    }
  ]
}
```

Note: `activePipelineValue` sums the `value` field of all tasks where status is not `Cobrado`. `upcomingTasks` returns the 4 nearest tasks sorted by due date.

### 7.5 Tasks

#### `GET /api/v1/tasks`

- response 200: `Task[]`

#### `POST /api/v1/tasks`

- request:

```json
{
  "title": "Reel de lanzamiento",
  "description": "Video 60s",
  "partnerId": "uuid",
  "goalId": "optional-goal-uuid",
  "status": "Pendiente",
  "dueDate": "2026-04-01",
  "value": 1500,
  "gcalEventId": "optional-google-event-id"
}
```

- response 201: created `Task`
- response 400: `{ "error": "message" }` on validation failure

#### `PATCH /api/v1/tasks/:taskId`

- request: any valid subset of task fields
- response 200: updated `Task`
- response 404: `{ "error": "Task not found" }`
- response 400: `{ "error": "message" }` on validation failure

#### `DELETE /api/v1/tasks/:taskId`

- response 200: `{ "success": true }`
- response 404: `{ "error": "Task not found" }`

### 7.6 Partners

#### `GET /api/v1/partners`

- response 200: `Partner[]`

#### `POST /api/v1/partners`

- request:

```json
{
  "name": "TechBrand",
  "status": "Prospecto",
  "logo": "optional-url",
  "partnershipType": "Por definir",
  "keyTerms": "",
  "startDate": "2026-01-01",
  "endDate": "2026-12-31",
  "monthlyRevenue": 1200,
  "annualRevenue": 14400,
  "mainChannel": "Instagram/TikTok"
}
```

- behavior: if a partner with the same name already exists (case-insensitive, whitespace-normalized), the existing partner is returned instead of creating a duplicate
- response 201: created or existing `Partner`
- response 400: `{ "error": "message" }` on validation failure

#### `PATCH /api/v1/partners/:partnerId`

- request: any valid subset of partner fields
- response 200: updated `Partner`
- response 404: `{ "error": "Partner not found" }`
- response 400: `{ "error": "message" }` on validation failure (includes duplicate name check)

### 7.7 Contacts

#### `POST /api/v1/partners/:partnerId/contacts`

- request:

```json
{
  "name": "Laura Gomez",
  "role": "PR Manager",
  "email": "laura@techbrand.com",
  "ig": "laurapr",
  "phone": "optional"
}
```

- behavior: `ig` is auto-prefixed with `@` if not already present
- response 201: created `Contact`
- response 404: `{ "error": "Partner not found" }`
- response 400: `{ "error": "message" }` on validation failure

#### `PATCH /api/v1/contacts/:contactId`

- request: any valid subset of contact fields
- response 200: updated `Contact`
- response 404: `{ "error": "Contact not found" }`
- response 400: `{ "error": "message" }` on validation failure

#### `DELETE /api/v1/contacts/:contactId`

- response 200: `{ "success": true }`
- response 404: `{ "error": "Contact not found" }`

### 7.8 Profile

#### `GET /api/v1/profile`

- response 200: `UserProfile`

#### `PATCH /api/v1/profile`

- request: any valid subset of profile fields

```json
{
  "name": "Maggie Dayz",
  "avatar": "/IMG_3522.JPG",
  "handle": "@maggiedayz",
  "socialProfiles": {
    "instagram": "@maggiedayz",
    "tiktok": "@maggiedayz"
  },
  "mediaKit": {
    "tagline": "new tagline",
    "insightStats": [{ "label": "Seguidores", "value": "25K" }]
  },
  "goals": [
    {
      "id": "g1",
      "area": "Influencer / Contenido",
      "generalGoal": "Aumentar audiencia",
      "successMetric": "Seguidores",
      "specificTarget": "300K",
      "timeframe": "Anual",
      "status": "En Curso",
      "priority": "Alta",
      "revenueEstimation": 14400
    }
  ],
  "notificationsEnabled": true
}
```

- behavior: `socialProfiles` and `mediaKit` are partial-merged with current values. `goals` replaces the entire array. `handle` is auto-prefixed with `@`.
- response 200: updated `UserProfile`
- response 400: `{ "error": "message" }` on validation failure

### 7.9 Strategic View

#### `GET /api/v1/strategic-view`

Returns aggregated metrics per goal, plus unassigned totals for tasks and partners not linked to any goal.

- auth: session required
- response 200:

```json
{
  "goals": [
    {
      "goal": { "id": "uuid", "area": "Contenido", "generalGoal": "Aumentar audiencia", "..." : "..." },
      "taskCount": 5,
      "totalValue": 12000,
      "completedTaskCount": 2,
      "partnerCount": 3,
      "partners": [
        { "id": "uuid", "name": "TechBrand" }
      ]
    }
  ],
  "unassigned": {
    "taskCount": 8,
    "totalValue": 5000,
    "partnerCount": 4
  }
}
```

The endpoint runs 5 parallel SQL queries grouped by `goal_id` to aggregate task counts, values, completed counts, and partner counts per goal.

### 7.10 Settings

#### `GET /api/v1/settings`

- response 200:

```json
{
  "accentColor": "#C96F5B",
  "theme": "light"
}
```

#### `PATCH /api/v1/settings`

- request:

```json
{
  "accentColor": "#3B82F6",
  "theme": "dark"
}
```

- response 200: updated settings object
- response 400: `{ "error": "message" }` on validation failure (invalid hex color or invalid theme)

### 7.11 Templates

#### `GET /api/v1/templates`

- response 200: `Template[]`

#### `POST /api/v1/templates`

- request:

```json
{
  "name": "Primer contacto",
  "subject": "Propuesta de colaboracion",
  "body": "Hola {{contactName}},\n\n..."
}
```

- response 201: created `Template`
- response 400: `{ "error": "message" }` on validation failure

#### `DELETE /api/v1/templates/:templateId`

- response 200: `{ "success": true }`
- response 404: `{ "error": "Template not found" }`

### 7.12 Auth (Google OAuth)

Auth routes are mounted at `/api/auth` (not `/api/v1`).

#### `GET /api/auth/google/url`

Generates a Google OAuth consent URL for Calendar access.

- auth: none
- scopes requested: `calendar.events`, `calendar.readonly`
- response 200:

```json
{ "url": "https://accounts.google.com/o/oauth2/v2/auth?..." }
```

#### `GET /api/auth/google/callback`

OAuth callback handler. Exchanges the authorization code for tokens and stores them in the session.

- auth: none (OAuth redirect)
- behavior: returns an HTML page that posts `OAUTH_AUTH_SUCCESS` to the opener window and closes itself (popup flow)
- response: inline HTML

#### `GET /api/auth/status`

- response 200:

```json
{ "connected": true }
```

#### `POST /api/auth/logout`

Clears the session tokens.

- response 200:

```json
{ "success": true }
```

### 7.13 Calendar Integration

Calendar routes are mounted at `/api/calendar` (not `/api/v1`).

#### `POST /api/calendar/sync`

Syncs a task to Google Calendar. Creates a new event or updates an existing one if `gcalEventId` is provided.

- auth: requires session tokens (returns 401 if not authenticated)
- request:

```json
{
  "task": {
    "title": "Reel de lanzamiento",
    "description": "Video 60s",
    "partnerName": "TechBrand",
    "dueDate": "2026-04-01",
    "gcalEventId": "optional-existing-event-id"
  }
}
```

- behavior: creates an all-day calendar event with summary `Entrega: {title}` and description including the partner name. If `gcalEventId` is present, updates the existing event instead.
- response 200:

```json
{
  "success": true,
  "eventId": "google-calendar-event-id"
}
```

- response 401: `{ "error": "Not authenticated" }`
- response 500: `{ "error": "Failed to sync to calendar" }`

#### `POST /api/calendar/sync-down`

Fetches updated dates from Google Calendar for a set of previously synced events.

- auth: requires session tokens (returns 401 if not authenticated)
- request:

```json
{
  "eventIds": ["google-event-id-1", "google-event-id-2"]
}
```

- behavior: for each event ID, fetches the current start date from Google Calendar. Skips events that return 404 (deleted).
- response 200:

```json
{
  "success": true,
  "updatedEvents": [
    { "eventId": "google-event-id-1", "dueDate": "2026-04-03" }
  ]
}
```

- response 400: `{ "error": "eventIds array is required" }`
- response 401: `{ "error": "Not authenticated" }`
- response 500: `{ "error": "Failed to sync down from calendar" }`

## 8. Error Contracts

Error response format:

```json
{ "error": "Human-readable error message" }
```

Validation errors use Spanish-language messages from the normalize functions (e.g., `"El titulo es obligatorio."`, `"La fecha no es valida."`).

HTTP status codes in use:

- `200` successful read or update
- `201` successful creation
- `400` validation error or bad request
- `401` not authenticated (calendar endpoints)
- `404` resource not found
- `500` internal server error (calendar sync failures)

## 9. Backend Limits and Rules

- OAuth tokens are stored in the server session and are never exposed to the frontend
- payloads are never accepted without validation (all mutations go through normalize functions)
- no new functionality is exposed outside versioned APIs (except auth and calendar which use `/api/auth` and `/api/calendar`)
- Calendar sync must never block base task CRUD
- partner names are unique per case-insensitive, whitespace-normalized comparison
- all state reads use `structuredClone` to prevent mutation leaks
- the store is initialized with seed data for development (3 tasks, 2 partners, 4 templates, 5 goals)

## 10. Future Milestones

- migrate from in-memory store to PostgreSQL 16
- introduce real user authentication (currently single-user, no user scoping)
- add user scoping to all queries (`user_id` foreign keys)
- encrypt OAuth tokens at rest
- add PATCH endpoint for templates (currently only create and delete)
- add DELETE endpoint for partners (currently only create and update)
