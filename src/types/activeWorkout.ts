export type ActiveWorkoutStatus = 'active';
export type ActiveWorkoutSource = 'manual' | 'exercise-detail' | 'plan';

export interface ActiveWorkout {
  id: string;
  status: ActiveWorkoutStatus;
  startedAt: string;
  trainingDate: string;
  source: ActiveWorkoutSource;
  planId?: string;
  planDayId?: string;
  exercises: ActiveWorkoutExercise[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveWorkoutExercise {
  id: string;
  exerciseId: string;
  order: number;
  source: ActiveWorkoutSource;
  startedAt?: string;
  endedAt?: string;
  planned?: {
    sets?: number;
    repRange?: string;
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
  completed?: boolean;
  restSeconds?: number;
}
