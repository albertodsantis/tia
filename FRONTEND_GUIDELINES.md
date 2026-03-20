# TIA - Frontend Guidelines

## 1. Purpose

This document defines the visual system and interaction rules for TIA MVP v1. The UI must preserve the soft, rounded, mobile-first identity of the prototype while behaving like a consistent production product.

## 2. Language and Brand Policy

This document is written in English because technical documentation in this repository is standardized for AI-friendly implementation work.

Product rules:

- TIA is designed for a Spanish-speaking audience
- brand tone is Spanish-first
- visible navigation labels, product copy, and screen text should remain in Spanish
- a single screen should not mix English and Spanish labels unless there is a clear product reason

## 3. Design System Lock

Approved design system: `TIA Internal Mobile CRM System`

Technical base:

- Tailwind CSS `4.x`
- CSS tokens for color, typography, radius, and shadow
- `lucide-react` for iconography

Introducing another full UI system such as Material UI or Ant Design is not approved for the MVP.

## 4. Visual Direction

Mandatory visual principles:

- mobile-first appearance inside an app-like shell
- large, soft, highly legible cards
- generous use of rounded corners
- clear contrast between backgrounds, surfaces, and accent
- calm, tactile interactions rather than corporate-looking UI

## 5. Canonical Palette

### 5.1 Light Base

- `bg-app-light`: `#F8FAFC`
- `bg-surface-light`: `#FFFFFF`
- `bg-subtle-light`: `#F8FAFC`
- `text-primary-light`: `#1E293B`
- `text-secondary-light`: `#64748B`
- `border-light`: `#E2E8F0`

### 5.2 Dark Base

- `bg-app-dark`: `#0F172A`
- `bg-surface-dark`: `#1E293B`
- `bg-subtle-dark`: `#334155`
- `text-primary-dark`: `#F8FAFC`
- `text-secondary-dark`: `#94A3B8`
- `border-dark`: `#334155`

### 5.3 Accent

- `accent-default`: `#8B5CF6`
- the user may change the accent color
- the system must preserve AA contrast on both light and dark surfaces

### 5.4 Semantic Colors

- `success`: `#10B981`
- `warning`: `#F59E0B`
- `danger`: `#F43F5E`
- `info`: `#3B82F6`

## 6. Typography

Approved primary typeface:

- `Nunito`

Fallbacks:

- `ui-sans-serif`
- `system-ui`
- `sans-serif`

Typography scale:

- `H1`: 30px, weight 700, tight tracking
- `H2`: 24px, weight 700
- `H3`: 18px, weight 700
- `Body Large`: 15px, weight 500
- `Body`: 14px, weight 500
- `Caption`: 12px, weight 600
- `Label / Overline`: 10px to 11px, weight 700, uppercase, wide tracking

## 7. Spacing and Layout

Approved grid and spacing:

- base unit: `4px`
- primary scale: `4 / 8 / 12 / 16 / 20 / 24 / 32`
- mobile screen padding: `24px`
- primary gap between cards: `16px`

Widths:

- main layout is centered
- mobile shell `max-width`: `448px`
- desktop preserves the centered shell with surrounding breathing room

## 8. Radius and Shadow

Approved radii:

- `radius-sm`: `12px`
- `radius-md`: `16px`
- `radius-lg`: `24px`
- `radius-xl`: `32px`
- `radius-pill`: `9999px`

Approved shadows:

- `shadow-soft`: `0 8px 30px rgba(0,0,0,0.03)`
- `shadow-medium`: `0 20px 60px rgba(0,0,0,0.08)`
- `shadow-floating`: `0 8px 30px rgba(0,0,0,0.12)`

## 9. Canonical Components

### 9.1 App Shell

- persistent mobile shell container
- app background with a subtle accent-based gradient
- fixed bottom navigation

### 9.2 Bottom Navigation

- 5 tabs maximum
- icon-first on mobile
- active state shown through accent color and a visual marker

### 9.3 Cards

- metric card
- task card
- brand card
- contact card
- translucent or blurred surfaces are allowed only if legibility remains strong

### 9.4 Inputs

- minimum touch height of `48px`
- placeholder remains visible but understated
- focus is always visible through an accent-based ring

### 9.5 Buttons

- primary: accent background, white text
- secondary: neutral surface with subtle border
- destructive: danger semantic color treatment
- icon button: minimum `40x40`

### 9.6 Modals and Sheets

- on mobile, open from the bottom
- on desktop, center in the viewport
- explicit close action is always visible

### 9.7 Badges

- use semantic color by state
- never rely on color alone; text is always required

## 10. Component States

Every reusable component must account for:

- default
- hover
- active
- focus-visible
- disabled
- loading when applicable
- error when applicable

## 11. Motion

Approved motion:

- durations between `200ms` and `500ms`
- soft screen transitions
- tactile micro-interactions using `scale`
- clear loaders for sync or save flows

Long animations, excessive bounce, or decorative effects that slow the app are not approved.

## 12. Accessibility

- minimum WCAG AA contrast
- icon-only buttons require `aria-label`
- keyboard focus must remain visible
- text should not go below 12px except for auxiliary overlines
- destructive actions require confirmation

## 13. Minimum Required Component Library

Before continuing with major new features, the app should expose a reusable library containing:

- `ScreenHeader`
- `MetricCard`
- `StatusBadge`
- `TaskCard`
- `PartnerCard`
- `ContactCard`
- `PrimaryButton`
- `IconButton`
- `TextField`
- `SelectField`
- `ToggleSwitch`
- `ModalSheet`
- `SegmentedControl`
- `EmptyState`
- `LoadingState`
- `ErrorState`

## 14. Consistency Rules

- do not mix visible languages inside the same screen
- do not introduce another primary typeface
- do not use multiple modal patterns for the same action category
- the customizable accent color must never break legibility or semantic feedback
