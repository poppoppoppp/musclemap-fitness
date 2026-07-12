import type { GeneratedPlan, WorkoutLog } from './workout';
import type { BodySnapshot } from './body';

export interface MuscleMapBackupData {
  latestGeneratedPlan: GeneratedPlan | null;
  workoutLogs: WorkoutLog[];
  latestWorkoutLog: WorkoutLog | null;
  bodySnapshots: BodySnapshot[];
}

export interface MuscleMapBackupFile {
  app: 'MuscleMap Fitness';
  exportVersion: 1 | 2;
  exportedAt: string;
  data: MuscleMapBackupData;
}

export interface BackupSummary {
  hasLatestGeneratedPlan: boolean;
  workoutLogCount: number;
  hasLatestWorkoutLog: boolean;
  bodySnapshotCount: number;
  exportedAt?: string;
}
