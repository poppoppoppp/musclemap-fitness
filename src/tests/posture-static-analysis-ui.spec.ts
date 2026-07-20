import { expect, test, type Page } from '@playwright/test';

const HALPE26_NAMES = [
  'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear', 'left_shoulder', 'right_shoulder',
  'left_elbow', 'right_elbow', 'left_wrist', 'right_wrist', 'left_hip', 'right_hip', 'left_knee',
  'right_knee', 'left_ankle', 'right_ankle', 'head', 'neck', 'hip', 'left_big_toe', 'right_big_toe',
  'left_small_toe', 'right_small_toe', 'left_heel', 'right_heel',
];


test('shows transparent static values, units, confidence, formula and unavailable reason', async ({ page }) => {
  await mockKeypoints(page);
  await page.route('http://posture.test/v1/posture/analysis/static', async (route) => {
    expect(route.request().postDataJSON()).toMatchObject({ view: 'front', modelId: 'rtmpose-m-body26-256x192' });
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(staticResponse()) });
  });
  await mount(page);

  await page.getByRole('button', { name: '提交高精度关键点分析' }).click();
  await expect(page.getByTestId('posture-inference-success')).toBeVisible();
  await expect(page.getByText('静态测量指标')).toBeVisible();
  await page.getByRole('button', { name: '计算透明静态指标' }).click();

  const result = page.getByTestId('posture-static-analysis-success');
  await expect(result).toContainText('posture-metrics-v1');
  await expect(result).toContainText('RTMPose 1.3.2');
  await expect(result).toContainText('头部左右倾斜');
  await expect(result).toContainText('1.20°');
  await expect(result).toContainText('最低输入置信度 0.91');
  await expect(result).toContainText('atan2');
  await expect(result).toContainText('侧面耳肩相对位置');
  await expect(result).toContainText('当前视角不支持');
});


test('side static analysis requires and submits one explicit visible side', async ({ page }) => {
  await mockKeypoints(page);
  let payload: Record<string, unknown> | null = null;
  await page.route('http://posture.test/v1/posture/analysis/static', async (route) => {
    payload = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...staticResponse(), view: 'side', visibleSide: 'left' }) });
  });
  await mount(page, '?view=side');

  await page.getByRole('button', { name: '提交高精度关键点分析' }).click();
  const analyze = page.getByRole('button', { name: '计算透明静态指标' });
  await expect(analyze).toBeDisabled();
  await page.getByRole('button', { name: '左侧可见' }).click();
  await expect(page.getByRole('button', { name: '左侧可见' })).toHaveAttribute('aria-pressed', 'true');
  await analyze.click();

  await expect(page.getByTestId('posture-static-analysis-success')).toBeVisible();
  expect(payload).toMatchObject({ view: 'side', visibleSide: 'left' });
});


async function mount(page: Page, query = '') {
  await page.goto(`/src/tests/fixtures/posture-capture-result-harness.html${query}`);
  await expect(page.locator('html')).toHaveAttribute('data-harness-mounted', 'true');
}


async function mockKeypoints(page: Page) {
  await page.route('http://posture.test/v1/posture/keypoints', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(keypointResponse()),
  }));
}


function keypointResponse() {
  return {
    requestId: 'request-1',
    model: { id: 'rtmpose-m-body26-256x192', version: '1.3.2', config: 'body26', checkpointSha256: 'pose' },
    detector: { id: 'rtmdet-m-person-640', version: '3.2.0', config: 'detector', checkpointSha256: 'detector' },
    keypointSchema: { id: 'halpe26', count: 26, names: HALPE26_NAMES },
    coordinateSpace: { id: 'original-image-pixels', units: 'pixels', origin: 'top-left', xAxis: 'right', yAxis: 'down' },
    runtime: { runtime: 'pytorch', runtimeVersion: '2.1', device: 'gpu', deviceName: 'GPU', cudaVersion: '12.1', dependencyVersions: {} },
    timingMs: { decode: 1, detection: 2, pose: 3, total: 6 },
    image: { width: 1, height: 1, mimeType: 'image/png', bytes: 68 },
    person: { boundingBox: { x: 0, y: 0, width: 1, height: 1, score: 0.95 }, keypoints: HALPE26_NAMES.map((name, index) => ({ index, name, x: 0.5, y: 0.5, score: 0.95 })) },
    warnings: [],
  };
}


function staticResponse() {
  const shared = { quality: 'valid', requiredViews: ['front', 'back'], keypoints: ['left_ear', 'right_ear'], analysisVersion: 'posture-metrics-v1', modelId: 'rtmpose-m-body26-256x192', modelVersion: '1.3.2' };
  return {
    analysisVersion: 'posture-metrics-v1', view: 'front', visibleSide: null,
    normalization: { basis: 'shoulder-width', pixels: 100, centerX: 50, centerY: 100 },
    rawKeypoints: [], normalizedKeypoints: [], filteredKeypoints: [],
    metrics: [
      { ...shared, id: 'head-lateral-tilt', label: '头部左右倾斜', status: 'valid', formula: 'atan2(right_ear.y - left_ear.y, ...)', values: [{ label: 'angle', value: 1.2, unit: 'degrees' }], confidence: 0.91, unavailableReasons: [] },
      { ...shared, id: 'side-ear-shoulder-position', label: '侧面耳肩相对位置', status: 'unavailable', quality: 'invalid', formula: '(ear.x - shoulder.x) / torso', values: [], confidence: null, unavailableReasons: ['VIEW_NOT_SUPPORTED:front'] },
    ],
  };
}
