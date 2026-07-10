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
  expect(response.headers['cache-control']).toBe('private, no-store');
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
  const diagnostics: Array<Record<string, unknown>> = [];
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
    now: () => 2_000,
    logger: {
      info(_event: string, values: Record<string, unknown>) { diagnostics.push(values); },
      error() {}
    }
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
    account: { userId: '42', nickname: '训练者', avatarUrl: 'https://example.com/avatar.jpg', vipType: 11 },
    accountState: 'ready'
  });
  expect(JSON.stringify(response.body)).not.toContain('MUSIC_U');
  expect(records.get('music:session:musclemap-session-id-1234567890')).toMatchObject({
    sealedCookie: 'sealed:MUSIC_U=member-secret',
    account: { userId: '42', nickname: '训练者', vipType: 11 }
  });
  expect(records.has('music:qr:login-attempt-id')).toBe(false);
  expect(diagnostics).toHaveLength(1);
  expect(diagnostics[0]).toMatchObject({
    upstreamCode: 803,
    hasMusicU: true,
    redisWriteAttempted: true,
    redisWriteSucceeded: true,
    accountFetchSucceeded: true,
    errorStage: null
  });
  expect(JSON.stringify(diagnostics)).not.toContain('member-secret');
});

test('music auth store uses the Vercel KV write token and never the read-only token', async () => {
  // @ts-expect-error Server-only modules live outside the TypeScript app source tree.
  const { createMusicAuthStore } = await import('../../server/music/store.js');
  const originalEnvironment = {
    customUrl: process.env.MUSIC_AUTH_REDIS_REST_URL,
    customToken: process.env.MUSIC_AUTH_REDIS_REST_TOKEN,
    upstashUrl: process.env.UPSTASH_REDIS_REST_URL,
    upstashToken: process.env.UPSTASH_REDIS_REST_TOKEN,
    kvUrl: process.env.KV_REST_API_URL,
    kvToken: process.env.KV_REST_API_TOKEN,
    readOnlyToken: process.env.KV_REST_API_READ_ONLY_TOKEN
  };
  let requestedUrl = '';
  let authorization = '';
  let command: unknown = null;

  delete process.env.MUSIC_AUTH_REDIS_REST_URL;
  delete process.env.MUSIC_AUTH_REDIS_REST_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  process.env.KV_REST_API_URL = 'https://redis.example.test';
  process.env.KV_REST_API_TOKEN = 'write-token-for-test';
  process.env.KV_REST_API_READ_ONLY_TOKEN = 'read-only-token-must-not-be-used';

  try {
    const store = createMusicAuthStore({
      fetchImpl: async (url: string | URL | Request, init?: RequestInit) => {
        requestedUrl = String(url);
        authorization = String((init?.headers as Record<string, string>)?.Authorization ?? '');
        command = JSON.parse(String(init?.body));
        return new Response(JSON.stringify({ result: 'OK' }), { status: 200 });
      }
    });
    await store.setJson('music:test', { ok: true }, 60);
  } finally {
    const restore = (name: string, value: string | undefined) => {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    };
    restore('MUSIC_AUTH_REDIS_REST_URL', originalEnvironment.customUrl);
    restore('MUSIC_AUTH_REDIS_REST_TOKEN', originalEnvironment.customToken);
    restore('UPSTASH_REDIS_REST_URL', originalEnvironment.upstashUrl);
    restore('UPSTASH_REDIS_REST_TOKEN', originalEnvironment.upstashToken);
    restore('KV_REST_API_URL', originalEnvironment.kvUrl);
    restore('KV_REST_API_TOKEN', originalEnvironment.kvToken);
    restore('KV_REST_API_READ_ONLY_TOKEN', originalEnvironment.readOnlyToken);
  }

  expect(requestedUrl).toBe('https://redis.example.test');
  expect(authorization).toBe('Bearer write-token-for-test');
  expect(authorization).not.toContain('read-only-token');
  expect(command).toEqual(['SET', 'music:test', JSON.stringify({ ok: true }), 'EX', 60]);
});

test('music cookie vault supports an empty pre-login cookie', async () => {
  // @ts-expect-error Server-only modules live outside the TypeScript app source tree.
  const { createCookieVault } = await import('../../server/music/cookie-vault.js');
  const vault = createCookieVault(Buffer.alloc(32, 7));
  const sealed = vault.seal('');

  expect(sealed.split('.')).toHaveLength(3);
  expect(vault.unseal(sealed)).toBe('');
});

test('NetEase qr requests use type 3 and merge every Set-Cookie value', async () => {
  // @ts-expect-error Server-only modules live outside the TypeScript app source tree.
  const { createNetEaseClient } = await import('../../server/music/netease-client.js');
  const payloads: Array<Record<string, unknown>> = [];
  const requestCookies: string[] = [];
  let requestIndex = 0;
  const responses = [
    {
      body: { code: 200, unikey: 'netease-qr-key' },
      cookies: ['NMTID=pre-login; Path=/', '__csrf=csrf-token; Path=/']
    },
    {
      body: { code: 803 },
      cookies: [
        'MUSIC_U=member-secret; Expires=Sat, 10 Jul 2027 10:00:00 GMT; Path=/',
        'MUSIC_A=member-refresh; Path=/'
      ]
    }
  ];
  const client = createNetEaseClient(
    async (_url: string | URL | Request, init?: RequestInit) => {
      requestCookies.push(String((init?.headers as Record<string, string>)?.Cookie ?? ''));
      const current = responses[requestIndex++];
      const headers = new Headers();
      current.cookies.forEach((cookie) => headers.append('Set-Cookie', cookie));
      return new Response(JSON.stringify(current.body), { status: 200, headers });
    },
    (payload: Record<string, unknown>) => {
      payloads.push(payload);
      return { params: 'encrypted', encSecKey: 'encrypted-key' };
    }
  );

  const started = await client.startQrLogin();
  const checked = await client.checkQrLogin(started.key, started.cookie);

  expect(payloads).toEqual([
    { type: 3, csrf_token: '' },
    { key: 'netease-qr-key', type: 3, csrf_token: 'csrf-token' }
  ]);
  expect(requestCookies[0]).toMatch(/(?:^|; )deviceId=[A-F0-9]{52}(?:;|$)/);
  expect(requestCookies[0]).toContain('os=pc');
  expect(requestCookies[0]).toContain('appver=3.1.17.204416');
  expect(started.cookie).toContain('deviceId=');
  expect(requestCookies[1]).toBe(started.cookie);
  expect(checked.cookie).toContain('MUSIC_U=member-secret');
  expect(checked.cookie).toContain('MUSIC_A=member-refresh');
  expect(checked.diagnostics).toEqual({
    hasSetCookie: true,
    setCookieCount: 2,
    hasMusicU: true,
    hasMusicA: true,
    hasCsrf: true
  });
});

test('authorized qr login stays bound when account profile synchronization fails', async () => {
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
      async checkQrLogin() {
        return {
          code: 803,
          cookie: 'MUSIC_U=member-secret',
          diagnostics: { hasSetCookie: true, setCookieCount: 1, hasMusicU: true, hasMusicA: false, hasCsrf: false }
        };
      },
      async getAccount() { return null; }
    },
    seal: (value: string) => `sealed:${value}`,
    unseal: (value: string) => value.replace(/^sealed:/, ''),
    now: () => 2_000,
    logger: { info() {}, error() {} }
  });
  const response = createJsonResponse();

  await handler({
    method: 'GET',
    headers: { cookie: 'mm_music_session=musclemap-session-id-1234567890' },
    query: { loginId: 'login-attempt-id' }
  }, response);

  expect(response.statusCode).toBe(200);
  expect(response.body).toEqual({ status: 'authorized', accountState: 'pending' });
  expect(records.get('music:session:musclemap-session-id-1234567890')).toMatchObject({
    sealedCookie: 'sealed:MUSIC_U=member-secret',
    account: null
  });
  expect(records.has('music:qr:login-attempt-id')).toBe(false);
});

test('authorized qr login stays successful when the account cache update fails', async () => {
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
  let sessionWrites = 0;
  const handler = createQrStatusHandler({
    store: {
      async getJson(key: string) { return records.get(key) ?? null; },
      async setJson(key: string, value: unknown) {
        sessionWrites += 1;
        if (sessionWrites === 2) throw new Error('account cache unavailable');
        records.set(key, value);
      },
      async delete(key: string) { records.delete(key); }
    },
    netease: {
      async checkQrLogin() { return { code: 803, cookie: 'MUSIC_U=member-secret' }; },
      async getAccount() { return { userId: '42', nickname: '训练者', vipType: 11 }; }
    },
    seal: (value: string) => `sealed:${value}`,
    unseal: (value: string) => value.replace(/^sealed:/, ''),
    now: () => 2_000,
    logger: { info() {}, error() {} }
  });
  const response = createJsonResponse();

  await handler({
    method: 'GET',
    headers: { cookie: 'mm_music_session=musclemap-session-id-1234567890' },
    query: { loginId: 'login-attempt-id' }
  }, response);

  expect(response.statusCode).toBe(200);
  expect(response.body).toEqual({ status: 'authorized', accountState: 'pending' });
  expect(records.get('music:session:musclemap-session-id-1234567890')).toMatchObject({
    sealedCookie: 'sealed:MUSIC_U=member-secret',
    account: null
  });
});

test('music account remains bound while account profile synchronization is pending', async () => {
  // @ts-expect-error Vercel API handlers live outside the TypeScript app source tree.
  const { createAccountHandler } = await import('../../api/music/account.js');
  const records = new Map<string, unknown>([
    ['music:session:musclemap-session-id-1234567890', {
      sealedCookie: 'sealed:MUSIC_U=member-secret',
      account: null,
      authorizedAt: 2_000,
      expiresAt: 301_000
    }]
  ]);
  const handler = createAccountHandler({
    store: {
      async getJson(key: string) { return records.get(key) ?? null; },
      async setJson(key: string, value: unknown) { records.set(key, value); },
      async delete(key: string) { records.delete(key); }
    },
    netease: { async getAccount() { return null; } },
    unseal: (value: string) => value.replace(/^sealed:/, ''),
    now: () => 3_000
  });
  const response = createJsonResponse();

  await handler({
    method: 'GET',
    headers: { cookie: 'mm_music_session=musclemap-session-id-1234567890' }
  }, response);

  expect(response.statusCode).toBe(200);
  expect(response.body).toEqual({ bound: true, accountState: 'pending' });
  expect(records.has('music:session:musclemap-session-id-1234567890')).toBe(true);
});

test('NetEase member song URL request carries the bound cookie', async () => {
  // @ts-expect-error Server-only modules live outside the TypeScript app source tree.
  const { createNetEaseClient } = await import('../../server/music/netease-client.js');
  const payloads: Array<Record<string, unknown>> = [];
  let requestCookie = '';
  let requestUrl = '';
  const client = createNetEaseClient(
    async (url: string | URL | Request, init?: RequestInit) => {
      requestUrl = String(url);
      requestCookie = String((init?.headers as Record<string, string>)?.Cookie ?? '');
      return new Response(JSON.stringify({
        code: 200,
        data: [{ id: 347230, url: 'https://example.com/member-song.mp3', code: 200, br: 320000 }]
      }), { status: 200 });
    },
    (payload: Record<string, unknown>) => {
      payloads.push(payload);
      return { params: 'encrypted', encSecKey: 'encrypted-key' };
    }
  );

  const result = await client.getSongUrl('347230', 'MUSIC_U=member-secret; __csrf=csrf-token');

  expect(requestUrl).toBe('https://music.163.com/weapi/song/enhance/player/url');
  expect(requestCookie).toContain('MUSIC_U=member-secret');
  expect(payloads).toEqual([{
    ids: '["347230"]',
    br: 999000,
    csrf_token: 'csrf-token'
  }]);
  expect(result).toEqual({
    url: 'https://example.com/member-song.mp3',
    code: 200,
    bitrate: 320000
  });
});

test('member song URL handler reads the encrypted server session without exposing it', async () => {
  // @ts-expect-error Vercel API handlers live outside the TypeScript app source tree.
  const { createSongUrlHandler } = await import('../../api/music/song-url.js');
  let upstreamCookie = '';
  const handler = createSongUrlHandler({
    store: {
      async getJson() {
        return { sealedCookie: 'sealed:MUSIC_U=member-secret', account: { userId: '42' } };
      }
    },
    netease: {
      async getSongUrl(_id: string, cookie: string) {
        upstreamCookie = cookie;
        return { url: 'https://example.com/member-song.mp3', code: 200, bitrate: 320000 };
      }
    },
    unseal: (value: string) => value.replace(/^sealed:/, '')
  });
  const response = createJsonResponse();

  await handler({
    method: 'GET',
    headers: { cookie: 'mm_music_session=musclemap-session-id-1234567890' },
    query: { id: '347230' }
  }, response);

  expect(response.statusCode).toBe(200);
  expect(response.headers['cache-control']).toBe('private, no-store');
  expect(response.body).toEqual({
    ok: true,
    audioUrl: 'https://example.com/member-song.mp3',
    bitrate: 320000
  });
  expect(upstreamCookie).toBe('MUSIC_U=member-secret');
  expect(JSON.stringify(response.body)).not.toContain('MUSIC_U');
});

test('dashboard uses the bound account song URL in a native audio player', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value() {
        this.dispatchEvent(new Event('playing'));
        return Promise.resolve();
      }
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      value() {
        this.dispatchEvent(new Event('pause'));
      }
    });
  });
  await page.route('**/api/netease-playlist?id=*', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        playlist: { id: '19723756', name: 'Member Playlist', source: 'netease', trackCount: 1 },
        tracks: [{ id: '347230', name: 'Member Track', artist: 'Member Artist' }]
      })
    });
  });
  await page.route('**/api/music/song-url?id=*', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, audioUrl: 'https://example.com/member-song.mp3', bitrate: 320000 })
    });
  });
  await page.addInitScript(() => {
    window.localStorage.setItem('musclemap.neteasePlaylist.v1', JSON.stringify('19723756'));
  });

  await page.goto('/');

  await expect(page.locator('audio[aria-label="网易云账号权限播放器"]')).toHaveAttribute(
    'src',
    'https://example.com/member-song.mp3'
  );
  await expect(page.locator('iframe[title="网易云官方单曲播放器"]')).toHaveCount(0);
  await page.getByRole('button', { name: '播放当前歌曲' }).click();
  await expect(page.getByRole('button', { name: '暂停当前歌曲' })).toBeVisible();
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

test('music settings reports a successful binding while account details are pending', async ({ page }) => {
  await page.route('**/api/music/account', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ bound: false })
    });
  });
  await page.route('**/api/music/auth/qr/start', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        loginId: 'login-attempt-id',
        qrImage: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',
        expiresAt: Date.now() + 300_000
      })
    });
  });
  await page.route('**/api/music/auth/qr/status?loginId=*', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ status: 'authorized', accountState: 'pending' })
    });
  });

  await page.goto('/music');
  await page.getByRole('button', { name: '绑定网易云账号' }).click();

  await expect(page.getByText('账号已绑定，资料正在同步')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByAltText('网易云登录二维码')).not.toBeVisible();
});

test('music settings distinguishes a qr status service failure', async ({ page }) => {
  await page.route('**/api/music/account', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ bound: false }) });
  });
  await page.route('**/api/music/auth/qr/start', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        loginId: 'login-attempt-id',
        qrImage: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',
        expiresAt: Date.now() + 300_000
      })
    });
  });
  await page.route('**/api/music/auth/qr/status?loginId=*', async (route) => {
    await route.fulfill({
      status: 502,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'error', error: 'QR_STATUS_FAILED', errorStage: 'REDIS_WRITE_FAILED' })
    });
  });

  await page.goto('/music');
  await page.getByRole('button', { name: '绑定网易云账号' }).click();

  await expect(page.getByRole('alert')).toHaveText('绑定服务暂时异常，请检查服务端日志');
});
