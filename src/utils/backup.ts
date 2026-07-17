import type { BackupSummary, MuscleMapBackupData, MuscleMapBackupFile } from '../types/backup';
import type { GeneratedPlan, WorkoutLog, WorkoutLogExercise, WorkoutSet } from '../types/workout';
import { PLAN_STORAGE_KEY } from './planRules';
import { readStorage } from './storage';
import { BODY_SNAPSHOTS_KEY, readBodySnapshots } from './bodySnapshots';
import { normalizeBodyMetricRecord } from '../repositories/bodyMetricRepository';
import { normalizeTrainingTemplates, readTrainingTemplates, TRAINING_TEMPLATES_STORAGE_KEY } from './trainingTemplates';
import {
  createPosturePlanRepository,
  normalizePostureAssessment,
  normalizePostureFeedback,
  normalizePosturePlan,
  POSTURE_ASSESSMENTS_KEY,
  POSTURE_FEEDBACK_KEY,
  POSTURE_PLANS_KEY
} from '../repositories/posturePlanRepository';
import {
  createPostureScreeningRepository,
  normalizePostureScreeningSession,
  POSTURE_SCREENING_SESSIONS_KEY,
  type PostureScreeningSession,
} from '../repositories/postureScreeningRepository';

export const BACKUP_APP_NAME = 'MuscleMap Fitness';
export const BACKUP_EXPORT_VERSION = 6;
export const WORKOUT_LOGS_KEY = 'musclemap.workoutLogs.v0.3';
export const LATEST_WORKOUT_LOG_KEY = 'musclemap.latestWorkoutLog.v0.3';

export type BackupValidationError =
  | 'invalid-json'
  | 'missing-fields'
  | 'wrong-app'
  | 'unsupported-version'
  | 'damaged-workout-logs'
  | 'damaged-body-snapshots'
  | 'damaged-training-templates'
  | 'damaged-posture-data'
  | 'damaged-posture-screening-data';

export const backupErrorMessages: Record<BackupValidationError, string> = {
  'invalid-json': '文件内容不是有效 JSON。',
  'missing-fields': '备份文件缺少必要字段。',
  'wrong-app': '这不是 MuscleMap Fitness 的导出文件。',
  'unsupported-version': '当前版本不支持该备份文件。',
  'damaged-workout-logs': '备份文件中的训练记录结构损坏。',
  'damaged-body-snapshots': '备份文件中的身体记录结构损坏。',
  'damaged-training-templates': '备份文件中的训练模板结构损坏。',
  'damaged-posture-data': '备份文件中的体态计划数据结构损坏。',
  'damaged-posture-screening-data': '备份文件中的体态筛查记录结构损坏。'
};

type ValidationResult = { ok: true; backup: MuscleMapBackupFile; summary: BackupSummary } | { ok: false; error: BackupValidationError };

export function readCurrentBackupData(): MuscleMapBackupData {
  const latestGeneratedPlan = readStorage<GeneratedPlan | null>(PLAN_STORAGE_KEY, null);
  const workoutLogs = readStorage<WorkoutLog[]>(WORKOUT_LOGS_KEY, []);
  const latestWorkoutLog = readStorage<WorkoutLog | null>(LATEST_WORKOUT_LOG_KEY, null);
  const bodySnapshots = readBodySnapshots();
  const trainingTemplates = readTrainingTemplates();
  const postureRepository = createPosturePlanRepository();
  const screeningSessions = createPostureScreeningRepository().readSessions();

  return {
    latestGeneratedPlan: isGeneratedPlan(latestGeneratedPlan) ? latestGeneratedPlan : null,
    workoutLogs: Array.isArray(workoutLogs) ? workoutLogs.filter(isWorkoutLog) : [],
    latestWorkoutLog: isWorkoutLog(latestWorkoutLog) ? latestWorkoutLog : null,
    bodySnapshots,
    trainingTemplates,
    postureAssessments: postureRepository.listAssessments(),
    posturePlans: postureRepository.listPlans(),
    postureFeedback: postureRepository.listFeedback(),
    postureScreeningSessions: screeningSessions.ok ? screeningSessions.value.map(sanitizePostureScreeningSession) : []
  };
}

export function createBackupFile(data: MuscleMapBackupData): MuscleMapBackupFile {
  return {
    app: BACKUP_APP_NAME,
    exportVersion: BACKUP_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      ...data,
      postureScreeningSessions: data.postureScreeningSessions.map(sanitizePostureScreeningSession),
    }
  };
}

export function summarizeBackupData(data: MuscleMapBackupData, exportedAt?: string): BackupSummary {
  return {
    hasLatestGeneratedPlan: data.latestGeneratedPlan !== null,
    workoutLogCount: data.workoutLogs.length,
    hasLatestWorkoutLog: data.latestWorkoutLog !== null,
    bodySnapshotCount: data.bodySnapshots.length,
    trainingTemplateCount: data.trainingTemplates.length,
    posturePlanCount: data.posturePlans.length,
    postureScreeningSessionCount: data.postureScreeningSessions.length,
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
  const exportVersion = parsed.exportVersion;
  if (exportVersion !== 1 && exportVersion !== 2 && exportVersion !== 3 && exportVersion !== 4 && exportVersion !== 5 && exportVersion !== BACKUP_EXPORT_VERSION) return { ok: false, error: 'unsupported-version' };
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

  const rawBodySnapshots = exportVersion === 1 ? [] : data.bodySnapshots;
  if (!Array.isArray(rawBodySnapshots)) {
    return { ok: false, error: 'damaged-body-snapshots' };
  }
  const bodySnapshots = rawBodySnapshots.map(normalizeBodyMetricRecord);
  if (bodySnapshots.some((record) => record === null)) return { ok: false, error: 'damaged-body-snapshots' };

  const rawTrainingTemplates = exportVersion >= 4 && (exportVersion >= 5 || 'trainingTemplates' in data) ? data.trainingTemplates : [];
  if (!Array.isArray(rawTrainingTemplates)) return { ok: false, error: 'damaged-training-templates' };
  const trainingTemplates = normalizeTrainingTemplates(rawTrainingTemplates);
  if (
    trainingTemplates.length !== rawTrainingTemplates.length ||
    rawTrainingTemplates.some((template, index) => (
      !isPlainObject(template) ||
      !Array.isArray(template.items) ||
      trainingTemplates[index]?.items.length !== template.items.length
    ))
  ) {
    return { ok: false, error: 'damaged-training-templates' };
  }

  const expectsPostureData = exportVersion >= 5 || (
    exportVersion === 4 &&
    ('postureAssessments' in data || 'posturePlans' in data || 'postureFeedback' in data)
  );
  const rawPostureAssessments = expectsPostureData ? data.postureAssessments : [];
  const rawPosturePlans = expectsPostureData ? data.posturePlans : [];
  const rawPostureFeedback = expectsPostureData ? data.postureFeedback : [];
  if (!Array.isArray(rawPostureAssessments) || !Array.isArray(rawPosturePlans) || !Array.isArray(rawPostureFeedback)) return { ok: false, error: 'damaged-posture-data' };
  const postureAssessments = rawPostureAssessments.map(normalizePostureAssessment);
  const posturePlans = rawPosturePlans.map(normalizePosturePlan);
  const postureFeedback = rawPostureFeedback.map(normalizePostureFeedback);
  if ([...postureAssessments, ...posturePlans, ...postureFeedback].some((item) => item === null)) return { ok: false, error: 'damaged-posture-data' };

  const rawPostureScreeningSessions = exportVersion >= 6 ? data.postureScreeningSessions : [];
  if (!Array.isArray(rawPostureScreeningSessions)) return { ok: false, error: 'damaged-posture-screening-data' };
  const postureScreeningSessions = rawPostureScreeningSessions.map(normalizePostureScreeningSession);
  if (postureScreeningSessions.some((session) => session === null)) return { ok: false, error: 'damaged-posture-screening-data' };

  const backup: MuscleMapBackupFile = {
    app: BACKUP_APP_NAME,
    exportVersion,
    exportedAt: parsed.exportedAt,
    data: {
      latestGeneratedPlan: data.latestGeneratedPlan,
      workoutLogs: data.workoutLogs,
      latestWorkoutLog: data.latestWorkoutLog,
      bodySnapshots: bodySnapshots.filter((record): record is NonNullable<typeof record> => record !== null),
      trainingTemplates,
      postureAssessments: postureAssessments.filter((record): record is NonNullable<typeof record> => record !== null),
      posturePlans: posturePlans.filter((record): record is NonNullable<typeof record> => record !== null),
      postureFeedback: postureFeedback.filter((record): record is NonNullable<typeof record> => record !== null),
      postureScreeningSessions: postureScreeningSessions
        .filter((record): record is NonNullable<typeof record> => record !== null)
        .map(sanitizePostureScreeningSession)
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
    window.localStorage.setItem(TRAINING_TEMPLATES_STORAGE_KEY, JSON.stringify(data.trainingTemplates));
    window.localStorage.setItem(POSTURE_ASSESSMENTS_KEY, JSON.stringify(data.postureAssessments));
    window.localStorage.setItem(POSTURE_PLANS_KEY, JSON.stringify(data.posturePlans));
    window.localStorage.setItem(POSTURE_FEEDBACK_KEY, JSON.stringify(data.postureFeedback));
    window.localStorage.setItem(POSTURE_SCREENING_SESSIONS_KEY, JSON.stringify(data.postureScreeningSessions.map(sanitizePostureScreeningSession)));

    return true;
  } catch {
    return false;
  }
}

function sanitizePostureScreeningSession(session: PostureScreeningSession): PostureScreeningSession {
  return {
    ...session,
    photoMeasurements: session.photoMeasurements.map((photo) => {
      const { photoAssetId: _localOnly, ...structured } = photo;
      return { ...structured, photoAssetAvailable: false };
    }),
  };
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
