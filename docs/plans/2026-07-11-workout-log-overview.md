# Workout Log Overview Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Build a real-data pre-workout overview while preserving active workout storage and editing behavior.

**Architecture:** Keep `WorkoutLog.tsx` as the state orchestrator, move current active UI into a feature component, and derive overview data through pure helpers. Use an in-page bottom sheet for workout source selection and preserve all existing LocalStorage keys and schemas.

**Tech Stack:** React 19, TypeScript, React Router, Tailwind CSS 3, Playwright.

---

### Task 1: Define overview derivation behavior

**Files:**
- Create: `src/utils/workoutOverview.ts`
- Test: `src/tests/user-flow.spec.ts`

1. Add Playwright scenarios with real local workout logs for weekly dates, totals, newest workout, representative exercise cap, and trend fallback.
2. Run the focused Playwright scenarios and confirm they fail because the overview does not exist.
3. Implement pure local-week, summary, representative-set, and weight-trend helpers.
4. Keep malformed dates, missing durations, incomplete sets, unknown exercises, and zero denominators safe.

### Task 2: Build the overview components

**Files:**
- Create: `src/features/workout-log/WorkoutLogOverview.tsx`
- Create: `src/features/workout-log/WeeklyWorkoutSummaryCard.tsx`
- Create: `src/features/workout-log/RecentWorkoutCard.tsx`
- Create: `src/features/workout-log/WorkoutProgressCard.tsx`
- Create: `src/features/workout-log/StartWorkoutSheet.tsx`
- Modify: `src/tests/user-flow.spec.ts`

1. Add failing assertions for the header, no-logo rule, empty states, dynamic card content, start button, and 320px overflow.
2. Render mobile-first dark cards using the homepage lime, surface, border, focus, and spacing vocabulary.
3. Add the semantic SVG trend chart without a chart dependency.
4. Add the start-source sheet with free training, valid plan days, recent exercises, and the existing muscle-selector route.

### Task 3: Separate and preserve active workout UI

**Files:**
- Create: `src/features/workout-log/ActiveWorkoutView.tsx`
- Modify: `src/pages/WorkoutLog.tsx`
- Modify: `src/components/layout/AppShell.tsx`
- Modify: `src/tests/user-flow.spec.ts`

1. Add failing mode assertions: overview without active workout and active view without overview.
2. Move existing active editor JSX and timer helpers into `ActiveWorkoutView` while preserving callbacks and test IDs.
3. Make `WorkoutLog.tsx` select `active`, `completed`, or `overview` from real state priority.
4. After successful archive, retain the archived log in temporary state as the completed extension point, then dismiss it to the overview for this iteration.
5. Add `/workout-log` to the homepage dark shell routes.

### Task 4: Verify regressions and mobile layout

**Files:**
- Modify only files required by failures caused by this feature.

1. Run focused workout-log Playwright tests.
2. Run `npm run test:e2e` and confirm all tests pass.
3. Run `npm run build` and confirm TypeScript and Vite build successfully.
4. Inspect the route at 320px and 390px, including the sheet and active view, and confirm no horizontal overflow or BottomNav overlap.
