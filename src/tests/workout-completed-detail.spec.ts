import { expect, test, type Page } from '@playwright/test';

const ACTIVE_WORKOUT_KEY = 'musclemap.activeWorkout.v0.7';
const WORKOUT_LOGS_KEY = 'musclemap.workoutLogs.v0.3';
const LATEST_WORKOUT_LOG_KEY = 'musclemap.latestWorkoutLog.v0.3';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ keys }) => keys.forEach((key) => window.localStorage.removeItem(key)), {
    keys: [ACTIVE_WORKOUT_KEY, WORKOUT_LOGS_KEY, LATEST_WORKOUT_LOG_KEY]
  });
});

test('archives to the existing detail route and shows only the transient completed notice', async ({ page }) => {
  const startedAt = new Date(Date.now() - 15 * 60_000).toISOString();
  await page.addInitScript(({ key, workout }) => window.localStorage.setItem(key, JSON.stringify(workout)), {
    key: ACTIVE_WORKOUT_KEY,
    workout: {
      id: 'active-to-complete', status: 'active', startedAt, trainingDate: '2026-07-11', source: 'manual',
      exercises: [{ id: 'active-bench', exerciseId: 'barbell-bench-press', order: 0, source: 'manual', startedAt, sets: [{ id: 'active-set', setIndex: 1, weight: 60, reps: 8, completed: false }] }],
      createdAt: startedAt, updatedAt: startedAt
    }
  });

  await page.goto('/workout-log');
  await page.getByTestId('end-active-workout').click();

  await expect(page).toHaveURL(/\/workout-history\/workout-log-/);
  await expect(page.getByTestId('workout-completed-notice')).toContainText('训练已完成');
  await expect(page.getByTestId('workout-completed-notice')).toContainText('本次训练已保存');
  await expect(page.getByTestId('workout-log-detail')).not.toContainText('总训练容量');
  await expect(page.getByTestId('workout-detail-valid-sets')).toContainText('1');
  await expect(page.getByTestId('workout-detail-exercise-count')).toContainText('1');

  const detailUrl = page.url();
  await page.reload();
  await expect(page).toHaveURL(detailUrl);
  await expect(page.getByTestId('workout-completed-notice')).toHaveCount(0);
});

test('renders real history statistics muscles and stable exercise summaries without a completion notice', async ({ page }) => {
  await seedLogs(page, [workoutLog('detail-real', '2026-07-10', '2026-07-10T09:00:00.000Z', [
    workoutExercise('bench', 'barbell-bench-press', 0, [
      workoutSet('bench-1', 1, 60, 8),
      workoutSet('bench-2', 2, 55, 10),
      workoutSet('bench-empty', 3)
    ]),
    workoutExercise('pull', 'lat-pulldown', 1, [workoutSet('pull-1', 1, undefined, 12)])
  ], { durationSeconds: 3661 })]);

  await page.goto('/workout-history/detail-real');

  await expect(page.getByTestId('workout-completed-notice')).toHaveCount(0);
  await expect(page.getByTestId('workout-detail-duration')).toHaveText('1:01:01');
  await expect(page.getByTestId('workout-detail-valid-sets')).toContainText('3');
  await expect(page.getByTestId('workout-detail-exercise-count')).toContainText('2');
  await expect(page.getByTestId('workout-detail-calories')).toContainText('约');
  await expect(page.getByTestId('workout-muscle-card')).toContainText('胸');
  await expect(page.getByTestId('workout-muscle-card')).toContainText('背');
  await expect(page.getByTestId('workout-muscle-chest').first()).toHaveAttribute('data-highlight', 'primary');
  await expect(page.getByTestId('workout-detail-exercise-row').first()).toContainText('杠铃卧推');
  await expect(page.getByTestId('workout-detail-exercise-row').first()).toContainText('2 组 · 最高 60kg · 8–10 次');
  await expect(page.getByTestId('workout-notes-card')).toContainText('暂无训练备注');
  await expect(page.getByTestId('workout-log-detail')).not.toContainText('总训练容量');
  await expect(page.locator('nav a[href="/workout-log"]')).toHaveClass(/text-lime-300/);
});

test('edits supported fields through a local draft and synchronizes the latest workout', async ({ page }) => {
  const latest = workoutLog('latest-edit', '2026-07-10', '2026-07-10T09:00:00.000Z', [
    workoutExercise('bench', 'barbell-bench-press', 0, [workoutSet('bench-1', 1, 60, 8)], '原动作备注')
  ], { notes: '原训练备注', durationSeconds: 1800 });
  await seedLogs(page, [latest], latest);
  await page.goto('/workout-history/latest-edit');

  await page.getByTestId('edit-workout-log').click();
  await page.getByTestId('workout-date-input').fill('2026-07-09');
  await page.getByTestId('workout-notes-input').fill('更新后的训练备注');
  await page.getByTestId('workout-exercise-notes-input').fill('更新后的动作备注');
  await page.getByTestId('history-set-weight-input').fill('62.5');
  await page.getByTestId('history-set-reps-input').fill('9');
  await page.getByTestId('add-history-set').click();
  await expect(page.getByTestId('history-set-row')).toHaveCount(2);
  await page.getByTestId('history-set-weight-input').nth(1).fill('50');
  await page.getByTestId('history-set-reps-input').nth(1).fill('12');
  await page.getByTestId('save-workout-log').click();

  await expect(page.getByTestId('edit-workout-log')).toBeVisible();
  await expect(page.getByTestId('workout-notes-card')).toContainText('更新后的训练备注');
  const stored = await readStorage(page, WORKOUT_LOGS_KEY);
  expect(stored[0].date).toBe('2026-07-09');
  expect(stored[0].notes).toBe('更新后的训练备注');
  expect(stored[0].exercises[0].notes).toBe('更新后的动作备注');
  expect(stored[0].exercises[0].sets).toHaveLength(2);
  expect(stored[0].exercises[0].sets[0]).toMatchObject({ weight: 62.5, reps: 9 });
  expect((await readStorage(page, LATEST_WORKOUT_LOG_KEY)).date).toBe('2026-07-09');
});

test('cancel and invalid edits never mutate storage', async ({ page }) => {
  const log = workoutLog('cancel-edit', '2026-07-10', '2026-07-10T09:00:00.000Z', [workoutExercise('bench', 'barbell-bench-press', 0, [workoutSet('bench-1', 1, 60, 8)])]);
  await seedLogs(page, [log], log);
  await page.goto('/workout-history/cancel-edit');

  await page.getByTestId('edit-workout-log').click();
  await page.getByTestId('workout-notes-input').fill('不应保存');
  await page.getByTestId('cancel-workout-edit').click();
  expect((await readStorage(page, WORKOUT_LOGS_KEY))[0].notes).toBeUndefined();

  await page.getByTestId('edit-workout-log').click();
  await page.getByTestId('history-set-reps-input').fill('2.5');
  await page.getByTestId('save-workout-log').click();
  await expect(page.getByTestId('workout-edit-error')).toContainText('次数');
  expect((await readStorage(page, WORKOUT_LOGS_KEY))[0].exercises[0].sets[0].reps).toBe(8);
});

test('deletes sets exercises and records while keeping latest workout synchronized', async ({ page }) => {
  const newest = workoutLog('delete-newest', '2026-07-10', '2026-07-10T09:00:00.000Z', [
    workoutExercise('bench', 'barbell-bench-press', 0, [workoutSet('bench-1', 1, 60, 8), workoutSet('bench-2', 2, 55, 10)]),
    workoutExercise('pull', 'lat-pulldown', 1, [workoutSet('pull-1', 1, 40, 10)])
  ]);
  const older = workoutLog('older-remains', '2026-07-09', '2026-07-09T09:00:00.000Z', [workoutExercise('row', 'seated-row', 0, [workoutSet('row-1', 1, 40, 10)])]);
  await seedLogs(page, [newest, older], newest);
  await page.goto('/workout-history/delete-newest');

  await page.getByTestId('edit-workout-log').click();
  await page.getByTestId('delete-history-set').first().click();
  await page.getByTestId('delete-history-exercise').nth(1).click();
  await page.getByTestId('save-workout-log').click();
  await expect(page.getByTestId('workout-detail-valid-sets')).toContainText('1');
  await expect(page.getByTestId('workout-detail-exercise-count')).toContainText('1');

  await page.getByTestId('edit-workout-log').click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByTestId('delete-workout-log').click();
  await expect(page).toHaveURL(/\/workout-history$/);
  expect((await readStorage(page, LATEST_WORKOUT_LOG_KEY)).id).toBe('older-remains');
  expect((await readStorage(page, WORKOUT_LOGS_KEY))).toHaveLength(1);
});

test('clears latest after deleting the last record and remains safe for missing records at 320px', async ({ page }) => {
  const log = workoutLog('last-record', '2026-07-10', '2026-07-10T09:00:00.000Z', [workoutExercise('bench', 'barbell-bench-press', 0, [workoutSet('bench-1', 1, 60, 8)])]);
  await seedLogs(page, [log], log);
  await page.goto('/workout-history/last-record');
  await page.getByTestId('edit-workout-log').click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByTestId('delete-workout-log').click();
  expect(await page.evaluate((key) => window.localStorage.getItem(key), LATEST_WORKOUT_LOG_KEY)).toBeNull();

  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/workout-history/does-not-exist');
  await expect(page.getByText('未找到这次训练记录')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

async function seedLogs(page: Page, logs: ReturnType<typeof workoutLog>[], latest?: ReturnType<typeof workoutLog>) {
  await page.addInitScript(({ logsKey, latestKey, logs, latest }) => {
    window.localStorage.setItem(logsKey, JSON.stringify(logs));
    if (latest) window.localStorage.setItem(latestKey, JSON.stringify(latest));
  }, { logsKey: WORKOUT_LOGS_KEY, latestKey: LATEST_WORKOUT_LOG_KEY, logs, latest });
}

async function readStorage(page: Page, key: string) {
  return page.evaluate((storageKey) => JSON.parse(window.localStorage.getItem(storageKey) ?? 'null'), key);
}

function workoutLog(id: string, date: string, createdAt: string, exercises: ReturnType<typeof workoutExercise>[], extras: Record<string, unknown> = {}) {
  return { id, date, createdAt, exercises, ...extras };
}

function workoutExercise(id: string, exerciseId: string, order: number, sets: ReturnType<typeof workoutSet>[], notes?: string) {
  return { id, exerciseId, order, sets, notes };
}

function workoutSet(id: string, setIndex: number, weight?: number, reps?: number) {
  return { id, setIndex, weight, reps, completed: weight !== undefined || reps !== undefined };
}
