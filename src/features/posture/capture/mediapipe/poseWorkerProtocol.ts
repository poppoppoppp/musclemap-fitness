import type { PoseModelVariant, PoseInferenceResult } from '../captureLabTypes';

export type PoseWorkerRequest =
  | { type: 'INITIALIZE'; model: PoseModelVariant; modelUrl: string }
  | { type: 'DETECT'; bitmap: ImageBitmap; timestampMs: number }
  | { type: 'DISPOSE' };

export type PoseWorkerResponse =
  | { type: 'READY'; model: PoseModelVariant; loadDurationMs: number }
  | { type: 'RESULT'; result: PoseInferenceResult }
  | { type: 'NO_POSE'; inferenceTimeMs: number; timestampMs: number }
  | { type: 'ERROR'; stage: 'initialize' | 'inference'; code: string; message: string }
  | { type: 'DISPOSED' };
