import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  PostureInferenceView,
  PostureKeypointResponse,
  PostureStaticAnalysisResponse,
  PostureVisibleSide,
} from '../../../../types/postureAnalysis';
import { submitStaticPostureAnalysis } from '../inference/postureAnalysisApi';
import { PostureInferenceApiError } from '../inference/postureInferenceApi';

export function useStaticPostureAnalysis(
  keypointResult: PostureKeypointResponse,
  view: PostureInferenceView,
  visibleSide: PostureVisibleSide | undefined,
  baseUrl?: string,
) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<PostureStaticAnalysisResponse | null>(null);
  const [error, setError] = useState<PostureInferenceApiError | null>(null);
  const generationRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    generationRef.current += 1;
    abortRef.current?.abort();
    setStatus('idle');
    setResult(null);
    setError(null);
    return () => abortRef.current?.abort();
  }, [keypointResult.requestId, view, visibleSide]);

  const submit = useCallback(async () => {
    if (status === 'loading' || (view === 'side' && !visibleSide)) return;
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus('loading');
    setError(null);
    try {
      const response = await submitStaticPostureAnalysis({ keypointResult, view, visibleSide, baseUrl, signal: controller.signal });
      if (generation !== generationRef.current) return;
      setResult(response);
      setStatus('success');
    } catch (cause) {
      if (generation !== generationRef.current) return;
      setError(cause instanceof PostureInferenceApiError
        ? cause
        : new PostureInferenceApiError('ANALYSIS_REQUEST_FAILED', cause instanceof Error ? cause.message : String(cause), true, null));
      setStatus('error');
    }
  }, [baseUrl, keypointResult, status, view, visibleSide]);

  return { status, result, error, submit };
}
