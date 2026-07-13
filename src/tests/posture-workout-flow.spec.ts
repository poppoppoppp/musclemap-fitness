import { expect, test, type Page } from '@playwright/test';

const ACTIVE_WORKOUT_KEY = 'musclemap.activeWorkout.v0.7';

test('browses a released posture protocol in the existing picker and reuses action details', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startEmptyWorkout(page);
  await openPicker(page);

  const muscleEntry = page.getByTestId('open-2d-muscle-picker');
  const postureEntry = page.getByTestId('open-posture-picker');
  await expect(muscleEntry).toBeVisible();
  await expect(postureEntry).toBeVisible();
  const [muscleBox, postureBox] = await Promise.all([muscleEntry.boundingBox(), postureEntry.boundingBox()]);
  expect(Math.abs((muscleBox?.y ?? 0) - (postureBox?.y ?? 0))).toBeLessThan(2);

  await postureEntry.click();
  const browser = page.getByTestId('posture-browser');
  await expect(page.getByTestId('exercise-picker-sheet').getByRole('heading', { name: '体态改善' })).toBeVisible();
  await expect(browser).toContainText('选择需要改善的体态问题');
  await expect(page.getByTestId('posture-issue-humeral-anterior-translation')).toBeVisible();
  await expect(page.getByTestId('posture-issue-shoulder-clicking-discomfort')).toBeVisible();
  await expect(page.getByTestId('posture-issue-winged-scapula')).toHaveCount(0);

  await page.getByTestId('posture-issue-humeral-anterior-translation').click();
  const detail = page.getByTestId('posture-protocol-detail');
  await expect(detail).toContainText('肩部弹响/不适与肩胛控制方案');
  await expect(detail.getByTestId('posture-protocol-action')).toHaveCount(2);
  await expect(detail).not.toContainText('冈下肌与小圆肌局部压放松');
  await expect(detail).not.toContainText('80%');

  await page.getByTestId('posture-action-quadruped-scapular-protraction-stability').click();
  await expect(page).toHaveURL(/\/exercises\/quadruped-scapular-protraction-stability/);
  await expect(page.getByRole('heading', { name: '四点跪姿肩胛前伸稳定' })).toBeVisible();
  await expect(page.getByTestId('posture-protocol-context')).toContainText('本方案中的安排');
  await expect(page.getByTestId('posture-protocol-context')).toContainText('3 组');
  await expect(page.getByText('保持姿势时均匀呼吸；视频未给出固定呼吸次数。')).toBeVisible();
  await expect(page.getByTestId('contextual-alternatives')).toHaveCount(0);

  await page.getByTestId('posture-detail-back').click();
  await expect(page).toHaveURL(/\/workout-log/);
  await expect(page.getByTestId('posture-protocol-detail')).toBeVisible();
});

test('adds a protocol snapshot, persists it, marks edits and deletes the whole group', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startEmptyWorkout(page);
  await openPostureProtocol(page);

  await expect(page.getByTestId('add-posture-protocol')).toContainText('加入当前训练');
  await expect(page.getByTestId('posture-add-summary')).toContainText('将添加 2 个动作');
  await page.getByTestId('add-posture-protocol').click();

  await expect(page.getByTestId('exercise-picker-sheet')).toBeHidden();
  const group = page.getByTestId('posture-protocol-group');
  await expect(group).toContainText('肩部弹响/不适与肩胛控制方案');
  await expect(group).toContainText('2 个动作');
  await expect(page.getByTestId('save-status')).toContainText('已加入「肩部弹响/不适与肩胛控制方案」');

  const stored = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? 'null'), ACTIVE_WORKOUT_KEY);
  expect(stored.postureProtocolGroups).toHaveLength(1);
  expect(stored.postureProtocolGroups[0].exerciseSnapshots).toHaveLength(2);

  await page.reload();
  await expect(page.getByTestId('posture-protocol-group')).toBeVisible();
  await page.getByTestId('current-exercise-card').getByTestId('set-reps-input').first().fill('8');
  await expect(page.getByTestId('posture-group-modified')).toContainText('已修改');

  await page.getByTestId('delete-posture-protocol-group').click();
  await expect(page.getByTestId('posture-protocol-group')).toHaveCount(0);
  await expect(page.getByTestId('workout-log-exercise')).toHaveCount(0);
});

test('completed workout history retains the posture protocol snapshot', async ({ page }) => {
  await startEmptyWorkout(page);
  await openPostureProtocol(page);
  await page.getByTestId('add-posture-protocol').click();
  await page.getByTestId('current-exercise-card').getByTestId('set-reps-input').first().fill('10');
  await page.getByTestId('end-active-workout').click();

  await expect(page).toHaveURL(/\/workout-history\//);
  const historyGroup = page.getByTestId('workout-history-posture-group');
  await expect(historyGroup).toContainText('肩部弹响/不适与肩胛控制方案');
  await expect(historyGroup).toContainText('肱骨前移');
  await expect(historyGroup).toContainText('四点跪姿肩胛前伸稳定');
  await expect(historyGroup).toContainText('3 组');
});

for (const width of [320, 390]) {
  test(`posture picker has no horizontal overflow and its sticky action does not cover content at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 720 });
    await startEmptyWorkout(page);
    await openPostureProtocol(page);

    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    const lastAction = page.getByTestId('posture-protocol-action').last();
    await lastAction.scrollIntoViewIfNeeded();
    const [actionBox, footerBox] = await Promise.all([
      lastAction.boundingBox(),
      page.getByTestId('posture-protocol-footer').boundingBox()
    ]);
    expect(actionBox).not.toBeNull();
    expect(footerBox).not.toBeNull();
    expect(actionBox!.y + actionBox!.height).toBeLessThanOrEqual(footerBox!.y);
  });
}

async function startEmptyWorkout(page: Page) {
  await page.goto('/workout-log');
  await page.evaluate((key) => window.localStorage.removeItem(key), ACTIVE_WORKOUT_KEY);
  await page.reload();
  await page.getByTestId('workout-log-overview').getByRole('button').last().click();
  await page.getByTestId('start-active-workout').click();
}

async function openPicker(page: Page) {
  await page.getByTestId('open-exercise-picker').click();
  await expect(page.getByTestId('exercise-picker-sheet')).toBeVisible();
}

async function openPostureProtocol(page: Page) {
  await openPicker(page);
  await page.getByTestId('open-posture-picker').click();
  await page.getByTestId('posture-issue-humeral-anterior-translation').click();
  await expect(page.getByTestId('posture-protocol-detail')).toBeVisible();
}
