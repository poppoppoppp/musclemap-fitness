# Posture Growth Tab Unification Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Embed posture improvement in the Growth page, derive every state from existing local data, and add a guarded manual plan-creation flow without automatic recommendation or data migration.

**Architecture:** Keep the screening, plan, workout, and photo repositories intact. Add a pure posture-growth selector over repository snapshots, render its discriminated states inside `GrowthPage`, and use a separate guarded route for explicit manual plan creation. Extend persisted plans with optional screening provenance while keeping legacy plans readable.

**Tech Stack:** React 19, TypeScript 5.9, React Router 7, Tailwind CSS, localStorage, IndexedDB, Playwright.

---

No task in this plan commits, pushes, deploys, installs a pose model, downloads model weights, or writes migration data.

### Task 1: Pure posture growth state and eligibility rules

**Files:**
- Create: `src/types/postureGrowth.ts`
- Create: `src/utils/postureGrowth.ts`
- Create: `src/tests/posture-growth-view-state.spec.ts`

**Step 1: Write failing tests**

Cover:

- `active-plan` outranks every other state.
- `paused-plan` is distinct from active.
- A creatable session is `assessed` only when `completedAt` is later than an explicit `completedAt` on the latest completed plan.
- Completed plan wins when the newer screening timestamp is equal to or older than plan completion.
- A restricted session becomes restricted `assessed` only after active, paused, creatable-after-completion, and completed-plan checks.
- Empty data becomes `empty`.
- Safety review, measurement invalid, mixed evidence, evidence insufficiency, professional-review actions, missing supported findings, and draft-like data cannot create a plan.
- Comparable trend requires an explicit baseline relation and `comparePostureScreeningSessions(...).status === 'comparable'`.
- Selector inputs remain unchanged after derivation.

**Step 2: Verify RED**

Run: `pnpm exec playwright test src/tests/posture-growth-view-state.spec.ts`

Expected: FAIL because `postureGrowth` types and selector do not exist.

**Step 3: Implement minimal pure derivation**

Define a discriminated union with `empty`, `assessed`, `active-plan`, `paused-plan`, and `completed-plan`. Export one shared `canCreatePosturePlanFromSession` guard. Sort or select only through parsed `updatedAt`, `completedAt`, and plan `completedAt`; never use input order as meaning.

The selector accepts sessions, plans, workout logs, feedback, and `now`. It calls existing progress, today-task, protocol, and comparison helpers but performs no storage access or writes.

**Step 4: Verify GREEN**

Run the same test command and expect all tests to pass.

### Task 2: Backward-compatible screening provenance on plans

**Files:**
- Modify: `src/types/posturePlan.ts`
- Modify: `src/repositories/posturePlanRepository.ts`
- Modify: `src/types/backup.ts`
- Modify: `src/utils/backup.ts`
- Modify: `src/tests/posture-plan-repository.spec.ts`
- Modify: `src/tests/posture-plan-backup.spec.ts`
- Modify: `src/tests/posture-screening-backup.spec.ts`

**Step 1: Write failing tests**

Assert that:

- A new manual plan accepts `screeningSessionId` plus a source snapshot containing screening time, finding summary, selected protocol, created time, and `selectionMode: 'manual'`.
- New creation rejects missing snapshot, mismatched snapshot protocol, simultaneous assessment and screening sources, and non-manual mode.
- Legacy creation with `assessmentId` still succeeds.
- Persisted old plans with `assessmentId`, with neither source field, and without a source snapshot normalize successfully.
- Backup export/import preserves structured screening provenance.
- Raw photo asset IDs remain stripped from screening backup data.

**Step 2: Verify RED**

Run the three targeted spec files and confirm failures are caused by missing provenance fields/guards.

**Step 3: Implement minimal schema extension**

Separate new-plan creation input validation from persisted-plan normalization. Persisted normalization permits legacy plans with neither source. New creation requires exactly one source shape. Keep all current storage keys and backup version unless a version bump is demonstrably required by the existing compatibility contract.

**Step 4: Verify GREEN**

Run the three targeted specs and expect them to pass.

### Task 3: Guarded manual plan builder

**Files:**
- Create: `src/pages/PosturePlanBuilderPage.tsx`
- Create: `src/features/posture-plan/PostureManualPlanBuilder.tsx`
- Create: `src/tests/posture-manual-plan-builder.spec.ts`
- Modify: `src/app/router.tsx`

**Step 1: Write failing E2E tests**

Cover:

- Invalid, missing, restricted, safety-review, mixed-evidence, and insufficient-evidence session IDs return to `/growth/posture` and write no plan.
- Eligible protocols are exactly those passing existing technical eligibility.
- No protocol is preselected, reordered, or visually recommended from findings.
- User must explicitly choose protocol, duration, frequency, and matching weekdays.
- No plan is written on the selection step or confirmation-page entry.
- Final confirmation creates a manual plan with the exact source snapshot, then returns to `/growth/posture`.
- Existing active/paused plan prevents a second plan.
- Storage failure remains on the confirmation UI with an error.

**Step 2: Verify RED**

Run the new spec and confirm the route/component is missing.

**Step 3: Implement minimal builder**

Read the session once from the screening repository, validate it with the shared pure guard, list only eligible protocols in dataset order, and require explicit selections. Recheck the session, protocol eligibility, and active-plan invariant immediately before `tryCreatePlan`.

**Step 4: Verify GREEN**

Run the new spec and expect it to pass.

### Task 4: Embed posture states in Growth

**Files:**
- Create: `src/features/growth/PostureGrowthSection.tsx`
- Create: `src/features/growth/PostureEmptyState.tsx`
- Create: `src/features/growth/PostureAnalysisSummary.tsx`
- Create: `src/features/growth/PosturePlanOverview.tsx`
- Create: `src/features/growth/PostureTrendCard.tsx`
- Modify: `src/pages/GrowthPage.tsx`
- Modify: `src/app/router.tsx`
- Create: `src/tests/posture-growth-tab.spec.ts`
- Modify: `src/tests/posture-plan-flow.spec.ts`
- Modify: `src/tests/posture-plan-reassessment.spec.ts`
- Modify: `src/tests/posture-screening-hub.spec.ts`

**Step 1: Write failing E2E tests**

Assert:

- Clicking posture changes URL to `/growth/posture` while Growth title and all three tabs remain visible.
- Loading `/growth/posture` directly selects posture.
- Training/body range controls are absent in posture.
- Empty, eligible assessed, restricted assessed, active, paused, and completed states render only real data.
- Eligible assessed state links to the guarded manual builder.
- Restricted state exposes report/retest/professional actions without a plan-creation link.
- Active state shows the real plan week/progress/focus and only shows “继续今日训练” for a true incomplete today task.
- Paused, non-training-day, and completed-task states do not fabricate a today task.
- Completed state exposes history/new-cycle actions.
- No fake percentage or trend chart appears without a comparable retest.

**Step 2: Verify RED**

Run the new and affected posture hub specs and confirm the old independent page behavior fails the new expectations.

**Step 3: Implement components and route alias**

Route both `/growth` and `/growth/posture` to `GrowthPage`; derive the selected tab from the pathname. The posture section reads repositories outside the selector, passes snapshots into the pure selector, and refreshes after plan mutations. Reuse current workout-start utilities and plan state transitions.

Keep the visual language black, zinc, and lime; use current radius/spacing conventions; avoid speculative diagrams, medical-console styling, and decorative fake scans.

**Step 4: Verify GREEN**

Run the targeted specs and expect them to pass.

### Task 5: Normalize child-flow return behavior

**Files:**
- Modify: `src/pages/PostureScreeningPage.tsx`
- Modify: `src/pages/PostureScreeningResultPage.tsx`
- Modify: `src/pages/PostureScreeningHistoryPage.tsx`
- Modify: `src/features/posture-screening/PostureNextActions.tsx`
- Modify: `src/features/posture-screening/PostureScreeningHistoryList.tsx`
- Modify: `src/tests/posture-screening-flow.spec.ts`
- Modify: `src/tests/posture-screening-result.spec.ts`
- Modify: `src/tests/posture-screening-history.spec.ts`

**Step 1: Add failing navigation tests**

Verify every visible cancel/back/return control targets `/growth/posture`, direct return selects the posture tab, and browser back from a child opened from posture does not restore training/body.

**Step 2: Verify RED**

Run the three targeted specs and observe missing or incorrect return controls.

**Step 3: Implement minimal route controls**

Add consistent back links to the full-screen pages and retain result/history actions. Do not replace native browser history or add custom history stacks.

**Step 4: Verify GREEN**

Run the targeted specs and expect them to pass.

### Task 6: Future analysis interface and model sourcing documentation

**Files:**
- Create: `src/types/postureAnalysis.ts`
- Create: `docs/posture-model-sourcing-and-deployment.md`

**Step 1: Add compile-time contract usage**

Define platform-neutral capture, job, result, model provenance, runtime status, quality, and warning types. Do not create a service implementation or fake result fixture in production code.

**Step 2: Write technical documentation**

Record the supplied official-source constraints, MediaPipe Tasks Pose Landmarker selection, RTMPose body26/RTMDet-m baseline, benchmark candidates, model manifest and hash requirements, staged PyTorch→service→ONNX sequence, Docker/service boundaries, environment variables, failure rules, deployment evaluation, and license checklist.

**Step 3: Verify boundary**

Run `rg -n "@mediapipe|mmpose|rtmpose|RTMW|VITE_POSTURE_INFERENCE_API_URL" package.json src services` and confirm no runtime package, model weight, service, or hard-coded production platform was added.

### Task 7: Full verification and mobile visual QA

**Files:**
- Modify only test selectors or styles directly required by observed failures.

**Step 1: Targeted regression**

Run all growth, posture screening, posture plan, posture workout, backup, and active workout specs.

**Step 2: Full automated verification**

Run:

- `pnpm test`
- `pnpm build`

Expected: zero failures and exit code 0.

**Step 3: Mobile visual verification**

Run the real application with controlled localStorage fixtures for empty, assessed, active, paused, and completed states. Capture and inspect:

- 390×844
- 393×852
- 430×932

For each viewport confirm no horizontal overflow, no bottom-nav overlap, readable long Chinese text, visible primary actions, honest empty/trend states, and consistent Growth tab hierarchy.

**Step 4: Review the diff**

Run `git diff --check`, `git status --short`, and inspect only task-related files. Do not stage, commit, push, or deploy.

