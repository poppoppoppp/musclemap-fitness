import { expect, test } from '@playwright/test';
import type { TrainingTemplate } from '../types/trainingTemplate';
import { createActiveWorkoutFromTemplate } from '../utils/activeWorkout';
import { normalizeTrainingTemplates } from '../utils/trainingTemplates';

const templateFixture: TrainingTemplate = {
  id: 'template-1',
  name: '背部训练',
  focusTags: ['背部'],
  items: [
    {
      id: 'item-1',
      exerciseId: 'lat-pulldown',
      order: 0,
      sets: 3,
      repRange: '8-12',
      restSeconds: 90,
      note: '控制离心'
    }
  ],
  createdAt: '2026-07-16T00:00:00.000Z',
  updatedAt: '2026-07-16T00:00:00.000Z'
};

test('creates an active workout from template prescription', () => {
  const workout = createActiveWorkoutFromTemplate(templateFixture, new Date('2026-07-16T08:00:00.000Z'));

  expect(workout.source).toBe('template');
  expect(workout.templateId).toBe(templateFixture.id);
  expect(workout.exercises).toHaveLength(1);
  expect(workout.exercises[0]).toMatchObject({
    exerciseId: 'lat-pulldown',
    order: 0,
    source: 'template',
    planned: { sets: 3, repRange: '8-12', restSeconds: 90, note: '控制离心' }
  });
  expect(workout.exercises[0].sets).toHaveLength(3);
});

test('normalizes valid templates and drops unsafe records', () => {
  const result = normalizeTrainingTemplates([
    {
      id: 'template-1',
      name: ' 背部训练 ',
      focusTags: ['背部'],
      items: [
        {
          id: 'item-1',
          exerciseId: 'lat-pulldown',
          order: 7,
          sets: 3,
          repRange: '8-12',
          restSeconds: 90
        }
      ],
      createdAt: '2026-07-16T00:00:00.000Z',
      updatedAt: '2026-07-16T00:00:00.000Z'
    },
    { id: '', name: '', items: 'broken' }
  ]);

  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({
    name: '背部训练',
    items: [{ order: 0, sets: 3, repRange: '8-12', restSeconds: 90 }]
  });
});

test('drops unknown and duplicate exercises while keeping safe prescription values', () => {
  const result = normalizeTrainingTemplates([
    {
      id: 'template-1',
      name: '背部训练',
      focusTags: ['背部', 42, ''],
      items: [
        { id: 'item-1', exerciseId: 'lat-pulldown', order: 0, sets: 3, repRange: '8-12', restSeconds: 90 },
        { id: 'item-2', exerciseId: 'lat-pulldown', order: 1, sets: 4, repRange: '6-8', restSeconds: 120 },
        { id: 'item-3', exerciseId: 'missing-exercise', order: 2, sets: 3, repRange: '8-12', restSeconds: 90 },
        { id: 'item-4', exerciseId: 'pull-up', order: 3, sets: 0, repRange: '', restSeconds: -1 }
      ],
      createdAt: '2026-07-16T00:00:00.000Z',
      updatedAt: '2026-07-16T00:00:00.000Z'
    }
  ]);

  expect(result[0].focusTags).toEqual(['背部']);
  expect(result[0].items).toEqual([
    expect.objectContaining({ id: 'item-1', exerciseId: 'lat-pulldown', order: 0 })
  ]);
});

test('repository creates updates duplicates marks used and deletes templates', async ({ page }) => {
  await page.goto('/');

  const result = await page.evaluate(async () => {
    const modulePath = '/src/utils/trainingTemplates.ts';
    const repository = await import(/* @vite-ignore */ modulePath) as typeof import('../utils/trainingTemplates');
    localStorage.removeItem(repository.TRAINING_TEMPLATES_STORAGE_KEY);

    const created = repository.createTrainingTemplate({
      name: ' 背部 A ',
      focusTags: ['背部'],
      items: [
        { id: 'item-1', exerciseId: 'lat-pulldown', order: 0, sets: 3, repRange: '8-12', restSeconds: 90 }
      ]
    });
    if (!created.ok) throw new Error(`create failed: ${created.error}`);

    const updated = repository.updateTrainingTemplate(created.template.id, {
      name: '背部 B',
      focusTags: ['背部', '手臂'],
      items: created.template.items
    });
    if (!updated.ok) throw new Error(`update failed: ${updated.error}`);

    const duplicated = repository.duplicateTrainingTemplate(created.template.id);
    if (!duplicated.ok) throw new Error(`duplicate failed: ${duplicated.error}`);

    const used = repository.markTrainingTemplateUsed(created.template.id, '2026-07-16T08:00:00.000Z');
    const removed = repository.deleteTrainingTemplate(duplicated.template.id);

    return {
      createdName: created.template.name,
      updated: repository.getTrainingTemplate(created.template.id),
      duplicate: duplicated.template,
      used,
      removed,
      templates: repository.readTrainingTemplates()
    };
  });

  expect(result.createdName).toBe('背部 A');
  expect(result.updated).toMatchObject({ name: '背部 B', focusTags: ['背部', '手臂'], lastUsedAt: '2026-07-16T08:00:00.000Z' });
  expect(result.duplicate).toMatchObject({ name: '背部 B 副本' });
  expect(result.duplicate.id).not.toBe(result.updated?.id);
  expect(result.removed).toEqual({ ok: true });
  expect(result.templates).toHaveLength(1);
});

test('repository restores and clears one editor draft', async ({ page }) => {
  await page.goto('/');

  const result = await page.evaluate(async () => {
    const modulePath = '/src/utils/trainingTemplates.ts';
    const repository = await import(/* @vite-ignore */ modulePath) as typeof import('../utils/trainingTemplates');
    localStorage.removeItem(repository.TRAINING_TEMPLATE_DRAFTS_STORAGE_KEY);
    const draft = {
      key: 'new',
      name: '草稿模板',
      focusTags: ['背部'],
      items: [{ id: 'item-1', exerciseId: 'pull-up', order: 0, sets: 3, repRange: '6-8', restSeconds: 120 }],
      savedAt: '2026-07-16T08:00:00.000Z'
    };

    const written = repository.writeTrainingTemplateDraft(draft);
    const restored = repository.readTrainingTemplateDraft('new');
    const cleared = repository.clearTrainingTemplateDraft('new');
    const afterClear = repository.readTrainingTemplateDraft('new');
    return { written, restored, cleared, afterClear };
  });

  expect(result.written).toEqual({ ok: true });
  expect(result.restored).toMatchObject({ name: '草稿模板', items: [{ exerciseId: 'pull-up', sets: 3 }] });
  expect(result.cleared).toEqual({ ok: true });
  expect(result.afterClear).toBeNull();
});

test('repository restores a draft before the user has entered a name', async ({ page }) => {
  await page.goto('/');

  const restored = await page.evaluate(async () => {
    const modulePath = '/src/utils/trainingTemplates.ts';
    const repository = await import(/* @vite-ignore */ modulePath) as typeof import('../utils/trainingTemplates');
    localStorage.setItem(repository.TRAINING_TEMPLATE_DRAFTS_STORAGE_KEY, JSON.stringify({
      new: {
        key: 'new',
        name: '',
        focusTags: ['背部'],
        items: [{ id: 'item-1', exerciseId: 'pull-up', order: 0, sets: 3, repRange: '6-8', restSeconds: 120 }],
        savedAt: '2026-07-16T08:00:00.000Z'
      }
    }));
    return repository.readTrainingTemplateDraft('new');
  });

  expect(restored).toMatchObject({ name: '', focusTags: ['背部'], items: [{ exerciseId: 'pull-up' }] });
});

test('repository reports storage failures without erasing existing templates', async ({ page }) => {
  await page.goto('/');

  const result = await page.evaluate(async () => {
    const modulePath = '/src/utils/trainingTemplates.ts';
    const repository = await import(/* @vite-ignore */ modulePath) as typeof import('../utils/trainingTemplates');
    localStorage.setItem(repository.TRAINING_TEMPLATES_STORAGE_KEY, JSON.stringify([]));
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new DOMException('quota', 'QuotaExceededError'); };
    try {
      return repository.createTrainingTemplate({
        name: '无法写入',
        focusTags: [],
        items: [{ id: 'item-1', exerciseId: 'pull-up', order: 0, sets: 3, repRange: '6-8', restSeconds: 120 }]
      });
    } finally {
      Storage.prototype.setItem = originalSetItem;
    }
  });

  expect(result).toEqual({ ok: false, error: 'storage' });
  await expect.poll(() => page.evaluate(() => localStorage.getItem('musclemap.trainingTemplates.v1'))).toBe('[]');
});

test('repository safely falls back when local storage cannot be read', async ({ page }) => {
  await page.goto('/');

  const result = await page.evaluate(async () => {
    const modulePath = '/src/utils/trainingTemplates.ts';
    const repository = await import(/* @vite-ignore */ modulePath) as typeof import('../utils/trainingTemplates');
    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = () => { throw new DOMException('denied', 'SecurityError'); };
    try {
      return {
        templates: repository.readTrainingTemplates(),
        draft: repository.readTrainingTemplateDraft('new')
      };
    } finally {
      Storage.prototype.getItem = originalGetItem;
    }
  });

  expect(result).toEqual({ templates: [], draft: null });
});
