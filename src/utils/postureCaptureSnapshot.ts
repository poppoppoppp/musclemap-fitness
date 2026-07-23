import type {
  PostureCaptureMetricSnapshot,
  PostureCaptureModelSnapshot,
  PostureCaptureSnapshot,
  PostureCaptureWarningSnapshot,
  PostureMovementCaptureSnapshot,
  PostureStaticCaptureSnapshot,
} from '../repositories/postureScreeningRepository';
import type {
  PostureInferenceModelInfo,
  PostureInferenceWarning,
  PostureKeypointResponse,
  PostureMetricResult,
  PostureMovementAnalysisResponse,
  PostureStaticAnalysisResponse,
} from '../types/postureAnalysis';
import type { CaptureCandidateQuality } from '../features/posture/capture/captureLabTypes';

export function buildStaticCaptureSnapshot(
  keypoints: PostureKeypointResponse,
  analysis: PostureStaticAnalysisResponse,
  quality: CaptureCandidateQuality,
): PostureStaticCaptureSnapshot {
  const metrics = analysis.metrics.map(toMetricSnapshot);
  const validMetricCount = metrics.filter((metric) => metric.status === 'valid' && metric.quality === 'valid').length;
  return {
    view: analysis.view,
    visibleSide: analysis.visibleSide,
    status: validMetricCount === metrics.length && metrics.length > 0 ? 'valid' : validMetricCount > 0 ? 'partial' : 'unavailable',
    quality: {
      completeness: quality.completeness,
      landmarkReliability: quality.landmarkReliability,
      sharpness: quality.sharpness,
      stability: quality.stability,
      failedRules: [...quality.failedRules],
    },
    warnings: keypoints.warnings.map(toWarningSnapshot),
    model: toModelSnapshot(keypoints.model),
    detector: toModelSnapshot(keypoints.detector),
    timingMs: { ...keypoints.timingMs },
    metrics,
  };
}

export function buildMovementCaptureSnapshot(response: PostureMovementAnalysisResponse): PostureMovementCaptureSnapshot {
  const warnings: PostureCaptureWarningSnapshot[] = [];
  for (const frame of response.frames) {
    for (const warning of frame.warnings ?? []) warnings.push({ ...toWarningSnapshot(warning), frameIndex: frame.index });
    if (frame.status === 'failed' && frame.error) {
      warnings.push({
        code: frame.error.code,
        severity: 'warning',
        message: frame.error.message,
        details: cloneRecord(frame.error.details),
        frameIndex: frame.index,
      });
    }
  }
  return {
    action: response.analysis.action,
    view: response.analysis.view,
    visibleSide: response.analysis.visibleSide,
    status: response.analysis.status,
    submittedFrames: response.frames.length,
    validFrames: response.frames.filter((frame) => frame.status === 'valid').length,
    phases: {
      status: response.analysis.phases.status,
      startIndex: response.analysis.phases.startIndex,
      peakIndex: response.analysis.phases.peakIndex,
      returnIndex: response.analysis.phases.returnIndex,
      holdIndices: [...response.analysis.phases.holdIndices],
      reasons: [...response.analysis.phases.reasons],
    },
    warnings,
    model: toModelSnapshot(response.model),
    detector: toModelSnapshot(response.detector),
    timingMs: { ...response.timingMs },
    metrics: response.analysis.metrics.map(toMetricSnapshot),
  };
}

export function buildPostureCaptureSnapshot(
  staticCaptures: PostureStaticCaptureSnapshot[],
  movements: PostureMovementCaptureSnapshot[],
  completedAt = new Date().toISOString(),
): PostureCaptureSnapshot {
  const allRequiredCaptured = staticCaptures.length === 3 && movements.length === 3;
  const allValid = allRequiredCaptured
    && staticCaptures.every((capture) => capture.status === 'valid')
    && movements.every((movement) => movement.status === 'valid');
  const hasUsableResult = staticCaptures.some((capture) => capture.status !== 'unavailable')
    || movements.some((movement) => movement.status !== 'unavailable');
  return {
    protocolVersion: 'automated-posture-capture-v1',
    validity: allValid ? 'valid' : hasUsableResult ? 'partial' : 'invalid',
    completedAt,
    staticCaptures: staticCaptures.map(cloneStaticCapture),
    movements: movements.map(cloneMovementCapture),
  };
}

function toMetricSnapshot(metric: PostureMetricResult): PostureCaptureMetricSnapshot {
  return {
    metricId: metric.id,
    label: metric.label,
    status: metric.status,
    quality: metric.quality,
    values: metric.values.map((value) => ({ label: value.label, value: value.value, unit: value.unit })),
    confidence: metric.confidence,
    unavailableReasons: [...metric.unavailableReasons],
    formula: metric.formula,
    analysisVersion: metric.analysisVersion,
    modelId: metric.modelId,
    modelVersion: metric.modelVersion,
  };
}

function toWarningSnapshot(warning: PostureInferenceWarning): PostureCaptureWarningSnapshot {
  return {
    code: warning.code,
    severity: warning.severity,
    message: warning.message,
    ...(warning.details ? { details: cloneRecord(warning.details) } : {}),
  };
}

function toModelSnapshot(model: PostureInferenceModelInfo): PostureCaptureModelSnapshot {
  return { id: model.id, version: model.version, checkpointSha256: model.checkpointSha256 };
}

function cloneStaticCapture(capture: PostureStaticCaptureSnapshot): PostureStaticCaptureSnapshot {
  return JSON.parse(JSON.stringify(capture)) as PostureStaticCaptureSnapshot;
}

function cloneMovementCapture(capture: PostureMovementCaptureSnapshot): PostureMovementCaptureSnapshot {
  return JSON.parse(JSON.stringify(capture)) as PostureMovementCaptureSnapshot;
}

function cloneRecord(value: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}
