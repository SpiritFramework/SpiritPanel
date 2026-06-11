# Spirit Panel — Design System

All new and updated UI **must** use `ds-*` classes from `src/design-system.css`.

## Allowed primitives

| Class | Use for |
|-------|---------|
| `ds-page` | Page max-width container |
| `ds-page-header`, `ds-page-title`, `ds-page-description` | Page titles |
| `ds-card`, `ds-card-header`, `ds-card-body` | Grouped content |
| `ds-btn`, `ds-btn--primary/secondary/danger/ghost` | Actions |
| `ds-field`, `ds-label` | Form inputs |
| `ds-table` | Data tables |
| `ds-modal`, `ds-modal-overlay` | Dialogs (or `Modal` / `ConfirmDialog` from `ui.tsx`) |
| `ds-stat-card`, `ds-grid-stats` | Metrics |
| `ds-empty`, `ds-skeleton` | Empty & loading states |
| `ds-alert--error/warning/info` | Banners |
| `ds-icon` | Lucide icons (via `DsIcon` helper) |

## React components

Prefer composing from `components/Layout.tsx` (`Button`, `Card`, `Page`, `Table`) and `components/ui.tsx` (`PageHeader`, `StatCard`, `EmptyState`, `Modal`, `ConfirmDialog`).

## Do not

- Add page-specific CSS files or `adm-*` / `ops-*` class prefixes
- Use raw `accent-bg` / `accent-text` except in nav active states and primary buttons
- Inline brand gradients on page content (use `ds-hero-stripe` for subtle accent)
- Use `console.error` for API failures — surface via `AlertBanner` or toast

## Data fetching

High-traffic pages should use `useAsyncData` from `hooks/useAsyncData.ts` for deduplicated requests.
