# Workout Log Overview Design

## Scope

Refactor the workout log route into three mutually exclusive business modes: `overview`, `active`, and `completed`. This iteration fully implements `overview`, preserves the current active-workout editor and archive behavior, and leaves `completed` as a clear state extension point without rendering a completion summary.

## Architecture

- `WorkoutLog.tsx` owns storage-backed page state and selects the page mode.
- `WorkoutLogOverview` renders the pre-workout data center from derived real workout data.
- `ActiveWorkoutView` contains the existing active workout UI and callbacks without changing its storage contract.
- `StartWorkoutSheet` progressively reveals workout sources instead of permanently listing them in the overview.
- `workoutOverview.ts` provides pure, defensive derivation for weekly totals, recent-workout summaries, representative sets, and comparable exercise trends.

The mode priority is active workout first, then an in-memory archived log for the future completed state, then overview. Because this iteration does not render a completed summary, a successful archive dismisses the temporary completed state and refreshes the overview immediately. No persisted schema or key changes are introduced.

## Overview Experience

The route uses the same dark shell, constrained width, lime accent, translucent surfaces, corner radius, focus treatment, and bottom navigation as the current homepage. The header contains only `训练记录` and a calendar/history entry.

The overview contains:

1. A Monday-to-Sunday weekly card with current local dates, training count, duration, valid set count, and semantic completion markers.
2. A recent workout card based on the newest valid log, including a derived muscle or source summary and up to three representative exercises.
3. A recent performance card that selects the most frequently repeated comparable exercise and plots recent maximum valid weights with a small dynamic SVG.
4. A primary `开始记录训练` action that opens a bottom sheet.

The start sheet supports free training, recent plan days when available, a route to the existing muscle selector, and recent exercise shortcuts when valid history exists. Every action reuses existing active-workout creation and persistence helpers.

## Defensive Data Rules

- Week boundaries use local dates and Monday as the first day.
- Invalid dates do not enter weekly totals or trends.
- Missing or invalid durations contribute zero.
- Valid sets reuse `countValidSets` and existing displayability semantics.
- Representative set labels include only finite weight or repetition values.
- Trends compare one metric only: maximum valid weight per workout.
- A trend requires at least two different workout logs with positive comparable weights.
- Zero, missing, or non-finite previous values produce no percentage instead of `NaN` or `Infinity`.
- Unknown exercise IDs fall back to the stored ID without crashing.

## Testing

Playwright coverage will verify mode selection, empty states, real weekly totals and marked dates, newest-log selection, three-exercise cap, insufficient-trend fallback, start action behavior, absence of the MuscleMap logo, preserved active-workout flows, and 320px overflow safety. The final verification commands are `npm run test:e2e` and `npm run build`; the project does not currently define an `npm test` script.
