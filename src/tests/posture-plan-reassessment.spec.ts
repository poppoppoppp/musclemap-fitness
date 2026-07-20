import { expect, test } from '@playwright/test';
import { PosturePlanRepository } from '../repositories/posturePlanRepository';
import type { PostureAssessmentInput, PosturePlanInput } from '../types/posturePlan';

test('pauses, resumes, and completes one plan while preserving pause history', () => {
  let now = new Date('2026-07-20T08:00:00.000Z');
  const repository = new PosturePlanRepository(new MemoryStorage(), () => now);
  const assessment = repository.saveAssessment(initialAssessment);
  const created = repository.tryCreatePlan(planInput(assessment.id));
  if (!created.ok) throw new Error('fixture create failed');

  expect(repository.pausePlan(created.plan.id).ok).toBe(true);
  now = new Date('2026-07-22T08:00:00.000Z');
  expect(repository.resumePlan(created.plan.id).ok).toBe(true);
  expect(repository.getActivePlan()?.pauseIntervals).toEqual([{ startedAt: '2026-07-20T08:00:00.000Z', endedAt: '2026-07-22T08:00:00.000Z' }]);

  now = new Date('2026-07-30T08:00:00.000Z');
  expect(repository.completePlan(created.plan.id).ok).toBe(true);
  expect(repository.getActivePlan()).toBeNull();
  expect(repository.listPlans()[0]).toMatchObject({ status: 'completed', completedAt: '2026-07-30T08:00:00.000Z' });
});

test('links a reassessment to its plan', () => {
  const repository = new PosturePlanRepository(new MemoryStorage(), () => new Date('2026-07-30T08:00:00.000Z'));
  const assessment = repository.saveAssessment(initialAssessment);
  const created = repository.tryCreatePlan(planInput(assessment.id));
  if (!created.ok) throw new Error('fixture create failed');
  const result = repository.saveReassessment(created.plan.id, { ...initialAssessment, kind: 'reassessment', planId: created.plan.id, discomfort: 2, functionScore: 8 });
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(repository.listPlans()[0].reassessmentIds).toContain(result.assessment.id);
  expect(repository.listAssessments().find(({ id }) => id === result.assessment.id)).toMatchObject({ kind: 'reassessment', planId: created.plan.id });
});

test('exposes pause, resume, and evidence-screening reassessment controls in the plan hub', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const createdAt = new Date().toISOString();
    localStorage.setItem('musclemap.posturePlans.v1', JSON.stringify([{ id: 'plan-ui', protocolId: 'UPPER_POSTURE_001', assessmentId: 'assessment-ui', status: 'active', startDate: '2026-07-16', durationWeeks: 2, weeklyFrequency: 1, weekdays: [4], recommendationReasons: ['匹配上半身体态'], qualitySnapshot: { dataQuality: 'high', completeness: 'complete', sourceUrl: 'https://example.com' }, reassessmentIds: [], createdAt, updatedAt: createdAt }]));
  });
  await page.goto('/growth/posture');
  await page.getByRole('button', { name: '暂停计划' }).click();
  await expect(page.getByText('计划已暂停。')).toBeVisible();
  await page.getByRole('button', { name: '继续计划' }).click();
  await expect(page.getByText('计划已继续。')).toBeVisible();
  await page.getByRole('link', { name: '开始复测' }).click();
  await expect(page).toHaveURL('/growth/posture/screening?planId=plan-ui');
  await expect(page.getByRole('heading', { name: '体态表现筛查' })).toBeVisible();
});

const initialAssessment: PostureAssessmentInput = {
  kind: 'initial', goals: ['comfort'], regions: ['upper_posture'], symptomDuration: '1-3m', discomfort: 5, functionScore: 5,
  riskFlags: [], equipment: ['bodyweight'], sessionMinutes: 15, weeklyFrequency: 2
};

function planInput(assessmentId: string): PosturePlanInput {
  return { protocolId: 'UPPER_POSTURE_001', assessmentId, startDate: '2026-07-16', durationWeeks: 2, weeklyFrequency: 2, weekdays: [1, 3], recommendationReasons: ['匹配上半身体态'], qualitySnapshot: { dataQuality: 'high', completeness: 'complete', sourceUrl: 'https://example.com' } };
}

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}
