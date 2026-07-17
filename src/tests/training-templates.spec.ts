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

test('draft recovery keeps exercises when prescription input is incomplete', async ({ page }) => {
  await page.goto('/');

  const restored = await page.evaluate(async () => {
    const modulePath = '/src/utils/trainingTemplates.ts';
    const repository = await import(/* @vite-ignore */ modulePath) as typeof import('../utils/trainingTemplates');
    localStorage.setItem(repository.TRAINING_TEMPLATE_DRAFTS_STORAGE_KEY, JSON.stringify({
      new: {
        key: 'new',
        name: '未完成处方',
        focusTags: [],
        items: [{ id: 'item-1', exerciseId: 'pull-up', order: 0, sets: 0, repRange: '', restSeconds: -1 }],
        savedAt: '2026-07-16T08:00:00.000Z'
      }
    }));
    return repository.readTrainingTemplateDraft('new');
  });

  expect(restored?.items).toEqual([
    expect.objectContaining({ exerciseId: 'pull-up', sets: 1, repRange: '8-12', restSeconds: 0 })
  ]);
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

test('template editor reuses the exercise picker without posture mode', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/templates/new');

  await page.getByRole('button', { name: '+ 添加动作', exact: true }).click();

  await expect(page.getByRole('dialog', { name: '添加模板动作' })).toBeVisible();
  await expect(page.getByTestId('exercise-picker-search')).toBeVisible();
  await expect(page.getByTestId('open-2d-muscle-picker')).toBeVisible();
  await expect(page.getByTestId('open-posture-picker')).toHaveCount(0);
  await expect(page.getByText('搜索、筛选或从身体图中精确查找模板动作')).toBeVisible();
});

test('creates a usable template with editable exercise prescription', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem('musclemap.trainingTemplates.v1');
    localStorage.removeItem('musclemap.trainingTemplateDrafts.v1');
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/templates/new');

  await page.getByPlaceholder('请输入模板名称').fill('背部增肌');
  await page.getByRole('button', { name: '保存模板', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('请至少添加一个动作');

  await page.getByRole('button', { name: '+ 添加动作', exact: true }).click();
  await page.getByTestId('exercise-picker-search').fill('高位下拉');
  await page.getByTestId('add-exercise-lat-pulldown').click();

  const row = page.getByTestId('template-item-lat-pulldown');
  await expect(row).toBeVisible();
  await expect(row.getByRole('heading', { name: '高位下拉' })).toBeVisible();
  await expect(row.getByLabel('高位下拉组数')).toHaveValue('3');
  await expect(row.getByLabel('高位下拉次数范围')).toHaveValue('8-12');
  await expect(row.getByLabel('高位下拉休息秒数')).toHaveValue('90');

  await row.getByLabel('高位下拉组数').fill('4');
  await row.getByLabel('高位下拉次数范围').fill('6-10');
  await row.getByLabel('高位下拉休息秒数').fill('120');
  await row.getByLabel('高位下拉备注').fill('控制离心');
  await page.getByRole('button', { name: '保存模板', exact: true }).click();

  await expect(page).toHaveURL(/\/plan-builder$/);
  await expect(page.getByRole('status')).toHaveText('模板已保存');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('musclemap.trainingTemplates.v1') ?? '[]'));
  expect(stored).toHaveLength(1);
  expect(stored[0]).toMatchObject({
    name: '背部增肌',
    items: [{ exerciseId: 'lat-pulldown', order: 0, sets: 4, repRange: '6-10', restSeconds: 120, note: '控制离心' }]
  });
});

test('restores a new template draft after refresh and clears it after save', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.removeItem('musclemap.trainingTemplates.v1');
    localStorage.removeItem('musclemap.trainingTemplateDrafts.v1');
  });
  await page.goto('/templates/new');

  await page.getByPlaceholder('请输入模板名称').fill('可恢复草稿');
  await page.getByRole('button', { name: '背部', exact: true }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('musclemap.trainingTemplateDrafts.v1'))).toContain('可恢复草稿');

  await page.reload();
  await expect(page.getByPlaceholder('请输入模板名称')).toHaveValue('可恢复草稿');
  await expect(page.getByRole('button', { name: '背部', exact: true })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: '+ 添加动作', exact: true }).click();
  await page.getByTestId('exercise-picker-search').fill('引体向上');
  await page.getByTestId('add-exercise-pull-up').click();
  await page.getByRole('button', { name: '保存模板', exact: true }).click();

  await expect(page).toHaveURL(/\/plan-builder$/);
  const drafts = await page.evaluate(() => JSON.parse(localStorage.getItem('musclemap.trainingTemplateDrafts.v1') ?? '{}'));
  expect(drafts.new).toBeUndefined();
});

test('edits an existing template and persists prescription changes', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('musclemap.trainingTemplates.v1', JSON.stringify([{
      id: 'template-1',
      name: '旧模板',
      focusTags: ['背部'],
      items: [{ id: 'item-1', exerciseId: 'lat-pulldown', order: 0, sets: 3, repRange: '8-12', restSeconds: 90 }],
      createdAt: '2026-07-16T00:00:00.000Z',
      updatedAt: '2026-07-16T00:00:00.000Z'
    }]));
    localStorage.removeItem('musclemap.trainingTemplateDrafts.v1');
  });
  await page.goto('/templates/template-1/edit');

  await expect(page.getByRole('heading', { name: '编辑模板' })).toBeVisible();
  await expect(page.getByPlaceholder('请输入模板名称')).toHaveValue('旧模板');
  const row = page.getByTestId('template-item-lat-pulldown');
  await expect(row).toBeVisible();
  await page.getByPlaceholder('请输入模板名称').fill('新模板');
  await row.getByLabel('高位下拉组数').fill('5');
  await page.getByRole('button', { name: '保存模板', exact: true }).click();

  await expect(page).toHaveURL(/\/plan-builder$/);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('musclemap.trainingTemplates.v1') ?? '[]'));
  expect(stored).toHaveLength(1);
  expect(stored[0]).toMatchObject({ id: 'template-1', name: '新模板', items: [{ sets: 5 }] });
  expect(stored[0].updatedAt).not.toBe('2026-07-16T00:00:00.000Z');
});

test('reorders and removes template exercises', async ({ page }) => {
  await page.goto('/templates/new');

  await page.getByRole('button', { name: '+ 添加动作', exact: true }).click();
  await page.getByTestId('exercise-picker-search').fill('高位下拉');
  await page.getByTestId('add-exercise-lat-pulldown').click();
  await page.getByRole('button', { name: '+ 添加动作', exact: true }).click();
  await page.getByTestId('exercise-picker-search').fill('引体向上');
  await page.getByTestId('add-exercise-pull-up').click();

  await page.getByRole('button', { name: '上移 引体向上' }).click();
  const rows = page.locator('[data-testid^="template-item-"]');
  await expect(rows.nth(0)).toHaveAttribute('data-testid', 'template-item-pull-up');
  await expect(rows.nth(1)).toHaveAttribute('data-testid', 'template-item-lat-pulldown');

  await page.getByRole('button', { name: '删除 高位下拉' }).click();
  await expect(page.getByTestId('template-item-lat-pulldown')).toHaveCount(0);
  await expect(page.getByTestId('template-item-pull-up')).toBeVisible();
});

test('blocks invalid template prescription values before save', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('musclemap.trainingTemplates.v1', JSON.stringify([{
    id: 'template-1',
    name: '背部训练',
    focusTags: ['背部'],
    items: [{ id: 'item-1', exerciseId: 'lat-pulldown', order: 0, sets: 3, repRange: '8-12', restSeconds: 90 }],
    createdAt: '2026-07-16T00:00:00.000Z',
    updatedAt: '2026-07-16T00:00:00.000Z'
  }])));
  await page.goto('/templates/template-1/edit');
  const row = page.getByTestId('template-item-lat-pulldown');

  await row.getByLabel('高位下拉组数').fill('0');
  await page.getByRole('button', { name: '保存模板', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('每个动作至少需要 1 组');

  await row.getByLabel('高位下拉组数').fill('3');
  await row.getByLabel('高位下拉次数范围').fill('');
  await page.getByRole('button', { name: '保存模板', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('请填写每个动作的次数范围');

  await row.getByLabel('高位下拉次数范围').fill('8-12');
  await row.getByLabel('高位下拉休息秒数').fill('-1');
  await page.getByRole('button', { name: '保存模板', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('休息时间不能小于 0 秒');
  await expect(page).toHaveURL(/\/templates\/template-1\/edit$/);
});

test('shows a safe state when an edit template is missing', async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('musclemap.trainingTemplates.v1'));
  await page.goto('/templates/missing/edit');

  await expect(page.getByRole('heading', { name: '找不到训练模板' })).toBeVisible();
  await expect(page.getByRole('link', { name: '返回训练模板' })).toHaveAttribute('href', '/plan-builder');
});

test('template list shows prescription metadata and supports duplicate and confirmed delete', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('musclemap.trainingTemplates.v1', JSON.stringify([{
      id: 'template-1',
      name: '背部训练',
      focusTags: ['背部', '手臂'],
      items: [
        { id: 'item-1', exerciseId: 'lat-pulldown', order: 0, sets: 3, repRange: '8-12', restSeconds: 90 },
        { id: 'item-2', exerciseId: 'pull-up', order: 1, sets: 4, repRange: '6-8', restSeconds: 120 }
      ],
      createdAt: '2026-07-14T00:00:00.000Z',
      updatedAt: '2026-07-14T00:00:00.000Z',
      lastUsedAt: '2026-07-15T08:00:00.000Z'
    }]));
  });
  await page.goto('/plan-builder');

  const card = page.getByTestId('training-template-template-1');
  await expect(card).toContainText('2 个动作 · 7 组');
  await expect(card).toContainText('上次使用 2026-07-15');
  await expect(card).toContainText('背部');
  await expect(card).toContainText('手臂');
  await expect(card.getByRole('button', { name: '开始 背部训练' })).toBeVisible();
  await expect(card.getByRole('link', { name: '编辑 背部训练' })).toHaveAttribute('href', '/templates/template-1/edit');

  await card.getByRole('button', { name: '复制 背部训练' }).click();
  const copyCard = page.getByRole('article', { name: '背部训练 副本' });
  await expect(copyCard).toBeVisible();
  const copiedId = await copyCard.getAttribute('data-template-id');
  expect(copiedId).toBeTruthy();
  expect(copiedId).not.toBe('template-1');

  await copyCard.getByRole('button', { name: '删除 背部训练 副本' }).click();
  await expect(copyCard.getByRole('button', { name: '确认删除 背部训练 副本' })).toBeVisible();
  await copyCard.getByRole('button', { name: '确认删除 背部训练 副本' }).click();
  await expect(page.getByRole('article', { name: '背部训练 副本' })).toHaveCount(0);

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('musclemap.trainingTemplates.v1') ?? '[]'));
  expect(stored).toHaveLength(1);
  expect(stored[0].id).toBe('template-1');
});

test('starts a template workout and records template usage when no workout is active', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem('musclemap.activeWorkout.v0.7');
    localStorage.setItem('musclemap.trainingTemplates.v1', JSON.stringify([{
      id: 'template-1',
      name: '背部训练',
      focusTags: ['背部'],
      items: [{ id: 'item-1', exerciseId: 'lat-pulldown', order: 0, sets: 3, repRange: '8-12', restSeconds: 90, note: '控制离心' }],
      createdAt: '2026-07-14T00:00:00.000Z',
      updatedAt: '2026-07-14T00:00:00.000Z'
    }]));
  });
  await page.goto('/plan-builder');

  await page.getByRole('button', { name: '开始 背部训练' }).click();

  await expect(page).toHaveURL(/\/workout-log$/);
  await expect(page.getByRole('link', { name: '高位下拉', exact: true })).toBeVisible();
  await page.getByText('查看计划建议').click();
  await expect(page.getByText('3 组 · 8-12 次 · 休息 90 秒 · 控制离心')).toBeVisible();

  const state = await page.evaluate(() => ({
    workout: JSON.parse(localStorage.getItem('musclemap.activeWorkout.v0.7') ?? 'null'),
    templates: JSON.parse(localStorage.getItem('musclemap.trainingTemplates.v1') ?? '[]')
  }));
  expect(state.workout).toMatchObject({ source: 'template', templateId: 'template-1' });
  expect(state.workout.exercises).toHaveLength(1);
  expect(state.templates[0].lastUsedAt).toEqual(expect.any(String));
});

test('preserves an existing active workout when starting a template', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('musclemap.trainingTemplates.v1', JSON.stringify([{
      id: 'template-1',
      name: '背部训练',
      focusTags: ['背部'],
      items: [{ id: 'item-1', exerciseId: 'lat-pulldown', order: 0, sets: 3, repRange: '8-12', restSeconds: 90 }],
      createdAt: '2026-07-14T00:00:00.000Z',
      updatedAt: '2026-07-14T00:00:00.000Z'
    }]));
    localStorage.setItem('musclemap.activeWorkout.v0.7', JSON.stringify({
      id: 'existing-workout',
      status: 'active',
      startedAt: '2026-07-17T01:00:00.000Z',
      trainingDate: '2026-07-17',
      source: 'manual',
      exercises: [{
        id: 'existing-exercise',
        exerciseId: 'push-up',
        order: 0,
        source: 'manual',
        sets: [{ id: 'existing-set', setIndex: 1, reps: 12 }]
      }],
      createdAt: '2026-07-17T01:00:00.000Z',
      updatedAt: '2026-07-17T01:00:00.000Z'
    }));
  });
  await page.goto('/plan-builder');

  await page.getByRole('button', { name: '开始 背部训练' }).click();

  await expect(page).toHaveURL(/\/workout-log$/);
  await expect(page.getByRole('link', { name: '俯卧撑', exact: true })).toBeVisible();
  const state = await page.evaluate(() => ({
    workout: JSON.parse(localStorage.getItem('musclemap.activeWorkout.v0.7') ?? 'null'),
    templates: JSON.parse(localStorage.getItem('musclemap.trainingTemplates.v1') ?? '[]')
  }));
  expect(state.workout).toMatchObject({ id: 'existing-workout', exercises: [{ exerciseId: 'push-up' }] });
  expect(state.templates[0].lastUsedAt).toBeUndefined();
});
