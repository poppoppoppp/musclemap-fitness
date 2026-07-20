import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import visionWasmModuleLoaderUrl from '@mediapipe/tasks-vision/vision_wasm_module_internal.js?url';
import visionWasmModuleBinaryUrl from '@mediapipe/tasks-vision/vision_wasm_module_internal.wasm?url';
import type { PostureCaptureKeypoint } from '../../../../types/postureAnalysis';
import type { PoseWorkerRequest, PoseWorkerResponse } from './poseWorkerProtocol';
import { POSTURE_CAPTURE_CONFIG } from '../poseLandmarkerConfig';

interface WorkerScope {
  onmessage: ((event: MessageEvent<PoseWorkerRequest>) => void) | null;
  postMessage(message: PoseWorkerResponse): void;
  close(): void;
}

const scope = self as unknown as WorkerScope;
let landmarker: PoseLandmarker | null = null;

scope.onmessage = (event) => {
  const message = event.data;
  if (message.type === 'INITIALIZE') void initialize(message);
  if (message.type === 'DETECT') detect(message.bitmap, message.timestampMs);
  if (message.type === 'DISPOSE') dispose();
};

async function initialize(message: Extract<PoseWorkerRequest, { type: 'INITIALIZE' }>) {
  const startedAt = performance.now();
  try {
    landmarker?.close();
    landmarker = null;
    const response = await fetch(message.modelUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`模型资源请求失败：HTTP ${response.status}`);
    const modelBuffer = new Uint8Array(await response.arrayBuffer());
    if (!modelBuffer.length) throw new Error('模型资源为空');
    const supportsSimd = await FilesetResolver.isSimdSupported();
    if (!supportsSimd) throw new Error('当前浏览器不支持 MediaPipe Worker 所需的 WebAssembly SIMD');
    const fileset = { wasmLoaderPath: visionWasmModuleLoaderUrl, wasmBinaryPath: visionWasmModuleBinaryUrl };
    landmarker = await PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetBuffer: modelBuffer, delegate: 'CPU' },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: POSTURE_CAPTURE_CONFIG.model.minPoseDetectionConfidence,
      minPosePresenceConfidence: POSTURE_CAPTURE_CONFIG.model.minPosePresenceConfidence,
      minTrackingConfidence: POSTURE_CAPTURE_CONFIG.model.minTrackingConfidence,
      outputSegmentationMasks: false,
    });
    scope.postMessage({ type: 'READY', model: message.model, loadDurationMs: performance.now() - startedAt });
  } catch (error) {
    landmarker?.close();
    landmarker = null;
    scope.postMessage({
      type: 'ERROR',
      stage: 'initialize',
      code: 'MODEL_LOAD_FAILED',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function detect(bitmap: ImageBitmap, timestampMs: number) {
  const startedAt = performance.now();
  try {
    if (!landmarker) throw new Error('Pose Landmarker 尚未初始化');
    const result = landmarker.detectForVideo(bitmap, timestampMs);
    const inferenceTimeMs = performance.now() - startedAt;
    const pose = result.landmarks[0];
    if (!pose) {
      scope.postMessage({ type: 'NO_POSE', inferenceTimeMs, timestampMs });
      return;
    }
    const landmarks: PostureCaptureKeypoint[] = pose.map((landmark, index) => {
      const presence = (landmark as typeof landmark & { presence?: number }).presence;
      return {
        id: String(index),
        x: landmark.x,
        y: landmark.y,
        z: landmark.z,
        visibility: landmark.visibility,
        ...(presence === undefined ? {} : { presence }),
      };
    });
    scope.postMessage({ type: 'RESULT', result: { landmarks, inferenceTimeMs, timestampMs } });
  } catch (error) {
    scope.postMessage({
      type: 'ERROR',
      stage: 'inference',
      code: 'INFERENCE_FAILED',
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    bitmap.close();
  }
}

function dispose() {
  landmarker?.close();
  landmarker = null;
  scope.postMessage({ type: 'DISPOSED' });
  scope.close();
}
