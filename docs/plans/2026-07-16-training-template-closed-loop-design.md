# Training Template Closed Loop Design

## Goal

Turn the current empty-template shell into a complete reusable training workflow while preserving the existing application shell, exercise catalog, muscle map, active workout, history, and local backup architecture.

## Chosen Approach

Reuse and generalize the existing `ExercisePickerSheet` inside the template editor. It already provides search, category filtering, and the 2D muscle map, so the template flow does not need cross-route selection or duplicate picker code.

Rejected alternatives:

- Keep `?mode=template` across `/exercises` and `/three-muscle-selector`: this requires persistent cross-route drafts and parallel selection behavior in two pages.
- Build a template-only picker: this duplicates existing search, filtering, muscle selection, focus handling, and mobile sheet behavior.

## User Flow

### Template list

`/plan-builder` remains the training-template destination.

- Empty state explains that a saved template needs at least one exercise.
- Each template card shows name, focus tags, exercise count, total planned sets, and last-used status.
- Primary actions are `开始训练` and `编辑`.
- Secondary actions are `复制` and `删除`, with deletion requiring explicit confirmation.
- Creating a template opens `/templates/new`.
- Editing opens `/templates/:templateId/edit`.

### Create and edit

The same editor component serves new and existing templates.

- Name is required.
- A saved template requires at least one exercise.
- Focus tags remain optional and editable.
- `添加动作` opens the reused picker in template context.
- Template context hides posture-protocol selection and uses template-specific copy.
- Search, category filtering, and 2D muscle selection stay available in the picker.
- Adding an exercise uses defaults of 3 sets, `8-12` repetitions, and 90 seconds rest.
- Each exercise row supports sets, repetition range, rest seconds, note, move up, move down, and delete.
- New and edit drafts are saved locally and restored after refresh.
- Saving clears the corresponding draft and returns to the list with a visible success status.

### Start workout

- If an active workout exists, starting a template does not replace or merge it. The user is sent to `/workout-log` to continue the active workout.
- If no active workout exists, the selected template is mapped into a new `ActiveWorkout`, preserving exercise order and planned prescription.
- The template receives a new `lastUsedAt` value.
- The new workout is persisted before navigation to `/workout-log`.

## Architecture

### Template repository

Expand `src/utils/trainingTemplates.ts` into the single persistence boundary:

- normalize unknown stored values
- read and write templates safely
- create, update, duplicate, delete, and mark used
- create and restore editor drafts
- return explicit success or failure results for writes

The repository keeps the existing `musclemap.trainingTemplates.v1` key because the stored shape remains compatible. Invalid records and invalid items are dropped during normalization instead of reaching rendering code.

### Template editor

Create a shared editor page or component used by the new and edit routes. The UI owns only the current editable draft; persistence and normalization remain in the repository.

`ExercisePickerSheet` gains small generic props for context-specific labels, posture visibility, and duplicate messages. Active-workout behavior remains unchanged by default.

### Active workout mapping

Add a focused template-to-active-workout function beside the existing plan-day mapping. It creates planned exercise snapshots and set rows from `TrainingTemplateItem` without coupling the template repository to React.

Extend `ActiveWorkoutSource` with `template` and record the originating template id. Workout history continues to use the existing archive path.

### Backup

Upgrade the backup export version from 3 to 4.

- Add `trainingTemplates` to backup data and summaries.
- Export normalized templates.
- Validate version 4 template data during import.
- Import versions 1 to 3 with an empty template list.
- Apply version 4 templates to local storage.
- Show the template count in export and import summaries.

## Error Handling

- Invalid name and empty exercise list produce inline errors next to the relevant section.
- Invalid prescription values are constrained before save: sets at least 1, non-empty repetition range, rest at least 0.
- Storage exceptions return a user-facing failure and leave the draft intact.
- Missing edit ids show a safe not-found state with a return action.
- Deleted or corrupted exercise ids are excluded during normalization.
- Active workouts are never silently replaced.

## Visual Direction

Keep the existing dark mobile product shell, touch targets, typography, and lime action color to avoid a broader redesign. Reduce unnecessary nesting and decorative outlines in the template editor:

- one editor surface
- compact exercise rows
- one primary action per state
- mobile save action with bottom-safe scroll clearance
- existing focus-ring and reduced-motion conventions

## Testing

Use test-first Playwright coverage for each behavior:

1. Repository normalization and CRUD through browser storage.
2. Create a template with exercises and prescription.
3. Restore a draft after refresh.
4. Edit, reorder, duplicate, and delete templates.
5. Start a template and verify the active workout prescription.
6. Preserve an existing active workout when start is attempted.
7. Export and import backup v4 with templates.
8. Import legacy backup versions with no templates.
9. Verify keyboard focus, 390x844 layout, and bottom-navigation clearance.

## Baseline Note

Before implementation, the full suite produced 169 passing, 14 skipped, and 1 unrelated existing failure in `exercise-detail-redesign.spec.ts` where a prior sheet intercepted the `动作说明` button. The user approved continuing without expanding this task to fix that baseline failure.
