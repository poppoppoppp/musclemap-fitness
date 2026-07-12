# Recent Workout Carousel Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Let users swipe across the five most recent workout summaries on the homepage and open any selected workout.

**Architecture:** Keep workout history ordering in `Dashboard`, derive at most five summaries there, and render them in a CSS scroll-snap carousel. The card component owns transient selection state only; local storage and workout records remain unchanged.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Playwright

---

### Task 1: Add failing carousel behavior tests

**Files:**
- Modify: `src/tests/user-flow.spec.ts`

1. Seed six workout logs and assert the homepage renders only the five newest carousel cards.
2. Assert the newest record is selected initially and pagination reports the current position.
3. Scroll to another card and assert selection and detail link update.
4. Verify 390x844 has no document-level horizontal overflow.
5. Run the targeted test and confirm it fails because the current component renders one card.

### Task 2: Pass recent workouts into the card component

**Files:**
- Modify: `src/pages/Dashboard.tsx`

1. Slice workout logs to five items.
2. Derive each summary using the existing helper.
3. Pass the list to the recent-workout component without changing storage or sorting.

### Task 3: Implement the scroll-snap carousel

**Files:**
- Modify: `src/components/dashboard/DashboardRecentWorkoutCard.tsx`

1. Render the empty state for no records.
2. Render recent records as horizontally scrollable, center-snapping links.
3. Update the selected index on scroll and expose accessible slide labels.
4. Add pagination dots and keyboard-accessible dot controls.
5. Keep “查看全部” unchanged.

### Task 4: Verify

**Files:**
- Modify only files required by failing checks.

1. Run the targeted Playwright test.
2. Run `npm run build`.
3. Run `npm run test:e2e`.
4. Inspect the carousel at 390x844 in the browser.
