import type { PostureScreeningSession } from '../repositories/postureScreeningRepository';
import type { PosturePlan, PostureSessionFeedback } from './posturePlan';
import type { PosturePlanLogLike, PosturePlanProgress, PostureTodayTask } from '../utils/posturePlanRules';
import type { PostureSessionComparison } from '../utils/postureScreeningComparison';

export interface PostureGrowthInputs {
  sessions: readonly PostureScreeningSession[];
  plans: readonly PosturePlan[];
  logs: readonly PosturePlanLogLike[];
  feedback: readonly PostureSessionFeedback[];
  now: Date;
}

export interface PostureGrowthTrend {
  baseline: PostureScreeningSession;
  current: PostureScreeningSession;
  comparison: PostureSessionComparison;
}

interface PostureGrowthPlanState {
  plan: PosturePlan;
  progress: PosturePlanProgress;
  todayTask: PostureTodayTask | null;
  latestSession: PostureScreeningSession | null;
  trend: PostureGrowthTrend | null;
}

export type PostureGrowthViewState =
  | {
      status: 'empty';
      sessionCount: 0;
      planCount: 0;
    }
  | {
      status: 'assessed';
      session: PostureScreeningSession;
      creatable: boolean;
      trend: PostureGrowthTrend | null;
    }
  | ({ status: 'active-plan' } & PostureGrowthPlanState)
  | ({ status: 'paused-plan' } & PostureGrowthPlanState)
  | ({ status: 'completed-plan' } & Omit<PostureGrowthPlanState, 'todayTask'>);
