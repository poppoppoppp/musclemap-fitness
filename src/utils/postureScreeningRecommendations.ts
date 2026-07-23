import type { PostureRecommendationSnapshot, PostureScreeningPatternId } from '../repositories/postureScreeningRepository';
import type { PostureScreeningResult } from './postureScreeningRules';
import { addPostureProtocolToActiveWorkout, createManualActiveWorkout, readActiveWorkout, writeActiveWorkout } from './activeWorkout';
import { getPosturePlanEligibility } from './posturePlanRules';
import { getPostureProtocolById } from './postureProtocols';
import { addPostureProtocolGroupToTrainingTemplate, createTrainingTemplate } from './trainingTemplates';

export const POSTURE_SCREENING_PROTOCOL_WHITELIST = {
  'forward-head-upper-quarter-tendency': 'UPPER_POSTURE_001',
  'thoracic-rotation-mobility-tendency': 'THORACIC_001',
} as const satisfies Partial<Record<PostureScreeningPatternId, string>>;

const SUPPORTED_PATTERN_IDS = new Set<PostureScreeningPatternId>([
  'forward-head-upper-quarter-tendency',
  'thoracic-rotation-mobility-tendency',
  'frontal-shoulder-asymmetry-tendency',
  'frontal-trunk-deviation-tendency',
]);

export function buildPostureRecommendationSnapshots(result: PostureScreeningResult): PostureRecommendationSnapshot[] {
  return result.findings.flatMap((finding) => {
    if (!isSupportedPatternId(finding.patternId)) return [];
    const patternId = finding.patternId;
    const protocolId = POSTURE_SCREENING_PROTOCOL_WHITELIST[patternId as keyof typeof POSTURE_SCREENING_PROTOCOL_WHITELIST];
    if (!protocolId) return [unavailable(patternId, finding.label, '该筛查表现暂无适配方案。')];
    const protocol = getPostureProtocolById(protocolId);
    if (!protocol) return [unavailable(patternId, finding.label, '白名单方案当前不可用。')];
    const eligibility = getPosturePlanEligibility(protocol);
    if (!eligibility.eligible) return [unavailable(patternId, finding.label, '白名单方案当前不满足训练接入条件。')];
    return [{
      patternId,
      status: 'available' as const,
      issueNames: [finding.label],
      protocolId: protocol.id,
      protocolTitle: protocol.title,
      userFacingGoal: protocol.userFacingGoal,
      limitations: [...protocol.limitations],
      reason: '筛查 finding 命中独立白名单配置。',
    }];
  });
}

export type AddScreeningRecommendationResult =
  | { status: 'added' }
  | { status: 'already-added' }
  | { status: 'unavailable' }
  | { status: 'storage-failed' };

export type AddScreeningRecommendationToTemplateTarget =
  | { kind: 'existing'; templateId: string }
  | { kind: 'new'; name: string };

export type AddScreeningRecommendationToTemplateResult =
  | { status: 'added'; templateId: string; created: boolean }
  | { status: 'already-added'; templateId: string; created: false }
  | { status: 'unavailable' | 'not-found' | 'storage-failed' | 'invalid-name' };

export function addScreeningRecommendationToCurrentWorkout(
  recommendation: PostureRecommendationSnapshot | undefined,
  now = new Date(),
): AddScreeningRecommendationResult {
  if (recommendation?.status !== 'available' || !recommendation.protocolId) return { status: 'unavailable' };
  const protocol = getPostureProtocolById(recommendation.protocolId);
  if (!protocol || !getPosturePlanEligibility(protocol).eligible) return { status: 'unavailable' };
  const workout = readActiveWorkout() ?? createManualActiveWorkout(now);
  if (workout.postureProtocolGroups?.some(({ sourceProtocolId }) => sourceProtocolId === protocol.id)) return { status: 'already-added' };
  const next = addPostureProtocolToActiveWorkout(workout, protocol.id, now);
  if (next === workout) return { status: 'unavailable' };
  try {
    writeActiveWorkout(next);
    return { status: 'added' };
  } catch {
    return { status: 'storage-failed' };
  }
}

export function addScreeningRecommendationToTrainingTemplate(
  recommendation: PostureRecommendationSnapshot | undefined,
  target: AddScreeningRecommendationToTemplateTarget,
  now = new Date()
): AddScreeningRecommendationToTemplateResult {
  if (recommendation?.status !== 'available' || !recommendation.protocolId) return { status: 'unavailable' };
  const protocol = getPostureProtocolById(recommendation.protocolId);
  if (!protocol || !getPosturePlanEligibility(protocol).eligible) return { status: 'unavailable' };
  const snapshotWorkout = addPostureProtocolToActiveWorkout(createManualActiveWorkout(now), protocol.id, now);
  const group = snapshotWorkout.postureProtocolGroups?.[0];
  if (!group) return { status: 'unavailable' };
  const screeningGroup = { ...group, sourceSnapshot: 'posture-screening' as const };

  if (target.kind === 'new') {
    const name = target.name.trim();
    if (!name) return { status: 'invalid-name' };
    const created = createTrainingTemplate({ name, focusTags: [], items: [], postureProtocolGroups: [screeningGroup] });
    return created.ok
      ? { status: 'added', templateId: created.template.id, created: true }
      : { status: 'storage-failed' };
  }

  const result = addPostureProtocolGroupToTrainingTemplate(target.templateId, screeningGroup);
  if (!result.ok) {
    if (result.error === 'not-found') return { status: 'not-found' };
    return { status: result.error === 'storage' ? 'storage-failed' : 'unavailable' };
  }
  return result.status === 'already-added'
    ? { status: 'already-added', templateId: result.template.id, created: false }
    : { status: 'added', templateId: result.template.id, created: false };
}

function unavailable(patternId: PostureScreeningPatternId, issueName: string, reason: string): PostureRecommendationSnapshot {
  return { patternId, status: 'unavailable', issueNames: [issueName], limitations: [], reason };
}

function isSupportedPatternId(value: string): value is PostureScreeningPatternId {
  return SUPPORTED_PATTERN_IDS.has(value as PostureScreeningPatternId);
}
