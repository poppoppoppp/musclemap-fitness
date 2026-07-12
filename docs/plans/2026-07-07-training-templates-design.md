# Training Templates Design

## Scope

Replace the rendered `/plan-builder` generator with a user-owned training template list and add `/templates/new` for creating empty templates. Preserve the legacy plan-generation utilities and storage key without exposing the questionnaire in either new interface.

## Pages

- `/plan-builder`: dark neon-green template asset page. It reads only saved user templates, provides a `+ 新建模板` action, and shows an honest empty state when none exist. It never seeds Pull Day, Push Day, Leg Day, or exercises.
- `/templates/new`: image-one-inspired form with name, multi-select focus tags, empty exercise state, three add-method entries, save validation, and the existing four-item bottom navigation with “我的” highlighted.

## Data flow

Templates are stored under `musclemap.trainingTemplates.v1`. Creation trims the name, generates an id and timestamps, initializes `items` to `[]`, appends to the current list, then navigates to `/plan-builder` with a saved status. Existing `GeneratedPlan` data remains untouched.

## Interaction boundaries

- Search and the `+` focus chip show development placeholders.
- Muscle-map addition routes to `/three-muscle-selector?mode=template`.
- Exercise-library addition routes to `/exercises?mode=template`.
- Start, edit, drag ordering, and full exercise selection are outside this change.

## Verification

Playwright covers empty state, required content, tag selection, empty-name validation, persistence, user-created list rendering, routing, bottom navigation, and no horizontal overflow at 390x844. Final verification runs `npm run build` and `npm run test:e2e`.
