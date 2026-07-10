import { encryptWeapiPayload } from './netease-crypto.js';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
  Referer: 'https://music.163.com/'
};

function splitSetCookieHeader(header) {
  if (!header) return [];
  return header.split(/,(?=\s*[!#$%&'*+\-.^_`|~0-9A-Za-z]+=)/g);
}

function readSetCookies(headers) {
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();
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

async function weapiRequest(url, data, cookie = '', fetchImpl = fetch) {
  const csrf = String(cookie).match(/(?:^|;\s*)__csrf=([^;]+)/)?.[1] ?? '';
  const encrypted = encryptWeapiPayload({ ...data, csrf_token: csrf });
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
  return { body, cookie: mergeCookies(cookie, readSetCookies(response.headers)) };
}

export function createNetEaseClient(fetchImpl = fetch) {
  return {
    async startQrLogin() {
      const result = await weapiRequest(
        'https://music.163.com/weapi/login/qrcode/unikey',
        { type: 1 },
        '',
        fetchImpl
      );
      const key = result.body?.unikey;
      if (result.body?.code !== 200 || typeof key !== 'string' || !key) throw new Error('NetEase QR key request failed');
      return { key, cookie: result.cookie };
    },
    async checkQrLogin(key, cookie) {
      const result = await weapiRequest(
        'https://music.163.com/weapi/login/qrcode/client/login',
        { key, type: 1 },
        cookie,
        fetchImpl
      );
      return { code: result.body?.code, cookie: result.cookie };
    },
    async getAccount(cookie) {
      const result = await weapiRequest(
        'https://music.163.com/weapi/w/nuser/account/get',
        {},
        cookie,
        fetchImpl
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
    }
  };
}
