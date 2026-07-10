import { clearSessionCookie, readSessionId } from '../../server/music/session.js';
import { createMusicAuthStore } from '../../server/music/store.js';

export function createLogoutHandler({ store }) {
  return async function logoutHandler(request, response) {
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
      return;
    }
    const sessionId = readSessionId(request);
    try {
      if (sessionId) await store.delete(`music:session:${sessionId}`);
      clearSessionCookie(response);
      response.status(200).json({ ok: true });
    } catch (error) {
      const configurationError = error?.code === 'MUSIC_AUTH_NOT_CONFIGURED';
      response.status(configurationError ? 503 : 502).json({
        ok: false,
        error: configurationError ? 'MUSIC_AUTH_NOT_CONFIGURED' : 'LOGOUT_FAILED'
      });
    }
  };
}

export default async function handler(request, response) {
  try {
    return createLogoutHandler({ store: createMusicAuthStore() })(request, response);
  } catch (error) {
    const configurationError = error?.code === 'MUSIC_AUTH_NOT_CONFIGURED';
    response.status(configurationError ? 503 : 502).json({
      ok: false,
      error: configurationError ? 'MUSIC_AUTH_NOT_CONFIGURED' : 'LOGOUT_FAILED'
    });
  }
}
