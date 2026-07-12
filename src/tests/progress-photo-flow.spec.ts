import { expect, test } from '@playwright/test';
import type { ProgressPhotoCategory } from '../types/progressPhoto';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.removeItem('musclemap.photoLocalNotice.v1');
    await new Promise<void>((resolve) => { const request = indexedDB.deleteDatabase('musclemap-progress-photos-v1'); request.onsuccess = () => resolve(); request.onerror = () => resolve(); request.onblocked = () => resolve(); });
  });
});

test('empty photo card has no fake dates and saves one real local photo', async ({ page }) => {
  await page.goto('/growth');
  await page.getByRole('tab', { name: '身体变化' }).click();
  await expect(page.getByTestId('progress-photo-empty')).toBeVisible();
  await expect(page.getByText('4/12')).toHaveCount(0);
  await expect(page.getByRole('link', { name: '查看全部照片' })).toHaveCount(0);
  await page.getByRole('button', { name: '添加第一张照片' }).click();
  await expect(page.getByTestId('progress-photo-sheet')).toBeVisible();
  await page.getByRole('button', { name: '面部', exact: true }).click();
  await expect(page.getByLabel('拍照', { exact: true })).toBeAttached();
  await expect(page.getByLabel('从相册选择', { exact: true })).toBeAttached();
  await page.getByLabel('从相册选择', { exact: true }).setInputFiles(imageFile('face.svg'));
  await expect(page.getByRole('button', { name: '保存照片' })).toBeEnabled();
  await page.getByRole('button', { name: '保存照片' }).click();
  await expect(page.getByRole('dialog', { name: '照片保存说明' })).toBeVisible();
  await page.getByRole('button', { name: '知道了' }).click();
  await expect(page.getByRole('link', { name: '查看全部照片' })).toBeVisible();
  await expect(page.getByText('面部')).toBeVisible();
});

test('photo sheet keeps exactly one category and exposes capture guidance', async ({ page }) => {
  await page.goto('/growth');
  await page.getByRole('tab', { name: '身体变化' }).click();
  await page.getByRole('button', { name: '添加第一张照片' }).click();
  await page.getByRole('button', { name: '全身正面' }).click();
  await expect(page.getByRole('button', { name: '全身正面' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '面部', exact: true }).click();
  await expect(page.getByRole('button', { name: '全身正面' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: '面部', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('正脸、相同距离、自然表情')).toBeVisible();
  await expect(page.getByRole('button', { name: '二头', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '三头', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '背面', exact: true }).click();
  await expect(page.getByRole('button', { name: '三头', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '二头', exact: true })).toHaveCount(0);
});

test('gallery groups real dates and supports edit delete and comparison entry', async ({ page }) => {
  await seedPhotos(page, [
    { category: 'face', date: '2026-07-12', text: 'latest' },
    { category: 'face', date: '2026-06-15', text: 'earliest' },
    { category: 'chest', date: '2026-07-12', text: 'chest' }
  ]);
  await page.goto('/growth/photos');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await expect(page.getByRole('heading', { name: '2026年7月12日' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '2026年6月15日' })).toBeVisible();
  await page.getByRole('button', { name: '面部筛选' }).click();
  await expect(page.getByRole('button', { name: /查看面部照片/ })).toHaveCount(2);
  await expect(page.getByRole('link', { name: '对比面部变化' })).toBeVisible();

  await page.getByRole('button', { name: /查看面部照片/ }).first().click();
  await page.getByRole('button', { name: '编辑照片信息' }).click();
  await page.getByLabel('备注').fill('自然光');
  await page.getByRole('button', { name: '保存修改' }).click();
  await expect(page.getByText('自然光')).toBeVisible();
  await page.getByRole('button', { name: /查看面部照片/ }).first().click();
  await page.getByRole('button', { name: '删除照片' }).click();
  await page.getByRole('button', { name: '确认删除照片' }).click();
  await expect(page.getByRole('button', { name: /查看面部照片/ })).toHaveCount(1);
});

test('two photos in one category open a real earliest-latest comparison', async ({ page }) => {
  await seedPhotos(page, [{ category: 'biceps', date: '2026-05-01', text: 'old' }, { category: 'biceps', date: '2026-07-01', text: 'new' }]);
  await page.goto('/growth/photos/compare/biceps');
  await expect(page.getByRole('heading', { name: '二头对比变化' })).toBeVisible();
  await expect(page.getByText('2026年5月1日')).toBeVisible();
  await expect(page.getByText('2026年7月1日')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

function imageFile(name: string) {
  return { name, mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="160"><rect width="120" height="160" fill="green"/></svg>') };
}

async function seedPhotos(page: import('@playwright/test').Page, photos: Array<{ category: ProgressPhotoCategory; date: string; text: string }>) {
  await page.evaluate(async (values) => {
    const modulePath = '/src/repositories/progressPhotoRepository.ts';
    const { ProgressPhotoRepository } = await import(/* @vite-ignore */ modulePath) as typeof import('../repositories/progressPhotoRepository');
    const repository = new ProgressPhotoRepository(indexedDB);
    for (const value of values) await repository.save({ category: value.category, date: value.date, blob: new Blob([value.text], { type: 'image/jpeg' }) });
  }, photos);
}
