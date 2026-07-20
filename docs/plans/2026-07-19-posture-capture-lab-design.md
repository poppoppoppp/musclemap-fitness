# MediaPipe posture capture lab design

Date: 2026-07-19
Status: approved for Phase 2 implementation

## Scope and boundary

The capture lab is an isolated browser experiment at `/growth/posture/capture-lab`. It provides live MediaPipe Pose Landmarker guidance, bounded multi-frame capture, best-frame selection, and technical quality telemetry. It does not write to screening or plan repositories, create findings, measure posture, enter trends, or change the formal `Start posture analysis` entry.

The runtime output remains `capture-assistance-only`. Refreshing, leaving, retaking, or encountering an error destroys all session results and media resources.

## Runtime architecture

The default runtime is a dedicated Web Worker running the pinned official `@mediapipe/tasks-vision` package in `VIDEO` mode. The main thread owns the camera, UI, timing, canvas overlay, image-quality sampling, and bounded candidate store.

Only one inference may be in flight. The main thread creates and transfers an `ImageBitmap` only when the Worker reports idle. Frames arriving while inference is active are counted and dropped before bitmap creation. The Worker closes every transferred bitmap in a `finally` block and returns landmarks, inference duration, and the monotonic source timestamp.

Timestamps originate from `performance.now()` and are clamped to be strictly greater than the previous inference timestamp. Ordinary wall-clock dates never drive video inference ordering.

Startup capability checks cover camera APIs, Worker construction, `createImageBitmap`, transferable `ImageBitmap` support, and Canvas APIs. A failed Worker path produces an explicit unsupported state. A main-thread fallback, if enabled, is labelled and capped at a materially lower inference rate; there is no silent high-frequency fallback.

## Models and assets

Full is the default model and Lite is the explicit user-selected degradation path. Switching models closes the old Pose Landmarker and Worker before loading the replacement, so both models never remain resident simultaneously.

All models and WASM assets are local, versioned, and hash verified before development or production builds. Runtime code never falls back to a remote CDN. The manifest records package version and lockfile integrity, official URLs, byte sizes, SHA-256 values, acquisition date, intended use, and licence source.

## Capture state machine

`idle -> capability-check -> loading-model -> requesting-camera -> live -> qualifying -> countdown -> capturing -> result`

Errors are explicit states with stable codes for unsupported capability, permission denial, missing device, occupied device, insecure context, model/WASM load failure, inference failure, and insufficient performance.

The three user-facing modes are front, back, and side. Front and side use geometry heuristics only. Back is a user-selected direction; the runtime validates framing, body coverage, centring, expansion, occlusion, and stability and does not claim automatic front/back classification.

## Memory and backpressure invariants

- Target inference starts at 10 FPS and stays within the configurable 8–12 FPS experiment range.
- At most one Worker inference is in flight.
- Busy frames are dropped without queueing.
- Every `ImageBitmap` is closed immediately after inference or failure.
- Capture continuously maintains only the top five candidates.
- Candidate images are encoded WebP/JPEG blobs, never retained RGBA buffers.
- Candidate dimensions are capped at 960 x 1280 with a 1.5 MiB per-blob limit.
- Total candidate bytes are capped at 6 MiB. A candidate that would exceed either hard limit is rejected or replaces a lower-ranked candidate only when the final bounded set fits.
- Object URLs are created only for displayed candidates and are revoked on replacement, retake, exit, or error.
- Unmount and restart terminate the Worker, stop every media track, cancel animation work, close any pending bitmap, and clear candidate blobs and URLs.

## Experimental quality parameters

All values below are initial capture heuristics. They are not medical thresholds, diagnostic cut-offs, or posture accuracy claims. They must be calibrated on real supported devices before production use.

| Parameter | Initial value | Basis | Calibration status |
| --- | ---: | --- | --- |
| Landmark visibility | 0.65 | Conservative prototype visibility gate | Real-device calibration required |
| Landmark presence | 0.65 | Reject inferred/absent points even when coordinates exist | Real-device calibration required |
| Edge margin | 0.035 normalized | Reject points clipped or too close to frame edges | Real-device calibration required |
| Body height | 55%–90% | Full-body framing guidance | Real-device calibration required |
| Horizontal centre deviation | 10% | Mobile portrait composition guidance | Real-device calibration required |
| Continuous qualifying time | 1.5 s | Avoid starting countdown on transient good frames | Real-device calibration required |
| Countdown | 3 s | User preparation time | Usability validation required |
| Capture duration | 4 s | Enough stable samples without unbounded retention | Usability/performance validation required |
| Mean luma minimum | 55/255 | Prototype low-light heuristic | Camera-specific calibration required |
| Blur threshold | Configured gradient/Laplacian score | Fixed-size luminance sample | Camera-specific calibration required |
| Full performance warning | Sustained processed FPS below 8 | Lower bound of target analysis range | Device-matrix calibration required |
| Candidate weights | completeness .35, reliability .30, sharpness .20, stability .15 | Capture-quality prioritisation only | Real-device calibration required |

A landmark is reliable only when visibility and presence pass, coordinates are finite and inside the frame, the point is outside the edge danger zone, its required bilateral counterpart is reliable when applicable, and recent motion is stable. Coordinates alone never imply visibility.

## Image and pose quality

Whole-body checks use view-specific required groups for head, shoulders, hips, knees, ankles, heels, and feet. Distance derives from reliable landmark bounds. Centring uses the shoulder/hip centre. Front and side stance checks compare shoulder and hip projected spans to torso height; back mode deliberately omits an automatic front/back claim.

### Approved side-view reliability amendment (2026-07-20)

Real-camera acceptance showed that a true side view frequently lowers the far-side knee and other far-side landmark visibility because the near limb physically occludes it. Applying the front/back bilateral hard gate to side mode therefore rejects a valid side stance.

For side mode, capture coverage must use one internally consistent left or right chain: ear, shoulder, hip, knee, ankle, heel, and foot. The selected chain must pass the same visibility, optional presence, coordinate, and edge rules as every other reliable landmark. Evidence may not be mixed across sides. The opposite-side coordinates may participate only in the existing projected-span stance heuristic when finite and in-frame; they do not become visibility evidence. Front and back retain bilateral visibility requirements. This is a capture-view correction, not a medical threshold or orientation classifier.

Lighting uses a small fixed-resolution luminance sample. Blur uses a fixed-resolution sharpness heuristic to reduce source-resolution dependence. Stability uses a rolling, torso-normalised landmark window with global translation removed.

## Capture and best-frame selection

After all blocking rules remain continuously valid for 1.5 seconds, a three-second countdown begins. A failed blocking rule interrupts the countdown. Capture then samples compressed candidates for four seconds while inference continues.

Each eligible frame receives a capture-only score derived from completeness, landmark reliability, sharpness, and stability. A bounded top-K store updates incrementally, immediately discarding lower-ranked blobs. The UI calls these values capture-quality metrics, never medical confidence or analysis accuracy.

## Result telemetry

The in-memory result shows the model variant, runtime mode, model load duration, processed FPS, average and P95 inference latency, dropped and processed frame counts, candidate count/bytes, best-frame quality items, failed rules, user agent, platform hints, viewport, and camera track settings. It never generates a finding, diagnosis, measurement, trend, or recommendation.

## Mobile HTTPS validation

The reproducible default is a locally trusted certificate generated with `mkcert`, then a Vite HTTPS development server bound to the LAN interface. The phone must trust the same local CA and open `https://<LAN-IP>:<HTTPS-port>/growth/posture/capture-lab`. Plain `http://<LAN-IP>` is not a valid default camera test path. A controlled HTTPS tunnel may be used only as an explicitly documented alternative.

## Future formal hand-off

After a separate acceptance decision, the formal photo step may accept a user-confirmed selected image through an explicit transient hand-off contract. MediaPipe landmarks, runtime telemetry, and quality scores will not be converted into an old assessment or used as formal screening evidence. Until then, the experiment has no link from the formal CTA.
