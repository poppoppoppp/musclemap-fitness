# Active Workout Phase 2 Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Rebuild the mobile active-workout surface as a compact black-and-lime training tool while preserving existing workout and music behavior.

**Architecture:** Keep `ActiveWorkoutView` as the business boundary, derive current/completed presentation state from the existing model, and split timer-sensitive UI from a persistent AppShell-level music provider. Reuse all active-workout utilities and storage formats.

**Tech Stack:** React 19, TypeScript, React Router, Tailwind CSS 3, Playwright, native HTML audio.

---

### Task 1: Lock active-workout behavior with failing tests

**Files:**
- Create: `src/tests/active-workout-phase-two.spec.ts`

1. Add tests for the approved hierarchy, derived current exercise, compact set editing, completed summaries, add/delete behavior, empty and real music states, persistent audio mount, and mobile overflow.
2. Run `npx playwright test src/tests/active-workout-phase-two.spec.ts`.
3. Confirm failures are caused by the missing phase-two UI.

### Task 2: Create persistent music state

**Files:**
- Create: `src/features/music/MusicPlayerContext.tsx`
- Modify: `src/components/layout/AppShell.tsx`
- Modify: `src/components/dashboard/DashboardMusicPlayer.tsx`

1. Move playlist fetching, track selection, audio URL resolution, playback state, progress, previous/next, and the native audio element into a provider.
2. Mount the provider once in `AppShell`.
3. Convert the dashboard player into a consumer while preserving playlist import, iframe fallback, binding links, and existing test ids.
4. Run music and phase-two Playwright tests.

### Task 3: Build the active-workout component hierarchy

**Files:**
- Modify: `src/features/workout-log/ActiveWorkoutView.tsx`
- Create: `src/features/workout-log/ActiveWorkoutHeader.tsx`
- Create: `src/features/workout-log/WorkoutTimerCard.tsx`
- Create: `src/features/workout-log/CurrentExerciseCard.tsx`
- Create: `src/features/workout-log/WorkoutSetTable.tsx`
- Create: `src/features/workout-log/CompletedExercisesList.tsx`
- Create: `src/features/workout-log/WorkoutMiniPlayer.tsx`
- Modify: `src/components/layout/AppShell.tsx`

1. Add the dark active shell, header actions, live duration card, and derived current exercise.
2. Replace per-set cards with a compact table while retaining every existing input and deletion test id.
3. Add planned details, notes, delete actions, completed summaries, expansion, and the existing manual exercise source.
4. Add the shared-state mini player in normal flow.
5. Run the phase-two tests until green.

### Task 4: Update affected legacy tests

**Files:**
- Modify: `src/tests/user-flow.spec.ts`
- Modify: `src/tests/workout-log-overview.spec.ts`

1. Update assertions that intentionally depended on the old active layout.
2. Preserve assertions for storage keys, validation, archive, refresh recovery, notes, set CRUD, and discard confirmation.
3. Run the affected Playwright files.

### Task 5: Full verification and visual QA

**Files:**
- Modify only if verification exposes a scoped defect.

1. Run `npm test`.
2. Run `npm run build`.
3. Inspect the active page at 320px and 390px, including long names, many sets, empty workout, completed exercises, and mini-player clearance.
4. Confirm no storage or type schema changed and review the final diff for unrelated edits.
