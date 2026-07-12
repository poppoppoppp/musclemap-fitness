import { expect, test } from '@playwright/test';

const ACTIVE_WORKOUT_KEY = 'musclemap.activeWorkout.v0.7';
const WORKOUT_LOGS_KEY = 'musclemap.workoutLogs.v0.3';
const LATEST_WORKOUT_LOG_KEY = 'musclemap.latestWorkoutLog.v0.3';
const PLAN_STORAGE_KEY = 'musclemap.latestGeneratedPlan.v0.2';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ keys }) => {
    keys.forEach((key) => window.localStorage.removeItem(key));
  }, { keys: [ACTIVE_WORKOUT_KEY, WORKOUT_LOGS_KEY, LATEST_WORKOUT_LOG_KEY, PLAN_STORAGE_KEY] });
});

test('shows the pre-workout overview with real empty states and no brand logo', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/workout-log');

  await expect(page.getByTestId('workout-log-overview')).toBeVisible();
  await expect(page.getByRole('heading', { name: '训练记录', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'MuscleMap', exact: true })).toHaveCount(0);
  await expect(page.getByTestId('weekly-training-count')).toHaveText('0');
  await expect(page.getByTestId('weekly-duration')).toContainText('0 分钟');
  await expect(page.getByTestId('weekly-valid-set-count')).toHaveText('0');
  await expect(page.getByTestId('recent-workout-card')).toContainText('暂无训练记录');
  await expect(page.getByTestId('workout-progress-card')).toContainText('暂无足够数据生成趋势');
  const startButton = page.getByRole('button', { name: '开始记录训练' });
  await expect(startButton).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const startButtonBox = await startButton.boundingBox();
  const navBox = await page.locator('nav').boundingBox();
  expect(startButtonBox).not.toBeNull();
  expect(navBox).not.toBeNull();
  expect(startButtonBox!.y + startButtonBox!.height).toBeLessThanOrEqual(navBox!.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

test('derives weekly totals dates latest workout and representative exercises from stored logs', async ({ page }) => {
  const current = new Date();
  const monday = startOfLocalWeek(current);
  const wednesday = addDays(monday, 2);
  const previousWeek = addDays(monday, -4);
  const mondayKey = toLocalDateKey(monday);
  const wednesdayKey = toLocalDateKey(wednesday);
  const previousKey = toLocalDateKey(previousWeek);
  const logs = [
    workoutLog('latest-log', wednesdayKey, '2026-07-11T12:00:00.000Z', 2400, [
      workoutExercise('latest-bench', 'barbell-bench-press', 0, [workoutSet('lb-1', 1, 60, 8)]),
      workoutExercise('latest-pulldown', 'lat-pulldown', 1, [workoutSet('lp-1', 1, 45, 10)]),
      workoutExercise('latest-row', 'seated-row', 2, [workoutSet('lr-1', 1, 40, 12)]),
      workoutExercise('latest-curl', 'dumbbell-curl', 3, [workoutSet('lc-1', 1, 12, 10)])
    ]),
    workoutLog('monday-log', mondayKey, '2026-07-07T12:00:00.000Z', 1800, [
      workoutExercise('monday-bench', 'barbell-bench-press', 0, [workoutSet('mb-1', 1, 55, 10), workoutSet('mb-2', 2, undefined, 12)])
    ]),
    workoutLog('older-log', previousKey, '2026-07-01T12:00:00.000Z', 3600, [
      workoutExercise('older-bench', 'barbell-bench-press', 0, [workoutSet('ob-1', 1, 50, 10)])
    ])
  ];

  await page.addInitScript(({ key, value }) => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, { key: WORKOUT_LOGS_KEY, value: logs });
  await page.goto('/workout-log');

  await expect(page.getByTestId('weekly-training-count')).toHaveText('2');
  await expect(page.getByTestId('weekly-duration')).toContainText('1 小时 10 分');
  await expect(page.getByTestId('weekly-valid-set-count')).toHaveText('6');
  await expect(page.getByTestId(`week-day-${mondayKey}`)).toHaveAttribute('data-trained', 'true');
  await expect(page.getByTestId(`week-day-${wednesdayKey}`)).toHaveAttribute('data-trained', 'true');
  await expect(page.getByTestId('recent-workout-card')).toContainText(`${wednesday.getMonth() + 1}月${wednesday.getDate()}日`);
  await expect(page.getByTestId('recent-workout-card')).toContainText('杠铃卧推');
  await expect(page.getByTestId('recent-workout-card')).not.toContainText('哑铃弯举');
  await expect(page.getByTestId('recent-workout-exercise')).toHaveCount(3);
  await expect(page.getByTestId('workout-progress-card')).toContainText('杠铃卧推');
  await expect(page.getByTestId('workout-progress-card')).toContainText('55kg');
  await expect(page.getByTestId('workout-progress-card')).toContainText('60kg');
  await expect(page.getByTestId('workout-progress-chart')).toBeVisible();
});

test('shows active workout instead of overview and restores it after reload', async ({ page }) => {
  await page.addInitScript(({ key }) => {
    const timestamp = new Date().toISOString();
    window.localStorage.setItem(key, JSON.stringify({
      id: 'active-overview-test',
      status: 'active',
      startedAt: timestamp,
      trainingDate: timestamp.slice(0, 10),
      source: 'manual',
      exercises: [],
      createdAt: timestamp,
      updatedAt: timestamp
    }));
  }, { key: ACTIVE_WORKOUT_KEY });

  await page.goto('/workout-log');
  await expect(page.getByTestId('active-workout-card')).toBeVisible();
  await expect(page.getByTestId('workout-log-overview')).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('active-workout-card')).toBeVisible();
  await expect(page.getByTestId('workout-log-overview')).toHaveCount(0);
});

test('starts a free workout from the workout source sheet', async ({ page }) => {
  await page.goto('/workout-log');
  await page.getByRole('button', { name: '开始记录训练' }).click();

  await expect(page.getByTestId('start-workout-sheet')).toBeVisible();
  await expect(page.getByTestId('start-workout-sheet')).toContainText('选择本次训练的来源');
  await page.getByRole('button', { name: '自由训练' }).click();

  await expect(page.getByTestId('active-workout-card')).toContainText('进行中');
  await expect(page.getByTestId('workout-log-overview')).toHaveCount(0);
  const stored = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? 'null'), ACTIVE_WORKOUT_KEY);
  expect(stored?.source).toBe('manual');
});

function startOfLocalWeek(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = start.getDay();
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
  return start;
}

function addDays(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function workoutLog(id: string, date: string, createdAt: string, durationSeconds: number, exercises: ReturnType<typeof workoutExercise>[]) {
  return { id, date, createdAt, durationSeconds, exercises };
}

function workoutExercise(id: string, exerciseId: string, order: number, sets: ReturnType<typeof workoutSet>[]) {
  return { id, exerciseId, order, sets };
}

function workoutSet(id: string, setIndex: number, weight?: number, reps?: number) {
  return { id, setIndex, weight, reps, completed: true };
}
