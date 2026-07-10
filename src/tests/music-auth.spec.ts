import { expect, test } from '@playwright/test';

type JsonResponse = {
  statusCode: number;
  body: Record<string, unknown>;
  headers: Record<string, string | string[]>;
  status: (code: number) => JsonResponse;
  setHeader: (name: string, value: string | string[]) => void;
  json: (payload: Record<string, unknown>) => JsonResponse;
};

function createJsonResponse(): JsonResponse {
  return {
    statusCode: 0,
    body: {},
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

test('qr login start keeps NetEase cookies server-side and sets only an HttpOnly MuscleMap session', async () => {
  // @ts-expect-error Vercel API handlers live outside the TypeScript app source tree.
  const { createStartQrHandler } = await import('../../api/music/auth/qr/start.js');
  const records = new Map<string, unknown>();
  const handler = createStartQrHandler({
    store: {
      async setJson(key: string, value: unknown) { records.set(key, value); }
    },
    netease: {
      async startQrLogin() { return { key: 'netease-qr-key', cookie: 'NMTID=server-only' }; }
    },
    seal: (value: string) => `sealed:${value}`,
    createQrImage: async () => 'data:image/png;base64,qr-image',
    createId: () => 'login-attempt-id',
    createSessionId: () => 'musclemap-session-id-1234567890',
    now: () => 1_000
  });
  const response = createJsonResponse();

  await handler({ method: 'POST', headers: {} }, response);

  expect(response.statusCode).toBe(200);
  expect(response.body).toEqual({
    loginId: 'login-attempt-id',
    qrImage: 'data:image/png;base64,qr-image',
    expiresAt: 301_000
  });
  expect(JSON.stringify(response.body)).not.toContain('NMTID');
  expect(response.headers['set-cookie']).toContain('mm_music_session=musclemap-session-id-1234567890');
  expect(response.headers['set-cookie']).toContain('HttpOnly');
  expect(records.get('music:qr:login-attempt-id')).toMatchObject({
    sessionId: 'musclemap-session-id-1234567890',
    qrKey: 'netease-qr-key',
    sealedCookie: 'sealed:NMTID=server-only'
  });
});

test('authorized qr login persists the member session without exposing the NetEase cookie', async () => {
  // @ts-expect-error Vercel API handlers live outside the TypeScript app source tree.
  const { createQrStatusHandler } = await import('../../api/music/auth/qr/status.js');
  const records = new Map<string, unknown>([
    ['music:qr:login-attempt-id', {
      sessionId: 'musclemap-session-id-1234567890',
      qrKey: 'netease-qr-key',
      sealedCookie: 'sealed:NMTID=server-only',
      expiresAt: 301_000
    }]
  ]);
  const handler = createQrStatusHandler({
    store: {
      async getJson(key: string) { return records.get(key) ?? null; },
      async setJson(key: string, value: unknown) { records.set(key, value); },
      async delete(key: string) { records.delete(key); }
    },
    netease: {
      async checkQrLogin() { return { code: 803, cookie: 'MUSIC_U=member-secret' }; },
      async getAccount() {
        return { userId: '42', nickname: '训练者', avatarUrl: 'https://example.com/avatar.jpg', vipType: 11 };
      }
    },
    seal: (value: string) => `sealed:${value}`,
    unseal: (value: string) => value.replace(/^sealed:/, ''),
    now: () => 2_000
  });
  const response = createJsonResponse();

  await handler({
    method: 'GET',
    headers: { cookie: 'mm_music_session=musclemap-session-id-1234567890' },
    query: { loginId: 'login-attempt-id' }
  }, response);

  expect(response.statusCode).toBe(200);
  expect(response.body).toEqual({
    status: 'authorized',
    account: { userId: '42', nickname: '训练者', avatarUrl: 'https://example.com/avatar.jpg', vipType: 11 }
  });
  expect(JSON.stringify(response.body)).not.toContain('MUSIC_U');
  expect(records.get('music:session:musclemap-session-id-1234567890')).toMatchObject({
    sealedCookie: 'sealed:MUSIC_U=member-secret',
    account: { userId: '42', nickname: '训练者', vipType: 11 }
  });
  expect(records.has('music:qr:login-attempt-id')).toBe(false);
});

test('music settings binds a NetEase account through the qr status flow', async ({ page }) => {
  let statusChecks = 0;
  let loggedOut = false;

  await page.route('**/api/music/account', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(loggedOut ? { bound: false } : { bound: false })
    });
  });
  await page.route('**/api/music/auth/qr/start', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ loginId: 'login-attempt-id', qrImage: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>', expiresAt: Date.now() + 300_000 })
    });
  });
  await page.route('**/api/music/auth/qr/status?loginId=*', async (route) => {
    statusChecks += 1;
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(statusChecks === 1
        ? { status: 'scanned' }
        : { status: 'authorized', account: { userId: '42', nickname: '训练者', avatarUrl: 'https://example.com/avatar.jpg', vipType: 11 } })
    });
  });
  await page.route('**/api/music/logout', async (route) => {
    loggedOut = true;
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/music');
  await expect(page.getByRole('heading', { name: '训练音乐设置' })).toBeVisible();
  await page.getByRole('button', { name: '绑定网易云账号' }).click();
  await expect(page.getByAltText('网易云登录二维码')).toBeVisible();
  await expect(page.getByText('已扫码，请在网易云 App 中确认')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText('训练者')).toBeVisible({ timeout: 8_000 });
  await expect(page.getByText('黑胶 VIP')).toBeVisible();
  await page.getByRole('button', { name: '解除绑定' }).click();
  await expect(page.getByRole('button', { name: '绑定网易云账号' })).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage).some((key) => /cookie|music_u|netease.*session/i.test(key)))).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});
