# Music Playability and Bottom Seam Fix Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Make the NetEase player use a playable queue, recover from playback failures, and remove the dark-page bottom navigation seam.

**Architecture:** Serverless API filters tracks through NetEase playable URL metadata. The React player renders playable count versus total count and skips runtime failures. The app shell supplies dark background behind home/profile/template floating navigation.

**Tech Stack:** React 19, TypeScript, Vite, Playwright, Vercel serverless functions

---

### Task 1: Add failing tests

**Files:**
- Modify: `src/tests/user-flow.spec.ts`

**Steps:**
1. Update the music import test to expect `可播放 / 总数` count.
2. Dispatch an audio error and expect the next track plus a skip status.
3. Add a bottom seam test for `/` and `/data-management`.

### Task 2: Fix NetEase queue data

**Files:**
- Modify: `api/netease-playlist.js`
- Modify: `src/utils/neteasePlaylist.ts`

**Steps:**
1. Fetch track metadata and playable URLs in batches.
2. Filter out songs without playable URLs.
3. Cache the API response and add a client timeout.

### Task 3: Fix player behavior and bottom seam

**Files:**
- Modify: `src/components/dashboard/DashboardMusicPlayer.tsx`
- Modify: `src/components/layout/AppShell.tsx`
- Modify: `src/index.css`

**Steps:**
1. Show playable queue count against playlist total.
2. Auto-skip tracks on runtime audio error.
3. Use dark app/document background behind dark route navigation.

### Task 4: Verify and deploy

**Commands:**
1. `npm run build`
2. `npm run test:e2e`
3. Deploy production and verify real playlist API/UI.
