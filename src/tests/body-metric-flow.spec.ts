import { expect, test } from '@playwright/test';

const BODY_KEY = 'musclemap.bodySnapshots.v0.1';

test.beforeEach(async ({ page }) => {
  await page.addInitScript((key) => localStorage.removeItem(key), BODY_KEY);
  await page.setViewportSize({ width: 390, height: 844 });
});

test('body sheet expands on keyboard focus and keeps its enabled save action inside the 390x844 viewport', async ({ page }) => {
  await page.goto('/growth');
  await page.getByRole('tab', { name: '身体变化' }).click();
  await expect(page.getByTestId('body-metric-empty')).toBeVisible();
  await expect(page.getByText('72.3')).toHaveCount(0);
  await expect(page.getByRole('link', { name: '查看记录' })).toHaveCount(0);

  await page.getByRole('button', { name: '记录第一条数据' }).click();
  const sheet = page.getByTestId('body-metric-sheet');
  await expect(sheet).toBeVisible();
  await expect(page.getByRole('button', { name: '保存记录' })).toBeDisabled();
  await page.getByLabel('体重').fill('72.3');
  await expect(sheet).toHaveAttribute('data-snap', 'expanded');
  await expect(page.getByRole('button', { name: '保存记录' })).toBeEnabled();
  const saveBox = await page.getByRole('button', { name: '保存记录' }).boundingBox();
  expect(saveBox).not.toBeNull();
  expect(saveBox!.y + saveBox!.height).toBeLessThanOrEqual(844);
  await page.getByRole('button', { name: '保存记录' }).click();

  await expect(sheet).toHaveCount(0);
  await expect(page.getByText('72.3')).toBeVisible();
  await expect(page.getByRole('link', { name: '查看记录' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

test('reopening the same date merges measurements instead of creating a duplicate', async ({ page }) => {
  await page.goto('/growth');
  await page.getByRole('tab', { name: '身体变化' }).click();
  await page.getByRole('button', { name: '记录第一条数据' }).click();
  await page.getByLabel('体重').fill('72.3');
  await page.getByRole('button', { name: '保存记录' }).click();
  await page.getByRole('button', { name: '＋ 记录数据' }).click();
  await expect(page.getByText('今天已有记录，可继续补充或修改。')).toBeVisible();
  await expect(page.getByLabel('体重')).toHaveValue('72.3');
  await page.getByLabel('腰围').fill('78.5');
  await page.getByRole('button', { name: '保存记录' }).click();
  const records = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '[]'), BODY_KEY);
  expect(records).toHaveLength(1);
  expect(records[0]).toMatchObject({ weightKg: 72.3, waistCm: 78.5 });
});

test('body history groups months and supports editing and confirmed deletion', async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, JSON.stringify([
    { id: 'july', date: '2026-07-12', weightKg: 72.3, createdAt: '2026-07-12T08:00:00.000Z', updatedAt: '2026-07-12T08:00:00.000Z' },
    { id: 'june', date: '2026-06-28', waistCm: 79, createdAt: '2026-06-28T08:00:00.000Z', updatedAt: '2026-06-28T08:00:00.000Z' }
  ])), BODY_KEY);
  await page.goto('/growth/body-records');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await expect(page.getByRole('heading', { name: '2026年7月' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '2026年6月' })).toBeVisible();
  await page.getByRole('button', { name: '打开 7月12日记录操作' }).click();
  await page.getByRole('button', { name: '编辑记录' }).click();
  await page.getByLabel('臂围').fill('35.2');
  await page.getByRole('button', { name: '保存记录' }).click();
  await expect(page.getByText('臂围 35.2 cm')).toBeVisible();

  await page.getByRole('button', { name: '打开 7月12日记录操作' }).click();
  await page.getByRole('button', { name: '删除记录' }).click();
  await expect(page.getByRole('dialog', { name: '删除身体记录' })).toBeVisible();
  await page.getByRole('button', { name: '确认删除记录' }).click();
  await expect(page.getByText('7月12日')).toHaveCount(0);
});

test('dirty sheet asks before backdrop close and drag handle expands it', async ({ page }) => {
  await page.goto('/growth');
  await page.getByRole('tab', { name: '身体变化' }).click();
  await page.getByRole('button', { name: '记录第一条数据' }).click();
  const handle = page.getByTestId('sheet-drag-handle');
  const box = await handle.boundingBox();
  if (!box) throw new Error('missing drag handle');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y - 220, { steps: 4 });
  await page.mouse.up();
  await expect(page.getByTestId('body-metric-sheet')).toHaveAttribute('data-snap', 'expanded');
  await page.getByLabel('体重').fill('70');
  await page.getByTestId('snap-sheet-backdrop').click({ position: { x: 10, y: 10 } });
  await expect(page.getByRole('dialog', { name: '放弃本次修改' })).toBeVisible();
  await page.getByRole('button', { name: '继续修改' }).click();
  await expect(page.getByTestId('body-metric-sheet')).toBeVisible();
});
