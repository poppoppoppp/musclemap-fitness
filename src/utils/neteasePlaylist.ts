import { readStorage, removeStorage, writeStorage } from './storage';

export const NETEASE_PLAYLIST_STORAGE_KEY = 'musclemap.neteasePlaylist.v1';

const numericIdPattern = /^\d{1,20}$/;
const neteaseUrlPattern = /https?:\/\/(?:y\.)?music\.163\.com\/[^\s]+/i;

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
