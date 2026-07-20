import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
});

test('redirects every missing or restricted screening without creating plan data', async ({ page }) => {
  await seedSessions(page, [
    session('safety', 'safety-review'),
    session('mixed', 'mixed-evidence'),
    session('invalid', 'measurement-invalid'),
    session('insufficient', 'completed', 'insufficient'),
    session('professional', 'completed', 'supported', true),
  ]);

  await page.goto('/growth/posture/plan/new');
  await expect(page).toHaveURL(/\/growth\/posture$/);

  for (const id of ['missing', 'safety', 'mixed', 'invalid', 'insufficient', 'professional']) {
    await page.goto(`/growth/posture/plan/new?sessionId=${id}`);
    await expect(page).toHaveURL(/\/growth\/posture$/);
  }
  expect(await readPlans(page)).toEqual([]);
});

test('shows only technically eligible protocols in dataset order with no recommendation or preselection', async ({ page }) => {
  await seedSessions(page, [session('eligible')]);
  await page.goto('/growth/posture/plan/new?sessionId=eligible');

  await expect(page.getByRole('heading', { name: '选择训练方案' })).toBeVisible();
  await expect(page.getByTestId('screening-summary')).toContainText('头肩控制需要改善');
  const protocols = page.getByRole('radio', { name: /方案/ });
  await expect(protocols).toHaveCount(5);
  expect(await protocols.evaluateAll((items) => items.map((item) => (item as HTMLInputElement).value))).toEqual([
    'UPPER_POSTURE_001',
    'THORACIC_001',
    'WINGED_SCAPULA_001',
    'WINGED_SCAPULA_002',
    'RIB_FLARE_001',
  ]);
  expect(await protocols.evaluateAll((items) => items.filter((item) => (item as HTMLInputElement).checked).length)).toBe(0);
  await expect(page.getByText(/推荐|最适合|优先方案/)).toHaveCount(0);
});

test('cancel returns to the posture Growth tab', async ({ page }) => {
  await seedSessions(page, [session('eligible')]);
  await page.goto('/growth/posture/plan/new?sessionId=eligible');
  await page.getByRole('button', { name: '取消' }).click();

  await expect(page).toHaveURL('/growth/posture');
  await expect(page.getByRole('tab', { name: '体态改善' })).toHaveAttribute('aria-selected', 'true');
});

test('requires explicit plan, cycle, frequency and matching weekdays before final confirmation writes once', async ({ page }) => {
  await seedSessions(page, [session('eligible')]);
  await page.goto('/growth/posture/plan/new?sessionId=eligible');

  await page.getByRole('radio', { name: /方案 UPPER_POSTURE_001/ }).check();
  await page.getByRole('button', { name: '下一步：安排周期' }).click();
  expect(await readPlans(page)).toEqual([]);

  await expect(page.getByRole('button', { name: '下一步：确认计划' })).toBeDisabled();
  await page.getByLabel('训练周期').selectOption('4');
  await page.getByLabel('每周频率').selectOption('3');
  await page.getByRole('checkbox', { name: '周一' }).check();
  await page.getByRole('checkbox', { name: '周三' }).check();
  await expect(page.getByRole('button', { name: '下一步：确认计划' })).toBeDisabled();
  await page.getByRole('checkbox', { name: '周五' }).check();
  await page.getByRole('button', { name: '下一步：确认计划' }).click();
  expect(await readPlans(page)).toEqual([]);

  await expect(page.getByRole('heading', { name: '确认训练计划' })).toBeVisible();
  await page.getByRole('button', { name: '确认创建计划' }).click();
  await expect(page).toHaveURL(/\/growth\/posture$/);

  const plans = await readPlans(page);
  expect(plans).toHaveLength(1);
  expect(plans[0]).toMatchObject({
    protocolId: 'UPPER_POSTURE_001',
    screeningSessionId: 'eligible',
    durationWeeks: 4,
    weeklyFrequency: 3,
    weekdays: [1, 3, 5],
    sourceSnapshot: {
      screeningCompletedAt: '2026-07-18T08:00:00.000Z',
      primaryFinding: '头肩控制需要改善',
      selectedProtocolId: 'UPPER_POSTURE_001',
      selectionMode: 'manual',
    },
  });
  expect(plans[0].assessmentId).toBeUndefined();
  expect(plans[0].sourceSnapshot.createdAt).toEqual(plans[0].createdAt);
});

test('rechecks the active-plan invariant and never creates a second plan', async ({ page }) => {
  await seedSessions(page, [session('eligible')]);
  await seedActivePlan(page);

  await page.goto('/growth/posture/plan/new?sessionId=eligible');
  await expect(page).toHaveURL(/\/growth\/posture$/);
  expect(await readPlans(page)).toHaveLength(1);
});

test('keeps confirmation visible and reports a storage failure without creating a plan', async ({ page }) => {
  await seedSessions(page, [session('eligible')]);
  await page.goto('/growth/posture/plan/new?sessionId=eligible');
  await page.getByRole('radio', { name: /方案 UPPER_POSTURE_001/ }).check();
  await page.getByRole('button', { name: '下一步：安排周期' }).click();
  await page.getByLabel('训练周期').selectOption('2');
  await page.getByLabel('每周频率').selectOption('1');
  await page.getByRole('checkbox', { name: '周一' }).check();
  await page.getByRole('button', { name: '下一步：确认计划' }).click();
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('blocked'); }; });
  await page.getByRole('button', { name: '确认创建计划' }).click();

  await expect(page.getByRole('alert')).toContainText('计划保存失败');
  await expect(page.getByRole('heading', { name: '确认训练计划' })).toBeVisible();
});

type Status = 'completed' | 'functional-only' | 'mixed-evidence' | 'safety-review' | 'measurement-invalid';

function session(id: string, status: Status = 'completed', confidence: 'supported' | 'insufficient' = 'supported', professionalReview = false) {
  const completedAt = '2026-07-18T08:00:00.000Z';
  return {
    id,
    status,
    input: {
      age: 30,
      boundaryAccepted: true,
      safetyFlags: status === 'safety-review' ? ['progressive-neurological-symptoms'] : [],
      primaryConcern: 'neck-upper-quarter',
      functionalImpact: 4,
      subjectiveObservations: ['head-position-concern'],
      movement: { testId: 'upper-quarter-reach-observation-v1', status: 'completed', stopSymptoms: [], observations: ['head-advances-during-reach'] },
      photo: { status: 'skipped', observations: [], reasonCodes: [] },
    },
    result: {
      status,
      summary: '筛查结果摘要',
      findings: [{ patternId: 'upper-control', label: '头肩控制需要改善', evidenceClasses: ['functional'], evidenceIds: ['evidence-1'], reasonCodes: [], confidence, allowedConclusion: '存在可重复表现', forbiddenConclusions: ['不构成诊断'] }],
      evidenceIds: ['evidence-1'],
      reasonCodes: [],
      nextActions: professionalReview ? [{ id: 'professional', label: '专业评估', kind: 'professional-review' }] : [{ id: 'return', label: '返回', kind: 'return' }],
      algorithmVersion: '1.0.0',
      protocolVersion: 'adult-posture-screening-v1',
    },
    photoMeasurements: [],
    createdAt: completedAt,
    updatedAt: completedAt,
    completedAt,
  };
}

async function seedSessions(page: import('@playwright/test').Page, sessions: ReturnType<typeof session>[]) {
  await page.evaluate((value) => localStorage.setItem('musclemap.postureScreeningSessions.v1', JSON.stringify(value)), sessions);
}

async function seedActivePlan(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const createdAt = '2026-07-18T09:00:00.000Z';
    localStorage.setItem('musclemap.posturePlans.v1', JSON.stringify([{ id: 'active-plan', protocolId: 'UPPER_POSTURE_001', assessmentId: 'legacy', status: 'active', startDate: '2026-07-18', durationWeeks: 2, weeklyFrequency: 1, weekdays: [1], recommendationReasons: ['旧计划'], qualitySnapshot: { dataQuality: 'high', completeness: 'complete', sourceUrl: 'https://example.com' }, reassessmentIds: [], createdAt, updatedAt: createdAt }]));
  });
}

async function readPlans(page: import('@playwright/test').Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('musclemap.posturePlans.v1') ?? '[]'));
}
