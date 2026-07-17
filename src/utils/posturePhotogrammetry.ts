import type { PostureMeasurementError } from '../types/postureScreening';

export interface NormalizedPoint {
  x: number;
  y: number;
}

export type PosturePhotoView = 'front' | 'left-lateral';

export type PostureLandmarkId =
  | 'tragus'
  | 'c7'
  | 'acromion'
  | 'upperTrunk'
  | 'lowerTrunk'
  | 'leftEar'
  | 'rightEar'
  | 'leftAcromion'
  | 'rightAcromion'
  | 'upperTrunkMidline'
  | 'lowerTrunkMidline';

export type PostureMeasurementResult =
  | {
      ok: true;
      metricId: string;
      value: number;
      unit: 'deg' | 'ratio';
      evidenceIds: string[];
    }
  | { ok: false; reasonCode: 'POINT_OUT_OF_RANGE' | 'POINTS_TOO_CLOSE' };

export interface PostureCaptureInput {
  view: PosturePhotoView;
  imageWidth: number;
  imageHeight: number;
  standingConfirmed: boolean;
  landmarks: Partial<Record<PostureLandmarkId, NormalizedPoint>>;
}

export type PostureCaptureQuality =
  | { ok: true }
  | { ok: false; reasonCodes: string[] };

const MIN_IMAGE_EDGE = 320;
const MIN_POINT_DISTANCE = 0.005;
const TO_DEGREES = 180 / Math.PI;

const metricEvidence = {
  'craniovertebral-angle': ['cva-classic-photogrammetry-review-v1', 'cva-standing-standardization-v1'],
  'frontal-head-tilt': ['upper-body-photogrammetry-review-v1'],
  'frontal-shoulder-height-difference': ['upper-body-photogrammetry-review-v1'],
  'lateral-shoulder-angle': ['upper-body-photogrammetry-review-v1'],
  'lateral-trunk-inclination': ['upper-body-photogrammetry-review-v1', 'thoracic-kyphosis-instrument-review-v1'],
  'frontal-trunk-deviation': ['upper-body-photogrammetry-review-v1'],
} as const;

export const posturePhotogrammetryEvidenceReferences = Object.entries(metricEvidence).map(
  ([metricId, evidenceIds]) => ({ ownerId: `metric-${metricId}-v1`, evidenceIds: [...evidenceIds] }),
);

const requiredLandmarks: Record<PosturePhotoView, PostureLandmarkId[]> = {
  'left-lateral': ['tragus', 'c7', 'acromion', 'upperTrunk', 'lowerTrunk'],
  front: ['leftEar', 'rightEar', 'leftAcromion', 'rightAcromion', 'upperTrunkMidline', 'lowerTrunkMidline'],
};

function normalizeForMirror(point: NormalizedPoint, mirrored = false): NormalizedPoint {
  return mirrored ? { x: 1 - point.x, y: point.y } : point;
}

function isNormalizedPoint(point: NormalizedPoint): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y) && point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1;
}

function distance(first: NormalizedPoint, second: NormalizedPoint): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function validatePair(first: NormalizedPoint, second: NormalizedPoint): PostureMeasurementResult | null {
  if (!isNormalizedPoint(first) || !isNormalizedPoint(second)) return { ok: false, reasonCode: 'POINT_OUT_OF_RANGE' };
  if (distance(first, second) < MIN_POINT_DISTANCE) return { ok: false, reasonCode: 'POINTS_TOO_CLOSE' };
  return null;
}

function angleAgainstHorizontal(first: NormalizedPoint, second: NormalizedPoint): number {
  return Math.atan2(second.y - first.y, Math.abs(second.x - first.x)) * TO_DEGREES;
}

function angleAgainstVertical(upper: NormalizedPoint, lower: NormalizedPoint): number {
  return Math.atan2(upper.x - lower.x, lower.y - upper.y) * TO_DEGREES;
}

export function calculateCraniovertebralAngle(
  c7: NormalizedPoint,
  tragus: NormalizedPoint,
  options: { mirrored?: boolean } = {},
): PostureMeasurementResult {
  const normalizedC7 = normalizeForMirror(c7, options.mirrored);
  const normalizedTragus = normalizeForMirror(tragus, options.mirrored);
  const invalid = validatePair(normalizedC7, normalizedTragus);
  if (invalid) return invalid;
  return {
    ok: true,
    metricId: 'craniovertebral-angle',
    value: Math.atan2(normalizedC7.y - normalizedTragus.y, Math.abs(normalizedTragus.x - normalizedC7.x)) * TO_DEGREES,
    unit: 'deg',
    evidenceIds: [...metricEvidence['craniovertebral-angle']],
  };
}

export function calculateFrontalHeadTilt(
  leftEar: NormalizedPoint,
  rightEar: NormalizedPoint,
  options: { mirrored?: boolean } = {},
): PostureMeasurementResult {
  const left = normalizeForMirror(leftEar, options.mirrored);
  const right = normalizeForMirror(rightEar, options.mirrored);
  const invalid = validatePair(left, right);
  if (invalid) return invalid;
  return {
    ok: true,
    metricId: 'frontal-head-tilt',
    value: angleAgainstHorizontal(left, right),
    unit: 'deg',
    evidenceIds: [...metricEvidence['frontal-head-tilt']],
  };
}

export function calculateFrontalShoulderHeightDifference(
  leftAcromion: NormalizedPoint,
  rightAcromion: NormalizedPoint,
  options: { mirrored?: boolean } = {},
): PostureMeasurementResult {
  const left = normalizeForMirror(leftAcromion, options.mirrored);
  const right = normalizeForMirror(rightAcromion, options.mirrored);
  const invalid = validatePair(left, right);
  if (invalid) return invalid;
  return {
    ok: true,
    metricId: 'frontal-shoulder-height-difference',
    value: right.y - left.y,
    unit: 'ratio',
    evidenceIds: [...metricEvidence['frontal-shoulder-height-difference']],
  };
}

export function calculateLateralShoulderAngle(
  c7: NormalizedPoint,
  acromion: NormalizedPoint,
  options: { mirrored?: boolean } = {},
): PostureMeasurementResult {
  const normalizedC7 = normalizeForMirror(c7, options.mirrored);
  const normalizedAcromion = normalizeForMirror(acromion, options.mirrored);
  const invalid = validatePair(normalizedC7, normalizedAcromion);
  if (invalid) return invalid;
  return {
    ok: true,
    metricId: 'lateral-shoulder-angle',
    value: Math.abs(angleAgainstHorizontal(normalizedC7, normalizedAcromion)),
    unit: 'deg',
    evidenceIds: [...metricEvidence['lateral-shoulder-angle']],
  };
}

export function calculateLateralTrunkInclination(
  upperTrunk: NormalizedPoint,
  lowerTrunk: NormalizedPoint,
  options: { mirrored?: boolean } = {},
): PostureMeasurementResult {
  const upper = normalizeForMirror(upperTrunk, options.mirrored);
  const lower = normalizeForMirror(lowerTrunk, options.mirrored);
  const invalid = validatePair(upper, lower);
  if (invalid) return invalid;
  return {
    ok: true,
    metricId: 'lateral-trunk-inclination',
    value: angleAgainstVertical(upper, lower),
    unit: 'deg',
    evidenceIds: [...metricEvidence['lateral-trunk-inclination']],
  };
}

export function calculateFrontalTrunkDeviation(
  upperTrunkMidline: NormalizedPoint,
  lowerTrunkMidline: NormalizedPoint,
  options: { mirrored?: boolean } = {},
): PostureMeasurementResult {
  const upper = normalizeForMirror(upperTrunkMidline, options.mirrored);
  const lower = normalizeForMirror(lowerTrunkMidline, options.mirrored);
  const invalid = validatePair(upper, lower);
  if (invalid) return invalid;
  return {
    ok: true,
    metricId: 'frontal-trunk-deviation',
    value: angleAgainstVertical(upper, lower),
    unit: 'deg',
    evidenceIds: [...metricEvidence['frontal-trunk-deviation']],
  };
}

function toReasonLabel(landmark: PostureLandmarkId): string {
  return landmark.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();
}

export function validatePosturePhotoCapture(input: PostureCaptureInput): PostureCaptureQuality {
  const reasonCodes: string[] = [];
  if (!Number.isFinite(input.imageWidth) || !Number.isFinite(input.imageHeight) || input.imageWidth < MIN_IMAGE_EDGE || input.imageHeight < MIN_IMAGE_EDGE) {
    reasonCodes.push('IMAGE_TOO_SMALL');
  }
  if (!input.standingConfirmed) reasonCodes.push('CAPTURE_PROTOCOL_UNCONFIRMED');

  const required = requiredLandmarks[input.view];
  for (const landmark of required) {
    if (!input.landmarks[landmark]) reasonCodes.push(`LANDMARK_MISSING_${toReasonLabel(landmark)}`);
  }
  for (const landmark of required) {
    const point = input.landmarks[landmark];
    if (point && !isNormalizedPoint(point)) reasonCodes.push(`POINT_OUT_OF_RANGE_${toReasonLabel(landmark)}`);
  }
  for (let firstIndex = 0; firstIndex < required.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < required.length; secondIndex += 1) {
      const firstId = required[firstIndex];
      const secondId = required[secondIndex];
      const first = input.landmarks[firstId];
      const second = input.landmarks[secondId];
      if (first && second && isNormalizedPoint(first) && isNormalizedPoint(second) && distance(first, second) < MIN_POINT_DISTANCE) {
        const pair = [toReasonLabel(firstId), toReasonLabel(secondId)].sort().join('_');
        reasonCodes.push(`POINTS_TOO_CLOSE_${pair}`);
      }
    }
  }

  return reasonCodes.length === 0 ? { ok: true } : { ok: false, reasonCodes };
}

export type MeasurementChangeClassification =
  | { kind: 'within-error' | 'beyond-error'; difference: number; threshold: number }
  | { kind: 'not-comparable'; difference: number };

export function classifyMeasurementChange(
  baseline: number,
  current: number,
  measurementError: PostureMeasurementError,
): MeasurementChangeClassification {
  const difference = current - baseline;
  if (measurementError.status !== 'reported' || measurementError.applicability !== 'direct') {
    return { kind: 'not-comparable', difference };
  }
  return Math.abs(difference) <= measurementError.value
    ? { kind: 'within-error', difference, threshold: measurementError.value }
    : { kind: 'beyond-error', difference, threshold: measurementError.value };
}
