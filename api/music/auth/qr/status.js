import { createCookieVault } from '../../../../server/music/cookie-vault.js';
import { createNetEaseClient } from '../../../../server/music/netease-client.js';
import { readSessionId } from '../../../../server/music/session.js';
import { createMusicAuthStore } from '../../../../server/music/store.js';

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const LOGIN_ID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

function sendError(response, error) {
  const configurationError = error?.code === 'MUSIC_AUTH_NOT_CONFIGURED';
  response.status(configurationError ? 503 : 502).json({
    status: 'error',
    error: configurationError ? 'MUSIC_AUTH_NOT_CONFIGURED' : 'QR_STATUS_FAILED'
  });
}

export function createQrStatusHandler({ store, netease, seal, unseal, now = Date.now }) {
  return async function qrStatusHandler(request, response) {
    if (request.method !== 'GET') {
      response.status(405).json({ status: 'error', error: 'METHOD_NOT_ALLOWED' });
      return;
    }

    const loginId = String(request.query?.loginId ?? '');
    const sessionId = readSessionId(request);
    if (!LOGIN_ID_PATTERN.test(loginId) || !sessionId) {
      response.status(400).json({ status: 'error', error: 'INVALID_SESSION' });
      return;
    }

    try {
      const attempt = await store.getJson(`music:qr:${loginId}`);
      if (!attempt || attempt.expiresAt <= now()) {
        if (attempt) await store.delete(`music:qr:${loginId}`);
        response.status(200).json({ status: 'expired' });
        return;
      }
      if (attempt.sessionId !== sessionId) {
        response.status(404).json({ status: 'error', error: 'LOGIN_NOT_FOUND' });
        return;
      }

      const checked = await netease.checkQrLogin(attempt.qrKey, unseal(attempt.sealedCookie));
      if (checked.code === 800) {
        await store.delete(`music:qr:${loginId}`);
        response.status(200).json({ status: 'expired' });
        return;
      }
      if (checked.code === 801) {
        response.status(200).json({ status: 'waiting' });
        return;
      }
      if (checked.code === 802) {
        response.status(200).json({ status: 'scanned' });
        return;
      }
      if (checked.code !== 803 || !checked.cookie) {
        response.status(200).json({ status: 'error' });
        return;
      }

      const account = await netease.getAccount(checked.cookie);
      if (!account) {
        response.status(200).json({ status: 'error' });
        return;
      }

      await store.setJson(`music:session:${sessionId}`, {
        sealedCookie: seal(checked.cookie),
        account,
        authorizedAt: now(),
        expiresAt: now() + SESSION_TTL_SECONDS * 1_000
      }, SESSION_TTL_SECONDS);
      await store.delete(`music:qr:${loginId}`);
      response.status(200).json({ status: 'authorized', account });
    } catch (error) {
      sendError(response, error);
    }
  };
}

export default async function handler(request, response) {
  try {
    const vault = createCookieVault();
    return createQrStatusHandler({
      store: createMusicAuthStore(),
      netease: createNetEaseClient(),
      seal: vault.seal,
      unseal: vault.unseal
    })(request, response);
  } catch (error) {
    sendError(response, error);
  }
}
