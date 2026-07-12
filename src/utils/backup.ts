import type { BackupSummary, MuscleMapBackupData, MuscleMapBackupFile } from '../types/backup';
import type { GeneratedPlan, WorkoutLog, WorkoutLogExercise, WorkoutSet } from '../types/workout';
import { PLAN_STORAGE_KEY } from './planRules';
import { readStorage } from './storage';
import { BODY_SNAPSHOTS_KEY, readBodySnapshots } from './bodySnapshots';
import { normalizeBodyMetricRecord } from '../repositories/bodyMetricRepository';

export const BACKUP_APP_NAME = 'MuscleMap Fitness';
export const BACKUP_EXPORT_VERSION = 3;
export const WORKOUT_LOGS_KEY = 'musclemap.workoutLogs.v0.3';
export const LATEST_WORKOUT_LOG_KEY = 'musclemap.latestWorkoutLog.v0.3';

export type BackupValidationError =
  | 'invalid-json'
  | 'missing-fields'
  | 'wrong-app'
  | 'unsupported-version'
  | 'damaged-workout-logs'
  | 'damaged-body-snapshots';

export const backupErrorMessages: Record<BackupValidationError, string> = {
  'invalid-json': '文件内容不是有效 JSON。',
  'missing-fields': '备份文件缺少必要字段。',
  'wrong-app': '这不是 MuscleMap Fitness 的导出文件。',
  'unsupported-version': '当前版本不支持该备份文件。',
  'damaged-workout-logs': '备份文件中的训练记录结构损坏。',
  'damaged-body-snapshots': '备份文件中的身体记录结构损坏。'
};

type ValidationResult = { ok: true; backup: MuscleMapBackupFile; summary: BackupSummary } | { ok: false; error: BackupValidationError };

export function readCurrentBackupData(): MuscleMapBackupData {
  const latestGeneratedPlan = readStorage<GeneratedPlan | null>(PLAN_STORAGE_KEY, null);
  const workoutLogs = readStorage<WorkoutLog[]>(WORKOUT_LOGS_KEY, []);
  const latestWorkoutLog = readStorage<WorkoutLog | null>(LATEST_WORKOUT_LOG_KEY, null);
  const bodySnapshots = readBodySnapshots();

  return {
    latestGeneratedPlan: isGeneratedPlan(latestGeneratedPlan) ? latestGeneratedPlan : null,
    workoutLogs: Array.isArray(workoutLogs) ? workoutLogs.filter(isWorkoutLog) : [],
    latestWorkoutLog: isWorkoutLog(latestWorkoutLog) ? latestWorkoutLog : null,
    bodySnapshots
  };
}

export function createBackupFile(data: MuscleMapBackupData): MuscleMapBackupFile {
  return {
    app: BACKUP_APP_NAME,
    exportVersion: BACKUP_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    data
  };
}

export function summarizeBackupData(data: MuscleMapBackupData, exportedAt?: string): BackupSummary {
  return {
    hasLatestGeneratedPlan: data.latestGeneratedPlan !== null,
    workoutLogCount: data.workoutLogs.length,
    hasLatestWorkoutLog: data.latestWorkoutLog !== null,
    bodySnapshotCount: data.bodySnapshots.length,
    exportedAt
  };
}

export function validateBackupText(text: string): ValidationResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'invalid-json' };
  }

  if (!isPlainObject(parsed)) return { ok: false, error: 'missing-fields' };

  if (!('app' in parsed) || !('exportVersion' in parsed) || !('exportedAt' in parsed) || !('data' in parsed)) {
    return { ok: false, error: 'missing-fields' };
  }

  if (parsed.app !== BACKUP_APP_NAME) return { ok: false, error: 'wrong-app' };
  if (parsed.exportVersion !== 1 && parsed.exportVersion !== 2 && parsed.exportVersion !== BACKUP_EXPORT_VERSION) return { ok: false, error: 'unsupported-version' };
  if (typeof parsed.exportedAt !== 'string' || !isPlainObject(parsed.data)) return { ok: false, error: 'missing-fields' };

  const data = parsed.data;
  if (!('latestGeneratedPlan' in data) || !('workoutLogs' in data) || !('latestWorkoutLog' in data)) {
    return { ok: false, error: 'missing-fields' };
  }

  if (data.latestGeneratedPlan !== null && !isGeneratedPlan(data.latestGeneratedPlan)) {
    return { ok: false, error: 'missing-fields' };
  }

  if (!Array.isArray(data.workoutLogs) || !data.workoutLogs.every(isWorkoutLog)) {
    return { ok: false, error: 'damaged-workout-logs' };
  }

  if (data.latestWorkoutLog !== null && !isWorkoutLog(data.latestWorkoutLog)) {
    return { ok: false, error: 'damaged-workout-logs' };
  }

  const rawBodySnapshots = parsed.exportVersion === 1 ? [] : data.bodySnapshots;
  if (!Array.isArray(rawBodySnapshots)) {
    return { ok: false, error: 'damaged-body-snapshots' };
  }
  const bodySnapshots = rawBodySnapshots.map(normalizeBodyMetricRecord);
  if (bodySnapshots.some((record) => record === null)) return { ok: false, error: 'damaged-body-snapshots' };

  const backup: MuscleMapBackupFile = {
    app: BACKUP_APP_NAME,
    exportVersion: parsed.exportVersion,
    exportedAt: parsed.exportedAt,
    data: {
      latestGeneratedPlan: data.latestGeneratedPlan,
      workoutLogs: data.workoutLogs,
      latestWorkoutLog: data.latestWorkoutLog,
      bodySnapshots: bodySnapshots.filter((record): record is NonNullable<typeof record> => record !== null)
    }
  };

  return { ok: true, backup, summary: summarizeBackupData(backup.data, backup.exportedAt) };
}

export function applyBackupData(data: MuscleMapBackupData): boolean {
  try {
    if (data.latestGeneratedPlan === null) {
      window.localStorage.removeItem(PLAN_STORAGE_KEY);
    } else {
      window.localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(data.latestGeneratedPlan));
    }

    window.localStorage.setItem(WORKOUT_LOGS_KEY, JSON.stringify(data.workoutLogs));

    if (data.latestWorkoutLog === null) {
      window.localStorage.removeItem(LATEST_WORKOUT_LOG_KEY);
    } else {
      window.localStorage.setItem(LATEST_WORKOUT_LOG_KEY, JSON.stringify(data.latestWorkoutLog));
    }

    window.localStorage.setItem(BODY_SNAPSHOTS_KEY, JSON.stringify(data.bodySnapshots));

    return true;
  } catch {
    return false;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isGeneratedPlan(value: unknown): value is GeneratedPlan {
  if (!isPlainObject(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    isPlainObject(value.input) &&
    Array.isArray(value.days) &&
    typeof value.createdAt === 'string'
  );
}

function isWorkoutLog(value: unknown): value is WorkoutLog {
  if (!isPlainObject(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.date === 'string' &&
    Array.isArray(value.exercises) &&
    value.exercises.every(isWorkoutLogExercise) &&
    typeof value.createdAt === 'string'
  );
}

function isWorkoutLogExercise(value: unknown): value is WorkoutLogExercise {
  if (!isPlainObject(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.exerciseId === 'string' &&
    typeof value.order === 'number' &&
    Array.isArray(value.sets) &&
    value.sets.every(isWorkoutSet)
  );
}

function isWorkoutSet(value: unknown): value is WorkoutSet {
  if (!isPlainObject(value)) return false;
  return typeof value.id === 'string' && typeof value.setIndex === 'number' && typeof value.completed === 'boolean';
}
