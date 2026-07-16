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
