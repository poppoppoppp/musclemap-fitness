import type {
  PostureAssessment,
  PostureAssessmentDraft,
  PostureAssessmentInput,
  PosturePlan,
  PosturePlanInput,
  PostureSessionFeedback,
  PostureSessionFeedbackInput
} from '../types/posturePlan';

export const POSTURE_ASSESSMENTS_KEY = 'musclemap.postureAssessments.v1';
export const POSTURE_PLANS_KEY = 'musclemap.posturePlans.v1';
export const POSTURE_FEEDBACK_KEY = 'musclemap.postureFeedback.v1';
export const POSTURE_ASSESSMENT_DRAFT_KEY = 'musclemap.postureAssessmentDraft.v1';

export type CreatePosturePlanResult = { ok: true; plan: PosturePlan } | { ok: false; error: 'active-plan-exists' | 'invalid-plan' | 'storage-failed' };
export type SavePostureFeedbackResult = { ok: true; feedback: PostureSessionFeedback } | { ok: false; error: 'invalid-feedback' | 'storage-failed' };
export type UpdatePosturePlanResult = { ok: true; plan: PosturePlan } | { ok: false; error: 'plan-not-found' | 'invalid-transition' | 'storage-failed' };
export type SavePostureReassessmentResult = { ok: true; assessment: PostureAssessment; plan: PosturePlan } | { ok: false; error: 'plan-not-found' | 'invalid-assessment' | 'storage-failed' };

export class PosturePlanRepository {
  constructor(private readonly storage: Storage, private readonly now: () => Date = () => new Date()) {}

  listAssessments(): PostureAssessment[] {
    return this.readArray(POSTURE_ASSESSMENTS_KEY, normalizePostureAssessment).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  saveAssessment(input: PostureAssessmentInput): PostureAssessment {
    const createdAt = this.now().toISOString();
    const assessment: PostureAssessment = { ...input, id: createId('posture-assessment', createdAt), createdAt };
    this.storage.setItem(POSTURE_ASSESSMENTS_KEY, JSON.stringify([...this.listAssessments(), assessment]));
    return assessment;
  }

  listPlans(): PosturePlan[] {
    return this.readArray(POSTURE_PLANS_KEY, normalizePosturePlan).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  getActivePlan(): PosturePlan | null {
    return this.listPlans().find(({ status }) => status === 'active' || status === 'paused') ?? null;
  }

  tryCreatePlan(input: PosturePlanInput): CreatePosturePlanResult {
    if (this.getActivePlan()) return { ok: false, error: 'active-plan-exists' };
    if (!isValidPlanInput(input)) return { ok: false, error: 'invalid-plan' };
    const timestamp = this.now().toISOString();
    const plan: PosturePlan = {
      ...input,
      id: createId('posture-plan', timestamp),
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
      reassessmentIds: []
    };
    try {
      this.storage.setItem(POSTURE_PLANS_KEY, JSON.stringify([...this.listPlans(), plan]));
      return { ok: true, plan };
    } catch {
      return { ok: false, error: 'storage-failed' };
    }
  }

  listFeedback(): PostureSessionFeedback[] {
    return this.readArray(POSTURE_FEEDBACK_KEY, normalizePostureFeedback).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  saveFeedback(input: PostureSessionFeedbackInput): SavePostureFeedbackResult {
    if (!isValidFeedbackInput(input)) return { ok: false, error: 'invalid-feedback' };
    const createdAt = this.now().toISOString();
    const feedback: PostureSessionFeedback = {
      ...input,
      abortReason: cleanText(input.abortReason),
      note: cleanText(input.note),
      id: createId('posture-feedback', createdAt),
      createdAt
    };
    try {
      const retained = this.listFeedback().filter((item) => item.workoutLogId !== input.workoutLogId);
      this.storage.setItem(POSTURE_FEEDBACK_KEY, JSON.stringify([...retained, feedback]));
      return { ok: true, feedback };
    } catch {
      return { ok: false, error: 'storage-failed' };
    }
  }

  pausePlan(planId: string): UpdatePosturePlanResult {
    return this.updatePlan(planId, (plan, timestamp) => {
      if (plan.status !== 'active') return null;
      return {
        ...plan,
        status: 'paused',
        pausedAt: timestamp,
        pauseIntervals: [...(plan.pauseIntervals ?? []), { startedAt: timestamp }],
        updatedAt: timestamp
      };
    });
  }

  resumePlan(planId: string): UpdatePosturePlanResult {
    return this.updatePlan(planId, (plan, timestamp) => {
      if (plan.status !== 'paused') return null;
      return {
        ...plan,
        status: 'active',
        pausedAt: undefined,
        pauseIntervals: closeOpenPauseInterval(plan.pauseIntervals, plan.pausedAt, timestamp),
        updatedAt: timestamp
      };
    });
  }

  completePlan(planId: string): UpdatePosturePlanResult {
    return this.updatePlan(planId, (plan, timestamp) => {
      if (plan.status === 'completed') return null;
      return {
        ...plan,
        status: 'completed',
        pausedAt: undefined,
        pauseIntervals: closeOpenPauseInterval(plan.pauseIntervals, plan.pausedAt, timestamp),
        completedAt: timestamp,
        updatedAt: timestamp
      };
    });
  }

  saveReassessment(planId: string, input: PostureAssessmentInput): SavePostureReassessmentResult {
    const plan = this.listPlans().find(({ id }) => id === planId);
    if (!plan) return { ok: false, error: 'plan-not-found' };
    if (input.kind !== 'reassessment' || input.planId !== planId || !isAssessmentInput(input as unknown as Record<string, unknown>)) {
      return { ok: false, error: 'invalid-assessment' };
    }
    try {
      const assessment = this.saveAssessment(input);
      const updated = { ...plan, reassessmentIds: [...plan.reassessmentIds, assessment.id], updatedAt: this.now().toISOString() };
      this.storage.setItem(POSTURE_PLANS_KEY, JSON.stringify(this.listPlans().map((item) => item.id === planId ? updated : item)));
      return { ok: true, assessment, plan: updated };
    } catch {
      return { ok: false, error: 'storage-failed' };
    }
  }

  saveAssessmentDraft(draft: PostureAssessmentDraft): void {
    this.storage.setItem(POSTURE_ASSESSMENT_DRAFT_KEY, JSON.stringify(draft));
  }

  readAssessmentDraft(): PostureAssessmentDraft | null {
    const value = this.readJson(POSTURE_ASSESSMENT_DRAFT_KEY);
    return normalizeDraft(value);
  }

  clearAssessmentDraft(): void {
    this.storage.removeItem(POSTURE_ASSESSMENT_DRAFT_KEY);
  }

  private updatePlan(planId: string, updater: (plan: PosturePlan, timestamp: string) => PosturePlan | null): UpdatePosturePlanResult {
    const plans = this.listPlans();
    const plan = plans.find(({ id }) => id === planId);
    if (!plan) return { ok: false, error: 'plan-not-found' };
    const updated = updater(plan, this.now().toISOString());
    if (!updated) return { ok: false, error: 'invalid-transition' };
    try {
      this.storage.setItem(POSTURE_PLANS_KEY, JSON.stringify(plans.map((item) => item.id === planId ? updated : item)));
      return { ok: true, plan: updated };
    } catch {
      return { ok: false, error: 'storage-failed' };
    }
  }

  private readArray<T>(key: string, normalize: (value: unknown) => T | null): T[] {
    const value = this.readJson(key);
    return Array.isArray(value) ? value.flatMap((item) => {
      const normalized = normalize(item);
      return normalized ? [normalized] : [];
    }) : [];
  }

  private readJson(key: string): unknown {
    const raw = this.storage.getItem(key);
    if (!raw) return null;
    try { return JSON.parse(raw) as unknown; } catch { return null; }
  }
}

export function createPosturePlanRepository() {
  if (typeof window === 'undefined') throw new Error('Posture plan storage is only available in the browser.');
  return new PosturePlanRepository(window.localStorage);
}

export function normalizePostureAssessment(value: unknown): PostureAssessment | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.createdAt !== 'string') return null;
  if (!isAssessmentInput(value)) return null;
  return value as unknown as PostureAssessment;
}

export function normalizePosturePlan(value: unknown): PosturePlan | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.protocolId !== 'string' || typeof value.assessmentId !== 'string') return null;
  if (value.status !== 'active' && value.status !== 'paused' && value.status !== 'completed') return null;
  if (typeof value.createdAt !== 'string' || typeof value.updatedAt !== 'string' || !Array.isArray(value.weekdays) || !Array.isArray(value.recommendationReasons) || !Array.isArray(value.reassessmentIds)) return null;
  if (!isValidPlanInput(value as unknown as PosturePlanInput)) return null;
  if (value.pauseIntervals !== undefined && (!Array.isArray(value.pauseIntervals) || !value.pauseIntervals.every(isPauseInterval))) return null;
  return value as unknown as PosturePlan;
}

export function normalizePostureFeedback(value: unknown): PostureSessionFeedback | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.planId !== 'string' || typeof value.workoutLogId !== 'string' || typeof value.createdAt !== 'string') return null;
  if (!isValidFeedbackInput(value as unknown as PostureSessionFeedbackInput)) return null;
  return value as unknown as PostureSessionFeedback;
}

function normalizeDraft(value: unknown): PostureAssessmentDraft | null {
  if (!isRecord(value) || typeof value.step !== 'number' || value.step < 1 || value.step > 4) return null;
  return value as unknown as PostureAssessmentDraft;
}

function isValidPlanInput(input: PosturePlanInput) {
  return Boolean(input.protocolId && input.assessmentId && isDateKey(input.startDate))
    && Number.isInteger(input.durationWeeks) && input.durationWeeks >= 2 && input.durationWeeks <= 4
    && Number.isInteger(input.weeklyFrequency) && input.weeklyFrequency >= 1 && input.weeklyFrequency <= 7
    && Array.isArray(input.weekdays) && input.weekdays.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    && input.weekdays.length === input.weeklyFrequency && new Set(input.weekdays).size === input.weekdays.length
    && Array.isArray(input.recommendationReasons) && input.recommendationReasons.length > 0
    && isRecord(input.qualitySnapshot) && typeof input.qualitySnapshot.sourceUrl === 'string' && Boolean(input.qualitySnapshot.sourceUrl);
}

function isAssessmentInput(value: Record<string, unknown>): boolean {
  return (value.kind === 'initial' || value.kind === 'reassessment')
    && isStringArrayOf(value.goals, ['comfort', 'mobility', 'training', 'appearance']) && value.goals.length > 0
    && isStringArrayOf(value.regions, ['shoulder_scapula', 'pelvis_lumbopelvic', 'cervical_head', 'upper_posture', 'thoracic', 'winged_scapula', 'ribcage_breathing', 'orofacial']) && value.regions.length > 0
    && (value.symptomDuration === 'lt-1m' || value.symptomDuration === '1-3m' || value.symptomDuration === 'gt-3m')
    && isScore(value.discomfort) && isScore(value.functionScore)
    && isStringArrayOf(value.riskFlags, ['numbness', 'radiating-pain', 'dizziness', 'chest-pain', 'breathing-difficulty', 'recent-trauma'])
    && isStringArrayOf(value.equipment, ['bodyweight', 'mat', 'wall', 'resistance-band', 'dumbbell', 'cable', 'foam-roller', 'towel'])
    && typeof value.sessionMinutes === 'number' && Number.isInteger(value.sessionMinutes) && value.sessionMinutes >= 5 && value.sessionMinutes <= 60
    && typeof value.weeklyFrequency === 'number' && Number.isInteger(value.weeklyFrequency) && value.weeklyFrequency >= 1 && value.weeklyFrequency <= 7;
}

function isStringArrayOf(value: unknown, allowed: readonly string[]): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && allowed.includes(item));
}

function isScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 10;
}

function isValidFeedbackInput(value: PostureSessionFeedbackInput): boolean {
  if (!value || typeof value.planId !== 'string' || !value.planId || typeof value.workoutLogId !== 'string' || !value.workoutLogId || !isScore(value.discomfortBefore)) return false;
  if (value.status === 'completed') return isScore(value.discomfortAfter) && (value.difficulty === 'easy' || value.difficulty === 'appropriate' || value.difficulty === 'hard');
  return value.status === 'aborted' && Boolean(cleanText(value.abortReason));
}

function cleanText(value: string | undefined): string | undefined {
  return value?.trim() || undefined;
}

function closeOpenPauseInterval(intervals: PosturePlan['pauseIntervals'], legacyPausedAt: string | undefined, endedAt: string) {
  const values = intervals?.length ? intervals : legacyPausedAt ? [{ startedAt: legacyPausedAt }] : [];
  return values.map((interval, index) => index === values.length - 1 && !interval.endedAt ? { ...interval, endedAt } : interval);
}

function isPauseInterval(value: unknown): value is { startedAt: string; endedAt?: string } {
  return isRecord(value) && typeof value.startedAt === 'string' && (value.endedAt === undefined || typeof value.endedAt === 'string');
}

function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.getFullYear() === Number(match[1]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[3]);
}

function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function createId(prefix: string, timestamp: string) { return `${prefix}-${timestamp.replace(/\D/g, '')}-${Math.random().toString(36).slice(2, 8)}`; }
