# Full Posture Dataset Integration Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Import the complete supplied posture dataset into the existing posture browser, exercise detail, active workout snapshot, and history flows without creating a second workout system.

**Architecture:** Add a versioned v0.2 JSON source and typed validation layer. Adapt the existing posture utilities and UI to categories and arbitrary grouped steps, while keeping flat workout exercises and optional snapshot extensions for backward compatibility.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, localStorage repositories, Playwright.

---

### Task 1: Lock the v0.2 schema and validation contract

**Files:**
- Create: `src/data/posture/postureDataset.v0.2.json`
- Create: `src/utils/postureDatasetValidation.ts`
- Modify: `src/types/posture.ts`
- Test: `src/tests/posture-data-validation.spec.ts`

**Steps:**
1. Write failing tests for the exact 12/2/1 counts, four observations, unique IDs, complete references, family relationships, missing dose preservation, safe goals, and legacy snapshot parsing.
2. Run `npx playwright test src/tests/posture-data-validation.spec.ts --project=chromium` and confirm failures are caused by the absent v0.2 schema and validator.
3. Add typed category, family, observation, dose, step, protocol, theory, and guidance structures with optional compatibility fields.
4. Transcribe only supplied content into v0.2, keeping absent values absent and marking source/confidence exactly as specified.
5. Implement `validatePostureDataset(dataset): PostureDatasetValidationIssue[]` and a development-only assertion at the data boundary.
6. Re-run the focused test until green. Do not commit; keep local for user review.

### Task 2: Resolve exercise reuse, families, and legacy IDs

**Files:**
- Modify: `src/utils/postureProtocols.ts`
- Modify: `src/data/exercises.ts`
- Modify: `src/types/exercise.ts`
- Test: `src/tests/posture-data-validation.spec.ts`
- Test: `src/tests/posture-protocols.spec.ts`

**Steps:**
1. Add failing tests proving all 32 `EX_*` IDs resolve, shared actions resolve once, catalog-backed bridge/dead-bug content is reused, and old lowercase posture IDs still resolve.
2. Run the focused tests and confirm the expected resolver failures.
3. Switch the posture import to v0.2 and implement canonical ID, `libraryExerciseId`, `legacyIds`, `familyId`, and `variantOf` resolution.
4. Keep posture-only actions out of the ordinary catalog list while allowing the existing detail page to resolve them.
5. Run focused tests and confirm ordinary catalog cardinality remains unchanged.

### Task 3: Build categories, guidance, grouped steps, and variant selection

**Files:**
- Modify: `src/components/workout/PostureProtocolBrowser.tsx`
- Modify: `src/components/workout/ExercisePickerSheet.tsx`
- Modify: `src/utils/postureProtocols.ts`
- Test: `src/tests/posture-workout-flow.spec.ts`

**Steps:**
1. Write failing Playwright tests for eight category cards and counts, inline guidance, category protocol lists, all `groupLabel` stages, observation styling, optional labels, missing-dose labels, and hidden source claims.
2. Add a failing test requiring an explicit cable/dumbbell choice for `SHOULDER_002`.
3. Run the focused browser tests and verify the old issue-only browser fails them.
4. Replace the internal browser state with categories → protocols → detail, preserving the same sheet, back navigation, scroll restoration, and mobile footer.
5. Render grouped steps from data, distinguish observations, and show dose confidence without promoting low-confidence source values.
6. Implement only the one required variant-family selector and pass its selected exercise ID to the add action.
7. Run focused tests at 320px and 390px until green.

### Task 4: Extend workout snapshots without splitting the training system

**Files:**
- Modify: `src/types/posture.ts`
- Modify: `src/types/activeWorkout.ts`
- Modify: `src/types/workout.ts`
- Modify: `src/utils/activeWorkout.ts`
- Modify: `src/features/workout-log/PostureProtocolGroupCard.tsx`
- Modify: `src/features/workout-log/ActiveWorkoutView.tsx`
- Test: `src/tests/posture-protocols.spec.ts`
- Test: `src/tests/posture-workout-flow.spec.ts`

**Steps:**
1. Write failing tests showing observations are snapshotted but not inserted into flat exercises or completion totals, optional steps are not auto-added, selected variants are respected, and missing dose remains empty.
2. Add failing persistence tests for arbitrary stages, dose overrides, reload, modification state, reorder, deletion, and old v0.1 snapshots.
3. Implement optional step snapshots while retaining existing exercise snapshot fields and instance-ID links.
4. Deep-clone all protocol-specific content, create flat exercises only for included exercise steps, and keep observations in group snapshots.
5. Render group stages and observations while reusing existing exercise edit/complete controls.
6. Run the focused snapshot and flow tests until green.

### Task 5: Support explicit duration logging and history context

**Files:**
- Modify: `src/types/activeWorkout.ts`
- Modify: `src/types/workout.ts`
- Modify: `src/features/workout-log/CurrentExerciseCard.tsx`
- Modify: `src/utils/activeWorkout.ts`
- Modify: `src/pages/ExerciseDetail.tsx`
- Modify: `src/pages/WorkoutLogDetail.tsx`
- Test: `src/tests/posture-protocols.spec.ts`
- Test: `src/tests/posture-workout-flow.spec.ts`

**Steps:**
1. Write failing tests for duration-based set input/archive, missing-dose empty state, ignored observation totals, context-specific doses, and old history rendering.
2. Run the focused tests and verify failures occur in the existing reps-only path.
3. Add optional duration fields to the existing set/log structures and validate a set when it has valid reps or valid duration.
4. Show duration input only for explicitly duration-based posture steps; do not alter ordinary exercise controls.
5. Render stage, observation, dose confidence, limitations, and visual-review status from snapshots in history and detail context.
6. Ensure growth calculations continue to ignore duration-only records and run the focused suite.

### Task 6: Full regression and visual verification

**Files:**
- Modify: `docs/plans/task.md`
- Test: all existing Playwright specs

**Steps:**
1. Run `npx playwright test src/tests/posture-data-validation.spec.ts src/tests/posture-protocols.spec.ts src/tests/posture-workout-flow.spec.ts --project=chromium`.
2. Capture and inspect 390px screenshots for category home, a multi-stage protocol, an observation-heavy protocol, active workout grouping, and history.
3. Run `npm test`; require zero failures and report intentional skips separately.
4. Run `npm run build`; require exit code 0 and report warnings honestly.
5. Run `git diff --check` and review `git status --short` to confirm only scoped local files changed.
6. Update the tracker to completed and provide the requested 15-part acceptance report. Do not commit, push, or deploy.

