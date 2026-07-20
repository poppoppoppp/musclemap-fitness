import type {
  DynamicCapturedFrame,
  PostureInferenceView,
  PostureKeypointResponse,
  PostureMovementAction,
  PostureMovementAnalysisResponse,
  PostureStaticAnalysisResponse,
  PostureVisibleSide,
} from '../../../../types/postureAnalysis';
import { PostureInferenceApiError } from './postureInferenceApi';

interface BaseRequestOptions {
  baseUrl?: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

export async function submitStaticPostureAnalysis({
  keypointResult,
  view,
  visibleSide,
  baseUrl = import.meta.env.VITE_POSTURE_INFERENCE_API_URL,
  signal,
  fetchImpl = fetch,
}: BaseRequestOptions & {
  keypointResult: PostureKeypointResponse;
  view: PostureInferenceView;
  visibleSide?: PostureVisibleSide;
}): Promise<PostureStaticAnalysisResponse> {
  return requestJson(
    `${normalizedBase(baseUrl)}/v1/posture/analysis/static`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        view,
        visibleSide: visibleSide ?? null,
        modelId: keypointResult.model.id,
        modelVersion: keypointResult.model.version,
        boundingBox: keypointResult.person.boundingBox,
        keypoints: keypointResult.person.keypoints,
      }),
      signal,
    },
    fetchImpl,
    isStaticResponse,
  );
}

export async function submitMovementAnalysis({
  frames,
  action,
  view,
  visibleSide,
  baseUrl = import.meta.env.VITE_POSTURE_INFERENCE_API_URL,
  signal,
  fetchImpl = fetch,
}: BaseRequestOptions & {
  frames: DynamicCapturedFrame[];
  action: PostureMovementAction;
  view: 'front' | 'side';
  visibleSide?: PostureVisibleSide;
}): Promise<PostureMovementAnalysisResponse> {
  if (frames.length > 40) {
    throw new PostureInferenceApiError('MOVEMENT_FRAME_LIMIT_EXCEEDED', '动态分析最多提交 40 帧，失败帧也计入上限。', false, null);
  }
  const form = new FormData();
  frames.forEach((frame, index) => form.append('frames', frame.blob, `movement-${index}.jpg`));
  form.append('action', action);
  form.append('view', view);
  form.append('timestampsMs', JSON.stringify(frames.map((frame) => frame.timestampMs)));
  if (visibleSide) form.append('visibleSide', visibleSide);
  return requestJson(
    `${normalizedBase(baseUrl)}/v1/posture/analysis/movement`,
    { method: 'POST', body: form, signal },
    fetchImpl,
    isMovementResponse,
  );
}

function normalizedBase(baseUrl: string) {
  const value = baseUrl.trim().replace(/\/+$/, '');
  if (!value) throw new PostureInferenceApiError('API_URL_NOT_CONFIGURED', '未配置体态分析服务地址。', false, null);
  return value;
}

async function requestJson<T>(
  url: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
  validate: (value: unknown) => value is T,
): Promise<T> {
  let response: Response;
  try {
    response = await fetchImpl(url, init);
  } catch (cause) {
    throw new PostureInferenceApiError('API_UNREACHABLE', cause instanceof Error ? cause.message : '无法连接体态分析服务。', true, null);
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new PostureInferenceApiError('API_RESPONSE_INVALID', '体态分析服务没有返回有效 JSON。', true, response.status);
  }
  if (!response.ok) {
    const error = (body as { error?: { code?: string; message?: string; retryable?: boolean; details?: Record<string, unknown> } }).error;
    throw new PostureInferenceApiError(
      error?.code ?? 'API_REQUEST_FAILED',
      error?.message ?? `体态分析服务返回 HTTP ${response.status}。`,
      error?.retryable ?? response.status >= 500,
      response.status,
      error?.details,
    );
  }
  if (!validate(body)) throw new PostureInferenceApiError('ANALYSIS_RESPONSE_INVALID', '体态分析服务返回了无法识别的数据结构。', true, response.status);
  return body;
}

function isStaticResponse(value: unknown): value is PostureStaticAnalysisResponse {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PostureStaticAnalysisResponse>;
  return candidate.analysisVersion === 'posture-metrics-v1'
    && Array.isArray(candidate.rawKeypoints)
    && Array.isArray(candidate.normalizedKeypoints)
    && Array.isArray(candidate.filteredKeypoints)
    && Array.isArray(candidate.metrics)
    && candidate.metrics.every((metric) => typeof metric.formula === 'string' && Array.isArray(metric.values));
}

function isMovementResponse(value: unknown): value is PostureMovementAnalysisResponse {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PostureMovementAnalysisResponse>;
  return typeof candidate.requestId === 'string'
    && Array.isArray(candidate.frames)
    && candidate.analysis?.analysisVersion === 'posture-metrics-v1'
    && Array.isArray(candidate.analysis.rawFrames)
    && Array.isArray(candidate.analysis.processedFrames)
    && Array.isArray(candidate.analysis.metrics)
    && Array.isArray(candidate.analysis.trajectories);
}
