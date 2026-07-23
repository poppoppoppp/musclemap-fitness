import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { isPostureCaptureSequenceComplete, nextPostureCaptureStep, POSTURE_AUTOMATED_CAPTURE_STEPS } from '../utils/postureScreeningFlow';

test.setTimeout(60_000);

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.removeItem('musclemap.postureScreeningDraft.v1');
    localStorage.removeItem('musclemap.postureScreeningSessions.v1');
  });
});

async function passBoundary(page: import('@playwright/test').Page, age = '30') {
  await page.getByLabel('年龄').fill(age);
  await page.getByLabel('我理解这是体态与功能表现筛查，不是医疗诊断').check();
  await page.getByRole('button', { name: '继续安全检查' }).click();
}

async function passSafety(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: '继续选择关注表现' }).click();
}

const completedAnswers = {
  age: 30,
  boundaryAccepted: true,
  safetyFlags: [],
  primaryConcern: 'neck-upper-quarter',
  functionalImpact: 0,
  subjectiveObservations: [],
  movement: {
    testId: 'upper-quarter-reach-observation-v1',
    status: 'completed',
    stopSymptoms: [],
    observations: [],
  },
  photo: { status: 'skipped', observations: [], reasonCodes: [] },
};

function draftAt(currentStep: string, captureSnapshot?: ReturnType<typeof captureThrough>) {
  return {
    id: 'legacy-draft',
    currentStep,
    answers: completedAnswers,
    photoMeasurements: [],
    ...(captureSnapshot ? { captureSnapshot } : {}),
    createdAt: '2026-07-20T08:00:00.000Z',
    updatedAt: '2026-07-20T08:00:00.000Z',
  };
}

function captureThrough(step: 'front' | 'side' | 'back' | 'bilateral-arm-raise' | 'bodyweight-squat' | 'neck-retraction') {
  const order = ['front', 'side', 'back', 'bilateral-arm-raise', 'bodyweight-squat', 'neck-retraction'] as const;
  const included = new Set(order.slice(0, order.indexOf(step) + 1));
  const staticCaptures = (['front', 'side', 'back'] as const).filter((view) => included.has(view)).map((view) => ({
    view,
    visibleSide: null,
    status: 'unavailable' as const,
    quality: null,
    warnings: [],
    model: null,
    detector: null,
    metrics: [],
  }));
  const movements = (['bilateral-arm-raise', 'bodyweight-squat', 'neck-retraction'] as const).filter((action) => included.has(action)).map((action) => ({
    action,
    view: action === 'neck-retraction' ? 'side' as const : 'front' as const,
    visibleSide: null,
    status: 'unavailable' as const,
    submittedFrames: 0,
    validFrames: 0,
    phases: { status: 'incomplete' as const, startIndex: null, peakIndex: null, returnIndex: null, holdIndices: [], reasons: ['test'] },
    warnings: [],
    model: null,
    detector: null,
    metrics: [],
  }));
  return {
    protocolVersion: 'automated-posture-capture-v1' as const,
    validity: 'partial' as const,
    completedAt: '2026-07-20T08:00:00.000Z',
    staticCaptures,
    movements,
  };
}

test('starts the adaptive route, moves focus, and restores the movement step after reload', async ({ page }) => {
  await page.goto('/growth/posture/screening');
  await expect(page.getByRole('link', { name: '返回体态改善' })).toHaveAttribute('href', '/growth/posture');
  await expect(page.getByRole('heading', { name: '体态表现筛查' })).toBeVisible();
  await expect(page.getByTestId('screening-progress')).toContainText('成人边界');
  await expect(page.getByTestId('screening-progress')).not.toContainText('/');

  await passBoundary(page);
  await expect(page.getByRole('heading', { name: '开始前安全检查' })).toBeFocused();
  await passSafety(page);
  await page.getByLabel('头颈与上段').check();
  await page.getByLabel(/自然站立或久坐时.*头部相对肩部明显前移/).check();
  await page.getByRole('button', { name: '继续引导观察' }).click();

  await expect(page.getByRole('heading', { name: '自然站立双臂慢速上举观察' })).toBeFocused();
  await expect(page.getByText('约 30 秒')).toBeVisible();
  await expect(page.getByText('出现眩晕、麻木或放射感、明显疼痛加重或突然无力时立即停止。')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '自然站立双臂慢速上举观察' })).toBeVisible();
});

test('formal route exposes the automated screening entry after the questionnaire and cannot bypass capture', async ({ page }) => {
  await page.evaluate(() => {
    window.history.pushState({}, '', '/growth/posture/screening');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await passBoundary(page);
  await passSafety(page);
  await page.getByRole('button', { name: '继续引导观察' }).click();

  const startAutomated = page.getByRole('button', { name: '开始自动体态筛查' });
  await expect(startAutomated).toBeVisible();
  await startAutomated.click();

  await expect(page.getByRole('heading', { name: '正面静态采集' })).toBeVisible();
  await expect(page.getByRole('button', { name: '当前设备无法采集，暂不进行自动采集' })).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('musclemap.postureScreeningSessions.v1') ?? '[]'))).toHaveLength(0);
});

test('legacy questionnaire drafts and capture drafts with missing prerequisites resume at the front static step', async ({ page }) => {
  for (const draft of [draftAt('photo'), draftAt('review'), draftAt('dynamic-neck-retraction')]) {
    await page.evaluate((value) => localStorage.setItem('musclemap.postureScreeningDraft.v1', JSON.stringify(value)), draft);
    await page.goto('/growth/posture/screening');
    await expect(page.getByRole('heading', { name: '正面静态采集' })).toBeVisible();
    await expect(page.getByRole('button', { name: '重新开始本次筛查' })).toBeVisible();
  }
  await page.getByRole('button', { name: '重新开始本次筛查' }).click();
  await expect(page.getByRole('heading', { name: '先确认适用边界' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('musclemap.postureScreeningDraft.v1'))).toBeNull();
});

test('formal draft restoration preserves the three static then three dynamic capture order without creating an early report', async ({ page }) => {
  const cases = [
    { step: 'static-front', snapshot: undefined, heading: '正面静态采集' },
    { step: 'static-side', snapshot: captureThrough('front'), heading: '侧面静态采集' },
    { step: 'static-back', snapshot: captureThrough('side'), heading: '背面静态采集' },
    { step: 'dynamic-arm-raise', snapshot: captureThrough('back'), heading: '双臂上举' },
    { step: 'dynamic-squat', snapshot: captureThrough('bilateral-arm-raise'), heading: '徒手深蹲' },
    { step: 'dynamic-neck-retraction', snapshot: captureThrough('bodyweight-squat'), heading: '颈部回缩' },
  ];

  for (const item of cases) {
    await page.evaluate((value) => localStorage.setItem('musclemap.postureScreeningDraft.v1', JSON.stringify(value)), draftAt(item.step, item.snapshot));
    await page.goto('/growth/posture/screening');
    await expect(page.getByRole('heading', { name: item.heading })).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('musclemap.postureScreeningSessions.v1') ?? '[]'))).toHaveLength(0);
  }
});

test('Capture Lab and formal capture steps share the same static and dynamic capture engines', () => {
  const lab = readFileSync('src/pages/PostureCaptureLabPage.tsx', 'utf8');
  const labDynamic = readFileSync('src/features/posture/capture/components/DynamicCaptureLab.tsx', 'utf8');
  const formalStatic = readFileSync('src/features/posture-screening/PostureAutomatedStaticStep.tsx', 'utf8');
  const formalDynamic = readFileSync('src/features/posture-screening/PostureAutomatedMovementStep.tsx', 'utf8');

  expect(lab).toContain("usePostureCaptureLab");
  expect(lab).toContain("CaptureViewport");
  expect(formalStatic).toContain("usePostureCaptureLab");
  expect(formalStatic).toContain("CaptureViewport");
  expect(labDynamic).toContain("useDynamicPostureCapture");
  expect(labDynamic).toContain("ResponsiveCameraStage");
  expect(formalDynamic).toContain("useDynamicPostureCapture");
  expect(formalDynamic).toContain("ResponsiveCameraStage");
});

test('the formal state machine only permits report completion after all six capture snapshots', () => {
  expect(POSTURE_AUTOMATED_CAPTURE_STEPS.map(({ id }) => id)).toEqual([
    'static-front',
    'static-side',
    'static-back',
    'dynamic-arm-raise',
    'dynamic-squat',
    'dynamic-neck-retraction',
  ]);
  expect(POSTURE_AUTOMATED_CAPTURE_STEPS.map(({ id }) => nextPostureCaptureStep(id))).toEqual([
    'static-side',
    'static-back',
    'dynamic-arm-raise',
    'dynamic-squat',
    'dynamic-neck-retraction',
    null,
  ]);
  expect(isPostureCaptureSequenceComplete(captureThrough('bodyweight-squat'))).toBe(false);
  expect(isPostureCaptureSequenceComplete(captureThrough('neck-retraction'))).toBe(true);
});

test('browser back from screening restores the posture Growth tab', async ({ page }) => {
  await page.goto('/growth/posture');
  await page.getByRole('link', { name: '开始体态分析' }).click();
  await page.goBack();

  await expect(page).toHaveURL('/growth/posture');
  await expect(page.getByRole('tab', { name: '体态改善' })).toHaveAttribute('aria-selected', 'true');
});

test('discards a damaged draft and allows a fresh screening to continue', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('musclemap.postureScreeningDraft.v1', '{damaged'));
  await page.goto('/growth/posture/screening');

  await expect(page.getByRole('alert')).toContainText('上次未完成的筛查草稿已损坏');
  await passBoundary(page);
  await expect(page.getByRole('heading', { name: '开始前安全检查' })).toBeVisible();
});

test('stops under-18 users before movement or photo instructions and offers a return action', async ({ page }) => {
  await page.goto('/growth/posture/screening');
  await passBoundary(page, '17');

  await expect(page.getByTestId('screening-terminal')).toContainText('当前版本仅支持已满 18 岁');
  await expect(page.getByRole('link', { name: '返回体态主页' })).toHaveAttribute('href', '/growth/posture');
  await expect(page.getByText('双臂慢速上举')).toHaveCount(0);
  await expect(page.getByText(/照片测量/)).toHaveCount(0);
});

test('stops on a safety flag with a professional-review next action', async ({ page }) => {
  await page.goto('/growth/posture/screening');
  await passBoundary(page);
  await page.getByLabel('进行性麻木或无力').check();
  await page.getByRole('button', { name: '继续选择关注表现' }).click();

  await expect(page.getByTestId('screening-terminal')).toContainText('本次自测已暂停');
  await expect(page.getByText('先咨询合格医疗专业人员')).toBeVisible();
  await expect(page.getByText('自然站立双臂慢速上举观察')).toHaveCount(0);
});

test('changing the primary concern removes inapplicable follow-up answers', async ({ page }) => {
  await page.goto('/growth/posture/screening');
  await passBoundary(page);
  await passSafety(page);

  await page.getByLabel('头颈与上段').check();
  const neckFollowUp = page.getByLabel(/自然站立或久坐时.*头部相对肩部明显前移/);
  await neckFollowUp.check();
  await page.getByLabel('肩部左右差异').check();

  await expect(neckFollowUp).toHaveCount(0);
  await expect(page.getByLabel(/同一侧肩峰更高或更低/)).not.toBeChecked();
  await page.getByRole('button', { name: '继续引导观察' }).click();
  const draft = await page.evaluate(() => JSON.parse(localStorage.getItem('musclemap.postureScreeningDraft.v1') ?? 'null'));
  expect(draft.answers.subjectiveObservations).toEqual([]);
});

test('stops when symptoms arise during the guided observation', async ({ page }) => {
  await page.goto('/growth/posture/screening');
  await passBoundary(page);
  await passSafety(page);
  await page.getByLabel('胸廓与躯干').check();
  await page.getByRole('button', { name: '继续引导观察' }).click();
  await page.getByLabel('观察中出现眩晕').check();
  await page.getByRole('button', { name: '开始自动体态筛查' }).click();

  await expect(page.getByTestId('screening-terminal')).toContainText('本次自测已终止');
  await expect(page.getByText('根据症状寻求专业评估')).toBeVisible();
});

test('keeps an eligible screening as a draft until the automated captures are complete', async ({ page }) => {
  await page.goto('/growth/posture');
  await page.goto('/growth/posture/screening');
  await passBoundary(page);
  await passSafety(page);
  await page.getByLabel('头颈与上段').check();
  await page.getByLabel(/自然站立或久坐时.*头部相对肩部明显前移/).check();
  await page.getByRole('button', { name: '继续引导观察' }).click();
  await page.getByLabel('上举时头部会向前移动').check();
  await page.getByRole('button', { name: '开始自动体态筛查' }).click();
  await expect(page.getByRole('heading', { name: '正面静态采集' })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('musclemap.postureScreeningSessions.v1') ?? '[]'))).toHaveLength(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('musclemap.postureScreeningDraft.v1') ?? 'null')?.currentStep)).toBe('static-front');
  await page.goBack();
  await page.goForward();
  await expect(page.getByRole('heading', { name: '正面静态采集' })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('musclemap.postureScreeningSessions.v1') ?? '[]'))).toHaveLength(0);
});
