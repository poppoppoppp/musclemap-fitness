import type { PostureCaptureKeypoint } from '../../../../types/postureAnalysis';
import { POSTURE_CAPTURE_CONFIG } from '../poseLandmarkerConfig';
import type {
  CaptureImageQuality,
  CaptureLabMode,
  CaptureQualityEvaluation,
  CaptureRuleResult,
  CaptureStabilityResult,
} from '../captureLabTypes';

const LANDMARK_NAMES = [
  'NOSE', 'LEFT_EYE_INNER', 'LEFT_EYE', 'LEFT_EYE_OUTER', 'RIGHT_EYE_INNER', 'RIGHT_EYE', 'RIGHT_EYE_OUTER',
  'LEFT_EAR', 'RIGHT_EAR', 'LEFT_MOUTH', 'RIGHT_MOUTH', 'LEFT_SHOULDER', 'RIGHT_SHOULDER', 'LEFT_ELBOW',
  'RIGHT_ELBOW', 'LEFT_WRIST', 'RIGHT_WRIST', 'LEFT_PINKY', 'RIGHT_PINKY', 'LEFT_INDEX', 'RIGHT_INDEX',
  'LEFT_THUMB', 'RIGHT_THUMB', 'LEFT_HIP', 'RIGHT_HIP', 'LEFT_KNEE', 'RIGHT_KNEE', 'LEFT_ANKLE',
  'RIGHT_ANKLE', 'LEFT_HEEL', 'RIGHT_HEEL', 'LEFT_FOOT_INDEX', 'RIGHT_FOOT_INDEX',
] as const;

const GROUPS = {
  head: [7, 8],
  shoulders: [11, 12],
  hips: [23, 24],
  knees: [25, 26],
  ankles: [27, 28],
  framing: [7, 8, 11, 12, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32],
} as const;

const SIDE_CHAINS = {
  left: { head: 7, shoulders: 11, hips: 23, knees: 25, ankles: 27, framing: [7, 11, 23, 25, 27, 29, 31] },
  right: { head: 8, shoulders: 12, hips: 24, knees: 26, ankles: 28, framing: [8, 12, 24, 26, 28, 30, 32] },
} as const;

type SideChain = typeof SIDE_CHAINS[keyof typeof SIDE_CHAINS];

interface SideProfile {
  chain: SideChain;
  complete: boolean;
}

interface EvaluateInput {
  landmarks: PostureCaptureKeypoint[];
  mode: CaptureLabMode;
  frameAspectRatio: number;
  frontMinSpanToTorsoRatio?: number;
  imageQuality: CaptureImageQuality;
  stability: CaptureStabilityResult;
  posePresencePassed?: boolean;
}

interface Reliability {
  reliable: boolean;
  reasonCode?: string;
  score: number;
}

export function evaluateCaptureQuality(input: EvaluateInput): CaptureQualityEvaluation {
  const reliability = input.landmarks.map((point, index) => evaluateLandmarkReliability(point, index, input.posePresencePassed ?? false));
  const sideProfile = input.mode === 'side' ? selectSideProfile(reliability) : null;
  const framingIndices = sideProfile?.chain.framing ?? GROUPS.framing;
  const reasons = new Set<string>();
  const group = (indices: readonly number[]): CaptureRuleResult => {
    const failures = indices.flatMap((index) => reliability[index]?.reliable ? [] : [reliability[index]?.reasonCode ?? `${LANDMARK_NAMES[index]}_MISSING`]);
    failures.forEach((reason) => reasons.add(reason));
    return failures.length ? { status: 'fail', reasonCode: failures[0] } : { status: 'pass' };
  };

  const head = group(sideProfile ? [sideProfile.chain.head] : GROUPS.head);
  const shoulders = group(sideProfile ? [sideProfile.chain.shoulders] : GROUPS.shoulders);
  const hips = group(sideProfile ? [sideProfile.chain.hips] : GROUPS.hips);
  const knees = group(sideProfile ? [sideProfile.chain.knees] : GROUPS.knees);
  const ankles = group(sideProfile ? [sideProfile.chain.ankles] : GROUPS.ankles);
  const reliableFraming = framingIndices.filter((index) => reliability[index]?.reliable);
  const hasReliableVerticalExtent = head.status === 'pass' && ankles.status === 'pass';
  const bounds = hasReliableVerticalExtent ? getBounds(input.landmarks, [...framingIndices], reliability) : null;
  const bodyHeightRatio = bounds ? bounds.maxY - bounds.minY : null;
  const distance = evaluateDistance(bodyHeightRatio);
  if (distance.status === 'fail' && distance.reasonCode) reasons.add(distance.reasonCode);

  const centerOffset = getCenterOffset(input.landmarks, reliability, sideProfile);
  const centering = centerOffset === null
    ? { status: 'unknown', reasonCode: 'BODY_CENTER_UNKNOWN' } satisfies CaptureRuleResult
    : centerOffset <= POSTURE_CAPTURE_CONFIG.quality.maxCenterOffset
      ? { status: 'pass' } satisfies CaptureRuleResult
      : { status: 'fail', reasonCode: 'BODY_OFF_CENTER' } satisfies CaptureRuleResult;
  if (centering.status === 'fail' && centering.reasonCode) reasons.add(centering.reasonCode);

  const stanceEvaluation = evaluateStance(
    input.mode,
    input.landmarks,
    reliability,
    sideProfile,
    input.frameAspectRatio,
    input.frontMinSpanToTorsoRatio,
  );
  const stance = stanceEvaluation.rule;
  if (stance.status === 'fail' && stance.reasonCode) reasons.add(stance.reasonCode);

  const occlusion = framingIndices.some((index) => !reliability[index]?.reliable)
    ? { status: 'fail', reasonCode: 'KEYPOINT_OCCLUDED_OR_UNRELIABLE' } satisfies CaptureRuleResult
    : { status: 'pass' } satisfies CaptureRuleResult;
  if (occlusion.status === 'fail' && occlusion.reasonCode) reasons.add(occlusion.reasonCode);

  const stability = input.stability.stable
    ? { status: 'pass' } satisfies CaptureRuleResult
    : { status: 'fail', reasonCode: 'BODY_NOT_STABLE' } satisfies CaptureRuleResult;
  if (stability.status === 'fail' && stability.reasonCode) reasons.add(stability.reasonCode);

  const lighting = input.imageQuality.meanLuma >= POSTURE_CAPTURE_CONFIG.quality.minimumMeanLuma
    ? { status: 'pass' } satisfies CaptureRuleResult
    : { status: 'fail', reasonCode: 'IMAGE_TOO_DARK' } satisfies CaptureRuleResult;
  if (lighting.status === 'fail' && lighting.reasonCode) reasons.add(lighting.reasonCode);

  const sharpness = input.imageQuality.sharpness >= POSTURE_CAPTURE_CONFIG.quality.minimumSharpness
    ? { status: 'pass' } satisfies CaptureRuleResult
    : { status: 'fail', reasonCode: 'IMAGE_TOO_BLURRY' } satisfies CaptureRuleResult;
  if (sharpness.status === 'fail' && sharpness.reasonCode) reasons.add(sharpness.reasonCode);

  const requiredGroupRules = [head, shoulders, hips, knees, ankles];
  const wholeBody = requiredGroupRules.every((rule) => rule.status === 'pass') && (sideProfile?.complete ?? true)
    ? { status: 'pass' } satisfies CaptureRuleResult
    : { status: 'fail', reasonCode: 'WHOLE_BODY_INCOMPLETE' } satisfies CaptureRuleResult;
  if (wholeBody.status === 'fail' && wholeBody.reasonCode) reasons.add(wholeBody.reasonCode);

  const rules = { wholeBody, head, shoulders, hips, knees, ankles, distance, centering, stance, occlusion, stability, lighting, sharpness };
  const blockingReasons = [...reasons];
  const averageReliability = framingIndices.reduce((sum, index) => sum + (reliability[index]?.score ?? 0), 0) / framingIndices.length;

  return {
    passed: Object.values(rules).every((rule) => rule.status === 'pass'),
    blockingReasons,
    rules,
    metrics: {
      completeness: reliableFraming.length / framingIndices.length,
      averageReliability,
      bodyHeightRatio,
      centerOffset,
      stanceRatio: stanceEvaluation.ratio,
      sharpness: input.imageQuality.sharpness,
      stability: input.stability.score,
    },
  };
}

function evaluateLandmarkReliability(point: PostureCaptureKeypoint | undefined, index: number, posePresencePassed: boolean): Reliability {
  const name = LANDMARK_NAMES[index] ?? `LANDMARK_${index}`;
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) {
    return { reliable: false, reasonCode: `${name}_OUT_OF_FRAME`, score: 0 };
  }
  const visibility = point.visibility ?? 0;
  const presence = point.presence;
  const presenceReliable = presence === undefined ? posePresencePassed : presence >= POSTURE_CAPTURE_CONFIG.quality.presenceThreshold;
  if (visibility < POSTURE_CAPTURE_CONFIG.quality.visibilityThreshold || !presenceReliable) {
    return { reliable: false, reasonCode: `${name}_NOT_RELIABLE`, score: Math.min(visibility, presence ?? visibility) };
  }
  const margin = POSTURE_CAPTURE_CONFIG.quality.edgeMargin;
  if (point.x < margin || point.x > 1 - margin || point.y < margin || point.y > 1 - margin) {
    return { reliable: false, reasonCode: `${name}_NEAR_EDGE`, score: Math.min(visibility, presence ?? visibility) };
  }
  return { reliable: true, score: Math.min(visibility, presence ?? visibility) };
}

function evaluateDistance(bodyHeightRatio: number | null): CaptureRuleResult {
  if (bodyHeightRatio === null) return { status: 'unknown', reasonCode: 'BODY_DISTANCE_UNKNOWN' };
  if (bodyHeightRatio < POSTURE_CAPTURE_CONFIG.quality.minBodyHeightRatio) return { status: 'fail', reasonCode: 'BODY_TOO_FAR' };
  if (bodyHeightRatio > POSTURE_CAPTURE_CONFIG.quality.maxBodyHeightRatio) return { status: 'fail', reasonCode: 'BODY_TOO_NEAR' };
  return { status: 'pass' };
}

function evaluateStance(
  mode: CaptureLabMode,
  points: PostureCaptureKeypoint[],
  reliability: Reliability[],
  sideProfile: SideProfile | null,
  frameAspectRatio: number,
  frontMinSpanToTorsoRatio?: number,
): { rule: CaptureRuleResult; ratio: number | null } {
  if (mode === 'back') return { rule: { status: 'pass', reasonCode: 'BACK_DIRECTION_USER_SELECTED' }, ratio: null };
  const required = [11, 12, 23, 24];
  if (mode === 'front' && !required.every((index) => reliability[index]?.reliable)) {
    return { rule: { status: 'unknown', reasonCode: 'STANCE_POINTS_UNRELIABLE' }, ratio: null };
  }
  if (mode === 'side' && (!sideProfile?.complete || !required.every((index) => finiteInFrame(points[index])))) {
    return { rule: { status: 'unknown', reasonCode: 'STANCE_POINTS_UNRELIABLE' }, ratio: null };
  }
  const aspectRatio = Number.isFinite(frameAspectRatio) && frameAspectRatio > 0 ? frameAspectRatio : 1;
  const shoulders = midpoint(points[11], points[12]);
  const hips = midpoint(points[23], points[24]);
  const torsoHeight = Math.max(Math.hypot((hips.x - shoulders.x) * aspectRatio, hips.y - shoulders.y), 0.01);
  const averageSpan = (Math.abs(points[11].x - points[12].x) + Math.abs(points[23].x - points[24].x)) / 2 * aspectRatio;
  const ratio = averageSpan / torsoHeight;
  if (mode === 'front') {
    const threshold = frontMinSpanToTorsoRatio ?? POSTURE_CAPTURE_CONFIG.quality.frontMinSpanToTorsoRatio;
    return {
      rule: ratio >= threshold ? { status: 'pass' } : { status: 'fail', reasonCode: 'FRONT_STANCE_NOT_PLAUSIBLE' },
      ratio,
    };
  }
  return {
    rule: ratio <= POSTURE_CAPTURE_CONFIG.quality.sideMaxSpanToTorsoRatio
      ? { status: 'pass' }
      : { status: 'fail', reasonCode: 'SIDE_STANCE_NOT_PLAUSIBLE' },
    ratio,
  };
}

function getBounds(points: PostureCaptureKeypoint[], indices: number[], reliability: Reliability[]) {
  const selected = indices
    .map((index) => reliability[index]?.reliable ? points[index] : undefined)
    .filter((point): point is PostureCaptureKeypoint => Boolean(point));
  if (!selected.length) return null;
  return {
    minY: Math.min(...selected.map((point) => point.y)),
    maxY: Math.max(...selected.map((point) => point.y)),
  };
}

function getCenterOffset(points: PostureCaptureKeypoint[], reliability: Reliability[], sideProfile: SideProfile | null) {
  const indices = sideProfile ? [sideProfile.chain.shoulders, sideProfile.chain.hips] : [11, 12, 23, 24];
  if (!indices.every((index) => reliability[index]?.reliable)) return null;
  const center = indices.reduce((sum, index) => sum + points[index].x, 0) / indices.length;
  return Math.abs(center - 0.5);
}

function selectSideProfile(reliability: Reliability[]): SideProfile {
  const profiles = Object.values(SIDE_CHAINS).map((chain) => ({
    chain,
    complete: chain.framing.every((index) => reliability[index]?.reliable),
    reliableCount: chain.framing.filter((index) => reliability[index]?.reliable).length,
    score: chain.framing.reduce((sum, index) => sum + (reliability[index]?.score ?? 0), 0),
  }));
  profiles.sort((left, right) => Number(right.complete) - Number(left.complete)
    || right.reliableCount - left.reliableCount
    || right.score - left.score);
  return { chain: profiles[0].chain, complete: profiles[0].complete };
}

function finiteInFrame(point: PostureCaptureKeypoint | undefined) {
  return Boolean(point
    && Number.isFinite(point.x)
    && Number.isFinite(point.y)
    && point.x >= 0
    && point.x <= 1
    && point.y >= 0
    && point.y <= 1);
}

function midpoint(left: PostureCaptureKeypoint, right: PostureCaptureKeypoint) {
  return { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
}
