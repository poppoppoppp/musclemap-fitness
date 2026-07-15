# Free Exercise DB Manual Review Page V0.3 Design

## Scope

Build a standalone local review page from the existing 142-record manual-review scope. Preserve the 72 saved Codex proposals exactly, leave the remaining 70 records unreviewed, and keep formal overrides, formal App media, candidate cache, and contact sheets read-only.

## Data flow

The builder reads `matches.json`, `manual-review-triage-progress.json`, and the current formal `manual-overrides.json`. It derives the advisory proposal only from the 72 saved progress records, creates a page model for all 142 eligible records, and embeds the original 47 accepted decisions as the immutable export base. Codex proposals are displayed separately and never initialize user decisions.

## Local assets

For every unique candidate `sourceId`, the builder locates an already cached pair and creates one review-only asset pair under `manual-review-assets/{sourceId}`. It first attempts hard links and falls back to byte-for-byte copies. No remote URL is used, no image is transformed, and no file is written under `public/exercise-media`.

## Review state and export

The page stores only explicit user actions under `musclemap-fitness:free-exercise-db-manual-review:v0.3`. Accepted, forced, and reuse decisions are mutually exclusive; rejected candidates, skipped actions, notes, filters, and position remain separate. Export merges explicit user decisions onto the embedded formal base, excludes skipped records, and preserves all 47 existing accepted entries.

## Server and verification

A small Node static server serves the project root on `127.0.0.1:4174`; the PowerShell launcher refuses to choose another port. Lightweight checks validate model counts, local asset references, JavaScript syntax, export invariants, formal-file immutability, HTTP 200, and one local candidate image response. No visual review, browser click automation, or full App build is performed.
