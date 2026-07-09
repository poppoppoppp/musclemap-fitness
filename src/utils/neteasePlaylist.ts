import { readStorage, removeStorage, writeStorage } from './storage';

export const NETEASE_PLAYLIST_STORAGE_KEY = 'musclemap.neteasePlaylist.v1';

const numericIdPattern = /^\d{1,20}$/;
const neteaseUrlPattern = /https?:\/\/(?:y\.)?music\.163\.com\/[^\s]+/i;

export type MusicPlaylist = {
  id: string;
  name: string;
  source: 'netease';
  trackCount?: number;
};

export type MusicTrack = {
  id: string;
  name: string;
  artist: string;
  albumName?: string;
  coverUrl?: string;
  duration?: number;
  audioUrl?: string;
};

export type NetEasePlaylistData = {
  playlist: MusicPlaylist;
  tracks: MusicTrack[];
};

export function parseNetEasePlaylistId(input: string): string | null {
  const trimmed = input.trim();
  if (numericIdPattern.test(trimmed)) return trimmed;

  const urlText = trimmed.match(neteaseUrlPattern)?.[0]?.replace(/[，。；、)\]]+$/, '');
  if (!urlText) return null;

  try {
    const url = new URL(urlText);
    if (url.hostname !== 'music.163.com' && url.hostname !== 'y.music.163.com') return null;
    const id = url.href.match(/[?&#]id=(\d{1,20})(?:[&#]|$)/)?.[1];
    return id && numericIdPattern.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function buildNetEasePlaylistEmbedUrl(playlistId: string): string {
  if (!numericIdPattern.test(playlistId)) throw new Error('Invalid NetEase playlist id');
  return `https://music.163.com/outchain/player?type=0&id=${playlistId}&auto=0&height=430`;
}

export async function fetchNetEasePlaylistData(playlistId: string, timeoutMs = 20_000): Promise<NetEasePlaylistData> {
  if (!numericIdPattern.test(playlistId)) throw new Error('Invalid NetEase playlist id');

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`/api/netease-playlist?id=${encodeURIComponent(playlistId)}`, { signal: controller.signal });
    if (!response.ok) throw new Error('NetEase playlist request failed');

    const payload = await response.json() as { ok?: boolean; playlist?: MusicPlaylist; tracks?: MusicTrack[]; error?: string };
    if (!payload.ok || !payload.playlist || !Array.isArray(payload.tracks)) {
      throw new Error(payload.error === 'unavailable' ? 'NetEase playlist unavailable' : 'NetEase playlist data invalid');
    }

    return { playlist: payload.playlist, tracks: payload.tracks };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function readNetEasePlaylistId(): string | null {
  const value = readStorage<unknown>(NETEASE_PLAYLIST_STORAGE_KEY, null);
  return typeof value === 'string' && numericIdPattern.test(value) ? value : null;
}

export function writeNetEasePlaylistId(playlistId: string): void {
  if (!numericIdPattern.test(playlistId)) return;
  writeStorage(NETEASE_PLAYLIST_STORAGE_KEY, playlistId);
}

export function removeNetEasePlaylistId(): void {
  removeStorage(NETEASE_PLAYLIST_STORAGE_KEY);
}
