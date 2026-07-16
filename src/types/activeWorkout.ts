export type ActiveWorkoutStatus = 'active';
import type { PostureProtocolWorkoutSnapshot } from './posture';

export type ActiveWorkoutSource = 'manual' | 'exercise-detail' | 'plan' | 'posture' | 'template';

export interface ActiveWorkout {
  id: string;
  status: ActiveWorkoutStatus;
  startedAt: string;
  trainingDate: string;
  source: ActiveWorkoutSource;
  planId?: string;
  planDayId?: string;
  templateId?: string;
  exercises: ActiveWorkoutExercise[];
  postureProtocolGroups?: PostureProtocolWorkoutSnapshot[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveWorkoutExercise {
  id: string;
  exerciseId: string;
  order: number;
  source: ActiveWorkoutSource;
  postureProtocolInstanceId?: string;
  setEntryMode?: 'reps' | 'duration';
  startedAt?: string;
  endedAt?: string;
  planned?: {
    sets?: number;
    repRange?: string;
    durationSeconds?: number;
    durationRangeSeconds?: [number, number];
    restSeconds?: number;
    note?: string;
  };
  sets: ActiveWorkoutSet[];
  notes?: string;
}

export interface ActiveWorkoutSet {
  id: string;
  setIndex: number;
  weight?: number;
  reps?: number;
  durationSeconds?: number;
  completed?: boolean;
  restSeconds?: number;
}
