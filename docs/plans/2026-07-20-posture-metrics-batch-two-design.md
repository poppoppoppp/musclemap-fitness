# Posture metrics batch two design

Date: 2026-07-20  
Status: approved for implementation

## Scope

Batch two converts RTMPose HALPE26 keypoints into transparent static measurements and bounded single-repetition movement measurements. It remains inside `/growth/posture/capture-lab`, uses no formal screening, plan, trend, or workout repository, and emits no finding, diagnosis, severity, normal range, or training recommendation.

The batch-one `/v1/posture/keypoints` contract remains available. Static analysis accepts its returned keypoints without running inference twice. Dynamic analysis adds a bounded multipart endpoint that runs the already-loaded RTMDet-m and RTMPose-m models sequentially over at most 40 submitted frames.

## Canonical data flow

```text
raw pixel keypoints + real timestamp
  -> per-frame quality gate
  -> anatomical normalization
  -> outlier marking
  -> median-3 + EMA smoothing for valid dynamic frames
  -> metric / phase pure functions
  -> provenance-rich explainable response
```

Raw, normalized, filtered, and derived data are separate response fields. Invalid frames remain present and count toward all upload and inference limits. The service never retries, interpolates, or synthesizes a frame or movement phase.

## Static measurements

Image coordinates use the batch-one convention: origin top-left, x right, y down. Signs describe the image plane only.

- Head lateral tilt, front/back: angle of the left-ear to right-ear line relative to image horizontal.
- Side ear/shoulder position, side only: same-visible-side horizontal ear-minus-shoulder offset divided by same-side shoulder-to-hip length, plus its angle relative to image vertical.
- Shoulder height relation, front/back: right-minus-left shoulder y difference divided by shoulder width.
- Trunk lateral offset, front/back: shoulder midpoint x minus hip midpoint x divided by midpoint shoulder-to-hip length.
- Pelvis height relation, front/back: right-minus-left hip y difference divided by hip width, plus hip-line angle.
- Knee alignment, front/back: each knee's signed perpendicular distance from the same-side hip-to-ankle segment, divided by shoulder width.
- Foot direction, front/back: each heel-to-mean-toes axis angle relative to image vertical.

Each measurement includes its required view, input keypoint names, human-readable formula, values and units, minimum input confidence, validity, unavailability reasons, model provenance, and analysis version. A missing point, non-finite coordinate, score below 0.30, unsupported view, or absent visible-side selection makes that measurement unavailable. Side analysis locks one user-selected anatomical side and never combines left and right chains.

## Dynamic capture

The first three actions are deliberately slow single repetitions:

- bilateral arm raise: raise, brief hold, lower; front view; six seconds;
- bodyweight squat: descend, brief hold, stand; front view; eight seconds;
- neck retraction: retract, brief hold, recover; side view; six seconds and explicit visible side.

The page renders a three-second preparation countdown and time-based pace cues for the three phases. Browser capture may run faster than five FPS. Before upload, a pure timestamp selector chooses samples nearest evenly spaced target times at five FPS, including endpoints, capped at 40 total frames. Original capture timestamps are sent unchanged and analysis uses real time deltas.

Five FPS is scoped only to these three slow actions and lives in their action configuration. It is not a global movement-analysis default.

## Dynamic analysis

- Arm raise driver: mean left/right angle between shoulder-to-hip and shoulder-to-wrist vectors. Outputs left/right robust range, range difference, wrist trajectories, trunk angle excursion, and peak-hold stability.
- Squat driver: hip-midpoint vertical displacement normalized by torso length. Outputs left/right knee-angle range, knee hip-ankle-line offset trajectories, trunk trajectory, and bottom-hold stability.
- Neck retraction driver: absolute departure of the same-side normalized ear/shoulder horizontal offset from the starting baseline. Outputs offset excursion, head/ear trajectory, head-line angle excursion, and hold stability.

Initial and final baselines use time-weighted early/late regions. Robust ranges use P05/P95. Outliers are marked using median absolute deviation before median-window and EMA smoothing. Segmentation uses centralized relative progress gates and real timestamps. Start, peak/hold, and return must all be observed in order. If any phase is absent, the result is `incomplete` with `MOVEMENT_INCOMPLETE`; no missing phase is interpolated.

## Bounds and failure policy

The dynamic endpoint limits frame count, each encoded frame, each decoded frame, total encoded request bytes, and total decoded pixels. The total frame limit includes decode failures, detector failures, and pose failures. Every supplied frame is attempted at most once. Invalid frames are returned with stable reasons; the sequence is unavailable if its valid coverage or required phases are insufficient.

## UI

Static results extend the existing best-frame result after explicit RTMPose submission. Front/back measurements can run from the returned keypoints. Side measurements require the user to select the visible anatomical side.

A separate dynamic experiment panel inside the same route owns camera startup, action/view selection, pace guidance, bounded in-memory frame capture, timestamp sampling, upload, progress/error states, frame scrubbing, RTMPose overlay, metric cards, and simple SVG trajectories. Leaving or retaking releases every object URL and media track.

## Verification

Pure-function tests cover exact formulas, translation and scale invariance, semantic mirroring, same-side enforcement, missing and low-confidence points, timestamp selection, outlier marking, smoothing, action phases, incomplete repetitions, and irregular intervals. API tests cover ordering, real timestamps, all five dynamic bounds, failed-frame accounting, and no retry. Frontend tests cover the new static display, pace cues, maximum frame submission, action errors, and batch-one regression. Real validation covers CPU/GPU and user-performed front/side/back static frames plus all three movements.

## Existing-work protection

Implementation is limited to new analysis files and surgical Capture Lab/service changes. No reset, checkout, clean, repository-wide formatter, data migration, commit, push, or deployment is allowed. The user's existing dirty tree remains authoritative.
