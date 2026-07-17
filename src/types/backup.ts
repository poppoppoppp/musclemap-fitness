import type { GeneratedPlan, WorkoutLog } from './workout';
import type { BodySnapshot } from './body';
import type { TrainingTemplate } from './trainingTemplate';
import type { PostureAssessment, PosturePlan, PostureSessionFeedback } from './posturePlan';

export interface MuscleMapBackupData {
  latestGeneratedPlan: GeneratedPlan | null;
  workoutLogs: WorkoutLog[];
  latestWorkoutLog: WorkoutLog | null;
  bodySnapshots: BodySnapshot[];
  trainingTemplates: TrainingTemplate[];
  postureAssessments: PostureAssessment[];
  posturePlans: PosturePlan[];
  postureFeedback: PostureSessionFeedback[];
}

export interface MuscleMapBackupFile {
  app: 'MuscleMap Fitness';
  exportVersion: 1 | 2 | 3 | 4 | 5;
  exportedAt: string;
  data: MuscleMapBackupData;
}

export interface BackupSummary {
  hasLatestGeneratedPlan: boolean;
  workoutLogCount: number;
  hasLatestWorkoutLog: boolean;
  bodySnapshotCount: number;
  trainingTemplateCount: number;
  posturePlanCount: number;
  exportedAt?: string;
}
