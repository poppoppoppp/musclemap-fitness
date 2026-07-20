# MediaPipe posture capture lab implementation plan

> Execute in the existing dirty worktree without committing, pushing, deploying, migrating repositories, or modifying the formal screening CTA.

**Goal:** Deliver an isolated, truthful MediaPipe Pose Landmarker capture experiment with Worker backpressure, bounded in-memory best-frame selection, quality guidance, technical telemetry, and verified error states.

**Architecture:** A React page owns camera and capture state. A dedicated Worker owns one Pose Landmarker instance and processes at most one transferred bitmap. Pure quality modules evaluate landmarks and sampled pixels. A bounded Top-K store retains only compressed candidate blobs. All assets are pinned, local, and hash verified.

**Technology:** React 19, TypeScript 5.9, Vite 7, Playwright, official `@mediapipe/tasks-vision@0.10.35`, Web Worker, MediaDevices, ImageBitmap, Canvas.

## Success criteria

- `/growth/posture/capture-lab` works independently and no formal CTA changes.
- Actual 33-point output is drawn; no production mock landmarks or fake scan animation exists.
- Front, back, and side modes have truthful view-specific guidance.
- Single-flight inference and busy-frame dropping prevent Worker queue growth.
- Top-K compressed capture remains within candidate count, per-frame size, dimensions, and total-byte hard limits.
- Full is default; Lite requires explicit confirmation and destroys Full first.
- Permission/model/runtime/performance failures are honest and testable.
- Results remain memory-only and include required technical telemetry.
- Unit tests, TypeScript, build, error-path tests, three mobile viewport checks, and real-camera acceptance are completed before claiming completion.

## Implementation sequence

1. Add failing unit tests for landmark reliability, view rules, stability, monotonic timing, single-flight backpressure, bounded Top-K replacement, latency summaries, and capture state transitions.
2. Implement central experiment config and pure quality/candidate/runtime utilities until those tests pass.
3. Pin the official package. Acquire official Full/Lite assets, copy pinned WASM files, generate the manifest, and add a hash verifier that fails builds clearly.
4. Implement Worker lifecycle and main-thread controller with strict single-flight messages, bitmap closure, monotonic timestamps, model switching, and runtime telemetry.
5. Implement camera lifecycle and the isolated capture page, skeleton canvas, mode guidance, countdown interruption, bounded capture, result, retake, and teardown.
6. Add route-level tests for permission denial and aborted model requests without injecting fake production landmarks.
7. Run the full unit suite, type check, asset verification, and production build.
8. Run visual QA at 390 x 844, 393 x 852, and 430 x 932 and retain screenshots outside source artifacts.
9. Run the real-camera checklist over HTTPS/localhost, record Full/Lite measurements and failure observations, and verify the camera indicator turns off after leaving.
10. Review the diff for repository writes, formal-flow changes, remote fallbacks, unbounded retention, and diagnostic language.
