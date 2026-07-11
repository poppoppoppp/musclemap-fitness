# Active Workout Phase 2 Design

## Scope

Only the active workout state of `/workout-log` is redesigned. The existing overview, archive validation, storage keys, workout types, history, and completed-summary behavior remain unchanged.

## Architecture

- `ActiveWorkoutView` remains the business coordinator and continues calling the existing active-workout utilities.
- Presentational responsibilities are split into a header, workout timer, current exercise editor, compact set table, completed exercise list, and mini player.
- Current exercise is derived without changing storage: prefer the most recently started unfinished exercise, otherwise the first unfinished exercise by order.
- Completed exercises are those with `endedAt`. They render as subdued summaries and can expand to edit their existing data.
- Exercise imagery uses a lightweight neutral fallback because the repository has no thumbnail field or reusable raster exercise image component. The Three.js trajectory viewer is intentionally not embedded in list rows.

## Music

The NetEase playlist, selected track, native audio element, playback position, and controls move into a React context mounted by `AppShell`. This keeps one audio instance alive across route changes and prevents the workout timer from remounting it. The dashboard player and active-workout mini player consume the same state. If an account-scoped audio URL is unavailable, the dashboard can retain the existing official iframe fallback while the mini player degrades safely and never creates a second iframe.

## Responsive and visual system

The active view uses the current homepage and overview source values: `#080a08`, lime-300, white translucent borders, system typography, a `440px` inner content cap, and the existing BottomNav. Only the duration card receives a restrained lime glow. The mini player stays in document flow so it does not cover inputs or BottomNav.

## Testing

Playwright coverage verifies active/overview routing, live timers, set CRUD, notes, exercise completion and expansion, archive/discard, refresh recovery, real and empty music states, persistent audio mounting, 320px overflow, and BottomNav clearance. Build verification remains `npm run build`.
