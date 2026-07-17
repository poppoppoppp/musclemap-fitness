import { expect, test } from '@playwright/test';
import type { PostureMeasurementError } from '../types/postureScreening';
import type { PostureScreeningSession } from '../repositories/postureScreeningRepository';
import { evaluatePostureScreening, type PostureScreeningInput } from '../utils/postureScreeningRules';
import { comparePostureScreeningSessions, describePostureMeasurementChange } from '../utils/postureScreeningComparison';

const directError: PostureMeasurementError = { status: 'reported', statistic: 'MDC', value: 2.84, unit: 'deg', applicability: 'direct', context: 'same validated protocol' };

test('describes changes inside and outside directly applicable measurement error without recovery language', () => {
  expect(describePostureMeasurementChange(45, 47, directError)).toMatchObject({ kind: 'within-error', difference: 2, summary: expect.stringContaining('未见明确变化') });
  const beyond = describePostureMeasurementChange(45, 49, directError);
  expect(beyond).toMatchObject({ kind: 'beyond-error', difference: 4, summary: expect.stringContaining('数值上升 4.0°') });
  expect(beyond.summary).toContain('不等同于改善或恶化');
  expect(beyond.summary).not.toMatch(/康复|恢复|恶化$/);
});

test('reports a numeric difference with uncertainty when measurement error is not directly transferable', () => {
  const conditional: PostureMeasurementError = { status: 'reported', statistic: 'MDC', value: 2.84, unit: 'deg', applicability: 'conditional', context: 'different protocol' };
  expect(describePostureMeasurementChange(45, 48, conditional)).toEqual({
    kind: 'uncertain',
    difference: 3,
    summary: '数值差异 +3.0°；当前协议缺少可直接使用的测量误差，不能判断是否为明确变化。',
  });
});

test('refuses trend conclusions when screening or photo methods differ', () => {
  const baseline = sessionFixture('baseline', 45);
  const algorithmMismatch = { ...sessionFixture('current', 48, baseline.id), result: { ...sessionFixture('current', 48, baseline.id).result, algorithmVersion: '2.0.0' } } as unknown as PostureScreeningSession;
  expect(comparePostureScreeningSessions(baseline, algorithmMismatch)).toMatchObject({ status: 'not-comparable', summary: '算法或筛查协议版本不一致，不能做趋势判断。' });
  const photoMismatch = sessionFixture('current', 48, baseline.id);
  photoMismatch.photoMeasurements[0].protocolVersion = undefined;
  expect(comparePostureScreeningSessions(baseline, photoMismatch)).toMatchObject({ status: 'not-comparable', summary: '照片测量方法或版本不一致，不能做趋势判断。' });
  const invalidCapture = sessionFixture('current', 48, baseline.id);
  invalidCapture.photoMeasurements[0].quality = 'invalid';
  expect(comparePostureScreeningSessions(baseline, invalidCapture)).toMatchObject({ status: 'not-comparable', summary: '任一次照片测量质量无效，不能做趋势判断。' });
});

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.removeItem('musclemap.postureScreeningDraft.v1');
    localStorage.removeItem('musclemap.postureScreeningSessions.v1');
  });
});

test('renders an instructive empty history state', async ({ page }) => {
  await page.goto('/growth/posture/history');
  await expect(page.getByRole('heading', { name: '还没有体态筛查记录' })).toBeVisible();
  await expect(page.getByRole('link', { name: '开始第一次筛查' })).toHaveAttribute('href', '/growth/posture/screening');
});

test('lists saved reports and keeps them available after refresh', async ({ page }) => {
  const { sessionId } = await seedBrowserSessions(page, { linked: false, withPhoto: false });
  await page.goto('/growth/posture/history');
  await expect(page.getByRole('heading', { name: '体态筛查历史' })).toBeVisible();
  await expect(page.getByText('头位前移伴上段控制负担倾向')).toBeVisible();
  await expect(page.getByRole('link', { name: '查看完整结果' })).toHaveAttribute('href', `/growth/posture/results/${sessionId}`);
  await page.reload();
  await expect(page.getByRole('link', { name: '查看完整结果' })).toBeVisible();
});

test('deletes only raw photos while retaining measurements, then cascades assets when deleting a whole session', async ({ page }) => {
  const { sessionId, assetId } = await seedBrowserSessions(page, { linked: false, withPhoto: true });
  await page.goto('/growth/posture/history');
  await expect(page.getByText('删除原图后，人工标点、测量值与筛查结论仍会保留。')).toBeVisible();
  await page.getByRole('button', { name: '仅删除原始照片' }).click();
  await page.getByRole('button', { name: '确认仅删除原始照片' }).click();
  await expect(page.getByRole('status')).toContainText('原始照片已删除，测量值仍保留');
  await expect(page.getByText(/颅椎角.*45\.0°/)).toBeVisible();

  await page.getByRole('button', { name: '删除整条筛查记录' }).click();
  await page.getByRole('button', { name: '确认删除整条记录' }).click();
  await expect(page.getByRole('heading', { name: '还没有体态筛查记录' })).toBeVisible();
  const remaining = await page.evaluate(async ({ assetId, sessionId }) => {
    const repositoryPath = '/src/repositories/postureScreeningRepository.ts';
    const { createPostureScreeningRepository } = await import(/* @vite-ignore */ repositoryPath) as typeof import('../repositories/postureScreeningRepository');
    const repository = createPostureScreeningRepository();
    return { session: repository.getSession(sessionId), blob: await repository.getPhotoBlob(assetId) };
  }, { assetId, sessionId });
  expect(remaining.session).toBeNull();
  expect(remaining.blob).toBeNull();
});

test('starts a linked retest draft from a historical result', async ({ page }) => {
  const { sessionId } = await seedBrowserSessions(page, { linked: false, withPhoto: false });
  await page.goto(`/growth/posture/results/${sessionId}`);
  await page.getByRole('link', { name: '稍后按相同方法复测' }).click();
  await expect(page).toHaveURL(/\/growth\/posture\/screening/);
  const draft = await page.evaluate(() => JSON.parse(localStorage.getItem('musclemap.postureScreeningDraft.v1') ?? 'null'));
  expect(draft.currentStep).toBe('boundary');
  expect(draft.context).toEqual({ baselineSessionId: sessionId });
});

test('shows a linked same-method comparison with numeric uncertainty and no recovery claim', async ({ page }) => {
  await seedBrowserSessions(page, { linked: true, withPhoto: true });
  await page.goto('/growth/posture/history');
  await expect(page.getByRole('heading', { name: '同方法复测对照' })).toBeVisible();
  await expect(page.getByText('数值差异 +2.0°；当前协议缺少可直接使用的测量误差，不能判断是否为明确变化。')).toBeVisible();
  await expect(page.getByText(/康复|恢复正常|明显改善/)).toHaveCount(0);
});

function sessionFixture(id: string, value: number, baselineSessionId?: string): PostureScreeningSession {
  const input = screeningInput(false);
  const result = evaluatePostureScreening(input);
  return {
    id,
    status: result.status,
    input,
    result,
    photoMeasurements: [{ view: 'left-lateral', protocolVersion: 'posture-photo-standard-v1', photoAssetAvailable: false, landmarks: {}, measurements: [{ metricId: 'craniovertebral-angle', value, unit: 'deg', evidenceIds: ['cva-image-reliability-v1'] }], quality: 'valid' }],
    context: baselineSessionId ? { baselineSessionId } : undefined,
    createdAt: '2026-07-17T08:00:00.000Z',
    updatedAt: '2026-07-17T08:00:00.000Z',
    completedAt: '2026-07-17T08:00:00.000Z',
  };
}

function screeningInput(skipPhoto = true): PostureScreeningInput {
  return {
    age: 30,
    boundaryAccepted: true,
    safetyFlags: [],
    primaryConcern: 'neck-upper-quarter',
    subjectiveObservations: ['head-position-concern'],
    movement: { testId: 'upper-quarter-reach-observation-v1', status: 'completed', stopSymptoms: [], observations: ['head-advances-during-reach'] },
    photo: { status: skipPhoto ? 'skipped' : 'completed', observations: [], reasonCodes: [] },
  };
}

async function seedBrowserSessions(page: import('@playwright/test').Page, options: { linked: boolean; withPhoto: boolean }) {
  return page.evaluate(async ({ linked, withPhoto }) => {
    const repositoryPath = '/src/repositories/postureScreeningRepository.ts';
    const rulesPath = '/src/utils/postureScreeningRules.ts';
    const { createPostureScreeningRepository } = await import(/* @vite-ignore */ repositoryPath) as typeof import('../repositories/postureScreeningRepository');
    const { evaluatePostureScreening } = await import(/* @vite-ignore */ rulesPath) as typeof import('../utils/postureScreeningRules');
    const repository = createPostureScreeningRepository();
    const makeInput = (): import('../utils/postureScreeningRules').PostureScreeningInput => ({ age: 30, boundaryAccepted: true, safetyFlags: [], primaryConcern: 'neck-upper-quarter', subjectiveObservations: ['head-position-concern'], movement: { testId: 'upper-quarter-reach-observation-v1', status: 'completed', stopSymptoms: [], observations: ['head-advances-during-reach'] }, photo: { status: withPhoto ? 'completed' : 'skipped', observations: [], reasonCodes: [] } });
    const input = makeInput();
    let assetId = '';
    if (withPhoto) {
      const asset = await repository.savePhotoAsset({ ownerId: 'history-seed', view: 'left-lateral', blob: new Blob(['history-photo'], { type: 'image/jpeg' }), width: 480, height: 640 });
      if (!asset.ok) throw new Error(asset.error);
      assetId = asset.asset.id;
    }
    const measurement = (value: number) => [{ view: 'left-lateral' as const, protocolVersion: 'posture-photo-standard-v1' as const, photoAssetId: assetId || undefined, photoAssetAvailable: Boolean(assetId), landmarks: {}, measurements: [{ metricId: 'craniovertebral-angle', value, unit: 'deg' as const, evidenceIds: ['cva-image-reliability-v1'] }], quality: 'valid' as const }];
    const first = repository.saveSession({ input, result: evaluatePostureScreening(input), photoMeasurements: withPhoto ? measurement(45) : [] });
    if (!first.ok) throw new Error(first.error);
    if (!linked) return { sessionId: first.session.id, assetId };
    const currentInput = makeInput();
    const second = repository.saveSession({ input: currentInput, result: evaluatePostureScreening(currentInput), photoMeasurements: measurement(47), context: { baselineSessionId: first.session.id } });
    if (!second.ok) throw new Error(second.error);
    return { sessionId: second.session.id, assetId };
  }, options);
}
