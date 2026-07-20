# Posture model sourcing and deployment specification

Status: Phase 2 browser capture prototype implemented with pinned local MediaPipe assets. Batch-one Phase 3A PyTorch reference implementation began on 2026-07-20 with pinned MMPose 1.3.2 and official RTMPose/RTMDet checkpoints.

## Non-negotiable source policy

Frontend pose resources may only come from Google AI Edge official documentation, the official [`google-ai-edge/mediapipe`](https://github.com/google-ai-edge/mediapipe) repository, official MediaPipe Web Tasks examples, and official Pose Landmarker model releases. The implementation must use [MediaPipe Tasks Pose Landmarker for Web](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/web_js), not the legacy MediaPipe Pose API. Unknown CDN mirrors, unversioned React wrappers, blogs, file shares, and personal model repositories are prohibited.

Backend pose resources may only come from the official [OpenMMLab MMPose repository](https://github.com/open-mmlab/mmpose), the official MMPose Model Zoo and download service, and official [MMDeploy](https://github.com/open-mmlab/mmdeploy) documentation. Third-party weights, unexplained ONNX files, unmatched configurations/checkpoints, and models without a known keypoint schema, training-data basis, or licence are prohibited.

Before adopting any artifact, record its exact official URL, fixed version, file name, byte size, SHA-256, keypoint schema, licence review, and the date it was obtained. Never use `latest` as a production version constraint. Large model weights stay outside Git.

## Phase 2: browser capture assistance

The browser candidate is MediaPipe Tasks Pose Landmarker for Web. Its scope is deliberately limited to:

- live skeleton preview using the 33-point schema;
- whole-body, direction, occlusion, confidence, and stability checks;
- automatic countdown and video-frame capture;
- local best-frame screening.

MediaPipe output is capture assistance, not the formal high-accuracy posture result. It must never be promoted to a backend result when RTMPose is unavailable.

Benchmark official Lite, Full, and Heavy Pose Landmarker variants on representative phones. Evaluate Full first; downgrade to Lite only when mainstream devices cannot sustain the agreed frame rate and latency. Heavy is an offline/high-performance candidate, not a default. Record package/model versions, URLs, sizes, hashes, tested devices, average FPS, latency, memory use, load time, and failure behaviour.

Load the model once per runtime session from bundled static assets or a controlled versioned asset origin. Do not redownload it on every frame or page entry. Until the runtime is ready, show an explicit loading state—never a fake scan animation or fabricated landmarks. Camera denial, model-load failure, insufficient performance, poor capture quality, and unsupported devices require honest fallback states.

The future browser implementation may be placed under `src/features/posture/capture/mediapipe/`, with separate runtime creation, landmark mapping, quality rules, frame selection, and runtime-status modules. The current cross-platform contracts live in `src/types/postureAnalysis.ts`; they intentionally contain no runtime implementation.

## Phase 3 baseline and benchmark gate

The first official backend baseline is:

```text
MMPose alias: body26
Pose config: rtmpose-m_8xb512-700e_body8-halpe26-256x192
Keypoint schema: halpe26
Human detector: RTMDet-m
```

This model is the initial reference because its 26 points better cover body alignment and foot-related analysis than a 17-point model while retaining a practical first-deployment size. Do not make RTMW the sole production model in the first implementation.

Use the same representative test set to compare:

```text
RTMPose body26 256×192
RTMPose wholebody 256×192
RTMW-m 256×192
RTMW-l 384×288
```

The promotion gate must measure the points and operating conditions MuscleMap actually needs: ear, shoulder, hip, knee, ankle and foot stability; front, back and lateral stance; occlusion; multi-frame jitter; CPU/GPU latency; memory; and failure rate. Generic dataset AP alone is insufficient. Promote RTMW only if it materially improves these measures at an acceptable cost.

## Artifact acquisition and manifest

At the start of the model phase, verify the current config name against the official Model Zoo before running any command. A changed or missing alias is a stop condition, not permission to silently substitute another model. Use official MIM tooling and the official download command for the verified config. Do not copy checkpoint URLs from search results.

Each acquired artifact must be represented in `models/manifest.json`, including at least:

```json
{
  "modelId": "rtmpose-body26-v1",
  "framework": "mmpose",
  "config": "rtmpose-m_8xb512-700e_body8-halpe26-256x192",
  "checkpointFile": "<local file name>",
  "checkpointSha256": "<sha256>",
  "downloadedAt": "<ISO-8601 timestamp>",
  "keypointSchema": "halpe26",
  "runtime": "pytorch",
  "source": "OpenMMLab official model zoo"
}
```

The later model phase must add a controlled download script, a hash verification script, an example manifest, and an ignored local model directory. Those files are deliberately absent now because the current phase may not install or download models.

## Implementation order

### 3A — official PyTorch reference

Run the official MMPose Python path first:

```text
input image → RTMDet-m person detection → RTMPose body26
            → ordered keypoint coordinates and confidence → provenance-rich JSON
```

Validate the config/checkpoint pairing, keypoint numbering, reference outputs, test images, and CPU plus local RTX 3050 performance. ONNX work cannot begin before these outputs are stable.

### 3B — independent inference service

Build a separate Python service using FastAPI, Pydantic, OpenCV, MMPose, PyTorch, and pinned dependencies. The minimum API is:

```text
GET  /health
GET  /v1/models
POST /v1/posture/analysis
GET  /v1/posture/analysis/{jobId}
```

Synchronous processing is acceptable during reference development; switch to asynchronous jobs only when video analysis or cold starts justify it. Every result must include analysis version, model identity/version, keypoint schema, runtime/device, processing time, detections, quality, and warnings. A bare keypoint array is invalid.

### 3C — ONNX Runtime optimization

After the PyTorch baseline is accepted, export through official MMDeploy. Evaluate ONNX Runtime CPU first and ONNX Runtime CUDA for GPU. TensorRT is a later option only with measured benefit.

Every exported model requires a PyTorch-versus-ONNX regression on identical images and person boxes, checking keypoint order, coordinate error, confidence error, latency, and failed images. An export that exceeds the agreed error threshold cannot replace the reference model.

## Deployment boundary

The frontend remains on Vercel. The formal model must not run in an ordinary Vercel Function or enter the frontend bundle.

```text
MuscleMap frontend (Vercel)
        │ HTTPS API
        ▼
Independent posture inference service
FastAPI + RTMPose
        ├─ CPU ONNX Runtime
        └─ GPU ONNX Runtime / TensorRT
```

The service must be Docker-deployable and load detector and pose models once at startup. Never download, install, or initialize the full model stack per request. Do not place cloud credentials in source.

Reserve these service environment variables:

```text
POSTURE_MODEL_DIR
POSTURE_MODEL_ID
POSTURE_DEVICE
POSTURE_RUNTIME
POSTURE_MAX_UPLOAD_MB
POSTURE_ALLOWED_ORIGINS
POSTURE_STORAGE_MODE
```

The frontend later receives its service base URL through `VITE_POSTURE_INFERENCE_API_URL`. Production infrastructure remains undecided until CPU containers, on-demand serverless GPU, persistent low-end GPU, and local inference have been measured for cold start, model load, latency, RAM/VRAM, cost per analysis, concurrency, and failure rate.

Local development begins on Windows with an isolated Python environment, PyTorch CUDA, MMPose, FastAPI, and the available RTX 3050, while also exercising the CPU path. The test environment uses the Docker service.

## Failure and data handling

When a model or service is unavailable:

- never fabricate a result or scan;
- never present MediaPipe capture landmarks as the formal backend result;
- show an explicit unavailable/retry state and retain captured material where consent and storage policy permit;
- allow safe resubmission without repeated capture;
- preserve model/service error codes and retryability.

MediaPipe data may still support preview, capture-quality guidance, and frame selection after a backend failure. It cannot create a formal posture conclusion.

## Phase 2 acquired asset record

The browser prototype pins `@mediapipe/tasks-vision` to `0.10.35`. Exact npm integrity, model URLs, byte sizes, SHA-256 values, acquisition date, keypoint schema, purpose and licence sources are recorded in [`public/models/posture/manifest.json`](../public/models/posture/manifest.json). The controlled model downloader verifies the reviewed SHA-256 before replacing a local file. `npm run posture:assets:verify` checks the package lock, Full and Lite models, and every WASM file and is a mandatory production-build precondition.

The runtime imports the pinned package's ES module WASM loader and binary through Vite so development and production receive local hashed assets. It never changes to a remote CDN. The Full and Lite model weights remain ignored local artifacts in accordance with the large-weight boundary.

MediaPipe's Web result currently exposes per-landmark visibility but does not type a per-landmark presence field. The implementation consumes a presence value if the runtime supplies one and otherwise relies on the configured task-level `minPosePresenceConfidence` gate, then still requires visibility, valid coordinates, edge clearance, bilateral reliability and temporal stability. It does not invent a per-landmark presence score.

All capture thresholds and score weights live in `src/features/posture/capture/poseLandmarkerConfig.ts`. They are prototype parameters awaiting real-device calibration and are not medical thresholds. HTTPS phone testing and the manual acceptance matrix are documented in [`docs/posture-capture-lab-testing.md`](posture-capture-lab-testing.md).

## Licence and release audit

Before implementation, create `docs/posture-model-licenses.md`. Audit MediaPipe code and model licences, MMPose code, RTMPose/RTMW weights, training-dataset conditions, MMDeploy, and ONNX Runtime separately. A repository licence does not automatically cover every pretrained weight or training dataset.

For each production dependency, record name, version, source, licence, training data, commercial restrictions, attribution, and local hash. Unconfirmed licences block release.

No model phase is complete without official-source notes, fixed versions, manifests, controlled download and hash verification, local commands, CPU/GPU results, sample structured I/O, Docker instructions, API documentation, PyTorch/ONNX regression evidence, known failures, unimplemented capabilities, and the licence inventory.

## Batch-one acquired backend artifacts

The initial backend baseline uses the exact `body26` alias configuration documented by MMPose 1.3.2 and the person-specific RTMDet-m configuration referenced by the same release. Both checkpoints were acquired from `download.openmmlab.com` on 2026-07-20 and are stored only under the ignored service checkpoint directory.

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `rtmpose-m_body26_256x192.pth` | 55,897,557 | `4d3e73ddd31222b7b0db36caeda396af1d7630c3b5a60451bdfa99a79e8dbb90` |
| `rtmdet-m_person_640.pth` | 99,013,732 | `35b0c7406499e0d141dd6a0235db07c10d2bee8f891f8f4e353c16a009de30e8` |

The service must verify these values before loading either model. The checkpoint filename hash is not treated as sufficient verification.
