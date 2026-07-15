# Free Exercise DB Manual Review Triage V0.2 Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Visually review and conservatively triage all 142 eligible Free Exercise DB manual-review records without modifying formal overrides or App media.

**Architecture:** A testable TypeScript core selects records, validates decisions, manages cache/progress, and generates proposal artifacts. A CLI prepares pinned candidate images and contact sheets, then derives advisory review pages and summaries from batch-persisted visual decisions.

**Tech Stack:** TypeScript, Node.js, Sharp, static HTML, Node test runner, Playwright.

---

### Task 1: Freeze scope and invariants

**Files:**
- Create: `scripts/exercise-media/free-exercise-db/manualReviewTriage.test.mts`
- Create: `scripts/exercise-media/free-exercise-db/manualReviewTriage.ts`

1. Add failing tests for the exact eligibility rules and exclusion of accepted/covered/non-manual records.
2. Run the focused test and confirm the expected missing-implementation failure.
3. Implement the minimal selector and immutable snapshots.
4. Run the focused test and confirm it passes.

### Task 2: Add safe review cache and contact sheets

**Files:**
- Modify: `scripts/exercise-media/free-exercise-db/manualReviewTriage.test.mts`
- Modify: `scripts/exercise-media/free-exercise-db/manualReviewTriage.ts`

1. Add failing tests for pinned URLs, retries, HTML/decode rejection, atomic cache writes, and cache reuse.
2. Implement review-cache acquisition using the existing curl adapter and Sharp validation.
3. Add failing tests for eight-record batch partitioning and readable contact-sheet output.
4. Implement Sharp/SVG contact-sheet rendering and verify dimensions/decodability.

### Task 3: Add recoverable progress and proposal validation

**Files:**
- Modify: `scripts/exercise-media/free-exercise-db/manualReviewTriage.test.mts`
- Modify: `scripts/exercise-media/free-exercise-db/manualReviewTriage.ts`

1. Add failing tests for batch merges, duplicate prevention, decision bucket totals, and resume behavior.
2. Add failing tests that forbid metadata-only accepted/forced decisions and hard-conflict acceptance.
3. Implement progress normalization, conservative validation, proposal derivation, and summary derivation.
4. Run all focused tests.

### Task 4: Add the preparation/reporting CLI

**Files:**
- Create: `scripts/exercise-media/free-exercise-db/triageManualReview.mts`
- Modify: `package.json`

1. Add a CLI-level failing test or injected integration test for no formal override/media writes.
2. Implement `npm run media:free-db:triage-manual-review` with prepare and finalize modes.
3. Verify it creates only cache and report artifacts and resumes existing progress.

### Task 5: Upgrade advisory review pages

**Files:**
- Modify: `scripts/exercise-media/free-exercise-db/reviewPage.ts`
- Modify: `scripts/exercise-media/free-exercise-db/reportWriters.ts`
- Modify: `scripts/exercise-media/free-exercise-db/buildMatchReport.mts`
- Modify: `scripts/exercise-media/free-exercise-db/manualReviewTriage.test.mts`

1. Add failing string/JavaScript tests for proposal import, proposal filters, advisory display, and no automatic override merge.
2. Implement optional embedded proposal display in the existing review page.
3. Implement the standalone final-check page with confirm/reject/unresolved/export/navigation controls.
4. Verify both pages parse and open.

### Task 6: Execute visual batches

**Files:**
- Create/update: `reports/exercise-media/free-exercise-db/manual-review-triage-progress.json`
- Create: `reports/exercise-media/free-exercise-db/manual-review-contact-sheets/*.webp`

1. Prepare all pinned candidate images and 18 contact sheets of at most eight exercises each.
2. Inspect every sheet at readable resolution and inspect individual cached images when ambiguous.
3. Save one complete decision per exercise after each batch.
4. Prefer unresolved whenever the visual evidence is not decisive.

### Task 7: Generate and verify final advisory artifacts

**Files:**
- Create: `reports/exercise-media/free-exercise-db/manual-review-proposal.json`
- Create: `reports/exercise-media/free-exercise-db/manual-review-triage-summary.json`
- Create: `reports/exercise-media/free-exercise-db/manual-review-triage-summary.md`
- Create: `reports/exercise-media/free-exercise-db/manual-review-final-check.html`
- Regenerate: `reports/exercise-media/free-exercise-db/review.html`

1. Finalize from the complete progress file and validate bucket totals equal 142.
2. Verify all accepted/forced proposals are visual-review records without hard conflicts.
3. Confirm formal overrides and all 53 existing media pairs are unchanged.
4. Run focused tests, existing media tests, relevant Playwright checks, and `npm run build`.
5. Open both review pages and sample contact sheets for final QA.

No commit step is included because the user explicitly prohibited Git commits, pushes, and deployment.
