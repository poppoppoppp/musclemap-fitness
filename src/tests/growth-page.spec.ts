import { expect, test } from '@playwright/test';

const LOG_KEY = 'musclemap.workoutLogs.v0.3';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.evaluate(() => { localStorage.removeItem('musclemap.workoutLogs.v0.3'); localStorage.removeItem('musclemap.bodySnapshots.v0.1'); });
});

test('adds growth as the third destination in the four-item bottom navigation', async ({ page }) => {
  await page.goto('/growth');
  const navigation = page.getByRole('navigation');
  await expect(navigation.getByRole('link')).toHaveCount(4);
  await expect(navigation.getByRole('link', { name: '成长', exact: true })).toHaveAttribute('href', '/growth');
  await expect(navigation.getByRole('link', { name: '成长', exact: true })).toHaveAttribute('aria-current', 'page');
});

test('production growth page shows real empty states without prototype values', async ({ page }) => {
  await page.goto('/growth');
  await expect(page.getByTestId('growth-overview-card')).toContainText('暂无训练记录');
  await expect(page.getByText('92.5')).toHaveCount(0);
  await expect(page.getByText('本周期刷新')).toHaveCount(0);
  await expect(page.getByLabel('选择动作')).toHaveCount(0);
  await expect(page.getByText('暂无力量记录')).toBeVisible();
});

test('real actions populate the selector and range changes recalculate every training module', async ({ page }) => {
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: LOG_KEY, value: [
    workout('latest-row', '2026-07-10', 'seated-row', [{ weight: 45, reps: 10 }, { weight: 50, reps: 8 }]),
    workout('older-bench', '2026-06-01', 'barbell-bench-press', [{ weight: 70, reps: 6 }])
  ] });
  await page.goto('/growth');
  const selector = page.getByLabel('选择动作');
  await expect(selector.locator('option')).toHaveText(['坐姿划船', '杠铃卧推']);
  await expect(selector.locator('option', { hasText: '硬拉' })).toHaveCount(0);
  await expect(page.getByTestId('strength-current-value')).toContainText('50 kg');
  await selector.selectOption('barbell-bench-press');
  await expect(page.getByTestId('strength-current-value')).toContainText('70 kg');

  await page.getByRole('button', { name: '近4周' }).click();
  await expect(page.getByTestId('overview-completed-workouts')).toHaveText('1次');
  await expect(selector.locator('option')).toHaveText(['坐姿划船']);
  await expect(page.getByLabel('背部 2组')).toBeVisible();

  await page.getByRole('button', { name: '全部' }).click();
  await expect(page.getByTestId('overview-period-comparison')).toHaveCount(0);
  await expect(page.getByTestId('overview-completed-workouts')).toHaveText('2次');
});

test('training distribution details and replay explanation are functional', async ({ page }) => {
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: LOG_KEY, value: [workout('row', '2026-07-10', 'seated-row', [{ weight: 45, reps: 10 }, { weight: 50, reps: 8 }])] });
  await page.goto('/growth');
  await page.getByRole('button', { name: '查看训练分布详情' }).click();
  await expect(page.getByRole('dialog', { name: '训练分布详情' })).toContainText('坐姿划船');
  await expect(page.getByRole('dialog', { name: '训练分布详情' })).toContainText('2组');
  await page.getByRole('button', { name: '关闭训练分布详情' }).click();
  await page.getByRole('tab', { name: '身体变化' }).click();
  await page.getByRole('button', { name: '了解成长回放' }).click();
  await expect(page.getByRole('dialog', { name: '成长回放即将上线' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

function workout(id: string, date: string, exerciseId: string, values: Array<{ weight?: number; reps?: number }>) {
  return { id, date, createdAt: `${date}T08:00:00.000Z`, exercises: [{ id: `${id}-exercise`, exerciseId, order: 0, sets: values.map((value, index) => ({ id: `${id}-${index}`, setIndex: index + 1, completed: true, ...value })) }] };
}
