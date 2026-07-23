# Posture Squat Phase Driver Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Segment a complete squat independently of per-frame RTMDet bounding-box movement.

**Architecture:** Keep the existing pure movement pipeline and phase detector. Replace only the squat phase driver with hip-to-ankle relative height normalized by shoulder width.

**Tech Stack:** Python, NumPy, Pytest, existing pure posture analysis module.

---

### Task 1: Reproduce detector-box cancellation

**Files:**
- Modify: `services/posture-inference/tests/test_movement_analysis.py`

1. Add a complete synthetic squat sequence with the same keypoints as the working fixture but a bounding box centered on each frame's hip midpoint.
2. Assert the movement is complete and the hold-stability unit remains `percent-shoulder-width`.
3. Run the focused test and confirm it fails as incomplete with the old `hip_mid.y` driver.

### Task 2: Replace the squat driver

**Files:**
- Modify: `services/posture-inference/app/analysis/sequence.py`

1. Compute the ankle midpoint from the already-required left and right ankle points.
2. Return `(hip_mid.y - ankle_mid.y) / shoulder_width * 100` as the squat driver.
3. Run the new regression and the existing action-specific movement tests.

### Task 3: Regression and GPU verification

**Files:**
- Update: `docs/posture-capture-lab-testing.md`

1. Run the complete Python suite.
2. Run TypeScript and focused dynamic frontend tests.
3. Restart the GPU service.
4. Repeat one slow squat and record frame validity, phase completeness, metrics, and timing.
5. Run `git diff --check` without committing, pushing, or deploying.
