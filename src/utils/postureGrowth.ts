import type { PostureScreeningSession } from '../repositories/postureScreeningRepository';
import type { PosturePlan } from '../types/posturePlan';
import type { PostureGrowthInputs, PostureGrowthTrend, PostureGrowthViewState } from '../types/postureGrowth';
import { getPosturePlanProgress, getPostureTodayTask } from './posturePlanRules';
import { comparePostureScreeningSessions } from './postureScreeningComparison';

export function canCreatePosturePlanFromSession(session: PostureScreeningSession): boolean {
  if (session.status !== session.result.status) return false;
  if (session.status !== 'completed' && session.status !== 'functional-only') return false;
  if (session.result.nextActions.some(({ kind }) => kind === 'professional-review')) return false;
  return session.result.findings.some(({ confidence }) => confidence === 'supported');
}

export function derivePostureGrowthViewState(inputs: PostureGrowthInputs): PostureGrowthViewState {
  const sessions = [...inputs.sessions];
  const plans = [...inputs.plans];
  const logs = [...inputs.logs];
  const feedback = [...inputs.feedback];
  const latestSession = latestByCompletedAt(sessions);
  const trend = findLatestComparablePostureTrend(sessions);

  const activePlan = latestPlanBy(plans.filter(({ status }) => status === 'active'), 'updatedAt');
  if (activePlan) return planState('active-plan', activePlan, latestSession, trend, logs, feedback, inputs.now);

  const pausedPlan = latestPlanBy(plans.filter(({ status }) => status === 'paused'), 'updatedAt');
  if (pausedPlan) return planState('paused-plan', pausedPlan, latestSession, trend, logs, feedback, inputs.now);

  const completedPlan = latestCompletedPlan(plans);
  const completedAt = completedPlan ? timestamp(completedPlan.completedAt) : Number.NEGATIVE_INFINITY;
  const newerCreatableSession = latestByCompletedAt(sessions.filter((session) => (
    canCreatePosturePlanFromSession(session)
    && (!completedPlan || (Number.isFinite(completedAt) && timestamp(session.completedAt) > completedAt))
  )));

  if (newerCreatableSession) {
    return { status: 'assessed', session: newerCreatableSession, creatable: true, trend };
  }

  if (completedPlan) {
    return {
      status: 'completed-plan',
      plan: completedPlan,
      progress: getPosturePlanProgress(completedPlan, logs, feedback, inputs.now),
      latestSession,
      trend,
    };
  }

  if (latestSession) {
    return { status: 'assessed', session: latestSession, creatable: false, trend };
  }

  return { status: 'empty', sessionCount: 0, planCount: 0 };
}

export function findLatestComparablePostureTrend(sessions: readonly PostureScreeningSession[]): PostureGrowthTrend | null {
  const byId = new Map(sessions.map((session) => [session.id, session]));
  const retests = [...sessions]
    .filter(({ context }) => Boolean(context?.baselineSessionId))
    .sort((left, right) => timestamp(right.completedAt) - timestamp(left.completedAt));

  for (const current of retests) {
    const baselineId = current.context?.baselineSessionId;
    const baseline = baselineId ? byId.get(baselineId) : undefined;
    if (!baseline) continue;
    const comparison = comparePostureScreeningSessions(baseline, current);
    if (comparison.status === 'comparable') return { baseline, current, comparison };
  }
  return null;
}

function planState(
  status: 'active-plan' | 'paused-plan',
  plan: PosturePlan,
  latestSession: PostureScreeningSession | null,
  trend: PostureGrowthTrend | null,
  logs: PostureGrowthInputs['logs'][number][],
  feedback: PostureGrowthInputs['feedback'][number][],
  now: Date,
): Extract<PostureGrowthViewState, { status: typeof status }> {
  return {
    status,
    plan,
    progress: getPosturePlanProgress(plan, logs, feedback, now),
    todayTask: getPostureTodayTask(plan, logs, feedback, now),
    latestSession,
    trend,
  } as Extract<PostureGrowthViewState, { status: typeof status }>;
}

function latestCompletedPlan(plans: PosturePlan[]): PosturePlan | null {
  const completed = plans.filter(({ status }) => status === 'completed');
  return completed.sort((left, right) => {
    const completedDifference = timestamp(right.completedAt) - timestamp(left.completedAt);
    return completedDifference || timestamp(right.updatedAt) - timestamp(left.updatedAt);
  })[0] ?? null;
}

function latestPlanBy(plans: PosturePlan[], field: 'updatedAt'): PosturePlan | null {
  return plans.sort((left, right) => timestamp(right[field]) - timestamp(left[field]))[0] ?? null;
}

function latestByCompletedAt(sessions: PostureScreeningSession[]): PostureScreeningSession | null {
  return sessions.sort((left, right) => timestamp(right.completedAt) - timestamp(left.completedAt))[0] ?? null;
}

function timestamp(value: string | undefined): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}
