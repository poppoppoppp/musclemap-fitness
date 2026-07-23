import { expect, test } from '@playwright/test';
import type { PostureScreeningResult } from '../utils/postureScreeningRules';
import { buildPostureRecommendationSnapshots, POSTURE_SCREENING_PROTOCOL_WHITELIST } from '../utils/postureScreeningRecommendations';

const patterns = [
  'forward-head-upper-quarter-tendency',
  'thoracic-rotation-mobility-tendency',
  'frontal-shoulder-asymmetry-tendency',
  'frontal-trunk-deviation-tendency',
] as const;

function result(): PostureScreeningResult {
  return {
    status: 'completed', summary: 'test', evidenceIds: [], reasonCodes: [], nextActions: [], algorithmVersion: '1.0.0', protocolVersion: 'adult-posture-screening-v1',
    findings: patterns.map((patternId) => ({
      patternId, label: patternId, evidenceClasses: ['functional'], evidenceIds: [], reasonCodes: [], confidence: 'supported',
      allowedConclusion: 'screening tendency only', forbiddenConclusions: ['not a diagnosis'],
    })),
  };
}

test('uses only the independent deterministic protocol whitelist', () => {
  expect(POSTURE_SCREENING_PROTOCOL_WHITELIST).toEqual({
    'forward-head-upper-quarter-tendency': 'UPPER_POSTURE_001',
    'thoracic-rotation-mobility-tendency': 'THORACIC_001',
  });
  const snapshots = buildPostureRecommendationSnapshots(result());
  expect(snapshots.map(({ patternId, status, protocolId }) => ({ patternId, status, protocolId }))).toEqual([
    { patternId: patterns[0], status: 'available', protocolId: 'UPPER_POSTURE_001' },
    { patternId: patterns[1], status: 'available', protocolId: 'THORACIC_001' },
    { patternId: patterns[2], status: 'unavailable', protocolId: undefined },
    { patternId: patterns[3], status: 'unavailable', protocolId: undefined },
  ]);
  expect(snapshots[0].protocolTitle).toBeTruthy();
  expect(snapshots[0].userFacingGoal).toBeTruthy();
  expect(snapshots[0].limitations.length).toBeGreaterThan(0);
  expect(snapshots[2].reason).toContain('暂无适配方案');
});

test('does not derive findings or recommendations from dynamic squat and neck metrics', () => {
  const noFindings = { ...result(), findings: [] };
  expect(buildPostureRecommendationSnapshots(noFindings)).toEqual([]);
});

test('adds an available frozen recommendation through the existing active workout protocol snapshot path', async ({ page }) => {
  const recommendation = buildPostureRecommendationSnapshots(result())[0];
  await page.goto('/');
  const { added, duplicate, workout } = await page.evaluate(async ({ recommendation }) => {
    const recommendationPath = '/src/utils/postureScreeningRecommendations.ts';
    const workoutPath = '/src/utils/activeWorkout.ts';
    const { addScreeningRecommendationToCurrentWorkout } = await import(/* @vite-ignore */ recommendationPath) as typeof import('../utils/postureScreeningRecommendations');
    const { clearActiveWorkout, readActiveWorkout } = await import(/* @vite-ignore */ workoutPath) as typeof import('../utils/activeWorkout');
    clearActiveWorkout();
    const added = addScreeningRecommendationToCurrentWorkout(recommendation, new Date('2026-07-22T12:00:00.000Z'));
    const workout = readActiveWorkout();
    const duplicate = addScreeningRecommendationToCurrentWorkout(recommendation);
    clearActiveWorkout();
    return { added, duplicate, workout };
  }, { recommendation });
  expect(added.status).toBe('added');
  expect(workout?.source).toBe('manual');
  expect(workout?.postureProtocolGroups?.[0].sourceProtocolId).toBe('UPPER_POSTURE_001');
  expect(workout?.postureProtocolGroups?.[0].nameSnapshot).toBe(recommendation.protocolTitle);
  expect(workout?.exercises.length).toBeGreaterThan(0);
  expect(duplicate.status).toBe('already-added');
});

test('adds a screening recommendation to existing or new templates and reports duplicates', async ({ page }) => {
  const recommendation = buildPostureRecommendationSnapshots(result())[0];
  await page.goto('/');
  const outcome = await page.evaluate(async ({ recommendation }) => {
    const recommendationPath = '/src/utils/postureScreeningRecommendations.ts';
    const templatesPath = '/src/utils/trainingTemplates.ts';
    const recommendations = await import(/* @vite-ignore */ recommendationPath) as typeof import('../utils/postureScreeningRecommendations');
    const templates = await import(/* @vite-ignore */ templatesPath) as typeof import('../utils/trainingTemplates');
    localStorage.removeItem(templates.TRAINING_TEMPLATES_STORAGE_KEY);
    const existing = templates.createTrainingTemplate({ name: '已有模板', focusTags: [], items: [] });
    if (!existing.ok) throw new Error('create failed');
    const added = recommendations.addScreeningRecommendationToTrainingTemplate(recommendation, { kind: 'existing', templateId: existing.template.id }, new Date('2026-07-22T12:00:00.000Z'));
    const duplicate = recommendations.addScreeningRecommendationToTrainingTemplate(recommendation, { kind: 'existing', templateId: existing.template.id });
    const created = recommendations.addScreeningRecommendationToTrainingTemplate(recommendation, { kind: 'new', name: '新体态模板' }, new Date('2026-07-22T13:00:00.000Z'));
    return { added, duplicate, created, templates: templates.readTrainingTemplates() };
  }, { recommendation });

  expect(outcome.added).toMatchObject({ status: 'added', templateId: expect.any(String) });
  expect(outcome.added.status).toBe('added');
  if (outcome.added.status === 'added') expect(outcome.duplicate).toMatchObject({ status: 'already-added', templateId: outcome.added.templateId });
  expect(outcome.created).toMatchObject({ status: 'added', templateId: expect.any(String) });
  expect(outcome.templates).toHaveLength(2);
  expect(outcome.templates.map((template) => template.postureProtocolGroups?.[0]?.sourceProtocolId)).toEqual(['UPPER_POSTURE_001', 'UPPER_POSTURE_001']);
  expect(outcome.templates.every((template) => template.postureProtocolGroups?.[0]?.sourceSnapshot === 'posture-screening')).toBe(true);
});
