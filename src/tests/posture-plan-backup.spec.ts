import { expect, test } from '@playwright/test';
import { BACKUP_APP_NAME, BACKUP_EXPORT_VERSION, validateBackupText } from '../utils/backup';

test('validates current posture data and keeps it in the normalized backup', () => {
  const exportedAt = '2026-07-30T09:00:00.000Z';
  const plan = { id: 'plan-1', protocolId: 'UPPER_POSTURE_001', assessmentId: 'assessment-1', status: 'completed', startDate: '2026-07-16', durationWeeks: 2, weeklyFrequency: 1, weekdays: [4], recommendationReasons: ['匹配上半身体态'], qualitySnapshot: { dataQuality: 'high', completeness: 'complete', sourceUrl: 'https://example.com' }, reassessmentIds: [], createdAt: exportedAt, updatedAt: exportedAt, completedAt: exportedAt };
  const assessment = { id: 'assessment-1', kind: 'initial', goals: ['comfort'], regions: ['upper_posture'], symptomDuration: '1-3m', discomfort: 4, functionScore: 6, riskFlags: [], equipment: ['bodyweight'], sessionMinutes: 15, weeklyFrequency: 1, createdAt: exportedAt };
  const feedback = { id: 'feedback-1', planId: 'plan-1', workoutLogId: 'log-1', discomfortBefore: 4, discomfortAfter: 2, difficulty: 'appropriate', status: 'completed', createdAt: exportedAt };
  const result = validateBackupText(JSON.stringify({ app: BACKUP_APP_NAME, exportVersion: BACKUP_EXPORT_VERSION, exportedAt, data: { latestGeneratedPlan: null, workoutLogs: [], latestWorkoutLog: null, bodySnapshots: [], trainingTemplates: [], postureAssessments: [assessment], posturePlans: [plan], postureFeedback: [feedback], postureScreeningSessions: [] } }));
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.backup.data.posturePlans).toEqual([plan]);
  expect(result.summary.posturePlanCount).toBe(1);
});

test('migrates posture-only v4 backups with empty training templates', () => {
  const exportedAt = '2026-07-30T09:00:00.000Z';
  const assessment = { id: 'assessment-1', kind: 'initial', goals: ['comfort'], regions: ['upper_posture'], symptomDuration: '1-3m', discomfort: 4, functionScore: 6, riskFlags: [], equipment: ['bodyweight'], sessionMinutes: 15, weeklyFrequency: 1, createdAt: exportedAt };
  const result = validateBackupText(JSON.stringify({ app: BACKUP_APP_NAME, exportVersion: 4, exportedAt, data: { latestGeneratedPlan: null, workoutLogs: [], latestWorkoutLog: null, bodySnapshots: [], postureAssessments: [assessment], posturePlans: [], postureFeedback: [] } }));
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.backup.data.trainingTemplates).toEqual([]);
  expect(result.backup.data.postureAssessments).toEqual([assessment]);
});

test('migrates v3 backups with empty posture collections', () => {
  const result = validateBackupText(JSON.stringify({ app: BACKUP_APP_NAME, exportVersion: 3, exportedAt: '2026-07-01T00:00:00.000Z', data: { latestGeneratedPlan: null, workoutLogs: [], latestWorkoutLog: null, bodySnapshots: [] } }));
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.backup.data).toMatchObject({ postureAssessments: [], posturePlans: [], postureFeedback: [] });
});
