# TIA - Backend Structure

## 1. Purpose

This document defines the backend architecture, data model, and API contract for MVP v1. The approved backend is a modular monolith with a REST API and PostgreSQL.

## 2. Language and Audience Context

This document is written in English for technical consistency.

Product-facing behavior still follows these rules:

- TIA serves Spanish-speaking users
- visible UI text remains in Spanish
- backend contracts and engineering documentation remain in English

## 3. Approved Architecture

Architecture type: `modular monolith`

Layers:

1. `HTTP Layer`
2. `Application Services`
3. `Persistence`
4. `External Integrations`

Canonical modules:

- auth
- users
- dashboard
- tasks
- partners
- contacts
- templates
- settings
- integrations/google-calendar

## 4. Canonical Database

Approved engine: `PostgreSQL 16`

### 4.1 Enumerations

`task_status`

- `PENDIENTE`
- `EN_PROGRESO`
- `EN_REVISION`
- `COMPLETADA`
- `COBRO`

`partner_status`

- `PROSPECTO`
- `EN_NEGOCIACION`
- `ACTIVO`
- `INACTIVO`
- `ON_HOLD`
- `RELACION_CULMINADA`

### 4.2 Table Schema

#### `users`

| column | type | rules |
| --- | --- | --- |
| id | uuid | PK |
| google_sub | text | UNIQUE, NOT NULL |
| email | text | UNIQUE, NOT NULL |
| display_name | text | NOT NULL |
| handle | text | NULL |
| avatar_url | text | NULL |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

Indexes:

- unique(`google_sub`)
- unique(`email`)

#### `user_settings`

| column | type | rules |
| --- | --- | --- |
| user_id | uuid | PK, FK -> users.id |
| accent_color | text | NOT NULL |
| theme | text | NOT NULL |
| notifications_enabled | boolean | NOT NULL default false |
| onboarding_seen_at | timestamptz | NULL |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

#### `partners`

| column | type | rules |
| --- | --- | --- |
| id | uuid | PK |
| user_id | uuid | FK -> users.id, NOT NULL |
| name | text | NOT NULL |
| status | partner_status | NOT NULL |
| logo_url | text | NULL |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

Indexes:

- index(`user_id`, `status`)
- unique(`user_id`, `name`)

#### `contacts`

| column | type | rules |
| --- | --- | --- |
| id | uuid | PK |
| partner_id | uuid | FK -> partners.id, NOT NULL |
| name | text | NOT NULL |
| role | text | NULL |
| email | text | NULL |
| instagram_handle | text | NULL |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

Indexes:

- index(`partner_id`)

#### `tasks`

| column | type | rules |
| --- | --- | --- |
| id | uuid | PK |
| user_id | uuid | FK -> users.id, NOT NULL |
| partner_id | uuid | FK -> partners.id, NOT NULL |
| title | text | NOT NULL |
| description | text | NOT NULL default '' |
| status | task_status | NOT NULL |
| due_date | date | NOT NULL |
| value_cents | integer | NOT NULL default 0 |
| calendar_event_id | text | NULL |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

Indexes:

- index(`user_id`, `status`)
- index(`user_id`, `due_date`)
- index(`partner_id`)
- recommended nullable uniqueness on `calendar_event_id` per user

#### `templates`

| column | type | rules |
| --- | --- | --- |
| id | uuid | PK |
| user_id | uuid | FK -> users.id, NOT NULL |
| name | text | NOT NULL |
| subject | text | NOT NULL |
| body | text | NOT NULL |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

Indexes:

- index(`user_id`)

#### `oauth_connections`

| column | type | rules |
| --- | --- | --- |
| id | uuid | PK |
| user_id | uuid | FK -> users.id, NOT NULL |
| provider | text | NOT NULL |
| external_email | text | NULL |
| access_token_encrypted | text | NOT NULL |
| refresh_token_encrypted | text | NOT NULL |
| scope | text | NOT NULL |
| expires_at | timestamptz | NULL |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

Indexes:

- unique(`user_id`, `provider`)

## 5. Relationships

```text
users 1---1 user_settings
users 1---N partners
partners 1---N contacts
users 1---N tasks
partners 1---N tasks
users 1---N templates
users 1---N oauth_connections
```

## 6. Canonical API Endpoints

Required base path: `/api/v1`

### 6.1 Auth

#### `GET /api/v1/auth/google/start`

- auth: public
- response 200:

```json
{ "url": "https://accounts.google.com/..." }
```

#### `GET /api/v1/auth/google/callback`

- auth: public
- usage: OAuth callback
- response: redirect to the application shell

#### `GET /api/v1/auth/session`

- auth: session required
- response 200:

```json
{
  "user": {
    "id": "uuid",
    "email": "creator@example.com",
    "displayName": "Alex Creator",
    "handle": "@alexcreator",
    "avatarUrl": "https://..."
  }
}
```

#### `POST /api/v1/auth/logout`

- auth: session required
- response 200:

```json
{ "success": true }
```

### 6.2 Dashboard

#### `GET /api/v1/dashboard/summary`

- auth: session required
- response 200:

```json
{
  "activePipelineValueCents": 430000,
  "tasksDueToday": 2,
  "upcomingTasks": []
}
```

### 6.3 Tasks

#### `GET /api/v1/tasks`

- auth: session required
- allowed query params: `status`, `view`, `from`, `to`

#### `POST /api/v1/tasks`

- auth: session required
- request:

```json
{
  "title": "Reel de lanzamiento",
  "description": "Video 60s",
  "partnerId": "uuid",
  "status": "PENDIENTE",
  "dueDate": "2026-04-01",
  "valueCents": 150000
}
```

- response 201: created task

#### `PATCH /api/v1/tasks/:taskId`

- auth: session required
- request: any valid subset of editable fields

#### `DELETE /api/v1/tasks/:taskId`

- auth: session required
- response 204

#### `POST /api/v1/tasks/:taskId/calendar-sync`

- auth: session required
- requirement: active Google Calendar connection
- response 200:

```json
{
  "success": true,
  "calendarEventId": "google-event-id"
}
```

#### `POST /api/v1/tasks/calendar-sync-down`

- auth: session required
- request:

```json
{
  "taskIds": ["uuid"]
}
```

- response 200:

```json
{
  "success": true,
  "updatedTasks": [
    { "taskId": "uuid", "dueDate": "2026-04-03" }
  ]
}
```

### 6.4 Partners

#### `GET /api/v1/partners`

- auth: session required
- allowed query params: `search`, `status`

#### `POST /api/v1/partners`

- auth: session required
- request:

```json
{
  "name": "TechBrand",
  "status": "PROSPECTO"
}
```

#### `PATCH /api/v1/partners/:partnerId`

- auth: session required

#### `DELETE /api/v1/partners/:partnerId`

- auth: session required
- behavior: soft delete or archive is recommended

### 6.5 Contacts

#### `POST /api/v1/partners/:partnerId/contacts`

- auth: session required
- request:

```json
{
  "name": "Laura Gomez",
  "role": "PR Manager",
  "email": "laura@techbrand.com",
  "instagramHandle": "laurapr"
}
```

#### `PATCH /api/v1/contacts/:contactId`

- auth: session required

#### `DELETE /api/v1/contacts/:contactId`

- auth: session required

### 6.6 Templates

#### `GET /api/v1/templates`

- auth: session required

#### `POST /api/v1/templates`

- auth: session required

#### `PATCH /api/v1/templates/:templateId`

- auth: session required

#### `DELETE /api/v1/templates/:templateId`

- auth: session required

### 6.7 Profile and Settings

#### `GET /api/v1/profile`

- auth: session required

#### `PATCH /api/v1/profile`

- auth: session required
- fields: `displayName`, `handle`, `avatarUrl`, `goals`

#### `GET /api/v1/settings`

- auth: session required

#### `PATCH /api/v1/settings`

- auth: session required
- fields: `accentColor`, `theme`, `notificationsEnabled`, `onboardingSeen`

### 6.8 Integrations

#### `GET /api/v1/integrations/google-calendar/status`

- auth: session required
- response 200:

```json
{ "connected": true, "externalEmail": "creator@gmail.com" }
```

#### `POST /api/v1/integrations/google-calendar/disconnect`

- auth: session required
- response 200:

```json
{ "success": true }
```

## 7. Error Contracts

Required error format:

```json
{
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "Task not found"
  }
}
```

Approved HTTP status codes:

- `400` invalid request
- `401` unauthenticated
- `403` forbidden
- `404` missing resource
- `409` data conflict
- `422` validation error
- `500` internal error

## 8. Backend Limits and Rules

- every query must be scoped by `user_id`
- OAuth tokens are never exposed to the frontend
- payloads are never accepted without validation
- no new functionality is exposed outside versioned APIs
- Calendar sync must never block base task CRUD
