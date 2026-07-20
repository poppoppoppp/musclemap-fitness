import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type {
  DynamicCapturedFrame,
  PostureMovementAction,
  PostureMovementAnalysisResponse,
  PostureVisibleSide,
} from '../../../../types/postureAnalysis';
import { DYNAMIC_MOVEMENT_CONFIGS } from '../analysis/analysisConfig';
import { selectFramesByTimestamp } from '../analysis/selectFramesByTimestamp';
import { submitMovementAnalysis } from '../inference/postureAnalysisApi';
import { PostureInferenceApiError } from '../inference/postureInferenceApi';

export type DynamicCaptureStage = 'idle' | 'requesting-camera' | 'ready' | 'countdown' | 'capturing' | 'captured' | 'submitting' | 'success' | 'error';

interface UseDynamicPostureCaptureOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  action: PostureMovementAction;
  visibleSide?: PostureVisibleSide;
  baseUrl?: string;
}

export function useDynamicPostureCapture({ videoRef, action, visibleSide, baseUrl }: UseDynamicPostureCaptureOptions) {
  const [stage, setStage] = useState<DynamicCaptureStage>('idle');
  const [countdownRemaining, setCountdownRemaining] = useState(3);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [frames, setFrames] = useState<DynamicCapturedFrame[]>([]);
  const [rawFrameCount, setRawFrameCount] = useState(0);
  const [result, setResult] = useState<PostureMovementAnalysisResponse | null>(null);
  const [error, setError] = useState<PostureInferenceApiError | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerIdsRef = useRef<number[]>([]);
  const generationRef = useRef(0);
  const config = DYNAMIC_MOVEMENT_CONFIGS[action];

  const clearTimers = useCallback(() => {
    timerIdsRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timerIdsRef.current = [];
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, [videoRef]);

  const reset = useCallback(() => {
    generationRef.current += 1;
    clearTimers();
    stopCamera();
    setStage('idle');
    setCountdownRemaining(3);
    setElapsedMs(0);
    setFrames([]);
    setRawFrameCount(0);
    setResult(null);
    setError(null);
  }, [clearTimers, stopCamera]);

  useEffect(() => reset, [reset]);
  useEffect(() => {
    reset();
  }, [action, visibleSide, reset]);

  const startCamera = useCallback(async () => {
    reset();
    const generation = generationRef.current;
    setStage('requesting-camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 1280 }, frameRate: { ideal: 30, max: 30 } },
        audio: false,
      });
      if (generation !== generationRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      if (!videoRef.current) throw new Error('动态采集视频元素未就绪。');
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStage('ready');
    } catch (cause) {
      if (generation !== generationRef.current) return;
      setError(new PostureInferenceApiError('CAMERA_UNAVAILABLE', cause instanceof Error ? cause.message : '无法打开摄像头。', true, null));
      setStage('error');
    }
  }, [reset, videoRef]);

  const startCapture = useCallback(() => {
    if (stage !== 'ready' || !videoRef.current) return;
    clearTimers();
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    setCountdownRemaining(3);
    setElapsedMs(0);
    setFrames([]);
    setRawFrameCount(0);
    setResult(null);
    setError(null);
    setStage('countdown');
    const countdownStarted = performance.now();
    const countdownTicker = window.setInterval(() => {
      const remaining = Math.max(1, Math.ceil((config.countdownMs - (performance.now() - countdownStarted)) / 1000));
      setCountdownRemaining(remaining);
    }, 100);
    timerIdsRef.current.push(countdownTicker);
    const countdownEnd = window.setTimeout(() => {
      window.clearInterval(countdownTicker);
      timerIdsRef.current = timerIdsRef.current.filter((id) => id !== countdownTicker);
      if (generation !== generationRef.current || !videoRef.current) return;
      setStage('capturing');
      const captureStarted = performance.now();
      const pending: Array<Promise<DynamicCapturedFrame | null>> = [];
      const sample = () => {
        if (!videoRef.current) return;
        const timestampMs = Math.min(config.durationMs, performance.now() - captureStarted);
        pending.push(encodeVideoFrame(videoRef.current, timestampMs, `${generation}-${pending.length}`));
        setElapsedMs(timestampMs);
      };
      sample();
      const captureTicker = window.setInterval(sample, 1000 / config.captureFps);
      timerIdsRef.current.push(captureTicker);
      const captureEnd = window.setTimeout(async () => {
        window.clearInterval(captureTicker);
        timerIdsRef.current = timerIdsRef.current.filter((id) => id !== captureTicker);
        sample();
        const captured = (await Promise.all(pending))
          .filter((frame): frame is DynamicCapturedFrame => frame !== null)
          .sort((left, right) => left.timestampMs - right.timestampMs)
          .filter((frame, index, ordered) => index === 0 || frame.timestampMs > ordered[index - 1].timestampMs);
        if (generation !== generationRef.current) return;
        const selected = selectFramesByTimestamp(captured, { targetFps: config.analysisFps, maxFrames: config.maxFrames });
        setRawFrameCount(captured.length);
        setFrames(selected);
        setElapsedMs(config.durationMs);
        stopCamera();
        if (!selected.length) {
          setError(new PostureInferenceApiError('CAPTURE_NO_FRAMES', '动态采集没有生成可提交的图像帧。', true, null));
          setStage('error');
        } else {
          setStage('captured');
        }
      }, config.durationMs);
      timerIdsRef.current.push(captureEnd);
    }, config.countdownMs);
    timerIdsRef.current.push(countdownEnd);
  }, [clearTimers, config, stage, stopCamera, videoRef]);

  const submit = useCallback(async () => {
    if (!frames.length || stage === 'submitting') return;
    setStage('submitting');
    setError(null);
    try {
      const response = await submitMovementAnalysis({ frames, action, view: config.view, visibleSide, baseUrl });
      setResult(response);
      setStage('success');
    } catch (cause) {
      setError(cause instanceof PostureInferenceApiError
        ? cause
        : new PostureInferenceApiError('MOVEMENT_REQUEST_FAILED', cause instanceof Error ? cause.message : String(cause), true, null));
      setStage('error');
    }
  }, [action, baseUrl, config.view, frames, stage, visibleSide]);

  return {
    stage,
    config,
    countdownRemaining,
    elapsedMs,
    frames,
    rawFrameCount,
    result,
    error,
    startCamera,
    startCapture,
    submit,
    reset,
  };
}

function encodeVideoFrame(video: HTMLVideoElement, timestampMs: number, id: string): Promise<DynamicCapturedFrame | null> {
  const width = video.videoWidth || 720;
  const height = video.videoHeight || 720;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return Promise.resolve(null);
  context.drawImage(video, 0, 0, width, height);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ? { id, timestampMs, blob, width, height } : null), 'image/jpeg', 0.9);
  });
}
