# Posture Dominant Subject Selection Design

## Context

During real single-person squat capture, RTMDet intermittently emits more than one person candidate even though only one person is visible. The current inference policy rejects every frame with more than one candidate above `0.30`, so 12 of 40 frames were rejected as `MULTIPLE_PEOPLE_DETECTED` and the movement was correctly marked incomplete.

The fix must not silently accept a real second person, retry failed frames, interpolate missing phases, or change the 40-frame request limit.

## Decision

Add a pure dominant-subject selector between RTMDet output and RTMPose input.

1. Keep the existing absolute detector confidence threshold as the first filter.
2. Rank eligible candidates by score, then compare every secondary candidate with the primary candidate.
3. A secondary candidate remains a plausible person only when it is sufficiently confident relative to the primary and sufficiently large relative to the primary.
4. Reject the frame as `MULTIPLE_PEOPLE_DETECTED` when any plausible secondary candidate remains.
5. Otherwise use the dominant primary candidate once and attach an `IGNORED_WEAK_PERSON_CANDIDATE` warning with candidate counts and selection diagnostics.

The relative score and area criteria are engineering capture-quality parameters, not medical thresholds. They live in service configuration and are returned through model metadata/diagnostics where applicable.

## Alternatives Considered

- Raising the global detector threshold is smaller but can turn low-position squat frames into `NO_PERSON_DETECTED` and does not express the intended single-subject policy.
- Temporal tracking can be more robust for video, but adds state and sequence coupling that is unnecessary for this batch and would not help static requests.

## Error Handling

- Zero eligible candidates: keep `NO_PERSON_DETECTED`.
- Two similarly credible candidates: keep `MULTIPLE_PEOPLE_DETECTED` and do not run RTMPose.
- One dominant candidate plus weak/small extras: run RTMPose only for the dominant candidate and return a warning.
- Invalid RTMPose output and low-confidence keypoint handling remain unchanged.

## Verification

- TDD unit cases for weak low-score extras, small extras, similarly credible people, no person, and ordinary single-person inference.
- Dynamic API regression confirms failed frames still count toward 40 and no hidden retry occurs.
- Existing static/API tests remain green.
- GPU human squat retest confirms intermittent weak candidates no longer remove the skeleton while real multiple-person fixtures still fail.

No commit, push, or deployment is part of this work.
