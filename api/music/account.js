import { createCookieVault } from '../../server/music/cookie-vault.js';
import { createNetEaseClient } from '../../server/music/netease-client.js';
import { readSessionId } from '../../server/music/session.js';
import { createMusicAuthStore } from '../../server/music/store.js';

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

export function createAccountHandler({ store, netease, unseal, now = Date.now }) {
  return async function accountHandler(request, response) {
    response.setHeader('Cache-Control', 'private, no-store');
    if (request.method !== 'GET') {
      response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
      return;
    }

    const sessionId = readSessionId(request);
    if (!sessionId) {
      response.status(200).json({ bound: false });
      return;
    }

    try {
      const session = await store.getJson(`music:session:${sessionId}`);
      if (!session) {
        response.status(200).json({ bound: false });
        return;
      }

      let account = null;
      try {
        account = await netease.getAccount(unseal(session.sealedCookie));
      } catch {
        // Keep the durable binding and retry profile synchronization later.
      }
      if (!account) {
        response.status(200).json({ bound: true, accountState: 'pending' });
        return;
      }

      await store.setJson(`music:session:${sessionId}`, {
        ...session,
        account,
        expiresAt: now() + SESSION_TTL_SECONDS * 1_000
      }, SESSION_TTL_SECONDS);
      response.status(200).json({ bound: true, account, accountState: 'ready' });
    } catch (error) {
      const configurationError = error?.code === 'MUSIC_AUTH_NOT_CONFIGURED';
      response.status(configurationError ? 503 : 502).json({
        bound: false,
        error: configurationError ? 'MUSIC_AUTH_NOT_CONFIGURED' : 'ACCOUNT_REQUEST_FAILED'
      });
    }
  };
}

export default async function handler(request, response) {
  try {
    const vault = createCookieVault();
    return createAccountHandler({
      store: createMusicAuthStore(),
      netease: createNetEaseClient(),
      unseal: vault.unseal
    })(request, response);
  } catch (error) {
    const configurationError = error?.code === 'MUSIC_AUTH_NOT_CONFIGURED';
    response.status(configurationError ? 503 : 502).json({
      bound: false,
      error: configurationError ? 'MUSIC_AUTH_NOT_CONFIGURED' : 'ACCOUNT_REQUEST_FAILED'
    });
  }
}
