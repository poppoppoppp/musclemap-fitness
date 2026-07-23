# Posture capture lab testing guide

The Phase 2 experiment is available only at `/growth/posture/capture-lab`. The formal posture screening entry remains unchanged.

## Desktop localhost

`localhost` and `127.0.0.1` are treated as secure development contexts by supported browsers:

```powershell
npm install
npm run posture:assets:download
npm run posture:assets:verify
npm run dev -- --port 5173
```

Open `http://127.0.0.1:5173/growth/posture/capture-lab` on the same computer. This exception does not make a LAN HTTP address a secure context.

## Reproducible phone HTTPS with mkcert

Do not use `http://<LAN-IP>:5173` as the default phone camera test. Create a locally trusted certificate instead.

1. Install [mkcert](https://github.com/FiloSottile/mkcert) on the development computer.
2. Find the computer LAN address, for example `192.168.1.23`.
3. Create and trust the local certificate authority, then issue a certificate that includes the LAN address:

```powershell
mkcert -install
New-Item -ItemType Directory -Force .local-certs
mkcert -key-file .local-certs/musclemap-key.pem -cert-file .local-certs/musclemap-cert.pem localhost 127.0.0.1 ::1 192.168.1.23
```

4. Run Vite with the certificate paths:

```powershell
$env:MUSCLEMAP_DEV_HTTPS_KEY_FILE=(Resolve-Path '.local-certs/musclemap-key.pem').Path
$env:MUSCLEMAP_DEV_HTTPS_CERT_FILE=(Resolve-Path '.local-certs/musclemap-cert.pem').Path
npm run dev -- --port 5173
```

5. Run `mkcert -CAROOT` to locate `rootCA.pem`. Install that CA on the test phone and explicitly trust it according to the phone operating-system instructions. Treat the CA private key as sensitive and never copy it to the phone or repository.
6. Connect the phone to the same controlled network and open:

```text
https://192.168.1.23:5173/growth/posture/capture-lab
```

7. Confirm the browser shows a trusted HTTPS connection before granting camera access.

`.local-certs` must remain untracked. Remove the two HTTPS environment variables after the session if later development should use ordinary localhost HTTP.

## Controlled tunnel alternative

A team-approved HTTPS tunnel may proxy the local Vite port when installing a local CA is not possible. The tunnel URL must be access controlled, short lived, and removed after testing. Do not expose captured material or a development server through an anonymous persistent tunnel.

## Automated checks

```powershell
npx playwright test src/tests/posture-capture-quality.spec.ts src/tests/posture-capture-runtime.spec.ts src/tests/posture-capture-lab.spec.ts
npx tsc -b --pretty false
npm run build
```

The permission-denial test rejects the browser camera request. The model-load test aborts the local official model request. The asset-integrity test points the verifier at a deliberately corrupt temporary test directory. None of these tests inject landmarks into production code.

## Real-camera acceptance checklist

Record device, OS, browser, camera resolution, Full and Lite load time, processed FPS, average and P95 latency, dropped frames, lighting, and approximate distance. Execute every item rather than marking the feature generally successful:

- Full model real-camera startup and skeleton;
- explicit Lite switch and Full Worker destruction;
- incomplete body warning;
- too-near and too-far warning;
- off-centre warning;
- side mode;
- user-selected back mode without automatic front/back claim;
- blur and low-light warnings;
- countdown interruption when quality fails;
- four-second capture and bounded best candidate;
- retake and candidate URL release;
- permission denial;
- model request and asset verification failure;
- camera indicator off after leaving the route.

For side-mode acceptance, a complete reliable chain must come from one anatomical side: ear, shoulder, hip, knee, ankle, heel, and foot. The opposite knee commonly becomes physically occluded and is not a blocking visibility requirement. Do not combine a left upper-body chain with a right lower-body chain, and do not treat the opposite-side inferred coordinates as visible evidence. Front and back acceptance continue to require bilateral coverage.

The result page values are capture experiment telemetry. Do not report them as medical confidence, diagnostic accuracy, or posture-analysis precision.

## Batch one: RTMDet + RTMPose technical verification (2026-07-20)

This section verifies transport, inference, rendering, and model-to-model geometry only. It does not establish medical accuracy and does not generate posture findings.

### Technical image verification

No newly downloaded open-license photograph was used as a substitute for the final three-view acceptance. Temporary candidates were removed from the workspace. The continuous GPU/CPU benchmark used the repository's existing real exercise photograph `public/exercise-media/squat/start.webp` only as a repeatable runtime input; it was not treated as front/side/back acceptance evidence and no copy was added to the inference service.

That photograph is `Barbell_Squat/0.jpg` from [yuhonas/free-exercise-db at commit b0eed061](https://github.com/yuhonas/free-exercise-db/tree/b0eed061e1c832b3ed815fbaa4b45b3cdc14df49), released under the repository's Unlicense. The immutable source URL and source/output SHA-256 values are recorded in `public/exercise-media/source-manifest.json`; the benchmarked WebP hash is `3c4a3608d19e393bd7f7fdfa8b91a4c66333cc9c4159ba0de82de60e62782600`. Its sole posture-service use was loading, repeated inference, stability, and resource measurement.

### Capture Lab human three-view acceptance

The user captured a fresh browser `image/jpeg` Blob for each view. All three decoded at 720 x 720 with the expected orientation, and the captured images remained in browser memory rather than being written to a screening, plan, or repository file.

| View | Capture quality (complete / reliable / clear / stable) | RTMPose GPU total (detect + pose) | Person box | Comparable mapping | Normalized difference (median / P95) | Visual check |
| --- | --- | --- | --- | --- | --- | --- |
| Front | 100% / 96% / 100% / 98% | 339.6 ms (271.5 + 56.8) | 90% | 17 / 17, shoulder width | 2.7% / 5.6% | box and skeleton aligned |
| Side | 100% / 92% / 100% / 94% | 303.7 ms (237.7 + 55.3) | 83% | 14 / 17, torso length | 4.4% / 11.0% | visible-side chain aligned; occluded points excluded |
| Back | 100% / 95% / 100% / 97% | 229.7 ms (158.5 + 60.8) | 87% | 17 / 17, shoulder width | 4.5% / 11.4% | box and skeleton aligned |

No returned RTMPose point in these three accepted frames fell below the configured 0.30 confidence threshold. That is a model score observation, not medical confidence.

The backend was then stopped while the accepted back frame remained on the page. Submission returned the real `API_UNREACHABLE` state, the same 720 x 720 Blob remained visible, and `重试同一最佳帧` succeeded after restart with the identical Blob URL. The same retained frame also completed through CPU inference (565.2 ms end to end in that interactive run).

Raw human-acceptance metrics are stored in the ignored local file `services/posture-inference/benchmark/results/human-acceptance.json`; captured images are not stored.

### Runtime and resource measurements

Versions: PyTorch 2.1.0+cu121, torchvision 0.16.0+cu121, MMEngine 0.10.7, MMCV 2.1.0, MMDetection 3.2.0 and MMPose 1.3.2.

| Device | Model load | First inference | Warmed continuous inference | Process memory | Accelerator memory |
| --- | --- | --- | --- | --- | --- |
| RTX 3050 Laptop GPU | 5065.8 ms | 832.6 ms | 30 runs: mean 89.3 ms, P50 88.7 ms, P95 97.1 ms, max 137.6 ms, 0 errors | 52.97 MB before, 882.92 MB after load, 1.411 GB final RSS | peak allocated 364.4 MB; peak reserved 520.1 MB |
| CPU | 4938.8 ms | 557.9 ms | 30 runs: mean 496.1 ms, P50 494.8 ms, P95 507.7 ms, max 511.7 ms, 0 errors | 52.84 MB before, 796.13 MB after load, 872.27 MB final RSS | not applicable |

The model is initialized once per service process. `runtimeCreationMs` (including framework and detector/pose initialization) was 9421.8 ms on GPU and 9199.9 ms on CPU. Benchmark JSON is ignored under `services/posture-inference/benchmark/results/`.

### Failure verification

The real runtime returned structured failures for: no person (`NO_PERSON_DETECTED`, 422), multiple eligible people (`MULTIPLE_PEOPLE_DETECTED`, 422), damaged JPEG (`IMAGE_DECODE_FAILED`, 422), encoded upload over 10 MiB (`IMAGE_TOO_LARGE`, 413), and decoded image over 24 million pixels (`IMAGE_DIMENSIONS_EXCEEDED`, 413). Deterministic API tests also cover unsupported media, model unavailable, and response contracts. Multiple people are rejected rather than silently choosing one.

## Batch two: static metrics and slow movement verification (2026-07-22)

These values are transparent geometry outputs from the experimental page. They are not medical ranges, posture findings, diagnoses, or training recommendations. Images and selected dynamic frames remained in the browser session and were not written to formal screening, plan, trend, or training repositories.

### Human static measurements

| View | Valid measurements | Explicitly unavailable |
| --- | --- | --- |
| Front | head line 3.18 deg; shoulder height 0.00% / 0.00 deg; trunk offset 2.53%; pelvis height -2.22% / -1.27 deg; knee offsets -1.47% / 2.66%; foot directions 43.26 deg / -37.65 deg | same-side ear-to-shoulder, because it is side-only |
| Right side | ear-to-shoulder offset 0.79% of same-side torso length / 1.59 deg; minimum input score 0.66; keypoint chain `right_ear -> right_shoulder -> right_hip` | all bilateral front/back-only measurements |
| Back | head line 3.37 deg; shoulder height 1.19% / 0.68 deg; trunk offset -3.64%; pelvis height -3.92% / -2.25 deg; knee offsets -1.01% / 1.06%; foot directions -119.05 deg / 122.62 deg | same-side ear-to-shoulder, because it is side-only |

The side calculation used only the user-confirmed right visible chain. It did not mix left and right landmarks. Front and back distances were normalized by shoulder width; the side distance was normalized by same-side torso length.

### Human slow-movement measurements on GPU

Each action was one paced repetition. Browser capture ran above the analysis rate, retained real timestamps, and selected at most 5 FPS / 40 total frames for RTMDet and RTMPose. Failed frames were not retried or replaced.

| Action | View / side | Phase result | RTMPose frames | GPU total | Transparent metrics |
| --- | --- | --- | --- | --- | --- |
| Bilateral arm raise | front | complete | 31 / 31 | 2474.5 ms | left range 111.1 deg; right range 115.4 deg; absolute difference 4.2 deg; trunk excursion 2.4 deg; hold MAD 0.3 deg |
| Bodyweight squat | front | complete | 40 / 40 | 5953.3 ms | left knee range 109.0 deg; right knee range 107.7 deg; absolute difference 1.3 deg; knee-offset ranges 52.8% / 32.1% of shoulder width; trunk excursion 4.9 deg; hold MAD 5.5% of shoulder width |
| Neck retraction | right side | complete | 31 / 31 | 2457.2 ms | ear-to-shoulder excursion 19.4% of right torso length; head-line excursion 14.5 deg; hold MAD 1.3% of right torso length |

### Real-camera defects found and corrected

The first squat attempt produced 28 valid frames out of 40 because RTMDet intermittently reported `MULTIPLE_PEOPLE_DETECTED` in a single-person but visually cluttered scene. The old policy rejected every second candidate above the absolute 0.30 threshold. The corrected pure selection policy keeps strict rejection for a similarly confident, similarly sized second person, while a dominant primary can ignore weak or small secondary candidates and return `IGNORED_WEAK_PERSON_CANDIDATE` diagnostics. The final squat produced 40 valid frames out of 40.

After detection was stable, the squat still reported an incomplete phase. The former driver used `hip_mid.y` after normalization around each frame's moving RTMDet box center, so box motion cancelled real hip descent. The driver is now `(hip_mid.y - ankle_mid.y) / shoulder_width * 100`, which is invariant to box translation and scaling. A moving-box regression failed before the change and passes after it; the final real squat detected start, peak hold, and return.

### Automated regression status

- Python unit and API suite: 55 passed.
- Focused inference-policy and dynamic API suite: 15 passed.
- Focused movement and analysis API suite: 16 passed.
- Focused frontend sampling, capture, and contract suite: 9 passed.
- TypeScript project check: passed.
- Full frontend Playwright suite: 373 passed, 14 skipped, 0 failed.
- Production build: passed; the asset verifier confirmed 2 MediaPipe model files and 6 WASM assets for `@mediapipe/tasks-vision` 0.10.35.
- OpenMMLab checkpoint verification: RTMPose `4d3e73ddd31222b7b0db36caeda396af1d7630c3b5a60451bdfa99a79e8dbb90`; RTMDet `35b0c7406499e0d141dd6a0235db07c10d2bee8f891f8f4e353c16a009de30e8`.

CPU framework/model loading and full RTMDet/RTMPose inference remain covered by the batch-one CPU benchmark above. Batch-two phase and metric calculations are pure CPU functions and are included in the 55-test Python suite. Human movement values in this section are the GPU run and must not be presented as CPU human acceptance.

## Responsive camera stage verification (2026-07-22)

This change is limited to camera acquisition and presentation. It does not change MediaPipe quality rules, RTMPose analysis, static metrics, movement phase logic, or any formal posture workflow.

### Root cause

- Both static and dynamic capture requested a fixed portrait ideal of 720 x 1280, including desktop browsers.
- The static preview used a fixed 3:4 container capped at 66dvh, while the dynamic preview used a fixed square container.
- A previously observed 720 x 720 desktop stream therefore rendered inside a 524 x 698 static container. `object-contain` correctly produced a 524 x 524 image, but the mismatched container added 174 pixels of combined vertical letterboxing and made full-body framing unnecessarily small.
- The skeleton transform itself already followed `object-contain`; the defect was duplicated, incompatible stage geometry around otherwise correct mapping.
- Ordinary AppShell padding and the bottom navigation reserved additional screen area during capture.

### Implemented camera contract

- Narrow portrait screens request 720 x 1280 as the ideal; desktop and landscape screens request 1280 x 720. These remain ideals because the browser and camera choose the actual track format.
- After `loadedmetadata`, `videoWidth` and `videoHeight` are authoritative. The shared stage preserves that exact media ratio and fits it inside the current `visualViewport` without cropping.
- Video, MediaPipe canvas, guide frame, hints, mode controls, and dynamic pace controls share the same stage. Video remains `object-contain`; normalized landmarks use the same tested contain rectangle and mirror transform.
- Static front, side, and back modes share one stage. The three slow dynamic actions reuse it during ready, countdown, and capture.
- The Capture Lab route removes AppShell bottom navigation and ordinary page padding. Live controls use safe-area-aware overlays.

### Automated viewport evidence

| Scenario | Screen | Actual media | Expected stage | Result |
| --- | ---: | ---: | ---: | --- |
| Mobile portrait | 390 x 844 | 720 x 1280 | 390 x 693.3 | passed |
| Desktop square camera | 1440 x 900 | 720 x 720 | 900 x 900 | passed |
| Dynamic camera ready | 390 x 844 | 720 x 1280 | shared immersive stage and floating controls | passed |

Geometry tests also cover portrait/landscape constraint selection, portrait/landscape/square fit, exact `object-contain` rectangles, mirrored point mapping, and existing keypoint comparison/quality regressions. A real desktop camera and a real portrait phone remain the final human framing checks; synthetic or generated people are not used for this layout verification.
