# Efi - Backend Structure

## 1. Purpose

This document defines the backend architecture, data model, API contract, and validation layer for Efi. The backend is a modular monolith backed by PostgreSQL (via Supabase) with full multi-tenant data isolation.

## 2. Language and Audience Context

This document is written in English for technical consistency.

Product-facing behavior still follows these rules:

- Efi serves Spanish-speaking users
- visible UI text remains in Spanish
- backend contracts and engineering documentation remain in English

## 3. Architecture

Architecture type: `modular monolith`

Layers:

1. `HTTP Layer` — Express routes (`server.ts`, `app.ts`, `routes/v1.ts`, `routes/auth.ts`, `routes/calendar.ts`, `routes/mediakit.ts`)
2. `Auth Middleware` — `requireAuth()` in `v1.ts`; session backed by `connect-pg-simple`
3. `Repository` — `PostgresAppStore` in `db/repository.ts`; all queries scoped by `user_id`
4. `Database` — PostgreSQL via Supabase; 14 migrations in `db/migrations/`
5. `Services` — `GamificationService` (`services/gamification.ts`)
6. `Shared Contracts` — TypeScript types and interfaces (`packages/shared`)
7. `External Integrations` — Google OAuth 2.0, Google Calendar API, Supabase Storage

Canonical modules:

- auth (registration, login, Google OAuth, session, logout, account deletion)
- dashboard (summary metrics, period filtering)
- tasks (CRUD, checklist items, Calendar event tracking)
- partners (CRUD, status tracking, financial tracking)
- contacts (CRUD nested under partners)
- templates (message template CRUD)
- profile (user profile, social profiles, modular block composer, profession)
- settings (accent color, theme, notification preferences)
- integrations/google-calendar (sync up, sync down)
- public-mediakit (server-rendered HTML at `/mk/:handle`, no auth)
- gamification/efisystem (XP points, levels, badges)

Client rule:

- the backend must remain usable by the current web client and by a later mobile app without redesigning the domain model

## 4. Persistence: PostgreSQL via Supabase

All application state is persisted in PostgreSQL hosted on Supabase. The `PostgresAppStore` class in `apps/api/src/db/repository.ts` handles all queries.

- `pg` pool initialized in `db/connection.ts`
- 14 SQL migrations in `db/migrations/`, run automatically on startup via `db/migrate.ts`
- Sessions persisted in the `session` table via `connect-pg-simple`
- File storage (avatars, portfolio images) handled via Supabase Storage through `lib/storage.ts`
- Full multi-tenant isolation: every table has a `user_id` foreign key; all queries filter by `user_id`
- Row-level security enabled (migration 006)

## 5. Authentication

### 5.1 Providers

Two authentication providers are supported:

- **Email/password**: bcryptjs, 10 rounds. Stored as `provider = 'email'` in the `users` table.
- **Google OAuth**: Two paths exist:
  - **Supabase redirect (primary, used by the UI)**: browser calls `supabase.auth.signInWithOAuth({ provider: 'google' })` → full-page redirect to Google → redirected back to the app → `App.tsx` detects the Supabase session → sends `access_token` to `POST /api/auth/google/supabase` → backend validates the token using the Supabase Admin client (`@supabase/supabase-js`) → upserts the user in the `users` table → sets the Express session → client clears the Supabase session.
  - **Direct googleapis popup (alternative backend path, not the primary UI flow)**: `GET /api/auth/google/login-url` generates a URL using `googleapis` with `openid`/`userinfo` scopes → client opens a popup → `GET /api/auth/google/callback` handles code exchange and sets the session directly.

### 5.2 Session

- `express-session` backed by `connect-pg-simple` (table: `session`)
- Session cookie: `httpOnly`, `sameSite: 'lax'`, `secure` in production, 30-day max age
- `SessionUser` type (`packages/shared/src/contracts/auth.ts`) stored in session: `{ id, email, name, avatar, provider }`

### 5.3 Middleware

`requireAuth(pool)` in `routes/v1.ts`:
- Rejects if no session user
- Verifies the user still exists in the `users` table (guards against deleted accounts)
- Attaches `userId` to the request object
- Applied to all `/api/v1/*` routes

### 5.4 Rate Limiting

Auth endpoints (`/api/auth/*`) are protected with `express-rate-limit`: 20 requests per 15-minute window.

### 5.5 New User Setup

`ensureUserData()` in `routes/auth.ts` is called on first login for any provider. It creates the `user_profile` and `user_settings` rows for the new user (`ON CONFLICT DO NOTHING`/`DO UPDATE`).

## 6. Data Model

All domain types are defined in `packages/shared/src/domain.ts`.

### 6.1 Enumerations

`TaskStatus`

- `Pendiente`
- `En Progreso`
- `En Revisión`
- `Completada`
- `Cobrado`

`PartnerStatus`

- `Prospecto`
- `En Negociación`
- `Activo`
- `Inactivo`
- `On Hold`
- `Relación Culminada`

`PartnershipType`

- `Permanente`
- `Plazo Fijo`
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

`FreelancerType`

- `content_creator`, `podcaster`, `streamer`, `radio`, `photographer`, `copywriter`, `community_manager`, `host_mc`, `speaker`, `dj`, `recruiter`, `coach`

`BlockType` (profile block composer)

- `identity`, `about`, `metrics`, `portfolio`, `brands`, `services`, `closing`, `testimonials`, `press`, `speaking_topics`, `video_reel`, `equipment`, `awards`, `faq`, `episodes`, `releases`, `links`

### 6.2 Core Entities

#### Task

| field | type | rules |
| --- | --- | --- |
| id | string | generated UUID |
| title | string | required, trimmed |
| description | string | required, trimmed |
| partnerId | string | required, must reference existing partner |
| goalId | string? | optional, ON DELETE SET NULL |
| status | TaskStatus | required |
| dueDate | string | required, valid date |
| value | number | required, >= 0 |
| gcalEventId | string? | optional, Google Calendar event ID |
| createdAt | string | ISO timestamp |
| completedAt | string? | set when status → Completada |
| cobradoAt | string? | set when status → Cobrado |
| actualPayment | number? | optional override for actual payment received |
| checklistItems | ChecklistItem[] | per-task checklist; stored as JSONB |

#### ChecklistItem

| field | type |
| --- | --- |
| id | string |
| text | string |
| done | boolean |

#### Partner

| field | type | rules |
| --- | --- | --- |
| id | string | generated UUID |
| name | string | required, trimmed, unique per user (case-insensitive) |
| status | PartnerStatus | required |
| goalId | string? | optional, ON DELETE SET NULL |
| logo | string? | optional |
| contacts | Contact[] | nested array |
| keyTerms | string? | optional |
| partnershipType | PartnershipType? | defaults to `Por definir` |
| startDate | string? | optional |
| endDate | string? | optional |
| monthlyRevenue | number? | defaults to 0 |
| annualRevenue | number? | defaults to 0 |
| mainChannel | string? | optional |
| createdAt | string | ISO timestamp |
| lastContactedAt | string? | optional, last interaction timestamp |
| source | string? | optional, how the partner was acquired |

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
| body | string | required, trimmed |

Note: templates do not have a `subject` field (removed in migration 005).

#### UserProfile

| field | type | rules |
| --- | --- | --- |
| name | string | required, trimmed |
| avatar | string | required, trimmed |
| handle | string | required, auto-prefixed with `@` |
| socialProfiles | SocialProfiles | 5-platform object |
| mediaKit | MediaKitProfile | block-based profile document |
| goals | Goal[] | array of career goals |
| notificationsEnabled | boolean | default false |
| primaryProfession | FreelancerType? | optional, selected during onboarding |
| secondaryProfessions | FreelancerType[] | optional secondary profession labels |

#### SocialProfiles

| field | type |
| --- | --- |
| instagram | string |
| tiktok | string |
| x | string |
| threads | string |
| youtube | string |

#### MediaKitProfile

The media kit profile is a block-based document. The block system controls which blocks are visible and in what order. Each block type has its own data fields.

Block system controls:

| field | type | description |
| --- | --- | --- |
| enabledBlocks | BlockType[] | which blocks are active/visible |
| blockOrder | BlockType[] | display order of blocks |
| blockComponents | Record\<string, string[]\> | per-block component visibility config |

Core block data fields (abbreviated — see `domain.ts` for full spec):

- **Identity block**: `periodLabel`, `updatedLabel`, `tagline`, `contactEmail`
- **About block**: `featuredImage`, `aboutTitle`, `aboutParagraphs[]`, `topicTags[]`
- **Metrics block**: `insightStats[]`, `audienceGender[]`, `ageDistribution[]`, `topCountries[]`
- **Portfolio block**: `portfolioImages[]`
- **Services block**: `servicesTitle`, `servicesDescription`, `offerings[]`
- **Brands block**: `brandsTitle`, `trustedBrands[]`
- **Closing block**: `closingTitle`, `closingDescription`, `footerNote`
- **Testimonials block**: `testimonials[]` (`{ quote, author, company, role }`)
- **Press block**: `press[]` (`{ publication, headline, url, year }`)
- **Speaking topics block**: `speakingTopics[]` (`{ title, description }`)
- **Video reel block**: `videoReels[]` (`{ url, label }`)
- **Equipment block**: `equipment[]` (`{ item, description }`)
- **Awards block**: `awards[]` (`{ name, issuer, year }`)
- **FAQ block**: `faq[]` (`{ question, answer }`)
- **Episodes block**: `episodes[]` (`{ title, description, listenUrl }`)
- **Releases block**: `releases[]` (`{ name, platforms[] }`)
- **Links block**: `links[]` (`{ label, url }`)

#### Goal

| field | type | rules |
| --- | --- | --- |
| id | string | generated UUID |
| area | string | career area |
| generalGoal | string | goal description |
| successMetric | string | how success is measured |
| timeframe | number | duration in months (1–36) |
| targetDate | string | ISO date (createdAt + timeframe months) |
| createdAt | string | ISO timestamp, set on first save |
| status | GoalStatus | defaults to `Pendiente` |
| priority | GoalPriority | defaults to `Media` |
| revenueEstimation | number | defaults to 0 |

Note: `specificTarget` field was removed in migration 009.

#### AppState

| field | type |
| --- | --- |
| tasks | Task[] |
| partners | Partner[] |
| profile | UserProfile |
| accentColor | string |
| templates | Template[] |
| theme | AppTheme |

#### EfisystemSnapshot

| field | type |
| --- | --- |
| totalPoints | number |
| currentLevel | number |
| unlockedBadges | BadgeKey[] |

`BadgeKey` values: `perfil_estelar`, `vision_clara`, `circulo_intimo`, `directorio_dorado`, `motor_de_ideas`, `promesa_cumplida`, `creador_imparable`, `negocio_en_marcha`, `lluvia_de_billetes`

### 6.3 Relationships

```text
users (1)
  → user_profile (1:1)
  → user_settings (1:1)
  → partners (1:N)
      → contacts (1:N per partner)
  → tasks (1:N)
      → checklistItems (JSONB on task)
  → goals (1:N, stored in user_profile.goals)
  → templates (1:N)
  → efisystem_transactions (1:N, append-only)
  → efisystem_badges (1:N)
  → efisystem_summary (1:1)

tasks.goal_id    → goals.id (FK, ON DELETE SET NULL)
partners.goal_id → goals.id (FK, ON DELETE SET NULL)
```

## 7. API Endpoints

### 7.1 Route Mounting

Routes are mounted in `apps/api/src/app.ts`:

```text
/api/health        health check (inline)
/mk/*              public media kit renderer (mediakit.ts, no auth)
/api/v1/*          authenticated CRUD endpoints (routes/v1.ts)
/api/auth/*        auth endpoints (routes/auth.ts, rate-limited)
/api/calendar/*    calendar endpoints (routes/calendar.ts)
```

### 7.2 Health

#### `GET /api/health`

- auth: none
- response 200: `{ "ok": true }`

### 7.3 Bootstrap

#### `GET /api/v1/bootstrap`

Returns the full application state plus the Efisystem gamification snapshot in a single request.

- auth: session required
- response 200:

```json
{
  "appState": {
    "tasks": [],
    "partners": [],
    "profile": { "..." : "..." },
    "accentColor": "#C96F5B",
    "templates": [],
    "theme": "light"
  },
  "efisystem": {
    "totalPoints": 0,
    "currentLevel": 1,
    "unlockedBadges": []
  }
}
```

### 7.4 Efisystem

#### `GET /api/v1/efisystem`

- auth: session required
- response 200: `EfisystemSnapshot`

### 7.5 Dashboard

#### `GET /api/v1/dashboard/summary`

- auth: session required
- query params: `period` (`this_month` | `last_month` | `this_year` | `all_time`)
- response 200: `DashboardSummaryResponse`

### 7.6 Tasks

#### `GET /api/v1/tasks`
- response 200: `Task[]`

#### `POST /api/v1/tasks`
- request: `CreateTaskRequest` (title, partnerId, status, dueDate, value, description, goalId?, gcalEventId?)
- response 201: `Task`; may include `EfisystemAward` if points were earned

#### `PATCH /api/v1/tasks/:taskId`
- request: `UpdateTaskRequest` (any subset of task fields)
- response 200: `Task`; may include `EfisystemAward`

#### `DELETE /api/v1/tasks/:taskId`
- response 200: `{ "success": true }`

### 7.7 Partners

#### `GET /api/v1/partners`
- response 200: `Partner[]`

#### `POST /api/v1/partners`
- request: `CreatePartnerRequest`
- behavior: returns existing partner if same name already exists (case-insensitive, per user)
- response 201: `Partner`; may include `EfisystemAward`

#### `PATCH /api/v1/partners/:partnerId`
- request: `UpdatePartnerRequest`
- response 200: `Partner`

### 7.8 Contacts

#### `POST /api/v1/partners/:partnerId/contacts`
- request: `CreateContactRequest`
- response 201: `Contact`; may include `EfisystemAward`

#### `PATCH /api/v1/contacts/:contactId`
- request: `UpdateContactRequest`
- response 200: `Contact`

#### `DELETE /api/v1/contacts/:contactId`
- response 200: `{ "success": true }`

### 7.9 Profile

#### `GET /api/v1/profile`
- response 200: `UserProfile`

#### `PATCH /api/v1/profile`
- request: `UpdateProfileRequest` (any subset of profile fields)
- behavior: `socialProfiles` and `mediaKit` are partial-merged; `goals` replaces the entire array; `handle` auto-prefixed with `@`
- response 200: `UserProfile`; may include `EfisystemAward`

### 7.10 Strategic View

#### `GET /api/v1/strategic-view`

Returns aggregated metrics per goal plus unassigned totals.

- auth: session required
- response 200: `StrategicViewResponse`

```json
{
  "goals": [
    {
      "goal": { "id": "uuid", "area": "Contenido", "..." : "..." },
      "taskCount": 5,
      "totalValue": 12000,
      "completedTaskCount": 2,
      "partnerCount": 3,
      "partners": [{ "id": "uuid", "name": "TechBrand" }]
    }
  ],
  "unassigned": {
    "taskCount": 8,
    "totalValue": 5000,
    "partnerCount": 4
  }
}
```

### 7.11 Settings

#### `GET /api/v1/settings`
- response 200: `SettingsResponse` (`{ accentColor, theme }`)

#### `PATCH /api/v1/settings`
- request: `UpdateSettingsRequest`
- response 200: updated settings

### 7.12 Templates

#### `GET /api/v1/templates`
- response 200: `Template[]`

#### `POST /api/v1/templates`
- request: `CreateTemplateRequest` (`{ name, body }`)
- response 201: `Template`

#### `DELETE /api/v1/templates/:templateId`
- response 200: `{ "success": true }`

### 7.13 Notifications

#### `GET /api/v1/notifications`
- response 200: `NotificationsResponse` — list of pending app notifications (task reminders, gamification)

#### `PATCH /api/v1/notifications/seen`
- response 200: `{ "success": true }`

### 7.14 Auth (`/api/auth`)

Auth routes are mounted at `/api/auth` (rate-limited).

#### `GET /api/auth/me`
Returns the current session user or `null`.
- response 200: `MeResponse` (`{ user: SessionUser | null }`)

#### `POST /api/auth/register`
Creates a new account with email/password.
- request: `RegisterRequest` (`{ email, password, name }`)
- response 200: `MeResponse`

#### `POST /api/auth/login`
Authenticates with email/password.
- request: `LoginRequest` (`{ email, password }`)
- response 200: `MeResponse`

#### `POST /api/auth/logout`
Destroys the session.
- response 200: `LogoutResponse` (`{ success: true }`)

#### `POST /api/auth/password`
Change password for email users, or add a password to a Google account.
- request: `ChangePasswordRequest` (`{ currentPassword?, newPassword }`)
- response 200: `ChangePasswordResponse`

#### `DELETE /api/auth/account`
Deletes the user's account and all associated data (CASCADE on `users` table).
- response 200: `DeleteAccountResponse`

#### `GET /api/auth/google/login-url`
Returns a Google OAuth URL (with `openid`, `userinfo.email`, `userinfo.profile` scopes) for use in the direct googleapis popup login path (alternative, not the primary UI flow).
- response 200: `GoogleAuthUrlResponse` (`{ url }`)

#### `GET /api/auth/google/url`
Returns a Google OAuth URL (with Calendar scopes) for the Calendar integration popup.
- response 200: `GoogleAuthUrlResponse` (`{ url }`)

#### `GET /api/auth/google/callback`
Shared OAuth callback. Routes by `oauthIntent` stored in session:
- `intent = 'login'`: fetches user info from Google, upserts user, sets Express session, posts `GOOGLE_LOGIN_SUCCESS` to opener and closes popup.
- `intent = 'calendar'`: stores Calendar tokens in session, posts `OAUTH_AUTH_SUCCESS` to opener and closes popup.

#### `POST /api/auth/google/supabase`
Primary Google login path used by the UI. Receives a Supabase `access_token` (obtained after `supabase.auth.signInWithOAuth` redirect), validates it using the Supabase Admin client, upserts the user in the `users` table, and sets the Express session.
- request: `{ access_token: string }`
- response 200: `MeResponse` (includes `isNew: true` for new accounts)

#### `GET /api/auth/status`
Returns Google Calendar connection status.
- response 200: `AuthStatusResponse` (`{ connected: boolean }`)

### 7.15 Calendar (`/api/calendar`)

#### `POST /api/calendar/sync`
Syncs a task to Google Calendar (create or update).
- auth: Google Calendar tokens required
- request: `{ task: { title, description, partnerName, dueDate, gcalEventId? } }`
- response 200: `{ success: true, eventId: string }`

#### `POST /api/calendar/sync-down`
Fetches updated dates from Google Calendar for previously synced events.
- auth: Google Calendar tokens required
- request: `{ eventIds: string[] }`
- response 200: `{ success: true, updatedEvents: [{ eventId, dueDate }] }`

### 7.16 File Uploads

#### `GET /api/v1/uploads/status`
Returns whether Supabase Storage is configured and available.
- response 200: `{ "configured": boolean }`

#### `POST /api/v1/uploads`
Uploads a file (avatar, portfolio image) to Supabase Storage.
- auth: session required
- multipart form: `file` field (single file)
- response 200: `{ "url": "string" }`

#### `DELETE /api/v1/uploads`
Deletes a previously uploaded file from Supabase Storage.
- auth: session required
- request: `{ "url": "string" }`
- response 200: `{ "success": true }`

### 7.17 Status History

#### `GET /api/v1/tasks/:taskId/status-history`
Returns the status transition history for a task.
- response 200: `TaskStatusTransition[]`

#### `GET /api/v1/partners/:partnerId/status-history`
Returns the status transition history for a partner.
- response 200: `PartnerStatusTransition[]`

### 7.18 Public Media Kit (`/mk`)

Server-rendered HTML — no authentication required.

#### `GET /mk/:handle`
Returns a full HTML page for the public profile matching the given handle.

## 8. Gamification — Efisystem

`GamificationService` (`services/gamification.ts`) awards XP points and unlocks badges in response to user actions.

### 8.1 Point Events

| Event | Trigger |
|-------|---------|
| `pipeline_first_task` | Creating first task |
| `pipeline_task_moved` | Moving a task between statuses |
| `pipeline_task_completed` | Task → Completada |
| `pipeline_task_paid` | Task → Cobrado |
| `pipeline_first_checklist_item` | Adding first checklist item to a task |
| `network_first_partner` | Creating first partner |
| `network_partner_subsequent` | Creating subsequent partners |
| `network_first_contact` | Adding first contact |
| `network_contact_subsequent` | Adding subsequent contacts |
| `config_accent_change` | Changing accent color (points on 2nd change) |
| `config_profile_complete` | Completing key profile fields |
| `config_first_goal` | Creating first goal |

### 8.2 Badges

| Badge key | Condition |
|-----------|-----------|
| `perfil_estelar` | Started building public profile |
| `vision_clara` | Defined 3 strategic goals |
| `circulo_intimo` | Added 5 partners to network |
| `directorio_dorado` | 10 partners and 10 contacts |
| `motor_de_ideas` | Created 5 tasks in pipeline |
| `promesa_cumplida` | Completed 10 tasks |
| `creador_imparable` | Completed 25 tasks |
| `negocio_en_marcha` | Paid 5 tasks (Cobrado) |
| `lluvia_de_billetes` | Paid 20 tasks (Cobrado) |

### 8.3 Storage

Three tables: `efisystem_transactions` (append-only ledger), `efisystem_badges` (unique per user/badge), `efisystem_summary` (cached total/level).

### 8.4 Response Shape

When a mutation awards points, the API response includes an optional `EfisystemAward`:

```json
{
  "pointsEarned": 10,
  "newTotal": 45,
  "newLevel": 2,
  "leveledUp": true,
  "newBadges": ["motor_de_ideas"]
}
```

## 9. Error Contracts

Error response format:

```json
{ "error": "Human-readable error message" }
```

Validation errors use Spanish-language messages (e.g., `"El título es obligatorio."`).

HTTP status codes:

- `200` — successful read or update
- `201` — successful creation
- `400` — validation error or bad request
- `401` — not authenticated
- `404` — resource not found
- `500` — internal server error

## 10. Security

- `helmet` sets security headers on all responses (CSP disabled for SPA compatibility)
- `express-rate-limit` on `/api/auth/*`: 20 requests / 15 min
- session cookies: `httpOnly`, `sameSite: 'lax'`, `secure` in production
- all SQL queries use parameterized statements via `pg`
- Google Calendar OAuth tokens stored in server session, never exposed to the client
- `bcryptjs` with 10 rounds for password hashing
- file uploads validated via `multer`; stored in Supabase Storage (not local disk)

## 11. Backend Rules

- all `/api/v1/*` routes require a valid session
- all queries are scoped by `user_id` (multi-tenant isolation)
- partner names are unique per user (case-insensitive, whitespace-normalized)
- Calendar sync never blocks core task CRUD
- no new functionality exposed outside versioned APIs (auth and calendar use their own namespaces)
