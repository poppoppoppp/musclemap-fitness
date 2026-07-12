import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('stores photo metadata and Blob separately then lists newest dates first', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const modulePath = '/src/repositories/progressPhotoRepository.ts';
    const { ProgressPhotoRepository } = await import(/* @vite-ignore */ modulePath) as typeof import('../repositories/progressPhotoRepository');
    const repository = new ProgressPhotoRepository(indexedDB, `photos-${crypto.randomUUID()}`);
    const older = await repository.save({ category: 'face', date: '2026-06-01', blob: new Blob(['older'], { type: 'image/jpeg' }), width: 600, height: 800, orientation: 'portrait' });
    const newer = await repository.save({ category: 'chest', date: '2026-07-12', blob: new Blob(['newer'], { type: 'image/jpeg' }), note: 'same lighting', width: 1200, height: 900, orientation: 'landscape' });
    return { records: await repository.list(), olderText: await (await repository.getBlob(older.blobId))?.text(), newerId: newer.id };
  });
  expect(result.records.map(({ category }) => category)).toEqual(['chest', 'face']);
  expect(result.records[0]).toMatchObject({ date: '2026-07-12', note: 'same lighting', width: 1200, height: 900, orientation: 'landscape' });
  expect(result.olderText).toBe('older');
});

test('updates one category and deletes metadata with its Blob', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const modulePath = '/src/repositories/progressPhotoRepository.ts';
    const { ProgressPhotoRepository } = await import(/* @vite-ignore */ modulePath) as typeof import('../repositories/progressPhotoRepository');
    const repository = new ProgressPhotoRepository(indexedDB, `photos-${crypto.randomUUID()}`);
    const saved = await repository.save({ category: 'face', date: '2026-07-12', blob: new Blob(['photo']) });
    const updated = await repository.update(saved.id, { category: 'biceps', date: '2026-07-10', note: 'right arm' });
    const beforeDelete = await repository.getBlob(saved.blobId);
    const deleted = await repository.delete(saved.id);
    return { updated, hadBlob: Boolean(beforeDelete), deleted, records: await repository.list(), blobAfter: Boolean(await repository.getBlob(saved.blobId)) };
  });
  expect(result.updated).toMatchObject({ category: 'biceps', date: '2026-07-10', note: 'right arm' });
  expect(result).toMatchObject({ hadBlob: true, deleted: true, records: [], blobAfter: false });
});

test('rejects invalid dates and categories before writing', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const modulePath = '/src/repositories/progressPhotoRepository.ts';
    const { ProgressPhotoRepository } = await import(/* @vite-ignore */ modulePath) as typeof import('../repositories/progressPhotoRepository');
    const repository = new ProgressPhotoRepository(indexedDB, `photos-${crypto.randomUUID()}`);
    const invalidCategory = await repository.trySave({ category: 'not-real', date: '2026-07-12', blob: new Blob(['photo']) });
    const invalidDate = await repository.trySave({ category: 'face', date: 'bad-date', blob: new Blob(['photo']) });
    return { invalidCategory, invalidDate, count: (await repository.list()).length };
  });
  expect(result).toEqual({ invalidCategory: { ok: false, error: 'invalid-category' }, invalidDate: { ok: false, error: 'invalid-date' }, count: 0 });
});
