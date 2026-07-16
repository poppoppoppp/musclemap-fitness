import type { PostureDataset, PostureDose, PostureProtocol } from '../types/posture';
import type { PostureAssessment, PostureEquipment, PostureRiskFlag } from '../types/posturePlan';
import { getPostureStandardExerciseById, getProtocolExerciseSteps, postureDataset } from './postureProtocols';

export type PostureEligibilityFailure = 'secondary' | 'internal' | 'limited' | 'low-quality' | 'missing-source' | 'missing-dose' | 'visual-review-required';

export interface PosturePlanEligibility {
  eligible: boolean;
  reasons: PostureEligibilityFailure[];
}

export interface PostureProtocolRecommendation {
  protocol: PostureProtocol;
  score: number;
  reasons: string[];
  estimatedMinutes: number;
}

export type PostureRecommendationResult =
  | { status: 'blocked'; riskFlags: PostureRiskFlag[] }
  | { status: 'ready'; recommendations: PostureProtocolRecommendation[] };

export function getPosturePlanEligibility(protocol: PostureProtocol, dataset: PostureDataset = postureDataset): PosturePlanEligibility {
  const reasons: PostureEligibilityFailure[] = [];
  if (protocol.visibility === 'secondary') reasons.push('secondary');
  if (protocol.visibility === 'internal') reasons.push('internal');
  if (protocol.completeness === 'limited') reasons.push('limited');
  if (protocol.dataQuality === 'mediumLow' || protocol.dataQuality === 'low') reasons.push('low-quality');
  if (!protocol.sourceUrl) reasons.push('missing-source');

  const requiredSteps = getProtocolExerciseSteps(protocol).filter(({ optional }) => !optional);
  if (requiredSteps.some(({ dose }) => !hasExecutableDose(dose))) reasons.push('missing-dose');
  if (requiredSteps.some(({ exerciseId }) => Boolean(exerciseId && getPostureStandardExerciseById(exerciseId, dataset)?.visualReviewRequired))) {
    reasons.push('visual-review-required');
  }
  return { eligible: reasons.length === 0, reasons };
}

export function getEligiblePosturePlanProtocols(dataset: PostureDataset = postureDataset): PostureProtocol[] {
  return dataset.protocols.filter((protocol) => protocol.protocolTier === 'core' && getPosturePlanEligibility(protocol, dataset).eligible);
}

export function getPostureRecommendationResult(assessment: PostureAssessment, dataset: PostureDataset = postureDataset): PostureRecommendationResult {
  if (assessment.riskFlags.length > 0) return { status: 'blocked', riskFlags: [...assessment.riskFlags] };
  return { status: 'ready', recommendations: getRecommendedPostureProtocols(assessment, dataset) };
}

export function getRecommendedPostureProtocols(
  assessment: PostureAssessment,
  dataset: PostureDataset = postureDataset
): PostureProtocolRecommendation[] {
  return getEligiblePosturePlanProtocols(dataset)
    .flatMap((protocol) => {
      if (!assessment.regions.includes(protocol.category as PostureAssessment['regions'][number])) return [];
      if (!protocolEquipmentFits(protocol, assessment.equipment, dataset)) return [];
      const estimatedMinutes = estimateProtocolMinutes(protocol);
      if (estimatedMinutes > assessment.sessionMinutes) return [];
      const reasons = [`匹配${categoryLabel(protocol.category)}区域`];
      let score = 4;
      if (assessment.goals.includes('comfort') && protocol.targetIssues.some((item) => /不适|紧张|放松/.test(item))) {
        score += 2;
        reasons.push('关注舒适度改善');
      }
      if (assessment.goals.includes('mobility') && /活动|控制/.test(`${protocol.userFacingGoal}${protocol.tags.join('')}`)) {
        score += 2;
        reasons.push('匹配活动与控制目标');
      }
      score += 1;
      reasons.push(`预计约 ${estimatedMinutes} 分钟`);
      return [{ protocol, score, reasons, estimatedMinutes }];
    })
    .sort((left, right) => right.score - left.score || left.protocol.id.localeCompare(right.protocol.id))
    .slice(0, 2);
}

function hasExecutableDose(dose: PostureDose | undefined) {
  if (!dose) return false;
  const values = [dose.sets, dose.reps, dose.repsPerSide, dose.durationSeconds, dose.holdSeconds];
  return values.some(isPositiveDoseValue)
    || Boolean(dose.durationRangeSeconds?.some((value) => value > 0));
}

function isPositiveDoseValue(value: number | string | undefined) {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0;
  if (typeof value === 'string') return Number.parseFloat(value) > 0;
  return false;
}

function protocolEquipmentFits(protocol: PostureProtocol, available: PostureEquipment[], dataset: PostureDataset) {
  const availableSet = new Set<PostureEquipment>(['bodyweight', ...available]);
  return getProtocolExerciseSteps(protocol).filter(({ optional }) => !optional).every(({ exerciseId }) => {
    const exercise = exerciseId ? getPostureStandardExerciseById(exerciseId, dataset) : undefined;
    return exercise?.equipment.every((item) => availableSet.has(mapEquipment(item))) ?? false;
  });
}

function mapEquipment(value: string): PostureEquipment {
  if (value.includes('弹力带')) return 'resistance-band';
  if (value.includes('龙门架')) return 'cable';
  if (value.includes('哑铃')) return 'dumbbell';
  if (value.includes('毛巾')) return 'towel';
  if (value.includes('泡沫轴')) return 'foam-roller';
  if (value.includes('墙') || value.includes('门框')) return 'wall';
  if (value.includes('瑜伽垫')) return 'mat';
  return 'bodyweight';
}

function estimateProtocolMinutes(protocol: PostureProtocol) {
  const seconds = getProtocolExerciseSteps(protocol).filter(({ optional }) => !optional).reduce((total, { dose }) => {
    if (!dose) return total;
    const sets = numericDose(dose.sets) || 1;
    const duration = dose.durationSeconds
      ?? dose.durationRangeSeconds?.[1]
      ?? (numericDose(dose.repsPerSide) * 6 || undefined)
      ?? (numericDose(dose.reps) * 3 || undefined)
      ?? (dose.holdSeconds ? dose.holdSeconds * Math.max(1, numericDose(dose.reps)) : 0);
    return total + sets * Math.max(30, duration || 0) + 30;
  }, 0);
  return Math.max(1, Math.ceil(seconds / 60));
}

function numericDose(value: number | string | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') return Number.parseFloat(value) || 0;
  return 0;
}

function categoryLabel(category: string) {
  return postureDataset.categories.find(({ id }) => id === category)?.name ?? '所选';
}
