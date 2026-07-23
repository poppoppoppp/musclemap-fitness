# Posture Dominant Subject Selection Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Prevent weak RTMDet false-positive person candidates from invalidating single-person posture frames while preserving strict rejection of credible multiple people.

**Architecture:** Add a pure dominant-subject selection function inside the inference policy. Configuration supplies relative score and area criteria; `InferenceEngine` selects once, runs RTMPose at most once, and reports ignored candidates as warnings.

**Tech Stack:** Python, Pydantic Settings, NumPy, Pytest, FastAPI, MMPose/MMDetection.

---

### Task 1: Lock selection behavior with failing tests

**Files:**
- Modify: `services/posture-inference/tests/test_inference_policy.py`

1. Add a test where a high-confidence full-body primary and weak secondary candidate should select the primary and emit a warning.
2. Add a test where a similarly confident, similarly sized second person must still raise `MULTIPLE_PEOPLE_DETECTED`.
3. Run `pytest tests/test_inference_policy.py -v` from `services/posture-inference` and confirm the new weak-secondary case fails for the expected reason.

### Task 2: Implement the minimal dominant-subject policy

**Files:**
- Modify: `services/posture-inference/app/config.py`
- Modify: `services/posture-inference/app/inference.py`
- Modify: `services/posture-inference/app/schemas.py` only if warning diagnostics require a schema extension already supported by API conventions.
- Modify: service construction call sites that instantiate `InferenceEngine`.

1. Add centrally configured relative score and area criteria.
2. Implement a pure candidate selection helper.
3. Preserve `NO_PERSON_DETECTED` and credible multi-person rejection.
4. Add `IGNORED_WEAK_PERSON_CANDIDATE` to the normal inference warnings when weak candidates are ignored.
5. Run the focused inference policy tests and confirm they pass.

### Task 3: Protect API and dynamic limits

**Files:**
- Modify: `services/posture-inference/tests/test_api.py` or the existing dynamic API test module only if a regression assertion is missing.

1. Assert a dynamic request still invokes detection once per submitted frame with no retry.
2. Assert the total frame limit and failure counting behavior are unchanged.
3. Run the dynamic API and inference policy test modules.

### Task 4: Regression and real GPU verification

**Files:**
- Update: `docs/posture-capture-lab-testing.md`

1. Run the complete Python suite.
2. Restart the GPU service so startup-loaded configuration and models use the new policy.
3. Repeat one slow squat and record valid/total frames, warnings, timing, and phase completeness.
4. Run real multi-person, no-person, corrupt-image, and request-limit checks.
5. Run `git diff --check` and record results without committing, pushing, or deploying.
