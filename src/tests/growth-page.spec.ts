import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('musclemap.workoutLogs.v0.3');
    window.localStorage.removeItem('musclemap.bodySnapshots.v0.1');
  });
});

test('adds growth as the third destination in the four-item bottom navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/growth');

  const navigation = page.getByRole('navigation');
  await expect(navigation.getByRole('link')).toHaveCount(4);
  await expect(navigation.getByRole('link', { name: '首页', exact: true })).toHaveAttribute('href', '/');
  await expect(navigation.getByRole('link', { name: '记录', exact: true })).toHaveAttribute('href', '/workout-log');
  await expect(navigation.getByRole('link', { name: '成长', exact: true })).toHaveAttribute('href', '/growth');
  await expect(navigation.getByRole('link', { name: '成长', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(navigation.getByRole('link', { name: '我的', exact: true })).toHaveAttribute('href', '/data-management');
});

test('opens the growth page in training mode and supports the planned controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/growth');

  await expect(page.getByRole('heading', { name: '成长', exact: true })).toBeVisible();
  await expect(page.getByText('记录变化，见证更强的自己')).toBeVisible();
  await expect(page.getByRole('tab', { name: '训练成长' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: '近3个月' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: '成长概览' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '力量趋势' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '训练分布' })).toBeVisible();
  await expect(page.getByTestId('growth-overview-card')).not.toContainText('刷新纪录');
  await page.getByLabel('选择动作').selectOption('squat');
  await expect(page.getByText('120kg')).toBeVisible();

  await page.getByRole('tab', { name: '身体变化' }).click();
  await expect(page.getByRole('tab', { name: '身体变化' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: '身体数据' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '进度照片' })).toBeVisible();
  await expect(page.getByText('成长回放（即将上线）')).toBeVisible();
  await expect(page.getByText('体脂率')).toHaveCount(0);
  await expect(page.getByText('肌肉量')).toHaveCount(0);

  await page.getByRole('button', { name: '腰围' }).click();
  await expect(page.getByRole('button', { name: '腰围' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '近4周' }).click();
  await expect(page.getByRole('button', { name: '近4周' })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});
