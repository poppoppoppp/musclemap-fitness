import { expect, test } from '@playwright/test';

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
  await expect(page.getByTestId('latest-workout-log')).not.toContainText('undefined');
  await expect(page.getByTestId('latest-workout-log')).not.toContainText('Seated Cable Row');
});

test('rhomboids exercise detail keeps muscle context across alternatives', async ({ page }) => {
  await page.goto('/muscle-map');
  await page.getByTestId('muscle-region-rhomboids-center').click();

  const rowLink = page.locator('a[href="/exercises/seated-row?muscleId=rhomboids"]');
  await expect(rowLink).toHaveCount(1);
  await rowLink.click();

  await expect(page).toHaveURL(/\/exercises\/seated-row\?muscleId=rhomboids$/);
  const alternatives = page.getByTestId('contextual-alternatives');
  await expect(alternatives).toContainText('涓荤粌鍖归厤');
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
  await expect(page.getByTestId('contextual-alternatives')).toContainText('涓荤粌鍖归厤');

  await page.goto('/exercises/lat-pulldown?muscleId=not-a-real-muscle');
  await expect(page.getByTestId('alternative-link-pull-up')).toBeVisible();
  await expect(page.getByTestId('contextual-alternatives')).toContainText('涓荤粌鍖归厤');
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

test('workout log allows manual exercise entry and persists latest log', async ({ page }) => {
  await page.goto('/workout-log');
  await page.evaluate(() => {
    window.localStorage.removeItem('musclemap.latestGeneratedPlan.v0.2');
    window.localStorage.removeItem('musclemap.workoutLogs.v0.3');
    window.localStorage.removeItem('musclemap.latestWorkoutLog.v0.3');
  });
  await page.reload();

  await page.getByTestId('manual-exercise-select').selectOption('lat-pulldown');
  await page.getByTestId('add-manual-exercise').click();

  const exercise = page.getByTestId('workout-log-exercise').first();
  await expect(exercise).toBeVisible();
  await exercise.getByTestId('set-weight-input').fill('42.5');
  await exercise.getByTestId('set-reps-input').fill('10');
  await exercise.getByTestId('exercise-notes-input').fill('controlled first working set');
  await page.getByTestId('save-workout-log').click();

  await expect(page.getByTestId('save-status')).toContainText('训练记录已保存');
  await page.reload();
  await expect(page.getByTestId('latest-workout-log')).toContainText('Lat Pulldown');
  await expect(page.getByTestId('latest-workout-log')).toContainText('第 1 组：42.5kg x 10 次');
  await expect(page.getByTestId('latest-workout-log')).toContainText('controlled first working set');
});

test('workout log rejects empty records before saving', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('musclemap.latestGeneratedPlan.v0.2');
    window.localStorage.removeItem('musclemap.workoutLogs.v0.3');
    window.localStorage.removeItem('musclemap.latestWorkoutLog.v0.3');
  });

  await page.goto('/workout-log');
  await page.getByTestId('save-workout-log').click();

  await expect(page.getByTestId('save-status')).toContainText('请先添加至少一个动作');
  const stored = await page.evaluate(() => window.localStorage.getItem('musclemap.latestWorkoutLog.v0.3'));
  expect(stored).toBeNull();
});

test('workout log rejects exercises without any valid set values', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('musclemap.latestGeneratedPlan.v0.2');
    window.localStorage.removeItem('musclemap.workoutLogs.v0.3');
    window.localStorage.removeItem('musclemap.latestWorkoutLog.v0.3');
  });

  await page.goto('/workout-log');
  await page.getByTestId('manual-exercise-select').selectOption('lat-pulldown');
  await page.getByTestId('add-manual-exercise').click();
  await page.getByTestId('save-workout-log').click();

  await expect(page.getByTestId('save-status')).toContainText('请至少填写一组重量或次数');
  const stored = await page.evaluate(() => window.localStorage.getItem('musclemap.latestWorkoutLog.v0.3'));
  expect(stored).toBeNull();
});

test('workout log rejects decimal reps without truncating them', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('musclemap.latestGeneratedPlan.v0.2');
    window.localStorage.removeItem('musclemap.workoutLogs.v0.3');
    window.localStorage.removeItem('musclemap.latestWorkoutLog.v0.3');
  });

  await page.goto('/workout-log');
  await page.getByTestId('manual-exercise-select').selectOption('lat-pulldown');
  await page.getByTestId('add-manual-exercise').click();
  const exercise = page.getByTestId('workout-log-exercise').first();
  await exercise.getByTestId('set-reps-input').fill('10.5');
  await page.getByTestId('save-workout-log').click();

  await expect(page.getByTestId('save-status')).toContainText('次数必须是整数');
  const stored = await page.evaluate(() => window.localStorage.getItem('musclemap.latestWorkoutLog.v0.3'));
  expect(stored).toBeNull();
});

test('workout log imports a recent plan day with empty actual set values', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'musclemap.latestGeneratedPlan.v0.2',
      JSON.stringify({
        id: 'plan-test',
        name: 'Test Plan',
        input: {
          goal: 'hypertrophy',
          daysPerWeek: 2,
          level: 'beginner',
          availableEquipment: 'fullGym',
          focusBodyParts: ['back']
        },
        createdAt: '2026-05-23T00:00:00.000Z',
        days: [
          {
            id: 'pull-1',
            name: 'Pull Day',
            focus: 'Back',
            items: [
              {
                exerciseId: 'lat-pulldown',
                sets: 3,
                repRange: '8-12',
                restSeconds: 90,
                targetMuscles: ['latissimus-dorsi']
              },
              {
                exerciseId: 'seated-row',
                sets: 2,
                repRange: '10-12',
                restSeconds: 75,
                targetMuscles: ['latissimus-dorsi']
              }
            ]
          }
        ]
      })
    );
    window.localStorage.removeItem('musclemap.workoutLogs.v0.3');
    window.localStorage.removeItem('musclemap.latestWorkoutLog.v0.3');
  });

  await page.goto('/workout-log');
  await page.getByTestId('plan-day-select').selectOption('pull-1');
  await page.getByTestId('start-from-plan').click();

  const exercise = page.getByTestId('workout-log-exercise').first();
  await expect(exercise).toContainText('Lat Pulldown');
  await expect(exercise).toContainText('8-12');
  await expect(exercise.getByTestId('workout-set-row')).toHaveCount(3);
  await expect(exercise.getByTestId('set-weight-input').first()).toHaveValue('');
  await expect(exercise.getByTestId('set-reps-input').first()).toHaveValue('');
});

test('workout log saves only valid sets and hides empty planned exercises from latest log', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'musclemap.latestGeneratedPlan.v0.2',
      JSON.stringify({
        id: 'plan-test',
        name: 'Test Plan',
        input: {
          goal: 'hypertrophy',
          daysPerWeek: 2,
          level: 'beginner',
          availableEquipment: 'fullGym',
          focusBodyParts: ['back']
        },
        createdAt: '2026-05-23T00:00:00.000Z',
        days: [
          {
            id: 'pull-1',
            name: 'Pull Day',
            focus: 'Back',
            items: [
              {
                exerciseId: 'lat-pulldown',
                sets: 3,
                repRange: '8-12',
                restSeconds: 90,
                targetMuscles: ['latissimus-dorsi']
              },
              {
                exerciseId: 'seated-row',
                sets: 2,
                repRange: '10-12',
                restSeconds: 75,
                targetMuscles: ['latissimus-dorsi']
              }
            ]
          }
        ]
      })
    );
    window.localStorage.removeItem('musclemap.workoutLogs.v0.3');
    window.localStorage.removeItem('musclemap.latestWorkoutLog.v0.3');
  });

  await page.goto('/workout-log');
  await page.getByTestId('plan-day-select').selectOption('pull-1');
  await page.getByTestId('start-from-plan').click();

  const firstExercise = page.getByTestId('workout-log-exercise').first();
  await firstExercise.getByTestId('set-weight-input').first().fill('35.5');
  await firstExercise.getByTestId('set-reps-input').first().fill('12');
  await page.getByTestId('save-workout-log').click();

  await expect(page.getByTestId('latest-workout-log')).toContainText('第 1 组：35.5kg x 12 次');
  await expect(page.getByTestId('latest-workout-log')).not.toContainText('-kg x -');
  await expect(page.getByTestId('latest-workout-log')).not.toContainText('Seated Cable Row');

  const saved = await page.evaluate(() => JSON.parse(window.localStorage.getItem('musclemap.latestWorkoutLog.v0.3') ?? 'null'));
  expect(saved.exercises).toHaveLength(1);
  expect(saved.exercises[0].sets).toHaveLength(1);
});

test('workout log can add and delete sets', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('musclemap.latestGeneratedPlan.v0.2');
    window.localStorage.removeItem('musclemap.workoutLogs.v0.3');
    window.localStorage.removeItem('musclemap.latestWorkoutLog.v0.3');
  });

  await page.goto('/workout-log');
  await page.getByTestId('manual-exercise-select').selectOption('lat-pulldown');
  await page.getByTestId('add-manual-exercise').click();

  const exercise = page.getByTestId('workout-log-exercise').first();
  await expect(exercise.getByTestId('workout-set-row')).toHaveCount(1);
  await exercise.getByTestId('add-set').click();
  await expect(exercise.getByTestId('workout-set-row')).toHaveCount(2);
  await exercise.getByTestId('delete-set').last().click();
  await expect(exercise.getByTestId('workout-set-row')).toHaveCount(1);
});

test('workout log bottom save button is available above mobile navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/workout-log');
  await page.getByTestId('manual-exercise-select').selectOption('lat-pulldown');
  await page.getByTestId('add-manual-exercise').click();

  const saveButton = page.getByTestId('save-workout-log-bottom');
  await saveButton.scrollIntoViewIfNeeded();
  const buttonBox = await saveButton.boundingBox();
  const navBox = await page.locator('nav').boundingBox();

  expect(buttonBox).not.toBeNull();
  expect(navBox).not.toBeNull();
  expect(buttonBox!.y + buttonBox!.height).toBeLessThanOrEqual(navBox!.y);
  await saveButton.click();
  await expect(page.getByTestId('save-status')).toContainText('请至少填写一组重量或次数');
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
