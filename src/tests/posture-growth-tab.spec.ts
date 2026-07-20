import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
});

test('keeps posture inside Growth and derives the selected tab from the route', async ({ page }) => {
  await page.goto('/growth');
  await page.getByRole('tab', { name: '体态改善' }).click();

  await expect(page).toHaveURL('/growth/posture');
  await expect(page.getByRole('heading', { name: '成长', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: '训练成长' })).toBeVisible();
  await expect(page.getByRole('tab', { name: '身体变化' })).toBeVisible();
  await expect(page.getByRole('tab', { name: '体态改善' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('radiogroup', { name: '时间范围' })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('tab', { name: '体态改善' })).toHaveAttribute('aria-selected', 'true');
});

test('renders an honest empty posture state with screening entry and no invented metrics', async ({ page }) => {
  await page.goto('/growth/posture');

  await expect(page.getByTestId('posture-state-empty')).toBeVisible();
  await expect(page.getByRole('link', { name: '开始体态分析' })).toHaveAttribute('href', '/growth/posture/screening');
  await expect(page.getByText(/\d+%|改善趋势|第 \d+ 周/)).toHaveCount(0);
});

test('shows plan creation only for an eligible assessed result', async ({ page }) => {
  await seedSessions(page, [screeningSession('eligible')]);
  await page.goto('/growth/posture');

  await expect(page.getByTestId('posture-state-assessed')).toContainText('头肩控制需要改善');
  await expect(page.getByRole('link', { name: '手动选择训练方案' })).toHaveAttribute('href', '/growth/posture/plan/new?sessionId=eligible');
  await expect(page.getByText(/自动推荐|最适合方案/)).toHaveCount(0);
});

test('keeps restricted screening visible with report, retest and professional entry but no plan route', async ({ page }) => {
  await seedSessions(page, [screeningSession('restricted', 'safety-review', 'insufficient', true)]);
  await page.goto('/growth/posture');

  await expect(page.getByTestId('posture-state-assessed')).toContainText('当前结果不能用于创建训练计划');
  await expect(page.getByRole('link', { name: '查看筛查报告' })).toBeVisible();
  await expect(page.getByRole('link', { name: '重新筛查' })).toBeVisible();
  await expect(page.getByRole('link', { name: '查看专业评估建议' })).toBeVisible();
  await expect(page.getByRole('link', { name: '手动选择训练方案' })).toHaveCount(0);
});

test('shows today training only for a real unfinished task and reuses the workout route', async ({ page }) => {
  const today = await page.evaluate(() => {
    const date = new Date();
    return { key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`, weekday: date.getDay() };
  });
  await seedPlan(page, { status: 'active', startDate: today.key, weekdays: [today.weekday], weeklyFrequency: 1 });
  await page.goto('/growth/posture');

  await expect(page.getByTestId('posture-state-active-plan')).toBeVisible();
  await page.getByRole('button', { name: '继续今日训练' }).click();
  await expect(page).toHaveURL('/workout-log');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('musclemap.activeWorkout.v0.7') ?? 'null')?.posturePlanContext?.planId)).toBe('plan-1');
});

test('does not fabricate today training for paused, non-training-day, or completed-task states', async ({ page }) => {
  const today = await page.evaluate(() => new Date().getDay());
  await seedPlan(page, { status: 'paused', weekdays: [today], weeklyFrequency: 1 });
  await page.goto('/growth/posture');
  await expect(page.getByTestId('posture-state-paused-plan')).toBeVisible();
  await expect(page.getByRole('button', { name: '继续今日训练' })).toHaveCount(0);

  await seedPlan(page, { status: 'active', weekdays: [((today + 1) % 7)], weeklyFrequency: 1 });
  await page.reload();
  await expect(page.getByRole('button', { name: '继续今日训练' })).toHaveCount(0);
});

test('completed plan remains primary over restricted records and exposes history without fake trend', async ({ page }) => {
  await seedSessions(page, [screeningSession('restricted', 'mixed-evidence', 'insufficient')]);
  await seedPlan(page, { status: 'completed', completedAt: '2026-07-19T08:00:00.000Z' });
  await page.goto('/growth/posture');

  await expect(page.getByTestId('posture-state-completed-plan')).toBeVisible();
  await expect(page.getByRole('link', { name: '查看历史记录' })).toHaveAttribute('href', '/growth/posture/history');
  await expect(page.getByRole('link', { name: '开始新周期筛查' })).toBeVisible();
  await expect(page.getByTestId('posture-trend')).toHaveCount(0);
});

type SessionStatus = 'completed' | 'functional-only' | 'mixed-evidence' | 'safety-review' | 'measurement-invalid';

function screeningSession(id: string, status: SessionStatus = 'completed', confidence: 'supported' | 'insufficient' = 'supported', professional = false) {
  const completedAt = '2026-07-18T08:00:00.000Z';
  return {
    id, status,
    input: { age: 30, boundaryAccepted: true, safetyFlags: status === 'safety-review' ? ['progressive-neurological-symptoms'] : [], primaryConcern: 'neck-upper-quarter', functionalImpact: 4, subjectiveObservations: ['head-position-concern'], movement: { testId: 'upper-quarter-reach-observation-v1', status: 'completed', stopSymptoms: [], observations: ['head-advances-during-reach'] }, photo: { status: 'skipped', observations: [], reasonCodes: [] } },
    result: { status, summary: '筛查摘要', findings: [{ patternId: 'upper-control', label: '头肩控制需要改善', evidenceClasses: ['functional'], evidenceIds: ['evidence-1'], reasonCodes: [], confidence, allowedConclusion: '存在可重复表现', forbiddenConclusions: ['不构成诊断'] }], evidenceIds: ['evidence-1'], reasonCodes: [], nextActions: professional ? [{ id: 'professional', label: '专业评估', kind: 'professional-review' }] : [{ id: 'return', label: '返回', kind: 'return' }], algorithmVersion: '1.0.0', protocolVersion: 'adult-posture-screening-v1' },
    photoMeasurements: [], createdAt: completedAt, updatedAt: completedAt, completedAt,
  };
}

async function seedSessions(page: import('@playwright/test').Page, sessions: ReturnType<typeof screeningSession>[]) {
  await page.evaluate((value) => localStorage.setItem('musclemap.postureScreeningSessions.v1', JSON.stringify(value)), sessions);
}

async function seedPlan(page: import('@playwright/test').Page, overrides: Record<string, unknown>) {
  await page.evaluate((values) => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const createdAt = '2026-07-01T08:00:00.000Z';
    const plan = { id: 'plan-1', protocolId: 'UPPER_POSTURE_001', assessmentId: 'legacy', status: 'active', startDate: today, durationWeeks: 4, weeklyFrequency: 1, weekdays: [now.getDay()], recommendationReasons: ['旧计划'], qualitySnapshot: { dataQuality: 'high', completeness: 'complete', sourceUrl: 'https://example.com' }, reassessmentIds: [], createdAt, updatedAt: createdAt, ...values };
    localStorage.setItem('musclemap.posturePlans.v1', JSON.stringify([plan]));
  }, overrides);
}
