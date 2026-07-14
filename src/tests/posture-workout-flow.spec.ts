import { expect, test, type Page } from '@playwright/test';

const ACTIVE_WORKOUT_KEY = 'musclemap.activeWorkout.v0.7';

test('browses categories, guidance and every stage in the existing picker', async ({ page }) => {
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
  await expect(browser).toContainText('选择训练方向');
  await expect(page.getByTestId('posture-guidance')).toContainText('外观差异不等于疾病');
  await expect(page.locator('[data-category-id]')).toHaveCount(8);
  await expect(page.getByTestId('posture-category-shoulder_scapula')).toContainText('2 套方案');
  await expect(page.getByTestId('posture-category-orofacial')).toContainText('1 套方案');

  await page.getByTestId('posture-category-shoulder_scapula').click();
  await expect(page.locator('[data-protocol-id]')).toHaveCount(2);
  await page.getByTestId('posture-protocol-SHOULDER_001').click();
  const detail = page.getByTestId('posture-protocol-detail');
  await expect(detail).toContainText('肩胛控制与肩部不适辅助方案');
  await expect(detail.getByTestId('posture-stage')).toHaveCount(3);
  await expect(detail).toContainText('软组织准备');
  await expect(detail).toContainText('肩胛控制');
  await expect(detail).toContainText('上举协同');
  await expect(detail.getByTestId('posture-protocol-action')).toHaveCount(3);
  await expect(detail.getByTestId('posture-optional-step')).toContainText('可选');
  await expect(detail).not.toContainText('改善肩部弹响');
  await expect(page.getByTestId('posture-add-summary')).toContainText('将添加 2 个动作');

  await page.getByTestId('posture-action-EX_SCAP_QUADRUPED_PROTRACTION').click();
  await expect(page).toHaveURL(/\/exercises\/EX_SCAP_QUADRUPED_PROTRACTION/);
  await expect(page.getByRole('heading', { name: '四点跪姿肩胛前伸控制' })).toBeVisible();
  await page.getByRole('button', { name: /动作说明/ }).click();
  await expect(page.getByTestId('posture-protocol-context')).toContainText('当前姿态方案');
  await expect(page.getByTestId('posture-protocol-context')).toContainText('肩胛控制');
  await expect(page.getByTestId('posture-protocol-context')).toContainText('3 组');
  await expect(page.getByText('保持均匀呼吸。')).toBeVisible();
  await page.getByRole('button', { name: '关闭动作说明' }).click();

  await page.getByTestId('posture-detail-back').click();
  await expect(page).toHaveURL(/\/workout-log/);
  await expect(page.getByTestId('posture-protocol-detail')).toBeVisible();
});

test('shows context-specific stage, confidence and limitations on posture action detail', async ({ page }) => {
  await startEmptyWorkout(page);
  await openPostureProtocol(page, 'OROFACIAL_001');
  await page.getByTestId('posture-action-EX_SUBOCCIPITAL_SELF_MASSAGE').click();

  await page.getByRole('button', { name: /动作说明/ }).click();
  const context = page.getByTestId('posture-protocol-context');
  await expect(context).toContainText('颈部准备');
  await expect(context).toContainText('180-300 秒');
  await expect(context).toContainText('低置信度');
  await expect(context).toContainText('不能矫正骨性脸型');
});

test('shows observations and missing doses without counting or inventing them', async ({ page }) => {
  await startEmptyWorkout(page);
  await openPostureProtocol(page, 'PELVIS_001');
  await expect(page.getByTestId('posture-observation')).toHaveCount(2);
  await expect(page.getByTestId('posture-protocol-action')).toHaveCount(5);
  await expect(page.getByTestId('posture-add-summary')).toContainText('将添加 5 个动作');

  await page.getByTestId('posture-browser-back').click();
  await page.getByTestId('posture-browser-back').click();
  await page.getByTestId('posture-category-cervical_head').click();
  await page.getByTestId('posture-protocol-CERVICAL_002').click();
  await expect(page.getByTestId('posture-protocol-detail').getByText('剂量未说明')).toHaveCount(3);
});

test('requires one equipment variant for the low-angle abduction protocol', async ({ page }) => {
  await startEmptyWorkout(page);
  await openPostureProtocol(page, 'SHOULDER_002');
  await expect(page.getByTestId('add-posture-protocol')).toBeDisabled();
  await expect(page.locator('[data-variant-choice]')).toHaveCount(2);
  await page.getByTestId('posture-variant-EX_LOW_ANGLE_ABDUCTION_CABLE').click();
  await expect(page.getByTestId('add-posture-protocol')).toBeEnabled();
  await expect(page.getByTestId('posture-add-summary')).toContainText('将添加 1 个动作');
});

test('records duration only for a posture action with an explicit duration dose', async ({ page }) => {
  await startEmptyWorkout(page);
  await openPostureProtocol(page, 'PELVIS_002');
  await page.getByTestId('add-posture-protocol').click();

  const current = page.getByTestId('current-exercise-card');
  await expect(current.getByTestId('set-duration-input')).toHaveCount(1);
  await expect(current.getByTestId('set-reps-input')).toHaveCount(0);
  await current.getByTestId('set-duration-input').fill('45');
  await page.getByTestId('end-active-workout').click();

  await expect(page).toHaveURL(/\/workout-history\//);
  await expect(page.getByTestId('workout-history-set')).toContainText('45 秒');
  await page.getByTestId('edit-workout-log').click();
  await expect(page.getByTestId('history-set-duration-input')).toHaveCount(1);
  await expect(page.getByTestId('history-set-reps-input')).toHaveCount(0);
  await page.getByTestId('history-set-duration-input').fill('50');
  await page.getByTestId('save-workout-log').click();
  await expect(page.getByTestId('workout-history-set')).toContainText('50 秒');
});

test('keeps protocol stages and observations in the active workout group', async ({ page }) => {
  await startEmptyWorkout(page);
  await openPostureProtocol(page, 'PELVIS_001');
  await page.getByTestId('add-posture-protocol').click();

  const group = page.getByTestId('posture-protocol-group');
  await expect(group.getByTestId('posture-group-stage')).toHaveCount(4);
  await expect(group.getByTestId('posture-group-observation')).toHaveCount(2);
  await expect(group).toContainText('观察不计入训练动作');
  await expect(group).toContainText('5 个训练动作');
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
  await expect(group).toContainText('肩胛控制与肩部不适辅助方案');
  await expect(group).toContainText('2 个训练动作');
  await expect(group.getByTestId('posture-group-stage')).toHaveCount(3);
  await expect(page.getByTestId('save-status')).toContainText('已加入「肩胛控制与肩部不适辅助方案」');

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
  await expect(historyGroup).toContainText('肩胛控制与肩部不适辅助方案');
  await expect(historyGroup).toContainText('肩部弹响或不适');
  await expect(historyGroup).toContainText('四点跪姿肩胛前伸控制');
  await expect(historyGroup.getByTestId('posture-history-stage')).toHaveCount(3);
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

async function openPostureProtocol(page: Page, protocolId = 'SHOULDER_001') {
  await openPicker(page);
  await page.getByTestId('open-posture-picker').click();
  const categoryId = protocolId.startsWith('SHOULDER')
    ? 'shoulder_scapula'
    : protocolId.startsWith('PELVIS')
      ? 'pelvis_lumbopelvic'
      : protocolId.startsWith('CERVICAL')
        ? 'cervical_head'
        : protocolId.startsWith('OROFACIAL')
          ? 'orofacial'
        : 'shoulder_scapula';
  await page.getByTestId(`posture-category-${categoryId}`).click();
  await page.getByTestId(`posture-protocol-${protocolId}`).click();
  await expect(page.getByTestId('posture-protocol-detail')).toBeVisible();
}
