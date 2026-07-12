import { randomBytes } from 'node:crypto';

export const MUSIC_SESSION_COOKIE = 'mm_music_session';
const SESSION_PATTERN = /^[A-Za-z0-9_-]{24,128}$/;

export function createSessionId() {
  return randomBytes(32).toString('base64url');
}

export function readSessionId(request) {
  const cookieHeader = String(request.headers?.cookie ?? '');
  const cookies = new Map(
    cookieHeader
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf('=');
        return separator === -1
          ? [part, '']
          : [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
      })
  );
  const sessionId = cookies.get(MUSIC_SESSION_COOKIE);
  return typeof sessionId === 'string' && SESSION_PATTERN.test(sessionId) ? sessionId : null;
}

export function ensureSessionId(request, response, idFactory = createSessionId) {
  const existing = readSessionId(request);
  if (existing) return existing;

  const sessionId = idFactory();
  if (!SESSION_PATTERN.test(sessionId)) throw new Error('Invalid generated music session id');
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader(
    'Set-Cookie',
    `${MUSIC_SESSION_COOKIE}=${encodeURIComponent(sessionId)}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax${secure}`
  );
  return sessionId;
}

export function clearSessionCookie(response) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader(
    'Set-Cookie',
    `${MUSIC_SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`
  );
}
