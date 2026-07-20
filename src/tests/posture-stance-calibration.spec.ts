import { expect, test } from '@playwright/test';
import {
  advanceStanceCalibration,
  initialStanceCalibration,
  isStanceCalibrationEligible,
  STANCE_CALIBRATION_DURATION_MS,
} from '../features/posture/capture/quality/stanceCalibration';
import type { CaptureQualityEvaluation } from '../features/posture/capture/captureLabTypes';

test('front stance calibration completes only after ten real seconds', () => {
  let state = initialStanceCalibration();
  for (let nowMs = 1_000; nowMs <= 10_500; nowMs += 500) {
    state = advanceStanceCalibration(state, { nowMs, eligible: true, stanceRatio: 0.44 });
  }
  state = advanceStanceCalibration(state, { nowMs: 10_900, eligible: true, stanceRatio: 0.43 });
  expect(state.status).toBe('calibrating');
  expect(state.elapsedMs).toBe(9_900);

  state = advanceStanceCalibration(state, { nowMs: 11_000, eligible: true, stanceRatio: 0.45 });
  expect(state.status).toBe('calibrated');
  expect(state.elapsedMs).toBe(STANCE_CALIBRATION_DURATION_MS);
  expect(state.frontMinSpanToTorsoRatio).toBeGreaterThan(0.35);
  expect(state.frontMinSpanToTorsoRatio).toBeLessThan(0.55);
});

test('calibration interruption resets elapsed time and samples', () => {
  let state = initialStanceCalibration();
  state = advanceStanceCalibration(state, { nowMs: 0, eligible: true, stanceRatio: 0.46 });
  state = advanceStanceCalibration(state, { nowMs: 6_000, eligible: true, stanceRatio: 0.43 });
  state = advanceStanceCalibration(state, { nowMs: 6_100, eligible: false, stanceRatio: null });

  expect(state).toEqual(initialStanceCalibration());
});

test('calibration is eligible only when front stance is the sole failed quality rule', () => {
  const evaluation = calibrationCandidate();
  expect(isStanceCalibrationEligible(evaluation, 'front')).toBe(true);
  expect(isStanceCalibrationEligible(evaluation, 'side')).toBe(false);
  expect(isStanceCalibrationEligible({
    ...evaluation,
    rules: { ...evaluation.rules, occlusion: { status: 'fail', reasonCode: 'KEYPOINT_OCCLUDED_OR_UNRELIABLE' } },
  }, 'front')).toBe(false);
});

test('a long inference gap restarts continuity instead of filling hidden time', () => {
  let state = initialStanceCalibration();
  state = advanceStanceCalibration(state, { nowMs: 0, eligible: true, stanceRatio: 0.44 });
  state = advanceStanceCalibration(state, { nowMs: 600, eligible: true, stanceRatio: 0.44 });
  state = advanceStanceCalibration(state, { nowMs: 2_000, eligible: true, stanceRatio: 0.44 });

  expect(state.status).toBe('calibrating');
  expect(state.startedAtMs).toBe(2_000);
  expect(state.elapsedMs).toBe(0);
  expect(state.samples).toEqual([0.44]);
});

test('calibration uses a robust baseline instead of a single outlier', () => {
  let state = initialStanceCalibration();
  const samples = Array.from({ length: 21 }, (_, index) => index === 10 ? 0.12 : [0.44, 0.45, 0.43, 0.46][index % 4]);
  for (let index = 0; index < samples.length; index += 1) {
    state = advanceStanceCalibration(state, {
      nowMs: index * 500,
      eligible: true,
      stanceRatio: samples[index],
    });
  }

  expect(state.status).toBe('calibrated');
  expect(state.frontMinSpanToTorsoRatio).toBeGreaterThan(0.39);
  expect(state.frontMinSpanToTorsoRatio).toBeLessThan(0.43);
});

test('calibration threshold stays below the observed baseline even for a narrow natural front stance', () => {
  let state = initialStanceCalibration();
  for (let nowMs = 0; nowMs <= 10_000; nowMs += 500) {
    state = advanceStanceCalibration(state, { nowMs, eligible: true, stanceRatio: 0.34 });
  }

  expect(state.status).toBe('calibrated');
  expect(state.frontMinSpanToTorsoRatio).toBeLessThan(0.34);
});

test('calibrated state remains stable until the camera session resets it', () => {
  let state = initialStanceCalibration();
  for (let nowMs = 0; nowMs <= 10_000; nowMs += 500) {
    state = advanceStanceCalibration(state, { nowMs, eligible: true, stanceRatio: 0.44 });
  }
  const calibrated = state;

  expect(advanceStanceCalibration(state, { nowMs: 11_000, eligible: false, stanceRatio: null })).toEqual(calibrated);
});

function calibrationCandidate(): CaptureQualityEvaluation {
  return {
    passed: false,
    blockingReasons: ['FRONT_STANCE_NOT_PLAUSIBLE'],
    rules: {
      wholeBody: { status: 'pass' }, head: { status: 'pass' }, shoulders: { status: 'pass' }, hips: { status: 'pass' },
      knees: { status: 'pass' }, ankles: { status: 'pass' }, distance: { status: 'pass' }, centering: { status: 'pass' },
      stance: { status: 'fail', reasonCode: 'FRONT_STANCE_NOT_PLAUSIBLE' }, occlusion: { status: 'pass' },
      stability: { status: 'pass' }, lighting: { status: 'pass' }, sharpness: { status: 'pass' },
    },
    metrics: { completeness: 1, averageReliability: 0.95, bodyHeightRatio: 0.8, centerOffset: 0, stanceRatio: 0.44, sharpness: 100, stability: 1 },
  };
}
