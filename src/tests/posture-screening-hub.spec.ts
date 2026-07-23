import { expect, test } from '@playwright/test';

test.setTimeout(60_000);

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
});

test('takes a no-plan user into mandatory automated capture and restores that draft after reload', async ({ page }) => {
  await page.goto('/growth/posture');
  await page.getByRole('link', { name: '开始体态分析' }).click();
  await expect(page).toHaveURL('/growth/posture/screening');

  await startAutomatedScreening(page);

  await expect(page.getByRole('heading', { name: '正面静态采集' })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('musclemap.postureScreeningSessions.v1') ?? '[]'))).toHaveLength(0);
  await page.reload();
  await expect(page).toHaveURL('/growth/posture/screening');
  await expect(page.getByRole('heading', { name: '正面静态采集' })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('musclemap.postureScreeningSessions.v1') ?? '[]'))).toHaveLength(0);
});

test('opens active-plan reassessment in a typed screening context without mutating the plan', async ({ page }) => {
  await seedActivePlan(page, 'plan-ui');
  const planBefore = await page.evaluate(() => localStorage.getItem('musclemap.posturePlans.v1'));
  await page.goto('/growth/posture');

  await page.getByRole('link', { name: '开始复测' }).click();
  await expect(page).toHaveURL('/growth/posture/screening?planId=plan-ui');
  await expect(page.getByRole('heading', { name: '体态表现筛查' })).toBeVisible();
  await completeBoundaryStop(page);

  const saved = await page.evaluate(() => ({
    plan: localStorage.getItem('musclemap.posturePlans.v1'),
    sessions: JSON.parse(localStorage.getItem('musclemap.postureScreeningSessions.v1') ?? '[]'),
  }));
  expect(saved.plan).toBe(planBefore);
  expect(saved.sessions).toHaveLength(1);
  expect(saved.sessions[0].context).toEqual({ planId: 'plan-ui' });
});

test('preserves explicit plan and baseline ids in the completed screening snapshot', async ({ page }) => {
  await page.goto('/growth/posture/screening?planId=plan-1&baselineSessionId=baseline-1');
  await completeBoundaryStop(page);

  const sessions = await page.evaluate(() => JSON.parse(localStorage.getItem('musclemap.postureScreeningSessions.v1') ?? '[]'));
  expect(sessions).toHaveLength(1);
  expect(sessions[0].context).toEqual({ planId: 'plan-1', baselineSessionId: 'baseline-1' });
});

test('discards an unrelated draft before starting a plan-linked reassessment', async ({ page }) => {
  await seedActivePlan(page, 'plan-ui');
  await page.evaluate(() => {
    const timestamp = new Date().toISOString();
    localStorage.setItem('musclemap.postureScreeningDraft.v1', JSON.stringify({ id: 'stale-draft', currentStep: 'safety', answers: { age: 30, boundaryAccepted: true }, photoMeasurements: [], context: { planId: 'other-plan' }, createdAt: timestamp, updatedAt: timestamp }));
  });
  await page.goto('/growth/posture');
  await page.getByRole('link', { name: '开始复测' }).click();

  await expect(page.getByRole('heading', { name: '先确认适用边界' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('musclemap.postureScreeningDraft.v1'))).toBeNull();
});

async function startAutomatedScreening(page: import('@playwright/test').Page) {
  await page.getByLabel('年龄').fill('30');
  await page.getByLabel('我理解这是体态与功能表现筛查，不是医疗诊断').check();
  await page.getByRole('button', { name: '继续安全检查' }).click();
  await page.getByRole('button', { name: '继续选择关注表现' }).click();
  await page.getByLabel('头颈与上段').check();
  await page.getByLabel(/自然站立或久坐时.*头部相对肩部明显前移/).check();
  await page.getByRole('button', { name: '继续引导观察' }).click();
  await page.getByLabel('上举时头部会向前移动').check();
  await page.getByRole('button', { name: '开始自动体态筛查' }).click();
}

async function completeBoundaryStop(page: import('@playwright/test').Page) {
  await page.getByLabel('年龄').fill('17');
  await page.getByLabel('我理解这是体态与功能表现筛查，不是医疗诊断').check();
  await page.getByRole('button', { name: '继续安全检查' }).click();
  await expect(page).toHaveURL(/\/growth\/posture\/results\//);
}

async function seedActivePlan(page: import('@playwright/test').Page, id: string) {
  await page.evaluate((planId) => {
    const createdAt = new Date().toISOString();
    localStorage.setItem('musclemap.posturePlans.v1', JSON.stringify([{ id: planId, protocolId: 'UPPER_POSTURE_001', assessmentId: 'assessment-ui', status: 'active', startDate: '2026-07-16', durationWeeks: 2, weeklyFrequency: 1, weekdays: [4], recommendationReasons: ['匹配上半身体态'], qualitySnapshot: { dataQuality: 'high', completeness: 'complete', sourceUrl: 'https://example.com' }, reassessmentIds: [], createdAt, updatedAt: createdAt }]));
  }, id);
}
