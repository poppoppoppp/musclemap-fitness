# Exercise Media Sheet Processing Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Add a reusable Sharp-based exercise-sheet processor and generate the 12 `back-001` exercise media assets.

**Architecture:** A JSON batch describes layout, mapping, and output options. A testable ES module validates exercise IDs from the current TypeScript data sources, calculates crop rectangles from actual image metadata, emits Sharp outputs, and logs per-file and batch results.

**Tech Stack:** Node.js ES modules, Sharp, node:test, Playwright, Vite

---

### Task 1: Add failing processor tests

**Files:**
- Create: `scripts/exercise-media/processExerciseSheet.test.mjs`

1. Test proportional crop boundaries on dimensions that are not divisible by the row, column, or stage counts.
2. Test that adjacent stage rectangles share an edge, remain in bounds, and cover each cell exactly.
3. Test that all six configured IDs are discovered from the current exercise dataset.
4. Run `node --test scripts/exercise-media/processExerciseSheet.test.mjs` and confirm it fails because the processor module does not exist.

### Task 2: Implement the reusable processor

**Files:**
- Create: `scripts/exercise-media/processExerciseSheet.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`

1. Install `sharp` as a development dependency and add the parameterized `media:process` command.
2. Export the crop-calculation and exercise-ID discovery functions required by the tests.
3. Add batch/config validation, Sharp processing, create/overwrite detection, per-item continuation, and summary logging.
4. Run the Node tests and confirm they pass.

### Task 3: Add and run `back-001`

**Files:**
- Create: `scripts/exercise-media/batches/back-001.json`
- Create: `public/exercise-media/{exerciseId}/start.webp`
- Create: `public/exercise-media/{exerciseId}/peak.webp`

1. Add the fixed 3×2 mapping, `start`/`peak` order, and 640×800 WebP options.
2. Run `npm run media:process -- scripts/exercise-media/batches/back-001.json`.
3. Confirm the log reports six processed exercises, 12 images, zero skips, and no failures.

### Task 4: Verify output and page mapping

**Files:**
- Modify: `src/tests/exercise-detail-redesign.spec.ts`

1. Add a route loop covering all six exercise IDs and assert the two image `src` values are start then peak.
2. Assert both images load at 640×800 and no fallback placeholder is rendered.
3. Run the focused Playwright spec, the processor Node tests, and `npm run build`.
4. Inspect the final diff and report generated files, mapping, and any crop/order/stretch failures.

