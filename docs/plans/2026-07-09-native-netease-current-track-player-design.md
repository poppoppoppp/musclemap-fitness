# Native NetEase Current Track Player Design

## Goal

Redo the homepage “训练音乐” module as a native dark neon current-track player and stop relying on the NetEase outchain iframe as the playlist UI or queue source.

## Design

- The homepage renders one current track card only: playlist label, current album cover, track name, artist, progress, time, previous/play-next controls, and loaded-queue status.
- The player keeps playlist metadata and full queue data separate. The UI reads `tracks[currentTrackIndex]`; it never uses a sliced display list as the playback queue.
- Local storage remains backward compatible: `musclemap.neteasePlaylist.v1` stores the normalized playlist id. On load or import, the app fetches playlist metadata and all tracks from `/api/netease-playlist?id=...`.
- The serverless API calls NetEase playlist detail for `trackIds`, then batches `song/detail` requests for all track ids. This avoids the embedded iframe’s visible-track limit.
- Playback uses a native `<audio>` element pointed at NetEase’s public outer media URL for each track id. Some songs may still fail because of copyright, membership, region, or provider limits; the UI states that limitation without fabricating playback.

## Testing

- E2E mocks `/api/netease-playlist` with more than six tracks, imports a playlist, and verifies the homepage shows only the current track card.
- E2E clicks next until the 7th and 8th tracks are selected, verifying the queue is complete and current song metadata updates.
- Full build and E2E run before deployment.
