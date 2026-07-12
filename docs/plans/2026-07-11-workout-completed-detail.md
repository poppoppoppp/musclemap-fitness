# Workout Completed Detail Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Make the existing workout history detail route serve as the just-completed result and safe lightweight history editor, while refining active music placement and dark input readability.

**Architecture:** Archive through shared history persistence helpers, navigate with transient router state, and render one detail component with read-only and local-draft edit modes. Reuse the existing muscle SVG with a dark color variant and keep storage schemas unchanged.

**Tech Stack:** React 19, React Router, TypeScript, Tailwind CSS 3, LocalStorage utilities, Playwright.

---

### Task 1: Add failing completed-detail and active regression tests

**Files:**
- Create: `src/tests/workout-completed-detail.spec.ts`
- Modify: `src/tests/active-workout-phase-two.spec.ts`

1. Cover archive navigation, transient completion notice, real stats and muscles, summary formatting, edit CRUD, latest synchronization, missing records, BottomNav, mobile overflow, header mini player, and computed input color.
2. Run both files and verify failures are caused by missing behavior.

### Task 2: Add history persistence and derivation helpers

**Files:**
- Modify: `src/utils/workoutHistory.ts`

1. Add upsert/update/delete and latest synchronization using existing keys.
2. Add valid exercise/set normalization and action-summary helpers.
3. Keep types and stored shapes unchanged.

### Task 3: Navigate archive to existing detail

**Files:**
- Modify: `src/pages/WorkoutLog.tsx`

1. Persist through the history helper.
2. Clear active state and navigate with `justCompleted` router state.
3. Remove the in-memory pseudo-completed state.

### Task 4: Rebuild history detail with edit mode

**Files:**
- Modify: `src/pages/WorkoutLogDetail.tsx`
- Modify: `src/components/workout/WorkoutMuscleMap2D.tsx`
- Modify: `src/components/layout/AppShell.tsx`
- Modify: `src/components/layout/BottomNav.tsx`

1. Build dark header, transient success strip, duration-led stats, muscle card, expandable actions, notes, overview action, edit controls, validation, and record deletion.
2. Add the dark lime muscle-map variant.
3. Make history routes dark and highlight Record navigation.

### Task 5: Move active mini player and fix dark inputs

**Files:**
- Modify: `src/features/workout-log/ActiveWorkoutHeader.tsx`
- Modify: `src/features/workout-log/ActiveWorkoutView.tsx`
- Modify: `src/features/workout-log/WorkoutMiniPlayer.tsx`
- Modify: `src/index.css`

1. Render a compact music summary in the Header and remove the bottom card.
2. Keep dashboard playlist navigation.
3. Add a scoped WebKit-safe light input color for workout dark surfaces.

### Task 6: Full regression and visual QA

1. Update intentional legacy assertions.
2. Run `npm test` and `npm run build`.
3. Inspect read/edit/completed states at 320px and 390px.
