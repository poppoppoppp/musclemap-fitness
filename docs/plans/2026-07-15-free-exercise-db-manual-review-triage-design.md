# Free Exercise DB Manual Review Triage V0.2 Design

## Scope

Process the real set of visible `manual-review` records that have no accepted, forced, or reuse decision and no complete local media. The current report contains 143 `manual-review` records; one already has an accepted override, leaving 142 records in scope. Existing overrides and all formal App media are read-only.

## Chosen approach

Use a deterministic preparation and reporting pipeline around a human-readable, batch-persisted visual review record:

1. Select the eligible records from `matches.json` and validate the exclusion rules.
2. Cache the first three candidates' pinned start/peak images outside the project under `D:\AI\FreeExerciseDB-cache\manual-review`.
3. Generate contact sheets in batches of eight exercises, with candidate images and matching/conflict metadata.
4. Record each visually inspected decision in the progress JSON after every batch.
5. Validate the progress conservatively and derive proposal, summary, upgraded review page, and final-check page.

The proposal is advisory only. It never mutates `manual-overrides.json` and never publishes files under `public/exercise-media`.

## Data and decision rules

Each progress entry records the decision, selected source, visual and metadata evidence, differences, risks, alternatives, reviewer mode, contact sheet, batch, and timestamp. `proposed-accepted` and `proposed-forced` require `codex-visual-review`, a selected candidate, decoded start/peak images, and no hard conflict. Metadata-only records can only be rejected or unresolved. Reuse additionally requires a valid base exercise and an explicit shared-image risk.

All 142 entries must resolve to exactly one proposal bucket. When visual evidence is weak, the result is `unresolved`; coverage is never optimized at the expense of action fidelity.

## Cache and image safety

Candidate URLs must match the commit already embedded in `matches.json`. Downloads use finite retries, timeouts, temporary files, atomic rename, content checks, Sharp decode, and cache reuse. The cache is review-only. Contact sheets are project report artifacts and do not affect App media resolution.

## Review interfaces

The existing review page gains proposal import/display and proposal filters without changing formal decision storage. Importing a proposal populates a separate advisory state only. The final-check page defaults to proposed accepted/forced/reuse records, embeds the selected candidate images, supports keyboard navigation and local user decisions, and exports a separate review result.

## Verification

Automated tests cover scope selection, immutability, decision validation, progress recovery, proposal totals, cache failures, contact sheets, and review HTML behavior. Execution verification checks 142 processed records, 47 unchanged accepted overrides, 53 untouched complete-media actions, zero formal media writes, readable contact sheets/pages, and a successful production build.
