# Growth Data Loop Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Replace growth-page prototype data with real local records and complete training, body-metric, and progress-photo CRUD workflows.

**Architecture:** Workout logs remain the training source of truth, body metrics use a backward-compatible localStorage repository, and photo metadata/Blobs use a transactional IndexedDB repository. React pages consume repository APIs and pure derivation functions through explicit refresh callbacks rather than writing storage directly.

**Tech Stack:** React 19, TypeScript, React Router, Tailwind CSS, Playwright, localStorage, IndexedDB

---

### Task 1: Define weight semantics and real growth derivation

**Files:**
- Modify: `src/types/exercise.ts`
- Modify: `src/data/exercises.ts`
- Modify: `src/data/exerciseCatalog/createCatalogExercise.ts`
- Modify: `src/data/exerciseCatalog/*.ts`
- Modify: `src/types/growth.ts`
- Rewrite: `src/utils/growthMetrics.ts`
- Delete production use: `src/data/growthMockData.ts`
- Test: `src/tests/growth-metrics.spec.ts`

**Steps:**
1. Write failing tests for explicit weight types, range filtering, previous periods, real action discovery, nearest-body-weight matching, tie-breaking, and 0/1/2+ point states.
2. Run `npx playwright test src/tests/growth-metrics.spec.ts` and confirm failures are caused by missing behavior.
3. Add normalized exercise weight types and pure derivation functions.
4. Remove all production strength/body/photo fallbacks.
5. Re-run the focused tests and commit.

### Task 2: Add body metric repository and compatibility migration

**Files:**
- Modify: `src/types/body.ts`
- Replace: `src/utils/bodySnapshots.ts`
- Create: `src/repositories/bodyMetricRepository.ts`
- Modify: `src/types/backup.ts`
- Modify: `src/utils/backup.ts`
- Test: `src/tests/body-metric-repository.spec.ts`

**Steps:**
1. Write failing tests for legacy normalization, validation, same-day upsert, edit, delete, and ordering.
2. Run the tests and verify RED.
3. Implement repository methods with backward-compatible key handling.
4. Upgrade backup validation while continuing to accept v1/v2 exports.
5. Re-run focused backup and repository tests and commit.

### Task 3: Add IndexedDB photo repository

**Files:**
- Create: `src/types/progressPhoto.ts`
- Create: `src/repositories/progressPhotoRepository.ts`
- Test: `src/tests/progress-photo-repository.spec.ts`

**Steps:**
1. Write failing CRUD, grouping, update, delete, and single-category tests using browser IndexedDB.
2. Verify RED.
3. Implement database open/upgrade and transactional metadata/blob operations.
4. Add clear typed storage errors and first-save notice preference.
5. Verify GREEN and commit.

### Task 4: Build reusable snap sheet behavior

**Files:**
- Create: `src/components/ui/SnapBottomSheet.tsx`
- Create: `src/components/ui/ConfirmDialog.tsx`
- Test: `src/tests/growth-sheets.spec.ts`

**Steps:**
1. Write failing UI tests for opening, backdrop close, dragging between snap points, dirty confirmation, focus expansion, and visible fixed footer.
2. Verify RED.
3. Implement pointer-driven sheet, focus management, viewport handling, scrolling content, and safe-area footer.
4. Re-run at 390×844 and commit.

### Task 5: Complete body metric UI and history

**Files:**
- Rewrite: `src/features/growth/BodyMetricsCard.tsx`
- Create: `src/features/growth/BodyMetricSheet.tsx`
- Create: `src/features/growth/MeasurementHelp.tsx`
- Create: `src/pages/BodyMetricHistoryPage.tsx`
- Modify: `src/features/growth/BodyChangesSection.tsx`
- Modify: `src/pages/GrowthPage.tsx`
- Modify: `src/app/router.tsx`
- Test: `src/tests/body-metric-flow.spec.ts`

**Steps:**
1. Write failing tests for empty state, validation, same-day merge, immediate refresh, month grouping, edit, and delete.
2. Verify RED.
3. Implement the form sheet, real-only chart states, history groups, action menu, and confirmation flow.
4. Verify focused tests and commit.

### Task 6: Complete progress photo UI, management, and comparison

**Files:**
- Rewrite: `src/features/growth/ProgressPhotosCard.tsx`
- Create: `src/features/growth/ProgressPhotoSheet.tsx`
- Create: `src/features/growth/PhotoCategoryPicker.tsx`
- Create: `src/features/growth/PhotoCaptureGuide.tsx`
- Create: `src/pages/ProgressPhotoGalleryPage.tsx`
- Create: `src/pages/ProgressPhotoComparePage.tsx`
- Create: `src/components/progress-photo/LocalPhoto.tsx`
- Modify: `src/app/router.tsx`
- Test: `src/tests/progress-photo-flow.spec.ts`

**Steps:**
1. Write failing tests for empty state, single category, save, local-only notice, date grouping, filtering, edit, delete, detail, and two-photo comparison.
2. Verify RED.
3. Implement file metadata extraction, mapped 2D selection, sheet form, gallery, detail, actions, and comparison.
4. Verify focused tests at 390×844 and commit.

### Task 7: Integrate real training cards and remove fake entries

**Files:**
- Rewrite: `src/features/growth/OverviewCard.tsx`
- Rewrite: `src/features/growth/StrengthTrendCard.tsx`
- Rewrite: `src/features/growth/TrainingDistributionCard.tsx`
- Modify: `src/features/growth/TrainingGrowthSection.tsx`
- Modify: `src/features/growth/GrowthReplayCard.tsx`
- Delete: `src/data/growthMockData.ts`
- Test: `src/tests/growth-page.spec.ts`

**Steps:**
1. Add failing tests for no production mock values, real action selector contents, range recalculation, distribution details, and replay explanation.
2. Verify RED.
3. Implement real-only states and functional details/explanation sheets.
4. Audit every click affordance and remove any remaining fake controls.
5. Verify focused tests and commit.

### Task 8: Full verification and visual QA

**Files:**
- Update only when verification reveals an in-scope defect.

**Steps:**
1. Run `npm run build`.
2. Run all new focused Playwright specs.
3. Run `npm test`.
4. Run `git diff --check`.
5. Capture 390×844 screenshots for empty growth, populated growth, body sheet, body history, photo sheet, gallery, comparison, and distribution details.
6. Confirm no unrelated user files were modified and no push/deployment occurred.
