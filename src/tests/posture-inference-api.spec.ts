import { expect, test } from '@playwright/test';
import { submitPostureKeypoints } from '../features/posture/capture/inference/postureInferenceApi';
import { HALPE26_NAMES } from '../features/posture/capture/inference/halpe26';
import type { PostureKeypointResponse } from '../types/postureAnalysis';

test('submits the exact best-frame blob as multipart using the configured base URL', async () => {
  const bytes = new Uint8Array([1, 2, 3, 4]);
  const blob = new Blob([bytes], { type: 'image/webp' });
  let submitted: { url: string; bytes: number[]; type: string; view: FormDataEntryValue | null } | null = null;
  const response = keypointResponse();

  const result = await submitPostureKeypoints({
    blob,
    view: 'front',
    baseUrl: 'http://127.0.0.1:8765/',
    fetchImpl: async (input, init) => {
      const form = init?.body as FormData;
      const image = form.get('image') as Blob;
      submitted = {
        url: String(input),
        bytes: Array.from(new Uint8Array(await image.arrayBuffer())),
        type: image.type,
        view: form.get('view'),
      };
      return new Response(JSON.stringify(response), { status: 200, headers: { 'content-type': 'application/json' } });
    },
  });

  expect(submitted).toEqual({
    url: 'http://127.0.0.1:8765/v1/posture/keypoints',
    bytes: [1, 2, 3, 4],
    type: 'image/webp',
    view: 'front',
  });
  expect(result.requestId).toBe('request-1');
});

test('preserves structured backend errors and retryability', async () => {
  const call = submitPostureKeypoints({
    blob: new Blob([new Uint8Array([1])], { type: 'image/webp' }),
    view: 'side',
    baseUrl: 'http://localhost:8765',
    fetchImpl: async () => new Response(JSON.stringify({
      error: { code: 'NO_PERSON_DETECTED', message: 'No person detected.', retryable: true, details: {} },
    }), { status: 422, headers: { 'content-type': 'application/json' } }),
  });

  await expect(call).rejects.toMatchObject({
    name: 'PostureInferenceApiError',
    code: 'NO_PERSON_DETECTED',
    message: 'No person detected.',
    retryable: true,
    status: 422,
  });
});

test('reports missing API configuration without guessing an address', async () => {
  const call = submitPostureKeypoints({
    blob: new Blob([new Uint8Array([1])], { type: 'image/webp' }),
    view: 'back',
    baseUrl: '',
  });

  await expect(call).rejects.toEqual(expect.objectContaining({
    code: 'API_URL_NOT_CONFIGURED',
    retryable: false,
  }));
});

test('rejects a successful response with the wrong schema instead of drawing it', async () => {
  const invalid = { ...keypointResponse(), coordinateSpace: { id: 'normalized' } };
  const call = submitPostureKeypoints({
    blob: new Blob([new Uint8Array([1])], { type: 'image/webp' }),
    view: 'front',
    baseUrl: 'http://localhost:8765',
    fetchImpl: async () => new Response(JSON.stringify(invalid), { status: 200, headers: { 'content-type': 'application/json' } }),
  });

  await expect(call).rejects.toMatchObject({ code: 'MODEL_RESPONSE_INVALID', retryable: true });
});

test('rejects 26 points when their semantic order does not match official HALPE26', async () => {
  const invalid = keypointResponse();
  invalid.person.keypoints[0] = { ...invalid.person.keypoints[0], name: 'left_eye' };
  const call = submitPostureKeypoints({
    blob: new Blob([new Uint8Array([1])], { type: 'image/webp' }),
    view: 'front',
    baseUrl: 'http://localhost:8765',
    fetchImpl: async () => new Response(JSON.stringify(invalid), { status: 200, headers: { 'content-type': 'application/json' } }),
  });

  await expect(call).rejects.toMatchObject({ code: 'MODEL_RESPONSE_INVALID' });
});

function keypointResponse(): PostureKeypointResponse {
  return {
    requestId: 'request-1',
    model: { id: 'rtmpose', version: '1.3.2', config: 'body26', checkpointSha256: 'pose-sha' },
    detector: { id: 'rtmdet', version: '3.2.0', config: 'rtmdet-m', checkpointSha256: 'det-sha' },
    keypointSchema: { id: 'halpe26', count: 26, names: [...HALPE26_NAMES] },
    coordinateSpace: { id: 'original-image-pixels', units: 'pixels', origin: 'top-left', xAxis: 'right', yAxis: 'down' },
    runtime: { runtime: 'pytorch', runtimeVersion: '2.1.0', device: 'gpu', deviceName: 'RTX', cudaVersion: '12.1', dependencyVersions: {} },
    timingMs: { decode: 1, detection: 2, pose: 3, total: 6 },
    image: { width: 100, height: 200, mimeType: 'image/webp', bytes: 4 },
    person: {
      boundingBox: { x: 1, y: 2, width: 90, height: 190, score: 0.9 },
      keypoints: HALPE26_NAMES.map((name, index) => ({ index, name, x: index, y: index, score: 0.9 })),
    },
    warnings: [],
  };
}
