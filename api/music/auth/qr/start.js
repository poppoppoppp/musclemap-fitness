import { randomUUID } from 'node:crypto';
import QRCode from 'qrcode';
import { createCookieVault } from '../../../../server/music/cookie-vault.js';
import { createNetEaseClient } from '../../../../server/music/netease-client.js';
import { ensureSessionId } from '../../../../server/music/session.js';
import { createMusicAuthStore } from '../../../../server/music/store.js';

const QR_TTL_SECONDS = 300;

function sendError(response, error) {
  const configurationError = error?.code === 'MUSIC_AUTH_NOT_CONFIGURED';
  response.status(configurationError ? 503 : 502).json({
    error: configurationError ? 'MUSIC_AUTH_NOT_CONFIGURED' : 'QR_START_FAILED'
  });
}

export function createStartQrHandler({
  store,
  netease,
  seal,
  createQrImage,
  createId = randomUUID,
  createSessionId,
  now = Date.now
}) {
  return async function startQrHandler(request, response) {
    response.setHeader('Cache-Control', 'private, no-store');
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
      return;
    }

    try {
      const sessionId = ensureSessionId(request, response, createSessionId);
      const loginId = createId();
      const expiresAt = now() + QR_TTL_SECONDS * 1_000;
      const qrLogin = await netease.startQrLogin();
      const qrImage = await createQrImage(`https://music.163.com/login?codekey=${qrLogin.key}`);

      await store.setJson(`music:qr:${loginId}`, {
        sessionId,
        qrKey: qrLogin.key,
        sealedCookie: seal(qrLogin.cookie),
        expiresAt
      }, QR_TTL_SECONDS);

      response.status(200).json({ loginId, qrImage, expiresAt });
    } catch (error) {
      sendError(response, error);
    }
  };
}

export default async function handler(request, response) {
  try {
    const vault = createCookieVault();
    return createStartQrHandler({
      store: createMusicAuthStore(),
      netease: createNetEaseClient(),
      seal: vault.seal,
      createQrImage: (value) => QRCode.toDataURL(value, { width: 280, margin: 1, errorCorrectionLevel: 'M' })
    })(request, response);
  } catch (error) {
    sendError(response, error);
  }
}
