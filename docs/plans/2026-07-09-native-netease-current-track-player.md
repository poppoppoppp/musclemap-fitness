# Native NetEase Current Track Player Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Replace the homepage NetEase iframe with a native current-track player backed by a complete playlist queue.

**Architecture:** Add a serverless playlist endpoint that returns playlist metadata plus all tracks. Refactor the homepage music component to import an id, fetch that complete queue, render only `tracks[currentTrackIndex]`, and drive previous/play-next through the full array.

**Tech Stack:** React 19, TypeScript, Vite, Playwright, Vercel serverless function, NetEase public web endpoints

---

### Task 1: Failing E2E coverage

**Files:**
- Modify: `src/tests/user-flow.spec.ts`

**Steps:**
1. Replace the old iframe import test with a mocked full playlist response containing 8 tracks.
2. Assert no iframe is rendered.
3. Assert the card shows only current track metadata and a full queue count.
4. Click next to track 8 and assert metadata changes.
5. Run: `npx playwright test src/tests/user-flow.spec.ts -g "homepage imports full NetEase playlist data"`
6. Expected before implementation: FAIL because current UI is still iframe/import placeholder.

### Task 2: Playlist data utilities and API

**Files:**
- Modify: `src/utils/neteasePlaylist.ts`
- Create: `api/netease-playlist.js`

**Steps:**
1. Add playlist and track types plus a client fetch helper.
2. Keep existing id parser and storage helpers.
3. Add a Vercel function that validates the id, fetches playlist detail, reads complete `trackIds`, batches `song/detail`, maps metadata, and returns `audioUrl` values based on track ids.

### Task 3: Native current-track UI

**Files:**
- Modify: `src/components/dashboard/DashboardMusicPlayer.tsx`

**Steps:**
1. Replace iframe rendering with native card UI.
2. Add loading, error, empty, imported, replacement, and removal states.
3. Add `<audio>` plus previous/play-next handlers based on the complete `tracks` array.
4. Keep mobile-first layout with no horizontal overflow.

### Task 4: Verification and deployment

**Commands:**
1. `npx playwright test src/tests/user-flow.spec.ts -g "homepage imports full NetEase playlist data"`
2. `npm run build`
3. `npm run test:e2e`
4. Commit, push, and deploy to Vercel production.
