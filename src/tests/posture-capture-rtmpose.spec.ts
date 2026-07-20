import { expect, test, type Page } from '@playwright/test';

const HALPE26_NAMES = [
  'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear', 'left_shoulder', 'right_shoulder',
  'left_elbow', 'right_elbow', 'left_wrist', 'right_wrist', 'left_hip', 'right_hip', 'left_knee',
  'right_knee', 'left_ankle', 'right_ankle', 'head', 'neck', 'hip', 'left_big_toe', 'right_big_toe',
  'left_small_toe', 'right_small_toe', 'left_heel', 'right_heel',
];

test('requires an explicit click, shows loading, success metadata and four overlay modes', async ({ page }) => {
  await page.route('http://posture.test/v1/posture/keypoints', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(successResponse()) });
  });
  await mountHarness(page);

  const submit = page.getByRole('button', { name: '提交高精度关键点分析' });
  await expect(submit).toBeVisible();
  await expect(page.getByText('RTMPose body26 技术对比')).toBeVisible();
  await submit.click();
  await expect(page.getByTestId('posture-inference-loading')).toBeVisible();
  await expect(submit).toBeDisabled();

  await expect(page.getByTestId('posture-inference-success')).toContainText('rtmpose-m-body26-256x192');
  await expect(page.getByTestId('posture-inference-success')).toContainText('RTX 3050');
  await expect(page.getByTestId('posture-inference-success')).toContainText('8.0 ms');
  await expect(page.getByTestId('posture-inference-success')).toContainText('left_ear');
  for (const name of ['原图', 'MediaPipe', 'RTMPose', '双模型']) {
    await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'RTMPose', exact: true }).click();
  await expect(page.getByRole('button', { name: 'RTMPose', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '双模型', exact: true }).click();
  await expect(page.getByRole('button', { name: '双模型', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('keypoint-overlay-canvas')).toHaveAttribute('data-overlay-mode', 'both');
});

test('keeps the best frame after backend failure and retries it without recapture', async ({ page }) => {
  let attempts = 0;
  await page.route('http://posture.test/v1/posture/keypoints', async (route) => {
    attempts += 1;
    if (attempts === 1) {
      await route.abort('connectionrefused');
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(successResponse()) });
  });
  await mountHarness(page);

  await page.getByRole('button', { name: '提交高精度关键点分析' }).click();
  await expect(page.getByTestId('posture-inference-error')).toBeVisible();
  await expect(page.getByTestId('capture-best-frame-image')).toBeVisible();
  await page.getByRole('button', { name: '重试同一最佳帧' }).click();

  await expect(page.getByTestId('posture-inference-success')).toBeVisible();
  expect(attempts).toBe(2);
});

test('shows structured no-person error without replacing it with MediaPipe output', async ({ page }) => {
  await page.route('http://posture.test/v1/posture/keypoints', (route) => route.fulfill({
    status: 422,
    contentType: 'application/json',
    body: JSON.stringify({ error: { code: 'NO_PERSON_DETECTED', message: 'No person met the detector confidence threshold.', retryable: true, details: {} } }),
  }));
  await mountHarness(page);

  await page.getByRole('button', { name: '提交高精度关键点分析' }).click();

  await expect(page.getByTestId('posture-inference-error')).toContainText('NO_PERSON_DETECTED');
  await expect(page.getByTestId('posture-inference-error')).toContainText('No person met the detector confidence threshold.');
  await expect(page.getByText('高精度分析失败时不会把 MediaPipe 结果冒充后端结果。')).toBeVisible();
});

async function mountHarness(page: Page) {
  await page.goto('/src/tests/fixtures/posture-capture-result-harness.html');
  await expect(page.locator('html')).toHaveAttribute('data-harness-mounted', 'true');
}

function successResponse() {
  const keypoints = HALPE26_NAMES.map((name, index) => ({ index, name, x: 0.5, y: 0.5, score: index === 3 ? 0.2 : 0.9 }));
  return {
    requestId: 'request-1',
    model: { id: 'rtmpose-m-body26-256x192', version: '1.3.2', config: 'body26', checkpointSha256: 'pose-sha' },
    detector: { id: 'rtmdet-m-person-640', version: '3.2.0', config: 'rtmdet-m', checkpointSha256: 'detector-sha' },
    keypointSchema: { id: 'halpe26', count: 26, names: HALPE26_NAMES },
    coordinateSpace: { id: 'original-image-pixels', units: 'pixels', origin: 'top-left', xAxis: 'right', yAxis: 'down' },
    runtime: { runtime: 'pytorch', runtimeVersion: '2.1.0+cu121', device: 'gpu', deviceName: 'RTX 3050', cudaVersion: '12.1', dependencyVersions: { mmpose: '1.3.2' } },
    timingMs: { decode: 1, detection: 3, pose: 4, total: 8 },
    image: { width: 1, height: 1, mimeType: 'image/png', bytes: 68 },
    person: { boundingBox: { x: 0, y: 0, width: 1, height: 1, score: 0.95 }, keypoints },
    warnings: [{ code: 'LOW_CONFIDENCE_KEYPOINTS', severity: 'warning', message: '1 low point', keypointIndices: [3] }],
  };
}
