# Posture Improvement Functional Loop Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Build a local-first posture improvement flow that screens users safely, recommends only eligible protocols, creates one active multi-week plan, starts plan-linked workouts, tracks adherence and feedback, and supports reassessment.

**Architecture:** Add a small posture-plan domain beside the existing posture dataset and workout domain. Keep assessments, plans, and session feedback in a validated localStorage repository; keep exercise execution and historical snapshots in the existing `ActiveWorkout` and `WorkoutLog` models with an optional plan context. Derive schedules and progress from plan rules plus archived workouts instead of pre-generating session rows.

**Tech Stack:** React 19, React Router 7, TypeScript 5.9, localStorage repositories, Playwright tests, Tailwind CSS.

---

### Task 1: Define posture-plan types and safe local repository

**Files:**
- Create: `src/types/posturePlan.ts`
- Create: `src/repositories/posturePlanRepository.ts`
- Test: `src/tests/posture-plan-repository.spec.ts`

**Step 1: Write the failing repository tests**

Cover one behavior per test:

```ts
test('stores one active plan with its assessment', () => {
  const repository = new PosturePlanRepository(localStorage, () => new Date('2026-07-16T08:00:00.000Z'));
  const assessment = repository.saveAssessment(validAssessmentInput);
  const plan = repository.createPlan(validPlanInput(assessment.id));
  expect(repository.getActivePlan()?.id).toBe(plan.id);
});

test('refuses a second active plan', () => {
  repository.createPlan(firstPlanInput);
  expect(repository.tryCreatePlan(secondPlanInput)).toEqual({ ok: false, error: 'active-plan-exists' });
});

test('ignores corrupt records and preserves valid records', () => {
  localStorage.setItem(POSTURE_PLAN_STORAGE_KEY, JSON.stringify([validPlan, { id: 4 }]));
  expect(repository.listPlans()).toEqual([validPlan]);
});

test('saves and restores an assessment draft', () => {
  repository.saveAssessmentDraft(draft);
  expect(repository.readAssessmentDraft()).toEqual(draft);
});
```

**Step 2: Run the test and verify RED**

Run:

```bash
npx playwright test src/tests/posture-plan-repository.spec.ts --project=chromium
```

Expected: FAIL because the types and repository do not exist.

**Step 3: Implement the minimal domain types**

Define:

```ts
export type PosturePlanStatus = 'active' | 'paused' | 'completed';
export type PostureAssessmentKind = 'initial' | 'reassessment';
export type PostureGoal = 'comfort' | 'mobility' | 'training' | 'appearance';
export type PostureRiskFlag = 'numbness' | 'radiating-pain' | 'dizziness' | 'chest-pain' | 'breathing-difficulty' | 'recent-trauma';

export interface PostureAssessment { /* approved design fields */ }
export interface PosturePlan { /* approved design fields */ }
export interface PostureSessionFeedback { /* approved design fields */ }
export interface PostureAssessmentDraft { /* partial assessment fields */ }
```

Use explicit string unions for goal, region, duration band, equipment, weekdays, and risk flags. Keep optional fields optional so old backups and partial drafts remain readable.

**Step 4: Implement the repository**

Use separate versioned keys:

```ts
export const POSTURE_ASSESSMENTS_KEY = 'musclemap.postureAssessments.v1';
export const POSTURE_PLANS_KEY = 'musclemap.posturePlans.v1';
export const POSTURE_FEEDBACK_KEY = 'musclemap.postureFeedback.v1';
export const POSTURE_ASSESSMENT_DRAFT_KEY = 'musclemap.postureAssessmentDraft.v1';
```

The repository must accept `Storage` and `now` dependencies, normalize every record when reading, return typed result unions for expected failures, and never throw for malformed JSON.

**Step 5: Run the repository test and verify GREEN**

Run the Task 1 command. Expected: PASS.

**Step 6: Commit**

```bash
git add src/types/posturePlan.ts src/repositories/posturePlanRepository.ts src/tests/posture-plan-repository.spec.ts
git commit -m "feat: add posture plan repository"
```

### Task 2: Enforce publication eligibility and deterministic recommendations

**Files:**
- Create: `src/utils/posturePlanRules.ts`
- Modify: `src/utils/postureProtocols.ts:39-48`
- Test: `src/tests/posture-plan-rules.spec.ts`
- Modify: `src/tests/posture-protocols.spec.ts:24-74`

**Step 1: Write failing eligibility tests**

```ts
test('blocks limited, low-quality, unsourced, missing-dose, and unresolved-visual protocols', () => {
  expect(getPosturePlanEligibility(cervicalLimited).eligible).toBe(false);
  expect(getPosturePlanEligibility(unsourcedShoulder).reasons).toContain('missing-source');
});

test('keeps secondary protocols out of automatic recommendations', () => {
  expect(getRecommendedPostureProtocols(assessment, postureDataset).map(({ protocol }) => protocol.id))
    .not.toContain('OROFACIAL_001');
});

test('returns at most two deterministic recommendations with reasons', () => {
  const first = getRecommendedPostureProtocols(assessment, postureDataset);
  const second = getRecommendedPostureProtocols(assessment, postureDataset);
  expect(first).toEqual(second);
  expect(first).toHaveLength(Math.min(2, first.length));
  expect(first.every(({ reasons }) => reasons.length > 0)).toBe(true);
});

test('blocks all recommendations when a risk flag is present', () => {
  expect(getPostureRecommendationResult({ ...assessment, riskFlags: ['numbness'] })).toEqual({
    status: 'blocked',
    riskFlags: ['numbness']
  });
});
```

**Step 2: Run the rules test and verify RED**

Run:

```bash
npx playwright test src/tests/posture-plan-rules.spec.ts --project=chromium
```

Expected: FAIL because the rule module does not exist.

**Step 3: Implement plan eligibility**

Add pure functions:

```ts
getPosturePlanEligibility(protocol, dataset): {
  eligible: boolean;
  reasons: PostureEligibilityFailure[];
}

getEligiblePosturePlanProtocols(dataset): PostureProtocol[]
```

Block `secondary`/`internal`, `limited`, `mediumLow`/`low`, absent `sourceUrl`, mandatory steps without executable dose, and mandatory exercises with `visualReviewRequired`. Treat an executable dose as at least one positive sets, reps, reps-per-side, duration, duration range, or hold value.

Do not change `getVisiblePostureProtocols()`: manual browsing remains backward-compatible. Add a separate plan-specific gate.

**Step 4: Implement deterministic recommendation scoring**

Use a small fixed score:

- Matching category/region: +4.
- Matching goal through explicit category mapping: +2.
- Equipment fully available: required; bodyweight counts as available.
- Estimated session duration fits the user limit: +1.
- `core`: eligible as a primary plan; `adjunct`: returned only as supplemental metadata.

Sort by score descending, then protocol ID ascending. Return no more than two core recommendations and user-facing reason codes.

**Step 5: Update the old visibility test**

Keep the test proving all supplied protocols remain manually browseable. Add a separate assertion that only eligible protocols enter plan recommendations, so the new safety gate is not confused with the legacy browser contract.

**Step 6: Run both rule suites and verify GREEN**

```bash
npx playwright test src/tests/posture-plan-rules.spec.ts src/tests/posture-protocols.spec.ts --project=chromium
```

Expected: PASS.

**Step 7: Commit**

```bash
git add src/utils/posturePlanRules.ts src/utils/postureProtocols.ts src/tests/posture-plan-rules.spec.ts src/tests/posture-protocols.spec.ts
git commit -m "feat: gate and recommend posture plans"
```

### Task 3: Derive schedule, today task, and progress

**Files:**
- Modify: `src/utils/posturePlanRules.ts`
- Test: `src/tests/posture-plan-schedule.spec.ts`

**Step 1: Write failing schedule tests**

Cover:

- A selected weekday becomes due in the correct plan week.
- Completed plan-linked logs satisfy due sessions.
- Paused days do not count as missed.
- Future dates do not count as missed.
- The plan completes after its last scheduled week.
- Week indexes use local date keys, not UTC date rollover.

Example:

```ts
test('derives progress from plan-linked workout logs', () => {
  const progress = getPosturePlanProgress(plan, logs, new Date('2026-07-23T09:00:00+08:00'));
  expect(progress).toMatchObject({ completedSessions: 2, dueSessions: 3, missedSessions: 1, weekIndex: 2 });
});
```

**Step 2: Run and verify RED**

```bash
npx playwright test src/tests/posture-plan-schedule.spec.ts --project=chromium
```

Expected: FAIL because schedule helpers are absent.

**Step 3: Implement pure schedule helpers**

Add:

```ts
getPosturePlanOccurrences(plan): Array<{ date: string; weekIndex: number }>;
getPosturePlanProgress(plan, logs, now): PosturePlanProgress;
getPostureTodayTask(plan, logs, now): PostureTodayTask | null;
```

Use the existing local date key convention from `activeWorkout.ts`. Count only archived logs whose `posturePlanContext.planId` matches and whose session feedback is completed. Do not create or persist occurrence rows.

**Step 4: Run and verify GREEN**

Run the Task 3 command. Expected: PASS.

**Step 5: Commit**

```bash
git add src/utils/posturePlanRules.ts src/tests/posture-plan-schedule.spec.ts
git commit -m "feat: derive posture plan progress"
```

### Task 4: Link posture plans to active workouts and archives

**Files:**
- Modify: `src/types/activeWorkout.ts:6-18`
- Modify: `src/types/workout.ts:30-38`
- Modify: `src/utils/activeWorkout.ts:39-185,405-452,567-578`
- Test: `src/tests/posture-plan-workout.spec.ts`
- Modify: `src/tests/posture-protocols.spec.ts`

**Step 1: Write failing workout integration tests**

```ts
test('starts a plan-linked posture workout', () => {
  const workout = startPosturePlanWorkout(plan, protocol, occurrence, now);
  expect(workout.posturePlanContext).toEqual({ planId: plan.id, weekIndex: 1, scheduledDate: occurrence.date });
  expect(workout.postureProtocolGroups).toHaveLength(1);
});

test('appends today task to an existing workout without replacing exercises', () => {
  const next = addPosturePlanTaskToActiveWorkout(existing, plan, occurrence, now);
  expect(next.exercises[0].id).toBe(existing.exercises[0].id);
  expect(next.posturePlanContext?.planId).toBe(plan.id);
});

test('archives posture plan context without making it required for legacy workouts', () => {
  const archived = archiveActiveWorkout(planWorkout, endedAt);
  expect(archived.ok && archived.log.posturePlanContext?.planId).toBe(plan.id);
  expect(normalizeActiveWorkout(legacyWorkout)).not.toBeNull();
});
```

**Step 2: Run and verify RED**

```bash
npx playwright test src/tests/posture-plan-workout.spec.ts --project=chromium
```

Expected: FAIL because plan context and helpers do not exist.

**Step 3: Add optional plan context**

Define the shared `PosturePlanWorkoutContext` in `posturePlan.ts` and reference it from both workout models. Keep it optional in normalization and backup validation.

**Step 4: Implement start/append helpers**

Reuse `addPostureProtocolToActiveWorkout`. Do not create a second exercise model. Reject an unavailable or newly ineligible protocol by returning a typed failure rather than silently starting a workout.

**Step 5: Archive the context**

Copy `posturePlanContext` into the workout log. Keep old logs valid.

**Step 6: Run integration and regression tests**

```bash
npx playwright test src/tests/posture-plan-workout.spec.ts src/tests/posture-protocols.spec.ts src/tests/active-workout-phase-two.spec.ts --project=chromium
```

Expected: PASS.

**Step 7: Commit**

```bash
git add src/types/posturePlan.ts src/types/activeWorkout.ts src/types/workout.ts src/utils/activeWorkout.ts src/tests/posture-plan-workout.spec.ts src/tests/posture-protocols.spec.ts
git commit -m "feat: link posture plans to workouts"
```

### Task 5: Add the Growth route and posture-plan hub

**Files:**
- Create: `src/pages/PosturePlanPage.tsx`
- Create: `src/features/posture-plan/PosturePlanEmptyState.tsx`
- Create: `src/features/posture-plan/PosturePlanDashboard.tsx`
- Modify: `src/app/router.tsx:1-41`
- Modify: `src/pages/GrowthPage.tsx:1-43`
- Modify: `src/features/growth/GrowthTabs.tsx:1-26`
- Modify: `src/types/growth.ts:1`
- Test: `src/tests/posture-plan-flow.spec.ts`

**Step 1: Write the failing navigation test**

```ts
test('opens posture improvement from Growth without adding a bottom navigation item', async ({ page }) => {
  await page.goto('/growth');
  await page.getByRole('tab', { name: '体态改善' }).click();
  await expect(page).toHaveURL('/growth/posture');
  await expect(page.getByRole('heading', { name: '体态改善计划' })).toBeVisible();
  await expect(page.locator('nav').getByRole('link')).toHaveCount(4);
});
```

**Step 2: Run and verify RED**

```bash
npx playwright test src/tests/posture-plan-flow.spec.ts --project=chromium
```

Expected: FAIL because the route and tab do not exist.

**Step 3: Add the route and tab contract**

Add `/growth/posture`, extend `GrowthSection` with `posture`, and make the third tab navigate to the dedicated route. Keep the Growth bottom-nav item active through the existing prefix logic.

**Step 4: Build the hub states**

`PosturePlanPage` reads the repository and renders exactly one of:

- Safe empty state with “开始初筛”.
- Active/paused plan dashboard.
- Completed-plan history summary.

Do not implement animation. Reuse existing dark layout, buttons, form controls, and 44px touch targets.

**Step 5: Run and verify GREEN**

Run the Task 5 command. Expected: PASS.

**Step 6: Commit**

```bash
git add src/pages/PosturePlanPage.tsx src/features/posture-plan/PosturePlanEmptyState.tsx src/features/posture-plan/PosturePlanDashboard.tsx src/app/router.tsx src/pages/GrowthPage.tsx src/features/growth/GrowthTabs.tsx src/types/growth.ts src/tests/posture-plan-flow.spec.ts
git commit -m "feat: add posture plan growth hub"
```

### Task 6: Build assessment, safety blocking, recommendations, and plan creation

**Files:**
- Create: `src/features/posture-plan/PostureAssessmentForm.tsx`
- Create: `src/features/posture-plan/PostureRecommendationList.tsx`
- Modify: `src/pages/PosturePlanPage.tsx`
- Modify: `src/features/posture-plan/PosturePlanDashboard.tsx`
- Test: `src/tests/posture-plan-flow.spec.ts`

**Step 1: Add failing browser tests**

Add separate tests for:

- Completing a safe assessment and receiving no more than two eligible recommendations.
- A risk flag showing the blocking state with no create-plan button.
- Saving and restoring a draft.
- Creating a 2-to-4-week plan.
- Refusing a second active plan.
- Showing the no-eligible-plan state without falling back to unsafe content.

Use stable `data-testid` contracts for steps, error summaries, recommendation cards, and the create action.

**Step 2: Run and verify RED**

Run the Task 5 command. Expected: FAIL on the new scenarios.

**Step 3: Implement the assessment form**

Use four fieldsets:

1. Goal and region.
2. Symptoms and risk flags.
3. Equipment, minutes, and weekly frequency.
4. Baseline discomfort and function score.

Every control must have a visible label, inline error, and error-summary link. Save the draft after each step. A risk flag immediately changes the next screen to the blocking state; it must not diagnose or name a condition.

**Step 4: Implement recommendation cards**

Show title, match reasons, estimated duration, suggested frequency, data quality, limitations, and source availability. Do not expose raw unsafe source claims. Only the selected recommendation can create a plan.

**Step 5: Implement plan creation**

Validate 2 to 4 weeks, 1 to 7 weekly sessions, and a weekday count matching weekly sessions. Persist the plan and clear the assessment draft only after a successful save.

**Step 6: Run and verify GREEN**

Run the Task 5 command. Expected: PASS.

**Step 7: Commit**

```bash
git add src/features/posture-plan/PostureAssessmentForm.tsx src/features/posture-plan/PostureRecommendationList.tsx src/features/posture-plan/PosturePlanDashboard.tsx src/pages/PosturePlanPage.tsx src/tests/posture-plan-flow.spec.ts
git commit -m "feat: create posture plans from screening"
```

### Task 7: Add today-task entry and session feedback

**Files:**
- Create: `src/components/dashboard/DashboardPostureTaskCard.tsx`
- Create: `src/features/posture-plan/PostureSessionFeedback.tsx`
- Modify: `src/pages/Dashboard.tsx:16-99`
- Modify: `src/features/workout-log/ActiveWorkoutView.tsx:29-205`
- Modify: `src/utils/activeWorkout.ts`
- Modify: `src/repositories/posturePlanRepository.ts`
- Test: `src/tests/posture-plan-session-flow.spec.ts`

**Step 1: Write failing session-flow tests**

Cover:

- No dashboard card without an active due task.
- Due task card displays week and completion count.
- Starting creates a new plan-linked workout when none exists.
- Starting appends to the current workout when one exists.
- Completing prompts for before/after discomfort and difficulty.
- Aborted feedback persists a reason and does not count as complete.
- Completed feedback makes the archived log count toward progress.

**Step 2: Run and verify RED**

```bash
npx playwright test src/tests/posture-plan-session-flow.spec.ts --project=chromium
```

Expected: FAIL because the card and feedback flow do not exist.

**Step 3: Implement the dashboard card**

Read the active plan and derive today’s task from workout logs. Render nothing when no task is due. The card action must say “开始体态任务” or “继续体态任务”, not a generic label.

**Step 4: Implement start/append behavior**

If a workout exists, append the plan protocol once and navigate to it. If it already contains the same plan occurrence, focus it instead of duplicating it.

**Step 5: Implement feedback**

Collect before/after discomfort (0-10), difficulty (`easy`, `appropriate`, `hard`), completion state, abort reason, and note. Persist only explicit user input. Mark aborted sessions incomplete.

**Step 6: Run and verify GREEN**

Run the Task 7 command. Expected: PASS.

**Step 7: Commit**

```bash
git add src/components/dashboard/DashboardPostureTaskCard.tsx src/features/posture-plan/PostureSessionFeedback.tsx src/pages/Dashboard.tsx src/features/workout-log/ActiveWorkoutView.tsx src/utils/activeWorkout.ts src/repositories/posturePlanRepository.ts src/tests/posture-plan-session-flow.spec.ts
git commit -m "feat: run and track posture sessions"
```

### Task 8: Add pause, completion, reassessment, and backup support

**Files:**
- Create: `src/features/posture-plan/PostureReassessmentForm.tsx`
- Modify: `src/features/posture-plan/PosturePlanDashboard.tsx`
- Modify: `src/pages/PosturePlanPage.tsx`
- Modify: `src/repositories/posturePlanRepository.ts`
- Modify: `src/types/backup.ts`
- Modify: `src/utils/backup.ts`
- Test: `src/tests/posture-plan-reassessment.spec.ts`
- Modify: `src/tests/user-flow.spec.ts`

**Step 1: Write failing lifecycle and backup tests**

Cover pause/resume, no missed sessions during pause, manual completion, required reassessment at cycle end, before/after score display, continue-as-new-plan, and backup export/import of valid posture data while old backup versions remain accepted.

**Step 2: Run and verify RED**

```bash
npx playwright test src/tests/posture-plan-reassessment.spec.ts src/tests/user-flow.spec.ts --project=chromium
```

Expected: FAIL because lifecycle UI and backup v4 fields do not exist.

**Step 3: Implement plan lifecycle**

Repository methods:

```ts
pausePlan(planId, pausedAt)
resumePlan(planId, resumedAt)
completePlan(planId, completedAt, reassessmentId?)
```

Store pause intervals so schedule calculations can exclude them. Require reassessment before the automatic end-of-cycle completion path, but allow an explicit early stop with a reason.

**Step 4: Implement reassessment**

Reuse the initial assessment score controls. Show numeric deltas without promising medical improvement. “继续计划” creates a new plan after completing the previous plan; it does not mutate the original schedule.

**Step 5: Upgrade backup format**

Add assessments, plans, and feedback to backup export version 4. Validate them with the same normalizers used by the repository. Continue accepting versions 1 through 3 with empty posture arrays.

**Step 6: Run and verify GREEN**

Run the Task 8 command. Expected: PASS.

**Step 7: Commit**

```bash
git add src/features/posture-plan/PostureReassessmentForm.tsx src/features/posture-plan/PosturePlanDashboard.tsx src/pages/PosturePlanPage.tsx src/repositories/posturePlanRepository.ts src/types/backup.ts src/utils/backup.ts src/tests/posture-plan-reassessment.spec.ts src/tests/user-flow.spec.ts
git commit -m "feat: complete and reassess posture plans"
```

### Task 9: Harden accessibility, mobile behavior, and full regression

**Files:**
- Modify: `src/features/posture-plan/*.tsx`
- Modify: `src/pages/PosturePlanPage.tsx`
- Modify: `src/components/dashboard/DashboardPostureTaskCard.tsx`
- Modify: `src/tests/posture-plan-flow.spec.ts`
- Modify: `src/tests/posture-plan-session-flow.spec.ts`

**Step 1: Add failing accessibility and responsive assertions**

Verify:

- One `h1`, ordered headings, labelled form controls, fieldset legends, live error summary, and focus moving to the new step or error summary.
- No body text uses contrast below WCAG AA on the posture-plan surface.
- 320px and 390px have no horizontal overflow.
- Sticky actions do not cover the last field.
- Keyboard-only assessment and plan creation works.

**Step 2: Run and verify RED where current UI is insufficient**

```bash
npx playwright test src/tests/posture-plan-flow.spec.ts src/tests/posture-plan-session-flow.spec.ts --project=chromium
```

**Step 3: Apply minimal hardening fixes**

Use existing design tokens and component vocabulary. Do not introduce animation beyond existing state transitions. Remove only new duplication introduced by this feature.

**Step 4: Run focused posture tests**

```bash
npx playwright test src/tests/posture-plan-repository.spec.ts src/tests/posture-plan-rules.spec.ts src/tests/posture-plan-schedule.spec.ts src/tests/posture-plan-workout.spec.ts src/tests/posture-plan-flow.spec.ts src/tests/posture-plan-session-flow.spec.ts src/tests/posture-plan-reassessment.spec.ts src/tests/posture-data-validation.spec.ts src/tests/posture-protocols.spec.ts src/tests/posture-workout-flow.spec.ts --project=chromium
```

Expected: all pass.

**Step 5: Run full verification**

```bash
npm test
npm run build
git diff --check
```

Expected: all tests pass, production build exits 0, and `git diff --check` prints no errors.

**Step 6: Perform browser QA**

Check the empty, blocked, recommended, active, paused, due-task, feedback, and reassessment states at 320px and 390px. Confirm the four-item bottom nav is unchanged and the Growth item remains active on `/growth/posture`.

**Step 7: Commit**

```bash
git add src docs/plans/task.md
git commit -m "test: verify posture improvement loop"
```

