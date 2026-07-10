import { randomBytes } from 'node:crypto';
import { encryptWeapiPayload } from './netease-crypto.js';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
  Referer: 'https://music.163.com/'
};

function randomLowercase(length) {
  return [...randomBytes(length)]
    .map((value) => String.fromCharCode(97 + (value % 26)))
    .join('');
}

function createQrBootstrapCookie(now = Date.now()) {
  const ntesNuid = randomBytes(32).toString('hex');
  const cookies = {
    __remember_me: 'true',
    ntes_kaola_ad: '1',
    _ntes_nuid: ntesNuid,
    _ntes_nnid: `${ntesNuid},${now}`,
    WNMCID: `${randomLowercase(6)}.${now}.01.0`,
    WEVNSM: '1.0.0',
    osver: 'Microsoft-Windows-10-Professional-build-19045-64bit',
    deviceId: randomBytes(26).toString('hex').toUpperCase(),
    os: 'pc',
    channel: 'netease',
    appver: '3.1.17.204416'
  };
  return Object.entries(cookies)
    .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
    .join('; ');
}

function splitSetCookieHeader(header) {
  if (!header) return [];
  return header.split(/,(?=\s*[!#$%&'*+\-.^_`|~0-9A-Za-z]+=)/g);
}

function readSetCookies(headers) {
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();
  if (typeof headers.raw === 'function') return headers.raw()['set-cookie'] ?? [];
  return splitSetCookieHeader(headers.get('set-cookie'));
}

function cookiePairs(cookieText) {
  return String(cookieText ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.includes('='))
    .map((part) => part.split(/=(.*)/s).slice(0, 2));
}

function mergeCookies(existingCookie, setCookies) {
  const cookies = new Map(cookiePairs(existingCookie));
  for (const setCookie of setCookies) {
    const pair = String(setCookie).split(';', 1)[0];
    const separator = pair.indexOf('=');
    if (separator <= 0) continue;
    const name = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();
    if (value) cookies.set(name, value);
    else cookies.delete(name);
  }
  return [...cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
}

async function weapiRequest(url, data, cookie = '', fetchImpl = fetch, encryptPayload = encryptWeapiPayload) {
  const csrf = String(cookie).match(/(?:^|;\s*)__csrf=([^;]+)/)?.[1] ?? '';
  const encrypted = encryptPayload({ ...data, csrf_token: csrf });
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      ...HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookie || '__remember_me=true; NMTID=xxx'
    },
    body: new URLSearchParams(encrypted).toString()
  });
  if (!response.ok) throw new Error(`NetEase request failed: ${response.status}`);
  const body = await response.json();
  const setCookies = readSetCookies(response.headers);
  const mergedCookie = mergeCookies(cookie, setCookies);
  return {
    body,
    cookie: mergedCookie,
    diagnostics: {
      hasSetCookie: setCookies.length > 0,
      setCookieCount: setCookies.length,
      hasMusicU: /(?:^|;\s*)MUSIC_U=/.test(mergedCookie),
      hasMusicA: /(?:^|;\s*)MUSIC_A=/.test(mergedCookie),
      hasCsrf: /(?:^|;\s*)__csrf=/.test(mergedCookie)
    }
  };
}

export function createNetEaseClient(fetchImpl = fetch, encryptPayload = encryptWeapiPayload) {
  return {
    async startQrLogin() {
      const bootstrapCookie = createQrBootstrapCookie();
      const result = await weapiRequest(
        'https://music.163.com/weapi/login/qrcode/unikey',
        { type: 3 },
        bootstrapCookie,
        fetchImpl,
        encryptPayload
      );
      const key = result.body?.unikey;
      if (result.body?.code !== 200 || typeof key !== 'string' || !key) throw new Error('NetEase QR key request failed');
      return { key, cookie: result.cookie };
    },
    async checkQrLogin(key, cookie) {
      const result = await weapiRequest(
        'https://music.163.com/weapi/login/qrcode/client/login',
        { key, type: 3 },
        cookie,
        fetchImpl,
        encryptPayload
      );
      return { code: result.body?.code, cookie: result.cookie, diagnostics: result.diagnostics };
    },
    async getAccount(cookie) {
      const result = await weapiRequest(
        'https://music.163.com/weapi/w/nuser/account/get',
        {},
        cookie,
        fetchImpl,
        encryptPayload
      );
      const account = result.body?.account;
      const profile = result.body?.profile;
      if (result.body?.code !== 200 || !account || !profile) return null;
      return {
        userId: String(account.id ?? profile.userId),
        nickname: String(profile.nickname ?? '网易云用户'),
        avatarUrl: typeof profile.avatarUrl === 'string' ? profile.avatarUrl : undefined,
        vipType: account.vipType ?? profile.vipType ?? 0
      };
    },
    async getSongUrl(songId, cookie) {
      const result = await weapiRequest(
        'https://music.163.com/weapi/song/enhance/player/url',
        { ids: JSON.stringify([String(songId)]), br: 999000 },
        cookie,
        fetchImpl,
        encryptPayload
      );
      const item = Array.isArray(result.body?.data)
        ? result.body.data.find((entry) => String(entry?.id) === String(songId))
        : null;
      const url = typeof item?.url === 'string' && /^https?:\/\//.test(item.url) ? item.url : null;
      return {
        url,
        code: Number(item?.code ?? result.body?.code ?? 0),
        bitrate: Number(item?.br ?? 0) || undefined
      };
    }
  };
}
