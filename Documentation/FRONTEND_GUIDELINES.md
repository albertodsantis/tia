# Efi - Frontend Guidelines

## 1. Purpose

This document defines the frontend implementation rules for the Efi web app.

The canonical design authority lives in `design-system/MASTER.md`.

This file translates that master into implementation-facing guidance for the web app and should not become a second competing design source of truth.

## 2. Language and Brand Policy

This document is written in English because technical documentation in this repository is standardized for AI-friendly implementation work.

Product rules:

- Efi is designed for a Spanish-speaking audience
- brand tone is Spanish-first
- visible navigation labels, product copy, and screen text should remain in Spanish
- a single screen should not mix English and Spanish labels unless there is a clear product reason

## 3. Design Authority

Precedence order:

1. `design-system/MASTER.md`
2. `FRONTEND_GUIDELINES.md`
3. implementation details in `apps/web`

Use this document to explain how the frontend should implement the master, not to redefine the master independently.

## 4. Design System Lock

Approved design system: `Efi Internal Mobile CRM System`

Technical base:

- Tailwind CSS `4.x` (via `@tailwindcss/vite` plugin)
- CSS tokens for color, typography, radius, and shadow defined in `index.css`
- `@phosphor-icons/react` for iconography (weight="duotone" set globally via `IconContext.Provider` in `main.tsx`)
- Vite build with `@shared` path alias to `packages/shared`

Introducing another full UI system such as Material UI or Ant Design is not approved.

## 5. Frontend Translation of the Master

The frontend must implement the master with:

- CSS tokens for color, typography, radius, and shadow
- shared app-shell framing across breakpoints (desktop sidebar + mobile bottom nav)
- reusable primitives before one-off view styling
- Spanish-first UI copy
- accent-aware states that preserve WCAG contrast
- compact operational layouts over decorative dashboard chrome
- the chosen identity direction: `Soft Studio Console`
- calm surface hierarchy and restrained composition
- cardless or low-card layouts as the default starting point

## 6. Token Implementation Rules

The web app exposes the design system through CSS variables and shared primitives.

### 6.1. Token Ownership

- `apps/web/src/index.css` owns global tokens and base element behavior
- `apps/web/src/lib/accent.ts` derives runtime accent variants with WCAG contrast checking
- `apps/web/src/components/ui.tsx` holds reusable UI primitives
- screen-level files should consume the system instead of redefining it locally
- if a new token becomes reusable across screens, promote it into the token layer instead of leaving it in a single view

### 6.2. Design Tokens (from index.css)

Typography:

- primary font: system font stack
- monospace font: `Geist Mono` for code elements

Surface tokens (light / dark):

- `--color-app`: `#f6f3ee` / `#171311`
- `--color-shell`: shell background
- `--color-card`: card surface
- `--color-card-strong`: elevated card surface
- `--color-muted`: muted background
- `--color-overlay`: overlay surface

Text tokens:

- `--color-text-primary`: `#201a17` / `#f7f2ec`
- `--color-text-secondary`: `#6b625c` / `#b6aba2`

Border tokens:

- `--color-border-soft`: 10% transparency border
- `--color-border-strong`: stronger border

Shadow tokens:

- `--shadow-soft`: subtle shadow
- `--shadow-medium`: medium elevation
- `--shadow-floating`: high elevation (popovers, modals)

### 6.3. Accent Color System

The accent system uses 6 CSS variables derived at runtime by `accent.ts`:

- `--color-accent`: base accent color
- `--color-accent-foreground`: text on accent backgrounds
- `--color-accent-soft`: subtle accent background
- `--color-accent-soft-strong`: stronger accent background
- `--color-accent-border`: accent-tinted border
- `--color-accent-glow`: accent glow effect

All derived values must pass WCAG AA contrast requirements against their intended background.

### 6.4. Dark Mode

Dark mode is activated via the `.dark` class on the root element. All surface, text, border, and shadow tokens provide dark-mode overrides.

## 7. App Shell Rules

The application shell is implemented in `App.tsx` (546 lines) with responsive layout handling.

Current implementation:

- desktop uses a sidebar for navigation
- mobile uses a bottom navigation bar
- section headers are compact and inside scrollable content
- the shell supports custom scroll handling with keyboard shortcuts (PageUp, PageDown, Home, End)
- accent color theming is applied at the shell level
- loading and error states are handled at the shell level

Shell behavior rules:

- desktop should feel intentionally laid out, not like an enlarged phone frame
- background atmosphere may use subtle accent gradients, but work surfaces must remain highly legible
- the primary workspace should visually dominate the screen
- avoid turning the shell into a grid of equally loud panels
- prefer tonal grouping and spacing before bordered segmentation

## 8. Reusable Component Inventory

### 8.1. Primitives in ui.tsx

The shared component layer in `apps/web/src/components/ui.tsx` provides:

- `cx()` - class name utility for conditional class merging
- `SurfaceCard` - card container with 3 tone variants
- `ScreenHeader` - consistent screen header
- `MetricCard` - dashboard metric display
- `StatusBadge` - status indicator with 6 tones
- `EmptyState` - empty content placeholder
- `Button` - action button with 4 tones: `primary`, `secondary`, `ghost`, `danger`
- `IconButton` - icon-only action button
- `ToggleSwitch` - on/off toggle control
- `ModalPanel` - slide-in modal panel
- `SettingRow` - settings layout row

### 8.2. Standalone Components

Additional components outside `ui.tsx`:

- `AIAssistant` - Gemini-powered assistant with voice input (experimental, behind env var)
- `ConfirmDialog` - destructive action confirmation dialog
- `CustomSelect` - keyboard-accessible select dropdown
- `OnboardingTour` - guided onboarding using Joyride
- `OverlayModal` - portal-based modal overlay
- `Toaster` - event-based toast notification display

### 8.3. Views

All 6 views are implemented:

- `Dashboard` (493 lines) - summary metrics and overview with goal effort distribution widget
- `Pipeline` (1373 lines) - task management pipeline with goal selector in task form
- `Directory` - partner/contact directory
- `StrategicView` - goal management with master-detail layout and aggregated metrics per goal
- `Profile` - user profile with auto-save
- `Settings` (516 lines) - app configuration and integrations

### 8.4. State and Utilities

- `AppContext.tsx` (516 lines) - central state provider with optimistic updates, push notifications, error tracking
- `api.ts` - REST client
- `accent.ts` - accent color derivation with WCAG contrast utilities
- `date.ts` - timezone-safe date utilities
- `toast.ts` - event-based toast system

### 8.5. Component Creation Policy

Before creating a one-off pattern, check whether the need belongs in the shared component layer.

For `Soft Studio Console`, reusable primitives should bias toward:

- quiet surfaces
- strong typography
- compact controls
- tactile but restrained interaction feedback
- low-noise states and separators

## 9. Implementation Patterns

### 9.1. Optimistic UI Updates

`AppContext` performs optimistic updates on mutations. The UI reflects changes immediately while the API call happens in the background. On failure, the state rolls back and a toast notification reports the error.

### 9.2. Auto-Save with Debounce

The Profile view uses debounced auto-save to persist changes without requiring an explicit save action.

### 9.3. Push Notifications

Task reminders trigger push notifications for tasks due today or tomorrow.

### 9.4. Partner Auto-Creation

When creating a task, if a partner does not exist, the system auto-creates the partner record inline.

### 9.5. Template Variable Substitution

Message templates support variable placeholders that are resolved with partner/contact data at render time.

### 9.6. Portal-Based Modals

`OverlayModal` renders via React portals to avoid z-index and overflow clipping issues.

### 9.7. Event-Based Toasts

The toast system uses a custom event bus (`toast.ts` + `Toaster` component) rather than React state, allowing any module to trigger toasts without prop drilling.

### 9.8. Keyboard-Accessible Select

`CustomSelect` supports full keyboard navigation (arrow keys, Enter, Escape, type-ahead) for accessibility.

## 10. Desktop Scroll Safety

Desktop scrolling is a protected shell behavior in Efi and must not be changed casually.

Current implementation contract:

- desktop uses the main workspace panel as the primary vertical scroll container
- desktop shell wrappers may clip overflow, but the active `main` region must remain scrollable
- section headers stay inside the same scrollable workspace instead of living outside it
- mobile continues to use the page scroll model unless a feature explicitly requires a local scroll region
- App.tsx forwards keyboard scroll events (PageUp, PageDown, Home, End) to the correct scroll container

Do not introduce these regressions:

- do not move desktop back to `window` scroll while keeping shell wrappers height-locked
- do not add `wheel` interception on the main workspace to synthesize scroll manually unless there is a proven bug and a regression test
- do not add `overflow: hidden` or viewport-height locks on new desktop wrappers without confirming which element owns scroll
- do not split header and body into different vertical scroll containers unless the UX explicitly requires it and the keyboard behavior is revalidated

Required regression check after shell changes:

- verify desktop wheel scroll over the main content area
- verify desktop wheel scroll still works when the pointer is over the left sidebar
- verify `PageDown`, `PageUp`, `Home`, `End`, and spacebar still move the desktop workspace correctly
- verify mobile still scrolls normally

## 11. Component States

Every reusable component must account for:

- default
- hover
- active
- focus-visible
- disabled
- loading (when applicable)
- error (when applicable)

## 12. Motion and Animation

Implemented motion:

- shimmer animation for loading/skeleton states (defined as `@keyframes shimmer` in index.css)
- soft transitions on interactive elements (200ms to 500ms)
- tactile micro-interactions using `scale`
- `focus-visible` outlines for keyboard navigation
- radial gradients for ambient accent atmosphere

Approved but not yet exhaustively implemented:

- soft screen transitions between views

Rules:

- long animations, excessive bounce, or decorative effects that slow the app are not approved
- loading states should use the shimmer keyframe for consistency
- all transitions should respect `prefers-reduced-motion` where feasible

## 13. Accessibility

- minimum WCAG AA contrast (enforced in `accent.ts` for accent-derived colors)
- icon-only buttons require `aria-label`
- keyboard focus must remain visible (`focus-visible` outlines defined in index.css)
- text should not go below 12px except for auxiliary overlines
- destructive actions require confirmation via `ConfirmDialog`
- custom selects must support full keyboard navigation
- all interactive elements must be reachable via Tab

## 14. External Design Inputs

External proposal sources such as UI/UX Pro Max are approved as design inputs.

Rules for adoption:

- compare new ideas against `design-system/MASTER.md` first
- merge reusable accepted ideas into the master before repeating them broadly
- translate external references into Efi-specific language and patterns
- do not let generated systems create a second token set or an unrelated dashboard aesthetic
- prefer proposals that improve calmness, credibility, and day-to-day usability over flashy novelty

## 15. Consistency Rules

- do not mix visible languages inside the same screen
- do not introduce another primary typeface
- do not use multiple modal patterns for the same action category
- the customizable accent color must never break legibility or semantic feedback (accent.ts enforces this)
- desktop and mobile web must preserve the same core product capabilities even when layout changes
- all views must handle loading, empty, and error states consistently using shared primitives
