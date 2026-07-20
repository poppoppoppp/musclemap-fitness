import type { PostureCaptureKeypoint } from '../../../../types/postureAnalysis';
import { POSTURE_CAPTURE_CONFIG } from '../poseLandmarkerConfig';
import type { CaptureStabilityResult, StabilitySample } from '../captureLabTypes';

const STABILITY_INDICES = [11, 12, 23, 24, 25, 26, 27, 28] as const;

export function evaluateStability(samples: StabilitySample[]): CaptureStabilityResult {
  const recent = trimWindow(samples);
  if (recent.length < POSTURE_CAPTURE_CONFIG.quality.minimumStabilitySamples) {
    return { stable: false, score: 0, sampleCount: recent.length };
  }

  let maximumDelta = 0;
  for (let index = 1; index < recent.length; index += 1) {
    maximumDelta = Math.max(maximumDelta, relativeDelta(recent[index - 1].landmarks, recent[index].landmarks));
  }

  const threshold = POSTURE_CAPTURE_CONFIG.quality.stabilityMaxTorsoNormalizedDelta;
  const score = clamp01(1 - maximumDelta / threshold);
  return { stable: maximumDelta <= threshold, score, sampleCount: recent.length };
}

function trimWindow(samples: StabilitySample[]): StabilitySample[] {
  const ordered = [...samples].sort((left, right) => left.timestampMs - right.timestampMs);
  const latest = ordered.at(-1)?.timestampMs;
  if (latest === undefined) return [];
  return ordered.filter((sample) => latest - sample.timestampMs <= POSTURE_CAPTURE_CONFIG.quality.stabilityWindowMs);
}

function relativeDelta(previous: PostureCaptureKeypoint[], current: PostureCaptureKeypoint[]): number {
  const previousCenter = torsoCenter(previous);
  const currentCenter = torsoCenter(current);
  const scale = Math.max(torsoHeight(previous), torsoHeight(current), 0.05);
  let squared = 0;
  let count = 0;

  for (const index of STABILITY_INDICES) {
    const from = previous[index];
    const to = current[index];
    if (!from || !to || !reliablePoint(from) || !reliablePoint(to)) continue;
    const dx = (to.x - currentCenter.x) - (from.x - previousCenter.x);
    const dy = (to.y - currentCenter.y) - (from.y - previousCenter.y);
    squared += (dx * dx + dy * dy) / (scale * scale);
    count += 1;
  }
  return count ? Math.sqrt(squared / count) : Number.POSITIVE_INFINITY;
}

function torsoCenter(points: PostureCaptureKeypoint[]) {
  return averagePoints([points[11], points[12], points[23], points[24]]);
}

function torsoHeight(points: PostureCaptureKeypoint[]): number {
  const shoulders = averagePoints([points[11], points[12]]);
  const hips = averagePoints([points[23], points[24]]);
  return Math.hypot(hips.x - shoulders.x, hips.y - shoulders.y);
}

function averagePoints(points: Array<PostureCaptureKeypoint | undefined>) {
  const valid = points.filter((point): point is PostureCaptureKeypoint => Boolean(point && reliablePoint(point)));
  if (!valid.length) return { x: 0, y: 0 };
  return {
    x: valid.reduce((sum, point) => sum + point.x, 0) / valid.length,
    y: valid.reduce((sum, point) => sum + point.y, 0) / valid.length,
  };
}

function finitePoint(point: PostureCaptureKeypoint) {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function reliablePoint(point: PostureCaptureKeypoint) {
  if (!finitePoint(point)) return false;
  if ((point.visibility ?? 0) < POSTURE_CAPTURE_CONFIG.quality.visibilityThreshold) return false;
  if (point.presence !== undefined && point.presence < POSTURE_CAPTURE_CONFIG.quality.presenceThreshold) return false;
  const margin = POSTURE_CAPTURE_CONFIG.quality.edgeMargin;
  return point.x >= margin && point.x <= 1 - margin && point.y >= margin && point.y <= 1 - margin;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}
