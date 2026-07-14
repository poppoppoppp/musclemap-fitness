export interface WorkoutPlan {
  id: string;
  name: string;
  goal: string;
  targetMuscles: string[];
  days: WorkoutDay[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutDay {
  id: string;
  name: string;
  dayIndex: number;
  focus: string;
  items: WorkoutPlanItem[];
}

export interface WorkoutPlanItem {
  id: string;
  exerciseId: string;
  sets: number;
  reps?: number;
  repRange?: string;
  restSeconds?: number;
  tempo?: string;
  notes?: string;
}

export interface WorkoutLog {
  id: string;
  date: string;
  planId?: string;
  durationSeconds?: number;
  exercises: WorkoutLogExercise[];
  postureProtocolGroups?: PostureProtocolWorkoutSnapshot[];
  notes?: string;
  createdAt: string;
}

export interface WorkoutLogExercise {
  id: string;
  exerciseId: string;
  order: number;
  postureProtocolInstanceId?: string;
  sets: WorkoutSet[];
  notes?: string;
}

export interface WorkoutSet {
  id: string;
  setIndex: number;
  weight?: number;
  reps?: number;
  durationSeconds?: number;
  rir?: number;
  completed: boolean;
  restSeconds?: number;
}

export type PlanGoal = 'hypertrophy' | 'strength' | 'beginner' | 'posture';

export type DaysPerWeek = 2 | 3 | 4 | 5;

export type TrainingLevel = 'beginner' | 'intermediate' | 'advanced';

export type EquipmentCategory = 'bodyweight' | 'dumbbell' | 'barbell' | 'machine' | 'cable' | 'fullGym';

export type FocusBodyPart = 'back' | 'chest' | 'shoulders' | 'legs' | 'arms' | 'core';

export interface PlanInput {
  goal: PlanGoal;
  daysPerWeek: DaysPerWeek;
  level: TrainingLevel;
  availableEquipment: EquipmentCategory;
  focusBodyParts: FocusBodyPart[];
}

export interface GeneratedPlan {
  id: string;
  name: string;
  input: PlanInput;
  days: GeneratedWorkoutDay[];
  createdAt: string;
}

export interface GeneratedWorkoutDay {
  id: string;
  name: string;
  focus: string;
  items: GeneratedPlanItem[];
  notice?: string;
}

export interface GeneratedPlanItem {
  exerciseId: string;
  sets: number;
  repRange: string;
  restSeconds: number;
  targetMuscles: string[];
  note?: string;
}
import type { PostureProtocolWorkoutSnapshot } from './posture';
