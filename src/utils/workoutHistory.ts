import type { WorkoutLog, WorkoutLogExercise, WorkoutSet } from '../types/workout';
import { LATEST_WORKOUT_LOG_KEY, WORKOUT_LOGS_KEY } from './backup';
import { readStorage, removeStorage, writeStorage } from './storage';

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

export function saveWorkoutLog(log: WorkoutLog): WorkoutLog[] {
  const logs = sortWorkoutLogs([log, ...readWorkoutLogs().filter((item) => item.id !== log.id)]);
  writeStorage(WORKOUT_LOGS_KEY, logs);
  syncLatestWorkoutLog(logs);
  return logs;
}

export function updateWorkoutLog(logId: string, updater: (log: WorkoutLog) => WorkoutLog): WorkoutLog | null {
  const current = getWorkoutLogById(readWorkoutLogs(), logId);
  if (!current) return null;
  const updated = updater(current);
  saveWorkoutLog(updated);
  return updated;
}

export function deleteWorkoutLog(logId: string): WorkoutLog[] {
  const logs = readWorkoutLogs().filter((log) => log.id !== logId);
  writeStorage(WORKOUT_LOGS_KEY, logs);
  syncLatestWorkoutLog(logs);
  return logs;
}

export function syncLatestWorkoutLog(logs: WorkoutLog[]): WorkoutLog | null {
  const latest = sortWorkoutLogs(logs)[0] ?? null;
  if (latest) writeStorage(LATEST_WORKOUT_LOG_KEY, latest);
  else removeStorage(LATEST_WORKOUT_LOG_KEY);
  return latest;
}

export function validateWorkoutLog(log: WorkoutLog): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(log.date) || !Number.isFinite(Date.parse(`${log.date}T00:00:00`))) return '请选择有效的训练日期';
  if (!Array.isArray(log.exercises) || log.exercises.length === 0) return '训练记录至少需要保留一个动作';
  for (const exercise of log.exercises) {
    if (!Array.isArray(exercise.sets) || exercise.sets.length === 0) return '每个动作至少需要保留一个有效组';
    for (const set of exercise.sets) {
      if (set.weight !== undefined && (typeof set.weight !== 'number' || !Number.isFinite(set.weight) || set.weight < 0)) return '重量必须是有效的非负数';
      if (set.reps !== undefined && (typeof set.reps !== 'number' || !Number.isFinite(set.reps) || set.reps < 0 || !Number.isInteger(set.reps))) return '次数必须是非负整数';
      if (set.durationSeconds !== undefined && (typeof set.durationSeconds !== 'number' || !Number.isFinite(set.durationSeconds) || set.durationSeconds <= 0)) return '时长必须是有效的正数';
    }
    if (!exercise.sets.some(isValidWorkoutSet)) return '每个动作至少需要保留一个有效组';
  }
  return null;
}

export function normalizeWorkoutLogForSave(log: WorkoutLog): WorkoutLog {
  return {
    ...log,
    notes: cleanOptionalText(log.notes),
    exercises: log.exercises.map((exercise, order) => ({
      ...exercise,
      order,
      notes: cleanOptionalText(exercise.notes),
      sets: exercise.sets.filter(isValidWorkoutSet).map((set, index) => ({ ...set, setIndex: index + 1, completed: true }))
    }))
  };
}

export function countValidSets(log: WorkoutLog): number {
  return getDisplayableWorkoutExercises(log).reduce((count, exercise) => count + exercise.sets.filter(isValidWorkoutSet).length, 0);
}

export function isValidWorkoutSet(set: WorkoutSet): boolean {
  return isDisplayableNumber(set.weight) || isDisplayableNumber(set.reps) || isDisplayableNumber(set.durationSeconds);
}

export function formatWorkoutDuration(durationSeconds: unknown): string {
  if (typeof durationSeconds !== 'number' || !Number.isFinite(durationSeconds) || durationSeconds < 0) return '暂无';
  const seconds = Math.floor(durationSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  const two = (value: number) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${two(minutes)}:${two(remainder)}` : `${two(minutes)}:${two(remainder)}`;
}

export function summarizeWorkoutExercise(exercise: WorkoutLogExercise): string {
  const sets = exercise.sets.filter(isValidWorkoutSet);
  if (sets.length === 0) return '暂无有效组';
  const parts = [`${sets.length} 组`];
  const weights = sets.map((set) => set.weight).filter(isDisplayableNumber);
  const reps = sets.map((set) => set.reps).filter(isDisplayableNumber);
  const durations = sets.map((set) => set.durationSeconds).filter(isDisplayableNumber);
  if (weights.length) parts.push(`最高 ${formatNumber(Math.max(...weights))}kg`);
  if (reps.length) {
    const min = Math.min(...reps);
    const max = Math.max(...reps);
    parts.push(`${min === max ? min : `${min}–${max}`} 次`);
  }
  if (durations.length) {
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    parts.push(`${min === max ? min : `${min}–${max}`} 秒`);
  }
  return parts.join(' · ');
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
  const hasDuration = isDisplayableNumber(set.durationSeconds);

  if (hasWeight && hasReps) return `第 ${setIndex} 组：${set.weight}kg x ${set.reps} 次`;
  if (hasWeight) return `第 ${setIndex} 组：${set.weight}kg`;
  if (hasReps) return `第 ${setIndex} 组：${set.reps} 次`;
  if (hasDuration) return `第 ${setIndex} 组：${set.durationSeconds} 秒`;
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

function cleanOptionalText(value: string | undefined): string | undefined {
  const cleaned = value?.trim();
  return cleaned || undefined;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}
