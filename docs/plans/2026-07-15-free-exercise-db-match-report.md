# Free Exercise DB Match Report Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Build and run a deterministic, conservative Free Exercise DB coverage and matching report for every exercise currently visible in MuscleMap Fitness.

**Architecture:** A TypeScript CLI imports the App's runtime exercise exports through `tsx`, downloads only the official combined JSON to an external cache, scores candidates with explicit maps and hard-conflict gates, then writes audit-ready JSON, CSV, Markdown, and a standalone review page. Tests exercise the pure normalization, scoring, tiering, runtime collection, report invariants, cache fallback, and deterministic-output paths.

**Tech Stack:** TypeScript, tsx, Node.js test runner, HTML/CSS/vanilla JavaScript, Playwright, Vite

---

### Task 1: Runtime data and matching contracts

**Files:**
- Create: `scripts/exercise-media/free-exercise-db/buildMatchReport.test.mts`
- Create: `scripts/exercise-media/free-exercise-db/types.ts`

1. Write failing tests for normalization, media status, runtime-visible ID uniqueness, and hard equipment/laterality/posture conflicts.
2. Run the focused Node tests and confirm failure because implementation modules do not exist.
3. Add the minimum shared types needed by tests and implementation.

### Task 2: Maps, scoring, and manual overrides

**Files:**
- Create: `scripts/exercise-media/free-exercise-db/aliases.ts`
- Create: `scripts/exercise-media/free-exercise-db/equipmentMap.ts`
- Create: `scripts/exercise-media/free-exercise-db/muscleMap.ts`
- Create: `scripts/exercise-media/free-exercise-db/matcher.ts`
- Create: `scripts/exercise-media/free-exercise-db/manual-overrides.json`

1. Implement name normalization and explicit alias lookup.
2. Implement equipment and muscle compatibility maps.
3. Implement component scores, hard conflicts, candidate margin, tier rules, and empty manual overrides.
4. Run focused tests until green.

### Task 3: Source cache and runtime collection

**Files:**
- Create: `scripts/exercise-media/free-exercise-db/sourceCache.ts`
- Create: `scripts/exercise-media/free-exercise-db/runtimeExercises.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

1. Install `tsx` as a development dependency and add `media:free-db:report` plus a focused test command.
2. Import the final runtime exercise collection and visible posture protocol steps without parsing TypeScript text.
3. Download only `dist/exercises.json`, write external cache metadata, compute SHA-256, and support explicit cache fallback.
4. Test network-failure fallback and runtime collection completeness.

### Task 4: Report generation and review page

**Files:**
- Create: `scripts/exercise-media/free-exercise-db/buildMatchReport.mts`
- Create: `scripts/exercise-media/free-exercise-db/reportWriters.ts`
- Create: `scripts/exercise-media/free-exercise-db/reviewPage.ts`
- Create: `reports/exercise-media/free-exercise-db/*`

1. Generate one complete match record per visible exercise and conservative reuse groups.
2. Write summary JSON, match JSON, UTF-8 BOM CSV, Chinese Markdown summaries, unmatched categories, and reuse groups.
3. Generate a self-contained read-only review page with filters, candidate images, score details, conflict notes, and recommended actions.
4. Run `npm run media:free-db:report` twice and confirm stable analytical outputs.

### Task 5: Validation and final QA

**Files:**
- Modify: `scripts/exercise-media/free-exercise-db/buildMatchReport.test.mts`

1. Verify unique IDs, tier totals, source IDs, two-image rules, hard-conflict blocking, already-covered exclusions, and source/cache metadata.
2. Verify CSV BOM and required report fields.
3. Open `review.html` in a browser, exercise filters at desktop and narrow widths, and confirm no console or layout errors.
4. Run existing exercise-media processor tests and `npm run build`.
5. Inspect the final diff, report matching risks, and do not commit, push, deploy, download images, or modify App data/UI.
