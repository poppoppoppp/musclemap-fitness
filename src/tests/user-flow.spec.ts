import { expect, test } from '@playwright/test';

import { threeModelRegions } from '../data/threeModelRegions';

test('three model region registry defines V0.10.0 regions and experimental back mapping', () => {
  expect(threeModelRegions.map((region) => region.id)).toEqual([
    'back-partial',
    'box-test',
    'chest',
    'legs',
    'shoulders-arms',
    'core'
  ]);

  const backPartial = threeModelRegions.find((region) => region.id === 'back-partial');
  expect(backPartial).toMatchObject({
    label: '背部局部模型',
    view: 'posterior',
    modelPath: '/models/private/local-anatomy.glb',
    isPrivateModel: true,
    isConfigured: true,
    isExperimental: true
  });
  expect(backPartial?.limitations).toContain('当前模型未包含 latissimus-dorsi / 背阔肌');
  expect(backPartial?.mappings.Right_rhomboid_major).toBe('rhomboids');
  expect(backPartial?.mappings.Left_spinalis_thoracis).toBe('erector-spinae');

  const boxTest = threeModelRegions.find((region) => region.id === 'box-test');
  expect(boxTest).toMatchObject({
    modelPath: '/models/demo/BoxTextured.glb',
    isPrivateModel: false,
    isConfigured: true,
    isExperimental: false,
    mappings: {}
  });

  for (const id of ['chest', 'legs', 'shoulders-arms', 'core']) {
    const placeholder = threeModelRegions.find((region) => region.id === id);
    expect(placeholder).toMatchObject({
      isConfigured: false,
      isPrivateModel: false,
      isExperimental: false,
      mappings: {}
    });
    expect(placeholder?.modelPath).toBeUndefined();
  }
});

test('user can discover latissimus dorsi and open lat pulldown detail', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: '肌群地图' }).first().click();
  await expect(page.getByRole('heading', { name: '肌群地图' })).toBeVisible();
  await expect(page.getByRole('button', { name: '背面视图' })).toBeVisible();
  await expect(page.getByText('背面视图包含背部肌群，也包含肩后侧相关肌群，例如后束三角肌。')).toBeVisible();

  await page.getByRole('button', { name: /左背阔肌/ }).click();
  await expect(page.getByTestId('muscle-region-latissimus-dorsi-left')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: '背阔肌' })).toBeVisible();
  await expect(page.getByText('Latissimus Dorsi')).toBeVisible();

  await page.getByRole('link', { name: '高位下拉' }).click();
  await expect(page).toHaveURL(/\/exercises\/lat-pulldown\?muscleId=latissimus-dorsi$/);
  await expect(page.getByRole('heading', { name: '高位下拉' })).toBeVisible();
  await expect(page.getByText('主练肌群')).toBeVisible();
  await expect(page.getByText('背阔肌').first()).toBeVisible();
});

test('app exposes pwa metadata for installation', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0f172a');
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes');
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/icons/musclemap-192.png');
});

test('three muscle demo renders selectable placeholder muscle regions', async ({ page }) => {
  await page.goto('/three-muscle-demo');

  await expect(page.getByRole('heading', { name: '3D 肌群模型技术预研' })).toBeVisible();
  await expect(page.getByText('该页面为实验 Demo，不影响正式肌群地图。当前模型为占位几何体，不代表真实解剖结构。')).toBeVisible();
  await expect(page.getByTestId('three-muscle-canvas')).toBeVisible();

  await page.getByTestId('select-three-muscle-latissimus-dorsi').click();
  await expect(page.getByTestId('three-selected-muscle-id')).toContainText('latissimus-dorsi');
  await expect(page.getByTestId('three-selected-muscle-name')).toContainText('背阔肌');
  await expect(page.getByTestId('three-selected-muscle-match')).toContainText('已匹配');

  await page.getByTestId('select-three-muscle-rhomboids').click();
  await expect(page.getByTestId('three-selected-muscle-id')).toContainText('rhomboids');

  await page.getByTestId('select-three-muscle-rear-deltoid').click();
  await expect(page.getByTestId('three-selected-muscle-id')).toContainText('rear-deltoid');
});

test('three muscle demo loads the GLB pipeline test model', async ({ page }) => {
  await page.goto('/three-muscle-demo');

  await expect(page.getByTestId('glb-experiment-panel')).toBeVisible();
  await expect(page.getByText('当前 GLB 模型仅用于加载管线测试，不代表真实人体或肌群结构。')).toBeVisible();
  await expect(page.getByText('模型文件：BoxTextured.glb')).toBeVisible();
  await expect(page.getByText('用途：仅用于 GLBLoader 管线测试')).toBeVisible();
  await expect(page.getByText('说明：该模型不是人体模型，也不是肌肉模型，不代表真实解剖结构。')).toBeVisible();
  await expect(page.getByTestId('glb-load-status')).toContainText('加载成功');
  await expect(page.getByTestId('glb-mesh-count')).toContainText(/[1-9]/);

  await page.getByTestId('select-glb-test-mesh').click();
  await expect(page.getByTestId('glb-selected-mesh-name')).not.toContainText('未选择');
  await expect(page.getByTestId('glb-technical-muscle-id')).toContainText('latissimus-dorsi');
});

test('three muscle demo shows local anatomy fallback when private model is missing', async ({ page }) => {
  await page.goto('/three-muscle-demo');

  await expect(page.getByTestId('local-anatomy-experiment-panel')).toBeVisible();
  await expect(page.getByRole('heading', { name: '本地真实模型实验区' })).toBeVisible();
  await expect(
    page.getByText('该区域仅用于本地真实模型技术实验。模型文件不会进入正式产品，也不会随项目发布。')
  ).toBeVisible();
  await expect(page.getByText('未检测到本地真实模型。')).toBeVisible();
  await expect(page.getByText('请将本地实验用 .glb 放到 public/models/private/local-anatomy.glb。')).toBeVisible();
  await expect(page.getByText('该目录已被 Git 忽略，模型不会进入提交。')).toBeVisible();
  await expect(page.getByTestId('local-anatomy-expected-path')).toContainText('/models/private/local-anatomy.glb');
  await expect(page.getByText('推荐格式：.glb')).toBeVisible();
  await expect(page.getByText('不建议直接使用 .obj，优先用 Blender 转 .glb')).toBeVisible();
  await expect(page.getByText('模型不会随项目发布。')).toBeVisible();
});

test('three muscle demo does not overflow at 390px mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/three-muscle-demo');

  await expect(page.getByTestId('three-muscle-canvas')).toBeVisible();
  await expect(page.getByTestId('local-anatomy-experiment-panel')).toBeVisible();
  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalOverflow).toBe(false);
});

test('workout log hides invalid legacy latest sets instead of rendering undefined values', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('musclemap.latestGeneratedPlan.v0.2');
    window.localStorage.removeItem('musclemap.workoutLogs.v0.3');
    window.localStorage.setItem(
      'musclemap.latestWorkoutLog.v0.3',
      JSON.stringify({
        id: 'legacy-log',
        date: '2026-05-23',
        exercises: [
          {
            id: 'legacy-valid',
            exerciseId: 'lat-pulldown',
            order: 0,
            sets: [
              { id: 'set-valid', setIndex: 1, weight: 35.5, reps: 12, completed: true },
              { id: 'set-invalid', setIndex: 2, completed: true }
            ]
          },
          {
            id: 'legacy-invalid',
            exerciseId: 'seated-row',
            order: 1,
            sets: [{ id: 'set-empty', setIndex: 1, completed: true }]
          }
        ],
        createdAt: '2026-05-23T00:00:00.000Z'
      })
    );
  });

  await page.goto('/workout-log');

  await expect(page.getByTestId('latest-workout-log')).toContainText('Lat Pulldown');
  await expect(page.getByTestId('latest-workout-log')).toContainText('35.5kg');
  await expect(page.getByTestId('latest-workout-log')).toContainText('第 1 组');
  await expect(page.getByTestId('latest-workout-log')).toContainText('次');
  await expect(page.getByTestId('latest-workout-log')).not.toContainText('undefined');
  await expect(page.getByTestId('latest-workout-log')).not.toContainText('绗');
  await expect(page.getByTestId('latest-workout-log')).not.toContainText('缁');
  await expect(page.getByTestId('latest-workout-log')).not.toContainText('娆');
  await expect(page.getByTestId('latest-workout-log')).not.toContainText('Seated Cable Row');
});

test('workout history shows an empty state when there are no archived logs', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('musclemap.workoutLogs.v0.3');
  });

  await page.goto('/workout-history');

  await expect(page.getByRole('heading', { name: '训练历史' })).toBeVisible();
  await expect(page.getByText('暂无训练记录')).toBeVisible();
  await expect(page.getByText('完成一次训练后会显示在这里')).toBeVisible();
});

test('workout history lists logs by date and created time with summary details', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'musclemap.workoutLogs.v0.3',
      JSON.stringify([
        {
          id: 'older-log',
          date: '2026-05-24',
          exercises: [{ id: 'older-exercise', exerciseId: 'seated-row', order: 0, sets: [{ id: 'older-set', setIndex: 1, weight: 40, completed: true }] }],
          createdAt: '2026-05-24T08:00:00.000Z'
        },
        {
          id: 'same-day-later-log',
          date: '2026-05-25',
          planId: 'plan-v08',
          durationSeconds: 2700,
          notes: 'Back session note',
          exercises: [
            {
              id: 'later-exercise',
              exerciseId: 'lat-pulldown',
              order: 0,
              sets: [
                { id: 'later-set-1', setIndex: 1, weight: 42.5, reps: 10, completed: true },
                { id: 'later-set-empty', setIndex: 2, completed: true }
              ]
            }
          ],
          createdAt: '2026-05-25T09:00:00.000Z'
        },
        {
          id: 'same-day-earlier-log',
          date: '2026-05-25',
          exercises: [{ id: 'earlier-exercise', exerciseId: 'pull-up', order: 0, sets: [{ id: 'earlier-set', setIndex: 1, reps: 8, completed: true }] }],
          createdAt: '2026-05-25T07:00:00.000Z'
        }
      ])
    );
  });

  await page.goto('/workout-history');

  const cards = page.getByTestId('workout-history-card');
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toContainText('2026-05-25');
  await expect(cards.nth(0)).toContainText('动作：1 个');
  await expect(cards.nth(0)).toContainText('有效组数：1 组');
  await expect(cards.nth(0)).toContainText('时长：45 分钟');
  await expect(cards.nth(0)).toContainText('来源：计划');
  await expect(cards.nth(0)).toContainText('Back session note');
  await expect(cards.nth(1)).toHaveAttribute('data-log-id', 'same-day-earlier-log');
  await expect(cards.nth(2)).toContainText('2026-05-24');
});

test('workout history opens a read only workout log detail page', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'musclemap.workoutLogs.v0.3',
      JSON.stringify([
        {
          id: 'detail-log',
          date: '2026-05-25',
          planId: 'plan-v08',
          durationSeconds: 2700,
          notes: 'Keep tempo controlled',
          exercises: [
            {
              id: 'detail-exercise',
              exerciseId: 'lat-pulldown',
              order: 0,
              notes: 'No swinging',
              sets: [
                { id: 'set-1', setIndex: 1, weight: 42.5, reps: 10, completed: true },
                { id: 'set-2', setIndex: 2, weight: 35, completed: true },
                { id: 'set-3', setIndex: 3, reps: 12, completed: true },
                { id: 'set-4', setIndex: 4, completed: true }
              ]
            }
          ],
          createdAt: '2026-05-25T09:00:00.000Z'
        }
      ])
    );
  });

  await page.goto('/workout-history');
  await page.getByTestId('workout-history-card').first().getByRole('link', { name: '查看详情' }).click();

  await expect(page).toHaveURL(/\/workout-history\/detail-log$/);
  await expect(page.getByRole('heading', { name: '训练详情' })).toBeVisible();
  await expect(page.getByTestId('workout-log-detail')).toContainText('2026-05-25');
  await expect(page.getByTestId('workout-log-detail')).toContainText('45 分钟');
  await expect(page.getByTestId('workout-log-detail')).toContainText('plan-v08');
  await expect(page.getByTestId('workout-log-detail')).toContainText('Keep tempo controlled');
  await expect(page.getByTestId('workout-detail-exercise')).toContainText('高位下拉');
  await expect(page.getByTestId('workout-detail-exercise')).toContainText('Lat Pulldown');
  await expect(page.getByTestId('workout-detail-exercise')).toContainText('No swinging');
  await expect(page.getByTestId('workout-detail-exercise')).toContainText('组数：3 组');
  await expect(page.getByTestId('workout-detail-exercise')).toContainText('第 1 组：42.5kg x 10 次');
  await expect(page.getByTestId('workout-detail-exercise')).toContainText('第 2 组：35kg');
  await expect(page.getByTestId('workout-detail-exercise')).toContainText('第 3 组：12 次');
  await expect(page.locator('input, textarea')).toHaveCount(0);
});

test('workout history detail handles missing logs and unknown exercises without crashing', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'musclemap.workoutLogs.v0.3',
      JSON.stringify([
        {
          id: 'unknown-exercise-log',
          date: '2026-05-25',
          exercises: [{ id: 'unknown-exercise', exerciseId: 'not-real-exercise', order: 0, sets: [{ id: 'set-1', setIndex: 1, reps: 9, completed: true }] }],
          createdAt: '2026-05-25T09:00:00.000Z'
        }
      ])
    );
  });

  await page.goto('/workout-history/not-found');
  await expect(page.getByText('未找到这次训练记录')).toBeVisible();

  await page.goto('/workout-history/unknown-exercise-log');
  await expect(page.getByTestId('workout-detail-exercise')).toContainText('未知动作');
  await expect(page.getByTestId('workout-detail-exercise')).toContainText('not-real-exercise');
  await expect(page.getByTestId('workout-detail-exercise')).toContainText('第 1 组：9 次');
});

test('workout history has an entry from workout log and does not overflow at 390px mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'musclemap.workoutLogs.v0.3',
      JSON.stringify([
        {
          id: 'mobile-log',
          date: '2026-05-25',
          exercises: [{ id: 'mobile-exercise', exerciseId: 'lat-pulldown', order: 0, sets: [{ id: 'mobile-set', setIndex: 1, weight: 42.5, reps: 10, completed: true }] }],
          createdAt: '2026-05-25T09:00:00.000Z'
        }
      ])
    );
  });

  await page.goto('/workout-log');
  await page.getByRole('link', { name: '查看训练历史' }).click();
  await expect(page).toHaveURL(/\/workout-history$/);
  await expect(page.getByRole('heading', { name: '训练历史' })).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalOverflow).toBe(false);
});

test('rhomboids exercise detail keeps muscle context across alternatives', async ({ page }) => {
  await page.goto('/muscle-map');
  await page.getByTestId('muscle-region-rhomboids-center').click();

  const rowLink = page.locator('a[href="/exercises/seated-row?muscleId=rhomboids"]');
  await expect(rowLink).toHaveCount(1);
  await rowLink.click();

  await expect(page).toHaveURL(/\/exercises\/seated-row\?muscleId=rhomboids$/);
  const alternatives = page.getByTestId('contextual-alternatives');
  await expect(alternatives).toContainText('主练匹配');
  await expect(alternatives).not.toContainText('滑草科键归屎');
  await expect(alternatives).not.toContainText('Deadlift');
  await expect(alternatives).not.toContainText('Back Extension');
  await expect(alternatives).not.toContainText('Romanian Deadlift');
  await expect(alternatives).not.toContainText('Lat Pulldown');

  await page.getByTestId('alternative-link-chest-supported-row').click();
  await expect(page).toHaveURL(/\/exercises\/chest-supported-row\?muscleId=rhomboids$/);
  await page.getByTestId('alternative-link-barbell-row').click();
  await expect(page).toHaveURL(/\/exercises\/barbell-row\?muscleId=rhomboids$/);
});

test('exercise detail falls back to primary muscle when muscleId is missing or invalid', async ({ page }) => {
  await page.goto('/exercises/lat-pulldown');
  await expect(page.getByTestId('alternative-link-pull-up')).toBeVisible();
  await expect(page.getByTestId('contextual-alternatives')).toContainText('主练匹配');
  await expect(page.getByTestId('contextual-alternatives')).not.toContainText('滑草科键归屎');

  await page.goto('/exercises/lat-pulldown?muscleId=not-a-real-muscle');
  await expect(page.getByTestId('alternative-link-pull-up')).toBeVisible();
  await expect(page.getByTestId('contextual-alternatives')).toContainText('主练匹配');
  await expect(page.getByTestId('contextual-alternatives')).not.toContainText('滑草科键归屎');
});

test('exercise detail removes misleading alternative relationships', async ({ page }) => {
  await page.goto('/exercises/dumbbell-shrug?muscleId=upper-trapezius');
  await expect(page.getByTestId('contextual-alternatives')).not.toContainText('Deadlift');

  await page.goto('/exercises/barbell-shrug?muscleId=upper-trapezius');
  await expect(page.getByTestId('contextual-alternatives')).not.toContainText('Deadlift');

  await page.goto('/exercises/deadlift');
  await expect(page.getByTestId('contextual-alternatives')).not.toContainText('T-bar Row');

  await page.goto('/exercises/prone-w-raise?muscleId=middle-lower-trapezius');
  await expect(page.getByTestId('contextual-alternatives')).not.toContainText('Superman');
});

test('exercise detail can start an active workout with the current exercise', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('musclemap.activeWorkout.v0.7');
    window.localStorage.removeItem('musclemap.workoutLogs.v0.3');
    window.localStorage.removeItem('musclemap.latestWorkoutLog.v0.3');
  });

  await page.goto('/exercises/lat-pulldown');
  await expect(page.getByTestId('exercise-active-workout-entry')).toContainText('当前无进行中的训练');
  await expect(page.getByTestId('start-workout-with-exercise')).toBeVisible();

  await page.getByTestId('start-workout-with-exercise').click();
  await expect(page).toHaveURL(/\/workout-log$/);
  await expect(page.getByTestId('active-workout-card')).toContainText('进行中');
  await expect(page.getByTestId('workout-log-exercise')).toContainText('Lat Pulldown');

  const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem('musclemap.activeWorkout.v0.7') ?? 'null'));
  expect(stored.exercises).toHaveLength(1);
  expect(stored.exercises[0].exerciseId).toBe('lat-pulldown');
  expect(stored.exercises[0].source).toBe('exercise-detail');
});

test('exercise detail adds exercises to an existing active workout without duplicates', async ({ page }) => {
  await page.goto('/workout-log');
  await page.evaluate(() => {
    window.localStorage.removeItem('musclemap.activeWorkout.v0.7');
  });
  await page.reload();
  await page.getByTestId('start-active-workout').click();
  await expect(page.getByTestId('active-workout-card')).toContainText('进行中');
  await page.getByTestId('manual-exercise-select').selectOption('lat-pulldown');
  await page.getByTestId('add-manual-exercise').click();
  await expect(page.getByTestId('workout-log-exercise')).toHaveCount(1);

  await page.goto('/exercises/seated-row');
  await expect(page.getByTestId('exercise-active-workout-entry')).toContainText('当前训练进行中');
  await page.getByTestId('add-exercise-to-active-workout').click();
  await expect(page.getByTestId('exercise-active-workout-status')).toContainText('已加入当前训练');
  await page.getByTestId('go-to-active-workout').click();
  await expect(page).toHaveURL(/\/workout-log$/);
  await expect(page.getByTestId('workout-log-exercise')).toHaveCount(2);
  await expect(page.getByTestId('workout-log-exercise').first()).toContainText('Lat Pulldown');
  await expect(page.getByTestId('workout-log-exercise').last()).toContainText('Seated Cable Row');

  await page.goto('/exercises/seated-row');
  await page.getByTestId('add-exercise-to-active-workout').click();
  await expect(page.getByTestId('exercise-active-workout-status')).toContainText('该动作已在当前训练中');
  await page.getByTestId('go-to-active-workout').click();
  await expect(page.getByTestId('workout-log-exercise')).toHaveCount(2);
});

test('exercise detail active workout entry does not overflow at 390px mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.localStorage.removeItem('musclemap.activeWorkout.v0.7');
  });
  await page.goto('/exercises/lat-pulldown');
  await expect(page.getByTestId('start-workout-with-exercise')).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalOverflow).toBe(false);
});

test('user can search and filter rowing exercises', async ({ page }) => {
  await page.goto('/exercises');
  await expect(page.getByText('结果包含主练该肌群的动作，也包含该肌群作为次要参与的动作。')).toBeVisible();
  await page.getByRole('textbox', { name: '搜索动作' }).fill('划船');
  await expect(page.getByRole('link', { name: /单臂哑铃划船/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /坐姿划船/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /杠铃划船/ })).toBeVisible();

  await page.getByLabel('涉及肌群').selectOption('latissimus-dorsi');
  await expect(page.getByRole('link', { name: /单臂哑铃划船/ })).toContainText('主练匹配');
  await expect(page.getByRole('link', { name: /坐姿划船/ })).toContainText('主练匹配');
  await expect(page.getByRole('link', { name: /哑铃耸肩/ })).toHaveCount(0);
});

test('latissimus dorsi filter distinguishes primary and secondary matches', async ({ page }) => {
  await page.goto('/exercises');
  await page.getByLabel('涉及肌群').selectOption('latissimus-dorsi');

  await expect(page.getByRole('link', { name: /高位下拉/ })).toContainText('主练匹配');
  await expect(page.getByRole('link', { name: '硬拉 动作详情', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /山羊挺身/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /罗马尼亚硬拉/ })).toHaveCount(0);
});

test('plan builder generates a persisted 3 day back focused gym plan', async ({ page }) => {
  await page.goto('/plan-builder');
  await page.getByLabel('训练目标').selectOption('hypertrophy');
  await page.getByLabel('每周训练天数').selectOption('3');
  await page.getByLabel('训练水平').selectOption('beginner');
  await page.getByLabel('可用器械').selectOption('fullGym');
  await page.getByRole('checkbox', { name: '背' }).check();
  await page.getByRole('button', { name: '生成计划' }).click();

  await expect(page.getByText('当前计划由本地规则生成，仅作为基础训练安排参考，不替代专业教练指导。')).toBeVisible();
  await expect(page.getByTestId('generated-workout-day')).toHaveCount(3);

  const pullDay = page.getByTestId('workout-day-pull');
  await expect(pullDay).toBeVisible();
  await expect(pullDay).toContainText(/高位下拉|引体向上|坐姿划船/);

  await page.getByRole('link', { name: /高位下拉|引体向上|坐姿划船/ }).first().click();
  await expect(page).toHaveURL(/\/exercises\/(lat-pulldown|pull-up|seated-row)$/);
  await expect(page.getByRole('heading', { name: /高位下拉|引体向上|坐姿划船/ })).toBeVisible();

  await page.goto('/plan-builder');
  await page.reload();
  await expect(page.getByText('最近生成计划')).toBeVisible();
  await expect(page.getByTestId('generated-workout-day')).toHaveCount(3);
});

test('bodyweight plan does not recommend unavailable equipment and shows shortage notice', async ({ page }) => {
  await page.goto('/plan-builder');
  await page.getByLabel('训练目标').selectOption('beginner');
  await page.getByLabel('每周训练天数').selectOption('3');
  await page.getByLabel('训练水平').selectOption('beginner');
  await page.getByLabel('可用器械').selectOption('bodyweight');
  await page.getByRole('button', { name: '生成计划' }).click();

  await expect(page.getByTestId('generated-workout-day')).toHaveCount(3);
  await expect(page.getByText('当前器械条件下可用动作较少，建议补充器械或切换到健身房完整器械。').first()).toBeVisible();
  await expect(page.getByTestId('generated-plan-result')).not.toContainText(/杠铃卧推|哑铃卧推|器械推胸|绳索夹胸|腿举|坐姿划船/);
});

test('3 day gym plan keeps push pull legs and core structure', async ({ page }) => {
  await page.goto('/plan-builder');
  await page.getByLabel('训练目标').selectOption('hypertrophy');
  await page.getByLabel('每周训练天数').selectOption('3');
  await page.getByLabel('训练水平').selectOption('intermediate');
  await page.getByLabel('可用器械').selectOption('fullGym');
  await page.getByRole('button', { name: '生成计划' }).click();

  await expect(page.getByTestId('workout-day-push')).toContainText(/杠铃卧推|哑铃卧推|器械推胸|俯卧撑/);
  await expect(page.getByTestId('workout-day-push')).toContainText(/哑铃推举|器械肩推|绳索下压|仰卧臂屈伸/);
  await expect(page.getByTestId('workout-day-pull')).toContainText(/高位下拉|引体向上|坐姿划船|单臂哑铃划船/);
  await expect(page.getByTestId('workout-day-pull')).toContainText(/哑铃弯举|锤式弯举/);
  await expect(page.getByTestId('workout-day-legs-core')).toContainText(/深蹲|腿举|腿屈伸|弓步蹲/);
  await expect(page.getByTestId('workout-day-legs-core')).toContainText(/平板支撑|卷腹|死虫|悬垂举腿/);

  const dayItems = page.getByTestId('generated-workout-day');
  for (let index = 0; index < 3; index += 1) {
    const count = await dayItems.nth(index).getByTestId('generated-plan-item').count();
    expect(count).toBeGreaterThanOrEqual(3);
    expect(count).toBeLessThanOrEqual(5);
  }
});

test('posture plan prioritizes scapular stability posterior chain and core control', async ({ page }) => {
  await page.goto('/plan-builder');
  await page.getByLabel('训练目标').selectOption('posture');
  await page.getByLabel('每周训练天数').selectOption('3');
  await page.getByLabel('训练水平').selectOption('beginner');
  await page.getByLabel('可用器械').selectOption('fullGym');
  await page.getByRole('button', { name: '生成计划' }).click();

  await expect(page.getByTestId('generated-plan-result')).toContainText(/面拉|反向飞鸟|俯身飞鸟|Y Raise|坐姿划船|胸托划船/);
  await expect(page.getByTestId('generated-plan-result')).toContainText(/罗马尼亚硬拉|山羊挺身|死虫|平板支撑|超人式/);
  await expect(page.getByTestId('workout-day-push')).not.toContainText(/杠铃卧推|器械推胸|器械肩推|绳索下压|仰卧臂屈伸/);
});

test('bodyweight beginner plan avoids unrealistic pull up prescription', async ({ page }) => {
  await page.goto('/plan-builder');
  await page.getByLabel('训练目标').selectOption('beginner');
  await page.getByLabel('每周训练天数').selectOption('3');
  await page.getByLabel('训练水平').selectOption('beginner');
  await page.getByLabel('可用器械').selectOption('bodyweight');
  await page.getByRole('button', { name: '生成计划' }).click();

  await expect(page.getByTestId('workout-day-pull')).not.toContainText('引体向上');
  await expect(page.getByTestId('workout-day-pull')).toContainText(/反向划船|毛巾划船|俯卧 W Raise|当前徒手背部动作较少/);
});

test('strength plan separates main lifts and assistance prescriptions', async ({ page }) => {
  await page.goto('/plan-builder');
  await page.getByLabel('训练目标').selectOption('strength');
  await page.getByLabel('每周训练天数').selectOption('3');
  await page.getByLabel('训练水平').selectOption('intermediate');
  await page.getByLabel('可用器械').selectOption('fullGym');
  await page.getByRole('button', { name: '生成计划' }).click();

  await expect(page.getByTestId('generated-plan-result').getByText('3-6').first()).toBeVisible();
  await expect(page.getByTestId('generated-plan-result').getByText(/8-12|10-15/).first()).toBeVisible();
  await expect(page.getByTestId('generated-plan-result').getByText(/休息 150 秒|休息 180 秒/).first()).toBeVisible();
  await expect(page.getByTestId('generated-plan-result').getByText(/休息 60 秒|休息 75 秒|休息 90 秒/).first()).toBeVisible();
});

test('plan builder keeps mobile bottom content above navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/plan-builder');
  await page.getByLabel('训练目标').selectOption('hypertrophy');
  await page.getByLabel('每周训练天数').selectOption('5');
  await page.getByLabel('训练水平').selectOption('beginner');
  await page.getByLabel('可用器械').selectOption('fullGym');
  await page.getByRole('button', { name: '生成计划' }).click();

  const lastDay = page.getByTestId('generated-workout-day').last();
  await lastDay.scrollIntoViewIfNeeded();
  const lastDayBox = await lastDay.boundingBox();
  const navBox = await page.locator('nav').boundingBox();

  expect(lastDayBox).not.toBeNull();
  expect(navBox).not.toBeNull();
  expect(lastDayBox!.y + lastDayBox!.height).toBeLessThanOrEqual(navBox!.y);
});

test('workout log starts active workout from latest plan day and archives plan id', async ({ page }) => {
  await page.goto('/workout-log');
  await page.evaluate(() => {
    window.localStorage.setItem(
      'musclemap.latestGeneratedPlan.v0.2',
      JSON.stringify({
        id: 'plan-v072',
        name: 'V0.7.2 Test Plan',
        input: {
          goal: 'hypertrophy',
          daysPerWeek: 3,
          level: 'beginner',
          availableEquipment: 'fullGym',
          focusBodyParts: ['back']
        },
        createdAt: '2026-05-25T00:00:00.000Z',
        days: [
          {
            id: 'pull-day',
            name: 'Pull Day',
            focus: 'Back',
            items: [
              {
                exerciseId: 'lat-pulldown',
                sets: 3,
                repRange: '8-12',
                restSeconds: 90,
                targetMuscles: ['latissimus-dorsi'],
                note: 'Keep shoulders down'
              },
              {
                exerciseId: 'seated-row',
                sets: 2,
                repRange: '10-12',
                restSeconds: 75,
                targetMuscles: ['rhomboids']
              }
            ]
          }
        ]
      })
    );
    window.localStorage.removeItem('musclemap.activeWorkout.v0.7');
    window.localStorage.removeItem('musclemap.workoutLogs.v0.3');
    window.localStorage.removeItem('musclemap.latestWorkoutLog.v0.3');
  });

  await page.reload();
  await expect(page.getByTestId('latest-plan-start')).toContainText('从最近计划开始训练');
  await expect(page.getByTestId('latest-plan-start')).toContainText('V0.7.2 Test Plan');
  await page.getByTestId('start-plan-day-pull-day').click();

  await expect(page.getByTestId('active-workout-card')).toContainText('进行中');
  await expect(page.getByTestId('workout-log-exercise')).toHaveCount(2);
  const firstExercise = page.getByTestId('workout-log-exercise').first();
  await expect(firstExercise).toContainText('Lat Pulldown');
  await expect(firstExercise).toContainText('计划建议');
  await expect(firstExercise).toContainText('8-12');
  await expect(firstExercise).toContainText('90');
  await expect(firstExercise).toContainText('Keep shoulders down');
  await expect(firstExercise.getByTestId('workout-set-row')).toHaveCount(3);
  await expect(firstExercise.getByTestId('set-reps-input').first()).toHaveValue('');

  const active = await page.evaluate(() => JSON.parse(window.localStorage.getItem('musclemap.activeWorkout.v0.7') ?? 'null'));
  expect(active.source).toBe('plan');
  expect(active.planId).toBe('plan-v072');
  expect(active.planDayId).toBe('pull-day');
  expect(active.exercises[0].planned.repRange).toBe('8-12');
  expect(active.exercises[0].sets[0].reps).toBeUndefined();

  await page.reload();
  await expect(page.getByTestId('workout-log-exercise')).toHaveCount(2);
  await page.getByTestId('workout-log-exercise').first().getByTestId('set-weight-input').first().fill('40');
  await page.getByTestId('workout-log-exercise').first().getByTestId('set-reps-input').first().fill('10');
  await page.getByTestId('end-active-workout').click();

  const latest = await page.evaluate(() => JSON.parse(window.localStorage.getItem('musclemap.latestWorkoutLog.v0.3') ?? 'null'));
  expect(latest.planId).toBe('plan-v072');
  expect(latest.exercises).toHaveLength(1);
  expect(await page.evaluate(() => window.localStorage.getItem('musclemap.activeWorkout.v0.7'))).toBeNull();
});

test('workout log blocks starting a plan day when active workout already exists on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'musclemap.latestGeneratedPlan.v0.2',
      JSON.stringify({
        id: 'plan-existing-active',
        name: 'Existing Active Plan',
        input: {
          goal: 'hypertrophy',
          daysPerWeek: 3,
          level: 'beginner',
          availableEquipment: 'fullGym',
          focusBodyParts: ['back']
        },
        createdAt: '2026-05-25T00:00:00.000Z',
        days: [
          {
            id: 'blocked-day',
            name: 'Blocked Day',
            focus: 'Back',
            items: [{ exerciseId: 'seated-row', sets: 2, repRange: '10-12', restSeconds: 75, targetMuscles: ['rhomboids'] }]
          }
        ]
      })
    );
    window.localStorage.removeItem('musclemap.activeWorkout.v0.7');
  });

  await page.goto('/workout-log');
  await page.getByTestId('start-active-workout').click();
  await page.getByTestId('start-plan-day-blocked-day').click();
  await expect(page.getByTestId('save-status')).toContainText('当前已有进行中的训练，请先结束或放弃当前训练');
  await expect(page.getByTestId('workout-log-exercise')).toHaveCount(0);

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalOverflow).toBe(false);
});









test('workout log active workout flow persists edits archives and clears', async ({ page }) => {
  await page.goto('/workout-log');
  await page.evaluate(() => {
    window.localStorage.removeItem('musclemap.latestGeneratedPlan.v0.2');
    window.localStorage.removeItem('musclemap.workoutLogs.v0.3');
    window.localStorage.removeItem('musclemap.latestWorkoutLog.v0.3');
    window.localStorage.removeItem('musclemap.activeWorkout.v0.7');
  });
  await page.reload();

  await expect(page.getByTestId('active-workout-empty')).toContainText('当前无进行中的训练');
  await page.getByTestId('start-active-workout').click();
  await expect(page.getByTestId('active-workout-card')).toContainText('进行中');

  await page.reload();
  await expect(page.getByTestId('active-workout-card')).toContainText('进行中');

  await page.getByTestId('manual-exercise-select').selectOption('lat-pulldown');
  await page.getByTestId('add-manual-exercise').click();

  const exercise = page.getByTestId('workout-log-exercise').first();
  await expect(exercise).toBeVisible();
  await exercise.getByTestId('set-weight-input').fill('42.5');
  await exercise.getByTestId('set-reps-input').fill('10');
  await exercise.getByTestId('exercise-notes-input').fill('controlled first working set');
  await page.getByTestId('end-active-workout').click();

  await expect(page.getByTestId('save-status')).toContainText('训练已结束并保存');
  await expect(page.getByTestId('active-workout-empty')).toBeVisible();
  expect(await page.evaluate(() => window.localStorage.getItem('musclemap.activeWorkout.v0.7'))).toBeNull();
  await page.reload();
  await expect(page.getByTestId('latest-workout-log')).toContainText('Lat Pulldown');
  await expect(page.getByTestId('latest-workout-log')).toContainText('42.5kg');
  await expect(page.getByTestId('latest-workout-log')).toContainText('controlled first working set');
});

test('workout log rejects empty active workout before archiving', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('musclemap.latestGeneratedPlan.v0.2');
    window.localStorage.removeItem('musclemap.workoutLogs.v0.3');
    window.localStorage.removeItem('musclemap.latestWorkoutLog.v0.3');
    window.localStorage.removeItem('musclemap.activeWorkout.v0.7');
  });

  await page.goto('/workout-log');
  await page.getByTestId('start-active-workout').click();
  await page.getByTestId('end-active-workout').click();

  await expect(page.getByTestId('save-status')).toContainText('请先添加至少一个动作');
  const stored = await page.evaluate(() => window.localStorage.getItem('musclemap.latestWorkoutLog.v0.3'));
  expect(stored).toBeNull();
});

test('workout log rejects empty sets and invalid reps in active workout', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('musclemap.latestGeneratedPlan.v0.2');
    window.localStorage.removeItem('musclemap.workoutLogs.v0.3');
    window.localStorage.removeItem('musclemap.latestWorkoutLog.v0.3');
    window.localStorage.removeItem('musclemap.activeWorkout.v0.7');
  });

  await page.goto('/workout-log');
  await page.getByTestId('start-active-workout').click();
  await page.getByTestId('manual-exercise-select').selectOption('lat-pulldown');
  await page.getByTestId('add-manual-exercise').click();
  await page.getByTestId('end-active-workout').click();
  await expect(page.getByTestId('save-status')).toContainText('请至少填写一组重量或次数');

  const exercise = page.getByTestId('workout-log-exercise').first();
  await exercise.getByTestId('set-reps-input').fill('10.5');
  await page.getByTestId('end-active-workout').click();
  await expect(page.getByTestId('save-status')).toContainText('次数必须是整数');
});

test('workout log can discard active workout after confirmation', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('musclemap.workoutLogs.v0.3');
    window.localStorage.removeItem('musclemap.latestWorkoutLog.v0.3');
    window.localStorage.removeItem('musclemap.activeWorkout.v0.7');
  });

  await page.goto('/workout-log');
  await page.getByTestId('start-active-workout').click();
  await page.getByTestId('manual-exercise-select').selectOption('lat-pulldown');
  await page.getByTestId('add-manual-exercise').click();

  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    await dialog.dismiss();
  });
  await page.getByTestId('discard-active-workout').click();
  await expect(page.getByTestId('active-workout-card')).toBeVisible();

  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    await dialog.accept();
  });
  await page.getByTestId('discard-active-workout').click();
  await expect(page.getByTestId('active-workout-empty')).toBeVisible();
  expect(await page.evaluate(() => window.localStorage.getItem('musclemap.activeWorkout.v0.7'))).toBeNull();
});

test('workout log can add and delete sets and exercises in active workout', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('musclemap.latestGeneratedPlan.v0.2');
    window.localStorage.removeItem('musclemap.workoutLogs.v0.3');
    window.localStorage.removeItem('musclemap.latestWorkoutLog.v0.3');
    window.localStorage.removeItem('musclemap.activeWorkout.v0.7');
  });

  await page.goto('/workout-log');
  await page.getByTestId('start-active-workout').click();
  await page.getByTestId('manual-exercise-select').selectOption('lat-pulldown');
  await page.getByTestId('add-manual-exercise').click();

  const exercise = page.getByTestId('workout-log-exercise').first();
  await expect(exercise.getByTestId('workout-set-row')).toHaveCount(1);
  await exercise.getByTestId('add-set').click();
  await expect(exercise.getByTestId('workout-set-row')).toHaveCount(2);
  await exercise.getByTestId('delete-set').last().click();
  await expect(exercise.getByTestId('workout-set-row')).toHaveCount(1);
  await exercise.getByTestId('delete-workout-exercise').click();
  await expect(page.getByTestId('workout-log-exercise')).toHaveCount(0);
});

test('workout log active controls are available above mobile navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/workout-log');
  await page.evaluate(() => {
    window.localStorage.removeItem('musclemap.activeWorkout.v0.7');
  });
  await page.reload();
  await page.getByTestId('start-active-workout').click();
  await page.getByTestId('manual-exercise-select').selectOption('lat-pulldown');
  await page.getByTestId('add-manual-exercise').click();

  const endButton = page.getByTestId('end-active-workout-bottom');
  await endButton.scrollIntoViewIfNeeded();
  const buttonBox = await endButton.boundingBox();
  const navBox = await page.locator('nav').boundingBox();

  expect(buttonBox).not.toBeNull();
  expect(navBox).not.toBeNull();
  expect(buttonBox!.y + buttonBox!.height).toBeLessThanOrEqual(navBox!.y);
  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalOverflow).toBe(false);
});

test('core pages are usable on mobile viewport and static data survives refresh', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/muscle-map');
  await page.getByRole('button', { name: /左背阔肌/ }).click();
  await expect(page.getByRole('heading', { name: '背阔肌' })).toBeVisible();

  await page.goto('/exercises/lat-pulldown');
  await page.reload();
  await expect(page.getByRole('heading', { name: '高位下拉' })).toBeVisible();

  await page.goto('/exercises');
  await expect(page.getByRole('textbox', { name: '搜索动作' })).toBeVisible();
  await expect(page.locator('body')).not.toHaveCSS('overflow-x', 'scroll');
});
test('data management exports current local backup data', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'musclemap.latestGeneratedPlan.v0.2',
      JSON.stringify({
        id: 'plan-backup',
        name: 'Backup Plan',
        input: {
          goal: 'hypertrophy',
          daysPerWeek: 3,
          level: 'beginner',
          availableEquipment: 'fullGym',
          focusBodyParts: []
        },
        days: [],
        createdAt: '2026-05-25T00:00:00.000Z'
      })
    );
    window.localStorage.setItem(
      'musclemap.workoutLogs.v0.3',
      JSON.stringify([
        {
          id: 'log-1',
          date: '2026-05-25',
          exercises: [{ id: 'exercise-1', exerciseId: 'lat-pulldown', order: 0, sets: [{ id: 'set-1', setIndex: 1, reps: 12, completed: true }] }],
          createdAt: '2026-05-25T00:00:00.000Z'
        },
        {
          id: 'log-2',
          date: '2026-05-24',
          exercises: [{ id: 'exercise-2', exerciseId: 'seated-row', order: 0, sets: [{ id: 'set-2', setIndex: 1, weight: 40, completed: true }] }],
          createdAt: '2026-05-24T00:00:00.000Z'
        }
      ])
    );
    window.localStorage.setItem(
      'musclemap.latestWorkoutLog.v0.3',
      JSON.stringify({
        id: 'log-1',
        date: '2026-05-25',
        exercises: [{ id: 'exercise-1', exerciseId: 'lat-pulldown', order: 0, sets: [{ id: 'set-1', setIndex: 1, reps: 12, completed: true }] }],
        createdAt: '2026-05-25T00:00:00.000Z'
      })
    );
  });

  await page.goto('/');
  await page.getByRole('link', { name: '数据备份与恢复' }).click();
  await expect(page).toHaveURL(/\/data-management$/);
  await expect(page.getByText('进行中的训练不会导出，请先结束训练后再备份。')).toBeVisible();
  await expect(page.getByRole('heading', { name: '数据备份与恢复' })).toBeVisible();
  await expect(page.getByTestId('backup-workout-log-count')).toContainText('2 条');

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('export-backup-json').click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    stream?.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream?.on('end', resolve);
    stream?.on('error', reject);
  });
  const exported = JSON.parse(Buffer.concat(chunks).toString('utf8'));

  expect(download.suggestedFilename()).toMatch(/^musclemap-backup-\d{4}-\d{2}-\d{2}\.json$/);
  expect(exported.app).toBe('MuscleMap Fitness');
  expect(exported.exportVersion).toBe(1);
  expect(typeof exported.exportedAt).toBe('string');
  expect(exported.data.workoutLogs).toHaveLength(2);
});

test('data management validates imported backup files before overwriting storage', async ({ page }) => {
  await page.goto('/data-management');
  await page.evaluate(() => {
    window.localStorage.setItem(
      'musclemap.latestWorkoutLog.v0.3',
      JSON.stringify({
        id: 'existing-log',
        date: '2026-05-20',
        exercises: [{ id: 'existing-exercise', exerciseId: 'lat-pulldown', order: 0, sets: [{ id: 'existing-set', setIndex: 1, reps: 8, completed: true }] }],
        createdAt: '2026-05-20T00:00:00.000Z'
      })
    );
  });

  await page.reload();
  await expect(page.getByRole('heading', { name: '数据备份与恢复' })).toBeVisible();

  await page.setInputFiles('input[data-testid="import-backup-file"]', {
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{bad json')
  });
  await expect(page.getByTestId('backup-status')).toContainText('文件内容不是有效 JSON。');

  await page.setInputFiles('input[data-testid="import-backup-file"]', {
    name: 'other.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ app: 'Other App', exportVersion: 1, exportedAt: '2026-05-25T00:00:00.000Z', data: {} }))
  });
  await expect(page.getByTestId('backup-status')).toContainText('这不是 MuscleMap Fitness 的导出文件。');

  await page.setInputFiles('input[data-testid="import-backup-file"]', {
    name: 'future.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ app: 'MuscleMap Fitness', exportVersion: 99, exportedAt: '2026-05-25T00:00:00.000Z', data: {} }))
  });
  await expect(page.getByTestId('backup-status')).toContainText('当前版本不支持该备份文件。');

  const validBackup = {
    app: 'MuscleMap Fitness',
    exportVersion: 1,
    exportedAt: '2026-05-25T08:00:00.000Z',
    data: {
      latestGeneratedPlan: null,
      workoutLogs: [
        {
          id: 'imported-log',
          date: '2026-05-25',
          exercises: [{ id: 'imported-exercise', exerciseId: 'seated-row', order: 0, sets: [{ id: 'imported-set', setIndex: 1, weight: 42.5, reps: 10, completed: true }] }],
          createdAt: '2026-05-25T08:00:00.000Z'
        }
      ],
      latestWorkoutLog: {
        id: 'imported-log',
        date: '2026-05-25',
        exercises: [{ id: 'imported-exercise', exerciseId: 'seated-row', order: 0, sets: [{ id: 'imported-set', setIndex: 1, weight: 42.5, reps: 10, completed: true }] }],
        createdAt: '2026-05-25T08:00:00.000Z'
      }
    }
  };

  await page.setInputFiles('input[data-testid="import-backup-file"]', {
    name: 'musclemap.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(validBackup))
  });

  await expect(page.getByTestId('import-summary')).toContainText('训练记录：1 条');
  await expect(page.getByTestId('import-summary')).toContainText('最近训练记录：有');
  expect(await page.evaluate(() => JSON.parse(window.localStorage.getItem('musclemap.latestWorkoutLog.v0.3') ?? 'null').id)).toBe('existing-log');

  await page.getByTestId('confirm-overwrite-import').click();
  await expect(page.getByTestId('backup-status')).toContainText('导入成功，当前本地数据已更新。');
  expect(await page.evaluate(() => window.localStorage.getItem('musclemap.latestGeneratedPlan.v0.2'))).toBeNull();
  expect(await page.evaluate(() => JSON.parse(window.localStorage.getItem('musclemap.workoutLogs.v0.3') ?? '[]'))).toHaveLength(1);
  expect(await page.evaluate(() => JSON.parse(window.localStorage.getItem('musclemap.latestWorkoutLog.v0.3') ?? 'null').id)).toBe('imported-log');

  await page.reload();
  await expect(page.getByTestId('backup-workout-log-count')).toContainText('1 条');
  await page.goto('/workout-log');
  await expect(page.getByTestId('latest-workout-log')).toContainText('Seated Cable Row');
});

test('data management remains usable on mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/data-management');
  await expect(page.getByRole('heading', { name: '数据备份与恢复' })).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalOverflow).toBe(false);
});
