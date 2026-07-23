# Posture Squat Phase Driver Design

## Problem

Real squat inference produced 40 valid RTMPose frames but movement segmentation remained incomplete. The current squat driver is the normalized `hip_mid.y`. Each frame is normalized around that frame's RTMDet bounding-box center, so a detector box that follows the descending body also moves the coordinate origin and can cancel the hip displacement.

Existing tests use a fixed bounding box and therefore do not cover this real detector behavior.

## Decision

Use translation- and scale-invariant hip-to-ankle relative height as the squat phase driver:

```text
(hip_mid.y - ankle_mid.y) / shoulder_width * 100
```

The signal increases as the hips move closer to the ankles. It uses only keypoints already required for the squat, retains the existing `percent-shoulder-width` unit, and does not depend on the RTMDet box origin.

## Non-goals

- Do not change phase thresholds or minimum hold duration.
- Do not mark an incomplete repetition as complete.
- Do not interpolate missing stages or retry frames.
- Do not produce posture findings or training recommendations.

## Verification

- Add a regression sequence whose keypoints describe a complete squat while the detector box follows the hips.
- Prove the old driver returns incomplete for that sequence.
- Change only the squat driver and prove both fixed-box and moving-box sequences complete.
- Run the complete movement, API, and Python suites, then repeat the real GPU squat.

No commit, push, or deployment is part of this work.
