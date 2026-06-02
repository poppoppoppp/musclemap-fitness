import { expect, test } from '@playwright/test';

import { exerciseTrajectories } from '../data/exerciseTrajectories';
import { threeModelRegions } from '../data/threeModelRegions';
import { upperBodyLocalMeshMappings } from '../data/upperBodyLocalMeshMappings';

test('three model region registry defines V0.10.0 regions and experimental back mapping', () => {
  expect(threeModelRegions.map((region) => region.id)).toEqual([
    'back-partial',
    'box-test',
    'front-upper',
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
  expect(backPartial?.limitations).toContain('当前模型未包含 latissimus-dorsi / 背阔肌真实 mesh');
  expect(backPartial?.limitations).toContain('背阔肌当前使用简化 3D 示意区域补充选择入口');
  expect(backPartial?.mappings.Simplified_left_latissimus_dorsi).toBe('latissimus-dorsi');
  expect(backPartial?.mappings.Simplified_right_latissimus_dorsi).toBe('latissimus-dorsi');
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

  const frontUpper = threeModelRegions.find((region) => region.id === 'front-upper');
  expect(frontUpper).toMatchObject({
    label: '正面上半身',
    view: 'anterior',
    isPrivateModel: false,
    isConfigured: true,
    isExperimental: true
  });
  expect(frontUpper?.modelPath).toBeUndefined();
  expect(new Set(Object.values(frontUpper?.mappings ?? {}))).toEqual(
    new Set([
      'pectoralis-major',
      'anterior-deltoid',
      'lateral-deltoid',
      'biceps-brachii',
      'triceps-brachii',
      'rectus-abdominis',
      'obliques'
    ])
  );

  const legs = threeModelRegions.find((region) => region.id === 'legs');
  expect(legs).toMatchObject({
    view: 'anterior',
    isPrivateModel: false,
    isConfigured: true,
    isExperimental: true
  });
  expect(legs?.modelPath).toBeUndefined();
  expect(new Set(Object.values(legs?.mappings ?? {}))).toEqual(
    new Set(['gluteus-maximus', 'quadriceps', 'hamstrings', 'calves'])
  );

  for (const id of ['chest', 'shoulders-arms', 'core']) {
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

test('three muscle selector exposes lower body simplified hotspots grouped by muscle id', async ({ page }) => {
  await page.goto('/three-muscle-selector');
  await page.getByTestId('select-three-region-legs').click();

  await expect(page.getByTestId('three-muscle-canvas')).toBeVisible();
  await expect(page.getByTestId('three-lower-body-note')).toBeVisible();
  await expect(page.getByTestId('three-lower-body-note')).toContainText('3D');
  await expect(page.getByTestId('three-lower-body-note')).toContainText('hotspot');

  for (const muscleId of ['gluteus-maximus', 'quadriceps', 'hamstrings', 'calves']) {
    await expect(page.getByTestId(`select-three-muscle-option-${muscleId}`)).toHaveCount(1);
    await page.getByTestId(`select-three-muscle-option-${muscleId}`).click();
    await expect(page.getByTestId(`select-three-muscle-option-${muscleId}`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('three-selected-muscle-id')).toContainText(muscleId);
    await expect(page.getByTestId('three-selected-muscle-name')).toBeVisible();
    await expect(page.getByTestId('three-selected-muscle-description')).toBeVisible();
    await expect(page.getByTestId('three-related-exercises')).toBeVisible();
    await expect(page.getByTestId('three-related-actions-link')).toBeVisible();
    await expect(page.getByTestId('three-muscle-detail-link')).toBeVisible();
    await expect(page.locator('[data-testid^="three-add-exercise-"]').first()).toBeVisible();
  }
});

test('three muscle selector adds lower body exercises to active workout without duplicates', async ({ page }) => {
  await page.goto('/three-muscle-selector');
  await page.evaluate(() => {
    window.localStorage.removeItem('musclemap.activeWorkout.v0.7');
  });
  await page.reload();

  await page.getByTestId('select-three-region-legs').click();
  await page.getByTestId('select-three-muscle-option-gluteus-maximus').click();
  await page.getByTestId('three-add-exercise-squat').click();
  await expect(page).toHaveURL(/\/workout-log$/);
  await expect(page.getByTestId('workout-log-exercise')).toHaveCount(1);
  await expect(page.getByTestId('workout-log-exercise').first()).toContainText('Squat');

  await page.goto('/three-muscle-selector');
  await page.getByTestId('select-three-region-legs').click();
  await page.getByTestId('select-three-muscle-option-quadriceps').click();
  await page.getByTestId('three-add-exercise-leg-extension').click();
  await expect(page).toHaveURL(/\/workout-log$/);
  await expect(page.getByTestId('workout-log-exercise')).toHaveCount(2);
  await expect(page.getByTestId('workout-log-exercise').nth(1)).toContainText('Leg Extension');

  let active = await page.evaluate(() => JSON.parse(window.localStorage.getItem('musclemap.activeWorkout.v0.7') ?? 'null'));
  expect(active.exercises.map((exercise: { exerciseId: string }) => exercise.exerciseId)).toEqual(['squat', 'leg-extension']);

  await page.goto('/three-muscle-selector');
  await page.getByTestId('select-three-region-legs').click();
  await page.getByTestId('select-three-muscle-option-gluteus-maximus').click();
  await page.getByTestId('three-add-exercise-squat').click();
  await expect(page.getByTestId('three-active-workout-status')).toContainText('Squat');

  active = await page.evaluate(() => JSON.parse(window.localStorage.getItem('musclemap.activeWorkout.v0.7') ?? 'null'));
  expect(active.exercises.map((exercise: { exerciseId: string }) => exercise.exerciseId)).toEqual(['squat', 'leg-extension']);
});

test('three muscle selector lower body actions can open exercise detail and workout log inputs on mobile', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/three-muscle-selector');
  await page.evaluate(() => {
    window.localStorage.removeItem('musclemap.activeWorkout.v0.7');
  });
  await page.reload();

  await page.getByTestId('select-three-region-legs').click();
  await page.getByTestId('select-three-muscle-option-calves').click();
  await page.getByTestId('three-related-exercise-link-standing-calf-raise').click();
  await expect(page).toHaveURL(/\/exercises\/standing-calf-raise\?muscleId=calves$/);

  await page.goto('/three-muscle-selector');
  await page.getByTestId('select-three-region-legs').click();
  await page.getByTestId('select-three-muscle-option-calves').click();
  await page.getByTestId('three-add-exercise-standing-calf-raise').click();
  await expect(page).toHaveURL(/\/workout-log$/);
  await expect(page.getByTestId('workout-log-exercise')).toHaveCount(1);
  await expect(page.getByTestId('set-weight-input').first()).toBeVisible();
  await expect(page.getByTestId('set-reps-input').first()).toBeVisible();
  await expect(page.getByTestId('exercise-notes-input').first()).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalOverflow).toBe(false);
});

test('three muscle selector presents a product entry for choosing training muscles', async ({ page }) => {
  await page.goto('/three-muscle-selector');

  await expect(page.getByRole('heading', { name: '3D 肌群选择' })).toBeVisible();
  await expect(page.getByText('选择想练的身体部位')).toBeVisible();
  await expect(page.getByTestId('three-region-selector')).toBeVisible();
  await expect(page.getByTestId('select-three-region-front-upper')).toContainText('正面上半身');
  await expect(page.getByTestId('select-three-region-back-partial')).toContainText('背部局部');
  await expect(page.getByTestId('select-three-region-back-partial')).toContainText('当前可选');
  await expect(page.getByTestId('select-three-region-chest')).toContainText('胸部，暂未配置');
  await expect(page.getByTestId('select-three-region-legs')).toContainText('臀腿');
  await expect(page.getByTestId('select-three-region-legs')).toContainText('简化 3D 入口');
  await expect(page.getByTestId('select-three-region-shoulders-arms')).toContainText('肩臂，暂未配置');
  await expect(page.getByTestId('select-three-region-core')).toContainText('核心，暂未配置');
  await expect(page.getByTestId('select-three-region-box-test')).toContainText('GLB 管线测试，开发验证');

  await expect(page.getByTestId('three-current-region-label')).toContainText('背部局部');
  await expect(page.getByTestId('three-region-limitations')).toContainText('当前背部局部实验模型未包含背阔肌');
  await expect(page.getByTestId('three-region-limitations')).toContainText('当前模型仅覆盖部分背部肌群');
  await expect(page.getByText('点击模型中的肌肉区域，查看它能怎么练。')).toBeVisible();
  await expect(page.getByText('mesh.name')).not.toBeVisible();
});

test('three muscle selector exposes front upper body simplified hotspots grouped by muscle id', async ({ page }) => {
  await page.goto('/three-muscle-selector');
  await page.getByTestId('select-three-region-front-upper').click();

  await expect(page.getByTestId('three-current-region-label')).toContainText('正面上半身');
  await expect(page.getByTestId('three-front-upper-note')).toContainText('简化 3D 示意区域');
  await expect(page.getByTestId('three-front-upper-note')).toContainText('不是精确真实解剖模型');
  await expect(page.getByTestId('glb-load-status')).toContainText(/简化示意可用|加载成功/, { timeout: 15000 });

  for (const muscleId of [
    'pectoralis-major',
    'anterior-deltoid',
    'lateral-deltoid',
    'biceps-brachii',
    'triceps-brachii',
    'rectus-abdominis',
    'obliques'
  ]) {
    await expect(page.getByTestId(`select-three-muscle-option-${muscleId}`)).toHaveCount(1);
    await page.getByTestId(`select-three-muscle-option-${muscleId}`).click();
    await expect(page.getByTestId(`select-three-muscle-option-${muscleId}`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('three-selected-muscle-id')).toContainText(muscleId);
    await expect(page.getByTestId('three-selected-muscle-name')).not.toContainText('未映射');
    await expect(page.getByTestId('three-selected-muscle-description')).toBeVisible();
    await expect(page.getByTestId('three-related-exercises')).toBeVisible();
    await expect(page.getByTestId('three-related-actions-link')).toBeVisible();
    await expect(page.getByTestId('three-muscle-detail-link')).toBeVisible();
    await expect(page.locator('[data-testid^="three-add-exercise-"]').first()).toBeVisible();
  }
});

test('upper body local mesh mapping uses only V0.19 reported mesh names', () => {
  expect(upperBodyLocalMeshMappings).toMatchObject({
    right_clavicular_part_of_pectoralis_major: 'pectoralis-major',
    left_clavicular_part_of_pectoralis_major: 'pectoralis-major',
    right_sternocostal_part_of_pectoralis_major: 'pectoralis-major',
    left_sternocostal_part_of_pectoralis_major: 'pectoralis-major',
    right_abdominal_part_of_pectoralis_major: 'pectoralis-major',
    left_abdominal_part_of_pectoralis_major: 'pectoralis-major',
    right_clavicular_part_of_deltoid: 'anterior-deltoid',
    left_clavicular_part_of_deltoid: 'anterior-deltoid',
    right_acromial_part_of_deltoid: 'lateral-deltoid',
    left_acromial_part_of_deltoid: 'lateral-deltoid',
    right_short_head_of_biceps_brachii: 'biceps-brachii',
    left_short_head_of_biceps_brachii: 'biceps-brachii',
    right_long_head_of_biceps_brachii: 'biceps-brachii',
    left_long_head_of_biceps_brachii: 'biceps-brachii',
    right_lateral_head_of_triceps_brachii: 'triceps-brachii',
    left_lateral_head_of_triceps_brachii: 'triceps-brachii',
    right_long_head_of_triceps_brachii: 'triceps-brachii',
    left_long_head_of_triceps_brachii: 'triceps-brachii',
    right_medial_head_of_triceps_brachii: 'triceps-brachii',
    left_medial_head_of_triceps_brachii: 'triceps-brachii',
    right_external_oblique: 'obliques',
    left_external_oblique: 'obliques'
  });
  expect(new Set(Object.values(upperBodyLocalMeshMappings))).toEqual(
    new Set(['pectoralis-major', 'anterior-deltoid', 'lateral-deltoid', 'biceps-brachii', 'triceps-brachii', 'obliques'])
  );
  expect(Object.values(upperBodyLocalMeshMappings)).not.toContain('rectus-abdominis');
});

test('three muscle selector uses front upper local model and hotspot hybrid when local model exists', async ({ page }) => {
  await page.goto('/three-muscle-selector');
  await page.getByTestId('select-three-region-front-upper').click();

  const status = page.getByTestId('three-front-upper-mode-status');
  await expect(status).toContainText(/本地真实模型 \+ hotspot 兜底|简化 hotspot 模式/, { timeout: 15000 });

  if ((await status.textContent())?.includes('本地真实模型')) {
    await expect(page.getByTestId('glb-load-status')).toContainText('加载成功');
    await expect(page.getByTestId('glb-mesh-count')).toContainText(/2[3-9]|3[0-9]/);
    await page.getByTestId('select-three-muscle-option-pectoralis-major').click();
    await expect(page.getByTestId('glb-selected-mesh-name')).toContainText('pectoralis_major');
    await expect(page.getByTestId('three-selected-muscle-id')).toContainText('pectoralis-major');
    await expect(page.getByTestId('three-mapping-source')).toContainText('real-mesh');
  }

  await page.getByTestId('select-three-muscle-option-rectus-abdominis').click();
  await expect(page.getByTestId('three-selected-muscle-id')).toContainText('rectus-abdominis');
  await expect(page.getByTestId('three-mapping-source')).toContainText('hotspot');
});

test('three muscle selector falls back to front upper hotspots when local model is missing', async ({ page }) => {
  await page.route('**/models/private/upper-body-local.glb', async (route) => {
    await route.fulfill({ status: 404, contentType: 'text/plain', body: 'missing in deployed environment' });
  });

  await page.goto('/three-muscle-selector');
  await page.getByTestId('select-three-region-front-upper').click();

  await expect(page.getByTestId('three-front-upper-mode-status')).toContainText('简化 hotspot 模式');
  await expect(page.getByTestId('glb-load-status')).toContainText('简化示意可用');
  await expect(page.getByTestId('select-three-muscle-option-pectoralis-major')).toHaveCount(1);
  await expect(page.getByTestId('select-three-muscle-option-rectus-abdominis')).toHaveCount(1);
  await page.getByTestId('select-three-muscle-option-rectus-abdominis').click();
  await expect(page.getByTestId('three-selected-muscle-id')).toContainText('rectus-abdominis');
  await expect(page.getByTestId('three-mapping-source')).toContainText('hotspot');
});

test('three muscle selector adds front upper body exercises to active workout without duplicates', async ({ page }) => {
  await page.goto('/three-muscle-selector');
  await page.evaluate(() => {
    window.localStorage.removeItem('musclemap.activeWorkout.v0.7');
  });
  await page.reload();

  await page.getByTestId('select-three-region-front-upper').click();
  await page.getByTestId('select-three-muscle-option-pectoralis-major').click();
  await page.getByTestId('three-add-exercise-push-up').click();
  await expect(page).toHaveURL(/\/workout-log$/);
  await expect(page.getByTestId('workout-log-exercise')).toHaveCount(1);
  await expect(page.getByTestId('workout-log-exercise').first()).toContainText('Push-up');

  await page.goto('/three-muscle-selector');
  await page.getByTestId('select-three-region-front-upper').click();
  await page.getByTestId('select-three-muscle-option-biceps-brachii').click();
  await page.getByTestId('three-add-exercise-dumbbell-curl').click();
  await expect(page).toHaveURL(/\/workout-log$/);
  await expect(page.getByTestId('workout-log-exercise')).toHaveCount(2);
  await expect(page.getByTestId('workout-log-exercise').nth(1)).toContainText('Dumbbell Curl');

  let active = await page.evaluate(() => JSON.parse(window.localStorage.getItem('musclemap.activeWorkout.v0.7') ?? 'null'));
  expect(active.exercises.map((exercise: { exerciseId: string }) => exercise.exerciseId)).toEqual(['push-up', 'dumbbell-curl']);

  await page.goto('/three-muscle-selector');
  await page.getByTestId('select-three-region-front-upper').click();
  await page.getByTestId('select-three-muscle-option-pectoralis-major').click();
  await page.getByTestId('three-add-exercise-push-up').click();
  await expect(page.getByTestId('three-active-workout-status')).toContainText('Push-up');

  active = await page.evaluate(() => JSON.parse(window.localStorage.getItem('musclemap.activeWorkout.v0.7') ?? 'null'));
  expect(active.exercises.map((exercise: { exerciseId: string }) => exercise.exerciseId)).toEqual(['push-up', 'dumbbell-curl']);
});

test('three muscle selector bridges mapped back meshes to muscle and exercise entry points', async ({ page }) => {
  await page.goto('/three-muscle-selector');
  await page.getByTestId('select-three-region-back-partial').click();
  await page.getByTestId('select-three-muscle-option-teres-major').click();

  await expect(page.getByTestId('three-selected-muscle-name')).toContainText('大圆肌');
  await expect(page.getByTestId('three-selected-muscle-description')).toContainText('位于肩胛骨外侧缘附近');
  await expect(page.getByTestId('three-related-exercises')).toContainText('直臂下拉');
  await expect(page.getByTestId('three-related-exercises')).toContainText('高位下拉');
  await expect(page.getByTestId('three-selected-unmapped-state')).toHaveCount(0);

  await page.getByTestId('three-related-exercise-link-straight-arm-pulldown').click();
  await expect(page).toHaveURL(/\/exercises\/straight-arm-pulldown\?muscleId=teres-major$/);

  await page.goto('/three-muscle-selector');
  await page.getByTestId('select-three-region-back-partial').click();
  await page.getByTestId('select-three-muscle-option-teres-major').click();
  await page.getByTestId('three-muscle-detail-link').click();
  await expect(page).toHaveURL(/\/muscle-map$/);
  await expect(page.getByRole('heading', { name: '大圆肌' })).toBeVisible();
});

test('three muscle selector exposes simplified latissimus dorsi 3d targets', async ({ page }) => {
  await page.goto('/three-muscle-selector');
  await page.getByTestId('select-three-region-back-partial').click();

  await expect(page.getByTestId('three-simplified-latissimus-note')).toContainText('简化 3D 示意区域');
  await expect(page.getByTestId('select-three-muscle-option-latissimus-dorsi')).toContainText('背阔肌');
  await expect(page.getByTestId('select-three-mapped-mesh-Simplified_left_latissimus_dorsi')).toHaveCount(0);
  await expect(page.getByTestId('select-three-mapped-mesh-Simplified_right_latissimus_dorsi')).toHaveCount(0);

  await page.getByTestId('select-three-muscle-option-latissimus-dorsi').click();
  await expect(page.getByTestId('glb-selected-mesh-name')).toContainText('Simplified_left_latissimus_dorsi');
  await expect(page.getByTestId('three-selected-muscle-id')).toContainText('latissimus-dorsi');
  await expect(page.getByTestId('three-selected-muscle-name')).toContainText('背阔肌');
  await expect(page.getByTestId('three-selected-muscle-description')).toContainText('肩关节伸展、内收、内旋');
  await expect(page.getByTestId('three-simplified-selection-note')).toContainText('不是当前真实模型 mesh');
  await expect(page.getByTestId('three-related-exercises')).toContainText('高位下拉');

  await page.getByTestId('three-related-exercise-link-lat-pulldown').click();
  await expect(page).toHaveURL(/\/exercises\/lat-pulldown\?muscleId=latissimus-dorsi$/);

  await page.goto('/three-muscle-selector');
  await page.getByTestId('select-three-muscle-option-latissimus-dorsi').click();
  await page.getByTestId('three-muscle-detail-link').click();
  await expect(page).toHaveURL(/\/muscle-map$/);
  await expect(page.getByRole('heading', { name: '背阔肌' })).toBeVisible();
});

test('three muscle selector can add related exercises to the active workout without duplicates', async ({ page }) => {
  await page.goto('/three-muscle-selector');
  await page.evaluate(() => {
    window.localStorage.removeItem('musclemap.activeWorkout.v0.7');
  });
  await page.reload();

  await page.getByTestId('select-three-region-back-partial').click();
  await page.getByTestId('select-three-muscle-option-latissimus-dorsi').click();

  await expect(page.getByTestId('three-related-exercise-card-lat-pulldown')).toBeVisible();
  await expect(page.getByTestId('three-related-exercise-link-lat-pulldown')).toBeVisible();
  await expect(page.getByTestId('three-add-exercise-lat-pulldown')).toBeVisible();

  await page.getByTestId('three-add-exercise-lat-pulldown').click();
  await expect(page).toHaveURL(/\/workout-log$/);
  await expect(page.getByTestId('workout-log-exercise')).toHaveCount(1);
  await expect(page.getByTestId('workout-log-exercise').first()).toContainText('Lat Pulldown');

  let active = await page.evaluate(() => JSON.parse(window.localStorage.getItem('musclemap.activeWorkout.v0.7') ?? 'null'));
  expect(active.exercises.map((exercise: { exerciseId: string }) => exercise.exerciseId)).toEqual(['lat-pulldown']);

  await page.goto('/three-muscle-selector');
  await page.getByTestId('select-three-region-back-partial').click();
  await page.getByTestId('select-three-muscle-option-teres-major').click();
  await page.getByTestId('three-add-exercise-straight-arm-pulldown').click();
  await expect(page).toHaveURL(/\/workout-log$/);
  await expect(page.getByTestId('workout-log-exercise')).toHaveCount(2);
  await expect(page.getByTestId('workout-log-exercise').first()).toContainText('Lat Pulldown');
  await expect(page.getByTestId('workout-log-exercise').nth(1)).toContainText('Straight-arm Pulldown');

  active = await page.evaluate(() => JSON.parse(window.localStorage.getItem('musclemap.activeWorkout.v0.7') ?? 'null'));
  expect(active.exercises.map((exercise: { exerciseId: string }) => exercise.exerciseId)).toEqual([
    'lat-pulldown',
    'straight-arm-pulldown'
  ]);

  await page.goto('/three-muscle-selector');
  await page.getByTestId('select-three-region-back-partial').click();
  await page.getByTestId('select-three-muscle-option-latissimus-dorsi').click();
  await page.getByTestId('three-add-exercise-lat-pulldown').click();
  await expect(page.getByTestId('three-active-workout-status')).toContainText('Lat Pulldown');
  await expect(page.getByTestId('three-go-active-workout')).toBeVisible();

  active = await page.evaluate(() => JSON.parse(window.localStorage.getItem('musclemap.activeWorkout.v0.7') ?? 'null'));
  expect(active.exercises.map((exercise: { exerciseId: string }) => exercise.exerciseId)).toEqual([
    'lat-pulldown',
    'straight-arm-pulldown'
  ]);

  await page.getByTestId('three-go-active-workout').click();
  await expect(page).toHaveURL(/\/workout-log$/);
  await expect(page.getByTestId('workout-log-exercise')).toHaveCount(2);
});

test('three muscle selector groups the visible back muscle list by muscle id', async ({ page }) => {
  await page.goto('/three-muscle-selector');
  await page.getByTestId('select-three-region-back-partial').click();

  for (const muscleId of [
    'latissimus-dorsi',
    'rhomboids',
    'middle-lower-trapezius',
    'teres-major',
    'rear-deltoid',
    'erector-spinae'
  ]) {
    await expect(page.getByTestId(`select-three-muscle-option-${muscleId}`)).toHaveCount(1);
  }

  await expect(page.getByTestId('three-muscle-options')).toContainText('背阔肌');
  await expect(page.getByTestId('three-muscle-options')).toContainText('菱形肌');
  await expect(page.getByTestId('three-muscle-options')).toContainText('斜方肌中下束');
  await page.getByTestId('select-three-muscle-option-rhomboids').click();
  await expect(page.getByTestId('three-selected-muscle-id')).toContainText('rhomboids');
  await expect(page.getByTestId('three-selected-muscle-name')).toContainText('菱形肌');
});

test('three muscle selector handles unmapped and unconfigured regions without fake data', async ({ page }) => {
  await page.goto('/three-muscle-selector');
  await page.getByTestId('select-three-region-box-test').click();

  await expect(page.getByTestId('three-current-region-label')).toContainText('GLB 管线测试');
  await expect(page.getByTestId('three-region-limitations')).toContainText('不是人体模型，也不是正式肌群选择资源。');
  await expect(page.getByTestId('glb-load-status')).toContainText('加载成功');
  await page.getByTestId('select-glb-test-mesh').click();
  await expect(page.getByTestId('three-selected-unmapped-state')).toContainText('该部位暂未配置为可训练肌群');
  await expect(page.getByTestId('three-selected-unmapped-state')).toContainText('未映射');
  await expect(page.getByTestId('three-related-exercises')).toHaveCount(0);
  await expect(page.getByTestId('three-muscle-detail-link')).toHaveCount(0);

  for (const regionId of ['chest', 'shoulders-arms', 'core']) {
    await page.getByTestId(`select-three-region-${regionId}`).click();
    await expect(page.getByTestId('three-region-placeholder')).toContainText('该区域的 3D 肌群模型暂未配置');
    await expect(page.getByTestId('three-region-placeholder')).toContainText('后续扩展区域');
    await expect(page.getByTestId('three-related-exercises')).toHaveCount(0);
  }
});

test('three muscle selector is usable on 390px mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/three-muscle-selector');

  await expect(page.getByRole('heading', { name: '3D 肌群选择' })).toBeVisible();
  await expect(page.getByTestId('three-region-selector')).toBeVisible();
  await page.getByTestId('select-three-region-back-partial').click();
  await page.getByTestId('select-three-muscle-option-teres-major').click();
  await expect(page.getByTestId('three-selected-muscle-name')).toContainText('大圆肌');

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalOverflow).toBe(false);
});

test('three muscle demo exposes registered model regions and placeholder fallback', async ({ page }) => {
  await page.goto('/three-muscle-demo');

  await expect(page.getByTestId('three-region-selector')).toBeVisible();
  await expect(page.getByTestId('select-three-region-back-partial')).toContainText('背部局部模型');
  await expect(page.getByTestId('select-three-region-box-test')).toContainText('GLB 管线测试');
  await expect(page.getByTestId('select-three-region-chest')).toContainText('胸部');
  await expect(page.getByTestId('select-three-region-legs')).toContainText('臀腿');
  await expect(page.getByTestId('select-three-region-shoulders-arms')).toContainText('肩臂');
  await expect(page.getByTestId('select-three-region-core')).toContainText('核心');

  await page.getByTestId('select-three-region-back-partial').click();
  await expect(page.getByTestId('three-current-region-label')).toContainText('背部局部模型');
  await expect(page.getByTestId('three-current-region-path')).toContainText('/models/private/local-anatomy.glb');
  await expect(page.getByTestId('three-current-region-private')).toContainText('private');
  await expect(page.getByTestId('three-current-region-experimental')).toContainText('experimental');
  await expect(page.getByTestId('three-region-limitations')).toContainText('当前模型未包含 latissimus-dorsi / 背阔肌');
  await expect(page.getByTestId('three-region-limitations')).toContainText('仅用于本地实验');
  await expect(page.getByTestId('three-region-limitations')).toContainText('不进入正式产品资源');
  await expect(page.getByTestId('three-selected-muscle-id')).toContainText('未映射');

  await page.getByTestId('select-three-region-chest').click();
  await expect(page.getByTestId('three-current-region-label')).toContainText('胸部');
  await expect(page.getByTestId('three-region-placeholder')).toContainText('暂未配置模型资源');
  await expect(page.getByTestId('three-current-region-path')).toContainText('未配置');
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

test('three muscle demo renders the model region registry controls', async ({ page }) => {
  await page.goto('/three-muscle-demo');

  await expect(page.getByRole('heading', { name: '3D 肌群模型技术预研' })).toBeVisible();
  await expect(page.getByTestId('three-region-selector')).toBeVisible();
  await expect(page.getByTestId('select-three-region-back-partial')).toBeVisible();
  await expect(page.getByTestId('select-three-region-box-test')).toBeVisible();
  await expect(page.getByTestId('select-three-region-core')).toContainText('未配置');
});

test('three muscle demo loads the GLB pipeline test model', async ({ page }) => {
  await page.goto('/three-muscle-demo');
  await page.getByTestId('select-three-region-box-test').click();

  await expect(page.getByTestId('region-model-experiment')).toBeVisible();
  await expect(page.getByTestId('three-current-region-label')).toContainText('GLB 管线测试');
  await expect(page.getByTestId('three-current-region-path')).toContainText('/models/demo/BoxTextured.glb');
  await expect(page.getByTestId('glb-load-status')).toContainText('加载成功');
  await expect(page.getByTestId('glb-mesh-count')).toContainText(/[1-9]/);

  await page.getByTestId('select-glb-test-mesh').click();
  await expect(page.getByTestId('glb-selected-mesh-name')).not.toContainText('未选择');
  await expect(page.getByTestId('three-selected-muscle-id')).toContainText('未映射');
});

test('three muscle demo shows local anatomy fallback when private model is missing', async ({ page }) => {
  await page.goto('/three-muscle-demo');
  await page.getByTestId('select-three-region-back-partial').click();

  await expect(page.getByTestId('region-model-experiment')).toBeVisible();
  await expect(page.getByTestId('three-current-region-label')).toContainText('背部局部模型');
  await expect(page.getByTestId('three-current-region-path')).toContainText('/models/private/local-anatomy.glb');
  await expect(page.getByTestId('three-region-limitations')).toContainText('当前模型未包含 latissimus-dorsi / 背阔肌');
  await expect(page.getByTestId('three-region-limitations')).toContainText('仅用于本地实验');
  await expect(page.getByTestId('three-region-limitations')).toContainText('不进入正式产品资源');
  await expect(page.getByTestId('region-model-experiment').getByText(/未检测到模型文件|加载成功/)).toBeVisible();
});

test('three muscle demo exposes upper body local model sandbox state', async ({ page }) => {
  await page.goto('/three-muscle-demo');

  await expect(page.getByTestId('upper-body-local-sandbox')).toBeVisible();
  await expect(page.getByTestId('upper-body-local-title')).toContainText('上身真实模型实验区');
  await expect(page.getByTestId('upper-body-local-path')).toContainText('/models/private/upper-body-local.glb');
  const upperBodyFallback = page.getByTestId('upper-body-local-fallback');
  if ((await upperBodyFallback.count()) > 0) {
    await expect(upperBodyFallback).toContainText(
      '未检测到本地上身真实模型。请将实验 GLB 放入 public/models/private/upper-body-local.glb。该路径被 Git 忽略，不会提交或部署。'
    );
  }
  await expect(page.getByTestId('upper-body-local-status')).toContainText(/未检测到模型文件|加载成功/);
  await expect(page.getByTestId('upper-body-local-mesh-count')).toContainText(/0|[1-9]/);
  await expect(page.getByTestId('upper-body-local-selected-mesh')).toContainText('未选择');
  await expect(page.getByTestId('upper-body-local-selected-muscle')).toContainText('未映射');
  await expect(page.getByTestId('upper-body-local-mapping-note')).toContainText('没有手工 mapping');
});

test('three muscle demo bridges mapped mesh selections to muscle and exercise data', async ({ page }) => {
  await page.goto('/three-muscle-demo');
  await page.getByTestId('select-three-region-back-partial').click();
  await page.getByTestId('select-three-mapped-mesh-Right_teres_major').click();

  await expect(page.getByTestId('glb-selected-mesh-name')).toContainText('Right_teres_major');
  await expect(page.getByTestId('three-selected-muscle-id')).toContainText('teres-major');
  await expect(page.getByTestId('three-selected-muscle-name')).toContainText('大圆肌');
  await expect(page.getByTestId('three-selected-muscle-description')).toContainText('位于肩胛骨外侧缘附近');
  await expect(page.getByTestId('three-related-exercises')).toContainText('直臂下拉');
  await expect(page.getByTestId('three-related-exercises')).toContainText('主练');
  await expect(page.getByTestId('three-related-exercises')).toContainText('高位下拉');
  await expect(page.getByTestId('three-related-exercises')).toContainText('次要参与');

  await page.getByTestId('three-muscle-detail-link').click();
  await expect(page).toHaveURL(/\/muscle-map$/);
  await expect(page.getByRole('heading', { name: '大圆肌' })).toBeVisible();

  await page.goto('/three-muscle-demo');
  await page.getByTestId('select-three-region-back-partial').click();
  await page.getByTestId('select-three-mapped-mesh-Right_teres_major').click();
  await page.getByTestId('three-related-exercise-link-straight-arm-pulldown').click();
  await expect(page).toHaveURL(/\/exercises\/straight-arm-pulldown\?muscleId=teres-major$/);
});

test('three muscle demo does not overflow at 390px mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/three-muscle-demo');

  await expect(page.getByTestId('three-region-selector')).toBeVisible();
  await expect(page.getByTestId('region-model-experiment')).toBeVisible();
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

test('exercise trajectory config covers the V0.21 first batch of existing exercise ids', () => {
  expect(exerciseTrajectories.map((trajectory) => trajectory.exerciseId)).toEqual([
    'lat-pulldown',
    'seated-row',
    'machine-chest-press',
    'dumbbell-shoulder-press',
    'dumbbell-curl',
    'squat'
  ]);

  for (const trajectory of exerciseTrajectories) {
    expect(trajectory.points.length).toBeGreaterThanOrEqual(2);
    expect(trajectory.points.length).toBeLessThanOrEqual(4);
    expect(trajectory.targetMuscleIds.length).toBeGreaterThan(0);
  }
});

test('exercise detail shows simplified 3d trajectory for configured exercises', async ({ page }) => {
  for (const exerciseId of ['lat-pulldown', 'machine-chest-press', 'squat']) {
    await page.goto(`/exercises/${exerciseId}`);

    const trajectory = page.getByTestId('exercise-trajectory-module');
    await expect(trajectory).toBeVisible();
    await expect(trajectory).toContainText('3D 动作轨迹');
    await expect(trajectory).toContainText('起点');
    await expect(trajectory).toContainText('终点');
    await expect(trajectory).toContainText('方向');
    await expect(trajectory).toContainText('目标肌群');
    await expect(trajectory).toContainText('协同肌群');
    await expect(trajectory).toContainText('当前为简化动作轨迹，不代表完整动作动画。');
    await expect(page.getByTestId('exercise-trajectory-path')).toBeVisible();
    await expect(page.getByTestId('exercise-trajectory-reference')).toContainText('身体参照');
    await expect(page.getByTestId('exercise-trajectory-direction-label')).toBeVisible();
    await expect(page.getByTestId('exercise-trajectory-action-reference')).toContainText('3D 动作示意');
    await expect(page.getByTestId('exercise-trajectory-action-reference')).toContainText('起始姿态');
    await expect(page.getByTestId('exercise-trajectory-action-reference')).toContainText('结束姿态');
    await expect(page.getByTestId('exercise-trajectory-action-reference')).toContainText('手臂与横杆');
    await expect(page.getByTestId('exercise-trajectory-pose-labels')).toContainText('左：起始姿态');
    await expect(page.getByTestId('exercise-trajectory-pose-labels')).toContainText('右：结束姿态');
    await expect(page.getByTestId('exercise-trajectory-pose-labels')).toContainText('下拉方向');
    await expect(page.getByTestId('exercise-active-workout-entry')).toBeVisible();
  }

  await page.goto('/exercises/lat-pulldown');
  await expect(page.getByTestId('exercise-trajectory-direction-label')).toContainText('从头顶上方下拉到上胸');
});

test('exercise detail shows trajectory fallback without mobile overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/exercises/plank');

  await expect(page.getByTestId('exercise-trajectory-fallback')).toContainText('该动作暂未配置 3D 动作轨迹');
  await expect(page.getByTestId('exercise-active-workout-entry')).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalOverflow).toBe(false);
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
