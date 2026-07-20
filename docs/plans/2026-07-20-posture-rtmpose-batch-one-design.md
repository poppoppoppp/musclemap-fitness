# Posture RTMPose batch one design

Date: 2026-07-20  
Status: approved for implementation

## Scope

Batch one connects the in-memory Capture Lab best frame to a local FastAPI service that runs the official OpenMMLab RTMDet-m person detector and RTMPose-m body26 pose estimator through PyTorch. The result is a technical keypoint comparison only. It does not create posture findings, screening records, plans, exercise recommendations, trends, or medical claims.

The formal posture-analysis entry and all existing screening and plan repositories remain unchanged.

## Existing capture boundary

`CaptureCandidate` owns a compressed in-memory `Blob`, encoded dimensions, capture timestamp, quality scores, and the MediaPipe 33 landmarks captured from the same video frame. Candidates are bounded to five frames and six MiB total; the highest score is `candidates[0]`.

The blob and landmarks live only in the current Capture Lab component tree. Retaking, changing capture mode, leaving the route, or unmounting destroys them. The high-accuracy request operates directly on the best candidate blob. A failed request does not clear or replace that candidate, so the user can retry the identical frame.

## Architecture

The local service uses the explicit official APIs instead of the convenience inferencer:

```text
multipart image
  -> bounded byte read and OpenCV decode
  -> RTMDet-m person detections
  -> require exactly one eligible person
  -> RTMPose body26 top-down inference
  -> provenance-rich pixel-coordinate response
```

The detector and pose estimator load once during FastAPI lifespan startup. Requests never download or initialize models. Startup fails honestly when the configured checkpoint, manifest, hash, dependency, or device is invalid.

The frontend reads the base URL exclusively from `VITE_POSTURE_INFERENCE_API_URL`. It submits the original best-frame blob as multipart data and owns four display modes: original, MediaPipe, RTMPose, and both. Backend failures are rendered from structured errors and preserve the candidate for retry.

## Model baseline and dependencies

- MMPose 1.3.2 configuration: `rtmpose-m_8xb512-700e_body8-halpe26-256x192`
- Pose checkpoint: official OpenMMLab RTMPose body26 checkpoint
- Detector configuration: MMPose 1.3.2 `rtmdet_m_640-8xb32_coco-person.py`
- Detector checkpoint: official RTMDet-m person checkpoint referenced by MMPose 1.3.2
- Runtime: PyTorch reference inference
- Development environment: isolated Python 3.10; PyTorch 2.1.0 CUDA 12.1, torchvision 0.16.0, MMCV 2.1.0, MMDetection 3.2.0, MMPose 1.3.2, NumPy 1.26.4

The same CUDA-enabled environment exercises `cuda:0` and `cpu`. Model files are acquired only from official URLs, recorded in a manifest, SHA-256 verified before startup, and ignored by Git.

## API contract

### `GET /health`

Returns service state, readiness, runtime, device, and loaded model IDs.

### `GET /v1/models`

Returns detector and pose configuration names, versions, checkpoint hashes, keypoint schema, coordinate space, and runtime metadata.

### `POST /v1/posture/keypoints`

Accepts multipart `image` plus optional `view`. Supported image encodings are JPEG, PNG, and WebP. The request is bounded by configured upload bytes and decoded pixel count.

The success response contains request ID, model and detector provenance, image dimensions, timing breakdown, selected person bounding box and confidence, all 26 ordered HALPE keypoints, runtime/device information, coordinate-space description, and warnings.

Coordinates are floating-point pixels in the decoded original image: origin at the top-left, x increasing right, y increasing down. The service does not mirror, resize, rotate, or normalize response coordinates. The frontend divides by the returned image width and height only for drawing.

No person, multiple persons, corrupt data, unsupported media, excessive upload, excessive decoded dimensions, unavailable model, and internal inference failures return structured errors with stable codes and retryability. Multiple eligible people are rejected instead of selecting one silently.

## HALPE26 and MediaPipe mapping

Direct semantic comparisons use only:

- nose;
- left/right ear;
- left/right shoulder, elbow, wrist;
- left/right hip, knee, ankle;
- left/right heel.

HALPE head, neck, central hip, big toes, and small toes are not direct MediaPipe matches. MediaPipe eye variants and `foot_index` are not treated as HALPE eye centres or specific toes. They remain drawable and are labelled non-comparable.

MediaPipe normalized coordinates are converted into pixels of the same candidate image. Front and back differences use the mean shoulder width of both models when available. Lateral differences use mean shoulder-to-hip torso length. The fallback is the RTMDet bounding-box diagonal. Low-confidence points do not enter summaries. Results report per-point normalized distance plus median and P95 as model-output differences, never accuracy or clinical confidence.

## UI states

The best-frame result starts without backend analysis. A deliberate button initiates analysis. The control exposes idle, loading, success, and structured error states. Loading disables duplicate submission but does not remove the image. Success displays the model, detector, runtime, device, timing, bounding box score, low-confidence points, comparable-point count, normalization basis, median, and P95 difference.

The image selector controls original, MediaPipe, RTMPose, or dual overlay. MediaPipe and RTMPose use distinct colours and the dual view includes a legend. All copy states that this is a technical comparison rather than a posture conclusion.

## Verification

Automated service tests use an injected deterministic engine only to verify HTTP contracts and error translation; production never exposes a fake engine. Separate real-model tests exercise the downloaded official checkpoints.

Openly licensed real photographs are temporary technical fixtures outside Git. Testing documentation records URL, author/source, licence, acquisition date, view, and technical purpose. Generated people, rendered anatomy figures, and pose-edited images are prohibited.

Evidence is split into:

1. open-image technical validation: service, three views, API and failure handling;
2. Capture Lab human acceptance: exact browser blob, orientation, detector box, overlay alignment, common-point differences, low-confidence points, same-frame retry, and end-to-end CPU/GPU performance.

The second group remains pending until the user is asked to capture front, side, and back best frames in the completed UI.

## Existing-work protection

The pre-change dirty tree is copied with hashes to an ignored `test-results/posture-batch1-prechange-*` directory. Implementation uses surgical patches only. No reset, checkout, clean, repository-wide formatter, commit, push, or deployment is allowed.
