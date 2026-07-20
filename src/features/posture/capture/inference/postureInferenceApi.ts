import type {
  PostureInferenceErrorBody,
  PostureInferenceView,
  PostureKeypointResponse,
} from '../../../../types/postureAnalysis';
import { HALPE26_NAMES } from './halpe26';

interface SubmitPostureKeypointsOptions {
  blob: Blob;
  view: PostureInferenceView;
  baseUrl?: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

export class PostureInferenceApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable: boolean,
    readonly status: number | null,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'PostureInferenceApiError';
  }
}

export async function submitPostureKeypoints({
  blob,
  view,
  baseUrl = import.meta.env.VITE_POSTURE_INFERENCE_API_URL,
  signal,
  fetchImpl = fetch,
}: SubmitPostureKeypointsOptions): Promise<PostureKeypointResponse> {
  const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, '');
  if (!normalizedBaseUrl) {
    throw new PostureInferenceApiError(
      'API_URL_NOT_CONFIGURED',
      '未配置高精度关键点服务地址。请设置 VITE_POSTURE_INFERENCE_API_URL。',
      false,
      null,
    );
  }
  const form = new FormData();
  form.append('image', blob, `best-frame.${extensionFor(blob.type)}`);
  form.append('view', view);
  let response: Response;
  try {
    response = await fetchImpl(`${normalizedBaseUrl}/v1/posture/keypoints`, {
      method: 'POST',
      body: form,
      signal,
    });
  } catch (cause) {
    if (cause instanceof PostureInferenceApiError) throw cause;
    throw new PostureInferenceApiError(
      'API_UNREACHABLE',
      cause instanceof Error ? cause.message : '无法连接高精度关键点服务。',
      true,
      null,
    );
  }
  const body = await parseJson(response);
  if (!response.ok) {
    const errorBody = body as Partial<PostureInferenceErrorBody>;
    const error = errorBody.error;
    throw new PostureInferenceApiError(
      error?.code ?? 'API_REQUEST_FAILED',
      error?.message ?? `高精度关键点服务返回 HTTP ${response.status}。`,
      error?.retryable ?? response.status >= 500,
      response.status,
      error?.details ?? {},
    );
  }
  if (!isKeypointResponse(body)) {
    throw new PostureInferenceApiError(
      'MODEL_RESPONSE_INVALID',
      '高精度关键点服务返回了无法识别的坐标或关键点结构。',
      true,
      response.status,
    );
  }
  return body;
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new PostureInferenceApiError(
      'API_RESPONSE_INVALID',
      '高精度关键点服务没有返回有效 JSON。',
      true,
      response.status,
    );
  }
}

function isKeypointResponse(value: unknown): value is PostureKeypointResponse {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PostureKeypointResponse>;
  return candidate.coordinateSpace?.id === 'original-image-pixels'
    && candidate.keypointSchema?.id === 'halpe26'
    && candidate.keypointSchema.count === 26
    && candidate.keypointSchema.names?.every((name, index) => name === HALPE26_NAMES[index])
    && candidate.person?.keypoints?.length === 26
    && candidate.person.keypoints.every((point, index) => point.index === index
      && point.name === HALPE26_NAMES[index]
      && Number.isFinite(point.x)
      && Number.isFinite(point.y)
      && Number.isFinite(point.score))
    && Number.isFinite(candidate.image?.width)
    && (candidate.image?.width ?? 0) > 0
    && Number.isFinite(candidate.image?.height)
    && (candidate.image?.height ?? 0) > 0;
}

function extensionFor(mimeType: string) {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  return 'webp';
}
