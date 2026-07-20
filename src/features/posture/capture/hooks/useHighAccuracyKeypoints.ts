import { useCallback, useEffect, useRef, useState } from 'react';
import type { PostureInferenceView, PostureKeypointResponse } from '../../../../types/postureAnalysis';
import type { CaptureCandidate } from '../captureLabTypes';
import { PostureInferenceApiError, submitPostureKeypoints } from '../inference/postureInferenceApi';

export type HighAccuracyKeypointStatus = 'idle' | 'loading' | 'success' | 'error';

export function useHighAccuracyKeypoints(
  candidate: CaptureCandidate | undefined,
  view: PostureInferenceView,
  baseUrl?: string,
) {
  const [status, setStatus] = useState<HighAccuracyKeypointStatus>('idle');
  const [result, setResult] = useState<PostureKeypointResponse | null>(null);
  const [error, setError] = useState<PostureInferenceApiError | null>(null);
  const requestGenerationRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    requestGenerationRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus('idle');
    setResult(null);
    setError(null);
    return () => abortRef.current?.abort();
  }, [candidate?.id, view]);

  const submit = useCallback(async () => {
    if (!candidate || status === 'loading') return;
    const generation = requestGenerationRef.current + 1;
    requestGenerationRef.current = generation;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus('loading');
    setError(null);
    setResult(null);
    try {
      const response = await submitPostureKeypoints({
        blob: candidate.blob,
        view,
        baseUrl,
        signal: controller.signal,
      });
      if (generation !== requestGenerationRef.current) return;
      if (response.image.width !== candidate.width || response.image.height !== candidate.height) {
        throw new PostureInferenceApiError(
          'IMAGE_DIMENSION_MISMATCH',
          `后端返回尺寸 ${response.image.width} × ${response.image.height}，与最佳帧 ${candidate.width} × ${candidate.height} 不一致。`,
          true,
          null,
        );
      }
      setResult(response);
      setStatus('success');
    } catch (cause) {
      if (generation !== requestGenerationRef.current) return;
      const nextError = cause instanceof PostureInferenceApiError
        ? cause
        : new PostureInferenceApiError('API_REQUEST_FAILED', cause instanceof Error ? cause.message : String(cause), true, null);
      setError(nextError);
      setStatus('error');
    } finally {
      if (generation === requestGenerationRef.current) abortRef.current = null;
    }
  }, [baseUrl, candidate, status, view]);

  return { status, result, error, submit };
}
