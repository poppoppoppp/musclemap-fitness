import { constants, createCipheriv, publicEncrypt, randomInt } from 'node:crypto';

const IV = Buffer.from('0102030405060708');
const PRESET_KEY = Buffer.from('0CoJUm6Qyw8W8jud');
const BASE62 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDgtQn2JZ34ZC28NWYpAUd98iZ37BUrX/aKzmFbt7clFSs6sXqHauqKWqdtLkF2KexO40H1YTX8z2lSgBBOAxLsvaklV8k4cBFK9snQXE9/DDaFt6Rr7iVZMldczhC0JNgTz+SHXT6CBHuX3e9SdB1Ua44oncaTWz7OBGLbCiK45wIDAQAB
-----END PUBLIC KEY-----`;

function aesEncrypt(text, key) {
  const cipher = createCipheriv('aes-128-cbc', Buffer.from(key), IV);
  return Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]).toString('base64');
}

function createSecretKey() {
  return Array.from({ length: 16 }, () => BASE62[randomInt(0, BASE62.length)]).join('');
}

function rsaEncryptSecret(secretKey) {
  const reversed = Buffer.from(secretKey.split('').reverse().join(''));
  const padded = Buffer.alloc(128);
  reversed.copy(padded, padded.length - reversed.length);
  return publicEncrypt({ key: PUBLIC_KEY, padding: constants.RSA_NO_PADDING }, padded).toString('hex');
}

export function encryptWeapiPayload(payload, secretKey = createSecretKey()) {
  const firstPass = aesEncrypt(JSON.stringify(payload), PRESET_KEY);
  return {
    params: aesEncrypt(firstPass, secretKey),
    encSecKey: rsaEncryptSecret(secretKey)
  };
}
