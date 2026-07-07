# Training Entry Homepage Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Replace the muscle-map-led homepage with a mobile-first dark training entry page backed by existing workout and plan data.

**Architecture:** Keep `Dashboard` as the data orchestration layer and split the four homepage decisions into focused dashboard components. Derive display-only progress from existing local records, isolate dark styling to the homepage, and preserve all training and plan persistence APIs.

**Tech Stack:** React 19, TypeScript, React Router, Tailwind CSS, Vite, Playwright

---

### Task 1: Lock homepage behavior with tests

**Files:**
- Modify: `src/tests/user-flow.spec.ts`

1. Add a populated-state test that seeds a generated plan and workout log, visits `/`, and asserts the start card, stored workout metrics, plan data, and music empty state.
2. Add an empty-state test that clears homepage storage and asserts honest workout, plan, and music placeholders.
3. Add interaction assertions for start training, latest workout detail, plan continuation, import notice, and the four navigation destinations.
4. Add a 390px viewport assertion for no horizontal overflow and content ending above the fixed navigation.
5. Run `npm run test:e2e -- --grep "training entry homepage"`; expect failure before implementation.

### Task 2: Implement derived homepage data

**Files:**
- Create: `src/utils/dashboard.ts`
- Modify: `src/pages/Dashboard.tsx`
- Test: `src/tests/user-flow.spec.ts`

1. Add pure helpers for latest-workout title/metrics and plan completion/next-day derivation.
2. Use existing `estimateWorkoutCalories`, `formatDuration`, `countValidSets`, and exercise data instead of inventing values.
3. Keep active-workout creation and plan-day creation delegated to `activeWorkout.ts`.
4. Run the focused Playwright test and TypeScript build.

### Task 3: Build the training-entry card hierarchy

**Files:**
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/components/dashboard/DashboardPrimaryAction.tsx`
- Modify: `src/components/dashboard/DashboardRecentWorkoutCard.tsx`
- Modify: `src/components/dashboard/DashboardRecentPlanCard.tsx`

1. Replace the muscle hero with a CSS-only start card using a large touch target and active-workout continuation state.
2. Render latest workout values from props and an explicit no-history state.
3. Render current plan progress and next day from derived data; render a plan-selection state when absent.
4. Keep links pointed only at existing routes.
5. Run focused tests and `npm run build`.

### Task 4: Add the music preparation component

**Files:**
- Create: `src/components/dashboard/DashboardMusicPlayer.tsx`
- Modify: `src/pages/Dashboard.tsx`

1. Define a minimal optional `MusicTrack` view model local to the component.
2. Render disabled transport controls and the specified empty copy when no track exists.
3. Implement a local accessible notice for the reserved NetEase playlist import action.
4. Do not persist fake tracks or add playback dependencies.
5. Run focused tests.

### Task 5: Apply homepage-only navigation and visual styling

**Files:**
- Modify: `src/components/layout/BottomNav.tsx`
- Modify: `src/components/layout/AppShell.tsx` only if safe-area spacing requires it
- Modify: `src/index.css` only for reusable homepage tokens or reduced-motion behavior

1. Change tabs to 首页, 训练, 记录, 我的 using existing routes.
2. Use `useLocation` to apply dark glass styling only on `/`.
3. Preserve safe-area padding and ensure homepage content has sufficient bottom clearance.
4. Verify other routes retain their existing shell and remain reachable.

### Task 6: Verify and clean up

**Files:**
- Delete only dashboard files made obsolete by this change if they have no remaining imports.
- Modify: `docs/plans/task.md`

1. Run `npm run build`; expect exit code 0.
2. Run `npm run test:e2e`; expect all tests to pass.
3. Use the browser at 390x844 to inspect focus hierarchy, empty and populated states, horizontal overflow, and navigation overlap.
4. Review `git diff` and remove only imports/components made unused by this homepage change.
5. Update the task tracker with verified results.
