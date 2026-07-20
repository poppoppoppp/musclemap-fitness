# Posture RTMPose Batch One Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Submit the Capture Lab best-frame blob to an official local RTMDet-m plus RTMPose body26 PyTorch service and display an honest four-mode keypoint comparison.

**Architecture:** A separately versioned FastAPI service owns model verification and one-time startup loading. The frontend adds a small API client, explicit request-state hook, HALPE renderer, and semantic comparison layer without touching formal posture repositories.

**Tech Stack:** Python 3.10, FastAPI, Pydantic, OpenCV, PyTorch, MMEngine, MMCV, MMDetection, MMPose, React 19, TypeScript, Playwright.

---

### Task 1: Freeze scope and provenance contracts

**Files:**
- Modify: `.gitignore`
- Modify: `.env.example`
- Modify: `docs/posture-model-licenses.md`
- Modify: `docs/posture-model-sourcing-and-deployment.md`
- Create: `services/posture-inference/models/manifest.json`
- Create: `services/posture-inference/requirements.txt`
- Create: `services/posture-inference/requirements-cu121.txt`

**Steps:**
1. Add ignored checkpoint, temporary sample, benchmark-output, and Python-environment paths.
2. Record exact official config/checkpoint URLs and reviewed dependency versions.
3. Download both official checkpoints outside Git, calculate bytes and SHA-256, and put those immutable values in the manifest.
4. Add a Python verifier test that fails on a corrupt checkpoint; run it and confirm RED.
5. Implement the minimal manifest verifier; rerun and confirm GREEN.

### Task 2: Define API schemas and image validation

**Files:**
- Create: `services/posture-inference/app/__init__.py`
- Create: `services/posture-inference/app/config.py`
- Create: `services/posture-inference/app/schemas.py`
- Create: `services/posture-inference/app/errors.py`
- Create: `services/posture-inference/app/image_input.py`
- Create: `services/posture-inference/tests/test_image_input.py`
- Create: `services/posture-inference/tests/test_api_contract.py`

**Steps:**
1. Write failing tests for JPEG/PNG/WebP decode, corrupt input, unsupported type, upload limit, and decoded pixel limit.
2. Run the focused tests and confirm failures are caused by missing production modules.
3. Implement bounded reading, OpenCV decoding, and stable error models.
4. Rerun focused tests and confirm GREEN.
5. Define success contracts with explicit `original-image-pixels` coordinates and exactly 26 named HALPE points.

### Task 3: Implement one-time official inference runtime

**Files:**
- Create: `services/posture-inference/app/model_manifest.py`
- Create: `services/posture-inference/app/inference.py`
- Create: `services/posture-inference/tests/test_inference_policy.py`

**Steps:**
1. Write failing tests for zero-person, one-person, multi-person, keypoint ordering, low-confidence warnings, and timing fields using an injected detector/pose boundary.
2. Confirm RED.
3. Implement RTMDet result filtering, strict single-person policy, `inference_topdown`, HALPE naming, and timing collection.
4. Confirm focused tests GREEN.
5. Initialize detector and pose models only in the engine constructor and make all request calls reuse them.

### Task 4: Expose FastAPI lifecycle and endpoints

**Files:**
- Create: `services/posture-inference/app/main.py`
- Create: `services/posture-inference/tests/conftest.py`
- Create: `services/posture-inference/tests/test_api.py`
- Create: `services/posture-inference/README.md`

**Steps:**
1. Write failing TestClient cases for `/health`, `/v1/models`, successful multipart inference, and every structured failure.
2. Confirm RED.
3. Implement lifespan engine creation, CORS from configuration, endpoint handlers, and exception translation.
4. Confirm all Python unit/API tests GREEN.
5. Document Windows GPU/CPU startup commands and environment variables.

### Task 5: Add controlled acquisition and benchmark tools

**Files:**
- Create: `services/posture-inference/scripts/download_models.py`
- Create: `services/posture-inference/scripts/verify_models.py`
- Create: `services/posture-inference/scripts/benchmark.py`
- Create: `services/posture-inference/tests/test_model_tools.py`

**Steps:**
1. Write failing tests for official-host allow-list, temporary download, hash mismatch, and atomic replacement.
2. Confirm RED.
3. Implement controlled acquisition and verification against the manifest.
4. Confirm GREEN and verify the real checkpoints.
5. Implement benchmark output for load, first inference, warmed iterations, RSS, CUDA allocated/reserved memory, and failures.

### Task 6: Define frontend inference and comparison contracts

**Files:**
- Modify: `src/types/postureAnalysis.ts`
- Create: `src/features/posture/capture/inference/halpe26.ts`
- Create: `src/features/posture/capture/inference/keypointComparison.ts`
- Create: `src/features/posture/capture/inference/postureInferenceApi.ts`
- Create: `src/tests/posture-keypoint-comparison.spec.ts`
- Create: `src/tests/posture-inference-api.spec.ts`

**Steps:**
1. Write failing tests for all 17 exact semantic mappings, explicitly non-comparable eyes/toes/foot-index, pixel conversion, shoulder/torso/bbox normalization, low-confidence exclusion, and structured API errors.
2. Confirm RED.
3. Implement the minimal contracts, client, mapping, and comparison functions.
4. Confirm focused tests GREEN.

### Task 7: Implement request state and overlays

**Files:**
- Create: `src/features/posture/capture/hooks/useHighAccuracyKeypoints.ts`
- Create: `src/features/posture/capture/components/KeypointComparisonCanvas.tsx`
- Modify: `src/features/posture/capture/components/CaptureResult.tsx`
- Create: `src/tests/posture-capture-rtmpose.spec.ts`

**Steps:**
1. Write failing browser tests for the explicit submit button, loading state, four view modes, success metadata, low-confidence points, dual overlay, real server error text, and retrying the identical blob.
2. Confirm RED with intercepted HTTP only at the test boundary.
3. Implement request state without modifying capture-candidate ownership.
4. Implement RTMPose/HALPE and dual overlays with original image dimensions.
5. Implement technical metadata and error UI; confirm focused browser tests GREEN.

### Task 8: Acquire and document open-image technical fixtures

**Files:**
- Modify: `docs/posture-capture-lab-testing.md`
- Create: `services/posture-inference/benchmark/open-image-sources.example.json`

**Steps:**
1. Select unedited real front, lateral, and back full-body photographs from official or clearly open-licensed sources.
2. Record source URL, author/provider, exact licence, acquisition date, view, local SHA-256, and technical-only purpose.
3. Store downloaded images only in the ignored local benchmark directory.
4. Run real GPU and CPU inference for all three views and retain JSON results outside Git.
5. Record that these do not satisfy Capture Lab human acceptance.

### Task 9: Failure and stability verification

**Files:**
- Modify: `docs/posture-capture-lab-testing.md`

**Steps:**
1. Test no-person, official open multi-person, corrupt bytes, unsupported type, upload limit, and decoded-pixel limit against the real service.
2. Stop the backend and verify the frontend retains the best frame and retries the same blob after restart.
3. Run continuous GPU and CPU benchmark loops and record latency, memory, and failures.
4. Document actual results and any blockers without substituting mock results.

### Task 10: Full verification and human-acceptance handoff

**Files:**
- Modify: `docs/posture-capture-lab-testing.md`
- Modify: `docs/plans/task.md`

**Steps:**
1. Run all Python unit/API tests.
2. Run the complete Playwright suite.
3. Run `npx tsc -b --pretty false` and `npm run build`.
4. Run model hashes and `git diff --check`.
5. Re-read the approved scope and verify no findings, recommendations, formal persistence, RTMW, ONNX, TensorRT, or cloud GPU work was added.
6. Ask the user to open Capture Lab and capture actual front, side, and back frames for the separate final acceptance checklist.
