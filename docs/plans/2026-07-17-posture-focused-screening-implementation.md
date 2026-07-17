# Posture Focused Screening Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Replace the current dead-end posture questionnaire with an adult-only, evidence-traceable assessment loop that produces a useful non-diagnostic posture tendency, supports local photo measurements and retesting, and always gives the user a safe next action.

**Architecture:** Add a self-contained `posture-screening` domain beside the legacy posture-plan domain. Pure evidence, geometry, decision, comparison, and migration modules stay independent of React. Versioned localStorage holds structured sessions; IndexedDB holds optional raw photos. Route-level screens orchestrate a draftable adaptive flow, explainable results, history, and same-protocol retests. Existing active posture plans remain runnable; no new training recommendation logic is introduced.

**Tech Stack:** React 19, TypeScript 5.9, React Router 7, localStorage, IndexedDB, SVG/Pointer Events, Playwright, Vite.

---

## Non-negotiable product and safety rules

- User-facing output is “体态表现倾向” or “功能表现”, never a medical diagnosis.
- Version one is for adults aged 18 or older.
- Red flags or unsafe test symptoms stop assessment and return `safety-review` with a concrete next action.
- A named tendency requires agreement from at least two evidence classes: `subjective`, `functional`, and `geometry`.
- Photos may report visible alignment measurements only. They cannot infer pelvic tilt, winged scapula, scoliosis, structural kyphosis, or a weak/tight muscle.
- Photo skipping remains completable as `functional-only`; bad measurement quality becomes a recoverable `measurement-invalid` branch.
- Every question, test, metric, and decision rule references a registered evidence record with allowed and forbidden conclusions.
- Raw photos stay on device, are omitted from JSON backups, and can be deleted while retaining measurements.
- Retest trend language requires matching protocol and algorithm versions. Change within registered measurement error is “未见明确变化”.
- This phase does not prescribe, map, create, or start a training plan.

## Frozen result contract

~~~ts
type PostureScreeningStatus =
  | 'draft'
  | 'completed'
  | 'functional-only'
  | 'mixed-evidence'
  | 'safety-review'
  | 'measurement-invalid'

type EvidenceClass = 'subjective' | 'functional' | 'geometry'

interface PostureFinding {
  patternId: string
  label: string
  evidenceClasses: EvidenceClass[]
  evidenceIds: string[]
  reasonCodes: string[]
  confidence: 'supported' | 'limited' | 'insufficient'
  allowedConclusion: string
  forbiddenConclusions: string[]
}
~~~

Do not force a dominant pattern for `mixed-evidence`. Show the disagreement and offer edit, retake, or retest actions.

## Task 1: Freeze evidence registry and domain contracts

**Files:**

- Create: `src/types/postureScreening.ts`
- Create: `src/data/posture/postureScreeningEvidence.ts`
- Create: `src/utils/postureScreeningEvidence.ts`
- Test: `src/tests/posture-screening-evidence.spec.ts`

**Step 1: Write failing registry tests**

Assert unique/versioned evidence IDs; required construct, population, method, source, grade, measurement-error status, contraindications, allowed/forbidden conclusions; no diagnostic wording; and no dangling evidence reference.

Run:

~~~powershell
npm test -- src/tests/posture-screening-evidence.spec.ts
~~~

Expected: FAIL because the registry does not exist.

**Step 2: Add the minimal types and immutable registry**

Register the approved sources and their limitations:

- APTA PAR-Q+ page for pre-activity safety framing;
- PMID 35935117, 41509052, and 28559753 for non-radiographic upper-body measurement;
- PMID 38610914 and 36825268 for limits of interpreting CVA as pathology or pain cause;
- PMID 22488230 for seated thoracic rotation reliability;
- PMID 33155568 for limited qualitative scapular observation reliability;
- PMID 24982755 and 19119397 for lumbopelvic landmark limitations;
- PMID 40780025 and 36901144 for non-invasive kyphosis methods and age-specific reference context;
- PMID 38665167 for standing capture standardization.

Store source summaries and identifiers, not copyrighted questionnaire text. Label app questions as custom screening questions, not validated instruments.

**Step 3: Implement deterministic registry validation**

Collect all validation errors rather than throwing on the first item.

**Step 4: Re-run and commit**

~~~powershell
npm test -- src/tests/posture-screening-evidence.spec.ts
git add src/types/postureScreening.ts src/data/posture/postureScreeningEvidence.ts src/utils/postureScreeningEvidence.ts src/tests/posture-screening-evidence.spec.ts
git commit -m "feat: define posture screening evidence contracts"
~~~

## Task 2: Implement photogrammetry and capture QA

**Files:**

- Create: `src/utils/posturePhotogrammetry.ts`
- Test: `src/tests/posture-photogrammetry.spec.ts`

**Step 1: Write failing table-driven tests**

Use normalized fixed coordinates for CVA, frontal head tilt, acromion-C7 sagittal angle, lateral trunk inclination, normalized shoulder-height difference, frontal trunk deviation, mirrored/orientation handling, missing/out-of-range/duplicate/degenerate points, and repeated measurements inside/outside error.

Run and expect FAIL:

~~~powershell
npm test -- src/tests/posture-photogrammetry.spec.ts
~~~

**Step 2: Implement pure geometry**

Accept normalized points only and return a discriminated result containing value/unit/evidence IDs or a stable quality reason code. Keep pixels and DOM coordinates out of this layer. Do not invent universal normal/abnormal cutoffs.

**Step 3: Implement QA**

Validate landmarks, minimum point separation, image dimensions, declared front/left-lateral view, and standing-protocol confirmation. Use reason codes such as `LANDMARK_MISSING_C7`, `POINTS_TOO_CLOSE`, and `CAPTURE_PROTOCOL_UNCONFIRMED`.

**Step 4: Re-run and commit**

~~~powershell
npm test -- src/tests/posture-photogrammetry.spec.ts
git add src/utils/posturePhotogrammetry.ts src/tests/posture-photogrammetry.spec.ts
git commit -m "feat: add posture photogrammetry calculations"
~~~

## Task 3: Define adaptive questions, one guided test, and decision rules

**Files:**

- Create: `src/data/posture/postureScreeningQuestions.ts`
- Create: `src/data/posture/postureScreeningTests.ts`
- Create: `src/utils/postureScreeningRules.ts`
- Test: `src/tests/posture-screening-rules.spec.ts`

**Step 1: Write failing rule tests**

Cover under-18, every safety stop, adaptive region branching, symptom stop during the guided test, photo skip, invalid photo, one-class insufficiency, two-class agreement, three-class conflict, `mixed-evidence`, and every final status. Assert evidence IDs, reason codes, next actions, algorithm/protocol versions, and absence of forbidden conclusions.

Run and expect FAIL:

~~~powershell
npm test -- src/tests/posture-screening-rules.spec.ts
~~~

**Step 2: Define concise adaptive content**

Common path: adult boundary/consent; safety screen; primary concern and functional impact; no more than two relevant follow-ups; one roughly 30-second broad coordinated movement/observation; optional front and lateral photos. Every item declares evidence, stop rules, answer shape, and interpretation limit.

**Step 3: Implement pure signal extraction and evaluation**

Separate signal extraction from wording. Require two distinct evidence classes for `supported`. Add table cases for neck/upper quarter, thoracic/trunk, shoulder asymmetry, insufficient evidence, and conflict.

**Step 4: Re-run and commit**

~~~powershell
npm test -- src/tests/posture-screening-evidence.spec.ts src/tests/posture-photogrammetry.spec.ts src/tests/posture-screening-rules.spec.ts
git add src/data/posture/postureScreeningQuestions.ts src/data/posture/postureScreeningTests.ts src/utils/postureScreeningRules.ts src/tests/posture-screening-rules.spec.ts
git commit -m "feat: add adaptive posture screening rules"
~~~

## Task 4: Persist drafts, sessions, and device-local photos

**Files:**

- Create: `src/repositories/postureScreeningRepository.ts`
- Test: `src/tests/posture-screening-repository.spec.ts`

**Step 1: Write failing repository tests**

Cover one active draft, resume/update, newest-first sessions, immutable result snapshots, blob put/get/delete, deleting a photo while retaining landmarks/measurements, cascading asset deletion for a session, malformed storage, quota failure, and IndexedDB failure.

Run and expect FAIL:

~~~powershell
npm test -- src/tests/posture-screening-repository.spec.ts
~~~

**Step 2: Implement structured storage**

Use `musclemap.postureScreeningSessions.v1` and `musclemap.postureScreeningDraft.v1`. Preserve legacy posture-plan storage. Generate IDs in the repository.

**Step 3: Implement photo storage**

Follow `progressPhotoRepository.ts` in a separate IndexedDB database named `musclemap-posture-screening-v1` with metadata and blob stores. Never serialize blobs to localStorage.

**Step 4: Re-run and commit**

~~~powershell
npm test -- src/tests/posture-screening-repository.spec.ts
git add src/repositories/postureScreeningRepository.ts src/tests/posture-screening-repository.spec.ts
git commit -m "feat: persist posture screening sessions locally"
~~~

## Task 5: Upgrade backup to v6 for structured screening data

**Files:**

- Modify: `src/types/backup.ts`
- Modify: `src/utils/backup.ts`
- Modify: `src/pages/DataManagement.tsx`
- Create: `src/tests/posture-screening-backup.spec.ts`
- Modify: exact backup-version assertions in existing `src/tests/*.spec.ts` only

**Step 1: Write failing migration tests**

Assert v6 exports completed structured sessions; excludes drafts/blobs; retains landmarks, measurements, evidence, reason and version fields; clears imported photo asset availability; migrates v1-v5 to an empty screening collection; rejects invalid v6; and preserves legacy assessments/plans.

Run and expect FAIL:

~~~powershell
npm test -- src/tests/posture-screening-backup.spec.ts
~~~

**Step 2: Implement v6 and UI summary**

Keep v1-v5 paths intact. Export no raw photos. On import retain numeric photo-derived data but clear asset IDs/availability so no dangling IndexedDB references remain.

**Step 3: Locate and update exact current-version assertions**

~~~powershell
rg "version.*5|backupVersion|postureAssessments" src/tests
~~~

Change only impacted tests.

**Step 4: Re-run and commit**

~~~powershell
npm test -- src/tests/posture-screening-backup.spec.ts src/tests/posture-plan-backup.spec.ts src/tests/user-flow.spec.ts
git add src/types/backup.ts src/utils/backup.ts src/pages/DataManagement.tsx src/tests
git commit -m "feat: back up posture screening measurements"
~~~

Before committing, unstage any unrelated test file accidentally included by the broad `src/tests` path.

## Task 6: Build the draftable adaptive flow

**Files:**

- Create: `src/pages/PostureScreeningPage.tsx`
- Create: `src/features/posture-screening/PostureScreeningFlow.tsx`
- Create: `src/features/posture-screening/PostureScreeningProgress.tsx`
- Create: `src/features/posture-screening/PostureBoundaryStep.tsx`
- Create: `src/features/posture-screening/PostureSafetyStep.tsx`
- Create: `src/features/posture-screening/PostureConcernStep.tsx`
- Create: `src/features/posture-screening/PostureMovementStep.tsx`
- Modify: `src/app/router.tsx`
- Test: `src/tests/posture-screening-flow.spec.ts`

**Step 1: Write failing browser tests**

Test route entry/resume; adaptive progress; under-18 and safety short circuits; clearing inapplicable answers after region change; timed-test instructions and stop rules; reload; browser history; one-session completion; heading focus; and a next action on every blocked path.

Run and expect FAIL:

~~~powershell
npm test -- src/tests/posture-screening-flow.spec.ts
~~~

**Step 2: Implement a typed reducer and route shell**

Components render one step and emit typed answers. Keep medical decisions out of React.

**Step 3: Match the existing theme and accessibility conventions**

Reuse dark surfaces, typography, spacing, buttons, alerts, navigation, visible focus, fieldset/legend semantics, error summaries, reduced-motion behavior, and minimum 44px touch targets. Add no custom animation yet.

**Step 4: Re-run and commit**

~~~powershell
npm test -- src/tests/posture-screening-flow.spec.ts
git add src/pages/PostureScreeningPage.tsx src/features/posture-screening src/app/router.tsx src/tests/posture-screening-flow.spec.ts
git commit -m "feat: add adaptive posture screening flow"
~~~

## Task 7: Add optional standardized photos and manual landmarks

**Files:**

- Create: `src/features/posture-screening/PosturePhotoStep.tsx`
- Create: `src/features/posture-screening/PosturePhotoGuide.tsx`
- Create: `src/features/posture-screening/PostureLandmarkEditor.tsx`
- Create: `src/features/posture-screening/useLocalPosturePhoto.ts`
- Test: `src/tests/posture-screening-photo.spec.ts`

**Step 1: Write failing photo-flow tests**

Test skip; front/lateral instructions; file input capture hint and upload fallback; mouse/touch/pointer and keyboard landmark adjustment; normalized coordinates after resize; precise invalid-marker messages; camera/decode retry/upload/skip paths; local blob storage; object-URL cleanup; and no request carrying image bytes.

Run and expect FAIL:

~~~powershell
npm test -- src/tests/posture-screening-photo.spec.ts
~~~

**Step 2: Implement local capture/upload**

Use `<input type="file" accept="image/*" capture="environment">` with ordinary file selection fallback. Validate MIME/decodeability, persist locally, and state “照片仅保存在当前设备”.

**Step 3: Implement SVG landmark editing**

Use SVG overlay, pointer capture, keyboard-operable marker buttons, and a marker checklist. Lateral landmarks: tragus, C7, acromion, trunk references. Front landmarks: head references, both acromia, upper/lower trunk midline. Never auto-detect anatomy.

**Step 4: Store measurements, not interpretations**

Save normalized points, derived values, QA, view/protocol, and evidence IDs in the draft. Decision rules remain outside the component.

**Step 5: Re-run and commit**

~~~powershell
npm test -- src/tests/posture-screening-photo.spec.ts src/tests/posture-photogrammetry.spec.ts
git add src/features/posture-screening src/tests/posture-screening-photo.spec.ts
git commit -m "feat: add local posture photo measurements"
~~~

## Task 8: Build the explainable report and close all terminal paths

**Files:**

- Create: `src/pages/PostureScreeningResultPage.tsx`
- Create: `src/features/posture-screening/PostureAssessmentReport.tsx`
- Create: `src/features/posture-screening/PostureEvidenceDetails.tsx`
- Create: `src/features/posture-screening/PostureNextActions.tsx`
- Modify: `src/app/router.tsx`
- Test: `src/tests/posture-screening-result.spec.ts`

**Step 1: Write failing result tests**

Test `completed`, `functional-only`, `mixed-evidence`, `safety-review`, `measurement-invalid`, and insufficient evidence. Assert answer-first summary, contributing classes, observations, limits, evidence-source mapping, versions, refresh by session ID, and correct next actions. Assert no protocol recommendation, plan creation, or workout start.

Run and expect FAIL:

~~~powershell
npm test -- src/tests/posture-screening-result.spec.ts
~~~

**Step 2: Implement atomic completion**

Evaluate once, save the entire result snapshot, clear draft, and route to `/growth/posture/results/:sessionId`. Prevent double-submit.

**Step 3: Render result hierarchy**

Order: answer; 判断依据; 不能说明什么; 下一步. Sources explain the rule basis without implying that a study validated the whole app.

**Step 4: Add in-scope next actions**

Edit/retake, skip invalid photo, delete local photo, history, future retest, return to hub, or seek professional assessment when indicated. No training CTA.

**Step 5: Re-run and commit**

~~~powershell
npm test -- src/tests/posture-screening-result.spec.ts src/tests/posture-screening-flow.spec.ts
git add src/pages/PostureScreeningResultPage.tsx src/features/posture-screening src/app/router.tsx src/tests/posture-screening-result.spec.ts
git commit -m "feat: add explainable posture assessment report"
~~~

## Task 9: Add history, deletion, and method-aware retests

**Files:**

- Create: `src/pages/PostureScreeningHistoryPage.tsx`
- Create: `src/features/posture-screening/PostureScreeningHistoryList.tsx`
- Create: `src/features/posture-screening/PostureRetestComparison.tsx`
- Create: `src/utils/postureScreeningComparison.ts`
- Modify: `src/app/router.tsx`
- Test: `src/tests/posture-screening-history.spec.ts`

**Step 1: Write failing history/comparison tests**

Cover empty/populated history, historical reload, raw-photo-only deletion, whole-session deletion, linked retest, comparable metric/method/version checks, change inside/outside error, unknown error, and mismatched protocol/algorithm. Never label a numeric change as recovery.

Run and expect FAIL:

~~~powershell
npm test -- src/tests/posture-screening-history.spec.ts
~~~

**Step 2: Implement pure comparison**

Read error values from the evidence registry. Inside error => “未见明确变化”; outside => direction and magnitude; unknown error => numeric difference plus uncertainty; version mismatch => no trend conclusion.

**Step 3: Add history route and privacy controls**

Add `/growth/posture/history`. Explain what remains before deleting raw photos. Cascade assets when deleting a session.

**Step 4: Re-run and commit**

~~~powershell
npm test -- src/tests/posture-screening-history.spec.ts src/tests/posture-screening-repository.spec.ts
git add src/pages/PostureScreeningHistoryPage.tsx src/features/posture-screening src/utils/postureScreeningComparison.ts src/app/router.tsx src/tests/posture-screening-history.spec.ts
git commit -m "feat: add posture screening history and retests"
~~~

## Task 10: Integrate the new assessment into the posture hub

**Files:**

- Modify: `src/pages/PosturePlanPage.tsx`
- Modify: `src/features/posture-plan/PosturePlanEmptyState.tsx`
- Modify only if proven unused: `src/features/posture-plan/PostureAssessmentForm.tsx`
- Modify: `src/tests/posture-plan-flow.spec.ts`
- Create: `src/tests/posture-screening-hub.spec.ts`

**Step 1: Write failing integration tests**

A no-plan user reaches the new screening; saved results survive reload; active plan dashboard/schedule/feedback/workout still work; active-plan reassessment opens new screening context but never mutates the plan; legacy storage remains readable; and the reported blank result screen cannot recur.

Run and expect FAIL:

~~~powershell
npm test -- src/tests/posture-screening-hub.spec.ts src/tests/posture-plan-flow.spec.ts
~~~

**Step 2: Replace entry points only**

Route assessment/reassessment CTAs to `/growth/posture/screening` with typed `planId`/`baselineSessionId` context when available. Do not map patterns to protocol IDs.

**Step 3: Remove dead UI only if unused**

~~~powershell
rg "PostureAssessmentForm" src
~~~

Delete the old form only if no intentional callers remain. Keep legacy storage types for backup compatibility.

**Step 4: Re-run and commit**

~~~powershell
npm test -- src/tests/posture-screening-hub.spec.ts src/tests/posture-plan-flow.spec.ts
git add src/pages/PosturePlanPage.tsx src/features/posture-plan src/tests/posture-screening-hub.spec.ts src/tests/posture-plan-flow.spec.ts
git commit -m "feat: connect posture hub to evidence screening"
~~~

## Task 11: Verify the full loop, accessibility, and privacy

**Step 1: Run all posture-focused tests**

~~~powershell
npm test -- src/tests/posture-screening-evidence.spec.ts src/tests/posture-photogrammetry.spec.ts src/tests/posture-screening-rules.spec.ts src/tests/posture-screening-repository.spec.ts src/tests/posture-screening-backup.spec.ts src/tests/posture-screening-flow.spec.ts src/tests/posture-screening-photo.spec.ts src/tests/posture-screening-result.spec.ts src/tests/posture-screening-history.spec.ts src/tests/posture-screening-hub.spec.ts src/tests/posture-plan-flow.spec.ts src/tests/posture-plan-backup.spec.ts
~~~

Expected: all pass.

**Step 2: Build and run the full suite**

~~~powershell
npm run build
npm test
~~~

Expected: TypeScript/Vite pass and zero test failures. Existing intentional skips may remain documented.

**Step 3: Manually verify at 390x844 and 320x568**

Complete: supported result with photos; no-photo functional-only; safety-review; invalid landmark then retake; reload draft/result; delete raw photo; retest comparison. Inspect wrapping, touch precision, sticky controls, focus, reduced motion, theme consistency, and network traffic.

**Step 4: Inspect scope**

~~~powershell
git diff --check
git status --short
git diff --stat
~~~

Every change must trace to the assessment loop. Commit verification fixes only if needed:

~~~powershell
git add <verified-files>
git commit -m "fix: harden posture screening loop"
~~~

## Task 12: Audit current training-data gaps after assessment is stable

**Files:**

- Create: `docs/reports/posture-screening-training-gap-report.md`
- Read only: `src/data/posture/*`
- Read only: `src/utils/posturePlanRules.ts`
- Read only: `src/types/posturePlan.ts`

**Step 1: Freeze assessment demand**

List every final `patternId`, functional limitation, status, and contraindication the implemented engine can produce.

**Step 2: Inventory protocol supply**

For every protocol record region, stage, action type, eligibility, evidence quality, source state, dosage completeness, contraindications, visual-review requirements, and whether it can safely address a broad whole-chain output without diagnosis inference.

**Step 3: Write the user collection report**

Separate: usable broad protocols; adjunct-only coverage; missing coverage; safety branches that must never auto-map; and exact material needed next—source, exercise actions, dose/progression, stop rules, population, contraindications, and PMID/DOI.

Do not implement mappings or alter plans.

**Step 4: Verify every claim against code**

~~~powershell
rg "eligibility|evidence|dose|protocolId|recommendationRole" src/data/posture src/utils/posturePlanRules.ts src/types/posturePlan.ts
~~~

Every reported gap must cite an exact protocol ID and field/reason.

**Step 5: Commit**

~~~powershell
git add docs/reports/posture-screening-training-gap-report.md
git commit -m "docs: audit posture training gaps after screening"
~~~

## Definition of done

- A new adult can enter from the posture hub, finish a short adaptive assessment, receive a result, reload it, and later retest.
- Every path has a terminal result and safe next action; no blank screen or dead end remains.
- Named tendencies require two evidence classes and expose their evidence, reason codes, and limitations.
- Safety stops, skipped/invalid photos, conflict, insufficient evidence, storage failures, and imported sessions are tested.
- Raw photos remain local, deletable, and absent from backup JSON.
- Existing active plans and legacy backups still work.
- Targeted tests, full tests, production build, mobile, accessibility, and privacy checks pass.
- A separate code-referenced gap report tells the user exactly what training evidence/content to collect; training mapping remains out of scope.
