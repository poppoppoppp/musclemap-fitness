import { expect, test } from '@playwright/test';
import { POSTURE_CAPTURE_CONFIG } from '../features/posture/capture/poseLandmarkerConfig';
import { evaluateCaptureQuality } from '../features/posture/capture/quality/evaluateCaptureQuality';
import { evaluateStability } from '../features/posture/capture/quality/evaluateStability';
import { QUALITY_RULE_LABELS } from '../features/posture/capture/quality/qualityCopy';
import type { PostureCaptureKeypoint } from '../types/postureAnalysis';

test('landmarks require visibility, presence, valid coordinates and edge clearance', () => {
  const landmarks = makeFrontLandmarks();
  expect(evaluate(landmarks, 'front').blockingReasons).toEqual([]);

  landmarks[27] = { ...landmarks[27], visibility: 0.99, presence: 0.2 };
  const unreliableAnkle = evaluate(landmarks, 'front');
  expect(unreliableAnkle.blockingReasons).toContain('LEFT_ANKLE_NOT_RELIABLE');
  expect(unreliableAnkle.rules.distance.status).toBe('unknown');

  landmarks[27] = { ...landmarks[27], presence: 0.99, x: -0.01 };
  expect(evaluate(landmarks, 'front').blockingReasons).toContain('LEFT_ANKLE_OUT_OF_FRAME');

  landmarks[27] = { ...landmarks[27], x: POSTURE_CAPTURE_CONFIG.quality.edgeMargin / 2 };
  expect(evaluate(landmarks, 'front').blockingReasons).toContain('LEFT_ANKLE_NEAR_EDGE');
});

test('bilateral body groups fail when only one corresponding point is reliable', () => {
  const landmarks = makeFrontLandmarks();
  landmarks[12] = { ...landmarks[12], visibility: 0.1 };

  const result = evaluate(landmarks, 'front');
  expect(result.rules.shoulders.status).toBe('fail');
  expect(result.blockingReasons).toContain('RIGHT_SHOULDER_NOT_RELIABLE');
});

test('distance and centring rules report near, far and horizontal offset', () => {
  const normal = makeFrontLandmarks();
  expect(evaluate(normal, 'front').rules.distance.status).toBe('pass');

  const far = normal.map((point) => ({ ...point, y: 0.5 + (point.y - 0.5) * 0.5 }));
  expect(evaluate(far, 'front').rules.distance.reasonCode).toBe('BODY_TOO_FAR');

  const near = normal.map((point) => ({ ...point, y: 0.5 + (point.y - 0.5) * 1.13 }));
  expect(evaluate(near, 'front').rules.distance.reasonCode).toBe('BODY_TOO_NEAR');

  const offset = normal.map((point) => ({ ...point, x: point.x + 0.16 }));
  expect(evaluate(offset, 'front').rules.centering.reasonCode).toBe('BODY_OFF_CENTER');
});

test('front and side use geometry heuristics while back has no front/back classifier', () => {
  const front = makeFrontLandmarks();
  const side = makeSideLandmarks();

  expect(evaluate(front, 'front').rules.stance.status).toBe('pass');
  expect(evaluate(front, 'side').rules.stance.reasonCode).toBe('SIDE_STANCE_NOT_PLAUSIBLE');
  expect(evaluate(side, 'side').rules.stance.status).toBe('pass');
  expect(evaluate(side, 'front').rules.stance.reasonCode).toBe('FRONT_STANCE_NOT_PLAUSIBLE');

  const back = evaluate(front, 'back');
  expect(back.rules.stance.status).toBe('pass');
  expect(back.rules.stance.reasonCode).toBe('BACK_DIRECTION_USER_SELECTED');
});

test('front stance compares geometry in the real landscape frame aspect ratio', () => {
  const landmarks = makeFrontLandmarks();
  set(landmarks, 11, 0.42, 0.25);
  set(landmarks, 12, 0.58, 0.25);
  set(landmarks, 23, 0.45, 0.5);
  set(landmarks, 24, 0.55, 0.5);
  const input = {
    landmarks,
    mode: 'front' as const,
    imageQuality: { meanLuma: 100, sharpness: 100 },
    stability: { stable: true, score: 1, sampleCount: 8 },
    frameAspectRatio: 16 / 9,
  } as Parameters<typeof evaluateCaptureQuality>[0] & { frameAspectRatio: number };

  expect(evaluateCaptureQuality(input).rules.stance.status).toBe('pass');
});

test('session calibration accepts the observed natural front ratio but still rejects an obvious side pose', () => {
  const naturalFront = makeFrontLandmarks();
  set(naturalFront, 11, 0.42, 0.25);
  set(naturalFront, 12, 0.58, 0.25);
  set(naturalFront, 23, 0.45, 0.5);
  set(naturalFront, 24, 0.55, 0.5);
  const naturalInput = {
    landmarks: naturalFront,
    mode: 'front' as const,
    frameAspectRatio: 1,
    imageQuality: { meanLuma: 100, sharpness: 100 },
    stability: { stable: true, score: 1, sampleCount: 8 },
    frontMinSpanToTorsoRatio: 0.46,
  } as Parameters<typeof evaluateCaptureQuality>[0] & { frontMinSpanToTorsoRatio: number };

  const calibrated = evaluateCaptureQuality(naturalInput);
  expect(calibrated.rules.stance.status).toBe('pass');
  expect(calibrated.metrics.stanceRatio).toBeCloseTo(0.52, 4);

  const obviousSide = evaluateCaptureQuality({
    ...naturalInput,
    landmarks: makeSideLandmarks(),
    frontMinSpanToTorsoRatio: 0.36,
  });
  expect(obviousSide.rules.stance.reasonCode).toBe('FRONT_STANCE_NOT_PLAUSIBLE');
});

test('side view accepts one reliable same-side ear-to-foot chain without weakening bilateral modes', () => {
  const landmarks = makeSideLandmarks();
  for (const index of [8, 12, 24, 26, 28, 30, 32]) {
    landmarks[index] = { ...landmarks[index], visibility: 0.1 };
  }

  const side = evaluate(landmarks, 'side');
  expect(side.rules.head.status).toBe('pass');
  expect(side.rules.knees.status).toBe('pass');
  expect(side.rules.occlusion.status).toBe('pass');
  expect(side.rules.stance.status).toBe('pass');
  expect(side.passed).toBe(true);
  expect(side.metrics.completeness).toBe(1);

  expect(evaluate(landmarks, 'front').rules.knees.status).toBe('fail');
  expect(evaluate(landmarks, 'back').rules.knees.status).toBe('fail');
});

test('side view rejects landmarks assembled from mixed left and right body chains', () => {
  const landmarks = makeSideLandmarks();
  for (const index of [8, 12, 24, 25, 27, 29, 31]) {
    landmarks[index] = { ...landmarks[index], visibility: 0.1 };
  }

  const side = evaluate(landmarks, 'side');
  expect(side.rules.wholeBody.status).toBe('fail');
  expect(side.passed).toBe(false);
});

test('capture labels remain view-neutral when side mode uses one reliable body chain', () => {
  expect(QUALITY_RULE_LABELS.shoulders).toBe('肩部可见');
  expect(QUALITY_RULE_LABELS.hips).toBe('髋部可见');
  expect(QUALITY_RULE_LABELS.knees).toBe('膝部可见');
  expect(QUALITY_RULE_LABELS.ankles).toBe('踝部可见');
});

test('darkness and blur remain capture heuristics and block qualification', () => {
  const landmarks = makeFrontLandmarks();
  expect(evaluate(landmarks, 'front', { meanLuma: 40, sharpness: 100 }).rules.lighting.status).toBe('fail');
  expect(evaluate(landmarks, 'front', { meanLuma: 100, sharpness: 10 }).rules.sharpness.status).toBe('fail');
});

test('stability removes global translation but rejects relative landmark jitter', () => {
  const base = makeFrontLandmarks();
  const translated = [0, 1, 2, 3].map((index) => ({
    timestampMs: index * 100,
    landmarks: base.map((point) => ({ ...point, x: point.x + index * 0.002 })),
  }));
  expect(evaluateStability(translated).stable).toBe(true);

  const jittered = translated.map((sample, index) => ({
    ...sample,
    landmarks: sample.landmarks.map((point, pointIndex) => pointIndex === 11
      ? { ...point, x: point.x + (index % 2 ? 0.08 : -0.08) }
      : point),
  }));
  expect(evaluateStability(jittered).stable).toBe(false);

  const inferredOnly = translated.map((sample) => ({
    ...sample,
    landmarks: sample.landmarks.map((point) => ({ ...point, visibility: 0.1 })),
  }));
  expect(evaluateStability(inferredOnly).stable).toBe(false);
});

function evaluate(
  landmarks: PostureCaptureKeypoint[],
  mode: 'front' | 'back' | 'side',
  imageQuality = { meanLuma: 100, sharpness: 100 },
) {
  return evaluateCaptureQuality({
    landmarks,
    mode,
    frameAspectRatio: 1,
    imageQuality,
    stability: { stable: true, score: 1, sampleCount: 8 },
  });
}

function makeFrontLandmarks(): PostureCaptureKeypoint[] {
  const points = Array.from({ length: 33 }, (_, index) => reliable(index, 0.5, 0.5));
  set(points, 0, 0.5, 0.08);
  set(points, 7, 0.44, 0.11);
  set(points, 8, 0.56, 0.11);
  set(points, 11, 0.34, 0.25);
  set(points, 12, 0.66, 0.25);
  set(points, 23, 0.4, 0.5);
  set(points, 24, 0.6, 0.5);
  set(points, 25, 0.41, 0.7);
  set(points, 26, 0.59, 0.7);
  set(points, 27, 0.42, 0.91);
  set(points, 28, 0.58, 0.91);
  set(points, 29, 0.41, 0.92);
  set(points, 30, 0.59, 0.92);
  set(points, 31, 0.43, 0.93);
  set(points, 32, 0.57, 0.93);
  return points;
}

function makeSideLandmarks(): PostureCaptureKeypoint[] {
  const points = makeFrontLandmarks();
  set(points, 11, 0.48, 0.25);
  set(points, 12, 0.52, 0.25);
  set(points, 23, 0.49, 0.5);
  set(points, 24, 0.51, 0.5);
  set(points, 25, 0.49, 0.7);
  set(points, 26, 0.51, 0.7);
  set(points, 27, 0.49, 0.91);
  set(points, 28, 0.51, 0.91);
  set(points, 29, 0.48, 0.92);
  set(points, 30, 0.52, 0.92);
  set(points, 31, 0.49, 0.93);
  set(points, 32, 0.51, 0.93);
  return points;
}

function reliable(index: number, x: number, y: number): PostureCaptureKeypoint {
  return { id: String(index), x, y, z: 0, visibility: 0.99, presence: 0.99 };
}

function set(points: PostureCaptureKeypoint[], index: number, x: number, y: number) {
  points[index] = reliable(index, x, y);
}
