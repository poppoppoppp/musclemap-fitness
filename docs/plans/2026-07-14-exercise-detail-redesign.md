# Exercise Detail Redesign Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Rebuild the existing exercise detail route into a mobile-first, data-driven action guide that reuses current workout and sheet flows.

**Architecture:** Extend the existing `Exercise` model with optional detail fields and resolve safe defaults in one helper. Keep the single route, split the page into a small set of focused components, reuse `SnapBottomSheet` and active-workout utilities, and hide the global bottom navigation only on detail routes.

**Tech Stack:** React 19, TypeScript 5.9, React Router 7, Tailwind CSS, Playwright, Vite

**Local-only constraint:** Do not create or switch branches, commit, push, or deploy.

---

### Task 1: Define behavior with failing Playwright tests

**Files:**
- Create: `src/tests/exercise-detail-redesign.spec.ts`

1. Add tests for the exact section order and absence of difficulty, 3D, English hero text, and global bottom navigation.
2. Add tests for image fallback, three cues, troubleshooting cards and all sheet entry points.
3. Add tests for favorite persistence and alternative navigation.
4. Add tests for no-workout, active-not-added, and active-added action states plus record navigation.
5. Add 320px and 390px overflow assertions.
6. Run `npx playwright test src/tests/exercise-detail-redesign.spec.ts` and verify failures are caused by the missing redesign.

### Task 2: Add the detail data contract and safe resolver

**Files:**
- Modify: `src/types/exercise.ts`
- Modify: `src/data/exercises.ts`
- Create: `src/utils/exerciseDetail.ts`
- Test: `src/tests/exercise-detail-redesign.spec.ts`

1. Add typed media, instructions, troubleshooting, laterality and alternative detail fields without `any`.
2. Add the complete `one-arm-dumbbell-row` example data.
3. Add a resolver that derives region, equipment, laterality, media paths, captions, cues, problems and instructions for old exercises.
4. Use stable `exercise.id` for `/exercise-media/<id>/start.webp` and `peak.webp` paths.
5. Run the focused tests and verify data-driven assertions pass.

### Task 3: Add favorite persistence and page components

**Files:**
- Create: `src/utils/exerciseFavorites.ts`
- Create: `src/components/exercise/detail/ExerciseMediaPanel.tsx`
- Create: `src/components/exercise/detail/ExerciseKeyCues.tsx`
- Create: `src/components/exercise/detail/ExerciseTroubleshooting.tsx`
- Create: `src/components/exercise/detail/ExerciseDetailLinks.tsx`
- Create: `src/components/exercise/detail/ExerciseDetailSheets.tsx`
- Create: `src/components/exercise/detail/ExerciseDetailActionBar.tsx`
- Modify: `src/pages/ExerciseDetail.tsx`

1. Implement local favorite ID persistence with safe parsing.
2. Implement the two-stage media card with equal image regions and a silent fallback visual.
3. Implement one-row cues, troubleshooting previews, detail links, and shared sheet content.
4. Rebuild the page header, title tags and fixed action bar while preserving posture context and back targets.
5. Reuse `addExerciseToExistingActiveWorkout`, `startWorkoutWithExercise`, `isExerciseInActiveWorkout`, and existing navigation.
6. Run the focused tests until green, then refactor only duplicated page-local markup.

### Task 4: Hide global navigation and finish responsive styling

**Files:**
- Modify: `src/components/layout/AppShell.tsx`
- Modify: `src/index.css`

1. Detect `/exercises/:exerciseId` in the shell and omit `BottomNav` only there.
2. Apply the dark shell and route-specific bottom padding.
3. Add minimal page-scoped styles for stable media aspect ratios, fallback art, sticky action transition and narrow viewports.
4. Re-run the focused tests at desktop, 390px and 320px.

### Task 5: Verify and visually QA

**Files:**
- Modify only files required to fix regressions introduced by this task.

1. Run `npm run build` and fix all TypeScript or Vite errors.
2. Run `npm test` and fix task-caused regressions.
3. Start the local Vite server and capture 390px, 320px and desktop screenshots of the detail page and representative sheets.
4. Check focus states, touch targets, contrast, safe-area padding, missing-image behavior and no horizontal overflow.
5. Inspect `git diff --check` and `git status --short` for final local-only handoff. Do not stage or commit.
