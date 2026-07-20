import { expect, test } from '@playwright/test';
import {
  submitMovementAnalysis,
  submitStaticPostureAnalysis,
} from '../features/posture/capture/inference/postureAnalysisApi';
import { PostureInferenceApiError } from '../features/posture/capture/inference/postureInferenceApi';
import type { DynamicCapturedFrame, PostureKeypointResponse } from '../types/postureAnalysis';


test('static analysis posts existing RTMPose keypoints to the dedicated JSON endpoint', async () => {
  let requestUrl = '';
  let requestBody: unknown;
  const fetchImpl: typeof fetch = async (input, init) => {
    requestUrl = String(input);
    requestBody = JSON.parse(String(init?.body));
    return Response.json(staticResponse());
  };

  const response = await submitStaticPostureAnalysis({
    keypointResult: keypointResponse(),
    view: 'front',
    baseUrl: 'http://posture.test/',
    fetchImpl,
  });

  expect(requestUrl).toBe('http://posture.test/v1/posture/analysis/static');
  expect(requestBody).toMatchObject({
    view: 'front',
    modelId: 'rtmpose-m-body26-256x192',
    modelVersion: '1.3.2',
    boundingBox: { score: 0.95 },
  });
  expect(response.metrics[0].formula).toContain('atan2');
});


test('movement multipart keeps exact timestamps and every selected frame in order', async () => {
  const frames = capturedFrames([0, 203.5, 417.25]);
  let submitted: FormData | undefined;
  const fetchImpl: typeof fetch = async (_input, init) => {
    submitted = init?.body as FormData;
    return Response.json(movementResponse());
  };

  await submitMovementAnalysis({
    frames,
    action: 'bilateral-arm-raise',
    view: 'front',
    baseUrl: 'http://posture.test',
    fetchImpl,
  });

  if (!submitted) throw new Error('Expected movement request form data.');
  expect(submitted.getAll('frames')).toHaveLength(3);
  expect(submitted.get('timestampsMs')).toBe('[0,203.5,417.25]');
  expect(submitted.get('action')).toBe('bilateral-arm-raise');
});


test('movement client rejects more than forty supplied frames without sending a request', async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls += 1;
    return Response.json(movementResponse());
  };

  await expect(submitMovementAnalysis({
    frames: capturedFrames(Array.from({ length: 41 }, (_, index) => index * 200)),
    action: 'bodyweight-squat',
    view: 'front',
    baseUrl: 'http://posture.test',
    fetchImpl,
  })).rejects.toMatchObject({ code: 'MOVEMENT_FRAME_LIMIT_EXCEEDED' } satisfies Partial<PostureInferenceApiError>);
  expect(calls).toBe(0);
});


function capturedFrames(timestamps: number[]): DynamicCapturedFrame[] {
  return timestamps.map((timestampMs, index) => ({
    id: `frame-${index}`,
    timestampMs,
    blob: new Blob([String(index)], { type: 'image/jpeg' }),
    width: 720,
    height: 720,
  }));
}


function keypointResponse(): PostureKeypointResponse {
  return {
    requestId: 'request-1',
    model: { id: 'rtmpose-m-body26-256x192', version: '1.3.2', config: 'body26', checkpointSha256: 'pose' },
    detector: { id: 'rtmdet-m-person-640', version: '3.2.0', config: 'detector', checkpointSha256: 'detector' },
    keypointSchema: { id: 'halpe26', count: 26, names: [] },
    coordinateSpace: { id: 'original-image-pixels', units: 'pixels', origin: 'top-left', xAxis: 'right', yAxis: 'down' },
    runtime: { runtime: 'pytorch', runtimeVersion: '2.1', device: 'gpu', deviceName: 'GPU', cudaVersion: '12.1', dependencyVersions: {} },
    timingMs: { decode: 1, detection: 2, pose: 3, total: 6 },
    image: { width: 720, height: 720, mimeType: 'image/jpeg', bytes: 100 },
    person: {
      boundingBox: { x: 10, y: 10, width: 600, height: 680, score: 0.95 },
      keypoints: Array.from({ length: 26 }, (_, index) => ({ index, name: `point-${index}`, x: index, y: index, score: 0.9 })),
    },
    warnings: [],
  };
}


function staticResponse() {
  return {
    analysisVersion: 'posture-metrics-v1', view: 'front', visibleSide: null,
    normalization: { basis: 'shoulder-width', pixels: 100, centerX: 50, centerY: 100 },
    rawKeypoints: [], normalizedKeypoints: [], filteredKeypoints: [],
    metrics: [{
      id: 'head-lateral-tilt', label: '头部左右倾斜', status: 'valid', quality: 'valid',
      requiredViews: ['front', 'back'], keypoints: ['left_ear', 'right_ear'], formula: 'atan2(...)',
      values: [{ label: 'angle', value: 1.2, unit: 'degrees' }], confidence: 0.9,
      unavailableReasons: [], analysisVersion: 'posture-metrics-v1', modelId: 'rtmpose', modelVersion: '1.3.2',
    }],
  };
}


function movementResponse() {
  return {
    requestId: 'movement-1',
    model: { id: 'rtmpose', version: '1.3.2', config: 'body26', checkpointSha256: 'pose' },
    detector: { id: 'rtmdet', version: '3.2.0', config: 'detector', checkpointSha256: 'detector' },
    runtime: { runtime: 'pytorch', runtimeVersion: '2.1', device: 'gpu', deviceName: 'GPU', cudaVersion: '12.1', dependencyVersions: {} },
    timingMs: { decode: 1, detection: 2, pose: 3, total: 6 }, limits: { maxFrames: 40, maxFrameBytes: 1, maxRequestBytes: 2, maxFramePixels: 3, maxTotalPixels: 4 },
    frames: [], analysis: { analysisVersion: 'posture-metrics-v1', action: 'bilateral-arm-raise', view: 'front', visibleSide: null, status: 'incomplete', requiredKeypoints: [], rawFrames: [], processedFrames: [], phases: { status: 'incomplete', startIndex: null, peakIndex: null, returnIndex: null, holdIndices: [], reasons: ['MOVEMENT_INCOMPLETE'] }, metrics: [], trajectories: [] },
  };
}
