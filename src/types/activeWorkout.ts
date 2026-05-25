export type ActiveWorkoutStatus = 'active';
export type ActiveWorkoutSource = 'manual';

export interface ActiveWorkout {
  id: string;
  status: ActiveWorkoutStatus;
  startedAt: string;
  trainingDate: string;
  source: ActiveWorkoutSource;
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
