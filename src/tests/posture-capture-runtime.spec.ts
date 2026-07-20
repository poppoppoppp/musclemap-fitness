import { expect, test } from '@playwright/test';
import { POSTURE_CAPTURE_CONFIG } from '../features/posture/capture/poseLandmarkerConfig';
import { BoundedCandidateStore } from '../features/posture/capture/quality/BoundedCandidateStore';
import { InferenceBackpressure } from '../features/posture/capture/mediapipe/InferenceBackpressure';
import { summarizeRuntimeTelemetry } from '../features/posture/capture/mediapipe/runtimeTelemetry';
import { advanceCaptureSequence, initialCaptureSequence } from '../features/posture/capture/captureSequence';

test('inference gate allows one in-flight task, drops busy frames and makes timestamps monotonic', () => {
  const gate = new InferenceBackpressure();

  expect(gate.tryAcquire(100)).toEqual({ accepted: true, timestampMs: 100 });
  expect(gate.tryAcquire(101)).toEqual({ accepted: false });
  gate.release(20);
  expect(gate.tryAcquire(99)).toEqual({ accepted: true, timestampMs: 100.001 });

  expect(gate.snapshot()).toMatchObject({ inFlight: true, processedFrames: 1, droppedFrames: 1 });
});

test('bounded candidate store keeps only Top-K compressed blobs within every hard limit', () => {
  const store = new BoundedCandidateStore({
    maxCandidates: 3,
    maxBlobBytes: 100,
    maxTotalBytes: 220,
    maxWidth: 960,
    maxHeight: 1280,
  });

  expect(store.consider(candidate('a', 0.4, 80))).toBe(true);
  expect(store.consider(candidate('b', 0.8, 80))).toBe(true);
  expect(store.consider(candidate('c', 0.6, 80))).toBe(true);
  expect(store.snapshot().map((item) => item.id)).toEqual(['b', 'c']);
  expect(store.consider(candidate('d', 0.9, 110))).toBe(false);
  expect(store.consider({ ...candidate('e', 0.9, 50), width: 961 })).toBe(false);
  expect(store.consider(candidate('f', 0.9, 50))).toBe(true);
  expect(store.snapshot().map((item) => item.id)).toEqual(['f', 'b', 'c']);
  expect(store.totalBytes).toBeLessThanOrEqual(220);

  store.clear();
  expect(store.snapshot()).toEqual([]);
  expect(store.totalBytes).toBe(0);
});

test('telemetry reports actual fps, average and p95 inference latency', () => {
  const result = summarizeRuntimeTelemetry({
    startedAtMs: 1000,
    endedAtMs: 3000,
    inferenceLatenciesMs: [10, 20, 30, 40, 100],
    processedFrames: 10,
    droppedFrames: 4,
  });

  expect(result.processedFps).toBe(5);
  expect(result.averageInferenceMs).toBe(40);
  expect(result.p95InferenceMs).toBe(100);
  expect(result.droppedFrames).toBe(4);
});

test('countdown starts only after continuous qualification and resets when quality fails', () => {
  let state = initialCaptureSequence();
  state = advanceCaptureSequence(state, { type: 'QUALITY', passed: true, nowMs: 0 });
  state = advanceCaptureSequence(state, {
    type: 'QUALITY',
    passed: true,
    nowMs: POSTURE_CAPTURE_CONFIG.capture.qualifyingDurationMs - 1,
  });
  expect(state.phase).toBe('qualifying');

  state = advanceCaptureSequence(state, {
    type: 'QUALITY',
    passed: true,
    nowMs: POSTURE_CAPTURE_CONFIG.capture.qualifyingDurationMs,
  });
  expect(state.phase).toBe('countdown');

  state = advanceCaptureSequence(state, { type: 'QUALITY', passed: false, nowMs: 1600 });
  expect(state).toMatchObject({ phase: 'live', qualifiedSinceMs: null, countdownStartedAtMs: null });
});

test('capture duration is finite and transitions to result', () => {
  let state = initialCaptureSequence();
  state = advanceCaptureSequence(state, { type: 'START_CAPTURE', nowMs: 100 });
  expect(state.phase).toBe('capturing');
  state = advanceCaptureSequence(state, {
    type: 'TICK',
    nowMs: 100 + POSTURE_CAPTURE_CONFIG.capture.captureDurationMs,
  });
  expect(state.phase).toBe('result');
});

function candidate(id: string, score: number, size: number) {
  return {
    id,
    score,
    blob: new Blob([new Uint8Array(size)], { type: 'image/webp' }),
    width: 800,
    height: 1200,
    capturedAtMs: 0,
    quality: {
      completeness: 1,
      landmarkReliability: 1,
      sharpness: 1,
      stability: 1,
      failedRules: [],
    },
  };
}
