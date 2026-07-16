import { expect, test } from '@playwright/test';
import { PosturePlanRepository } from '../repositories/posturePlanRepository';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
});

test('shows a due posture task on the dashboard and starts a linked workout', async ({ page }) => {
  await seedDuePlan(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: '今日体态任务' })).toBeVisible();
  await page.getByRole('button', { name: '开始体态任务' }).click();
  await expect(page).toHaveURL('/workout-log');
  const context = await page.evaluate(() => JSON.parse(localStorage.getItem('musclemap.activeWorkout.v0.7') ?? 'null')?.posturePlanContext);
  expect(context?.planId).toBe('plan-1');
});

test('asks for feedback before archiving a posture-plan workout', async ({ page }) => {
  await seedDuePlan(page);
  await page.reload();
  await page.getByRole('button', { name: '开始体态任务' }).click();
  await page.getByTestId('set-duration-input').first().fill('30');
  await page.getByTestId('end-active-workout').click();
  await expect(page.getByRole('heading', { name: '记录本次体态反馈' })).toBeVisible();
  await page.getByRole('button', { name: '保存反馈并结束训练' }).click();
  await expect(page).toHaveURL(/\/workout-history\//);
  const feedback = await page.evaluate(() => JSON.parse(localStorage.getItem('musclemap.postureFeedback.v1') ?? '[]'));
  expect(feedback).toHaveLength(1);
  expect(feedback[0]).toMatchObject({ planId: 'plan-1', status: 'completed', difficulty: 'appropriate' });
});

test('stores completed and aborted session feedback safely', () => {
  const repository = new PosturePlanRepository(new MemoryStorage(), () => new Date('2026-07-17T08:30:00.000Z'));
  expect(repository.saveFeedback({ planId: 'plan-1', workoutLogId: 'log-1', discomfortBefore: 4, discomfortAfter: 2, difficulty: 'appropriate', status: 'completed' }).ok).toBe(true);
  expect(repository.saveFeedback({ planId: 'plan-1', workoutLogId: 'log-2', discomfortBefore: 6, status: 'aborted', abortReason: '明显不适' }).ok).toBe(true);
  expect(repository.listFeedback().map(({ status }) => status).sort()).toEqual(['aborted', 'completed']);
  expect(repository.saveFeedback({ planId: 'plan-1', workoutLogId: 'bad', discomfortBefore: 11, status: 'aborted', abortReason: '' })).toEqual({ ok: false, error: 'invalid-feedback' });
});

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

async function seedDuePlan(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    localStorage.setItem('musclemap.posturePlans.v1', JSON.stringify([{ id: 'plan-1', protocolId: 'UPPER_POSTURE_001', assessmentId: 'assessment-1', status: 'active', startDate: date, durationWeeks: 2, weeklyFrequency: 1, weekdays: [now.getDay()], recommendationReasons: ['匹配上半身体态'], qualitySnapshot: { dataQuality: 'medium', completeness: 'complete', sourceUrl: 'https://example.com' }, reassessmentIds: [], createdAt: now.toISOString(), updatedAt: now.toISOString() }]));
  });
}
