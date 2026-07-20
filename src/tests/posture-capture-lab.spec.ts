import { execFile } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { expect, test } from '@playwright/test';

const execFileAsync = promisify(execFile);

test('capture lab is isolated and starts with Full, Worker and three capture modes', async ({ page }) => {
  await page.goto('/growth/posture/capture-lab');

  await expect(page.getByRole('heading', { name: '实时体态拍摄引导' })).toBeVisible();
  await expect(page.getByRole('button', { name: /正面/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: /背面/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /侧面/ })).toBeVisible();
  await expect(page.getByTestId('start-capture-lab')).toContainText('Full');
  await expect(page.getByText('候选帧仅保存在当前页面内存')).toBeVisible();
});

test('camera permission denial exposes the real permission error state', async ({ page }) => {
  await page.addInitScript(() => {
    const original = navigator.mediaDevices;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        ...original,
        getUserMedia: () => Promise.reject(new DOMException('Permission denied by test browser', 'NotAllowedError')),
      },
    });
  });
  await page.goto('/growth/posture/capture-lab');
  await page.getByTestId('start-capture-lab').click();

  const error = page.getByTestId('capture-error-state');
  await expect(error).toContainText('CAMERA_PERMISSION_DENIED', { timeout: 30_000 });
  await expect(error).toContainText('未获得摄像头权限');
});

test('aborted official model request produces a model loading failure without remote fallback', async ({ page }) => {
  await page.route('**/models/posture/pose_landmarker_full.task', (route) => route.abort('failed'));
  await page.goto('/growth/posture/capture-lab');
  await page.getByTestId('start-capture-lab').click();

  const error = page.getByTestId('capture-error-state');
  await expect(error).toContainText('MODEL_LOAD_FAILED', { timeout: 20_000 });
  await expect(error).toContainText('MediaPipe 模型加载失败');
});

test('asset verifier fails clearly when a local model does not match the reviewed manifest', async () => {
  const publicRoot = resolve('test-results/posture-corrupt-public');
  const corruptModel = resolve(publicRoot, 'models/posture/pose_landmarker_full.task');
  await rm(publicRoot, { recursive: true, force: true });
  await mkdir(resolve(publicRoot, 'models/posture'), { recursive: true });
  await writeFile(corruptModel, new Uint8Array([1, 2, 3]));

  await expect(execFileAsync(process.execPath, ['scripts/verify-posture-assets.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, POSTURE_ASSET_PUBLIC_DIR: publicRoot },
  })).rejects.toMatchObject({
    stderr: expect.stringContaining('Posture asset verification failed: MediaPipe asset size mismatch'),
  });
});
