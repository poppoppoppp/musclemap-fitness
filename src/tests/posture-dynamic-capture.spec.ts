import { expect, test, type Page } from '@playwright/test';


test.beforeEach(async ({ page }) => {
  await installCameraMock(page);
  await page.clock.install({ time: new Date('2026-07-20T00:00:00Z') });
  await page.goto('/src/tests/fixtures/posture-dynamic-harness.html');
  await expect(page.locator('html')).toHaveAttribute('data-harness-mounted', 'true');
});


test('shows three slow single-repetition protocols and requires one visible side for neck retraction', async ({ page }) => {
  await expect(page.getByRole('button', { name: /双臂上举/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /徒手深蹲/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /颈部回缩/ })).toBeVisible();

  await page.getByRole('button', { name: /颈部回缩/ }).click();
  await expect(page.getByText('回缩、短暂停留、恢复', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: '打开动态实验摄像头' })).toBeDisabled();
  await page.getByRole('button', { name: '右侧可见' }).click();
  await expect(page.getByRole('button', { name: '打开动态实验摄像头' })).toBeEnabled();
});


test('captures above five FPS, guides the pace, downsamples by timestamps and submits at most forty frames', async ({ page }) => {
  let submittedFrameCount = 0;
  await page.route('http://posture.test/v1/posture/analysis/movement', async (route) => {
    const body = route.request().postDataBuffer()?.toString('latin1') ?? '';
    submittedFrameCount = body.match(/name="frames"/g)?.length ?? 0;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(movementResponse()) });
  });

  await page.getByRole('button', { name: '打开动态实验摄像头' }).click();
  await expect(page.getByRole('button', { name: '开始一次完整动作' })).toBeEnabled();
  await page.getByRole('button', { name: '开始一次完整动作' }).click();
  await expect(page.getByText('准备倒计时')).toBeVisible();

  await page.clock.fastForward(3_100);
  await expect(page.getByText('缓慢将双臂举过头顶')).toBeVisible();
  await page.clock.fastForward(2_700);
  await expect(page.getByText('在最高位置短暂停留')).toBeVisible();
  await page.clock.fastForward(3_500);

  await expect(page.getByText(/送入 RTMPose \d+ 帧/)).toBeVisible();
  await page.getByRole('button', { name: '提交动态 RTMPose 分析' }).click();
  await expect(page.getByTestId('posture-dynamic-analysis-success')).toBeVisible();
  expect(submittedFrameCount).toBeGreaterThan(1);
  expect(submittedFrameCount).toBeLessThanOrEqual(40);
  await expect(page.getByTestId('movement-frame-slider')).toBeVisible();
  await expect(page.getByTestId('posture-trajectory-chart')).toBeVisible();
  await expect(page.getByText('GPU / Test GPU')).toBeVisible();
  await expect(page.getByText('动作完整')).toBeVisible();
});


test('shows incomplete movement honestly without filling missing phases', async ({ page }) => {
  await page.route('http://posture.test/v1/posture/analysis/movement', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(movementResponse(true)),
  }));
  await page.getByRole('button', { name: '打开动态实验摄像头' }).click();
  await page.getByRole('button', { name: '开始一次完整动作' }).click();
  await page.clock.fastForward(10_000);
  await page.getByRole('button', { name: '提交动态 RTMPose 分析' }).click();

  await expect(page.getByText('动作不完整、无法计算')).toBeVisible();
  await expect(page.getByText('系统不会插值补造缺失阶段')).toBeVisible();
});


async function installCameraMock(page: Page) {
  await page.addInitScript(() => {
    const fakeTrack = { stop: () => { (window as unknown as { cameraStopped: boolean }).cameraStopped = true; } };
    const fakeStream = new MediaStream();
    Object.defineProperty(fakeStream, 'getTracks', { value: () => [fakeTrack] });
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => fakeStream } });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', { configurable: true, get: () => 720 });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', { configurable: true, get: () => 720 });
    HTMLMediaElement.prototype.play = async () => undefined;
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args) {
      const context = originalGetContext.apply(this, args as never);
      if (context && 'drawImage' in context) context.drawImage = () => undefined;
      return context;
    } as typeof HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.toBlob = function (callback) {
      callback(new Blob(['frame'], { type: 'image/jpeg' }));
    };
  });
}


function movementResponse(incomplete = false) {
  const keypoints = Array.from({ length: 26 }, (_, index) => ({ index, name: `point-${index}`, x: 20 + index, y: 30 + index, score: 0.9 }));
  return {
    requestId: 'movement-1',
    model: { id: 'rtmpose-m-body26-256x192', version: '1.3.2', config: 'body26', checkpointSha256: 'pose' },
    detector: { id: 'rtmdet-m-person-640', version: '3.2.0', config: 'detector', checkpointSha256: 'detector' },
    runtime: { runtime: 'pytorch', runtimeVersion: '2.1', device: 'gpu', deviceName: 'Test GPU', cudaVersion: '12.1', dependencyVersions: {} },
    timingMs: { decode: 10, detection: 20, pose: 30, total: 60 },
    limits: { maxFrames: 40, maxFrameBytes: 4_000_000, maxRequestBytes: 40_000_000, maxFramePixels: 4_000_000, maxTotalPixels: 80_000_000 },
    frames: [{ index: 0, timestampMs: 0, status: 'valid', image: { width: 720, height: 720, mimeType: 'image/jpeg', bytes: 5 }, person: { boundingBox: { x: 10, y: 10, width: 600, height: 680, score: 0.9 }, keypoints }, timingMs: { decode: 1, detection: 2, pose: 3, total: 6 }, error: null }],
    analysis: {
      analysisVersion: 'posture-metrics-v1', action: 'bilateral-arm-raise', view: 'front', visibleSide: null,
      status: incomplete ? 'incomplete' : 'valid', requiredKeypoints: [], rawFrames: [], processedFrames: [],
      phases: incomplete
        ? { status: 'incomplete', startIndex: 0, peakIndex: 5, returnIndex: null, holdIndices: [5, 6], reasons: ['MOVEMENT_INCOMPLETE'] }
        : { status: 'complete', startIndex: 0, peakIndex: 5, returnIndex: 10, holdIndices: [5, 6], reasons: [] },
      metrics: [{ id: 'arm-range', label: '左右活动范围', status: incomplete ? 'unavailable' : 'valid', quality: incomplete ? 'invalid' : 'valid', requiredViews: ['front'], keypoints: [], formula: 'P95 - P05', values: incomplete ? [] : [{ label: 'left', value: 165, unit: 'degrees' }], confidence: 0.9, unavailableReasons: incomplete ? ['MOVEMENT_INCOMPLETE'] : [], analysisVersion: 'posture-metrics-v1', modelId: 'rtmpose', modelVersion: '1.3.2' }],
      trajectories: [{ id: 'left-arm-angle', label: '左臂角度', unit: 'degrees', samples: [{ frameIndex: 0, timestampMs: 0, value: 0 }, { frameIndex: 5, timestampMs: 3000, value: 165 }, { frameIndex: 10, timestampMs: 6000, value: 0 }] }],
    },
  };
}
