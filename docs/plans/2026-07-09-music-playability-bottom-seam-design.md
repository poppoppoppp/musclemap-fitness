# Music Playability and Bottom Seam Fix Design

## Goal

Fix three reported issues: unplayable NetEase songs entering the queue, mobile playlist loading getting stuck, and the white visual seam between dark pages and the floating bottom navigation.

## Design

- The NetEase API layer now uses `song/enhance/player/url` as the playability source of truth. Songs without a playable URL are excluded from the queue instead of being shown and failing later.
- The playlist response still preserves the real playlist name and total `trackCount`; the UI displays playable queue size against the playlist total, for example `可播放 620 / 810 首`.
- The client fetch has a timeout so mobile users do not stay in an indefinite loading state. Runtime audio errors auto-skip to the next track and show a short status message.
- Dark shell routes use a dark app background, and the document background is dark behind the fixed bottom navigation/safe area. Light legacy pages still keep their own light app shell.

## Verification

- E2E covers playable-count display, runtime audio error skip, and no light seam under home/profile floating navigation.
- Build and full E2E must pass before deployment.
