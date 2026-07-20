import { expect, test } from '@playwright/test';

test('capture viewport explains automatic stance calibration progress and completion', async ({ page }) => {
  await page.goto('/src/tests/fixtures/posture-stance-calibration-harness.html?status=calibrating&elapsedMs=6400');
  await expect(page.getByTestId('stance-calibration-status')).toContainText('自然站姿校准');
  await expect(page.getByTestId('stance-calibration-status')).toContainText('还需保持约 4 秒');

  await page.goto('/src/tests/fixtures/posture-stance-calibration-harness.html?status=calibrated');
  await expect(page.getByTestId('stance-calibration-status')).toContainText('已按当前自然站姿校准');
  await expect(page.getByTestId('stance-calibration-status')).toContainText('继续原拍摄流程');
});
