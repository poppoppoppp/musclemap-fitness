import { expect, test, type Locator, type Page } from '@playwright/test';

const ACTIVE_WORKOUT_KEY = 'musclemap.activeWorkout.v0.7';
const FAVORITES_KEY = 'musclemap.exerciseFavorites.v1';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(({ activeKey, favoritesKey }) => {
    window.localStorage.removeItem(activeKey);
    window.localStorage.removeItem(favoritesKey);
  }, { activeKey: ACTIVE_WORKOUT_KEY, favoritesKey: FAVORITES_KEY });
});

test('renders the data-driven guide in the requested order without legacy detail content', async ({ page }) => {
  await page.goto('/exercises/one-arm-dumbbell-row');

  await expect(page.getByRole('heading', { name: '单臂哑铃划船', level: 1 })).toBeVisible();
  await expectTextList(page.getByTestId('exercise-detail-tags'), ['背部', '哑铃', '单侧动作']);
  await expectTextList(page.getByTestId('exercise-media-panel'), ['起始位置', '顶峰位置', '控制重量沿原路径缓慢返回起始位置']);
  await expectTextList(page.getByTestId('exercise-key-cues'), ['胸口朝下', '肘向髋拉', '躯干稳定']);
  await expectTextList(page.getByTestId('exercise-troubleshooting'), ['手臂酸', '肩膀耸起', '腰部扭转']);
  await expectTextList(page.getByTestId('exercise-detail-links'), ['动作说明', '训练部位', '替代动作']);

  const orderedIds = await page.locator('[data-exercise-section]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-exercise-section')));
  expect(orderedIds).toEqual(['title', 'media', 'cues', 'troubleshooting', 'links']);
  await expect(page.getByText('3D 动作轨迹')).toHaveCount(0);
  await expect(page.getByText('难度', { exact: true })).toHaveCount(0);
  await expect(page.getByText('One-arm Dumbbell Row', { exact: true })).toHaveCount(0);
  await expect(page.locator('nav')).toHaveCount(0);
});

test('uses silent media fallbacks and safe derived content for legacy exercises', async ({ page }) => {
  await page.goto('/exercises/ab-wheel-rollout');

  await expect(page.getByRole('heading', { name: '健腹轮跪姿滚动', level: 1 })).toBeVisible();
  await expect(page.getByTestId('exercise-media-placeholder')).toHaveCount(2);
  await expect(page.getByTestId('exercise-key-cues').locator('li')).toHaveCount(3);
  await expect(page.getByTestId('exercise-troubleshooting').locator('[data-troubleshooting-card]')).toHaveCount(3);
  await expect(page.getByText('undefined')).toHaveCount(0);
  await expect(page.getByText('暂未配置')).toHaveCount(0);
});

test('derives usable alternative links for catalog exercises without detail fields', async ({ page }) => {
  await page.goto('/exercises/wide-grip-lat-pulldown');
  await page.getByRole('button', { name: /替代动作/ }).click();
  await expect(page.getByTestId('exercise-alternatives-sheet').getByRole('link').first()).toBeVisible();
});

test('persists favorite state locally', async ({ page }) => {
  await page.goto('/exercises/one-arm-dumbbell-row');

  const favorite = page.getByRole('button', { name: '收藏动作' });
  await expect(favorite).toHaveAttribute('aria-pressed', 'false');
  await favorite.click();
  await expect(page.getByRole('button', { name: '取消收藏' })).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.getByRole('button', { name: '取消收藏' })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? '[]'), FAVORITES_KEY)).toContain('one-arm-dumbbell-row');
});

test('opens troubleshooting and secondary information in shared sheets', async ({ page }) => {
  await page.goto('/exercises/one-arm-dumbbell-row');

  await page.getByRole('button', { name: /手臂酸/ }).click();
  await expectTextList(page.getByTestId('exercise-troubleshooting-sheet'), ['可能原因', '重量过大', '立即调整', '放松握力']);
  await page.getByRole('button', { name: '关闭手臂酸' }).click();

  await page.getByRole('button', { name: '查看全部问题' }).click();
  await expectTextList(page.getByTestId('exercise-troubleshooting-list-sheet'), ['手臂酸', '肩膀耸起', '腰部扭转']);
  await page.getByRole('button', { name: '关闭感觉不对？' }).click();

  await page.getByRole('button', { name: /动作说明/ }).click();
  await expectTextList(page.getByTestId('exercise-instructions-sheet'), ['起始姿势', '执行动作', '返回过程', '呼吸要求', '动作范围']);
  await page.getByRole('button', { name: '关闭动作说明' }).click();

  await page.getByRole('button', { name: /训练部位/ }).click();
  await expectTextList(page.getByTestId('exercise-muscles-sheet'), ['主练肌群', '背阔肌', '次要肌群']);
  await page.getByRole('button', { name: '关闭训练部位' }).click();

  await page.getByRole('button', { name: /替代动作/ }).click();
  const alternative = page.getByTestId('exercise-alternatives-sheet').getByRole('link').first();
  await expect(alternative).toBeVisible();
  await alternative.click();
  await expect(page).toHaveURL(/\/exercises\/(seated-row|chest-supported-row|t-bar-row)/);
});

test('adds to an active workout once and then returns to the focused exercise', async ({ page }) => {
  await seedWorkout(page, ['lat-pulldown']);
  await page.goto('/exercises/one-arm-dumbbell-row');

  const primary = page.getByTestId('exercise-primary-action');
  await expect(primary).toHaveText('加入当前训练');
  await primary.click();
  await expect(page.getByRole('status')).toContainText('已加入当前训练');
  await expect(primary).toHaveText('返回当前训练');

  const stored = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? 'null'), ACTIVE_WORKOUT_KEY);
  expect(stored.exercises.map((item: { exerciseId: string }) => item.exerciseId)).toEqual(['lat-pulldown', 'one-arm-dumbbell-row']);

  await primary.click();
  await expect(page).toHaveURL(/\/workout-log\?focusExercise=/);
});

test('creates a workout from the primary action when none exists', async ({ page }) => {
  await page.goto('/exercises/one-arm-dumbbell-row');

  await expect(page.getByTestId('exercise-primary-action')).toHaveText('添加到训练');
  await page.getByTestId('exercise-primary-action').click();
  await expect(page).toHaveURL(/\/workout-log\?focusExercise=/);
  const stored = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? 'null'), ACTIVE_WORKOUT_KEY);
  expect(stored.exercises).toHaveLength(1);
  expect(stored.exercises[0].exerciseId).toBe('one-arm-dumbbell-row');
});

test('record once reuses the active workout and focuses the exercise', async ({ page }) => {
  await page.goto('/exercises/one-arm-dumbbell-row');
  await page.getByTestId('exercise-record-action').click();

  await expect(page).toHaveURL(/\/workout-log\?focusExercise=/);
  const stored = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? 'null'), ACTIVE_WORKOUT_KEY);
  expect(stored.exercises).toHaveLength(1);
  expect(stored.exercises[0].exerciseId).toBe('one-arm-dumbbell-row');
});

for (const width of [320, 390]) {
  test(`keeps the two-stage guide and fixed actions inside a ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/exercises/one-arm-dumbbell-row');

    await expect(page.getByTestId('exercise-media-stage')).toHaveCount(2);
    await expect(page.getByTestId('exercise-detail-action-bar')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  });
}

test('places the action bar in the document flow on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto('/exercises/one-arm-dumbbell-row');
  const position = await page.getByTestId('exercise-detail-action-bar').evaluate((element) => getComputedStyle(element).position);
  expect(position).toBe('static');
});

test('loads the back-001 start and peak assets on all six exercise detail pages', async ({ page }) => {
  const exerciseIds = [
    'lat-pulldown',
    'pull-up',
    'one-arm-dumbbell-row',
    'seated-row',
    'barbell-row',
    'chest-supported-row'
  ];

  for (const exerciseId of exerciseIds) {
    await page.goto(`/exercises/${exerciseId}`);
    const images = page.getByTestId('exercise-media-stage').locator('img');

    await expect(images).toHaveCount(2);
    await expect(images.nth(0)).toHaveAttribute('src', `/exercise-media/${exerciseId}/start.webp`);
    await expect(images.nth(1)).toHaveAttribute('src', `/exercise-media/${exerciseId}/peak.webp`);
    await expect.poll(() => images.evaluateAll((elements) => elements.map((element) => {
      const image = element as HTMLImageElement;
      return { width: image.naturalWidth, height: image.naturalHeight, objectFit: getComputedStyle(image).objectFit };
    }))).toEqual([
      { width: 640, height: 800, objectFit: 'contain' },
      { width: 640, height: 800, objectFit: 'contain' }
    ]);
    await expect(page.getByTestId('exercise-media-placeholder')).toHaveCount(0);
  }
});

async function seedWorkout(page: Page, exerciseIds: string[]) {
  await page.addInitScript(({ key, ids }) => {
    const timestamp = new Date().toISOString();
    window.localStorage.setItem(key, JSON.stringify({
      id: 'active-workout-test',
      status: 'active',
      startedAt: timestamp,
      trainingDate: '2026-07-14',
      source: 'manual',
      exercises: ids.map((exerciseId, index) => ({
        id: `active-${index}`,
        exerciseId,
        order: index,
        source: 'manual',
        sets: [{ id: `set-${index}`, setIndex: 1 }]
      })),
      createdAt: timestamp,
      updatedAt: timestamp
    }));
  }, { key: ACTIVE_WORKOUT_KEY, ids: exerciseIds });
}

async function expectTextList(locator: Locator, values: string[]) {
  for (const value of values) await expect(locator).toContainText(value);
}
