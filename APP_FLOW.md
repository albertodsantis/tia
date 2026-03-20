# TIA - Application Flow and UX Map

## 1. Purpose

This document defines the main navigation, primary states, and screen transitions for TIA MVP v1. The application remains a mobile-first SPA with a persistent shell and modal or sheet patterns for secondary actions.

## 2. Language and UX Policy

TIA is designed for Spanish-speaking users.

Rules:

- visible navigation labels remain in Spanish
- brand tone remains in Spanish
- internal product documentation remains in English
- user-facing labels should not mix Spanish and English within the same view

## 3. Canonical Screen Map

### 3.1 Entry States

1. `Auth Loading`
2. `Logged Out`
3. `First Login Onboarding`
4. `App Ready`

### 3.2 Main App Screens

1. `Dashboard`
2. `Pipeline`
3. `Directory`
4. `Profile`
5. `Settings`

### 3.3 Substates and Modals

1. `Pipeline > Add Task Modal`
2. `Pipeline > Calendar Day Details`
3. `Directory > Partner Expanded`
4. `Directory > Add Contact Modal`
5. `Directory > Edit Contact Modal`
6. `Directory > Compose Message Modal`
7. `Settings > Add Template Modal`
8. `Google OAuth Popup / Callback`
9. `Global Error Toast / Inline Error`

## 4. Primary Navigation Flow

```text
Logged Out
  -> Sign in with Google
  -> Auth Loading
  -> First Login Onboarding (first run only)
  -> Dashboard
       -> Pipeline
       -> Directory
       -> Profile
       -> Settings
```

Primary navigation is a persistent bottom tab bar:

- Inicio
- Pipeline
- Directorio
- Perfil
- Ajustes

## 5. First-Run Flow

```text
User without session
  -> Google sign-in
  -> Account created or restored
  -> Empty workspace or optional development seed data loaded
  -> Onboarding tour shown
  -> Dashboard
```

Rules:

- onboarding runs once per user
- if initial loading fails, the app shows retry and does not enter a broken shell state

## 6. Dashboard

### 6.1 Goal

Provide immediate visibility into the creator's operational state.

### 6.2 Core Elements

- greeting and avatar
- total active pipeline value
- tasks due today
- upcoming deliverables list

### 6.3 Transitions

- tapping a relevant card or CTA may route to `Pipeline`
- if there are no tasks, show an empty state with a CTA to create one

## 7. Pipeline

### 7.1 Subviews

- `Kanban`
- `List`
- `Calendar`

### 7.2 Create Task Flow

```text
Pipeline
  -> Tap "+"
  -> Add Task Modal
  -> Fill title, brand, value, date, description
  -> Save
  -> Persist task
  -> Refresh Pipeline and Dashboard
```

Rules:

- if the brand does not exist, the flow may create it automatically
- every task must be associated with a brand
- after save, the modal closes and the user returns to the previous context

### 7.3 View Switching Flow

```text
Pipeline
  -> Toggle Kanban/List/Calendar
  -> The app preserves filters and local view state during the session
```

### 7.4 Day Detail Flow

```text
Pipeline Calendar
  -> Tap a day with tasks
  -> Day Details Modal
  -> Review tasks for that day
  -> Sync a task with Google Calendar if needed
```

### 7.5 Calendar Sync Flow

```text
Task card
  -> Tap "Sync"
  -> If Google is disconnected: show error and CTA to Settings
  -> If Google is connected: POST sync
  -> Show synced state
```

### 7.6 Sync-Down Flow

```text
Pipeline
  -> Tap "Sync Down"
  -> Backend loads linked events
  -> Local dates update
  -> UI refreshes
```

## 8. Directory

### 8.1 Goal

Manage brands and contacts in the same operational context.

### 8.2 Main Flow

```text
Directory
  -> Search brand
  -> Expand brand
  -> Review contacts
  -> Add / edit / delete contact
  -> Open composer with template
```

### 8.3 Contact Flow

```text
Expanded brand
  -> Add Contact
  -> Fill details
  -> Save
  -> Contact appears under the brand
```

### 8.4 Outreach Flow

```text
Contact
  -> Tap Send
  -> Compose Message Modal
  -> Select template
  -> Review subject and body
  -> Open in mail client
```

Rules:

- template variables must resolve before opening the email client
- if an associated deliverable is missing, the flow must use explicit fallback text

## 9. Profile

### 9.1 Goal

Let the user maintain a visible professional identity and goals.

### 9.2 Flow

```text
Profile
  -> Edit name / handle / avatar / goals
  -> Save changes
  -> Data persists
```

### 9.3 Media Kit Flow

For MVP v1, media kit export is optional and non-blocking. If it remains in scope, it must be positioned as a basic export feature rather than an advanced generator.

## 10. Settings

### 10.1 Goal

Centralize configuration, templates, and integrations.

### 10.2 Main Flows

```text
Settings
  -> Change theme
  -> Change accent color
  -> Enable or disable notifications
  -> Connect Google Calendar
  -> Manage templates
```

### 10.3 Google Calendar OAuth Flow

```text
Settings
  -> Connect Google Calendar
  -> Backend returns OAuth URL
  -> Google popup opens
  -> Callback succeeds
  -> Popup closes
  -> Settings reflects "connected"
```

### 10.4 Template Flow

```text
Settings
  -> Add Template
  -> Fill name, subject, body
  -> Save
  -> Template becomes available in the Directory composer
```

## 11. System States

Required global states:

- `loading`
- `ready`
- `empty`
- `saving`
- `syncing`
- `error`
- `unauthorized`

Canonical rules:

- no view may depend on demo data once the production MVP is active
- every optimistic update must reconcile with the server response

## 12. Primary State Transitions

### 12.1 Auth

- `logged_out -> authenticating -> authenticated`
- `authenticated -> session_expired -> logged_out`

### 12.2 Tasks

- `idle -> creating -> created`
- `idle -> updating -> updated`
- `idle -> syncing_calendar -> synced`
- `syncing_calendar -> failed`

### 12.3 Google Integration

- `disconnected -> oauth_pending -> connected`
- `connected -> disconnecting -> disconnected`
- `connected -> token_expired -> reconnect_required`

### 12.4 Onboarding

- `not_seen -> running -> completed`
- `running -> skipped`

## 13. Non-Negotiable UX Rules

- primary navigation never disappears in normal states
- destructive actions require confirmation
- external errors explain the next step
- mobile-first does not mean mobile-only; desktop must still feel complete
- the user must always understand whether data was saved, failed, or is still syncing
