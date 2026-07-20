import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { PostureCaptureKeypoint } from '../../../../types/postureAnalysis';
import { advanceCaptureSequence, initialCaptureSequence, type CaptureSequenceState } from '../captureSequence';
import type {
  CaptureCandidate,
  CaptureLabError,
  CaptureLabMode,
  CaptureLabTelemetry,
  CaptureQualityEvaluation,
  PoseModelVariant,
  StabilitySample,
} from '../captureLabTypes';
import { describeCameraError } from '../cameraError';
import { checkCaptureCapabilities } from '../mediapipe/checkCaptureCapabilities';
import { PoseLandmarkerWorkerClient } from '../mediapipe/PoseLandmarkerWorkerClient';
import { POSTURE_CAPTURE_CONFIG } from '../poseLandmarkerConfig';
import { BoundedCandidateStore } from '../quality/BoundedCandidateStore';
import { encodeVideoCandidate, scoreCaptureCandidate } from '../quality/captureCandidate';
import { evaluateCaptureQuality } from '../quality/evaluateCaptureQuality';
import { sampleVideoImageQuality } from '../quality/evaluateImageQuality';
import { evaluateStability } from '../quality/evaluateStability';
import { advanceStanceCalibration, initialStanceCalibration, isStanceCalibrationEligible } from '../quality/stanceCalibration';

export type CaptureLabStage = 'idle' | 'checking' | 'loading-model' | 'requesting-camera' | 'live' | 'switching-model' | 'result' | 'error';

export interface CaptureLabLiveRuntime {
  modelLoadDurationMs: number;
  processedFps: number;
  averageInferenceMs: number;
  p95InferenceMs: number;
  processedFrames: number;
  droppedFrames: number;
}

interface UsePostureCaptureLabOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
}

export function usePostureCaptureLab({ videoRef }: UsePostureCaptureLabOptions) {
  const [stage, setStageState] = useState<CaptureLabStage>('idle');
  const [mode, setModeState] = useState<CaptureLabMode>('front');
  const [model, setModelState] = useState<PoseModelVariant>('full');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [quality, setQuality] = useState<CaptureQualityEvaluation | null>(null);
  const [landmarks, setLandmarks] = useState<PostureCaptureKeypoint[]>([]);
  const [sequence, setSequenceState] = useState<CaptureSequenceState>(initialCaptureSequence);
  const [clockMs, setClockMs] = useState(0);
  const [telemetry, setTelemetry] = useState<CaptureLabTelemetry | null>(null);
  const [candidates, setCandidates] = useState<CaptureCandidate[]>([]);
  const [error, setError] = useState<CaptureLabError | null>(null);
  const [performanceWarning, setPerformanceWarning] = useState(false);
  const [liveRuntime, setLiveRuntime] = useState<CaptureLabLiveRuntime | null>(null);
  const [stanceCalibration, setStanceCalibration] = useState(initialStanceCalibration);

  const stageRef = useRef(stage);
  const modeRef = useRef(mode);
  const modelRef = useRef(model);
  const sequenceRef = useRef(sequence);
  const clientRef = useRef<PoseLandmarkerWorkerClient | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastAttemptAtRef = useRef(0);
  const stabilitySamplesRef = useRef<StabilitySample[]>([]);
  const performanceSamplesRef = useRef<number[]>([]);
  const imageQualityCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const candidateCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const candidateStoreRef = useRef(createCandidateStore());
  const candidateEncodingRef = useRef<Promise<void> | null>(null);
  const lastCandidateAtRef = useRef(0);
  const cameraSettingsRef = useRef<MediaTrackSettings | null>(null);
  const generationRef = useRef(0);
  const finishingRef = useRef(false);
  const stanceCalibrationRef = useRef(stanceCalibration);

  const setStage = useCallback((next: CaptureLabStage) => {
    stageRef.current = next;
    setStageState(next);
  }, []);

  const setSequence = useCallback((next: CaptureSequenceState) => {
    sequenceRef.current = next;
    setSequenceState(next);
  }, []);

  const stopCamera = useCallback(() => {
    for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    streamRef.current = null;
    setStream(null);
    const video = videoRef.current;
    if (video) video.srcObject = null;
  }, [videoRef]);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const resetTransientState = useCallback(() => {
    stabilitySamplesRef.current = [];
    performanceSamplesRef.current = [];
    candidateStoreRef.current.clear();
    lastCandidateAtRef.current = 0;
    candidateEncodingRef.current = null;
    setCandidates([]);
    setQuality(null);
    setLandmarks([]);
    setTelemetry(null);
    setLiveRuntime(null);
    setPerformanceWarning(false);
    const initialCalibration = initialStanceCalibration();
    stanceCalibrationRef.current = initialCalibration;
    setStanceCalibration(initialCalibration);
    setSequence(initialCaptureSequence());
  }, [setSequence]);

  const destroyRuntime = useCallback(() => {
    stopLoop();
    stopCamera();
    const client = clientRef.current;
    clientRef.current = null;
    if (client) void client.dispose();
  }, [stopCamera, stopLoop]);

  const fail = useCallback((nextError: CaptureLabError) => {
    generationRef.current += 1;
    destroyRuntime();
    setError(nextError);
    setStage('error');
  }, [destroyRuntime, setStage]);

  const encodeCandidate = useCallback((evaluation: CaptureQualityEvaluation, timestampMs: number, currentLandmarks: PostureCaptureKeypoint[]) => {
    const video = videoRef.current;
    if (!video || candidateEncodingRef.current || timestampMs - lastCandidateAtRef.current < POSTURE_CAPTURE_CONFIG.capture.candidateSampleIntervalMs) return;
    lastCandidateAtRef.current = timestampMs;
    const canvas = candidateCanvasRef.current ?? document.createElement('canvas');
    candidateCanvasRef.current = canvas;
    const candidateQuality = {
      completeness: evaluation.metrics.completeness,
      landmarkReliability: evaluation.metrics.averageReliability,
      sharpness: Math.min(1, evaluation.metrics.sharpness / POSTURE_CAPTURE_CONFIG.quality.sharpnessNormalizationCeiling),
      stability: evaluation.metrics.stability,
      failedRules: evaluation.blockingReasons,
    };
    candidateEncodingRef.current = encodeVideoCandidate(video, canvas).then(({ blob, width, height }) => {
      candidateStoreRef.current.consider({
        id: `candidate-${Math.round(timestampMs)}-${Math.random().toString(36).slice(2, 7)}`,
        score: scoreCaptureCandidate(candidateQuality),
        blob,
        width,
        height,
        capturedAtMs: timestampMs,
        quality: candidateQuality,
        landmarks: currentLandmarks.map((point) => ({ ...point })),
      });
    }).catch(() => undefined).finally(() => {
      candidateEncodingRef.current = null;
    });
  }, [videoRef]);

  const finishCapture = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setStage('result');
    stopLoop();
    await candidateEncodingRef.current;
    const client = clientRef.current;
    const runtime = client?.telemetry() ?? { processedFps: 0, averageInferenceMs: 0, p95InferenceMs: 0, processedFrames: 0, droppedFrames: 0 };
    const selected = candidateStoreRef.current.snapshot();
    setCandidates(selected);
    setTelemetry({
      model: modelRef.current,
      runtimeMode: 'worker',
      modelLoadDurationMs: client?.modelLoadDurationMs ?? 0,
      ...runtime,
      candidateCount: selected.length,
      candidateBytes: candidateStoreRef.current.totalBytes,
      userAgent: navigator.userAgent,
      platform: (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform ?? 'unknown',
      viewport: `${window.innerWidth} x ${window.innerHeight}`,
      cameraSettings: cameraSettingsRef.current,
    });
    stopCamera();
    clientRef.current = null;
    if (client) await client.dispose();
    finishingRef.current = false;
  }, [setStage, stopCamera, stopLoop]);

  const processInference = useCallback((result: Awaited<ReturnType<PoseLandmarkerWorkerClient['detect']>>) => {
    if (!result || stageRef.current !== 'live') return;
    const video = videoRef.current;
    if (!video) return;
    const nowMs = result.timestampMs;
    performanceSamplesRef.current.push(nowMs);
    performanceSamplesRef.current = performanceSamplesRef.current.filter((sample) => nowMs - sample <= POSTURE_CAPTURE_CONFIG.runtime.performanceWindowMs);
    setClockMs(nowMs);
    const currentLandmarks = result.landmarks;
    setLandmarks(currentLandmarks);
    if (currentLandmarks.length === 33) {
      stabilitySamplesRef.current.push({ timestampMs: nowMs, landmarks: currentLandmarks });
      stabilitySamplesRef.current = stabilitySamplesRef.current.filter((sample) => nowMs - sample.timestampMs <= POSTURE_CAPTURE_CONFIG.quality.stabilityWindowMs);
    } else {
      stabilitySamplesRef.current = [];
    }
    const imageCanvas = imageQualityCanvasRef.current ?? document.createElement('canvas');
    imageQualityCanvasRef.current = imageCanvas;
    const evaluationInput = {
      landmarks: currentLandmarks,
      mode: modeRef.current,
      frameAspectRatio: video.videoWidth > 0 && video.videoHeight > 0 ? video.videoWidth / video.videoHeight : 1,
      imageQuality: sampleVideoImageQuality(video, imageCanvas),
      stability: evaluateStability(stabilitySamplesRef.current),
      posePresencePassed: currentLandmarks.length === 33,
    };
    let evaluation = evaluateCaptureQuality({
      ...evaluationInput,
      frontMinSpanToTorsoRatio: stanceCalibrationRef.current.frontMinSpanToTorsoRatio ?? undefined,
    });
    const nextCalibration = advanceStanceCalibration(stanceCalibrationRef.current, {
      nowMs,
      eligible: isStanceCalibrationEligible(evaluation, modeRef.current),
      stanceRatio: evaluation.metrics.stanceRatio,
    });
    if (nextCalibration !== stanceCalibrationRef.current) {
      stanceCalibrationRef.current = nextCalibration;
      setStanceCalibration(nextCalibration);
    }
    if (nextCalibration.status === 'calibrated' && nextCalibration.frontMinSpanToTorsoRatio !== null) {
      evaluation = evaluateCaptureQuality({
        ...evaluationInput,
        frontMinSpanToTorsoRatio: nextCalibration.frontMinSpanToTorsoRatio,
      });
    }
    setQuality(evaluation);

    const client = clientRef.current;
    if (client) {
      setLiveRuntime({
        modelLoadDurationMs: client.modelLoadDurationMs,
        ...client.telemetry(nowMs),
      });
    }

    const currentSequence = sequenceRef.current;
    let nextSequence = currentSequence;
    if (currentSequence.phase === 'capturing') {
      nextSequence = advanceCaptureSequence(currentSequence, { type: 'TICK', nowMs });
      if (evaluation.passed) encodeCandidate(evaluation, nowMs, currentLandmarks);
    } else {
      nextSequence = advanceCaptureSequence(currentSequence, { type: 'QUALITY', passed: evaluation.passed, nowMs });
      if (nextSequence.phase === 'capturing' && evaluation.passed) encodeCandidate(evaluation, nowMs, currentLandmarks);
    }
    if (nextSequence !== currentSequence) setSequence(nextSequence);
    if (nextSequence.phase === 'result') void finishCapture();

    const windowStartedAt = performanceSamplesRef.current[0];
    const performanceElapsedMs = windowStartedAt === undefined ? 0 : nowMs - windowStartedAt;
    const windowFps = performanceElapsedMs > 0 ? (performanceSamplesRef.current.length - 1) / (performanceElapsedMs / 1000) : 0;
    if (modelRef.current === 'full'
      && performanceElapsedMs >= POSTURE_CAPTURE_CONFIG.runtime.performanceWindowMs * 0.9
      && windowFps < POSTURE_CAPTURE_CONFIG.runtime.fullPerformanceWarningFps) {
      setPerformanceWarning(true);
    }
  }, [encodeCandidate, finishCapture, setSequence, videoRef]);

  const startLoop = useCallback(() => {
    stopLoop();
    lastAttemptAtRef.current = 0;
    const intervalMs = 1000 / POSTURE_CAPTURE_CONFIG.runtime.targetInferenceFps;
    const tick = (nowMs: number) => {
      if (stageRef.current !== 'live') return;
      const video = videoRef.current;
      const client = clientRef.current;
      if (video && client && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && nowMs - lastAttemptAtRef.current >= intervalMs) {
        lastAttemptAtRef.current = nowMs;
        void client.detect(video, nowMs).then(processInference).catch((cause) => fail({
          code: 'INFERENCE_FAILED',
          title: '实时姿态推理中断',
          message: cause instanceof Error ? cause.message : String(cause),
          recoverable: true,
        }));
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [fail, processInference, stopLoop, videoRef]);

  const attachCamera = useCallback(async () => {
    setStage('requesting-camera');
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    let nextStream: MediaStream;
    try {
      nextStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 1280 }, frameRate: { ideal: 30, max: 30 } },
      });
    } catch (cause) {
      throw describeCameraError(cause);
    }
    const video = videoRef.current;
    if (!video) {
      nextStream.getTracks().forEach((track) => track.stop());
      throw { code: 'VIDEO_ELEMENT_MISSING', title: '摄像头画面不可用', message: '页面未能建立视频预览。', recoverable: true } satisfies CaptureLabError;
    }
    streamRef.current = nextStream;
    setStream(nextStream);
    cameraSettingsRef.current = nextStream.getVideoTracks()[0]?.getSettings() ?? null;
    video.srcObject = nextStream;
    await video.play();
  }, [setStage, videoRef]);

  const start = useCallback(async (requestedModel: PoseModelVariant = 'full') => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    finishingRef.current = false;
    destroyRuntime();
    resetTransientState();
    setError(null);
    setModelState(requestedModel);
    modelRef.current = requestedModel;
    setStage('checking');
    const capabilities = await checkCaptureCapabilities();
    if (generation !== generationRef.current) return;
    if (!capabilities.supported) {
      fail({
        code: 'UNSUPPORTED_BROWSER',
        title: '当前浏览器不支持实时拍摄实验',
        message: `缺少必要能力：${capabilities.missing.join(', ')}`,
        recoverable: false,
      });
      return;
    }
    const client = new PoseLandmarkerWorkerClient(requestedModel);
    clientRef.current = client;
    try {
      setStage('loading-model');
      await client.initialize();
      if (generation !== generationRef.current) return;
      await attachCamera();
      if (generation !== generationRef.current) return;
      setStage('live');
      startLoop();
    } catch (cause) {
      if (generation !== generationRef.current) return;
      if (isCaptureLabError(cause)) fail(cause);
      else fail({
        code: 'MODEL_LOAD_FAILED',
        title: 'MediaPipe 模型加载失败',
        message: cause instanceof Error ? cause.message : String(cause),
        recoverable: true,
      });
    }
  }, [attachCamera, destroyRuntime, fail, resetTransientState, setStage, startLoop]);

  const switchToLite = useCallback(async () => {
    if (modelRef.current === 'lite' || stageRef.current !== 'live') return;
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    stopLoop();
    setStage('switching-model');
    const oldClient = clientRef.current;
    clientRef.current = null;
    if (oldClient) await oldClient.dispose();
    if (generation !== generationRef.current) return;
    resetTransientState();
    const client = new PoseLandmarkerWorkerClient('lite');
    clientRef.current = client;
    modelRef.current = 'lite';
    setModelState('lite');
    try {
      await client.initialize();
      if (generation !== generationRef.current) return;
      setStage('live');
      startLoop();
    } catch (cause) {
      fail({
        code: 'LITE_MODEL_LOAD_FAILED',
        title: 'Lite 模型加载失败',
        message: cause instanceof Error ? cause.message : String(cause),
        recoverable: true,
      });
    }
  }, [fail, resetTransientState, setStage, startLoop, stopLoop]);

  const changeMode = useCallback((nextMode: CaptureLabMode) => {
    modeRef.current = nextMode;
    setModeState(nextMode);
    stabilitySamplesRef.current = [];
    candidateStoreRef.current.clear();
    setCandidates([]);
    setSequence(initialCaptureSequence());
    setQuality(null);
    const initialCalibration = initialStanceCalibration();
    stanceCalibrationRef.current = initialCalibration;
    setStanceCalibration(initialCalibration);
  }, [setSequence]);

  const exit = useCallback(() => {
    generationRef.current += 1;
    destroyRuntime();
    candidateStoreRef.current.clear();
    setCandidates([]);
  }, [destroyRuntime]);

  useEffect(() => exit, [exit]);

  return {
    stage,
    mode,
    model,
    stream,
    quality,
    landmarks,
    sequence,
    clockMs,
    telemetry,
    candidates,
    error,
    performanceWarning,
    liveRuntime,
    stanceCalibration,
    start,
    switchToLite,
    changeMode,
    retake: () => start(modelRef.current),
    exit,
  };
}

function createCandidateStore() {
  return new BoundedCandidateStore({
    maxCandidates: POSTURE_CAPTURE_CONFIG.capture.maxCandidates,
    maxBlobBytes: POSTURE_CAPTURE_CONFIG.capture.maxCandidateBlobBytes,
    maxTotalBytes: POSTURE_CAPTURE_CONFIG.capture.maxTotalCandidateBytes,
    maxWidth: POSTURE_CAPTURE_CONFIG.capture.maxCandidateWidth,
    maxHeight: POSTURE_CAPTURE_CONFIG.capture.maxCandidateHeight,
  });
}

function isCaptureLabError(value: unknown): value is CaptureLabError {
  return Boolean(value && typeof value === 'object' && 'code' in value && 'title' in value && 'message' in value);
}
