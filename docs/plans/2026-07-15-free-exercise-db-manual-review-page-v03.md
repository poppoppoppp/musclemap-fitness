# Free Exercise DB Manual Review Page V0.3 Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Generate a stable local manual-review page containing all 142 records while preserving the existing 72 Codex proposals as advisory data only.

**Architecture:** A pure TypeScript page model and export merger are covered by focused tests. A builder materializes deduplicated local candidate assets, writes the static page and proposal, and a built-in Node server plus PowerShell launcher serves the project on the fixed port.

**Tech Stack:** TypeScript, Node.js built-ins, static HTML/CSS/JavaScript, Node test runner, PowerShell.

---

### Task 1: Test the page model and export invariants

**Files:**
- Create: `scripts/exercise-media/free-exercise-db/manualReviewPage.test.mts`
- Create: `scripts/exercise-media/free-exercise-db/manualReviewPage.ts`

1. Write failing tests for 142 total records, advisory proposal separation, 72/70 grouping, and confidence sorting.
2. Write failing tests that formal exports preserve base accepted entries, keep final decisions mutually exclusive, and exclude skipped records.
3. Implement the minimal model and merge functions and rerun the focused tests.

### Task 2: Test and implement review-only local assets

**Files:**
- Modify: `scripts/exercise-media/free-exercise-db/manualReviewPage.test.mts`
- Modify: `scripts/exercise-media/free-exercise-db/manualReviewPage.ts`

1. Write a failing test for one unique source pair, hard-link/copy reporting, and no image transformation.
2. Implement asset materialization from the existing cache only.
3. Verify duplicate source IDs create only one asset pair.

### Task 3: Test and implement the static page

**Files:**
- Modify: `scripts/exercise-media/free-exercise-db/manualReviewPage.test.mts`
- Modify: `scripts/exercise-media/free-exercise-db/manualReviewPage.ts`

1. Write failing checks for localStorage, all required actions, filters, shortcuts, local image paths, proposal confirmation, and both exports.
2. Implement the standalone page with embedded model and formal override base.
3. Parse the inline JavaScript with Node to verify syntax.

### Task 4: Add builder and fixed-port server

**Files:**
- Create: `scripts/exercise-media/free-exercise-db/buildManualReviewPage.mts`
- Create: `scripts/exercise-media/free-exercise-db/manualReviewServer.mjs`
- Create: `scripts/exercise-media/free-exercise-db/startManualReviewServer.ps1`
- Modify: `package.json`

1. Implement the builder with read-only input snapshots and report-only outputs.
2. Implement the fixed-port server and launcher with explicit port-in-use failure.
3. Run `npm run media:free-db:build-manual-review-page`.

### Task 5: Lightweight acceptance checks

1. Run focused V0.3 tests only.
2. Verify 142/72/70 counts, 47 embedded accepted entries, local asset manifest, and unchanged formal files.
3. Use the existing fixed-port server to verify the page and a candidate image return HTTP 200.
4. Do not run browser automation, visual analysis, or `npm run build`.

No commit, push, or deployment step is included because the user explicitly prohibited them.
