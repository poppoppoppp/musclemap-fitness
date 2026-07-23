import { expect, test } from '@playwright/test';
import type { CaptureCandidateQuality } from '../features/posture/capture/captureLabTypes';
import type { PostureKeypointResponse, PostureMovementAnalysisResponse, PostureStaticAnalysisResponse } from '../types/postureAnalysis';
import { buildMovementCaptureSnapshot, buildPostureCaptureSnapshot, buildStaticCaptureSnapshot } from '../utils/postureCaptureSnapshot';

const model = { id: 'rtmpose-m', version: '1.0', config: 'pose.py', checkpointSha256: 'pose-hash' };
const detector = { id: 'rtmdet-m', version: '1.0', config: 'det.py', checkpointSha256: 'detector-hash' };
const timingMs = { decode: 1, detection: 2, pose: 3, total: 6 };
const quality: CaptureCandidateQuality = { completeness: 1, landmarkReliability: 0.98, sharpness: 0.9, stability: 0.96, failedRules: [] };

function keypoints(): PostureKeypointResponse {
  return {
    requestId: 'static-1', model, detector,
    keypointSchema: { id: 'halpe26', count: 26, names: [] },
    coordinateSpace: { id: 'original-image-pixels', units: 'pixels', origin: 'top-left', xAxis: 'right', yAxis: 'down' },
    runtime: { runtime: 'pytorch', runtimeVersion: '2', device: 'gpu', deviceName: 'gpu', cudaVersion: '12', dependencyVersions: {} },
    timingMs,
    image: { width: 720, height: 1280, mimeType: 'image/jpeg', bytes: 1234 },
    person: { boundingBox: { x: 1, y: 2, width: 3, height: 4, score: 0.99 }, keypoints: [{ index: 0, name: 'head', x: 1, y: 2, score: 0.9 }] },
    warnings: [{ code: 'LOW_POINT', severity: 'warning', message: 'one point is weak', keypointIndices: [4], details: { score: 0.4 } }],
  };
}

function staticAnalysis(): PostureStaticAnalysisResponse {
  return {
    analysisVersion: 'static-v1', view: 'front', visibleSide: null,
    normalization: { basis: 'shoulder-width', pixels: 10, centerX: 5, centerY: 5 },
    rawKeypoints: [{ name: 'head', x: 1, y: 2, score: 0.9 }],
    normalizedKeypoints: [], filteredKeypoints: [],
    metrics: [{
      id: 'shoulder-height-asymmetry', label: 'shoulder asymmetry', status: 'valid', quality: 'valid', requiredViews: ['front'],
      keypoints: ['left_shoulder', 'right_shoulder'], formula: 'delta', values: [{ label: 'difference', value: 3.2, unit: 'deg' }],
      confidence: 0.91, unavailableReasons: [], analysisVersion: 'static-v1', modelId: model.id, modelVersion: model.version,
    }],
  };
}

function movementAnalysis(): PostureMovementAnalysisResponse {
  return {
    requestId: 'movement-1', model, detector,
    runtime: { runtime: 'pytorch', runtimeVersion: '2', device: 'gpu', deviceName: 'gpu', cudaVersion: '12', dependencyVersions: {} },
    timingMs, limits: { maxFrames: 40, maxFrameBytes: 1, maxRequestBytes: 1, maxFramePixels: 1, maxTotalPixels: 1 },
    frames: [
      { index: 0, timestampMs: 0, status: 'valid', image: null, person: null, timingMs: null, error: null, warnings: [{ code: 'FRAME_WARNING', severity: 'info', message: 'usable', keypointIndices: [], details: { source: 'test' } }] },
      { index: 1, timestampMs: 200, status: 'failed', image: null, person: null, timingMs: null, error: { code: 'NO_PERSON', message: 'no person', retryable: false, details: {} }, warnings: [] },
    ],
    analysis: {
      analysisVersion: 'movement-v1', action: 'bodyweight-squat', view: 'front', visibleSide: null, status: 'valid', requiredKeypoints: [],
      rawFrames: [{ index: 0, timestampMs: 0, keypoints: [{ name: 'hip', x: 1, y: 2, score: 0.9 }], boundingBox: [1, 2, 3, 4], valid: true, reasons: [] }],
      processedFrames: [], phases: { status: 'complete', startIndex: 0, peakIndex: 1, returnIndex: 2, holdIndices: [], reasons: [] },
      metrics: [{ id: 'left-right-knee-range-difference', label: 'range difference', status: 'valid', quality: 'valid', requiredViews: ['front'], keypoints: [], formula: 'delta', values: [{ label: 'difference', value: 1.3, unit: 'deg' }], confidence: 0.94, unavailableReasons: [], analysisVersion: 'movement-v1', modelId: model.id, modelVersion: model.version }],
      trajectories: [{ id: 'hip', label: 'hip', unit: 'ratio', samples: [{ frameIndex: 0, timestampMs: 0, value: 1 }] }],
    },
  };
}

test('freezes static metrics, quality, warnings and model provenance without image or keypoint evidence', () => {
  const snapshot = buildStaticCaptureSnapshot(keypoints(), staticAnalysis(), quality);
  expect(snapshot.status).toBe('valid');
  expect(snapshot.quality?.sharpness).toBe(0.9);
  expect(snapshot.warnings[0]).toEqual({ code: 'LOW_POINT', severity: 'warning', message: 'one point is weak', details: { score: 0.4 } });
  expect(snapshot.model?.checkpointSha256).toBe('pose-hash');
  expect(snapshot.detector?.checkpointSha256).toBe('detector-hash');
  expect(snapshot.metrics[0].values[0].value).toBe(3.2);
  expect(JSON.stringify(snapshot)).not.toContain('keypoints');
  expect(JSON.stringify(snapshot)).not.toContain('image');
  expect(JSON.stringify(snapshot)).not.toContain('blob');
});

test('freezes movement phases and warnings while omitting frames and trajectories', () => {
  const snapshot = buildMovementCaptureSnapshot(movementAnalysis());
  expect(snapshot.submittedFrames).toBe(2);
  expect(snapshot.validFrames).toBe(1);
  expect(snapshot.phases).toEqual({ status: 'complete', startIndex: 0, peakIndex: 1, returnIndex: 2, holdIndices: [], reasons: [] });
  expect(snapshot.warnings).toEqual([
    { code: 'FRAME_WARNING', severity: 'info', message: 'usable', details: { source: 'test' }, frameIndex: 0 },
    { code: 'NO_PERSON', severity: 'warning', message: 'no person', details: {}, frameIndex: 1 },
  ]);
  expect(JSON.stringify(snapshot)).not.toContain('rawFrames');
  expect(JSON.stringify(snapshot)).not.toContain('trajectories');
  expect(JSON.stringify(snapshot)).not.toContain('keypoints');
});

test('summarizes the formal six captures without recalculating their metrics', () => {
  const front = buildStaticCaptureSnapshot(keypoints(), staticAnalysis(), quality);
  const side = { ...front, view: 'side' as const, visibleSide: 'left' as const };
  const back = { ...front, view: 'back' as const };
  const squat = buildMovementCaptureSnapshot(movementAnalysis());
  const armRaise = { ...squat, action: 'bilateral-arm-raise' as const };
  const neck = { ...squat, action: 'neck-retraction' as const, view: 'side' as const, visibleSide: 'left' as const };
  const snapshot = buildPostureCaptureSnapshot([front, side, back], [armRaise, squat, neck], '2026-07-22T10:00:00.000Z');
  expect(snapshot.protocolVersion).toBe('automated-posture-capture-v1');
  expect(snapshot.validity).toBe('valid');
  expect(snapshot.completedAt).toBe('2026-07-22T10:00:00.000Z');
});
