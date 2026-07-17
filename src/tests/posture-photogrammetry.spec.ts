import { expect, test } from '@playwright/test';
import {
  calculateCraniovertebralAngle,
  calculateFrontalHeadTilt,
  calculateFrontalShoulderHeightDifference,
  calculateFrontalTrunkDeviation,
  calculateLateralShoulderAngle,
  calculateLateralTrunkInclination,
  classifyMeasurementChange,
  posturePhotogrammetryEvidenceReferences,
  validatePosturePhotoCapture,
} from '../utils/posturePhotogrammetry';
import { postureScreeningEvidence } from '../data/posture/postureScreeningEvidence';
import { validatePostureScreeningEvidence } from '../utils/postureScreeningEvidence';

test('keeps every photogrammetry metric linked to registered evidence', () => {
  expect(validatePostureScreeningEvidence(postureScreeningEvidence, posturePhotogrammetryEvidenceReferences)).toEqual([]);
  expect(posturePhotogrammetryEvidenceReferences.map(({ ownerId }) => ownerId)).toEqual([
    'metric-craniovertebral-angle-v1',
    'metric-frontal-head-tilt-v1',
    'metric-frontal-shoulder-height-difference-v1',
    'metric-lateral-shoulder-angle-v1',
    'metric-lateral-trunk-inclination-v1',
    'metric-frontal-trunk-deviation-v1',
  ]);
});

test('calculates CVA from normalized C7 and tragus points without changing under mirroring', () => {
  const ordinary = calculateCraniovertebralAngle({ x: 0.4, y: 0.6 }, { x: 0.6, y: 0.4 });
  const mirrored = calculateCraniovertebralAngle(
    { x: 0.6, y: 0.6 },
    { x: 0.4, y: 0.4 },
    { mirrored: true },
  );

  expect(ordinary).toMatchObject({
    ok: true,
    metricId: 'craniovertebral-angle',
    unit: 'deg',
    evidenceIds: ['cva-classic-photogrammetry-review-v1', 'cva-standing-standardization-v1'],
  });
  expect(ordinary.ok && ordinary.value).toBeCloseTo(45, 8);
  expect(mirrored.ok && mirrored.value).toBeCloseTo(45, 8);
});

test('preserves anatomical sign for frontal head tilt and shoulder height after mirroring', () => {
  const headTilt = calculateFrontalHeadTilt({ x: 0.3, y: 0.3 }, { x: 0.7, y: 0.4 });
  const mirroredHeadTilt = calculateFrontalHeadTilt(
    { x: 0.7, y: 0.3 },
    { x: 0.3, y: 0.4 },
    { mirrored: true },
  );
  const shoulderDifference = calculateFrontalShoulderHeightDifference(
    { x: 0.3, y: 0.45 },
    { x: 0.7, y: 0.55 },
  );

  expect(headTilt.ok && headTilt.value).toBeCloseTo(14.036, 3);
  expect(mirroredHeadTilt.ok && mirroredHeadTilt.value).toBeCloseTo(14.036, 3);
  expect(shoulderDifference).toMatchObject({ ok: true, unit: 'ratio' });
  expect(shoulderDifference.ok && shoulderDifference.value).toBeCloseTo(0.1, 8);
});

test('calculates lateral shoulder and trunk angles plus frontal trunk deviation', () => {
  const shoulder = calculateLateralShoulderAngle({ x: 0.5, y: 0.4 }, { x: 0.7, y: 0.5 });
  const lateralTrunk = calculateLateralTrunkInclination({ x: 0.6, y: 0.3 }, { x: 0.5, y: 0.8 });
  const frontalTrunk = calculateFrontalTrunkDeviation({ x: 0.45, y: 0.3 }, { x: 0.5, y: 0.8 });

  expect(shoulder.ok && shoulder.value).toBeCloseTo(26.565, 3);
  expect(lateralTrunk.ok && lateralTrunk.value).toBeCloseTo(11.31, 2);
  expect(frontalTrunk.ok && frontalTrunk.value).toBeCloseTo(-5.711, 3);
});

test('returns stable quality reasons for invalid metric points', () => {
  expect(calculateCraniovertebralAngle({ x: -0.1, y: 0.5 }, { x: 0.6, y: 0.4 })).toEqual({
    ok: false,
    reasonCode: 'POINT_OUT_OF_RANGE',
  });
  expect(calculateCraniovertebralAngle({ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 })).toEqual({
    ok: false,
    reasonCode: 'POINTS_TOO_CLOSE',
  });
});

test('reports every capture QA problem in deterministic order', () => {
  expect(
    validatePosturePhotoCapture({
      view: 'left-lateral',
      imageWidth: 200,
      imageHeight: 600,
      standingConfirmed: false,
      landmarks: {
        tragus: { x: 0.5, y: 0.4 },
        c7: { x: 0.5, y: 0.4 },
        acromion: { x: 1.2, y: 0.5 },
      },
    }),
  ).toEqual({
    ok: false,
    reasonCodes: [
      'IMAGE_TOO_SMALL',
      'CAPTURE_PROTOCOL_UNCONFIRMED',
      'LANDMARK_MISSING_UPPER_TRUNK',
      'LANDMARK_MISSING_LOWER_TRUNK',
      'POINT_OUT_OF_RANGE_ACROMION',
      'POINTS_TOO_CLOSE_C7_TRAGUS',
    ],
  });
});

test('accepts a complete frontal capture', () => {
  expect(
    validatePosturePhotoCapture({
      view: 'front',
      imageWidth: 1080,
      imageHeight: 1920,
      standingConfirmed: true,
      landmarks: {
        leftEar: { x: 0.4, y: 0.25 },
        rightEar: { x: 0.6, y: 0.25 },
        leftAcromion: { x: 0.35, y: 0.4 },
        rightAcromion: { x: 0.65, y: 0.4 },
        upperTrunkMidline: { x: 0.5, y: 0.45 },
        lowerTrunkMidline: { x: 0.5, y: 0.75 },
      },
    }),
  ).toEqual({ ok: true });
});

test('only applies published measurement error when it directly matches the app protocol', () => {
  expect(
    classifyMeasurementChange(48, 50, {
      status: 'reported',
      statistic: 'MDC',
      value: 2.84,
      unit: 'deg',
      applicability: 'direct',
      context: 'validated app protocol',
    }),
  ).toEqual({ kind: 'within-error', difference: 2, threshold: 2.84 });

  expect(
    classifyMeasurementChange(48, 51, {
      status: 'reported',
      statistic: 'MDC',
      value: 2.84,
      unit: 'deg',
      applicability: 'direct',
      context: 'validated app protocol',
    }),
  ).toEqual({ kind: 'beyond-error', difference: 3, threshold: 2.84 });

  expect(
    classifyMeasurementChange(48, 51, {
      status: 'reported',
      statistic: 'MDC',
      value: 2.84,
      unit: 'deg',
      applicability: 'conditional',
      context: 'different posture and marking method',
    }),
  ).toEqual({ kind: 'not-comparable', difference: 3 });
});
