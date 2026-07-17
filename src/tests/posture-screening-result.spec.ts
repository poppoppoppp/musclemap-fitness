import { expect, test } from '@playwright/test';

type ResultVariant = 'completed' | 'functional-only' | 'mixed-evidence' | 'safety-review' | 'measurement-invalid' | 'insufficient';

async function createSession(page: import('@playwright/test').Page, variant: ResultVariant) {
  await page.goto('/');
  return page.evaluate(async (variant) => {
    localStorage.removeItem('musclemap.postureScreeningDraft.v1');
    localStorage.removeItem('musclemap.postureScreeningSessions.v1');
    const repositoryPath = '/src/repositories/postureScreeningRepository.ts';
    const rulesPath = '/src/utils/postureScreeningRules.ts';
    const { createPostureScreeningRepository } = await import(/* @vite-ignore */ repositoryPath) as typeof import('../repositories/postureScreeningRepository');
    const { evaluatePostureScreening } = await import(/* @vite-ignore */ rulesPath) as typeof import('../utils/postureScreeningRules');
    const repository = createPostureScreeningRepository();
    const input: import('../utils/postureScreeningRules').PostureScreeningInput = {
      age: 30,
      boundaryAccepted: true,
      safetyFlags: [],
      primaryConcern: 'neck-upper-quarter',
      functionalImpact: 4,
      subjectiveObservations: ['head-position-concern'],
      movement: {
        testId: 'upper-quarter-reach-observation-v1',
        status: 'completed',
        stopSymptoms: [],
        observations: ['head-advances-during-reach'],
      },
      photo: { status: 'skipped', observations: [], reasonCodes: [] },
    };
    let photoMeasurements: import('../repositories/postureScreeningRepository').PosturePhotoMeasurementSnapshot[] = [];
    if (variant === 'completed') {
      input.photo = { status: 'completed', observations: [], reasonCodes: [] };
      const asset = await repository.savePhotoAsset({ ownerId: 'result-test-draft', view: 'left-lateral', blob: new Blob(['local-photo'], { type: 'image/jpeg' }), width: 480, height: 640 });
      if (!asset.ok) throw new Error(asset.error);
      photoMeasurements = [{
        view: 'left-lateral',
        protocolVersion: 'posture-photo-standard-v1',
        photoAssetId: asset.asset.id,
        photoAssetAvailable: true,
        landmarks: { tragus: { x: 0.62, y: 0.24 }, c7: { x: 0.48, y: 0.38 } },
        measurements: [{ metricId: 'craniovertebral-angle', value: 45, unit: 'deg', evidenceIds: ['cva-classic-photogrammetry-review-v1', 'cva-standing-standardization-v1'] }],
        quality: 'valid',
      }];
    } else if (variant === 'mixed-evidence') {
      input.movement = { testId: 'seated-thoracic-rotation-observation-v1', status: 'completed', stopSymptoms: [], observations: ['thoracic-rotation-limited'] };
    } else if (variant === 'safety-review') {
      input.safetyFlags = ['progressive-neurological-symptoms'];
      input.subjectiveObservations = [];
      input.movement.observations = [];
    } else if (variant === 'measurement-invalid') {
      input.photo = { status: 'invalid', observations: [], reasonCodes: ['LANDMARK_MISSING_C7'] };
    } else if (variant === 'insufficient') {
      input.movement.observations = [];
    }
    const result = evaluatePostureScreening(input);
    const saved = repository.saveSession({ input, result, photoMeasurements });
    if (!saved.ok) throw new Error(saved.error);
    return saved.session.id;
  }, variant);
}

test('renders an answer-first completed report with evidence, limits, sources, and versions after refresh', async ({ page }) => {
  const id = await createSession(page, 'completed');
  await page.goto(`/growth/posture/results/${id}`);

  await expect(page.getByTestId('screening-terminal')).toContainText('本次筛查支持：头位前移伴上段控制负担倾向');
  await expect(page.getByRole('heading', { name: '判断依据' })).toBeVisible();
  await expect(page.getByText('主观描述')).toBeVisible();
  await expect(page.getByText('引导动作', { exact: true })).toBeVisible();
  await expect(page.getByText('照片几何', { exact: true })).toBeVisible();
  await expect(page.getByText('头部位置关注')).toBeVisible();
  await expect(page.getByText('上举时头部前移')).toBeVisible();
  await expect(page.getByText(/颅椎角.*45\.0°/)).toBeVisible();
  await expect(page.getByText('照片角度仅作几何记录，本版本未用固定阈值将其转换为体态分类。')).toBeVisible();
  await expect(page.getByRole('heading', { name: '不能说明什么' })).toBeVisible();
  await expect(page.getByText(/不能确认颈椎病变、疼痛病因或特定肌肉失衡/)).toBeVisible();
  await expect(page.getByText('Reliability and Validity of Non-radiographic Methods of Forward Head Posture Measurement: A Systematic Review')).toBeVisible();
  await expect(page.getByText('算法 1.0.0')).toBeVisible();
  await expect(page.getByText('筛查协议 adult-posture-screening-v1')).toBeVisible();
  await expect(page.getByText('照片协议 posture-photo-standard-v1')).toBeVisible();
  await expect(page.getByText(/创建训练|开始训练|推荐动作/)).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('screening-terminal')).toContainText('头位前移伴上段控制负担倾向');
});

for (const [variant, expected] of [
  ['functional-only', '未使用照片，本次结论仅基于主观描述与引导动作'],
  ['mixed-evidence', '暂不强行归为某一种体态倾向'],
  ['safety-review', '本次自测已暂停'],
  ['measurement-invalid', '照片或标点暂不满足测量条件'],
  ['insufficient', '现有证据不足以确认某一种特定体态表现倾向'],
] as const) {
  test(`renders the ${variant} terminal state with an in-scope next action`, async ({ page }) => {
    const id = await createSession(page, variant);
    await page.goto(`/growth/posture/results/${id}`);
    await expect(page.getByTestId('screening-terminal')).toContainText(expected);
    await expect(page.getByRole('heading', { name: '下一步' })).toBeVisible();
    if (variant === 'safety-review') await expect(page.getByText('先咨询合格医疗专业人员')).toBeVisible();
    if (variant === 'measurement-invalid') {
      await expect(page.getByRole('link', { name: '重新拍摄或标点' })).toBeVisible();
      await expect(page.getByRole('button', { name: '跳过照片继续' })).toBeVisible();
    }
    await expect(page.getByText(/创建训练|开始训练|推荐动作/)).toHaveCount(0);
  });
}

test('deletes only the raw local photo while retaining landmarks and measurements', async ({ page }) => {
  const id = await createSession(page, 'completed');
  await page.goto(`/growth/posture/results/${id}`);
  await page.getByRole('button', { name: '删除当前设备上的原始照片' }).click();
  await page.getByRole('button', { name: '确认删除原始照片' }).click();

  await expect(page.getByRole('status')).toContainText('原始照片已删除，标点与测量值仍保留');
  await expect(page.getByText(/颅椎角.*45\.0°/)).toBeVisible();
  const stored = await page.evaluate(({ id }) => {
    const sessions = JSON.parse(localStorage.getItem('musclemap.postureScreeningSessions.v1') ?? '[]');
    return sessions.find((session: { id: string }) => session.id === id)?.photoMeasurements?.[0];
  }, { id });
  expect(stored.photoAssetAvailable).toBe(false);
  expect(stored.photoAssetId).toBeUndefined();
  expect(stored.measurements).toHaveLength(1);
});

test('offers a safe recovery route when a result id is missing', async ({ page }) => {
  await page.goto('/growth/posture/results/not-found');
  await expect(page.getByRole('heading', { name: '未找到这次筛查记录' })).toBeVisible();
  await expect(page.getByRole('link', { name: '返回体态主页' })).toHaveAttribute('href', '/growth/posture');
});

test('keeps the user on the report and explains when an edit draft cannot be saved', async ({ page }) => {
  const id = await createSession(page, 'measurement-invalid');
  await page.goto(`/growth/posture/results/${id}`);
  await page.evaluate(() => {
    Storage.prototype.setItem = () => { throw new Error('blocked'); };
  });
  await page.getByRole('link', { name: '重新拍摄或标点' }).click();

  await expect(page).toHaveURL(new RegExp(`/growth/posture/results/${id}$`));
  await expect(page.getByRole('alert')).toContainText('无法准备修改，请检查浏览器存储设置后重试');
});
