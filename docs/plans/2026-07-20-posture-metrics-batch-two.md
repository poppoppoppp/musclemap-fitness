# Posture metrics batch two implementation plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Convert static and bounded slow-movement RTMPose keypoints into transparent, versioned measurements in the Capture Lab without producing posture conclusions.

**Architecture:** Add a pure Python analysis package to the existing inference service, keep the batch-one endpoint stable, add static JSON and bounded dynamic multipart endpoints, and add an isolated dynamic-camera experiment plus metric presentation to the existing route. Raw, normalized, filtered, and derived layers remain separate.

**Tech Stack:** Python 3.10, FastAPI, Pydantic, NumPy, OpenMMLab PyTorch runtime, React, TypeScript, Playwright.

---

### Task 1: Analysis contracts and geometry

**Files:**
- Create: `services/posture-inference/app/analysis/config.py`
- Create: `services/posture-inference/app/analysis/models.py`
- Create: `services/posture-inference/app/analysis/geometry.py`
- Test: `services/posture-inference/tests/test_analysis_geometry.py`

1. Write failing tests for vector angles, signed point-to-line distance, normalization, confidence gates, translation/scale invariance, and semantic mirroring.
2. Run the focused test and verify failure because the analysis package is absent.
3. Implement the minimum immutable models and pure geometry functions.
4. Run the focused test and verify it passes.

### Task 2: Static measurements

**Files:**
- Create: `services/posture-inference/app/analysis/static_metrics.py`
- Test: `services/posture-inference/tests/test_static_analysis.py`

1. Write failing tests for all seven measurements, view restrictions, same-side selection, missing points, and low-confidence points.
2. Verify the expected failures.
3. Implement the explicit formulas from the approved design without clinical ranges.
4. Verify focused tests pass.

### Task 3: Timestamp sampling and movement analysis

**Files:**
- Create: `services/posture-inference/app/analysis/sequence.py`
- Test: `services/posture-inference/tests/test_movement_analysis.py`

1. Write failing tests for irregular-timestamp uniform selection, 40-frame cap, raw/filtered separation, outliers, real-time phases, three action metrics, and incomplete repetitions.
2. Verify expected failures.
3. Implement five-FPS per-action configuration, timestamp selection, MAD marking, median-3/EMA filtering, robust summaries, and phase detection.
4. Verify focused tests pass.

### Task 4: Static and bounded dynamic APIs

**Files:**
- Modify: `services/posture-inference/app/config.py`
- Modify: `services/posture-inference/app/schemas.py`
- Modify: `services/posture-inference/app/main.py`
- Modify: `services/posture-inference/app/image_input.py`
- Test: `services/posture-inference/tests/test_analysis_api.py`

1. Write failing API tests for static analysis and dynamic ordering, timestamps, failures-without-retry, frame count, per-frame bytes/pixels, total bytes, and total pixels.
2. Verify expected failures.
3. Add `POST /v1/posture/analysis/static` and `POST /v1/posture/analysis/movement`, reusing the loaded engine once and attempting each submitted frame once.
4. Verify the focused API and full Python suites pass.

### Task 5: Frontend contracts and pure timestamp selection

**Files:**
- Modify: `src/types/postureAnalysis.ts`
- Create: `src/features/posture/capture/analysis/analysisConfig.ts`
- Create: `src/features/posture/capture/analysis/selectFramesByTimestamp.ts`
- Create: `src/features/posture/capture/inference/postureAnalysisApi.ts`
- Test: `src/tests/posture-analysis-contract.spec.ts`
- Test: `src/tests/posture-dynamic-sampling.spec.ts`

1. Write failing Playwright/unit tests for response contracts, irregular timestamp selection, endpoints, preserved timestamps, and the 40-frame cap.
2. Verify expected failures.
3. Implement the minimum types, selector, and API client.
4. Verify focused tests pass.

### Task 6: Static measurement presentation

**Files:**
- Create: `src/features/posture/capture/hooks/useStaticPostureAnalysis.ts`
- Create: `src/features/posture/capture/components/StaticMetricResults.tsx`
- Modify: `src/features/posture/capture/components/CaptureResult.tsx`
- Test: `src/tests/posture-static-analysis-ui.spec.ts`

1. Write failing UI tests for valid metrics, side selection, formulas, units, provenance, and unavailable reasons.
2. Verify expected failures.
3. Add analysis from the already-returned RTMPose response without another inference request.
4. Verify focused and existing batch-one UI tests pass.

### Task 7: Dynamic camera experiment and result UI

**Files:**
- Create: `src/features/posture/capture/hooks/useDynamicPostureCapture.ts`
- Create: `src/features/posture/capture/components/DynamicCaptureLab.tsx`
- Create: `src/features/posture/capture/components/DynamicAnalysisResult.tsx`
- Create: `src/features/posture/capture/components/TrajectoryChart.tsx`
- Modify: `src/pages/PostureCaptureLabPage.tsx`
- Test: `src/tests/posture-dynamic-capture.spec.ts`

1. Write failing UI tests for action selection, explicit side, countdown, paced phases, bounded selection, loading/success/errors, frame scrubber, overlay, and cleanup.
2. Verify expected failures.
3. Implement the isolated in-memory dynamic camera flow and simple SVG charts.
4. Verify focused tests and original Capture Lab tests pass.

### Task 8: Documentation and complete verification

**Files:**
- Modify: `services/posture-inference/README.md`
- Modify: `docs/posture-capture-lab-testing.md`
- Modify: `docs/plans/task.md`

1. Document formulas, action protocol, API limits, non-clinical boundary, and technical versus human evidence.
2. Run Python tests, frontend full tests, TypeScript, production build, model hashes, and `git diff --check`.
3. Run GPU and CPU static/dynamic inference and all bounded failure cases.
4. Ask the user only when the finished UI is ready for front/side/back and three-action camera acceptance.

No commit steps are included because the user explicitly prohibited commits, pushes, and deployment.
