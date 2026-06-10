import type { Exercise } from '../types/exercise';
import type { WorkoutLog } from '../types/workout';

type ExerciseMuscleSource = Pick<Exercise, 'id' | 'primaryMuscles' | 'secondaryMuscles'>;

const muscleAliases: Record<string, string> = {
  pectorals: 'chest',
  'pectoralis-major': 'chest',
  chest: 'chest',
  lats: 'back',
  'latissimus-dorsi': 'back',
  'upper-back': 'back',
  back: 'back',
  rhomboids: 'back',
  'teres-major': 'back',
  'middle-lower-trapezius': 'back',
  'upper-trapezius': 'back',
  'erector-spinae': 'back',
  deltoids: 'shoulders',
  shoulders: 'shoulders',
  'anterior-deltoid': 'shoulders',
  'lateral-deltoid': 'shoulders',
  'rear-deltoid': 'shoulders',
  'biceps-brachii': 'biceps',
  biceps: 'biceps',
  brachialis: 'biceps',
  'triceps-brachii': 'triceps',
  triceps: 'triceps',
  'rectus-abdominis': 'abs',
  'transverse-abdominis': 'abs',
  abs: 'abs',
  obliques: 'obliques',
  'gluteus-maximus': 'glutes',
  glutes: 'glutes',
  quadriceps: 'quadriceps',
  hamstrings: 'hamstrings',
  calves: 'calves',
  gastrocnemius: 'calves'
};

export function calculateWorkoutVolume(workout: WorkoutLog): number {
  return getWorkoutExercises(workout).reduce(
    (total, exercise) =>
      total +
      getWorkoutSets(exercise).reduce((exerciseTotal, set) => {
        const weight = typeof set.weight === 'number' && Number.isFinite(set.weight) ? set.weight : 0;
        const reps = typeof set.reps === 'number' && Number.isFinite(set.reps) ? set.reps : 0;
        return exerciseTotal + weight * reps;
      }, 0),
    0
  );
}

export function calculateWorkoutSetCount(workout: WorkoutLog): number {
  return getWorkoutExercises(workout).reduce((count, exercise) => count + getWorkoutSets(exercise).length, 0);
}

export function calculateWorkoutExerciseCount(workout: WorkoutLog): number {
  return getWorkoutExercises(workout).length;
}

export function estimateWorkoutCalories(workout: WorkoutLog): number {
  const durationMinutes = getDurationMinutes(workout);
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return 0;
  return Math.round(durationMinutes * 6);
}

export function getWorkedMusclesFromWorkout(workout: WorkoutLog, exercises: ExerciseMuscleSource[]) {
  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const primary = new Set<string>();
  const secondary = new Set<string>();

  for (const workoutExercise of getWorkoutExercises(workout)) {
    const detail = exerciseById.get(workoutExercise.exerciseId);
    if (!detail) continue;

    for (const muscleId of detail.primaryMuscles ?? []) {
      primary.add(normalizeMuscleId(muscleId));
    }

    for (const muscleId of detail.secondaryMuscles ?? []) {
      const normalized = normalizeMuscleId(muscleId);
      if (!primary.has(normalized)) secondary.add(normalized);
    }
  }

  for (const muscleId of primary) {
    secondary.delete(muscleId);
  }

  return {
    primary: [...primary],
    secondary: [...secondary]
  };
}

export function normalizeMuscleId(muscleId: string): string {
  return muscleAliases[muscleId] ?? muscleId;
}

export function getDurationMinutes(workout: WorkoutLog): number {
  if (typeof workout.durationSeconds !== 'number' || !Number.isFinite(workout.durationSeconds) || workout.durationSeconds <= 0) return 0;
  return Math.max(1, Math.round(workout.durationSeconds / 60));
}

function getWorkoutExercises(workout: WorkoutLog) {
  return Array.isArray(workout.exercises) ? workout.exercises : [];
}

function getWorkoutSets(exercise: WorkoutLog['exercises'][number]) {
  return Array.isArray(exercise.sets) ? exercise.sets : [];
}
