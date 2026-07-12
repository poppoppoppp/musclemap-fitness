function readStoreConfig() {
  const url = process.env.MUSIC_AUTH_REDIS_REST_URL
    ?? process.env.UPSTASH_REDIS_REST_URL
    ?? process.env.KV_REST_API_URL;
  const token = process.env.MUSIC_AUTH_REDIS_REST_TOKEN
    ?? process.env.UPSTASH_REDIS_REST_TOKEN
    ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw Object.assign(new Error('Music auth Redis is not configured'), { code: 'MUSIC_AUTH_NOT_CONFIGURED' });
  return { url: url.replace(/\/$/, ''), token };
}

export function createMusicAuthStore({ fetchImpl = fetch, ...providedConfig } = {}) {
  const config = providedConfig.url && providedConfig.token ? providedConfig : readStoreConfig();

  async function command(parts) {
    const response = await fetchImpl(config.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(parts)
    });
    if (!response.ok) throw new Error(`Music auth store request failed: ${response.status}`);
    const payload = await response.json();
    if (payload.error) throw new Error('Music auth store command failed');
    return payload.result;
  }

  return {
    async getJson(key) {
      const value = await command(['GET', key]);
      if (typeof value !== 'string') return null;
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    },
    async setJson(key, value, ttlSeconds) {
      await command(['SET', key, JSON.stringify(value), 'EX', ttlSeconds]);
    },
    async delete(key) {
      await command(['DEL', key]);
    }
  };
}
