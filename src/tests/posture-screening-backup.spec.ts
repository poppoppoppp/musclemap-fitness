import { expect, test } from '@playwright/test';
import type { MuscleMapBackupData } from '../types/backup';
import type { PostureScreeningSession } from '../repositories/postureScreeningRepository';
import { POSTURE_SCREENING_SESSIONS_KEY } from '../repositories/postureScreeningRepository';
import type { PostureScreeningInput } from '../utils/postureScreeningRules';
import { evaluatePostureScreening } from '../utils/postureScreeningRules';
import {
  applyBackupData,
  BACKUP_APP_NAME,
  BACKUP_EXPORT_VERSION,
  createBackupFile,
  validateBackupText,
} from '../utils/backup';

const makeSession = (): PostureScreeningSession => {
  const input: PostureScreeningInput = {
    age: 30,
    boundaryAccepted: true,
    safetyFlags: [],
    primaryConcern: 'shoulder-asymmetry',
    subjectiveObservations: ['shoulder-height-concern'],
    movement: { testId: 'upper-quarter-reach-observation-v1', status: 'completed', stopSymptoms: [], observations: ['arm-raise-asymmetry'] },
    photo: { status: 'completed', observations: ['shoulder-height-difference'], reasonCodes: [] },
  };
  const result = evaluatePostureScreening(input);
  return {
    id: 'screening-session-1',
    status: result.status,
    input,
    result,
    photoMeasurements: [{
      view: 'front',
      photoAssetId: 'local-photo-asset-1',
      photoAssetAvailable: true,
      landmarks: { leftAcromion: { x: 0.35, y: 0.4 }, rightAcromion: { x: 0.65, y: 0.44 } },
      measurements: [{ metricId: 'frontal-shoulder-height-difference', value: 0.04, unit: 'ratio', evidenceIds: ['upper-body-photogrammetry-review-v1'] }],
      quality: 'valid',
    }],
    createdAt: '2026-07-17T08:00:00.000Z',
    updatedAt: '2026-07-17T08:00:00.000Z',
    completedAt: '2026-07-17T08:00:00.000Z',
  };
};

const emptyData = () => ({
  latestGeneratedPlan: null,
  workoutLogs: [],
  latestWorkoutLog: null,
  bodySnapshots: [],
  trainingTemplates: [],
  postureAssessments: [],
  posturePlans: [],
  postureFeedback: [],
});

test('exports v6 structured screening sessions without local photo references or blobs', () => {
  const data = { ...emptyData(), postureScreeningSessions: [makeSession()] } as MuscleMapBackupData & { postureScreeningSessions: PostureScreeningSession[] };
  const backup = createBackupFile(data);
  const exportedData = backup.data as MuscleMapBackupData & { postureScreeningSessions: PostureScreeningSession[] };

  expect(BACKUP_EXPORT_VERSION).toBe(6);
  expect(exportedData.postureScreeningSessions).toHaveLength(1);
  expect(exportedData.postureScreeningSessions[0].photoMeasurements[0]).toMatchObject({
    photoAssetAvailable: false,
    landmarks: { leftAcromion: { x: 0.35, y: 0.4 } },
    measurements: [{ metricId: 'frontal-shoulder-height-difference', value: 0.04 }],
  });
  expect(exportedData.postureScreeningSessions[0].photoMeasurements[0]).not.toHaveProperty('photoAssetId');
  expect(JSON.stringify(backup)).not.toContain('front-photo');
});

test('validates v6 and reports the structured screening count', () => {
  const rawSession = makeSession();
  const result = validateBackupText(JSON.stringify({
    app: BACKUP_APP_NAME,
    exportVersion: 6,
    exportedAt: '2026-07-17T09:00:00.000Z',
    data: { ...emptyData(), postureScreeningSessions: [rawSession] },
  }));

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.summary.postureScreeningSessionCount).toBe(1);
  expect(result.backup.data.postureScreeningSessions[0].photoMeasurements[0]).not.toHaveProperty('photoAssetId');
  expect(result.backup.data.postureScreeningSessions[0].photoMeasurements[0].photoAssetAvailable).toBe(false);
});

test('migrates v1 through v5 backups with no structured screening sessions', () => {
  for (const exportVersion of [1, 2, 3, 4, 5]) {
    const data = emptyData() as Record<string, unknown>;
    if (exportVersion === 1) delete data.bodySnapshots;
    if (exportVersion < 4) delete data.trainingTemplates;
    if (exportVersion < 5) {
      delete data.postureAssessments;
      delete data.posturePlans;
      delete data.postureFeedback;
    }
    const result = validateBackupText(JSON.stringify({ app: BACKUP_APP_NAME, exportVersion, exportedAt: '2026-07-17T09:00:00.000Z', data }));
    expect(result.ok, `v${exportVersion}`).toBe(true);
    if (result.ok) expect(result.backup.data.postureScreeningSessions).toEqual([]);
  }
});

test('rejects malformed v6 screening data without damaging older posture collections', () => {
  const result = validateBackupText(JSON.stringify({
    app: BACKUP_APP_NAME,
    exportVersion: 6,
    exportedAt: '2026-07-17T09:00:00.000Z',
    data: { ...emptyData(), postureScreeningSessions: [{ id: 'broken-session' }] },
  }));
  expect(result).toEqual({ ok: false, error: 'damaged-posture-screening-data' });
});

test('applies sanitized structured sessions to their versioned storage key', async ({ page }) => {
  await page.goto('/');
  const stored = await page.evaluate(async ({ key, session }) => {
    const modulePath = '/src/utils/backup.ts';
    const { applyBackupData } = await import(/* @vite-ignore */ modulePath) as typeof import('../utils/backup');
    const data = {
      latestGeneratedPlan: null,
      workoutLogs: [],
      latestWorkoutLog: null,
      bodySnapshots: [],
      trainingTemplates: [],
      postureAssessments: [],
      posturePlans: [],
      postureFeedback: [],
      postureScreeningSessions: [session],
    } as MuscleMapBackupData;
    const applied = applyBackupData(data);
    return { applied, value: JSON.parse(window.localStorage.getItem(key) ?? '[]') };
  }, { key: POSTURE_SCREENING_SESSIONS_KEY, session: makeSession() });

  expect(stored.applied).toBe(true);
  expect(stored.value).toHaveLength(1);
  expect(stored.value[0].photoMeasurements[0].photoAssetAvailable).toBe(false);
  expect(stored.value[0].photoMeasurements[0]).not.toHaveProperty('photoAssetId');
});

test('data management distinguishes structured sessions from device-only raw photos', async ({ page }) => {
  await page.addInitScript(({ key, session }) => window.localStorage.setItem(key, JSON.stringify([session])), {
    key: POSTURE_SCREENING_SESSIONS_KEY,
    session: makeSession(),
  });
  await page.goto('/data-management');
  await page.getByTestId('open-backup-panel').click();
  await expect(page.getByTestId('backup-posture-screening-count')).toContainText('1 条');
  await expect(page.getByText('体态筛查原图仅保存在当前设备，不会导出。')).toBeVisible();
});
