import type { ActiveWorkout, ActiveWorkoutExercise, ActiveWorkoutSet, ActiveWorkoutSource } from '../types/activeWorkout';
import type { GeneratedPlan, GeneratedPlanItem, GeneratedWorkoutDay, WorkoutLog, WorkoutLogExercise, WorkoutSet } from '../types/workout';
import { readStorage, removeStorage, writeStorage } from './storage';

export const ACTIVE_WORKOUT_KEY = 'musclemap.activeWorkout.v0.7';

export type ActiveWorkoutArchiveError = 'no-exercise' | 'no-valid-set' | 'integer-reps' | 'invalid-number';
export type ActiveWorkoutArchiveResult =
  | { ok: true; log: WorkoutLog }
  | { ok: false; error: ActiveWorkoutArchiveError };

export function readActiveWorkout(): ActiveWorkout | null {
  const workout = readStorage<ActiveWorkout | null>(ACTIVE_WORKOUT_KEY, null);
  return isActiveWorkout(workout) ? workout : null;
}

export function writeActiveWorkout(workout: ActiveWorkout): void {
  writeStorage(ACTIVE_WORKOUT_KEY, { ...workout, updatedAt: new Date().toISOString() });
}

export function clearActiveWorkout(): void {
  removeStorage(ACTIVE_WORKOUT_KEY);
}

export function createManualActiveWorkout(now = new Date()): ActiveWorkout {
  const timestamp = now.toISOString();
  return {
    id: createId('active-workout'),
    status: 'active',
    startedAt: timestamp,
    trainingDate: getLocalDateKeyFromDate(now),
    source: 'manual',
    exercises: [],
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function addExerciseToActiveWorkout(workout: ActiveWorkout, exerciseId: string): ActiveWorkout {
  return touch({
    ...workout,
    exercises: [...workout.exercises, createActiveWorkoutExercise(exerciseId, workout.exercises.length, 'manual')]
  });
}

export function startWorkoutWithExercise(exerciseId: string): ActiveWorkout {
  const workout = createManualActiveWorkout();
  const nextWorkout: ActiveWorkout = {
    ...workout,
    source: 'exercise-detail',
    exercises: [createActiveWorkoutExercise(exerciseId, 0, 'exercise-detail')]
  };
  writeActiveWorkout(nextWorkout);
  return readActiveWorkout() ?? nextWorkout;
}

export function createActiveWorkoutFromPlanDay(plan: GeneratedPlan, day: GeneratedWorkoutDay, now = new Date()): ActiveWorkout {
  const timestamp = now.toISOString();
  return {
    id: createId('active-workout'),
    status: 'active',
    startedAt: timestamp,
    trainingDate: getLocalDateKeyFromDate(now),
    source: 'plan',
    planId: plan.id,
    planDayId: day.id,
    exercises: day.items.map(mapGeneratedPlanItemToActiveWorkoutExercise),
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function mapGeneratedPlanItemToActiveWorkoutExercise(item: GeneratedPlanItem, index: number): ActiveWorkoutExercise {
  return {
    id: createId('active-exercise'),
    exerciseId: item.exerciseId,
    order: index,
    source: 'plan',
    planned: {
      sets: item.sets,
      repRange: item.repRange,
      restSeconds: item.restSeconds,
      note: item.note
    },
    sets: Array.from({ length: Math.max(1, item.sets) }, (_, setIndex) => createActiveWorkoutSet(setIndex + 1))
  };
}

export function addExerciseToExistingActiveWorkout(exerciseId: string): { status: 'added' | 'duplicate' | 'missing'; workout: ActiveWorkout | null } {
  const workout = readActiveWorkout();
  if (!workout) return { status: 'missing', workout: null };
  if (isExerciseInActiveWorkout(workout, exerciseId)) return { status: 'duplicate', workout };

  const nextWorkout = touch({
    ...workout,
    exercises: [...workout.exercises, createActiveWorkoutExercise(exerciseId, workout.exercises.length, 'exercise-detail')]
  });
  writeActiveWorkout(nextWorkout);
  return { status: 'added', workout: readActiveWorkout() ?? nextWorkout };
}

export function isExerciseInActiveWorkout(workout: ActiveWorkout, exerciseId: string): boolean {
  return workout.exercises.some((exercise) => exercise.exerciseId === exerciseId);
}

export function removeExerciseFromActiveWorkout(workout: ActiveWorkout, activeExerciseId: string): ActiveWorkout {
  return touch({
    ...workout,
    exercises: workout.exercises
      .filter((exercise) => exercise.id !== activeExerciseId)
      .map((exercise, index) => ({ ...exercise, order: index }))
  });
}

export function addSetToActiveWorkoutExercise(workout: ActiveWorkout, activeExerciseId: string): ActiveWorkout {
  return updateExercise(workout, activeExerciseId, (exercise) => ({
    ...exercise,
    sets: [...exercise.sets, createActiveWorkoutSet(exercise.sets.length + 1)]
  }));
}

export function removeSetFromActiveWorkoutExercise(workout: ActiveWorkout, activeExerciseId: string, setId: string): ActiveWorkout {
  return updateExercise(workout, activeExerciseId, (exercise) => {
    const nextSets = exercise.sets.filter((set) => set.id !== setId);
    return {
      ...exercise,
      sets: reindexSets(nextSets.length > 0 ? nextSets : [createActiveWorkoutSet(1)])
    };
  });
}

export function updateActiveWorkoutSet(
  workout: ActiveWorkout,
  activeExerciseId: string,
  setId: string,
  key: 'weight' | 'reps',
  value: string
): ActiveWorkout {
  return updateExercise(workout, activeExerciseId, (exercise) => {
    const nextExercise = {
      ...exercise,
      sets: exercise.sets.map((set) => (set.id === setId ? updateSetValue(set, key, value) : set))
    };

    if (nextExercise.startedAt || nextExercise.endedAt || !hasAnyDisplayableSetValue(nextExercise)) return nextExercise;

    return {
      ...nextExercise,
      startedAt: new Date().toISOString()
    };
  });
}

export function updateActiveWorkoutExerciseNotes(workout: ActiveWorkout, activeExerciseId: string, notes: string): ActiveWorkout {
  return updateExercise(workout, activeExerciseId, (exercise) => ({ ...exercise, notes }));
}

export function endActiveWorkoutExercise(workout: ActiveWorkout, activeExerciseId: string, endedAt = new Date()): ActiveWorkout {
  return updateExercise(workout, activeExerciseId, (exercise) => {
    if (!exercise.startedAt || exercise.endedAt) return exercise;

    return {
      ...exercise,
      endedAt: endedAt.toISOString()
    };
  });
}

export function getLocalDateKeyFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function archiveActiveWorkout(workout: ActiveWorkout, endedAt = new Date()): ActiveWorkoutArchiveResult {
  if (workout.exercises.length === 0) return { ok: false, error: 'no-exercise' };

  const exercisesWithSets: WorkoutLogExercise[] = [];

  for (const exercise of workout.exercises) {
    const validSets: WorkoutSet[] = [];

    for (const set of exercise.sets) {
      const normalizedSet = normalizeSet(set, validSets.length + 1);
      if (normalizedSet.error) return { ok: false, error: normalizedSet.error };
      if (normalizedSet.set) validSets.push(normalizedSet.set);
    }

    if (validSets.length > 0) {
      exercisesWithSets.push({
        id: exercise.id,
        exerciseId: exercise.exerciseId,
        order: exercisesWithSets.length,
        sets: validSets,
        notes: exercise.notes?.trim() || undefined
      });
    }
  }

  if (exercisesWithSets.length === 0) return { ok: false, error: 'no-valid-set' };

  const startedAtMs = new Date(workout.startedAt).getTime();
  const endedAtMs = endedAt.getTime();
  const durationSeconds =
    Number.isFinite(startedAtMs) && Number.isFinite(endedAtMs) && endedAtMs >= startedAtMs
      ? Math.round((endedAtMs - startedAtMs) / 1000)
      : undefined;

  return {
    ok: true,
    log: {
      id: createId('workout-log'),
      date: workout.trainingDate,
      planId: workout.planId,
      durationSeconds,
      exercises: exercisesWithSets,
      notes: workout.notes?.trim() || undefined,
      createdAt: endedAt.toISOString()
    }
  };
}

function updateExercise(
  workout: ActiveWorkout,
  activeExerciseId: string,
  updater: (exercise: ActiveWorkoutExercise) => ActiveWorkoutExercise
): ActiveWorkout {
  return touch({
    ...workout,
    exercises: workout.exercises.map((exercise) => (exercise.id === activeExerciseId ? updater(exercise) : exercise))
  });
}

function updateSetValue(set: ActiveWorkoutSet, key: 'weight' | 'reps', value: string): ActiveWorkoutSet {
  const trimmed = value.trim();
  if (trimmed === '') {
    const { [key]: _removed, ...rest } = set;
    return rest;
  }
  return { ...set, [key]: Number(trimmed) };
}

function normalizeSet(set: ActiveWorkoutSet, setIndex: number): { set?: WorkoutSet; error?: ActiveWorkoutArchiveError } {
  if (set.weight !== undefined && (!Number.isFinite(set.weight) || set.weight < 0)) return { error: 'invalid-number' };
  if (set.reps !== undefined && (!Number.isFinite(set.reps) || set.reps <= 0)) return { error: 'invalid-number' };
  if (set.reps !== undefined && !Number.isInteger(set.reps)) return { error: 'integer-reps' };
  if (set.weight === undefined && set.reps === undefined) return {};

  return {
    set: {
      id: set.id,
      setIndex,
      weight: set.weight,
      reps: set.reps,
      completed: true,
      restSeconds: set.restSeconds
    }
  };
}

function createActiveWorkoutSet(setIndex: number): ActiveWorkoutSet {
  return {
    id: createId('active-set'),
    setIndex,
    completed: false
  };
}

function createActiveWorkoutExercise(exerciseId: string, order: number, source: ActiveWorkoutSource): ActiveWorkoutExercise {
  return {
    id: createId('active-exercise'),
    exerciseId,
    order,
    source,
    sets: [createActiveWorkoutSet(1)]
  };
}

function reindexSets(sets: ActiveWorkoutSet[]) {
  return sets.map((set, index) => ({ ...set, setIndex: index + 1 }));
}

function hasAnyDisplayableSetValue(exercise: ActiveWorkoutExercise) {
  return exercise.sets.some((set) => set.weight !== undefined || set.reps !== undefined);
}

function touch(workout: ActiveWorkout): ActiveWorkout {
  return { ...workout, updatedAt: new Date().toISOString() };
}

function isActiveWorkout(value: unknown): value is ActiveWorkout {
  if (!value || typeof value !== 'object') return false;
  const workout = value as ActiveWorkout;
  return (
    workout.status === 'active' &&
    typeof workout.id === 'string' &&
    typeof workout.startedAt === 'string' &&
    typeof workout.trainingDate === 'string' &&
    (workout.source === 'manual' || workout.source === 'exercise-detail' || workout.source === 'plan') &&
    Array.isArray(workout.exercises)
  );
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
