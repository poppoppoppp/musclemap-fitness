# NetEase Playlist Player Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Import a NetEase playlist link or id on the homepage and play it through NetEase's official embedded player.

**Architecture:** A small utility owns parsing, fixed-origin embed URL creation, and versioned local storage. The existing homepage music component becomes a controlled local-storage-backed UI with an inline import form and official iframe.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Playwright, NetEase official outchain iframe

---

### Task 1: Add failing import and playback tests

**Files:**
- Modify: `src/tests/user-flow.spec.ts`

1. Test invalid input feedback.
2. Test importing a playlist URL and asserting fixed-origin iframe output.
3. Test persistence after reload.
4. Test replacement, removal, and mobile overflow.
5. Run the targeted tests and confirm failure on the current placeholder.

### Task 2: Add the playlist utility

**Files:**
- Create: `src/utils/neteasePlaylist.ts`

1. Parse numeric ids, desktop URLs, mobile URLs, and share text.
2. Reject non-NetEase URLs and malformed ids.
3. Build the fixed official iframe URL.
4. Read, write, and remove the versioned local value.

### Task 3: Implement the homepage player

**Files:**
- Modify: `src/components/dashboard/DashboardMusicPlayer.tsx`

1. Replace the placeholder notice with the inline import form.
2. Validate and persist input on submit.
3. Render the official embedded player for saved ids.
4. Add replace and remove actions.
5. Preserve dark/lime styling, focus states, and mobile layout.

### Task 4: Verify and publish

**Files:**
- Modify only files required by failing checks.

1. Run targeted tests.
2. Run `npm run build` and `npm run test:e2e`.
3. Visually inspect at 390x844.
4. Commit the carousel and music changes, push the current branch, deploy production with Vercel, and verify live routes.
