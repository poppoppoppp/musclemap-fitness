import { POSTURE_CAPTURE_CONFIG } from './poseLandmarkerConfig';

export type CaptureSequencePhase = 'live' | 'qualifying' | 'countdown' | 'capturing' | 'result';

export interface CaptureSequenceState {
  phase: CaptureSequencePhase;
  qualifiedSinceMs: number | null;
  countdownStartedAtMs: number | null;
  captureStartedAtMs: number | null;
}

export type CaptureSequenceEvent =
  | { type: 'QUALITY'; passed: boolean; nowMs: number }
  | { type: 'TICK'; nowMs: number }
  | { type: 'START_CAPTURE'; nowMs: number }
  | { type: 'RESET' };

export function initialCaptureSequence(): CaptureSequenceState {
  return { phase: 'live', qualifiedSinceMs: null, countdownStartedAtMs: null, captureStartedAtMs: null };
}

export function advanceCaptureSequence(state: CaptureSequenceState, event: CaptureSequenceEvent): CaptureSequenceState {
  if (event.type === 'RESET') return initialCaptureSequence();
  if (event.type === 'START_CAPTURE') return { ...state, phase: 'capturing', captureStartedAtMs: event.nowMs };

  if (event.type === 'QUALITY') {
    if (!event.passed) return initialCaptureSequence();
    if (state.phase === 'live') return { ...state, phase: 'qualifying', qualifiedSinceMs: event.nowMs };
    if (state.phase === 'qualifying' && state.qualifiedSinceMs !== null
      && event.nowMs - state.qualifiedSinceMs >= POSTURE_CAPTURE_CONFIG.capture.qualifyingDurationMs) {
      return { ...state, phase: 'countdown', countdownStartedAtMs: event.nowMs };
    }
    if (state.phase === 'countdown' && state.countdownStartedAtMs !== null
      && event.nowMs - state.countdownStartedAtMs >= POSTURE_CAPTURE_CONFIG.capture.countdownDurationMs) {
      return { ...state, phase: 'capturing', captureStartedAtMs: event.nowMs };
    }
    return state;
  }

  if (state.phase === 'countdown' && state.countdownStartedAtMs !== null
    && event.nowMs - state.countdownStartedAtMs >= POSTURE_CAPTURE_CONFIG.capture.countdownDurationMs) {
    return { ...state, phase: 'capturing', captureStartedAtMs: event.nowMs };
  }
  if (state.phase === 'capturing' && state.captureStartedAtMs !== null
    && event.nowMs - state.captureStartedAtMs >= POSTURE_CAPTURE_CONFIG.capture.captureDurationMs) {
    return { ...state, phase: 'result' };
  }
  return state;
}
