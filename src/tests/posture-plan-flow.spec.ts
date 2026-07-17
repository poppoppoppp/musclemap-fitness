import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
});

test('opens posture improvement from Growth without adding a bottom navigation item', async ({ page }) => {
  await page.goto('/growth');
  await page.getByRole('tab', { name: '体态改善' }).click();
  await expect(page).toHaveURL('/growth/posture');
  await expect(page.getByRole('heading', { name: '体态改善计划' })).toBeVisible();
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('nav').last().getByRole('link')).toHaveCount(4);
  await expect(page.getByRole('link', { name: '开始体态筛查' })).toHaveAttribute('href', '/growth/posture/screening');
});

test('keeps the active plan usable without horizontal overflow at 320px and 390px', async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await seedActivePlan(page, 'mobile-plan');
    await page.goto('/growth/posture');
    await expect(page.getByRole('button', { name: '暂停计划' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test('keeps legacy assessment data readable but does not reopen the retired recommendation form', async ({ page }) => {
  const legacyDraft = { step: 2, goals: ['mobility'], regions: ['upper_posture'], riskFlags: [], equipment: ['bodyweight'], sessionMinutes: 20, weeklyFrequency: 3, discomfort: 4, functionScore: 6 };
  await page.evaluate((value) => localStorage.setItem('musclemap.postureAssessmentDraft.v1', JSON.stringify(value)), legacyDraft);
  await page.goto('/growth/posture');

  await expect(page.getByRole('link', { name: '开始体态筛查' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '非诊断式初筛' })).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('musclemap.postureAssessmentDraft.v1') ?? 'null'))).toEqual(legacyDraft);
});

async function seedActivePlan(page: import('@playwright/test').Page, id: string) {
  await page.evaluate((planId) => {
    localStorage.clear();
    const createdAt = new Date().toISOString();
    localStorage.setItem('musclemap.posturePlans.v1', JSON.stringify([{ id: planId, protocolId: 'UPPER_POSTURE_001', assessmentId: 'mobile-assessment', status: 'active', startDate: '2026-07-16', durationWeeks: 4, weeklyFrequency: 3, weekdays: [1, 3, 5], recommendationReasons: ['匹配上半身体态'], qualitySnapshot: { dataQuality: 'high', completeness: 'complete', sourceUrl: 'https://example.com' }, reassessmentIds: [], createdAt, updatedAt: createdAt }]));
  }, id);
}
