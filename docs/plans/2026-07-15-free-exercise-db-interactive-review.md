# Free Exercise DB Interactive Review Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Build a self-contained interactive review page whose exported decisions are safely consumed by the existing Free Exercise DB matcher.

**Architecture:** Add a tested override normalization/validation boundary, extend match records with explicit human decisions, then replace the generated review page with a localStorage-backed single-record workbench. Keep all review UI outside the production App.

**Tech Stack:** TypeScript, Node test runner, generated HTML/CSS/vanilla JavaScript, localStorage, Blob downloads.

---

### Task 1: Versioned manual override model

**Files:**
- Create: `scripts/exercise-media/free-exercise-db/manualOverrides.ts`
- Modify: `scripts/exercise-media/free-exercise-db/types.ts`
- Test: `scripts/exercise-media/free-exercise-db/buildMatchReport.test.mts`

1. Add failing tests for legacy input, final-decision mutual exclusion, multiple rejected IDs, invalid exercise/source warnings, and reuse/notes.
2. Run `npm run test:media:free-db` and confirm the new tests fail because the parser does not exist.
3. Implement a version-1 normalizer and reference validator with deterministic precedence and non-fatal warnings.
4. Run the focused test command and confirm green.

### Task 2: Apply human decisions to matching

**Files:**
- Modify: `scripts/exercise-media/free-exercise-db/matcher.ts`
- Modify: `scripts/exercise-media/free-exercise-db/buildMatchReport.mts`
- Modify: `scripts/exercise-media/free-exercise-db/reportWriters.ts`
- Test: `scripts/exercise-media/free-exercise-db/buildMatchReport.test.mts`

1. Add failing tests proving rejected candidates cannot remain best, forced candidates win without exact classification, reuse and notes appear in match records, and rejected candidates remain report-visible.
2. Run tests and verify RED.
3. Implement the minimal match-record fields and CLI warning flow.
4. Run tests and verify GREEN; review for compatibility with empty legacy overrides.

### Task 3: Interactive generated review workbench

**Files:**
- Modify: `scripts/exercise-media/free-exercise-db/reviewPage.ts`
- Modify: `scripts/exercise-media/free-exercise-db/reportWriters.ts`
- Test: `scripts/exercise-media/free-exercise-db/buildMatchReport.test.mts`

1. Add failing generation tests for the storage key, default exact/high filters, actions, import/export, summary export, keyboard shortcuts and reuse form.
2. Run tests and verify RED.
3. Implement the single-record UI, state transitions, persistence, filters, navigation, candidate selection, import/export and failure-safe images.
4. Run tests and verify GREEN; perform spec and code-quality self-review.

### Task 4: Regenerate and verify end to end

**Files:**
- Regenerate: `reports/exercise-media/free-exercise-db/*`
- Update: `docs/plans/task.md`

1. Run `npm run test:media:free-db`.
2. Run `npm run media:free-db:report` and confirm exact + high-confidence remains 47 with an empty legacy override file.
3. Run `npm run build`.
4. Open the generated page through localhost and verify default count, actions, refresh persistence, rejected-candidate switching, shortcuts, downloads and import equivalence.
5. Clear the test localStorage key and confirm `manual-overrides.json` was not modified.
6. Confirm no files were added under `public/exercise-media` and no image library was downloaded.
