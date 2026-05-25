import type { GeneratedPlan, WorkoutLog } from './workout';

export interface MuscleMapBackupData {
  latestGeneratedPlan: GeneratedPlan | null;
  workoutLogs: WorkoutLog[];
  latestWorkoutLog: WorkoutLog | null;
}

export interface MuscleMapBackupFile {
  app: 'MuscleMap Fitness';
  exportVersion: 1;
  exportedAt: string;
  data: MuscleMapBackupData;
}

export interface BackupSummary {
  hasLatestGeneratedPlan: boolean;
  workoutLogCount: number;
  hasLatestWorkoutLog: boolean;
  exportedAt?: string;
}
