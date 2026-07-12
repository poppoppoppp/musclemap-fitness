# NetEase Playlist Player Design

## Scope

Replace the homepage music placeholder with a production-safe NetEase Cloud Music playlist import flow backed by NetEase's official outchain player. Users paste a playlist share URL or numeric playlist id, then play the playlist through the embedded official player.

## Constraints

MuscleMap will not request or store NetEase passwords, cookies, or login tokens. It will not proxy, scrape, or redistribute music files. Playback availability remains subject to NetEase login, membership, region, copyright, browser autoplay, and outchain restrictions.

## Interaction

- “导入歌单” reveals an inline form instead of a modal.
- The form accepts standard `music.163.com` and `y.music.163.com` playlist URLs, share text containing those URLs, or a numeric playlist id.
- Invalid input shows an inline error and does not overwrite the saved playlist.
- Valid input stores the normalized playlist id under `musclemap.neteasePlaylist.v1`.
- An imported state shows the official embedded playlist player plus “更换歌单” and “移除歌单” actions.
- Removing restores the existing honest empty state.

## Security and embedding

The iframe source is constructed exclusively from a parsed numeric id and the fixed `https://music.163.com/outchain/player` origin. The iframe receives an accessible title, lazy loading, and autoplay/encrypted-media permissions required by the provider.

## Verification

Playwright covers URL/id parsing, invalid input, persistence across reload, fixed-origin iframe construction, replacement, removal, empty state, and 390x844 overflow. Build and full E2E must pass before publishing.
