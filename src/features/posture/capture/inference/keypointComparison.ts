import type {
  PostureCaptureKeypoint,
  PostureInferenceBoundingBox,
  PostureInferenceKeypoint,
  PostureInferenceView,
} from '../../../../types/postureAnalysis';

export interface DirectKeypointMapping {
  id: string;
  label: string;
  mediaPipeIndex: number;
  halpeIndex: number;
}

export const DIRECT_KEYPOINT_MAPPINGS: ReadonlyArray<DirectKeypointMapping> = [
  { id: 'nose', label: '鼻', mediaPipeIndex: 0, halpeIndex: 0 },
  { id: 'left-ear', label: '左耳', mediaPipeIndex: 7, halpeIndex: 3 },
  { id: 'right-ear', label: '右耳', mediaPipeIndex: 8, halpeIndex: 4 },
  { id: 'left-shoulder', label: '左肩', mediaPipeIndex: 11, halpeIndex: 5 },
  { id: 'right-shoulder', label: '右肩', mediaPipeIndex: 12, halpeIndex: 6 },
  { id: 'left-elbow', label: '左肘', mediaPipeIndex: 13, halpeIndex: 7 },
  { id: 'right-elbow', label: '右肘', mediaPipeIndex: 14, halpeIndex: 8 },
  { id: 'left-wrist', label: '左腕', mediaPipeIndex: 15, halpeIndex: 9 },
  { id: 'right-wrist', label: '右腕', mediaPipeIndex: 16, halpeIndex: 10 },
  { id: 'left-hip', label: '左髋', mediaPipeIndex: 23, halpeIndex: 11 },
  { id: 'right-hip', label: '右髋', mediaPipeIndex: 24, halpeIndex: 12 },
  { id: 'left-knee', label: '左膝', mediaPipeIndex: 25, halpeIndex: 13 },
  { id: 'right-knee', label: '右膝', mediaPipeIndex: 26, halpeIndex: 14 },
  { id: 'left-ankle', label: '左踝', mediaPipeIndex: 27, halpeIndex: 15 },
  { id: 'right-ankle', label: '右踝', mediaPipeIndex: 28, halpeIndex: 16 },
  { id: 'left-heel', label: '左脚跟', mediaPipeIndex: 29, halpeIndex: 24 },
  { id: 'right-heel', label: '右脚跟', mediaPipeIndex: 30, halpeIndex: 25 },
];

export const NON_COMPARABLE_MEDIAPIPE = [
  { id: 'left-eye-landmarks', indices: [1, 2, 3], reason: 'MediaPipe exposes multiple eye landmarks, not the HALPE eye annotation.' },
  { id: 'right-eye-landmarks', indices: [4, 5, 6], reason: 'MediaPipe exposes multiple eye landmarks, not the HALPE eye annotation.' },
  { id: 'left-foot-index', index: 31, reason: 'Foot index is not explicitly a big toe or small toe.' },
  { id: 'right-foot-index', index: 32, reason: 'Foot index is not explicitly a big toe or small toe.' },
] as const;

export const NON_COMPARABLE_HALPE26 = [
  { id: 'left-eye', index: 1, reason: 'No single equivalent MediaPipe eye point is assumed.' },
  { id: 'right-eye', index: 2, reason: 'No single equivalent MediaPipe eye point is assumed.' },
  { id: 'head', index: 17, reason: 'No direct MediaPipe point.' },
  { id: 'neck', index: 18, reason: 'No direct MediaPipe point.' },
  { id: 'hip', index: 19, reason: 'No direct MediaPipe point.' },
  { id: 'left-big-toe', index: 20, reason: 'MediaPipe foot index is not a named big toe.' },
  { id: 'right-big-toe', index: 21, reason: 'MediaPipe foot index is not a named big toe.' },
  { id: 'left-small-toe', index: 22, reason: 'MediaPipe foot index is not a named small toe.' },
  { id: 'right-small-toe', index: 23, reason: 'MediaPipe foot index is not a named small toe.' },
] as const;

export type DifferenceNormalizationBasis = 'shoulder-width' | 'torso-length' | 'bounding-box-diagonal';

export interface KeypointComparisonResult {
  normalization: { basis: DifferenceNormalizationBasis; pixels: number };
  points: Array<{
    id: string;
    label: string;
    mediaPipeIndex: number;
    halpeIndex: number;
    mediaPipePixel: { x: number; y: number };
    rtmPosePixel: { x: number; y: number };
    mediaPipeConfidence: number;
    rtmPoseConfidence: number;
    comparable: boolean;
    reason?: 'low-confidence';
    distancePixels: number | null;
    normalizedDistance: number | null;
  }>;
  comparablePointCount: number;
  medianNormalizedDistance: number | null;
  p95NormalizedDistance: number | null;
  lowConfidenceRtmPose: Array<{ index: number; name: string; score: number }>;
}

interface CompareKeypointsInput {
  mediaPipe: PostureCaptureKeypoint[];
  rtmPose: PostureInferenceKeypoint[];
  imageWidth: number;
  imageHeight: number;
  boundingBox: PostureInferenceBoundingBox;
  view: PostureInferenceView;
  mediaPipeConfidenceThreshold?: number;
  rtmPoseConfidenceThreshold?: number;
}

export function compareKeypoints({
  mediaPipe,
  rtmPose,
  imageWidth,
  imageHeight,
  boundingBox,
  view,
  mediaPipeConfidenceThreshold = 0.3,
  rtmPoseConfidenceThreshold = 0.3,
}: CompareKeypointsInput): KeypointComparisonResult {
  const normalization = chooseNormalization({
    mediaPipe,
    rtmPose,
    imageWidth,
    imageHeight,
    boundingBox,
    view,
    mediaPipeConfidenceThreshold,
    rtmPoseConfidenceThreshold,
  });
  const points = DIRECT_KEYPOINT_MAPPINGS.map((mapping) => {
    const mediaPipePoint = mediaPipe[mapping.mediaPipeIndex];
    const rtmPosePoint = rtmPose[mapping.halpeIndex];
    const mediaPipePixel = {
      x: (mediaPipePoint?.x ?? Number.NaN) * imageWidth,
      y: (mediaPipePoint?.y ?? Number.NaN) * imageHeight,
    };
    const rtmPosePixel = { x: rtmPosePoint?.x ?? Number.NaN, y: rtmPosePoint?.y ?? Number.NaN };
    const mediaPipeConfidence = captureConfidence(mediaPipePoint);
    const rtmPoseConfidence = rtmPosePoint?.score ?? 0;
    const comparable = finitePoint(mediaPipePixel)
      && finitePoint(rtmPosePixel)
      && mediaPipeConfidence >= mediaPipeConfidenceThreshold
      && rtmPoseConfidence >= rtmPoseConfidenceThreshold;
    const distancePixels = comparable ? distance(mediaPipePixel, rtmPosePixel) : null;
    return {
      ...mapping,
      mediaPipePixel,
      rtmPosePixel,
      mediaPipeConfidence,
      rtmPoseConfidence,
      comparable,
      ...(comparable ? {} : { reason: 'low-confidence' as const }),
      distancePixels,
      normalizedDistance: distancePixels === null ? null : distancePixels / normalization.pixels,
    };
  });
  const distances = points
    .map((point) => point.normalizedDistance)
    .filter((value): value is number => value !== null)
    .sort((left, right) => left - right);
  return {
    normalization,
    points,
    comparablePointCount: distances.length,
    medianNormalizedDistance: percentile(distances, 0.5),
    p95NormalizedDistance: percentile(distances, 0.95),
    lowConfidenceRtmPose: rtmPose
      .filter((point) => point.score < rtmPoseConfidenceThreshold)
      .map(({ index, name, score }) => ({ index, name, score })),
  };
}

function chooseNormalization(input: CompareKeypointsInput) {
  if (input.view !== 'side') {
    const shoulderWidth = meanModelSpan(input, 11, 12, 5, 6);
    if (shoulderWidth !== null) return { basis: 'shoulder-width' as const, pixels: shoulderWidth };
  } else {
    const leftTorso = meanModelSpan(input, 11, 23, 5, 11);
    const rightTorso = meanModelSpan(input, 12, 24, 6, 12);
    const torsoLength = [leftTorso, rightTorso].filter((value): value is number => value !== null).sort((a, b) => b - a)[0];
    if (torsoLength) return { basis: 'torso-length' as const, pixels: torsoLength };
  }
  return {
    basis: 'bounding-box-diagonal' as const,
    pixels: Math.max(1, Math.hypot(input.boundingBox.width, input.boundingBox.height)),
  };
}

function meanModelSpan(
  input: CompareKeypointsInput,
  mediaPipeFrom: number,
  mediaPipeTo: number,
  halpeFrom: number,
  halpeTo: number,
) {
  const mediaPipeStart = input.mediaPipe[mediaPipeFrom];
  const mediaPipeEnd = input.mediaPipe[mediaPipeTo];
  const rtmStart = input.rtmPose[halpeFrom];
  const rtmEnd = input.rtmPose[halpeTo];
  if (captureConfidence(mediaPipeStart) < (input.mediaPipeConfidenceThreshold ?? 0.3)
    || captureConfidence(mediaPipeEnd) < (input.mediaPipeConfidenceThreshold ?? 0.3)
    || (rtmStart?.score ?? 0) < (input.rtmPoseConfidenceThreshold ?? 0.3)
    || (rtmEnd?.score ?? 0) < (input.rtmPoseConfidenceThreshold ?? 0.3)) return null;
  const mediaPipePixels = [mediaPipeStart, mediaPipeEnd].map((point) => ({ x: point.x * input.imageWidth, y: point.y * input.imageHeight }));
  const rtmPixels = [rtmStart, rtmEnd].map((point) => ({ x: point.x, y: point.y }));
  const spans = [distance(mediaPipePixels[0], mediaPipePixels[1]), distance(rtmPixels[0], rtmPixels[1])];
  const mean = (spans[0] + spans[1]) / 2;
  return Number.isFinite(mean) && mean > 1 ? mean : null;
}

function captureConfidence(point: PostureCaptureKeypoint | undefined) {
  if (!point) return 0;
  const visibility = point.visibility ?? 0;
  return point.presence === undefined ? visibility : Math.min(visibility, point.presence);
}

function finitePoint(point: { x: number; y: number }) {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function distance(from: { x: number; y: number }, to: { x: number; y: number }) {
  return Math.hypot(from.x - to.x, from.y - to.y);
}

function percentile(ordered: number[], quantile: number) {
  if (!ordered.length) return null;
  const index = (ordered.length - 1) * quantile;
  const lower = Math.floor(index);
  const upper = Math.min(lower + 1, ordered.length - 1);
  return ordered[lower] * (upper - index) + ordered[upper] * (index - lower);
}
