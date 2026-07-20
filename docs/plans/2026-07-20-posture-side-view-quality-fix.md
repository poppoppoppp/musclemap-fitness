# Posture Side-View Quality Fix Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Allow a genuine side view to qualify from one reliable same-side body chain without weakening front/back bilateral checks or treating occluded coordinates as visible evidence.

**Architecture:** Keep `evaluateCaptureQuality` pure and derive a view-specific framing profile before evaluating groups, distance, centring, occlusion, completeness, and reliability. Side mode selects a complete left or right ear-to-foot chain; the opposite-side raw coordinates remain limited to the non-medical projected-span stance heuristic.

**Tech Stack:** TypeScript 5.9, Playwright Test, React 19 quality presentation.

---

### Task 1: Reproduce the side-view failure

**Files:**
- Modify: `src/tests/posture-capture-quality.spec.ts`

1. Add a test whose left ear/shoulder/hip/knee/ankle/heel/foot are reliable while the entire right chain has visibility `0.1`.
2. Assert side mode passes the coverage groups, whole-body, occlusion, distance, centring, stance, and overall evaluation.
3. Assert the same landmarks still fail front and back bilateral coverage.
4. Add a second test proving mixed left/right fragments cannot form a valid side chain.
5. Run `npx playwright test src/tests/posture-capture-quality.spec.ts --workers=1` and verify the new valid-side test fails because the current bilateral knee/coverage gate rejects it.

### Task 2: Implement the minimal view-specific profile

**Files:**
- Modify: `src/features/posture/capture/quality/evaluateCaptureQuality.ts`

1. Define the left and right side chains centrally beside the existing landmark groups.
2. Select only a fully reliable same-side chain; if neither is complete, retain the stronger chain for truthful per-group failure detail but keep overall quality blocked.
3. Use the chosen side chain for group visibility, framing bounds, centring, occlusion, completeness, and average reliability.
4. Keep front/back on their existing bilateral groups.
5. Let side stance geometry read the opposite raw shoulder/hip coordinates only when finite and in-frame; never count them as visible or reliable.
6. Run the focused quality suite and confirm both new tests pass with all existing quality tests unchanged.

### Task 3: Clarify presentation and documentation

**Files:**
- Modify: `src/features/posture/capture/quality/qualityCopy.ts` only if current labels imply two visible knees are mandatory for side mode.
- Modify: `docs/plans/2026-07-19-posture-capture-lab-design.md`
- Modify: `docs/posture-capture-lab-testing.md`

1. Keep user copy anatomical and view-neutral; do not claim an occluded far-side joint was seen.
2. Record the same-side-chain rule and the real-device reason for it.
3. Preserve the statement that every threshold is experimental and non-medical.

### Task 4: Verify the correction

**Files:**
- Test: `src/tests/posture-capture-quality.spec.ts`
- Test: `src/tests/posture-capture-runtime.spec.ts`
- Test: `src/tests/posture-capture-lab.spec.ts`

1. Run all Phase 2 capture tests with one worker.
2. Run `npx tsc -b --pretty false`.
3. Run `npm run posture:assets:verify`.
4. Run `npm run build`.
5. Repeat a real-camera side-view check and record whether the same-side knee chain qualifies.
6. Do not commit, push, deploy, or alter the formal posture entry.
