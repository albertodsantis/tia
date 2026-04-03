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
2. `Logged Out`
3. `First Login Onboarding`
4. `App Ready`

### 3.2 Main App Screens

1. `Dashboard (Inicio)`
2. `Pipeline`
3. `Directory (Directorio)`
4. `Strategic View (Estrategia)`
5. `Profile (Perfil)`
6. `Settings (Ajustes)`
7. `AI Assistant` (conditional — only available when GEMINI_API_KEY is configured)

### 3.3 Substates and Modals

1. `Pipeline > Add/Edit Task Modal` (includes goal selector)
2. `Pipeline > Calendar Day Detail Modal`
3. `Directory > Partner Expanded`
4. `Directory > Add/Edit Contact Modal`
5. `Directory > Compose Message Modal`
6. `Strategic View > Goal Detail`
7. `Strategic View > Add/Edit Goal Modal`
8. `Profile > Media Kit Preview`
9. `Settings > Add/Edit Template Modal`
10. `Google OAuth Popup / Callback`
11. `AI Assistant > Chat Interface`
12. `Onboarding Tour Overlay`
13. `Global Error Toast / Inline Error`

## 4. Primary Navigation Flow

```text
Logged Out
  -> Sign in with Google
  -> Auth Loading
  -> First Login Onboarding (first run only)
  -> Dashboard
       -> Pipeline
       -> Directory
       -> Strategic View (Estrategia)
       -> Profile
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
  -> Google sign-in
  -> Account created or restored
  -> Empty workspace or optional development seed data loaded
  -> Onboarding tour shown (React Joyride, 700ms delay)
  -> Tour covers: Inicio, Pipeline, Directorio, Estrategia, Perfil, Ajustes, AI Assistant
  -> Tour uses responsive step targeting (mobile bottom nav vs desktop sidebar)
  -> Tour tooltips match current theme and accent color
  -> Dashboard
```

Rules:

- onboarding runs once per user, completion persisted in localStorage
- onboarding can be reset from Settings to replay the tour
- if initial loading fails, the app shows retry and does not enter a broken shell state

## 6. Dashboard (Inicio)

### 6.1 Goal

Provide immediate visibility into the creator's operational and financial state with goal tracking.

### 6.2 Core Elements

- **GoalsMarquee**: draggable horizontal scroll displaying the user's professional goals, positioned at the top of the dashboard
- **Operational summary card**: annual revenue goal, open pipeline value, closed/billed value
- **Period filter**: segmented control with This Month / Last Month / This Year / All Time — scopes all metrics on the dashboard
- **Task breakdown**: horizontal progress bars showing task count by status (Pendiente, En Progreso, En Revision, Completada, Cobrado)
- **Upcoming tasks list**: next 4 tasks sorted by due date, with partner name, value, and relative date label
- **Summary stats panel**: tasks due today, tasks due tomorrow, tasks this week, active partners count, total contacts count, overdue tasks count
- **Complete-task quick actions**: checkbox or button on each upcoming task to mark it complete without navigating to Pipeline

### 6.3 Transitions

- tapping a task routes to Pipeline or opens the task for editing
- tapping a partner name routes to Directory with that partner expanded
- if there are no tasks, show an empty state with a CTA to create one
- period filter updates all metric cards and lists in place without navigation

## 7. Pipeline

### 7.1 Subviews

- `Kanban` (default) — drag-and-drop columns by status
- `List` — full tabular list of all tasks
- `Calendar` — monthly calendar grid with task indicators

### 7.1.1 Workspace Controls

- `Kanban / Lista / Mes` segmented control for view switching
- `Nueva tarea` button to open task creation modal
- `Actualizar Calendar` button to sync with Google Calendar
- Search bar: searches across task title, description, and partner name

### 7.2 Kanban View

```text
Pipeline (Kanban)
  -> 5 columns: Pendiente | En Progreso | En Revision | Completada | Cobrado
  -> Each column shows task cards with title, partner, value, relative date
  -> Drag a task card between columns to change status (@dnd-kit)
  -> Drag to reorder within a column
  -> Status color coding on each card
  -> Click a card to open Edit Task Modal
```

### 7.3 Create Task Flow

```text
Pipeline
  -> Tap "Nueva tarea" or "+"
  -> Add Task Modal opens
  -> Fill title, partner (autocomplete), value, date, description
  -> Partner field: type to search existing partners, select from dropdown
  -> If partner name doesn't match any existing partner: auto-create option
  -> Optionally select a strategic goal from the goal selector dropdown
  -> Save
  -> Task persists to backend
  -> Pipeline view refreshes
  -> Modal closes
```

Rules:

- every task must be associated with a partner
- partner autocomplete searches existing partners by name
- if the partner does not exist, the flow auto-creates it as a new partner
- tasks can optionally be linked to a strategic goal via the goal selector
- after save, the modal closes and the user returns to the previous context

### 7.4 Edit Task Flow

```text
Pipeline
  -> Click existing task card
  -> Edit Task Modal opens (same form as create, pre-filled)
  -> Modify any field
  -> Save or Delete
  -> Pipeline refreshes
```

### 7.5 View Switching Flow

```text
Pipeline
  -> Toggle Kanban / Lista / Mes
  -> The app preserves search query during the session
  -> View renders with current task data
```

Pipeline status flow:

`Pendiente` -> `En Progreso` -> `En Revision` -> `Completada` -> `Cobrado`

### 7.6 List View

```text
Pipeline (List)
  -> All tasks in a scrollable table/list
  -> Columns: title, partner, status, value, due date
  -> Status color coding
  -> Relative date labels (Today / Tomorrow / In X days)
  -> Click a row to open Edit Task Modal
```

### 7.7 Calendar View

```text
Pipeline (Calendar)
  -> Monthly grid with forward/backward month navigation
  -> Days with tasks show task indicators (dots or counts)
  -> Click a day to open Day Detail Modal
```

### 7.8 Day Detail Modal

```text
Pipeline Calendar
  -> Tap a day with tasks
  -> Day Detail Modal opens
  -> Lists all tasks for that specific day
  -> Each task shows title, partner, value, status
  -> Can sync individual tasks with Google Calendar
  -> Close modal to return to calendar
```

### 7.9 Calendar Sync Flow

```text
Task card or Day Detail Modal
  -> Tap "Sync" on a task
  -> If Google Calendar is disconnected: show error with CTA to Settings
  -> If Google Calendar is connected: POST sync to backend
  -> Task receives googleCalendarEventId
  -> Show synced state indicator
```

### 7.10 Sync-Down Flow

```text
Pipeline
  -> Tap "Actualizar Calendar"
  -> Backend loads linked Google Calendar events
  -> Local task dates update to match Calendar changes
  -> UI refreshes with updated dates
```

## 8. Directory (Directorio)

### 8.1 Goal

Manage partners (brands), their contacts, financial data, and outreach in a single operational context.

### 8.2 Main Flow

```text
Directory
  -> Search partner by name
  -> Partner list with status badges and financial summary
  -> Expand a partner card
  -> Review: contacts, financial data, partnership details, task metrics
  -> Add / edit / delete contact
  -> Open message composer with template
  -> Send via email or WhatsApp
```

### 8.3 Partner Card (Expanded)

When a partner is expanded, the following sections are visible:

- **Status**: one of 6 statuses (Prospecto, En Negociacion, Activo, Inactivo, On Hold, Relacion Culminada)
- **Partnership type**: Permanente, Unica Vez, or Por Definir
- **Financial tracking**: monthly revenue and annual revenue
- **Date range**: start date and end date of the partnership
- **Logo and keywords**: visual identity and tagging
- **Task metrics**: total tasks and open tasks count for this partner
- **Contacts list**: all contacts associated with this partner

### 8.4 Contact Flow

```text
Expanded partner
  -> Tap "Add Contact"
  -> Add Contact Modal opens
  -> Fill: name, role, email, Instagram handle, phone number
  -> Save
  -> Contact appears under the partner
```

Each contact card displays:

- name and role
- email (tap to compose via template or open mail client)
- Instagram handle
- phone number (tap to open WhatsApp)

### 8.5 Outreach Flow

```text
Contact card
  -> Tap email icon or "Send" button
  -> Compose Message Modal opens
  -> Select a template from saved templates
  -> Variables auto-resolve: {{brandName}}, {{contactName}}, {{creatorName}}, {{deliverable}}, {{mediaKitLink}}
  -> Review subject and body with resolved values
  -> Choose: Open in email client OR Open in WhatsApp
```

Rules:

- template variables must resolve before opening the external client
- if an associated deliverable is missing, the flow uses explicit fallback text
- WhatsApp integration opens WhatsApp Web or the WhatsApp app with the pre-composed message
- email integration opens the default mail client with subject and body pre-filled

### 8.6 Partner Status Management

```text
Expanded partner
  -> Tap status badge or edit button
  -> Select new status from dropdown
  -> Status updates immediately
  -> Partner card reflects new status with appropriate color coding
```

## 9. Profile (Perfil)

### 9.1 Goal

Let the user maintain a professional identity, social presence, media kit, and goals — all with auto-save.

### 9.2 Basic Info Flow

```text
Profile
  -> Edit name, handle, avatar, bio
  -> Changes auto-save with 1-second debounce
  -> No explicit save button needed
```

### 9.3 Social Profiles Flow

```text
Profile > Social Profiles section
  -> Edit links for: Instagram, TikTok, X (Twitter), Threads, YouTube
  -> Each field accepts a URL or handle
  -> Changes auto-save with 1-second debounce
```

### 9.4 Media Kit Flow

```text
Profile > Media Kit section
  -> Edit 13 media kit sections:
     - Portfolio images (upload/manage)
     - Topic tags
     - Trusted brands
     - Audience metrics:
       - Insight stats (followers, reach, engagement, etc.)
       - Gender distribution
       - Age distribution
       - Top countries
     - Service offerings with pricing
     - About paragraphs with customizable content
  -> Changes auto-save with 1-second debounce
  -> Tap "Preview" to generate HTML media kit
  -> Media Kit Preview opens in-app
  -> Review the rendered HTML document
  -> Close preview to return to editing
```

### 9.5 Goals Management

Goals are managed exclusively in the Strategic View (Estrategia) tab, not in the Profile view.

See section 9.6 for the full Strategic View flow.

### 9.6 Strategic View (Estrategia)

#### 9.6.1 Goal

Map operational effort (tasks and partners) to strategic objectives. Provides aggregated metrics per goal showing task counts, total value, completion progress, and linked partners.

#### 9.6.2 Layout

Master-detail layout following the same pattern as the Directory view:

- Left pane: goal list with summary metrics and status badges, plus "Nuevo objetivo" button
- Right pane: selected goal detail card with progress bar, metrics grid, linked partners, and revenue estimation
- Below goal list: unassigned effort card showing tasks/value/partners not linked to any goal

#### 9.6.3 Summary KPIs

Top-level KPI row showing total objectives, tasks, value, and partners across all goals.

#### 9.6.4 Goal CRUD Flow

```text
Strategic View
  -> View goal list in left pane
  -> Tap "Nuevo objetivo"
  -> Goal form modal opens
  -> Fill: area, general goal, success metric, specific target, timeframe, status, priority, revenue estimation
  -> Status options: Pendiente, En Curso, Alcanzado, Cancelado
  -> Priority options: Baja, Media, Alta
  -> Timeframe options: 1 año, 2 años, 3 años
  -> Save
  -> Goal appears in the list and aggregation data refreshes
  -> Select a goal to see its detail in the right pane
  -> Tap edit icon on goal detail to open edit modal
  -> Delete option is inside the edit modal (not on the detail card)
```

#### 9.6.5 Goal-Task Relationship

Tasks and partners can be linked to goals via optional `goalId` foreign keys:

- Tasks: linked via the goal selector in the Pipeline task creation/edit form
- Partners: linked via the `goalId` field on the partner entity
- Relationships use `ON DELETE SET NULL` — deleting a goal unlinks but does not delete associated tasks/partners
- The Strategic View aggregates linked tasks and partners per goal for metrics

#### 9.6.6 Data Source

The Strategic View fetches aggregated data from `GET /api/v1/strategic-view`, which returns:

- Per-goal aggregation: task count, total value, completed task count, partner count, partner names
- Unassigned totals: tasks, value, and partners not linked to any goal

Goal CRUD operations use `PATCH /api/v1/profile` with the `goals` array (DELETE all + INSERT pattern).

## 10. Settings (Ajustes)

### 10.1 Goal

Centralize visual customization, notifications, integrations, templates, and app configuration.

### 10.2 Main Flows

```text
Settings
  -> Appearance: select accent color from 24-color palette grid
  -> Appearance: toggle dark/light theme
  -> Notifications: toggle browser push notifications (with permission handling)
  -> Integration: connect/disconnect Google Calendar
  -> Templates: manage message templates
  -> Onboarding: reset tour to replay the guided walkthrough
```

### 10.3 Accent Color Flow

```text
Settings > Appearance
  -> 24-color palette displayed as a grid
  -> Tap a color swatch to select it
  -> Accent color updates immediately across the entire UI
  -> Selection persists across sessions
```

### 10.4 Theme Toggle Flow

```text
Settings > Appearance
  -> Toggle between dark and light mode
  -> Theme changes immediately across the entire UI
  -> Selection persists across sessions
```

### 10.5 Push Notifications Flow

```text
Settings > Notifications
  -> Toggle push notifications on
  -> Browser requests notification permission (if not already granted)
  -> If permission granted: notifications enabled, daily and tomorrow task reminders active
  -> If permission denied: toggle reverts, user informed about browser settings
  -> Toggle push notifications off: reminders stop
```

### 10.6 Google Calendar OAuth Flow

```text
Settings > Integration
  -> Tap "Connect Google Calendar"
  -> Backend returns OAuth URL
  -> Google OAuth popup window opens
  -> User authorizes in popup
  -> Callback succeeds
  -> Popup closes automatically
  -> Settings reflects "Connected" state
  -> Disconnect option becomes available
```

### 10.7 Template Management Flow

```text
Settings > Templates
  -> View list of saved templates
  -> Tap "Add Template"
  -> Add/Edit Template Modal opens
  -> Fill: name, subject, body
  -> Variable documentation panel shows available placeholders:
     {{brandName}}, {{contactName}}, {{creatorName}}, {{deliverable}}, {{mediaKitLink}}
  -> Save
  -> Template becomes available in the Directory message composer
  -> Edit or delete existing templates
```

### 10.8 Onboarding Reset Flow

```text
Settings
  -> Tap "Reset Tour" button
  -> localStorage tour completion flag is cleared
  -> Onboarding tour replays on next navigation or page load
```

## 11. AI Assistant (Experimental)

### 11.1 Goal

Provide a conversational interface for managing tasks and partners using natural language, powered by Gemini.

### 11.2 Availability

- the AI Assistant is only rendered when the GEMINI_API_KEY environment variable is configured on the backend
- if the key is not present, the AI Assistant entry point is hidden from navigation
- this is an experimental feature and may be disabled at any time

### 11.3 Chat Flow

```text
AI Assistant
  -> Chat interface with scrollable message history
  -> Type a message in the text input
  -> OR tap the microphone icon for voice input
  -> Voice input uses Web Speech API configured for Spanish (es)
  -> Send message to Gemini backend
  -> AI processes the request using function calling
  -> Supported functions:
     - get_app_data: retrieve tasks, partners, contacts, profile data
     - add_task: create a new task
     - update_task_status: change a task's status
     - add_partner: create a new partner
     - add_contact: add a contact to a partner
     - update_partner_status: change a partner's status
  -> AI response appears in the chat
  -> If the AI performed an action, the app data refreshes to reflect changes
```

### 11.4 Voice Input Flow

```text
AI Assistant
  -> Tap microphone icon
  -> Browser requests microphone permission (if not already granted)
  -> Speech recognition starts (Spanish locale)
  -> User speaks command
  -> Transcribed text appears in the input field
  -> User reviews and sends, or edits before sending
```

## 12. Onboarding Tour

### 12.1 Goal

Guide first-time users through all primary sections of the app so they understand the layout and capabilities.

### 12.2 Tour Flow

```text
First login or tour reset
  -> 700ms delay for smooth start
  -> React Joyride tour begins
  -> Steps cover (in order):
     1. Dashboard (Inicio) — operational overview
     2. Pipeline — task management and views
     3. Directory (Directorio) — partner and contact management
     4. Profile (Perfil) — identity and media kit
     5. Settings (Ajustes) — customization and integrations
     6. AI Assistant — conversational management (if available)
  -> Each step highlights the relevant navigation element
  -> Tooltips are theme-aware (match dark/light mode and accent color)
  -> Responsive: targets sidebar items on desktop, bottom nav items on mobile
  -> User can skip the tour at any step
  -> Tour completion state saved to localStorage
```

## 13. System States

Required global states:

- `loading`
- `ready`
- `empty`
- `saving`
- `auto-saving` (profile fields with debounce)
- `syncing`
- `error`
- `unauthorized`

Canonical rules:

- no view may depend on demo data once the production app is active
- every optimistic update must reconcile with the server response
- auto-save must provide visual feedback (e.g., subtle indicator) so the user knows data was persisted

## 14. Primary State Transitions

### 14.1 Auth

- `logged_out -> authenticating -> authenticated`
- `authenticated -> session_expired -> logged_out`

### 14.2 Tasks

- `idle -> creating -> created`
- `idle -> updating -> updated`
- `idle -> deleting -> deleted`
- `idle -> dragging -> dropped -> status_updated`
- `idle -> syncing_calendar -> synced`
- `syncing_calendar -> failed`

### 14.3 Partners

- `idle -> creating -> created`
- `idle -> updating -> updated`
- `idle -> auto_creating (from task form) -> created`

### 14.4 Profile

- `idle -> editing -> debounce_waiting -> auto_saved`
- `idle -> generating_media_kit -> preview_ready`

### 14.5 Goals

- `idle -> creating -> created`
- `idle -> updating -> updated`
- `idle -> deleting -> deleted`

### 14.6 Google Integration

- `disconnected -> oauth_pending -> connected`
- `connected -> disconnecting -> disconnected`
- `connected -> token_expired -> reconnect_required`

### 14.7 AI Assistant

- `idle -> sending_message -> waiting_for_response -> response_received`
- `idle -> voice_recording -> transcribing -> text_ready`
- `response_received -> function_executed -> data_refreshed`

### 14.8 Notifications

- `disabled -> requesting_permission -> enabled`
- `requesting_permission -> permission_denied -> disabled`
- `enabled -> toggled_off -> disabled`

### 14.9 Onboarding

- `not_seen -> running -> completed`
- `running -> skipped`
- `completed -> reset -> not_seen`

## 15. Non-Negotiable UX Rules

- primary navigation never disappears in normal states
- destructive actions require confirmation
- external errors explain the next step
- responsive design is required: desktop sidebar and mobile bottom nav are both first-class experiences
- the user must always understand whether data was saved, failed, or is still syncing
- auto-save must be visually indicated so edits are never silently lost
- the AI assistant must not block or interfere with core app functionality
- drag-and-drop in Pipeline must provide clear visual feedback during the drag operation
- accent color and theme changes must apply immediately without page reload
- push notification permission must be requested only when the user explicitly enables notifications
