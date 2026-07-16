# Training Template Closed Loop Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Build a complete reusable training-template workflow with exercise selection, prescription editing, lifecycle actions, safe workout start, and backup recovery.

**Architecture:** Keep `trainingTemplates.ts` as the only template persistence boundary, reuse the existing `ExercisePickerSheet` for search and 2D muscle selection, and map saved template items into the existing `ActiveWorkout` model. The list and editor remain small React route components; backup v4 owns cross-version export/import compatibility.

**Tech Stack:** React 19, React Router 7, TypeScript 5.9, Tailwind CSS, Playwright, browser localStorage

---

### Task 1: Training-template repository and normalization

**Files:**
- Modify: `src/types/trainingTemplate.ts`
- Modify: `src/utils/trainingTemplates.ts`
- Create: `src/tests/training-templates.spec.ts`

**Step 1: Write failing normalization tests**

Add tests that import the desired pure normalization API and prove that valid records survive while malformed templates, malformed items, missing exercises, duplicate exercise ids, invalid set counts, blank repetition ranges, and negative rest values are removed or normalized.

```ts
import { expect, test } from '@playwright/test';
import { normalizeTrainingTemplates } from '../utils/trainingTemplates';

test('normalizes valid templates and drops unsafe records', () => {
  const result = normalizeTrainingTemplates([
    {
      id: 'template-1',
      name: ' 背部训练 ',
      focusTags: ['背部'],
      items: [
        { id: 'item-1', exerciseId: 'lat-pulldown', order: 7, sets: 3, repRange: '8-12', restSeconds: 90 }
      ],
      createdAt: '2026-07-16T00:00:00.000Z',
      updatedAt: '2026-07-16T00:00:00.000Z'
    },
    { id: '', name: '', items: 'broken' }
  ]);

  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({ name: '背部训练', items: [{ order: 0, sets: 3, repRange: '8-12', restSeconds: 90 }] });
});
```

**Step 2: Run the test and verify RED**

Run: `npx playwright test src/tests/training-templates.spec.ts --grep "normalizes valid"`

Expected: FAIL because `normalizeTrainingTemplates` does not exist.

**Step 3: Implement the minimal type and normalizer**

Add a shared editable input type and draft type:

```ts
export type TrainingTemplateInput = Pick<TrainingTemplate, 'name' | 'focusTags' | 'items'>;

export type TrainingTemplateDraft = TrainingTemplateInput & {
  key: string;
  savedAt: string;
};
```

Implement `normalizeTrainingTemplates(value: unknown): TrainingTemplate[]`, reindex accepted items, trim text fields, validate timestamps, and only accept exercise ids that exist in `src/data/exercises.ts`.

**Step 4: Run the normalization test and verify GREEN**

Run: `npx playwright test src/tests/training-templates.spec.ts --grep "normalizes valid"`

Expected: PASS.

**Step 5: Write failing browser-storage CRUD and draft tests**

Cover the wished-for public API through a lightweight test page evaluation:

- `readTrainingTemplates`
- `getTrainingTemplate`
- `createTrainingTemplate`
- `updateTrainingTemplate`
- `duplicateTrainingTemplate`
- `deleteTrainingTemplate`
- `markTrainingTemplateUsed`
- `readTrainingTemplateDraft`
- `writeTrainingTemplateDraft`
- `clearTrainingTemplateDraft`

Verify write failures return `{ ok: false, error: 'storage' }` and do not erase the prior value.

**Step 6: Run the CRUD tests and verify RED**

Run: `npx playwright test src/tests/training-templates.spec.ts --grep "repository|draft"`

Expected: FAIL because the repository APIs are missing.

**Step 7: Implement the minimal repository APIs**

Use `musclemap.trainingTemplates.v1` and one draft key, catch localStorage exceptions at the repository boundary, update timestamps only on successful writes, and return discriminated results.

```ts
export type TrainingTemplateMutationResult =
  | { ok: true; template: TrainingTemplate }
  | { ok: false; error: 'not-found' | 'storage' };
```

Do not add a generic repository abstraction.

**Step 8: Run Task 1 tests**

Run: `npx playwright test src/tests/training-templates.spec.ts`

Expected: PASS.

**Step 9: Commit**

```bash
git add src/types/trainingTemplate.ts src/utils/trainingTemplates.ts src/tests/training-templates.spec.ts
git commit -m "feat: add reliable training template repository"
```

---

### Task 2: Template-to-active-workout mapping

**Files:**
- Modify: `src/types/activeWorkout.ts`
- Modify: `src/utils/activeWorkout.ts`
- Modify: `src/tests/training-templates.spec.ts`

**Step 1: Write a failing mapping test**

```ts
test('creates an active workout from template prescription', () => {
  const workout = createActiveWorkoutFromTemplate(templateFixture, new Date('2026-07-16T08:00:00.000Z'));

  expect(workout.source).toBe('template');
  expect(workout.templateId).toBe(templateFixture.id);
  expect(workout.exercises[0].planned).toEqual({ sets: 3, repRange: '8-12', restSeconds: 90, note: '控制离心' });
  expect(workout.exercises[0].sets).toHaveLength(3);
});
```

**Step 2: Run the mapping test and verify RED**

Run: `npx playwright test src/tests/training-templates.spec.ts --grep "active workout from template"`

Expected: FAIL because the source and mapping function do not exist.

**Step 3: Implement the minimal mapping**

- Add `'template'` to `ActiveWorkoutSource`.
- Add optional `templateId` to `ActiveWorkout`.
- Add `createActiveWorkoutFromTemplate(template, now)` beside `createActiveWorkoutFromPlanDay`.
- Reuse the existing active-set creation conventions.
- Keep plan-day mapping unchanged.

**Step 4: Run mapping and active-workout regression tests**

Run: `npx playwright test src/tests/training-templates.spec.ts src/tests/active-workout-phase-two.spec.ts src/tests/workout-log-overview.spec.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/types/activeWorkout.ts src/utils/activeWorkout.ts src/tests/training-templates.spec.ts
git commit -m "feat: map templates into active workouts"
```

---

### Task 3: Reuse the exercise picker in template context

**Files:**
- Modify: `src/components/workout/ExercisePickerSheet.tsx`
- Modify: `src/tests/exercise-picker.spec.ts`
- Modify: `src/tests/training-templates.spec.ts`

**Step 1: Write failing picker-context tests**

Add a template-editor test that opens the picker and asserts:

- title and description use template language
- ordinary search and category controls remain available
- 2D muscle mode remains available
- posture mode is absent
- duplicate feedback says `该动作已在模板中`

Add an existing-workout regression assertion that the default picker still exposes posture mode and current-workout copy.

**Step 2: Run the picker tests and verify RED**

Run: `npx playwright test src/tests/training-templates.spec.ts src/tests/exercise-picker.spec.ts --grep "template context|accessible exercise picker"`

Expected: template-context test FAIL because the picker cannot be configured.

**Step 3: Add minimal generic picker props**

```ts
type ExercisePickerSheetProps = {
  open: boolean;
  existingExerciseIds: Set<string>;
  onAddExercise: (exerciseId: string) => boolean;
  onAddPostureProtocol: (protocolId: string, selectedExerciseIds?: string[]) => boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  duplicateMessage?: string;
  showPosture?: boolean;
  // keep existing initial posture props
};
```

Defaults must preserve the active-workout picker exactly. When `showPosture` is false, do not render or enter posture mode.

**Step 4: Run picker tests and verify GREEN**

Run: `npx playwright test src/tests/exercise-picker.spec.ts src/tests/training-templates.spec.ts --grep "picker|template context"`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/workout/ExercisePickerSheet.tsx src/tests/exercise-picker.spec.ts src/tests/training-templates.spec.ts
git commit -m "feat: reuse exercise picker for templates"
```

---

### Task 4: Shared create and edit template experience

**Files:**
- Create: `src/features/training-templates/TrainingTemplateEditor.tsx`
- Create: `src/pages/EditTrainingTemplate.tsx`
- Modify: `src/pages/NewTrainingTemplate.tsx`
- Modify: `src/app/router.tsx`
- Modify: `src/tests/training-templates.spec.ts`

**Step 1: Write failing create-flow tests**

At 390x844, verify:

- saving with blank name shows an inline error
- saving with no exercises shows an inline error
- adding an exercise through the picker creates an editable row with defaults `3`, `8-12`, and `90`
- editing prescription, note, order, and deletion updates the draft
- successful save persists the real item list and returns to `/plan-builder`

**Step 2: Run create-flow tests and verify RED**

Run: `npx playwright test src/tests/training-templates.spec.ts --grep "creates a usable template"`

Expected: FAIL because the current page only saves an empty template.

**Step 3: Implement the minimal shared editor**

Build one editor component that accepts:

```ts
type TrainingTemplateEditorProps = {
  mode: 'create' | 'edit';
  templateId?: string;
};
```

Use the generalized picker with `showPosture={false}`. Add exercises with `crypto.randomUUID()`, current array length as `order`, and approved defaults. Use buttons for move up/down rather than drag and drop.

Keep one compact editor surface and one bottom-safe save action. Reuse the current focus tags and dark product shell, but remove the redundant three-entry add-method grid.

**Step 4: Run create-flow tests and verify GREEN**

Run: `npx playwright test src/tests/training-templates.spec.ts --grep "creates a usable template"`

Expected: PASS.

**Step 5: Write failing draft and edit tests**

Verify:

- refresh restores a new-template draft
- save clears the draft
- edit route loads an existing template
- refresh restores unsaved edit changes
- saving updates `updatedAt`
- missing ids show a safe return state

**Step 6: Run draft/edit tests and verify RED**

Run: `npx playwright test src/tests/training-templates.spec.ts --grep "draft|edits an existing|missing template"`

Expected: FAIL because edit and draft recovery are missing.

**Step 7: Implement draft recovery and edit route**

- Register `/templates/:templateId/edit`.
- Wrap the shared editor in `NewTrainingTemplate` and `EditTrainingTemplate`.
- Save draft changes after state updates without mutating the saved template.
- Clear the matching draft after a successful mutation.
- Do not overwrite a saved template when draft persistence fails; show a storage message.

**Step 8: Run Task 4 and routing regression tests**

Run: `npx playwright test src/tests/training-templates.spec.ts src/tests/user-flow.spec.ts --grep "template"`

Expected: PASS after replacing obsolete empty-template expectations.

**Step 9: Commit**

```bash
git add src/features/training-templates/TrainingTemplateEditor.tsx src/pages/EditTrainingTemplate.tsx src/pages/NewTrainingTemplate.tsx src/app/router.tsx src/tests/training-templates.spec.ts src/tests/user-flow.spec.ts
git commit -m "feat: build training template editor"
```

---

### Task 5: Template list lifecycle and safe start

**Files:**
- Modify: `src/pages/PlanBuilder.tsx`
- Modify: `src/tests/training-templates.spec.ts`

**Step 1: Write failing list lifecycle tests**

Verify a populated card shows:

- exercise count and total planned sets
- focus tags and last-used state
- `开始训练` and `编辑`
- duplicate creates a named copy with a new id
- delete requires a second explicit confirmation and removes only that template

**Step 2: Run list tests and verify RED**

Run: `npx playwright test src/tests/training-templates.spec.ts --grep "template list|duplicates|deletes"`

Expected: FAIL because cards are static.

**Step 3: Implement lifecycle actions**

Read templates into component state so successful mutations re-render immediately. Use repository APIs only; do not write localStorage directly from the page.

Use inline confirmation on the target card instead of a global modal. Preserve accessible button names and 44px minimum targets.

**Step 4: Run lifecycle tests and verify GREEN**

Run: `npx playwright test src/tests/training-templates.spec.ts --grep "template list|duplicates|deletes"`

Expected: PASS.

**Step 5: Write failing workout-start tests**

Test both approved paths:

1. No active workout: create and persist an active workout, update `lastUsedAt`, navigate to `/workout-log`, and render the planned sets.
2. Existing active workout: keep its id and exercises unchanged, navigate to `/workout-log`, and do not update the template usage timestamp.

**Step 6: Run start tests and verify RED**

Run: `npx playwright test src/tests/training-templates.spec.ts --grep "starts template|preserves active"`

Expected: FAIL because start actions are missing.

**Step 7: Implement safe start**

Use `readActiveWorkout`, `createActiveWorkoutFromTemplate`, `writeActiveWorkout`, and `markTrainingTemplateUsed`. Check for an active workout before creating or mutating anything.

**Step 8: Run start and workout regressions**

Run: `npx playwright test src/tests/training-templates.spec.ts src/tests/workout-log-overview.spec.ts src/tests/active-workout-phase-two.spec.ts`

Expected: PASS.

**Step 9: Commit**

```bash
git add src/pages/PlanBuilder.tsx src/tests/training-templates.spec.ts
git commit -m "feat: add template lifecycle and workout start"
```

---

### Task 6: Backup v4 with training templates

**Files:**
- Modify: `src/types/backup.ts`
- Modify: `src/utils/backup.ts`
- Modify: `src/pages/DataManagement.tsx`
- Modify: `src/tests/user-flow.spec.ts`
- Modify: `src/tests/training-templates.spec.ts`

**Step 1: Write failing backup v4 tests**

Verify:

- current export version is 4
- export data contains normalized `trainingTemplates`
- summary contains `trainingTemplateCount`
- version 4 validation rejects damaged template data
- versions 1 to 3 import with `trainingTemplates: []`
- applying backup v4 writes the template storage key
- the data-management summary renders template counts

**Step 2: Run backup tests and verify RED**

Run: `npx playwright test src/tests/training-templates.spec.ts src/tests/user-flow.spec.ts --grep "backup v4|backup.*template"`

Expected: FAIL because backup version 3 has no template field.

**Step 3: Implement backup v4 minimally**

- Add `trainingTemplates` to `MuscleMapBackupData`.
- Add `trainingTemplateCount` to `BackupSummary`.
- Extend `MuscleMapBackupFile.exportVersion` to include 4.
- Read normalized templates in `readCurrentBackupData`.
- Normalize version 4 template input during validation.
- Default older versions to an empty template list.
- Write templates during `applyBackupData`.
- Update the import and current-data summaries in `DataManagement`.

Do not change the behavior of active-workout exclusion.

**Step 4: Run backup tests and verify GREEN**

Run: `npx playwright test src/tests/training-templates.spec.ts src/tests/user-flow.spec.ts --grep "backup"`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/types/backup.ts src/utils/backup.ts src/pages/DataManagement.tsx src/tests/user-flow.spec.ts src/tests/training-templates.spec.ts
git commit -m "feat: include templates in backup v4"
```

---

### Task 7: Responsive, accessibility, and final verification

**Files:**
- Modify only files required by failing checks
- Update: `docs/plans/task.md`

**Step 1: Add the final mobile and keyboard assertions**

At 390x844 and 320x700, verify:

- no horizontal overflow on list, new, edit, and picker states
- sticky save and card actions clear the floating bottom navigation
- focus returns to `添加动作` after the picker closes
- all editor controls are reachable by keyboard
- errors use alert semantics and save success uses status semantics

**Step 2: Run mobile tests and verify RED or existing coverage**

Run: `npx playwright test src/tests/training-templates.spec.ts --grep "mobile|keyboard|focus"`

Expected: FAIL for any unimplemented layout or focus requirement. If a new assertion passes immediately, confirm it covers a real new state before keeping it.

**Step 3: Make only the minimal UI fixes**

Adjust spacing, bottom padding, focus restoration, or semantic attributes only where the tests demonstrate a problem. Do not redesign unrelated pages.

**Step 4: Run focused feature verification**

Run: `npx playwright test src/tests/training-templates.spec.ts src/tests/exercise-picker.spec.ts src/tests/workout-log-overview.spec.ts`

Expected: all tests PASS.

**Step 5: Run build verification**

Run: `npm run build`

Expected: exit 0. Record the existing main-chunk warning separately if it remains.

**Step 6: Run the full suite**

Run: `npm test`

Expected: all feature tests PASS. Compare any remaining failure against the documented baseline failure in `exercise-detail-redesign.spec.ts:72`; do not claim a clean full suite if it remains.

**Step 7: Perform browser visual QA**

Start the local app, inspect empty list, populated list, create editor, edit editor, picker list mode, picker 2D mode, inline errors, delete confirmation, active-workout redirect, and backup summary at 390x844. Save screenshots and reject any capture that is loading, cropped, or shows the wrong state.

**Step 8: Update the task tracker**

Mark the training-template closed-loop rows complete in `docs/plans/task.md` only after verification evidence exists.

**Step 9: Commit**

```bash
git add src docs/plans/task.md
git commit -m "test: verify training template closed loop"
```

---

## Execution Notes

- Use `@test-driven-development` for every production behavior.
- Use `@systematic-debugging` for unexpected failures.
- Use `@verification-before-completion` before any completion claim.
- Preserve unrelated dirty files and the documented baseline failure.
- Do not upgrade dependencies or address `npm audit` findings in this feature branch.
