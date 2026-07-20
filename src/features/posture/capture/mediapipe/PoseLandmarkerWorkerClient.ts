import type { PoseInferenceResult, PoseModelVariant } from '../captureLabTypes';
import { POSTURE_CAPTURE_CONFIG } from '../poseLandmarkerConfig';
import { InferenceBackpressure } from './InferenceBackpressure';
import type { PoseWorkerRequest, PoseWorkerResponse } from './poseWorkerProtocol';
import { summarizeRuntimeTelemetry } from './runtimeTelemetry';

export class PoseLandmarkerWorkerClient {
  private worker: Worker | null = null;
  private readonly gate = new InferenceBackpressure();
  private initializeResolve: ((value: number) => void) | null = null;
  private initializeReject: ((reason: Error) => void) | null = null;
  private detectionResolve: ((value: PoseInferenceResult | null) => void) | null = null;
  private detectionReject: ((reason: Error) => void) | null = null;
  private disposeResolve: (() => void) | null = null;
  private startedAtMs = 0;
  private endedAtMs = 0;
  private disposed = false;
  modelLoadDurationMs = 0;

  constructor(readonly model: PoseModelVariant) {}

  initialize(): Promise<number> {
    if (this.worker) return Promise.reject(new Error('MediaPipe Worker 已经初始化'));
    this.disposed = false;
    this.worker = new Worker(new URL('./pose-landmarker.worker.ts', import.meta.url), { type: 'module', name: `posture-pose-${this.model}` });
    this.worker.onmessage = (event: MessageEvent<PoseWorkerResponse>) => this.handleMessage(event.data);
    this.worker.onerror = (event) => this.handleWorkerError(event.message || 'MediaPipe Worker 启动失败');
    const modelUrl = this.model === 'full' ? POSTURE_CAPTURE_CONFIG.model.fullPath : POSTURE_CAPTURE_CONFIG.model.litePath;
    return new Promise<number>((resolve, reject) => {
      this.initializeResolve = resolve;
      this.initializeReject = reject;
      this.post({ type: 'INITIALIZE', model: this.model, modelUrl });
    });
  }

  async detect(video: HTMLVideoElement, proposedTimestampMs = performance.now()): Promise<PoseInferenceResult | null> {
    if (!this.worker || this.disposed) throw new Error('MediaPipe Worker 不可用');
    const lease = this.gate.tryAcquire(proposedTimestampMs);
    if (!lease.accepted) return null;
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(video);
    } catch (error) {
      this.gate.fail();
      throw new Error(`无法创建摄像头帧：${error instanceof Error ? error.message : String(error)}`);
    }
    if (!this.worker || this.disposed) {
      bitmap.close();
      this.gate.fail();
      return null;
    }
    if (!this.startedAtMs) this.startedAtMs = performance.now();
    return new Promise<PoseInferenceResult | null>((resolve, reject) => {
      this.detectionResolve = resolve;
      this.detectionReject = reject;
      try {
        this.worker?.postMessage({ type: 'DETECT', bitmap, timestampMs: lease.timestampMs } satisfies PoseWorkerRequest, [bitmap]);
      } catch (error) {
        bitmap.close();
        this.gate.fail();
        this.clearDetectionPromise();
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  telemetry(nowMs = performance.now()) {
    const snapshot = this.gate.snapshot();
    return summarizeRuntimeTelemetry({
      startedAtMs: this.startedAtMs || nowMs,
      endedAtMs: this.endedAtMs || nowMs,
      inferenceLatenciesMs: snapshot.inferenceLatenciesMs.slice(-POSTURE_CAPTURE_CONFIG.runtime.maxLatencySamples),
      processedFrames: snapshot.processedFrames,
      droppedFrames: snapshot.droppedFrames,
    });
  }

  async dispose() {
    if (!this.worker) return;
    this.disposed = true;
    this.endedAtMs = performance.now();
    this.gate.fail();
    this.detectionResolve?.(null);
    this.detectionResolve = null;
    this.detectionReject = null;
    const worker = this.worker;
    await new Promise<void>((resolve) => {
      this.disposeResolve = resolve;
      worker.postMessage({ type: 'DISPOSE' } satisfies PoseWorkerRequest);
      window.setTimeout(resolve, 500);
    });
    worker.terminate();
    if (this.worker === worker) this.worker = null;
  }

  private handleMessage(message: PoseWorkerResponse) {
    if (message.type === 'READY') {
      this.modelLoadDurationMs = message.loadDurationMs;
      this.initializeResolve?.(message.loadDurationMs);
      this.clearInitializePromise();
      return;
    }
    if (message.type === 'RESULT') {
      this.gate.release(message.result.inferenceTimeMs);
      this.detectionResolve?.(message.result);
      this.clearDetectionPromise();
      return;
    }
    if (message.type === 'NO_POSE') {
      this.gate.release(message.inferenceTimeMs);
      this.detectionResolve?.({ landmarks: [], inferenceTimeMs: message.inferenceTimeMs, timestampMs: message.timestampMs });
      this.clearDetectionPromise();
      return;
    }
    if (message.type === 'ERROR') {
      const error = new Error(`${message.code}: ${message.message}`);
      if (message.stage === 'initialize') {
        this.initializeReject?.(error);
        this.clearInitializePromise();
      } else {
        this.gate.fail();
        this.detectionReject?.(error);
        this.clearDetectionPromise();
      }
      return;
    }
    this.disposeResolve?.();
    this.disposeResolve = null;
  }

  private handleWorkerError(message: string) {
    const error = new Error(`WORKER_FAILED: ${message}`);
    this.gate.fail();
    this.initializeReject?.(error);
    this.detectionReject?.(error);
    this.clearInitializePromise();
    this.clearDetectionPromise();
  }

  private post(message: PoseWorkerRequest) {
    this.worker?.postMessage(message);
  }

  private clearInitializePromise() {
    this.initializeResolve = null;
    this.initializeReject = null;
  }

  private clearDetectionPromise() {
    this.detectionResolve = null;
    this.detectionReject = null;
  }
}
