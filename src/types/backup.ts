import type { GeneratedPlan, WorkoutLog } from './workout';
import type { BodySnapshot } from './body';
import type { TrainingTemplate } from './trainingTemplate';

export interface MuscleMapBackupData {
  latestGeneratedPlan: GeneratedPlan | null;
  workoutLogs: WorkoutLog[];
  latestWorkoutLog: WorkoutLog | null;
  bodySnapshots: BodySnapshot[];
  trainingTemplates: TrainingTemplate[];
}

export interface MuscleMapBackupFile {
  app: 'MuscleMap Fitness';
  exportVersion: 1 | 2 | 3 | 4;
  exportedAt: string;
  data: MuscleMapBackupData;
}

export interface BackupSummary {
  hasLatestGeneratedPlan: boolean;
  workoutLogCount: number;
  hasLatestWorkoutLog: boolean;
  bodySnapshotCount: number;
  trainingTemplateCount: number;
  exportedAt?: string;
}
