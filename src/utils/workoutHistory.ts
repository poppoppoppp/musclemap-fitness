import type { WorkoutLog, WorkoutLogExercise, WorkoutSet } from '../types/workout';
import { WORKOUT_LOGS_KEY } from './backup';
import { readStorage } from './storage';

export function readWorkoutLogs(): WorkoutLog[] {
  const value = readStorage<unknown>(WORKOUT_LOGS_KEY, []);
  if (!Array.isArray(value)) return [];
  return sortWorkoutLogs(value.filter(isWorkoutLog));
}

export function sortWorkoutLogs(logs: WorkoutLog[]): WorkoutLog[] {
  return [...logs].sort((left, right) => {
    const dateDiff = timestampFromDateKey(right.date) - timestampFromDateKey(left.date);
    if (dateDiff !== 0) return dateDiff;

    const rightCreatedAt = timestampFromDateTime(right.createdAt);
    const leftCreatedAt = timestampFromDateTime(left.createdAt);
    return rightCreatedAt - leftCreatedAt;
  });
}

export function getWorkoutLogById(logs: WorkoutLog[], logId: string | undefined): WorkoutLog | null {
  if (!logId) return null;
  return logs.find((log) => log.id === logId) ?? null;
}

export function countValidSets(log: WorkoutLog): number {
  return getDisplayableWorkoutExercises(log).reduce((count, exercise) => count + exercise.sets.length, 0);
}

export function formatDuration(durationSeconds: unknown): string | null {
  if (typeof durationSeconds !== 'number' || !Number.isFinite(durationSeconds) || durationSeconds < 0) return null;
  const minutes = Math.max(1, Math.round(durationSeconds / 60));
  return `${minutes} 分钟`;
}

export function formatWorkoutSet(set: WorkoutSet): string | null {
  const setIndex = typeof set.setIndex === 'number' && Number.isFinite(set.setIndex) ? set.setIndex : 1;
  const hasWeight = isDisplayableNumber(set.weight);
  const hasReps = isDisplayableNumber(set.reps);

  if (hasWeight && hasReps) return `第 ${setIndex} 组：${set.weight}kg x ${set.reps} 次`;
  if (hasWeight) return `第 ${setIndex} 组：${set.weight}kg`;
  if (hasReps) return `第 ${setIndex} 组：${set.reps} 次`;
  return null;
}

export function getWorkoutSourceLabel(log: WorkoutLog): string {
  return log.planId ? '计划' : '未标注';
}

export function getDisplayableWorkoutExercises(log: WorkoutLog): WorkoutLogExercise[] {
  const exercises = Array.isArray(log.exercises) ? log.exercises : [];
  return exercises
    .map((exercise, index) => ({
      ...exercise,
      order: typeof exercise.order === 'number' && Number.isFinite(exercise.order) ? exercise.order : index,
      sets: Array.isArray(exercise.sets) ? exercise.sets.filter((set) => formatWorkoutSet(set) !== null) : []
    }))
    .sort((left, right) => left.order - right.order);
}

function timestampFromDateKey(value: string): number {
  const timestamp = Date.parse(`${value}T00:00:00`);
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
}

function timestampFromDateTime(value: string): number {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
}

function isWorkoutLog(value: unknown): value is WorkoutLog {
  if (!value || typeof value !== 'object') return false;
  const log = value as WorkoutLog;
  return typeof log.id === 'string' && typeof log.date === 'string' && Array.isArray(log.exercises);
}

function isDisplayableNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
