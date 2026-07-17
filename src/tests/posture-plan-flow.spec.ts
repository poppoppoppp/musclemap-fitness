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
  await expect(page.getByRole('button', { name: '开始初筛' })).toBeVisible();
});

test('completes safe screening and creates an active plan', async ({ page }) => {
  await page.goto('/growth/posture');
  await page.getByRole('button', { name: '开始初筛' }).click();
  await page.getByLabel('活动能力').check();
  await page.getByLabel('上半身体态').check();
  await page.getByRole('button', { name: '继续安全检查' }).click();
  await expect(page.getByRole('heading', { name: '非诊断式初筛' })).toBeFocused();
  await page.getByRole('button', { name: '继续训练条件' }).click();
  await page.getByLabel('墙面').check();
  await page.getByRole('button', { name: '继续基线记录' }).click();
  await page.getByRole('button', { name: '查看推荐' }).click();
  await expect(page.getByTestId('posture-recommendation')).toHaveCount(1);
  await page.getByLabel('计划周期').selectOption('2');
  await page.getByRole('button', { name: '创建改善计划' }).click();
  await expect(page.getByText('进行中的改善计划')).toBeVisible();
  await expect(page.getByText('2 周训练周期')).toBeVisible();
});

test('keeps the active plan usable without horizontal overflow at 320px and 390px', async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      const createdAt = new Date().toISOString();
      localStorage.setItem('musclemap.posturePlans.v1', JSON.stringify([{ id: 'mobile-plan', protocolId: 'UPPER_POSTURE_001', assessmentId: 'mobile-assessment', status: 'active', startDate: '2026-07-16', durationWeeks: 4, weeklyFrequency: 3, weekdays: [1, 3, 5], recommendationReasons: ['匹配上半身体态'], qualitySnapshot: { dataQuality: 'high', completeness: 'complete', sourceUrl: 'https://example.com' }, reassessmentIds: [], createdAt, updatedAt: createdAt }]));
    });
    await page.goto('/growth/posture');
    await expect(page.getByRole('button', { name: '暂停计划' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test('blocks recommendations when a safety risk is selected', async ({ page }) => {
  await page.goto('/growth/posture');
  await page.getByRole('button', { name: '开始初筛' }).click();
  await page.getByLabel('舒适度').check();
  await page.getByLabel('颈部与头部').check();
  await page.getByRole('button', { name: '继续安全检查' }).click();
  await page.getByLabel('麻木').check();
  await page.getByRole('button', { name: '继续训练条件' }).click();
  await page.getByRole('button', { name: '继续基线记录' }).click();
  await page.getByRole('button', { name: '查看推荐' }).click();
  await expect(page.getByRole('heading', { name: '建议先进行专业评估' })).toBeVisible();
  await expect(page.getByRole('button', { name: '创建改善计划' })).toHaveCount(0);
});

test('restores the saved screening step after reload', async ({ page }) => {
  await page.goto('/growth/posture');
  await page.getByRole('button', { name: '开始初筛' }).click();
  await page.getByLabel('活动能力').check();
  await page.getByLabel('上半身体态').check();
  await page.getByRole('button', { name: '继续安全检查' }).click();
  await page.reload();
  await expect(page.getByText('2 / 4')).toBeVisible();
  await expect(page.getByRole('group', { name: '安全检查' })).toBeVisible();
});
