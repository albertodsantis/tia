# Efi - Application Flow and UX Map

## 1. Purpose

This document defines the main navigation, primary states, and screen transitions for Efi. The application is a responsive web SPA with a desktop sidebar and mobile bottom tab bar navigation pattern.

## 2. Language and UX Policy

Efi is designed for Spanish-speaking users.

Rules:

- visible navigation labels remain in Spanish
- brand tone remains in Spanish
- internal product documentation remains in English
- user-facing labels should not mix Spanish and English within the same view

## 3. Canonical Screen Map

### 3.1 Entry States

1. `Auth Loading`
2. `Logged Out` → Landing page
3. `First Login Onboarding` (WelcomeColorPicker → WelcomeOnboarding)
4. `App Ready`

### 3.2 Main App Screens

1. `Dashboard (Inicio)`
2. `Pipeline`
3. `Directory (Directorio)`
4. `Strategic View (Estrategia)`
5. `Profile (Perfil Público)`
6. `Settings (Ajustes)`
7. `AI Assistant` (conditional — only when `GEMINI_API_KEY` is configured)

### 3.3 Substates and Modals

1. `Pipeline > Add/Edit Task Modal` (includes goal selector, checklist)
2. `Pipeline > Calendar Day Detail Modal`
3. `Directory > Partner Expanded`
4. `Directory > Add/Edit Contact Modal`
5. `Directory > Compose Message Modal`
6. `Strategic View > Goal Detail`
7. `Strategic View > Add/Edit Goal Modal`
8. `Profile > Block Editor` (per-block inline editing)
9. `Profile > BlockPickerDrawer` (add blocks)
10. `Profile > TemplatePickerDrawer` (load a template into blocks)
11. `Settings > Add/Edit Template Modal`
12. `Settings > Change Password Modal`
13. `Settings > Delete Account Confirmation`
14. `Google OAuth Popup / Callback`
15. `AI Assistant > Chat Interface`
16. `Onboarding Tour Overlay`
17. `Global Error Toast / Inline Error`
18. `EfisystemWidget Popover` (level/XP/badges)

## 4. Primary Navigation Flow

```text
Logged Out (Landing)
  -> Register with email/password
  -> OR Sign in with Google
  -> Auth Loading
  -> First Login Onboarding (first run only)
       -> WelcomeColorPicker
       -> WelcomeOnboarding (profession picker)
  -> Dashboard
       -> Pipeline
       -> Directory
       -> Strategic View (Estrategia)
       -> Profile (Perfil Público)
       -> Settings
       -> AI Assistant (conditional)
```

Primary navigation uses breakpoint-aware patterns:

- narrow screens (mobile): bottom tab bar with icons and labels
- wide screens (desktop): persistent left sidebar

Primary sections:

- Inicio (Dashboard)
- Pipeline
- Directorio (Directory)
- Estrategia (Strategic View)
- Perfil (Profile)
- Ajustes (Settings)
- AI Assistant (conditional, separate access point)

## 5. First-Run Flow

```text
User without session
  -> Lands on Landing page (login/register forms)
  -> Registers with email/password OR signs in with Google
  -> Account created
  -> WelcomeColorPicker: user selects an accent color
  -> WelcomeOnboarding: user selects primary profession (and optional secondary)
  -> Dashboard
  -> Onboarding tour auto-starts after 700ms delay
  -> Tour covers: Inicio, Pipeline, Directorio, Estrategia, Perfil, Ajustes, AI Assistant
  -> Tour uses responsive step targeting (mobile bottom nav vs desktop sidebar)
  -> Tour tooltips match current theme and accent color
```

Rules:

- onboarding runs once per user, completion persisted in localStorage
- onboarding can be reset from Settings
- if initial loading fails, the app shows a retry state and does not enter a broken shell

## 6. Authentication

### 6.1 Landing Page

The Landing page (`views/Landing.tsx`) is the unauthenticated entry point. It presents:

- login form (email + password)
- register form (name, email, password)
- Google sign-in button

### 6.2 Email/Password Flow

```text
Landing
  -> Fill register form (name, email, password) → POST /api/auth/register
  -> OR fill login form (email, password) → POST /api/auth/login
  -> Session set → redirect to WelcomeColorPicker (new user) or Dashboard (returning)
```

### 6.3 Google OAuth Flow (Supabase — primary)

```text
Landing
  -> Tap "Sign in with Google"
  -> supabase.auth.signInWithOAuth({ provider: 'google' })
  -> Full-page redirect to Google consent screen
  -> Google redirects back to the app origin
  -> App.tsx: supabase.auth.getSession() → access_token retrieved
  -> POST /api/auth/google/supabase (access_token)
  -> Backend validates token with Supabase Admin client
  -> User upserted in users table → Express session set
  -> supabase.auth.signOut() called (Supabase session no longer needed)
  -> App continues with Express session
```

Note: a direct googleapis popup path also exists in the backend (`GET /api/auth/google/login-url` + shared callback), but the primary UI uses the Supabase redirect flow above.

### 6.4 Session and Logout

- session cookie is `httpOnly`, 30-day max age
- `GET /api/auth/me` is called on startup; if no session → Landing
- `POST /api/auth/logout` destroys the session → Landing

## 7. Dashboard (Inicio)

### 7.1 Goal

Provide immediate visibility into the creator's operational and financial state.

### 7.2 Core Elements

- **GoalsMarquee**: draggable horizontal scroll of active goals, positioned at the top
- **EfisystemWidget**: level, XP bar, and badge progress (accessible from Dashboard)
- **Operational summary card**: annual revenue goal, open pipeline value, closed/billed value
- **Period filter**: This Month / Last Month / This Year / All Time — scopes all metrics
- **Task breakdown**: horizontal progress bars by status (Pendiente, En Progreso, En Revisión, Completada, Cobrado)
- **Upcoming tasks list**: next 4 tasks by due date with partner, value, relative date
- **Summary stats panel**: today, tomorrow, this week, active partners, total contacts, overdue
- **Complete-task quick actions**: mark upcoming tasks complete without leaving Dashboard

### 7.3 Transitions

- tapping a task opens it for editing in Pipeline
- tapping a partner name opens Directory with that partner expanded
- empty state shows a CTA to create the first task
- period filter updates all metric cards and lists in place

## 8. Pipeline

### 8.1 Subviews

- `Kanban` (default) — drag-and-drop columns by status
- `List` — full tabular list of all tasks
- `Calendar` — monthly calendar grid with task indicators

### 8.2 Workspace Controls

- `Kanban / Lista / Mes` segmented control for view switching
- `Nueva tarea` button to open task creation modal
- `Actualizar Calendar` button to pull date changes from Google Calendar
- Search bar: searches across task title, description, and partner name

### 8.3 Kanban View

```text
Pipeline (Kanban)
  -> 5 columns: Pendiente | En Progreso | En Revisión | Completada | Cobrado
  -> Each card shows: title, partner, value, relative due date, checklist progress
  -> Drag a card between columns to change status (@dnd-kit)
  -> Drag to reorder within a column
  -> Click a card to open Edit Task Modal
```

### 8.4 Create Task Flow

```text
Pipeline
  -> Tap "Nueva tarea"
  -> Add Task Modal opens
  -> Fill title, partner (autocomplete), value, date, description
  -> Optionally add checklist items
  -> Optionally link to a strategic goal via goal selector dropdown
  -> Partner: type to search existing, select from dropdown, or auto-create if not found
  -> Save → task persists to backend → modal closes → pipeline refreshes
```

Rules:

- every task must be associated with a partner
- if the partner does not exist, it is auto-created as a new `Prospecto` partner
- status transition timestamps (`completedAt`, `cobradoAt`) are recorded automatically
- gamification may award XP on task creation

### 8.5 Edit Task Flow

```text
Pipeline
  -> Click existing task card
  -> Edit Task Modal opens (pre-filled)
  -> Modify any field or checklist
  -> Save or Delete
  -> Pipeline refreshes
```

### 8.6 Checklist Flow

```text
Edit Task Modal
  -> Add checklist item: type text → add
  -> Check/uncheck items inline
  -> Delete items
  -> Checklist progress shown on task card (e.g. "2/4")
```

### 8.7 View Switching

```text
Pipeline
  -> Toggle Kanban / Lista / Mes
  -> Search query preserved during session
  -> View renders with current task data
```

Pipeline status flow:

`Pendiente` → `En Progreso` → `En Revisión` → `Completada` → `Cobrado`

### 8.8 List View

```text
Pipeline (List)
  -> All tasks in a scrollable list
  -> Columns: title, partner, status, value, due date
  -> Status color coding
  -> Relative date labels
  -> Click a row to open Edit Task Modal
```

### 8.9 Calendar View

```text
Pipeline (Calendar)
  -> Monthly grid with forward/backward navigation
  -> Days with tasks show indicators
  -> Click a day to open Day Detail Modal
```

### 8.10 Day Detail Modal

```text
Calendar Day
  -> Tap a day with tasks
  -> Day Detail Modal opens
  -> Lists all tasks for that day with title, partner, value, status
  -> Can sync individual tasks with Google Calendar
```

### 8.11 Calendar Sync Flow

```text
Task card
  -> Tap sync icon
  -> If Calendar disconnected: toast error with CTA to Settings
  -> If connected: POST /api/calendar/sync
  -> Task receives gcalEventId; sync indicator shown
```

### 8.12 Sync-Down Flow

```text
Pipeline
  -> Tap "Actualizar Calendar"
  -> POST /api/calendar/sync-down with all gcalEventIds
  -> Local task dates update to match Calendar changes
  -> UI refreshes
```

## 9. Directory (Directorio)

### 9.1 Goal

Manage partners (brands), their contacts, financial data, and outreach in one place.

### 9.2 Main Flow

```text
Directory
  -> Search partner by name
  -> Partner list with status badges and financial summary
  -> Expand a partner card
  -> Review: contacts, financial data, partnership details, task metrics
  -> Add / edit / delete contacts
  -> Open message composer with template
  -> Send via email or WhatsApp
```

### 9.3 Partner Card (Expanded)

- **Status**: one of 6 statuses with color coding
- **Partnership type**: Permanente, Plazo Fijo, One Time, Por Definir
- **Financial tracking**: monthly and annual revenue
- **Date range**: start date, end date
- **Source**: how the partner was acquired
- **Logo, keywords, main channel**
- **Task metrics**: total and open tasks
- **Contacts list**

### 9.4 Contact Flow

```text
Expanded partner
  -> Tap "Add Contact"
  -> Add Contact Modal: name, role, email, Instagram, phone
  -> Save → contact appears under the partner
```

Each contact card shows: name, role, email (tap to compose), Instagram, phone (tap for WhatsApp).

### 9.5 Outreach Flow

```text
Contact card
  -> Tap email or WhatsApp icon
  -> Compose Message Modal opens
  -> Select a saved template
  -> Variables auto-resolve: {{brandName}}, {{contactName}}, {{creatorName}}, {{deliverable}}, {{mediaKitLink}}
  -> Review resolved subject and body
  -> Choose: Open in email client OR Open in WhatsApp
```

### 9.6 Partner Management

```text
Expanded partner
  -> Edit partner details: name, status, type, revenue, dates, source, logo
  -> Delete partner (with confirmation, if no tasks are linked)
  -> Archive partner by setting status to Relación Culminada
```

## 10. Public Profile (Perfil Público)

### 10.1 Goal

Let the user build a modular public-facing profile composed from content blocks, then share it as a URL.

### 10.2 Profile Header

```text
Profile
  -> Edit display name, handle, avatar
  -> Set primary profession and secondary professions
  -> Changes auto-save on blur/debounce
```

### 10.3 Block Composer Flow

```text
Profile
  -> View active blocks in order
  -> Tap "+" or "Agregar bloque" → BlockPickerDrawer opens
  -> Select a block type from the library
  -> Block is added to the profile
  -> Fill block fields and tap Save on that block
  -> Reorder blocks via drag-and-drop
  -> Remove a block via block header action

BlockPickerDrawer
  -> Lists all 16+ available block types
  -> Shows which blocks are already added
  -> Tap a block type to add it

TemplatePickerDrawer
  -> Lists saved message templates
  -> Selecting a template loads its content into a compatible block
```

### 10.4 Block Save Flow

```text
Block (e.g. About, Services, Metrics)
  -> Edit content fields
  -> Tap block Save button
  -> PATCH /api/v1/profile with updated mediaKit data
  -> Block shows saved state
```

Note: each block is saved individually with an explicit save action — there is no global auto-save or debounced save on the block composer.

### 10.5 Social Profiles Flow

```text
Profile > Social Profiles section
  -> Edit Instagram, TikTok, X, Threads, YouTube links
  -> Auto-save on blur
```

### 10.6 Public Profile URL

The public profile is accessible at `/mk/:handle` with no authentication required. The server renders an HTML page from the saved profile data. Viewers see only enabled blocks in the defined order.

## 11. Settings (Ajustes)

### 11.1 Goal

Centralize visual customization, notifications, integrations, templates, and account management.

### 11.2 Accent Color Flow

```text
Settings > Appearance
  -> Accent palette grid: flat colors, gradient presets, conic presets, retro themes
  -> Tap a swatch to select it
  -> Accent updates immediately across the entire UI
  -> Selection persists (PATCH /api/v1/settings)
```

### 11.3 Theme Toggle

```text
Settings > Appearance
  -> Toggle dark/light mode
  -> Theme changes immediately
  -> Persists via PATCH /api/v1/settings
```

### 11.4 Push Notifications Flow

```text
Settings > Notifications
  -> Toggle notifications on
  -> Browser requests permission
  -> If granted: daily and tomorrow task reminders active
  -> If denied: toggle reverts, user informed about browser settings
```

### 11.5 Google Calendar OAuth Flow

This is a separate OAuth grant from the app login. It uses a direct `googleapis` popup (not Supabase) to request Calendar scopes.

```text
Settings > Integrations
  -> Tap "Conectar Google Calendar"
  -> GET /api/auth/google/url → URL with Calendar scopes (googleapis)
  -> Popup window opens pointing to that URL
  -> User grants Calendar access in popup
  -> GET /api/auth/google/callback (intent = 'calendar')
  -> Calendar tokens stored in server session
  -> Popup posts OAUTH_AUTH_SUCCESS and closes
  -> Settings reflects "Connected" state
```

### 11.6 Template Management Flow

```text
Settings > Templates
  -> View saved templates (name, body)
  -> Tap "Add Template"
  -> Modal: fill name and body
  -> Variable documentation panel shows available placeholders
  -> Save → template available in message composer
  -> Edit or delete existing templates
```

### 11.7 Change Password Flow

```text
Settings > Account (email provider only)
  -> Tap "Change Password"
  -> Modal: current password + new password
  -> POST /api/auth/change-password
  -> Success confirmation
```

### 11.8 Delete Account Flow

```text
Settings > Account
  -> Tap "Delete Account"
  -> ConfirmDialog: requires typing confirmation text
  -> DELETE /api/auth/account
  -> Session cleared → Landing page
```

### 11.9 Onboarding Reset Flow

```text
Settings
  -> Tap "Reset Tour"
  -> localStorage tour flag cleared
  -> Tour replays on next page load
```

## 12. AI Assistant (Experimental)

### 12.1 Availability

Only rendered when `GEMINI_API_KEY` is configured on the backend. Hidden from navigation otherwise.

### 12.2 Chat Flow

```text
AI Assistant
  -> Type a message OR tap microphone for voice input
  -> Voice: Web Speech API, Spanish locale
  -> Send → Gemini backend processes with function calling
  -> Supported functions: get_app_data, add_task, update_task_status,
     add_partner, add_contact, update_partner_status
  -> AI response in chat
  -> If action performed: app data refreshes
```

## 13. Onboarding Tour

### 13.1 Tour Flow

```text
First login or tour reset
  -> 700ms delay
  -> React Joyride tour begins
  -> Steps (in order):
     1. Dashboard (Inicio)
     2. Pipeline
     3. Directory (Directorio)
     4. Strategic View (Estrategia)
     5. Profile (Perfil)
     6. Settings (Ajustes)
     7. AI Assistant (if available)
  -> Each step highlights the relevant navigation element
  -> Tooltips are theme-aware (dark/light, accent color)
  -> Responsive: targets sidebar items on desktop, bottom nav on mobile
  -> User can skip at any step
  -> Completion saved to localStorage
```

## 14. Gamification — Efisystem

### 14.1 Award Flow

```text
User performs an action (e.g. creates a task)
  -> Backend mutation runs
  -> GamificationService.award() called with event type and userId
  -> Points recorded in efisystem_transactions
  -> efisystem_summary updated
  -> If badge threshold met: efisystem_badges row inserted
  -> EfisystemAward returned inline in API response
  -> Frontend receives award
  -> If leveledUp or newBadges: Confetti animation plays
  -> EfisystemWidget updates to reflect new state
```

### 14.2 EfisystemWidget

Available from the Dashboard. Shows:

- current level and XP total
- XP progress bar toward next level
- unlocked badges grid

## 15. System States

Required global states:

- `loading`
- `ready`
- `empty`
- `saving`
- `auto-saving` (profile header fields with debounce)
- `syncing` (Calendar operations)
- `error`
- `unauthorized` (session expired → redirect to Landing)

Canonical rules:

- no view may depend on demo data once the production app is active
- every optimistic update must reconcile with the server response
- auto-save provides visual feedback so the user knows data was persisted
- explicit saves (block composer) require a visible save button and state indicator

## 16. Primary State Transitions

### 16.1 Auth

- `logged_out → authenticating → authenticated`
- `authenticated → session_expired → logged_out`
- `logged_out → registering → authenticated → onboarding`

### 16.2 Tasks

- `idle → creating → created`
- `idle → updating → updated`
- `idle → deleting → deleted`
- `idle → dragging → dropped → status_updated`
- `idle → syncing_calendar → synced`
- `syncing_calendar → failed`

### 16.3 Partners

- `idle → creating → created`
- `idle → updating → updated`
- `idle → deleting → deleted`
- `idle → auto_creating (from task form) → created`

### 16.4 Profile

- `idle → editing_header → debounce_waiting → auto_saved`
- `idle → editing_block → block_saved`
- `idle → adding_block → block_added`
- `idle → reordering_blocks → order_saved`

### 16.5 Goals

- `idle → creating → created`
- `idle → updating → updated`
- `idle → deleting → deleted`

### 16.6 Google Integration

- `disconnected → oauth_pending → connected`
- `connected → disconnecting → disconnected`
- `connected → token_expired → reconnect_required`

### 16.7 AI Assistant

- `idle → sending_message → waiting_for_response → response_received`
- `idle → voice_recording → transcribing → text_ready`
- `response_received → function_executed → data_refreshed`

### 16.8 Notifications

- `disabled → requesting_permission → enabled`
- `requesting_permission → permission_denied → disabled`
- `enabled → toggled_off → disabled`

### 16.9 Onboarding

- `not_seen → running → completed`
- `running → skipped`
- `completed → reset → not_seen`

### 16.10 Gamification

- `idle → action_taken → award_evaluated`
- `award_evaluated → points_added → widget_updated`
- `award_evaluated → badge_unlocked → confetti_played`
- `award_evaluated → level_up → confetti_played → widget_updated`

## 17. Non-Negotiable UX Rules

- primary navigation never disappears in normal states
- destructive actions require confirmation via ConfirmDialog
- external errors explain the next step
- responsive design is required: desktop sidebar and mobile bottom nav are both first-class experiences
- the user must always understand whether data was saved, failed, or is still syncing
- auto-save for profile header fields must be visually indicated
- explicit save for block composer blocks must be clearly actionable
- the AI assistant must not block or interfere with core app functionality
- drag-and-drop in Pipeline must provide clear visual feedback during drag
- accent color and theme changes must apply immediately without page reload
- push notification permission must be requested only when the user explicitly enables notifications
- gamification awards must be non-disruptive — confetti and level-up indicators should not block the user flow
