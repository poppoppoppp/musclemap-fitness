import type { PostureDataset, PostureDose, PostureProtocol } from '../types/posture';
import type { PostureAssessment, PostureEquipment, PosturePlan, PostureRiskFlag, PostureSessionFeedback } from '../types/posturePlan';
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

export interface PosturePlanLogLike {
  id: string;
  date: string;
  posturePlanContext?: { planId: string; weekIndex: number; scheduledDate: string };
}

export interface PosturePlanProgress {
  weekIndex: number;
  totalSessions: number;
  dueSessions: number;
  completedSessions: number;
  missedSessions: number;
  cycleComplete: boolean;
}

export interface PostureTodayTask {
  date: string;
  weekIndex: number;
  protocolId: string;
}

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

export function getPosturePlanOccurrences(plan: PosturePlan): Array<{ date: string; weekIndex: number }> {
  const start = parseDateKey(plan.startDate);
  if (!start) return [];
  const occurrences: Array<{ date: string; weekIndex: number }> = [];
  const totalDays = plan.durationWeeks * 7;
  for (let offset = 0; offset < totalDays; offset += 1) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset);
    if (plan.weekdays.includes(date.getDay() as PosturePlan['weekdays'][number])) {
      occurrences.push({ date: toDateKey(date), weekIndex: Math.floor(offset / 7) + 1 });
    }
  }
  return occurrences;
}

export function getPosturePlanProgress(
  plan: PosturePlan,
  logs: PosturePlanLogLike[],
  feedback: PostureSessionFeedback[],
  now = new Date()
): PosturePlanProgress {
  const today = toDateKey(now);
  const occurrences = getPosturePlanOccurrences(plan);
  const due = occurrences.filter(({ date }) => date <= today && !isDateInsidePlanPause(plan, date));
  const completedLogIds = new Set(feedback.filter((item) => item.planId === plan.id && item.status === 'completed').map(({ workoutLogId }) => workoutLogId));
  const completedDates = new Set(logs.flatMap((log) => {
    const context = log.posturePlanContext;
    return context?.planId === plan.id && completedLogIds.has(log.id) ? [context.scheduledDate] : [];
  }));
  const completedSessions = due.filter(({ date }) => completedDates.has(date)).length;
  const missedSessions = due.filter(({ date }) => date < today && !completedDates.has(date)).length;
  const start = parseDateKey(plan.startDate);
  const elapsedDays = start ? Math.max(0, calendarDayDifference(start, now)) : 0;
  const weekIndex = Math.min(plan.durationWeeks, Math.floor(elapsedDays / 7) + 1);
  const cycleEnd = start
    ? toDateKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + plan.durationWeeks * 7 - 1))
    : null;
  return {
    weekIndex,
    totalSessions: occurrences.length,
    dueSessions: due.length,
    completedSessions,
    missedSessions,
    cycleComplete: Boolean(cycleEnd && today > cycleEnd)
  };
}

function isDateInsidePlanPause(plan: PosturePlan, date: string) {
  const intervals = plan.pauseIntervals?.length
    ? plan.pauseIntervals
    : plan.status === 'paused' && plan.pausedAt ? [{ startedAt: plan.pausedAt }] : [];
  return intervals.some(({ startedAt, endedAt }) => {
    const startDate = toDateKey(new Date(startedAt));
    const endDate = endedAt ? toDateKey(new Date(endedAt)) : null;
    return date >= startDate && (!endDate || date <= endDate);
  });
}

export function getPostureTodayTask(
  plan: PosturePlan,
  logs: PosturePlanLogLike[],
  feedback: PostureSessionFeedback[],
  now = new Date()
): PostureTodayTask | null {
  if (plan.status !== 'active') return null;
  const today = toDateKey(now);
  const occurrence = getPosturePlanOccurrences(plan).find(({ date }) => date === today);
  if (!occurrence) return null;
  const completedLogIds = new Set(feedback.filter((item) => item.planId === plan.id && item.status === 'completed').map(({ workoutLogId }) => workoutLogId));
  const completed = logs.some((log) => log.posturePlanContext?.planId === plan.id
    && log.posturePlanContext.scheduledDate === today
    && completedLogIds.has(log.id));
  return completed ? null : { ...occurrence, protocolId: plan.protocolId };
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

function parseDateKey(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function calendarDayDifference(start: Date, end: Date) {
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.floor((endUtc - startUtc) / 86_400_000);
}
