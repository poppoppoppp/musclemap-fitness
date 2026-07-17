import { expect, test } from '@playwright/test';
import sharp from 'sharp';

const draftKey = 'musclemap.postureScreeningDraft.v1';
const sessionsKey = 'musclemap.postureScreeningSessions.v1';

async function photoBuffer(color = '#64748b') {
  return sharp({ create: { width: 480, height: 640, channels: 3, background: color } }).jpeg().toBuffer();
}

async function seedPhotoStep(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(({ draftKey, sessionsKey }) => {
    localStorage.removeItem(draftKey);
    localStorage.removeItem(sessionsKey);
    localStorage.setItem(draftKey, JSON.stringify({
      id: 'posture-screening-draft-photo-test',
      currentStep: 'photo',
      answers: {
        age: 30,
        boundaryAccepted: true,
        safetyFlags: [],
        primaryConcern: 'neck-upper-quarter',
        functionalImpact: 3,
        subjectiveObservations: ['head-position-concern'],
        movement: {
          testId: 'upper-quarter-reach-observation-v1',
          status: 'completed',
          stopSymptoms: [],
          observations: ['head-advances-during-reach'],
        },
        photo: { status: 'skipped', observations: [], reasonCodes: [] },
      },
      photoMeasurements: [],
      createdAt: '2026-07-17T08:00:00.000Z',
      updatedAt: '2026-07-17T08:00:00.000Z',
    }));
  }, { draftKey, sessionsKey });
  await page.goto('/growth/posture/screening');
}

test('offers standardized front and left-lateral guidance while keeping photo evidence optional', async ({ page }) => {
  await seedPhotoStep(page);

  await expect(page.getByRole('heading', { name: '可选照片测量' })).toBeFocused();
  await expect(page.getByTestId('screening-progress')).toContainText('可选照片');
  await expect(page.getByText('正对镜头自然站立，镜头与胸廓大致同高。')).toBeVisible();
  await expect(page.getByRole('button', { name: '正面照片' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '左侧面照片' }).click();
  await expect(page.getByText('左侧朝向镜头，自然站立，不刻意收下巴或夹肩。')).toBeVisible();

  const input = page.getByLabel('拍摄或从相册选择照片');
  await expect(input).toHaveAttribute('accept', 'image/*');
  await expect(input).toHaveAttribute('capture', 'environment');
  await expect(page.getByText('照片仅保存在当前设备')).toBeVisible();
  await page.getByRole('button', { name: '暂不使用照片，生成结果' }).click();
  await expect(page.getByTestId('screening-terminal')).toContainText('头位前移伴上段控制负担倾向');
});

test('rejects unsupported and undecodable files, then allows retry without uploading image bytes', async ({ page }) => {
  const imagePayloadRequests: string[] = [];
  page.on('request', (request) => {
    if (request.method() !== 'GET' && request.postDataBuffer()?.length) imagePayloadRequests.push(request.url());
  });
  await seedPhotoStep(page);
  const input = page.getByLabel('拍摄或从相册选择照片');

  await input.setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') });
  await expect(page.getByRole('alert')).toContainText('请选择 JPG、PNG、WebP 或其他图片文件');
  await input.setInputFiles({ name: 'broken.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('broken image') });
  await expect(page.getByRole('alert')).toContainText('无法读取这张照片，请重新拍摄或选择其他图片');
  await input.setInputFiles({ name: 'front.jpg', mimeType: 'image/jpeg', buffer: await photoBuffer() });
  await expect(page.getByRole('img', { name: '待标点的正面照片' })).toBeVisible();
  expect(imagePayloadRequests).toEqual([]);
});

test('supports pointer placement and keyboard adjustment with normalized coordinates across resize', async ({ page }) => {
  await seedPhotoStep(page);
  await page.getByRole('button', { name: '左侧面照片' }).click();
  await page.getByLabel('拍摄或从相册选择照片').setInputFiles({ name: 'side.jpg', mimeType: 'image/jpeg', buffer: await photoBuffer('#334155') });

  await page.getByRole('button', { name: '选择耳屏标点' }).click();
  const stage = page.getByTestId('landmark-stage');
  await stage.click({ position: { x: 240, y: 180 } });
  const marker = page.getByRole('button', { name: '耳屏标点', exact: true });
  const beforeKeyboard = Number(await marker.getAttribute('data-x'));
  await marker.focus();
  await marker.press('ArrowRight');
  const afterKeyboard = Number(await marker.getAttribute('data-x'));
  expect(afterKeyboard).toBeGreaterThan(beforeKeyboard);

  const box = await stage.boundingBox();
  const markerBox = await marker.boundingBox();
  if (!box || !markerBox) throw new Error('landmark stage or marker missing');
  await page.mouse.move(markerBox.x + markerBox.width / 2, markerBox.y + markerBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.35);
  await page.mouse.up();
  const draggedX = Number(await marker.getAttribute('data-x'));
  expect(draggedX).toBeGreaterThan(0.6);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(marker).toHaveAttribute('data-x', String(draggedX));
});

test('reports precise landmark problems and stores valid measurements plus the raw photo locally', async ({ page }) => {
  await seedPhotoStep(page);
  await page.getByRole('button', { name: '左侧面照片' }).click();
  await page.getByLabel('拍摄或从相册选择照片').setInputFiles({ name: 'side.jpg', mimeType: 'image/jpeg', buffer: await photoBuffer('#475569') });
  await page.getByRole('button', { name: '保存照片并继续' }).click();
  await expect(page.getByRole('alert')).toContainText('请标记：耳屏、C7、肩峰、上段躯干参考点、下段躯干参考点');

  const stage = page.getByTestId('landmark-stage');
  const closePoints: Array<[string, number, number]> = [
    ['耳屏', 300, 130],
    ['C7', 335, 130],
    ['肩峰', 300, 240],
    ['上段躯干参考点', 250, 300],
    ['下段躯干参考点', 230, 500],
  ];
  for (const [label, x, y] of closePoints) {
    await page.getByRole('button', { name: `选择${label}标点` }).click();
    await stage.click({ position: { x, y } });
  }
  await page.getByLabel('我已按引导自然站立，未刻意调整体态').check();
  const c7Marker = page.getByRole('button', { name: 'C7标点', exact: true });
  await c7Marker.focus();
  for (let index = 0; index < 16; index += 1) await c7Marker.press('ArrowLeft');
  const earPoint = await page.getByRole('button', { name: '耳屏标点', exact: true }).evaluate((element) => ({ x: Number(element.getAttribute('data-x')), y: Number(element.getAttribute('data-y')) }));
  const c7Point = await page.getByRole('button', { name: 'C7标点', exact: true }).evaluate((element) => ({ x: Number(element.getAttribute('data-x')), y: Number(element.getAttribute('data-y')) }));
  expect(Math.hypot(earPoint.x - c7Point.x, earPoint.y - c7Point.y)).toBeLessThan(0.005);
  await page.getByRole('button', { name: '保存照片并继续' }).click();
  await expect(page.getByRole('alert')).toContainText('耳屏与 C7 标点过近，请分开');
  await page.getByRole('button', { name: '选择C7标点' }).click();
  await stage.click({ position: { x: 235, y: 210 } });
  await page.getByRole('button', { name: '保存照片并继续' }).click();

  await expect(page.getByRole('heading', { name: '生成本次筛查结果' })).toBeFocused();
  const draftPhoto = await page.evaluate(({ draftKey }) => JSON.parse(localStorage.getItem(draftKey) ?? 'null')?.photoMeasurements?.[0], { draftKey });
  expect(draftPhoto).toMatchObject({ view: 'left-lateral', protocolVersion: 'posture-photo-standard-v1', photoAssetAvailable: true, quality: 'valid' });
  expect(draftPhoto.measurements).toHaveLength(3);
  await page.getByRole('button', { name: '使用照片测量，生成结果' }).click();

  await expect(page.getByTestId('screening-terminal')).toContainText('本次筛查支持');
  const stored = await page.evaluate(async ({ sessionsKey }) => {
    const sessions = JSON.parse(localStorage.getItem(sessionsKey) ?? '[]');
    const photo = sessions[0]?.photoMeasurements?.[0];
    if (!photo?.photoAssetId) return { photo, blobSize: 0 };
    const modulePath = '/src/repositories/postureScreeningRepository.ts';
    const { createPostureScreeningRepository } = await import(/* @vite-ignore */ modulePath) as typeof import('../repositories/postureScreeningRepository');
    const blob = await createPostureScreeningRepository().getPhotoBlob(photo.photoAssetId);
    return { photo, blobSize: blob?.size ?? 0 };
  }, { sessionsKey });
  expect(stored.photo).toMatchObject({ view: 'left-lateral', photoAssetAvailable: true, quality: 'valid' });
  expect(stored.photo.measurements).toHaveLength(3);
  expect(stored.photo.landmarks.tragus.x).toBeGreaterThan(0);
  expect(stored.photo.landmarks.tragus.x).toBeLessThan(1);
  expect(stored.blobSize).toBeGreaterThan(0);
});

test('revokes every preview object URL when a photo is replaced or the editor closes', async ({ page }) => {
  await seedPhotoStep(page);
  await page.evaluate(() => {
    const original = URL.revokeObjectURL.bind(URL);
    (window as Window & { revokedPostureUrls?: string[] }).revokedPostureUrls = [];
    URL.revokeObjectURL = (url: string) => {
      (window as Window & { revokedPostureUrls?: string[] }).revokedPostureUrls?.push(url);
      original(url);
    };
  });
  const input = page.getByLabel('拍摄或从相册选择照片');
  await input.setInputFiles({ name: 'first.jpg', mimeType: 'image/jpeg', buffer: await photoBuffer('#0f172a') });
  await input.setInputFiles({ name: 'second.jpg', mimeType: 'image/jpeg', buffer: await photoBuffer('#1e293b') });
  await expect.poll(() => page.evaluate(() => (window as Window & { revokedPostureUrls?: string[] }).revokedPostureUrls?.length ?? 0)).toBe(1);
  await page.getByRole('button', { name: '暂不使用照片，生成结果' }).click();
  await expect.poll(() => page.evaluate(() => (window as Window & { revokedPostureUrls?: string[] }).revokedPostureUrls?.length ?? 0)).toBe(2);
});
