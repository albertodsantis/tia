# Efi - Product Requirements Document

## 1. Purpose

This document defines the target product for the current production version of Efi. Any functional change that conflicts with this document requires an explicit update to the canon.

## 2. Product Vision

Efi is a micro SaaS CRM for independent professionals — content creators, podcasters, streamers, photographers, copywriters, DJs, speakers, coaches, and more — who need to manage deliverables, brand relationships, contacts, finances, templates, professional profiles, and goals without relying on scattered spreadsheets, notes, reminders, and inbox threads.

The delivery sequence is:

1. A production web app (current)
2. A strong responsive mobile web experience using the same product (current — desktop sidebar + mobile bottom nav)
3. A native mobile app later

The product goal is to serve as a centralized operational hub for creators:

- centralize the collaboration pipeline with drag-and-drop workflow management
- maintain an actionable directory of brands and contacts with financial tracking
- visualize deadlines, pipeline value, and goal progress
- support reusable outreach workflows via email and WhatsApp
- sync deliverables with Google Calendar
- provide a modular public profile builder (Perfil Público) as a shareable professional link
- offer an AI assistant for natural-language task and partner management
- reward user engagement through a built-in gamification system (Efisystem)
- establish a backend-owned, multi-tenant source of truth for future clients

## 3. Language and Audience

Efi is built for Spanish-speaking users.

Rules:

- brand tone is Spanish-first
- product copy and visible UI text is written in Spanish
- technical documentation in this repository is written in English

## 4. Problem Statement

Many creators and small creator operators currently manage commercial operations across WhatsApp, email, Google Calendar, notes, and spreadsheets. That leads to:

- lost context between a brand, a contact, and a deliverable
- weak visibility into pipeline status and financial value
- missed or poorly synchronized deadlines
- inconsistent outreach and follow-up
- fragmented work across desktop and mobile browsing contexts
- no centralized public profile or professional portfolio link
- no structured goal-setting or progress tracking
- no financial overview of partner revenue and partnership health

## 5. Target Users

Primary user:

- independent content creator, influencer, or creative freelancer
- pays for and uses their own workspace
- needs a lightweight but credible operational CRM
- expects a good experience on both desktop web and mobile web
- works primarily in Spanish, but may operate with international brands
- needs a shareable public profile for prospective partners

Secondary user:

- creator manager or assistant supporting one creator account

Near-future expansion user:

- small creator team sharing an account context

Shared multi-user collaboration is not part of the current scope.

## 6. Release Goal

Release target: `Efi MVP v1`

The v1 release is an authenticated, persistent, commercially credible web application ready for daily use on both desktop and mobile browsers. Core features are backed by PostgreSQL with full multi-tenant data isolation. Authentication supports email/password and Google OAuth.

Experimental AI functionality (Gemini-powered assistant) exists behind a feature flag and is conditionally available based on the `GEMINI_API_KEY` environment variable.

Native mobile apps are explicitly not required for v1.

## 7. In-Scope Features

### 7.1 Authentication and Session

- email/password registration and login
- Google OAuth login (Supabase-initiated full-page redirect; backend validates Supabase access_token and issues Express session)
- persistent and secure session handling (PostgreSQL-backed sessions)
- logout, change password, and account deletion
- clear separation between app authentication and Google Calendar permission grants

### 7.2 Dashboard (Inicio)

Concise operational view with:

- **GoalsMarquee**: draggable horizontal scroll of the user's active professional goals
- **Operational summary card**: annual revenue goal, open pipeline value, closed/billed value
- **Period filter**: segmented control (This Month / Last Month / This Year / All Time) — scopes all dashboard metrics
- **Task breakdown**: horizontal progress bars showing task count by status
- **Upcoming tasks list**: next 4 tasks sorted by due date
- **Summary stats panel**: tasks due today, tomorrow, this week; active partners; total contacts; overdue tasks
- **Complete-task quick actions**: mark a task complete directly from the dashboard
- **EfisystemWidget**: inline gamification level/XP/badge progress display

### 7.3 Task Pipeline

- create, edit, and delete tasks with title, partner, value, due date, description, goal link
- per-task checklist items (add, check, delete inline)
- associate each task with a partner (brand)
- drag-and-drop task reordering via @dnd-kit across kanban columns
- task search across title, description, and partner name
- partner autocomplete during task creation with auto-create for new partners
- optional Google Calendar event tracking per task (`gcalEventId`)

Task statuses:

- `Pendiente`
- `En Progreso`
- `En Revisión`
- `Completada`
- `Cobrado`

Supported views:

- **Kanban** — drag-and-drop columns by status
- **List** — full tabular list
- **Calendar** — monthly grid with day detail modal

Additional:

- monetary value per task
- due date with relative date labels (Today / Tomorrow / In X days)
- status color coding across all views
- `completedAt` and `cobradoAt` timestamps recorded automatically on status transition
- `actualPayment` field to record the real payment received

### 7.4 Brand and Contact Directory (Directorio)

- create, edit, archive, and delete partners (brands)
- manage relationship status per partner (6 statuses)
- create, edit, and delete contacts associated with a partner
- multi-contact management per partner (name, role, email, Instagram, phone)
- search partners by name
- financial tracking per partner: monthly revenue, annual revenue
- partnership type classification: Permanente, Plazo Fijo, One Time, Por Definir
- task metrics per partner: total tasks and open tasks count
- start date, end date, and source tracking per partnership
- partner logo, main channel, and keyword tagging
- `lastContactedAt` tracking for outreach recency

Partner statuses:

- `Prospecto`
- `En Negociación`
- `Activo`
- `Inactivo`
- `On Hold`
- `Relación Culminada`

### 7.5 Templates and Outreach

- create, edit, and delete message templates (managed in Settings)
- template fields: name and body (no subject field)
- supported variables: `{{brandName}}`, `{{contactName}}`, `{{creatorName}}`, `{{deliverable}}`, `{{mediaKitLink}}`
- message composer with template variable substitution
- direct email integration: opens the user's email client with the resolved template
- direct WhatsApp integration: opens WhatsApp with the resolved message from contact cards

### 7.6 Public Profile (Perfil Público)

The profile is a modular block composer. Users select, arrange, and fill blocks to build a shareable public profile page served at `/mk/:handle` as an HTML page (no login required for viewers).

#### 7.6.1 Identity and Social Profiles

- edit display name, handle, avatar, and bio
- manage social profile links: Instagram, TikTok, X (Twitter), Threads, YouTube
- profession selection: primary profession and optional secondary professions

#### 7.6.2 Block Composer

Users build their profile from a library of 16+ block types:

| Block | Content |
|-------|---------|
| `identity` | tagline, contact email, period label |
| `about` | bio paragraphs, featured image, topic tags |
| `metrics` | insight stats, audience gender/age/country distribution |
| `portfolio` | uploaded portfolio images |
| `brands` | trusted brand names |
| `services` | service offerings with title, price, description |
| `closing` | CTA heading and description, footer note |
| `testimonials` | quotes with author, company, role |
| `press` | media mentions with publication, headline, URL, year |
| `speaking_topics` | talk titles and descriptions |
| `video_reel` | video links with labels |
| `equipment` | gear list with descriptions |
| `awards` | award name, issuer, year |
| `faq` | question and answer pairs |
| `episodes` | podcast episode title, description, listen URL |
| `releases` | release name with streaming platform links |
| `links` | custom link label and URL |

Block management:

- add blocks from the `BlockPickerDrawer`
- reorder blocks via drag-and-drop
- each block is saved independently with an explicit save button (no debounced auto-save)
- enable/disable individual components within a block via `blockComponents` config
- load block content from saved templates via `TemplatePickerDrawer`

#### 7.6.3 Public Profile URL

The public profile is served at `/mk/:handle`. No authentication required for viewers. The server renders HTML using the saved profile data.

### 7.7 Settings (Ajustes)

- multi-modal accent color system: flat hex colors, gradients (`gradient:<key>`), conic presets (`conic:<key>`), retro themes (`retro:<key>`)
- dark/light theme toggle
- Google Calendar OAuth integration via popup flow
- browser push notifications toggle with permission handling
- daily and tomorrow task reminder notifications
- template CRUD (name and body, with variable documentation panel)
- onboarding tour reset button
- change password (email provider only)
- delete account (with confirmation)

### 7.8 Google Calendar Integration

- connect and disconnect the account via OAuth popup
- create or update events from a task
- pull date changes from Calendar back into the task
- sync status indicator per task
- `gcalEventId` tracked per task

### 7.9 AI Assistant (Experimental)

- Gemini integration with structured function calling
- supported functions: `get_app_data`, `add_task`, `update_task_status`, `add_partner`, `add_contact`, `update_partner_status`
- voice input via Web Speech API (Spanish locale)
- chat interface with scrollable message history
- conditional availability: only rendered when `GEMINI_API_KEY` is configured
- the assistant can read app data and perform write operations on behalf of the user

### 7.10 Onboarding

- **WelcomeColorPicker**: new-user accent color selection screen (before entering the app)
- **WelcomeOnboarding**: new-user welcome/intro screen with profession picker
- **Joyride tour**: guided tour covering Dashboard, Pipeline, Directory, Estrategia, Profile, Settings, and AI Assistant
- responsive step definitions (mobile bottom nav vs desktop sidebar)
- localStorage persistence of tour completion state
- theme-aware tooltip styling
- 700ms auto-start delay
- reset capability in Settings

### 7.11 Strategic View (Estrategia)

- dedicated view for managing goals and mapping operational effort to strategic objectives
- master-detail layout: goal list (left), goal detail with aggregated metrics (right)
- create, edit, and delete professional goals
- goal fields: area, general goal, success metric, timeframe (months), target date, status, priority, revenue estimation
- goal statuses: Pendiente, En Curso, Alcanzado, Cancelado
- goal priorities: Baja, Media, Alta
- timeframe: 1–36 months (displayed as calculated target date)
- tasks and partners can be linked to goals via optional `goalId` foreign key
- aggregated metrics per goal: task count, total value, completed task count, partner count
- progress bar showing task completion percentage per goal
- unassigned effort card: tasks, value, and partners not linked to any goal
- summary KPI row: total objectives, tasks, value, partners
- goals displayed in Dashboard GoalsMarquee

### 7.12 Gamification — Efisystem

- XP point system with level progression
- badge unlocks tied to key product milestones (9 badges)
- points awarded for: creating tasks, completing tasks, billing tasks, adding partners and contacts, profile setup, goal creation, accent changes
- `EfisystemWidget` displays current level, XP progress bar, and unlocked badges
- gamification awards are returned inline with mutation responses
- confetti animation on level-up or badge unlock

## 8. Canonical User Stories

### 8.1 Access

- As a creator, I want to register with email and password so I can create my workspace.
- As a creator, I want to sign in with Google so I can access my workspace without a password.
- As a creator, I want to log out securely so my data is protected on shared devices.
- As a creator, I want to delete my account if I no longer need the service.

### 8.2 Dashboard

- As a creator, I want to see my professional goals in a scrollable marquee so I stay focused.
- As a creator, I want to see an operational summary (annual revenue goal, open pipeline, closed/billed value) so I understand my financial position.
- As a creator, I want to filter dashboard metrics by time period so I can analyze different windows.
- As a creator, I want to see a task breakdown by status so I understand my pipeline health.
- As a creator, I want to see upcoming tasks sorted by due date so I know what to work on next.
- As a creator, I want to mark tasks as complete directly from the dashboard.

### 8.3 Pipeline

- As a creator, I want to create tasks with checklists so I can break deliverables into steps.
- As a creator, I want to drag and drop tasks between kanban columns to update status quickly.
- As a creator, I want to search tasks by title, description, or partner name.
- As a creator, I want to view tasks in kanban, list, and calendar layouts.
- As a creator, I want the task form to autocomplete partners and auto-create new ones.
- As a creator, I want to record the actual payment on a billed task.

### 8.4 Brands and Contacts

- As a creator, I want to create partners with multiple contacts in one place.
- As a creator, I want to track monthly and annual revenue per partner.
- As a creator, I want to send a WhatsApp message directly from a contact card.
- As a creator, I want to classify partnerships (Permanente, Plazo Fijo, One Time, Por Definir).

### 8.5 Templates and Communication

- As a creator, I want to save reusable templates with variable placeholders.
- As a creator, I want to open a composed message in my email client or WhatsApp.

### 8.6 Public Profile

- As a creator, I want to build a modular profile with the blocks relevant to my profession.
- As a creator, I want my profile to be available at a public URL so I can share it with partners.
- As a creator, I want to add, remove, and reorder profile blocks to control my presentation.
- As a creator, I want to select my profession so the profile is tailored to my work.

### 8.7 Goals and Strategic View

- As a creator, I want to create professional goals with area, description, timeframe, and priority.
- As a creator, I want to link tasks to goals so I can see how my operational effort maps to strategy.
- As a creator, I want to see aggregated metrics per goal (task count, value, completion %).

### 8.8 Calendar and Reminders

- As a creator, I want to sync a task with Google Calendar so I do not miss deadlines.
- As a creator, I want to enable browser push notifications to receive task reminders.

### 8.9 Settings and Personalization

- As a creator, I want to choose from a rich accent color palette (flat, gradient, conic, retro presets).
- As a creator, I want to toggle dark/light theme.
- As a creator, I want to manage message templates.

### 8.10 AI Assistant

- As a creator, I want to manage tasks and partners conversationally via text or voice.
- As a creator, I want the AI to create tasks, update statuses, and add partners on my behalf.

### 8.11 Gamification

- As a creator, I want to earn XP and badges for completing key actions so using the app feels rewarding.
- As a creator, I want to see my current level and progress at a glance.

## 9. Data Model

### 9.1 Core Entities

**Task** — id, title, description, partnerId, goalId?, status (TaskStatus), dueDate, value, gcalEventId?, createdAt, completedAt?, cobradoAt?, actualPayment?, checklistItems[]

**Partner** — id, name, status (PartnerStatus), goalId?, logo?, contacts[], keyTerms?, partnershipType?, startDate?, endDate?, monthlyRevenue, annualRevenue, mainChannel?, createdAt, lastContactedAt?, source?

**Contact** — id, name, role, email, ig, phone?

**UserProfile** — name, avatar, handle, bio?, socialProfiles, mediaKit (block-based), goals[], notificationsEnabled, primaryProfession?, secondaryProfessions[]

**Template** — id, name, body

**Goal** — id, area, generalGoal, successMetric, timeframe (months), targetDate, createdAt, status (GoalStatus), priority (GoalPriority), revenueEstimation

### 9.2 Enumerations

- **TaskStatus**: Pendiente, En Progreso, En Revisión, Completada, Cobrado
- **PartnerStatus**: Prospecto, En Negociación, Activo, Inactivo, On Hold, Relación Culminada
- **PartnershipType**: Permanente, Plazo Fijo, One Time, Por definir
- **GoalStatus**: Pendiente, En Curso, Alcanzado, Cancelado
- **GoalPriority**: Baja, Media, Alta
- **FreelancerType**: content_creator, podcaster, streamer, radio, photographer, copywriter, community_manager, host_mc, speaker, dj, recruiter, coach

## 10. Out of Scope

Everything below is explicitly out of scope for v1:

- real-time multi-user collaboration
- shared workspaces with granular permissions
- invoicing, collections, or advanced accounting
- sending email from Efi-owned servers
- internal messaging between users
- native iOS or Android apps
- automatically imported social media analytics
- advanced enterprise CRM automations
- template marketplace
- subscription billing implementation

## 11. Technology Stack Summary

- Frontend: React 19, TypeScript, Vite, Tailwind CSS 4, @phosphor-icons/react
- Backend: Express 4, Helmet, express-rate-limit, bcryptjs, multer
- Database: PostgreSQL via Supabase (pg, connect-pg-simple)
- Auth: email/password (bcryptjs) + Google OAuth
- Drag-and-drop: @dnd-kit/core
- Onboarding: react-joyride
- Animations: motion, canvas-confetti
- Color picker: react-colorful
- AI: @google/genai (Gemini, experimental)
- Google APIs: googleapis
- File storage: Supabase Storage

## 12. Non-Functional Requirements

- full data persistence across sessions and devices (PostgreSQL)
- multi-tenant isolation: all data scoped by `user_id`
- desktop web and mobile web must both be first-class supported experiences
- responsive layout: desktop sidebar navigation, mobile bottom tab bar
- initial load under 2.5 seconds on broadband
- standard CRUD flows with immediate visual feedback (optimistic updates)
- external integration failures handled gracefully with user-facing messages
- secrets and tokens live only on the backend
- frontend clients treat the backend as the source of truth
- AI features degrade gracefully when API key is not configured
- push notifications requested only when the user explicitly enables them

## 13. Success Metrics

Primary metrics for the first 90 days:

- activation: ≥60% of registered users create their first task on the same day
- weekly retention: ≥35% of active users return within 7 days
- real usage: ≥70% of active users create or update 3+ tasks per week
- captured value: ≥50% of users with 5+ tasks record monetary value in ≥80% of tasks
- integration: ≥30% of active users connect Google Calendar
- profile: ≥40% of active users build a profile with 3+ active blocks
- goals: ≥30% of active users create at least one professional goal
- mobile web: core workflows remain usable on a standard mobile browser

Operational metrics:

- API error rate below 1% on critical endpoints
- Google Calendar sync succeeds in ≥95% of valid attempts
- zero secrets exposed in the client bundle
- AI assistant responds within 5 seconds for standard function calls

## 14. Acceptance Criteria

The product is ready when:

- real user authentication exists (email/password and Google OAuth)
- core entities persist in PostgreSQL with user-scoped isolation
- the frontend no longer depends on demo in-memory state
- Google Calendar works through a secure OAuth flow
- the user can operate Dashboard, Pipeline, Directory, Strategic View, Profile, and Settings against real data
- desktop web and mobile web are both viable for normal daily usage
- public profile is accessible at `/mk/:handle` without authentication
- goals can be created, edited, and tracked through their lifecycle
- financial tracking per partner is functional
- drag-and-drop pipeline management works in Kanban view
- experimental AI functionality does not compromise security, cost control, or the main product experience
- push notifications can be enabled and deliver task reminders
- the onboarding tour covers all primary sections and can be reset
- gamification awards XP and badges for key user actions
