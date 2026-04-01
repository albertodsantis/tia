# Tia - Product Requirements Document

## 1. Purpose

This document defines the target product for the current production version of Tia. Any functional change that conflicts with this document requires an explicit update to the canon.

## 2. Product Vision

Tia is a micro SaaS CRM personalized for content creators, influencers, and creative freelancers who need to manage deliverables, brand relationships, contacts, finances, templates, media kits, professional goals, and follow-up work without relying on scattered spreadsheets, notes, reminders, and inbox threads.

The delivery sequence is:

1. a production web app (current)
2. a strong responsive web mobile experience using the same product (current — desktop sidebar + mobile bottom nav)
3. a native mobile app later

The product goal is to serve as a centralized operational hub for creators:

- centralize the collaboration pipeline with drag-and-drop workflow management
- maintain an actionable directory of brands and contacts with financial tracking
- visualize deadlines, pipeline value, and goal progress
- support reusable outreach workflows via email and WhatsApp
- sync deliverables with Google Calendar
- provide a professional Media Kit generator for audience metrics and service offerings
- offer an AI assistant for natural-language task and partner management
- establish a backend-owned source of truth for future clients

## 3. Language and Audience

Tia is built for Spanish-speaking users.

Rules:

- brand tone is Spanish-first
- product copy and visible UI text is written in Spanish
- technical documentation in this repository is written in English so AI agents and automation can work against a consistent source of truth

## 4. Problem Statement

Many creators and small creator operators currently manage commercial operations across WhatsApp, email, Google Calendar, notes, and spreadsheets. That leads to:

- lost context between a brand, a contact, and a deliverable
- weak visibility into pipeline status and financial value
- missed or poorly synchronized deadlines
- inconsistent outreach and follow-up
- fragmented work across desktop and mobile browsing contexts
- no centralized media kit or professional portfolio
- no structured goal-setting or progress tracking
- no financial overview of partner revenue and partnership health

## 5. Target Users

Primary user:

- independent content creator, influencer, or creative freelancer
- pays for and uses their own workspace
- needs a lightweight but credible operational CRM
- expects a good experience on both desktop web and mobile web
- works primarily in Spanish, but may operate with international brands
- needs to present a professional media kit to prospective partners

Secondary user:

- creator manager or assistant supporting one creator account
- uses the app to keep a small operational workflow organized

Near-future expansion user:

- small creator team sharing an account context

Shared multi-user collaboration is not part of the current scope, but the system is not designed in a way that blocks it.

## 6. Release Goal

Release target: `Tia MVP v1`

The v1 release is an authenticated, persistent, commercially credible web application that is ready for daily use and works correctly across desktop and mobile browsers.

Experimental AI functionality (Gemini-powered assistant) exists behind a feature flag and is conditionally available based on the GEMINI_API_KEY environment variable.

Native mobile apps are explicitly not required for v1.

## 7. In-Scope Features

### 7.1 Authentication and Session

- Google sign-in for access to the application
- persistent and secure session handling
- clear separation between app authentication and Google Calendar permission grants

### 7.2 Dashboard (Inicio)

Concise operational view with:

- GoalsMarquee: draggable horizontal scroll displaying the user's professional goals
- operational summary card showing annual revenue goal, open pipeline value, and closed/billed value
- task breakdown by status with visual progress bars
- period filter (This Month / Last Month / This Year / All Time) to scope all dashboard metrics
- upcoming tasks list showing the next 4 tasks sorted by due date
- summary stats panel: tasks due today, tasks due tomorrow, tasks this week, active partners, total contacts, overdue tasks
- complete-task quick actions directly from the dashboard

### 7.3 Task Pipeline

- create, edit, and delete tasks
- associate each task with a partner (brand)
- drag-and-drop task reordering via @dnd-kit across kanban columns
- task search across title, description, and partner name
- partner autocomplete during task creation with auto-create for new partners
- required task statuses:
  - `Pendiente`
  - `En Progreso`
  - `En Revision`
  - `Completada`
  - `Cobrado`
- supported views:
  - Kanban with drag-and-drop
  - Full list
  - Monthly calendar with day detail modal
- monetary value per task
- due date with relative date labels (Today / Tomorrow / In X days)
- status color coding across all views
- calendar month navigation with forward/backward controls
- top-level workspace actions for `Nueva tarea` and `Actualizar Calendar`

### 7.4 Brand and Contact Directory (Directorio)

- create, edit, and archive partners (brands)
- manage relationship status per partner
- create, edit, and delete contacts associated with a partner
- multi-contact management per partner (name, role, email, Instagram, phone)
- search partners by name
- financial tracking per partner: monthly revenue, annual revenue
- partnership type classification: Permanente, Unica Vez, Por Definir
- task metrics per partner: total tasks and open tasks count
- start date and end date tracking per partnership
- partner logo and keyword tagging

Approved partner statuses:

- `Prospecto`
- `En Negociacion`
- `Activo`
- `Inactivo`
- `On Hold`
- `Relacion Culminada`

### 7.5 Templates and Outreach

- create, edit, and delete message templates (managed in Settings)
- supported variables:
  - `{{brandName}}`
  - `{{contactName}}`
  - `{{creatorName}}`
  - `{{deliverable}}`
  - `{{mediaKitLink}}`
- message composer with template variable substitution
- direct email integration: opens the user's email client with resolved template
- direct WhatsApp integration: opens WhatsApp with resolved message from contact cards
- variable documentation displayed alongside template editor

### 7.6 Profile (Perfil)

#### 7.6.1 Basic Info

- edit display name, handle, avatar, and bio
- auto-save with 1-second debounce on all profile fields

#### 7.6.2 Social Profiles

- manage links to 5 platforms: Instagram, TikTok, X (Twitter), Threads, YouTube

#### 7.6.3 Media Kit

Full media kit builder and generator with the following sections:

- portfolio images
- topic tags
- trusted brands
- audience metrics with insight stats, gender distribution, age distribution, and top countries
- service offerings with pricing
- about paragraphs with customizable content
- HTML media kit generation and in-app preview

#### 7.6.4 Goals Management

Goals are managed in the dedicated Strategic View (Estrategia) tab, not in the Profile view. See section 7.11 for the full Strategic View feature spec.

### 7.11 Strategic View (Estrategia)

- dedicated view for managing goals and mapping operational effort to strategic objectives
- master-detail layout: goal list on the left, goal detail with aggregated metrics on the right
- create, edit, and delete professional goals (delete is inside the edit modal)
- goal fields: area, general goal, success metric, specific target, timeframe, status, priority, revenue estimation
- goal statuses: Pendiente, En Curso, Alcanzado, Cancelado
- goal priorities: Baja, Media, Alta
- timeframe options: 1 año, 2 años, 3 años
- tasks and partners can be linked to goals via optional `goalId` foreign key (ON DELETE SET NULL)
- tasks are linked to goals via the goal selector dropdown in the Pipeline task creation/edit form
- aggregated metrics per goal: task count, total value, completed task count, partner count, linked partner names
- progress bar showing task completion percentage per goal
- unassigned effort card: tasks, value, and partners not linked to any goal
- summary KPI row: total objectives, tasks, value, partners across all goals
- goal effort distribution widget on the Dashboard showing task/value breakdown by goal
- goals are displayed in the Dashboard GoalsMarquee

### 7.7 Settings (Ajustes)

- 24-color accent palette grid for UI personalization
- dark/light theme toggle
- Google Calendar OAuth integration via popup flow
- browser push notifications toggle with permission handling
- daily and tomorrow task reminder notifications
- template CRUD with variable documentation panel
- onboarding tour reset button

### 7.8 Google Calendar Integration

- connect and disconnect the account via OAuth popup
- create or update events from a task
- pull date changes from Calendar back into the task
- show sync status per task
- googleCalendarEventId tracked per task

### 7.9 AI Assistant (Experimental)

- Gemini integration with structured function calling
- supported functions: get_app_data, add_task, update_task_status, add_partner, add_contact, update_partner_status
- voice input via Web Speech API (configured for Spanish)
- chat interface with scrollable message history
- conditional availability: only rendered when GEMINI_API_KEY is configured
- the assistant can read app data and perform write operations on behalf of the user

### 7.10 Onboarding

- React Joyride guided tour covering all 5 main sections plus the AI assistant
- responsive step definitions (different targeting for mobile vs desktop navigation)
- localStorage persistence of tour completion state
- theme-aware tooltip styling matching the current accent color and theme
- 700ms auto-start delay for smooth initial experience
- reset capability available in Settings

## 8. Canonical User Stories

### 8.1 Access

- As a creator, I want to sign in with Google so I can enter my workspace without creating a manual password.
- As a creator, I want to log out securely so my data is protected on shared devices.

### 8.2 Dashboard

- As a creator, I want to see my professional goals in a scrollable marquee so I stay focused on what matters.
- As a creator, I want to see an operational summary with annual revenue goal, open pipeline value, and closed/billed value so I understand my financial position at a glance.
- As a creator, I want to filter dashboard metrics by time period (This Month, Last Month, This Year, All Time) so I can analyze performance across different windows.
- As a creator, I want to see a task breakdown by status with progress bars so I understand my pipeline health.
- As a creator, I want to see upcoming tasks sorted by due date so I know what to work on next.
- As a creator, I want to see summary stats (today, tomorrow, this week, overdue, active partners, total contacts) so I have full operational awareness.
- As a creator, I want to mark tasks as complete directly from the dashboard so I can update status without navigating away.

### 8.3 Pipeline

- As a creator, I want to create a task with title, partner, value, date, and description so I can register a new deliverable.
- As a creator, I want to drag and drop tasks between status columns in Kanban view so I can quickly update pipeline phases.
- As a creator, I want to search tasks by title, description, or partner name so I can find deliverables quickly.
- As a creator, I want to change the status of a task so I always know which pipeline phase it is in.
- As a creator, I want to view my tasks in kanban, list, and calendar layouts so I can operate in the best context.
- As a creator, I want to see relative date labels (Today, Tomorrow, In X days) so I understand urgency without mental math.
- As a creator, I want to click a calendar day to see all tasks for that day in a detail modal.
- As a creator, I want to edit an existing task so I can correct value, description, or date.
- As a creator, I want to delete a task so I can keep the pipeline clean.
- As a creator, I want the task form to autocomplete partner names and auto-create new partners so I never slow down during task entry.

### 8.4 Brands and Contacts

- As a creator, I want to create a partner even when I do not yet have contacts so I do not lose opportunities.
- As a creator, I want to add multiple contacts to a partner so I can centralize stakeholders.
- As a creator, I want to store contact details including name, role, email, Instagram, and phone so I have all communication channels in one place.
- As a creator, I want to update the commercial status of a partner so I can understand relationship health.
- As a creator, I want to search a partner quickly so I can recover context in seconds.
- As a creator, I want to track monthly and annual revenue per partner so I understand the financial value of each relationship.
- As a creator, I want to classify partnerships as Permanente, Unica Vez, or Por Definir so I can understand the nature of each engagement.
- As a creator, I want to see task metrics (total and open) per partner so I know the workload tied to each brand.
- As a creator, I want to send a WhatsApp message directly from a contact card so I can reach out without leaving the app.

### 8.5 Templates and Communication

- As a creator, I want to save reusable templates with variable placeholders so I can accelerate outreach.
- As a creator, I want to preview a template with resolved variables so I can avoid mistakes before sending.
- As a creator, I want to use {{mediaKitLink}} in templates so I can share my media kit with prospective partners.
- As a creator, I want to open a composed message in my email client or WhatsApp so I can send it through my preferred channel.

### 8.6 Profile and Media Kit

- As a creator, I want to edit my name, handle, avatar, and bio so my professional identity is up to date.
- As a creator, I want to manage my social profiles (Instagram, TikTok, X, Threads, YouTube) so partners can find me everywhere.
- As a creator, I want to build a media kit with portfolio images, topic tags, trusted brands, audience metrics, and service offerings so I can present a professional package to prospective partners.
- As a creator, I want to define audience metrics including insight stats, gender distribution, age distribution, and top countries so partners understand my reach.
- As a creator, I want to list service offerings with pricing so partners know what I offer and at what cost.
- As a creator, I want to generate and preview an HTML media kit so I can share a polished document externally.
- As a creator, I want my profile changes to auto-save so I never lose edits.

### 8.7 Goals and Strategic View

- As a creator, I want to create professional goals with area, description, success metric, target, timeframe, status, priority, and revenue estimation so I can structure my growth.
- As a creator, I want to see my goals on the dashboard marquee so they stay top of mind.
- As a creator, I want to update goal status (Pendiente, En Curso, Alcanzado, Cancelado) so I can track progress.
- As a creator, I want to set goal priority (Baja, Media, Alta) so I can focus on what matters most.
- As a creator, I want to link tasks to goals so I can see how my operational effort maps to my strategic objectives.
- As a creator, I want to see aggregated metrics per goal (task count, value, completion %) in the Strategic View so I understand progress at a glance.
- As a creator, I want to see which tasks and partners are unassigned to any goal so I can identify effort that lacks strategic direction.

### 8.8 Calendar and Reminders

- As a creator, I want to sync a task with Google Calendar so I do not miss deadlines.
- As a creator, I want to pull date changes from Calendar so Tia stays aligned.
- As a creator, I want to enable browser push notifications so I receive reminders for today's and tomorrow's tasks.

### 8.9 Settings and Personalization

- As a creator, I want to choose from a 24-color accent palette so the app feels personal.
- As a creator, I want to toggle between dark and light theme so the app suits my visual preference.
- As a creator, I want to manage message templates with variable documentation so I always know which placeholders are available.
- As a creator, I want to reset the onboarding tour from Settings so I can revisit the guided walkthrough.

### 8.10 AI Assistant

- As a creator, I want to interact with an AI assistant via text or voice so I can manage tasks and partners conversationally.
- As a creator, I want the AI to create tasks, update statuses, add partners, and add contacts on my behalf so I can work faster.
- As a creator, I want to use voice input in Spanish so I can dictate commands hands-free.
- As a creator, I want the AI to retrieve my app data so it can give me contextual answers about my pipeline and partners.

### 8.11 Cross-Device Use

- As a creator, I want the same account to work well on desktop and mobile web so I can use Tia from wherever I am.
- As a creator, I want the backend to preserve my data consistently so switching devices does not change my operational context.

## 9. Data Model

### 9.1 Core Entities

**Task**
- id, title, description, partnerId, goalId (optional), status (TaskStatus), dueDate, value, googleCalendarEventId

**Partner**
- name, status (PartnerStatus), goalId (optional), logo, contacts[], monthlyRevenue, annualRevenue, keywords, partnershipType (PartnershipType), startDate, endDate

**Contact**
- id, name, role, email, instagram, phone

**UserProfile**
- name, avatar, handle, bio, socialProfiles (Instagram, TikTok, X, Threads, YouTube), mediaKit (13 sections), goals[], notificationsEnabled

**Template**
- id, name, subject, body

**Goal**
- area, goal, successMetric, target, timeframe, status (GoalStatus), priority (GoalPriority), revenueEstimation

### 9.2 Enumerations

- **TaskStatus**: Pendiente, En Progreso, En Revision, Completada, Cobrado
- **PartnerStatus**: Prospecto, En Negociacion, Activo, Inactivo, On Hold, Relacion Culminada
- **PartnershipType**: Permanente, Unica Vez, Por Definir
- **GoalStatus**: Pendiente, En Progreso, Lograda, Cancelada
- **GoalPriority**: Baja, Media, Alta

## 10. Out of Scope

Everything below is explicitly out of scope for v1:

- real-time multi-user collaboration
- shared workspaces with granular permissions
- invoicing, collections, or advanced accounting
- sending email from Tia-owned servers
- internal messaging between users
- native iOS or Android apps
- automatically imported social media analytics
- advanced enterprise CRM automations
- template marketplace
- subscription billing implementation

## 11. Technology Stack

- Frontend: React 19, TypeScript 5.8.2, Vite 6.2.0, Tailwind CSS 4.1.14
- Backend: Express 4.21.2
- Drag-and-drop: @dnd-kit/core
- Onboarding: react-joyride
- Animations: motion
- Color picker: react-colorful
- Icons: @phosphor-icons/react (duotone weight, globally via IconContext.Provider)
- Google APIs: googleapis
- AI: @google/genai (Gemini)

## 12. Non-Functional Requirements

- full data persistence across sessions and devices
- desktop web and mobile web must both be first-class supported experiences
- responsive layout: desktop sidebar navigation, mobile bottom tab bar
- initial load under 2.5 seconds on broadband
- standard CRUD flows with immediate visual feedback
- auto-save with 1-second debounce on profile fields
- external integration failures handled with understandable messages
- secrets and tokens live only on the backend
- frontend clients treat the backend as the source of truth
- AI features degrade gracefully when API key is not configured

## 13. Success Metrics

Primary product metrics for the first 90 days:

- activation: at least 60 percent of registered users create their first task on the same day
- weekly retention: at least 35 percent of active users return within 7 days
- real usage: at least 70 percent of active users create or update 3 or more tasks per week
- captured value: at least 50 percent of users with 5 or more tasks record monetary value in 80 percent of those tasks
- integration: at least 30 percent of active users connect Google Calendar
- media kit: at least 40 percent of active users complete at least 3 sections of their media kit
- goals: at least 30 percent of active users create at least one professional goal
- mobile web usage: the product remains operationally usable for at least 90 percent of core workflows on a standard mobile browser

Operational metrics:

- API error rate below 1 percent on critical endpoints
- Google Calendar sync succeeds in at least 95 percent of valid attempts
- zero secrets exposed in the client bundle
- AI assistant responds within 5 seconds for standard function calls

## 14. Acceptance Criteria

The product is ready when:

- real user authentication exists
- core entities persist in a database
- the frontend no longer depends on demo in-memory state
- Google Calendar works through a secure OAuth flow
- the user can operate Dashboard, Pipeline, Directory, Strategic View, Profile, and Settings against real data
- desktop web and mobile web are both viable for normal daily usage
- the Media Kit can be generated and previewed as HTML
- goals can be created, edited, and tracked through their lifecycle
- financial tracking per partner is functional
- drag-and-drop pipeline management works in Kanban view
- experimental AI functionality does not compromise security, cost control, or the main product experience
- push notifications can be enabled and deliver task reminders
- the onboarding tour covers all primary sections and can be reset
