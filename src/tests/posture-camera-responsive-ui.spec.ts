import { expect, test } from '@playwright/test';

test('capture lab route removes app navigation and document padding reserved for ordinary pages', async ({ page }) => {
  await page.goto('/growth/posture/capture-lab');

  await expect(page.getByRole('navigation')).toHaveCount(0);
  await expect(page.getByTestId('app-shell-content')).toHaveAttribute('data-capture-route', 'true');
});

test('mobile portrait camera stage uses the real portrait media ratio and overlays controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/src/tests/fixtures/posture-camera-viewport-harness.html?mediaWidth=720&mediaHeight=1280');
  await expect(page.locator('html')).toHaveAttribute('data-harness-mounted', 'true');

  const stage = page.getByTestId('responsive-camera-stage');
  await expect(stage).toBeVisible();
  const box = await stage.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeCloseTo(390, 0);
  expect(box!.height).toBeCloseTo(390 / (720 / 1280), 0);
  expect(box!.height).toBeLessThanOrEqual(844);
  await expect(page.getByTestId('camera-stage-overlay')).toBeVisible();
  await expect(stage.locator('video')).toHaveCSS('object-fit', 'contain');
});

test('desktop square camera stage expands to available height instead of staying in a portrait box', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/src/tests/fixtures/posture-camera-viewport-harness.html?mediaWidth=720&mediaHeight=720');
  await expect(page.locator('html')).toHaveAttribute('data-harness-mounted', 'true');

  const box = await page.getByTestId('responsive-camera-stage').boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeCloseTo(900, 0);
  expect(box!.height).toBeCloseTo(900, 0);
});

test('dynamic capture reuses the responsive immersive camera stage after the camera is ready', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', { configurable: true, get: () => 720 });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', { configurable: true, get: () => 1280 });
    HTMLMediaElement.prototype.play = async () => undefined;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: async () => new MediaStream() },
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/growth/posture/capture-lab');

  await page.locator('button').last().click();
  await page.locator('button').last().click();

  await expect(page.getByTestId('dynamic-camera-stage')).toBeVisible();
  await expect(page.getByTestId('dynamic-floating-controls')).toBeVisible();
  await expect(page.getByTestId('responsive-camera-stage')).toBeVisible();
});
