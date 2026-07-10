import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

function readEncryptionKey() {
  const encoded = process.env.MUSIC_AUTH_ENCRYPTION_KEY;
  if (!encoded) throw Object.assign(new Error('Music auth encryption key is not configured'), { code: 'MUSIC_AUTH_NOT_CONFIGURED' });

  const key = /^[a-f0-9]{64}$/i.test(encoded)
    ? Buffer.from(encoded, 'hex')
    : Buffer.from(encoded, 'base64');
  if (key.length !== 32) throw Object.assign(new Error('Music auth encryption key must contain 32 bytes'), { code: 'MUSIC_AUTH_NOT_CONFIGURED' });
  return key;
}

export function createCookieVault(key = readEncryptionKey()) {
  return {
    seal(value) {
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
      return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64url')).join('.');
    },
    unseal(value) {
      const [ivText, tagText, ciphertextText] = String(value).split('.');
      if (!ivText || !tagText || !ciphertextText) throw new Error('Invalid encrypted music cookie');
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivText, 'base64url'));
      decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
      return Buffer.concat([
        decipher.update(Buffer.from(ciphertextText, 'base64url')),
        decipher.final()
      ]).toString('utf8');
    }
  };
}
