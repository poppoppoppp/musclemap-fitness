import { createCookieVault } from '../../server/music/cookie-vault.js';
import { createNetEaseClient } from '../../server/music/netease-client.js';
import { readSessionId } from '../../server/music/session.js';
import { createMusicAuthStore } from '../../server/music/store.js';

const SONG_ID_PATTERN = /^\d{1,20}$/;

function sendError(response, error) {
  const configurationError = error?.code === 'MUSIC_AUTH_NOT_CONFIGURED';
  response.status(configurationError ? 503 : 502).json({
    ok: false,
    error: configurationError ? 'MUSIC_AUTH_NOT_CONFIGURED' : 'SONG_URL_REQUEST_FAILED'
  });
}

export function createSongUrlHandler({ store, netease, unseal }) {
  return async function songUrlHandler(request, response) {
    response.setHeader('Cache-Control', 'private, no-store');
    if (request.method !== 'GET') {
      response.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
      return;
    }

    const songId = String(request.query?.id ?? '');
    if (!SONG_ID_PATTERN.test(songId)) {
      response.status(400).json({ ok: false, error: 'INVALID_SONG_ID' });
      return;
    }

    const sessionId = readSessionId(request);
    if (!sessionId) {
      response.status(401).json({ ok: false, error: 'ACCOUNT_NOT_BOUND' });
      return;
    }

    try {
      const session = await store.getJson(`music:session:${sessionId}`);
      if (!session?.sealedCookie) {
        response.status(401).json({ ok: false, error: 'ACCOUNT_NOT_BOUND' });
        return;
      }

      const result = await netease.getSongUrl(songId, unseal(session.sealedCookie));
      if (!result.url) {
        response.status(200).json({ ok: false, error: 'UNAVAILABLE', upstreamCode: result.code });
        return;
      }

      response.status(200).json({ ok: true, audioUrl: result.url, bitrate: result.bitrate });
    } catch (error) {
      sendError(response, error);
    }
  };
}

export default async function handler(request, response) {
  try {
    const vault = createCookieVault();
    return createSongUrlHandler({
      store: createMusicAuthStore(),
      netease: createNetEaseClient(),
      unseal: vault.unseal
    })(request, response);
  } catch (error) {
    sendError(response, error);
  }
}
