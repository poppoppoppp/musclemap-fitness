# Capture Lab Adaptive Stance Calibration Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Add a session-only automatic 10-second front-stance calibration without weakening the existing capture-quality gates or capture sequence.

**Architecture:** A pure timestamp-driven calibration reducer observes frames only when every non-stance quality rule passes and the sole failure is the front-stance heuristic. It derives one in-memory front threshold, then the existing quality evaluator and capture sequence continue unchanged.

**Tech Stack:** TypeScript, React hooks, Playwright tests, existing MediaPipe Capture Lab.

---

### Task 1: Pure calibration state machine

**Files:**
- Create: `src/features/posture/capture/quality/stanceCalibration.ts`
- Test: `src/tests/posture-stance-calibration.spec.ts`

1. Write failing tests for real-time 10-second completion, 9.9-second incompleteness, interruption reset, median baseline, and non-eligible frames.
2. Run `npx playwright test src/tests/posture-stance-calibration.spec.ts --workers=1` and verify RED.
3. Implement the minimal immutable state transition and threshold derivation.
4. Re-run the test and verify GREEN.

### Task 2: Expose stance geometry and calibrated threshold

**Files:**
- Modify: `src/features/posture/capture/quality/evaluateCaptureQuality.ts`
- Modify: `src/features/posture/capture/captureLabTypes.ts`
- Test: `src/tests/posture-capture-quality.spec.ts`

1. Write failing tests proving a calibrated natural-front baseline passes while an obvious side pose remains rejected.
2. Expose the aspect-corrected stance ratio in metrics and accept an optional session threshold override.
3. Re-run the quality tests and verify GREEN.

### Task 3: Integrate with the existing camera loop

**Files:**
- Modify: `src/features/posture/capture/hooks/usePostureCaptureLab.ts`
- Modify: `src/features/posture/capture/components/CaptureViewport.tsx`
- Modify: `src/features/posture/capture/captureLabTypes.ts`
- Test: `src/tests/posture-capture-lab.spec.ts`

1. Write a failing UI contract test for calibration progress and completion copy.
2. Feed eligible frames and real timestamps to the reducer, re-evaluate with the derived threshold, and reset on mode change/retry/exit.
3. Render concise progress/completion status without changing the existing capture sequence.
4. Re-run the UI test and verify GREEN.

### Task 4: Verification

**Files:**
- Modify: `docs/posture-capture-lab-testing.md`

1. Run the focused calibration, capture-quality, runtime, RTMPose, and UI tests.
2. Run `npx tsc -b --pretty false`, `npm run build`, and `git diff --check`.
3. Reopen the real camera and verify calibration followed by the unchanged countdown/capture flow.
4. Record the human result separately from automated verification.

Per the user constraint, do not create commits, push, or deploy while executing this plan.

