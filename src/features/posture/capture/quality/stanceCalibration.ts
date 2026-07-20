import { POSTURE_CAPTURE_CONFIG } from '../poseLandmarkerConfig';
import type { CaptureLabMode, CaptureQualityEvaluation } from '../captureLabTypes';

export const STANCE_CALIBRATION_DURATION_MS = POSTURE_CAPTURE_CONFIG.quality.stanceCalibrationDurationMs;

export interface StanceCalibrationState {
  status: 'idle' | 'calibrating' | 'calibrated';
  startedAtMs: number | null;
  lastSampleAtMs: number | null;
  elapsedMs: number;
  samples: number[];
  frontMinSpanToTorsoRatio: number | null;
}

interface StanceCalibrationInput {
  nowMs: number;
  eligible: boolean;
  stanceRatio: number | null;
}

export function initialStanceCalibration(): StanceCalibrationState {
  return {
    status: 'idle',
    startedAtMs: null,
    lastSampleAtMs: null,
    elapsedMs: 0,
    samples: [],
    frontMinSpanToTorsoRatio: null,
  };
}

export function advanceStanceCalibration(
  state: StanceCalibrationState,
  input: StanceCalibrationInput,
): StanceCalibrationState {
  if (state.status === 'calibrated') return state;
  if (!input.eligible || input.stanceRatio === null || !Number.isFinite(input.stanceRatio) || input.stanceRatio <= 0) {
    return initialStanceCalibration();
  }
  const continues = state.lastSampleAtMs !== null
    && input.nowMs >= state.lastSampleAtMs
    && input.nowMs - state.lastSampleAtMs <= POSTURE_CAPTURE_CONFIG.quality.stanceCalibrationMaxSampleGapMs;
  const startedAtMs = continues ? (state.startedAtMs ?? input.nowMs) : input.nowMs;
  const elapsedMs = Math.max(0, Math.min(STANCE_CALIBRATION_DURATION_MS, input.nowMs - startedAtMs));
  const samples = continues ? [...state.samples, input.stanceRatio] : [input.stanceRatio];
  if (elapsedMs < STANCE_CALIBRATION_DURATION_MS) {
    return { status: 'calibrating', startedAtMs, lastSampleAtMs: input.nowMs, elapsedMs, samples, frontMinSpanToTorsoRatio: null };
  }
  const baseline = median(samples);
  const frontMinSpanToTorsoRatio = Math.min(
    POSTURE_CAPTURE_CONFIG.quality.frontMinSpanToTorsoRatio,
    baseline * POSTURE_CAPTURE_CONFIG.quality.stanceCalibrationThresholdFactor,
  );
  return { status: 'calibrated', startedAtMs, lastSampleAtMs: input.nowMs, elapsedMs, samples, frontMinSpanToTorsoRatio };
}

export function isStanceCalibrationEligible(evaluation: CaptureQualityEvaluation, mode: CaptureLabMode) {
  if (mode !== 'front'
    || evaluation.rules.stance.status !== 'fail'
    || evaluation.rules.stance.reasonCode !== 'FRONT_STANCE_NOT_PLAUSIBLE'
    || evaluation.metrics.stanceRatio === null) return false;
  return Object.entries(evaluation.rules).every(([ruleId, rule]) => ruleId === 'stance' || rule.status === 'pass');
}

function median(values: number[]) {
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0
    ? (ordered[middle - 1] + ordered[middle]) / 2
    : ordered[middle];
}
