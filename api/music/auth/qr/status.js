import { createCookieVault } from '../../../../server/music/cookie-vault.js';
import { createNetEaseClient } from '../../../../server/music/netease-client.js';
import { readSessionId } from '../../../../server/music/session.js';
import { createMusicAuthStore } from '../../../../server/music/store.js';

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const LOGIN_ID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

function sendError(response, error, errorStage) {
  const configurationError = error?.code === 'MUSIC_AUTH_NOT_CONFIGURED';
  response.status(configurationError ? 503 : 502).json({
    status: 'error',
    error: configurationError ? 'MUSIC_AUTH_NOT_CONFIGURED' : 'QR_STATUS_FAILED',
    errorStage
  });
}

function writeDiagnostic(logger, values) {
  logger.info?.('music_qr_binding', {
    upstreamCode: values.upstreamCode ?? null,
    hasSetCookie: values.hasSetCookie ?? false,
    setCookieCount: values.setCookieCount ?? 0,
    hasMusicU: values.hasMusicU ?? false,
    hasMusicA: values.hasMusicA ?? false,
    hasCsrf: values.hasCsrf ?? false,
    redisWriteAttempted: values.redisWriteAttempted ?? false,
    redisWriteSucceeded: values.redisWriteSucceeded ?? false,
    accountFetchSucceeded: values.accountFetchSucceeded ?? false,
    errorStage: values.errorStage ?? null
  });
}

export function createQrStatusHandler({ store, netease, seal, unseal, now = Date.now, logger = console }) {
  return async function qrStatusHandler(request, response) {
    response.setHeader('Cache-Control', 'private, no-store');
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

      let checked;
      try {
        checked = await netease.checkQrLogin(attempt.qrKey, unseal(attempt.sealedCookie));
      } catch (error) {
        writeDiagnostic(logger, { errorStage: 'QR_STATUS_REQUEST_FAILED' });
        sendError(response, error, 'QR_STATUS_REQUEST_FAILED');
        return;
      }
      const upstreamDiagnostics = {
        upstreamCode: checked.code,
        hasSetCookie: checked.diagnostics?.hasSetCookie ?? false,
        setCookieCount: checked.diagnostics?.setCookieCount ?? 0,
        hasMusicU: checked.diagnostics?.hasMusicU ?? /(?:^|;\s*)MUSIC_U=/.test(checked.cookie ?? ''),
        hasMusicA: checked.diagnostics?.hasMusicA ?? /(?:^|;\s*)MUSIC_A=/.test(checked.cookie ?? ''),
        hasCsrf: checked.diagnostics?.hasCsrf ?? /(?:^|;\s*)__csrf=/.test(checked.cookie ?? '')
      };
      if (checked.code === 800) {
        writeDiagnostic(logger, upstreamDiagnostics);
        await store.delete(`music:qr:${loginId}`);
        response.status(200).json({ status: 'expired' });
        return;
      }
      if (checked.code === 801) {
        writeDiagnostic(logger, upstreamDiagnostics);
        response.status(200).json({ status: 'waiting' });
        return;
      }
      if (checked.code === 802) {
        writeDiagnostic(logger, upstreamDiagnostics);
        response.status(200).json({ status: 'scanned' });
        return;
      }
      if (checked.code !== 803) {
        writeDiagnostic(logger, { ...upstreamDiagnostics, errorStage: 'QR_STATUS_INVALID_RESPONSE' });
        response.status(200).json({ status: 'error', error: 'QR_STATUS_INVALID_RESPONSE' });
        return;
      }

      const hasAuthorizedCookie = Boolean(checked.cookie)
        && (checked.diagnostics?.hasMusicU
          || checked.diagnostics?.hasMusicA
          || /(?:^|;\s*)MUSIC_[UA]=/.test(checked.cookie));
      if (!hasAuthorizedCookie) {
        writeDiagnostic(logger, { ...upstreamDiagnostics, errorStage: 'AUTHORIZED_COOKIE_MISSING' });
        response.status(200).json({ status: 'error', error: 'AUTHORIZED_COOKIE_MISSING' });
        return;
      }

      let sealedCookie;
      try {
        sealedCookie = seal(checked.cookie);
      } catch (error) {
        writeDiagnostic(logger, { ...upstreamDiagnostics, errorStage: 'COOKIE_ENCRYPT_FAILED' });
        sendError(response, error, 'COOKIE_ENCRYPT_FAILED');
        return;
      }

      const session = {
        sealedCookie,
        account: null,
        authorizedAt: now(),
        expiresAt: now() + SESSION_TTL_SECONDS * 1_000
      };
      try {
        await store.setJson(`music:session:${sessionId}`, session, SESSION_TTL_SECONDS);
      } catch (error) {
        writeDiagnostic(logger, {
          ...upstreamDiagnostics,
          redisWriteAttempted: true,
          errorStage: 'REDIS_WRITE_FAILED'
        });
        sendError(response, error, 'REDIS_WRITE_FAILED');
        return;
      }
      await store.delete(`music:qr:${loginId}`).catch(() => {});

      let account = null;
      try {
        account = await netease.getAccount(checked.cookie);
      } catch {
        // The encrypted login session is already durable; profile sync can retry later.
      }
      if (!account) {
        writeDiagnostic(logger, {
          ...upstreamDiagnostics,
          redisWriteAttempted: true,
          redisWriteSucceeded: true,
          errorStage: 'ACCOUNT_PROFILE_FAILED'
        });
        response.status(200).json({ status: 'authorized', accountState: 'pending' });
        return;
      }

      try {
        await store.setJson(`music:session:${sessionId}`, { ...session, account }, SESSION_TTL_SECONDS);
      } catch {
        writeDiagnostic(logger, {
          ...upstreamDiagnostics,
          redisWriteAttempted: true,
          redisWriteSucceeded: true,
          accountFetchSucceeded: true,
          errorStage: 'REDIS_WRITE_FAILED'
        });
        response.status(200).json({ status: 'authorized', accountState: 'pending' });
        return;
      }
      writeDiagnostic(logger, {
        ...upstreamDiagnostics,
        redisWriteAttempted: true,
        redisWriteSucceeded: true,
        accountFetchSucceeded: true
      });
      response.status(200).json({ status: 'authorized', account, accountState: 'ready' });
    } catch (error) {
      writeDiagnostic(logger, { errorStage: 'QR_STATUS_REQUEST_FAILED' });
      sendError(response, error, 'QR_STATUS_REQUEST_FAILED');
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
    writeDiagnostic(console, { errorStage: 'QR_STATUS_REQUEST_FAILED' });
    sendError(response, error, 'QR_STATUS_REQUEST_FAILED');
  }
}
