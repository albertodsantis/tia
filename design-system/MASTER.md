# Efi - Master Design System

## 1. Purpose

This document is the single design authority for Efi.

It defines the canonical visual system, interaction tone, and adoption rules for any UI work created by humans, Codex, or external design-assist tools such as UI/UX Pro Max.

If another design-oriented source proposes a conflicting rule, this file wins until it is explicitly updated.

## 2. Scope and Precedence

This file governs:

- brand direction
- visual tokens
- component behavior
- layout principles
- motion and accessibility expectations
- the workflow for adopting external UI proposals

Precedence order:

1. `design-system/MASTER.md`
2. `FRONTEND_GUIDELINES.md`
3. implementation details in `apps/web`
4. exploratory external references, prompts, screenshots, or generated ideas

## 3. Product Context

Efi is a Spanish-first micro SaaS CRM for content creators and creator operators.

The product must feel:

- operational, not decorative
- clean, focused, and credible
- mobile-first in hierarchy, but fully usable as a desktop workspace
- compact enough for daily work without looking dense or hostile

Visible product copy should remain in Spanish unless there is a product-specific reason not to.

## 4. Core Design Principles

Mandatory principles:

- desktop and mobile web must feel like the same product, not two separate designs
- interfaces should reduce chrome and keep the working area prominent
- rounded surfaces and calm contrast are preferred over sharp enterprise styling
- cards should be used when they add structure, not by default
- the system should look polished from day one without becoming visually noisy
- hierarchy must come from spacing, type, grouping, and contrast before decoration
- accent color is customizable, but legibility and semantic clarity are never negotiable

## 5. Brand Direction

Approved identity direction: `Clean Creator Console`

Visual thesis:

- a focused creator-operations workspace with clean surfaces, restrained contrast, and a highly usable daily-work rhythm

Approved visual direction:

- clean workspace SaaS
- neutral surfaces with clear hierarchy
- subtle accent gradients in app framing
- strong readability
- compact headers inside content, not oversized page heroes
- operational calm over dashboard spectacle
- polished restraint over decorative flourish

Material direction:

- low-noise surfaces with clean separation
- blurred or translucent treatment only when readability stays excellent
- thin borders, diffused shadows, and tonal grouping before heavy card framing
- panels should feel layered, not boxed

Composition direction:

- primary workspace first
- navigation should feel quiet and supportive
- secondary context should be present but not visually louder than the task surface
- avoid KPI mosaics as the main identity signal
- prefer grouped rows, sections, split layouts, and list rhythm before adding more cards

Tone direction:

- composed
- modern
- premium without luxury theatrics
- creator-friendly without becoming playful or juvenile
- light mode: clean and inviting
- dark mode: neutral and clean (no warm/earthy tint, minimal background tinting)

Disallowed drift:

- adding a second primary design language
- switching to a hard-cornered corporate dashboard look
- introducing a heavy component framework with its own visual identity
- using external inspiration as direct canon without translating it to Efi
- turning routine app views into marketing-style hero compositions
- using dense card grids as the default product language

## 6. Canonical Tokens

All values below are taken directly from `apps/web/src/index.css`. Any change to tokens must be reflected in both this file and the CSS source.

### 6.1 Color Foundations

Light mode (`:root`):

| Token | Value |
|---|---|
| `--surface-app` | `#f6f3ee` |
| `--surface-shell` | `rgba(255, 253, 249, 0.88)` |
| `--surface-card` | `rgba(255, 253, 249, 0.84)` |
| `--surface-card-strong` | `rgba(255, 252, 246, 0.96)` |
| `--surface-muted` | `rgba(242, 238, 232, 0.84)` |
| `--surface-overlay` | `rgba(255, 250, 243, 0.72)` |
| `--text-primary` | `#201a17` |
| `--text-secondary` | `#6b625c` |
| `--line-soft` | `rgba(96, 78, 66, 0.12)` |
| `--line-strong` | `rgba(96, 78, 66, 0.18)` |

Dark mode (`.dark`):

| Token | Value |
|---|---|
| `--surface-app` | `#111114` |
| `--surface-shell` | `rgba(18, 18, 22, 0.9)` |
| `--surface-card` | `rgba(26, 26, 31, 0.84)` |
| `--surface-card-strong` | `rgba(32, 32, 37, 0.96)` |
| `--surface-muted` | `rgba(28, 28, 33, 0.78)` |
| `--surface-overlay` | `rgba(18, 18, 22, 0.68)` |
| `--text-primary` | `#ededf0` |
| `--text-secondary` | `#a1a1ab` |
| `--line-soft` | `rgba(237, 237, 240, 0.1)` |
| `--line-strong` | `rgba(237, 237, 240, 0.16)` |

Note: border variables are named `--line-soft` and `--line-strong` in the implementation, not `--border-*`.

Semantic colors (used directly via Tailwind classes, not as CSS variables):

- `success`: emerald palette (`emerald-50`, `emerald-600`, dark: `emerald-500/15`, `emerald-300`)
- `warning`: amber palette (`amber-50`, `amber-600`, dark: `amber-500/15`, `amber-300`)
- `danger`: rose palette (`rose-50`, `rose-600`, dark: `rose-500/15`, `rose-300`)
- `info`: sky palette (`sky-50`, `sky-600`, dark: `sky-500/15`, `sky-300`)

### 6.2 Shadows

Light mode:

| Token | Value |
|---|---|
| `--shadow-soft` | `0 20px 50px -34px rgba(59, 43, 34, 0.2)` |
| `--shadow-medium` | `0 28px 70px -40px rgba(59, 43, 34, 0.28)` |
| `--shadow-floating` | `0 24px 48px -24px rgba(59, 43, 34, 0.22)` |

Dark mode:

| Token | Value |
|---|---|
| `--shadow-soft` | `0 20px 50px -34px rgba(0, 0, 0, 0.5)` |
| `--shadow-medium` | `0 28px 70px -40px rgba(0, 0, 0, 0.58)` |
| `--shadow-floating` | `0 24px 48px -24px rgba(0, 0, 0, 0.44)` |

Note: shadows use warm brown tones (`rgba(59, 43, 34, ...)`) in light mode and pure black in dark mode. Large negative spread values keep them soft and tightly scoped.

### 6.3 Accent System

Implementation: `apps/web/src/lib/accent.ts`

Default accent: `#C96F5B` (Arcilla)

The accent system generates 6 CSS variables from a single hex input via `getAccentCssVariables(hex)`:

| Variable | Derivation |
|---|---|
| `--accent-color` | The raw hex value |
| `--accent-foreground` | White (`#ffffff`) or dark slate (`#0f172a`), chosen by WCAG contrast ratio |
| `--accent-soft` | Hex at `0.12` alpha |
| `--accent-soft-strong` | Hex at `0.18` alpha |
| `--accent-border` | Hex at `0.22` alpha |
| `--accent-glow` | Hex at `0.30` alpha |

Foreground selection logic (`getAccessibleAccentForeground`):

- computes relative luminance of the accent color
- compares WCAG contrast ratio against `#0f172a` (dark slate) and `#ffffff` (white)
- picks whichever foreground yields the higher contrast ratio

Palette (25 colors, user-selectable in Settings):

| Name | Hex |
|---|---|
| Arcilla | `#C96F5B` |
| Terracota | `#C65D4B` |
| Cobre | `#B86A45` |
| Eucalipto | `#5D8D7B` |
| Salvia | `#6F8A74` |
| Violeta | `#8B5CF6` |
| Indigo | `#6366F1` |
| Azul | `#2563EB` |
| Cielo | `#0EA5E9` |
| Turquesa | `#06B6D4` |
| Menta | `#14B8A6` |
| Esmeralda | `#10B981` |
| Verde | `#22C55E` |
| Lima | `#84CC16` |
| Limon | `#A3E635` |
| Amarillo | `#EAB308` |
| Ambar | `#F59E0B` |
| Naranja | `#FC4C00` |
| Coral | `#FB7185` |
| Rojo | `#EF4444` |
| Cereza | `#E11D48` |
| Rosa | `#EC4899` |
| Fucsia | `#D946EF` |
| Pizarra | `#475569` |
| Grafito | `#334155` |

Accent rules:

- the user may change the accent color at any time from Settings
- every accent variant must preserve AA contrast on light and dark surfaces
- foreground color is computed automatically via WCAG luminance, never hardcoded
- semantic states (success, warning, danger, info) must remain visually distinct from accent states
- accent should feel intentional and clean, not neon or candy-like

### 6.4 Typography

Primary typeface (from `--font-primary`):

```
-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"
```

Mono typeface (from `--font-mono`):

```
"Geist Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace
```

Weight tokens:

| Token | Value |
|---|---|
| `--font-weight-regular` | `400` |
| `--font-weight-medium` | `500` |
| `--font-weight-semibold` | `600` |
| `--font-weight-bold` | `700` |
| `--font-weight-extrabold` | `800` |
| `--font-weight-black` | `900` |

Base body font size: `13px`

Observed type scale (from component implementations):

| Usage | Size | Weight | Notes |
|---|---|---|---|
| Page title (ScreenHeader h1) | `1.95rem` | `800` (extrabold) | tight tracking |
| Section title (ModalPanel h2) | `1.5rem` / `text-2xl` | `800` (extrabold) | tight tracking |
| Desktop tab header | `1.5rem` | `700` (bold) | tight tracking |
| Mobile tab header | `text-lg` | `700` (bold) | tight tracking |
| Metric value | `text-2xl` | `800` (extrabold) | tight tracking |
| Body / labels | `text-sm` (14px) | `700` (bold) | standard |
| Descriptions | `text-sm` (14px) | `400` (regular) | `leading-6` |
| Captions / helper text | `text-xs` (12px) | `500`-`600` | `leading-5` |
| Eyebrow / overline | `11px` | `700` (bold) | `tracking-[0.18em]`-`[0.2em]`, uppercase |
| Badge text | `11px` | `700` (bold) | `tracking-[0.12em]`, uppercase |
| Bottom nav labels | `10px` | `700` (bold) | `tracking-wide` |

Typography behavior:

- headlines should feel calm and assured, not loud or startup-generic
- interface labels should rely on weight and spacing instead of color noise
- avoid overly geometric or futuristic display treatments
- antialiasing is enabled globally (`-webkit-font-smoothing: antialiased`)

### 6.5 Spacing

Approved spacing system:

- base unit: `4px`
- primary scale: `4 / 8 / 12 / 16 / 20 / 24 / 32`
- desktop content padding: `32px` (px-8)
- mobile content padding: `16px` (px-4)
- primary gap between cards: `16px`
- mobile safe-area bottom padding: `env(safe-area-inset-bottom)`

### 6.6 Radius

Observed radii (from component implementations):

| Usage | Value |
|---|---|
| SurfaceCard | `1.05rem` (~17px) |
| ModalPanel | `1.35rem` (~22px) on desktop, `1.5rem` (24px) top on mobile sheet |
| Desktop shell | `2rem` (32px) |
| Bottom nav bar | `1.45rem` (~23px) |
| Sidebar nav items | `1.1rem` (~18px) |
| Button | `0.95rem` (~15px) |
| IconButton | `0.75rem` (12px, `rounded-xl`) |
| Badge | `0.8rem` (~13px) |
| Settings row | `1rem` (16px) |
| Dropdown menu | `1rem` (16px) |
| Pill / full-round | `9999px` |
| Icon containers | `0.75rem`-`1rem` (12px-16px) |

### 6.7 Background Treatment

The app body uses a layered radial gradient background (not a flat color):

Light mode:
```css
background-image:
  radial-gradient(circle at top right, color-mix(in srgb, var(--accent-color) 14%, transparent) 0%, transparent 34%),
  radial-gradient(circle at bottom left, rgba(114, 151, 140, 0.12) 0%, transparent 30%),
  linear-gradient(180deg, color-mix(in srgb, var(--surface-app) 82%, white) 0%, var(--surface-app) 100%);
```

Dark mode:
```css
background-image:
  radial-gradient(circle at top right, color-mix(in srgb, var(--accent-color) 6%, transparent) 0%, transparent 28%),
  radial-gradient(circle at bottom left, rgba(99, 110, 140, 0.04) 0%, transparent 24%),
  linear-gradient(180deg, color-mix(in srgb, var(--surface-app) 94%, black) 0%, var(--surface-app) 100%);
```

Dark mode background tinting is kept minimal (6% accent vs 14% in light) to maintain a neutral, clean feel.

## 7. Canonical Layout Rules

### 7.1 Responsive Breakpoint

Single breakpoint: `1024px` (Tailwind `lg:`).

- below `1024px`: mobile layout
- `1024px` and above: desktop layout

### 7.2 Desktop Layout

- outer shell: `100dvh` height, `1rem` (16px) padding on all sides
- shell container: rounded `2rem`, bordered, uses `--surface-shell` background with `--shadow-medium`
- two-column CSS grid: sidebar `clamp(250px, 18vw, 300px)` + flexible main area
- sidebar: sticky, scrollable, contains profile avatar/name + vertical nav list
- sidebar is separated from main by a left border on main
- main area: independently scrollable (`overflow-y: auto`), custom scroll key handling (PageUp/Down, Home/End)
- main content padding: `px-8 py-5`

### 7.3 Mobile Layout

- full-width content area with `--surface-card` background
- fixed bottom navigation bar: 5 tabs, rounded `1.45rem`, positioned with safe-area insets
- bottom nav uses `--surface-card-strong` background with `--shadow-floating` and `backdrop-blur-2xl`
- content bottom padding accounts for bottom nav height + safe area
- safe-area-aware top padding on header

### 7.4 General Layout Rules

- section headers belong inside the scrollable content, not fixed at top
- tab header (label + description) is rendered in the main content area, not in nav
- avoid hero-sized page intros for routine product views
- reduce redundant summary blocks when the workspace itself is the main value
- routine app screens should feel like a console, not a marketing page
- the main column should carry the visual weight
- secondary regions should support scanning, not fragment the interface
- when deciding between another card and a cleaner layout, prefer the cleaner layout
- wheel events on desktop sidebar are forwarded to main content when sidebar cannot scroll

## 8. Canonical Components

### 8.1 Shared Primitives (`apps/web/src/components/ui.tsx`)

#### `cx(...classes)`

Conditional class name utility. Filters falsy values and joins with spaces.

#### `SurfaceCard`

Base card container rendered as `<section>`.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `tone` | `'default' \| 'muted' \| 'inset'` | `'default'` | Controls background and shadow |
| `className` | `string` | - | Additional classes |

Tone details:
- `default`: `--surface-card` bg, `--shadow-soft`, `--line-soft` border
- `muted`: `--surface-muted` bg, `--shadow-soft`, `--line-soft` border
- `inset`: `--surface-card-strong` bg, custom tight shadow, `--line-soft` border

All tones: `rounded-[1.05rem]`, `backdrop-blur-xl`, 300ms color transition.

#### `ScreenHeader`

Page-level header with eyebrow, title, description, and action slot.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `eyebrow` | `string` | - | 11px bold uppercase overline |
| `title` | `string` | required | 1.95rem extrabold h1 |
| `description` | `string` | - | sm text, max-w-xl |
| `actions` | `ReactNode` | - | Right-aligned action buttons |
| `mobileOnly` | `boolean` | `false` | Hides on `lg:` when true |

#### `MetricCard`

KPI display card using `SurfaceCard tone="inset"`.

| Prop | Type | Notes |
|---|---|---|
| `icon` | `React.ElementType` | required, displayed in tinted container |
| `label` | `string` | required, 11px uppercase overline |
| `value` | `string` | required, text-2xl extrabold |
| `helper` | `string` | optional subtext |
| `accentColor` | `string` | required, tints icon background |

#### `StatusBadge`

Inline status indicator.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `tone` | `'neutral' \| 'accent' \| 'success' \| 'warning' \| 'danger' \| 'info'` | `'neutral'` | 6 tones |
| `className` | `string` | - | Additional classes |

Styling: `rounded-[0.8rem]`, 11px bold uppercase, `tracking-[0.12em]`, `px-3 py-1`. Accent tone uses inline styles with `--accent-soft-strong` bg and `--accent-color` text.

#### `EmptyState`

Placeholder for empty lists/sections. Uses `SurfaceCard tone="muted"` with `border-dashed`.

| Prop | Type | Notes |
|---|---|---|
| `icon` | `React.ElementType` | optional, displayed in bordered container |
| `title` | `string` | required, base bold |
| `description` | `string` | optional, sm text, max-w-sm |
| `action` | `ReactNode` | optional, centered below description |

#### `Button`

Primary action button.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `tone` | `'primary' \| 'secondary' \| 'ghost' \| 'danger'` | `'primary'` | 4 visual variants |
| `accentColor` | `string` | - | Override for primary tone bg |
| `disabled` | `boolean` | - | Reduces opacity, disables pointer |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | HTML button type |
| `form` | `string` | - | Associated form id |

Tone details:
- `primary`: accent bg, accent foreground text, accent glow shadow, transparent border
- `secondary`: `--surface-card-strong` bg, `--text-primary` text, `--line-soft` border
- `ghost`: transparent bg, `--text-secondary` text
- `danger`: rose-50 bg, rose-600 text (dark: rose-500/15 bg, rose-300 text)

Styling: `rounded-[0.95rem]`, `px-4 py-3`, sm bold, `active:scale-[0.98]`.

#### `IconButton`

Icon-only button with accessible label.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `icon` | `React.ElementType` | required | |
| `label` | `string` | required | Used as `aria-label` |
| `tone` | `'primary' \| 'secondary' \| 'ghost' \| 'danger'` | `'secondary'` | Same tones as Button |
| `accentColor` | `string` | - | Override for primary tone |
| `iconSize` | `number` | `18` | Icon pixel size |

Styling: `h-11 w-11`, `rounded-xl`, `active:scale-95`.

#### `ToggleSwitch`

Binary toggle rendered as a visual-only div (controlled externally).

| Prop | Type | Notes |
|---|---|---|
| `checked` | `boolean` | required |
| `accentColor` | `string` | required, sets bg when checked |
| `disabled` | `boolean` | Reduces opacity |

Styling: `h-7 w-14`, `rounded-full`, white knob with shadow.

#### `SettingRow`

Row layout for settings screens with icon, title, description, and trailing action.

| Prop | Type | Notes |
|---|---|---|
| `icon` | `React.ElementType` | required, in 12x12 muted container |
| `title` | `string` | required, sm bold |
| `description` | `string` | optional, xs secondary text |
| `trailing` | `ReactNode` | optional, right-aligned slot |
| `onClick` | `() => void` | optional, makes row a button with hover state |

Styling: `rounded-[1rem]`, `px-5 py-4`.

#### `ModalPanel`

Modal dialog content panel (used inside `OverlayModal`).

| Prop | Type | Default | Notes |
|---|---|---|---|
| `title` | `string` | required | text-2xl extrabold |
| `description` | `string` | - | sm secondary text |
| `onClose` | `() => void` | - | Shows close button when provided |
| `footer` | `ReactNode` | - | Bordered footer slot |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | sm=520px, md=680px, lg=860px |

Features: accent radial gradient overlay at top-left, `max-h-[92dvh]`, scrollable body, header/body/footer sections separated by borders.

### 8.2 Overlay and Dialog Components

#### `OverlayModal` (`components/OverlayModal.tsx`)

Portal-based full-screen overlay. Renders into `document.body` via `createPortal`.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `tone` | `'black' \| 'slate'` | `'black'` | Backdrop opacity variant |
| `onClose` | `() => void` | - | Called on backdrop click |

Features: `backdrop-blur-md`, decorative radial gradient orbs, mobile sheet drag indicator, `z-[120]`. Mobile: children align to bottom. Desktop: children center in viewport.

#### `ConfirmDialog` (`components/ConfirmDialog.tsx`)

Confirmation modal built on `OverlayModal` + `ModalPanel`.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `title` | `string` | required | |
| `description` | `string` | required | |
| `confirmLabel` | `string` | required | |
| `cancelLabel` | `string` | `'Cancelar'` | |
| `onConfirm` | `() => void` | required | |
| `onClose` | `() => void` | required | |
| `isConfirming` | `boolean` | `false` | Shows "Procesando..." state |
| `tone` | `'primary' \| 'danger'` | `'danger'` | Confirm button tone |
| `accentColor` | `string` | - | For primary tone |

### 8.3 Input Components

#### `CustomSelect` (`components/CustomSelect.tsx`)

Keyboard-accessible dropdown select built from scratch (no native select).

| Prop | Type | Notes |
|---|---|---|
| `value` | `string` | required, current selection |
| `onChange` | `(value: string) => void` | required |
| `options` | `{ value: string; label: string }[]` | required |
| `placeholder` | `string` | Default: `'Seleccionar...'` |
| `disabled` | `boolean` | |
| `buttonClassName` | `string` | Additional trigger classes |
| `buttonStyle` | `CSSProperties` | Trigger inline styles |
| `ariaLabel` | `string` | Accessibility label |

Features: click-outside dismissal, chevron rotation animation, `z-[100]` dropdown, `rounded-[1rem]` trigger and menu.

### 8.4 Notification System

#### `Toaster` (`components/Toaster.tsx`)

Event-driven toast notification display. Listens for `efi-toast` custom events on `window`.

Toast types: `success` (emerald), `error` (rose), `info` (blue).

Auto-dismiss after 4 seconds. Manual dismiss via close button. Positioned `fixed bottom-6 right-6`, `z-[200]`.

Toast helper: `apps/web/src/lib/toast.ts` dispatches `efi-toast` events.

### 8.5 AI Assistant

#### `AIAssistant` (`components/AIAssistant.tsx`)

Floating conversational assistant powered by Gemini AI.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `isDesktop` | `boolean` | `false` | Adjusts positioning and trigger style |

Features:
- floating trigger button: desktop shows labeled card, mobile shows icon-only FAB
- expandable chat panel with message history
- voice input via Web Speech API (`es-ES` locale)
- function calling: `get_app_data`, `add_task`, `update_task_status`, `add_partner`, `add_contact`, `update_partner_status`
- only renders when `GEMINI_API_KEY` is configured
- panel has decorative radial gradient orbs and warm gradient backgrounds

### 8.6 Onboarding

#### `OnboardingTour` (`components/OnboardingTour.tsx`)

Guided first-run tour using `react-joyride`.

- different step sequences for desktop vs mobile
- persisted via `localStorage` (`hasSeenOnboardingTour`)
- styled with design system tokens (accent color, surfaces, borders)
- Spanish locale labels
- responsive tooltip sizing: 384px desktop, 320px mobile
- optionally highlights AI assistant button if present

### 8.7 Behavior Expectations

- inputs keep a visible accent-led focus state (2px solid `--accent-color`, 2px offset)
- icon-only buttons require `aria-label`
- badges never rely on color alone (text is always present)
- mobile modals align to bottom (sheet pattern) with drag indicator
- desktop modals center in the viewport
- components should feel soft and precise, not bubbly or toy-like
- default surfaces should be quiet enough that the content and state carry the hierarchy
- text selection uses accent-tinted highlight (`color-mix` at 22%)

## 9. Motion

Motion library: `motion` (Framer Motion successor).

Approved motion:

- durations between `200ms` and `500ms`
- soft transitions between screens and states
- small tactile scale feedback on direct manipulation (`active:scale-95`, `active:scale-[0.98]`)
- loaders and sync states should feel clear, not flashy
- the interface should feel responsive and composed, never dramatic
- page transitions and modal enter/exit animations
- drag-and-drop feedback in pipeline views
- loading shimmer animation (`shimmer` keyframe, 3s infinite)
- toast slide-in animations (`slide-in-from-right-8`, `fade-in`)
- dropdown zoom-in animations (`zoom-in-95`, `fade-in`)

Disallowed motion:

- long decorative animation
- excessive bounce
- motion that makes the app feel slower
- theatrical transitions that make the product feel performative instead of useful

## 10. Accessibility

- minimum WCAG AA contrast
- accent foreground is computed via WCAG luminance comparison, never assumed
- visible keyboard focus ring: `2px solid var(--accent-color)`, `outline-offset: 2px`
- body text should not go below 12px except auxiliary overlines and bottom nav labels (10-11px)
- destructive actions require confirmation via `ConfirmDialog`
- accent personalization must not reduce readability or semantic clarity
- all icon-only buttons use `aria-label`
- modal close buttons use `aria-label` in Spanish ("Cerrar modal", "Cerrar notificacion")
- Speech recognition for AI assistant uses `es-ES` locale
- tap highlight disabled globally (`-webkit-tap-highlight-color: transparent`)

## 11. Z-Index Scale

Observed stacking order:

| Layer | z-index |
|---|---|
| Mobile bottom nav | `90` |
| AI Assistant trigger | `95` |
| AI Assistant backdrop | `100` |
| Custom select dropdown | `100` |
| AI Assistant panel | `110` |
| OverlayModal | `120` |
| Toaster | `200` |
| Joyride onboarding | `10000` |

## 12. Implementation Contract

The frontend implements this master through:

- CSS variables for color, typography, and shadow in `apps/web/src/index.css`
- shared primitives in `apps/web/src/components/ui.tsx`
- accent derivation utilities in `apps/web/src/lib/accent.ts`
- toast dispatch utility in `apps/web/src/lib/toast.ts`
- Tailwind CSS v4 with `@custom-variant dark` for dark mode (class-based, `.dark`)
- `@theme` block mapping `--font-sans` to `--font-primary`

Implementation may evolve, but the visual decisions above should not drift silently.

## 13. External Proposal Intake

UI/UX Pro Max and similar tools are approved as idea generators and consistency enhancers, not as parallel authorities.

When external proposals are used:

- treat them as inputs, not canon
- map their suggestions to Efi's product context
- preserve Spanish-first copy and the current product shape
- merge useful ideas into this file before treating them as reusable rules
- avoid adopting another library's naming, token structure, or style language verbatim unless intentionally approved

## 14. Adoption Workflow For New UI Ideas

When Codex or a teammate uses UI/UX Pro Max:

1. gather the proposal, reference, or generated system
2. compare it against this master
3. keep any idea that improves clarity, hierarchy, conversion, or polish without breaking the current identity
4. translate the accepted idea into Efi-specific language and tokens
5. update this file if the idea becomes reusable system guidance
6. update `FRONTEND_GUIDELINES.md` only with implementation-facing guidance derived from this master

## 15. Current Project Translation

For the current repository, this means:

- the existing frontend already follows the approved rounded, compact workspace direction
- current accent utilities and shared UI primitives are part of the intended system
- future UI/UX Pro Max output should refine layout, hierarchy, calmness, and polish around that base
- external output must not replace the current system with a generic dashboard aesthetic
- the next redesign phase should prioritize shell, surface hierarchy, and component language before decorative brand flourishes
