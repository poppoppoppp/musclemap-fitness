export type MusicAccount = {
  userId: string;
  nickname: string;
  avatarUrl?: string;
  vipType?: number | string;
};

export type MusicAccountState = {
  bound: boolean;
  account?: MusicAccount;
  reason?: 'LOGIN_EXPIRED';
  error?: string;
};

export type MusicQrStart = {
  loginId: string;
  qrImage: string;
  expiresAt: number;
};

export type MusicQrStatus = {
  status: 'waiting' | 'scanned' | 'authorized' | 'expired' | 'error';
  account?: MusicAccount;
  error?: string;
};

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) throw Object.assign(new Error(payload.error ?? 'Music request failed'), { code: payload.error });
  return payload;
}

export async function fetchMusicAccount(): Promise<MusicAccountState> {
  return readJson(await fetch('/api/music/account', { credentials: 'include' }));
}

export async function startMusicQrLogin(): Promise<MusicQrStart> {
  return readJson(await fetch('/api/music/auth/qr/start', {
    method: 'POST',
    credentials: 'include'
  }));
}

export async function fetchMusicQrStatus(loginId: string): Promise<MusicQrStatus> {
  return readJson(await fetch(`/api/music/auth/qr/status?loginId=${encodeURIComponent(loginId)}`, {
    credentials: 'include'
  }));
}

export async function logoutMusicAccount(): Promise<void> {
  await readJson(await fetch('/api/music/logout', {
    method: 'POST',
    credentials: 'include'
  }));
}
