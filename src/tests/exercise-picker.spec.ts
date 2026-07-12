import { expect, test, type Page } from '@playwright/test';

async function startEmptyWorkout(page: Page) {
  await page.goto('/workout-log');
  await page.evaluate(() => window.localStorage.removeItem('musclemap.activeWorkout.v0.7'));
  await page.reload();
  await page.getByRole('button', { name: '开始记录训练' }).click();
  await page.getByTestId('start-active-workout').click();
}

async function openPicker(page: Page) {
  await page.getByTestId('open-exercise-picker').click();
  await expect(page.getByTestId('exercise-picker-sheet')).toBeVisible();
}

test('active workout opens an accessible exercise picker and closes it without navigation', async ({ page }) => {
  await startEmptyWorkout(page);

  await expect(page.getByTestId('manual-exercise-select')).toHaveCount(0);
  const trigger = page.getByTestId('open-exercise-picker');
  await expect(trigger).toContainText('添加第一个动作');
  await openPicker(page);

  const sheet = page.getByTestId('exercise-picker-sheet');
  await expect(sheet).toHaveAttribute('role', 'dialog');
  await expect(sheet).toHaveAttribute('aria-modal', 'true');
  await expect(page.getByTestId('exercise-picker-search')).toBeFocused();
  for (const category of ['全部', '胸', '背', '肩', '手臂', '核心', '腿']) {
    await expect(sheet.getByRole('button', { name: category, exact: true })).toBeVisible();
  }
  await expect(page.getByTestId('open-2d-muscle-picker')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(trigger).toBeFocused();

  await openPicker(page);
  await page.getByTestId('exercise-picker-backdrop').click({ position: { x: 4, y: 4 } });
  await expect(sheet).toBeHidden();
});

test('picker combines real category and multilingual search filters', async ({ page }) => {
  await startEmptyWorkout(page);
  await openPicker(page);

  await page.getByTestId('exercise-category-back').click();
  await expect(page.getByTestId('exercise-picker-result-lat-pulldown')).toBeVisible();
  await expect(page.getByTestId('exercise-picker-result-barbell-bench-press')).toHaveCount(0);

  const search = page.getByTestId('exercise-picker-search');
  await page.getByTestId('exercise-category-all').click();
  await search.fill('高位下拉');
  await expect(page.getByTestId('exercise-picker-result-lat-pulldown')).toBeVisible();
  await search.fill('LAT PULLDOWN');
  await expect(page.getByTestId('exercise-picker-result-lat-pulldown')).toBeVisible();
  await search.fill('高位下拉器');
  await expect(page.getByTestId('exercise-picker-result-lat-pulldown')).toBeVisible();
  await search.fill('不存在的动作');
  await expect(page.getByTestId('exercise-picker-empty')).toContainText('没有找到');
});

test('picker switches to the reused 2D muscle map in place and updates related exercises', async ({ page }) => {
  await startEmptyWorkout(page);
  await openPicker(page);
  const initialUrl = page.url();

  await page.getByTestId('open-2d-muscle-picker').click();
  await expect(page.getByTestId('exercise-picker-2d-mode')).toBeVisible();
  expect(page.url()).toBe(initialUrl);
  await page.getByTestId('exercise-picker-view-back').click();
  await page.getByTestId('muscle-region-rhomboids-center').click();
  await expect(page.getByTestId('exercise-picker-selected-muscle')).toContainText('菱形肌');
  await expect(page.getByTestId('exercise-picker-result-seated-row')).toBeVisible();

  await page.getByTestId('exercise-picker-back-to-list').click();
  await expect(page.getByTestId('exercise-picker-2d-mode')).toHaveCount(0);
});

test('adding an exercise persists it, closes the sheet, and prevents duplicates at mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startEmptyWorkout(page);
  await openPicker(page);

  await page.getByTestId('add-exercise-lat-pulldown').click();
  await expect(page.getByTestId('exercise-picker-sheet')).toBeHidden();
  await expect(page.getByTestId('workout-log-exercise')).toContainText('高位下拉');

  await openPicker(page);
  const duplicateButton = page.getByTestId('add-exercise-lat-pulldown');
  await expect(duplicateButton).toBeDisabled();
  await expect(duplicateButton).toContainText('已添加');
  await expect(page.getByTestId('exercise-picker-sheet')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);

  await page.reload();
  await expect(page.getByTestId('workout-log-exercise')).toContainText('高位下拉');
  const storedCount = await page.evaluate(() => {
    const workout = JSON.parse(window.localStorage.getItem('musclemap.activeWorkout.v0.7') ?? 'null');
    return workout.exercises.filter((exercise: { exerciseId: string }) => exercise.exerciseId === 'lat-pulldown').length;
  });
  expect(storedCount).toBe(1);
});
