# Growth Page Redesign Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Build a mobile-first growth page with training and body-change sections, add it to the four-item navigation, and simplify the idle workout-log state.

**Architecture:** Add a `/growth` route composed from focused feature components and shared lightweight SVG chart primitives. Derive supported growth metrics from existing local workout/body records, while keeping unsupported 1RM, arm, and photo data in one typed mock-data module that can later be replaced.

**Tech Stack:** React 19, TypeScript, React Router, Tailwind CSS, Playwright, localStorage-backed utilities

---

### Task 1: Lock navigation and idle-record behavior with tests

**Files:**
- Modify: `src/tests/workout-log-overview.spec.ts`
- Create: `src/tests/growth-page.spec.ts`

**Step 1: Write failing tests**

- Assert the bottom navigation exposes 首页、记录、成长、我的 and that 成长 links to `/growth`.
- Assert the idle record page does not render 最近一次训练 or 近期表现.
- Assert the start-workout CTA remains visible and opens the existing sheet.

**Step 2: Run tests to verify they fail**

Run: `npx playwright test src/tests/workout-log-overview.spec.ts src/tests/growth-page.spec.ts`

Expected: FAIL because `/growth` and the four-item navigation do not exist, and idle cards are still rendered.

**Step 3: Keep the tests focused**

- Use role/text/test-id assertions for behavior, not implementation-specific class names.
- Seed and clear localStorage using the existing test patterns.

### Task 2: Add typed growth data derivation

**Files:**
- Create: `src/types/growth.ts`
- Create: `src/data/growthMockData.ts`
- Create: `src/utils/growthMetrics.ts`
- Create: `src/tests/growth-metrics.spec.ts`

**Step 1: Write failing utility tests**

- Filter logs by `4w`, `3m`, `6m`, and `all` ranges.
- Count completed workouts and unique active weeks.
- Compute average workouts per active week.
- Aggregate valid set counts by chest, back, shoulders, legs, and arms using existing exercise muscle metadata.
- Prefer real body weight/waist points when enough snapshots exist and fall back cleanly otherwise.

**Step 2: Run the focused tests**

Run: `npx playwright test src/tests/growth-metrics.spec.ts`

Expected: FAIL because the growth metric utilities are not implemented.

**Step 3: Implement minimal typed utilities and mock data**

- Keep range filtering and aggregation pure.
- Put strength series, arm series, body fallbacks, and photo categories in `growthMockData.ts`.
- Do not duplicate exercise or workout schemas.

**Step 4: Re-run focused tests**

Run: `npx playwright test src/tests/growth-metrics.spec.ts`

Expected: PASS.

### Task 3: Build the growth page shell and navigation

**Files:**
- Create: `src/pages/GrowthPage.tsx`
- Create: `src/features/growth/GrowthTabs.tsx`
- Create: `src/features/growth/TimeRangeSelector.tsx`
- Create: `src/components/icons/GrowthIcon.tsx`
- Modify: `src/app/router.tsx`
- Modify: `src/components/layout/BottomNav.tsx`
- Modify: `src/components/layout/AppShell.tsx`

**Step 1: Add the route and four-column navigation**

- Register `/growth`.
- Add 成长 between 记录 and 我的.
- Mark the growth path as part of the dark shell.

**Step 2: Build page header and controls**

- Add the title, subtitle, profile entry, segmented section control, and time-range selector.
- Default to training and three months.
- Use buttons with `aria-pressed` or tab semantics and visible focus styles.

**Step 3: Run navigation tests**

Run: `npx playwright test src/tests/growth-page.spec.ts`

Expected: Section-control assertions may still fail, while route and navigation assertions pass.

### Task 4: Build training growth modules

**Files:**
- Create: `src/features/growth/TrainingGrowthSection.tsx`
- Create: `src/features/growth/OverviewCard.tsx`
- Create: `src/features/growth/StrengthTrendCard.tsx`
- Create: `src/features/growth/TrainingDistributionCard.tsx`
- Create: `src/features/growth/TrendChart.tsx`

**Step 1: Implement the overview card**

- Render completed workouts, active weeks, average weekly frequency, period comparisons, and one summary line.
- Do not render record-breaking information in this card.

**Step 2: Implement the strength trend card**

- Add an accessible action selector backed by the typed mock series.
- Render estimated 1RM, comparison value, SVG trend, and record-summary footer.

**Step 3: Implement training distribution**

- Render five horizontal bars with values and accessible labels.
- Do not render anatomical imagery.

**Step 4: Run page tests**

Run: `npx playwright test src/tests/growth-page.spec.ts`

Expected: Training-section assertions pass.

### Task 5: Build body-change modules

**Files:**
- Create: `src/features/growth/BodyChangesSection.tsx`
- Create: `src/features/growth/BodyMetricsCard.tsx`
- Create: `src/features/growth/ProgressPhotosCard.tsx`
- Create: `src/features/growth/GrowthReplayCard.tsx`

**Step 1: Implement body metric switching**

- Support 体重、腰围、臂围 only.
- Change value, unit, comparison, and trend series without changing layout.

**Step 2: Implement photo hierarchy**

- Feature 面部 and 全身正面 as two larger comparison panels.
- Render 最早/最新 dates and a directional marker.
- Render the remaining four categories as compact pills.
- Use neutral silhouette placeholders with future `imageUrl` support.

**Step 3: Implement the replay entry**

- Add a glowing play control, upcoming label, supporting copy, and trailing arrow.
- Keep it as a non-functional UI placeholder with an accessible disabled/upcoming description.

**Step 4: Run page interaction tests**

Run: `npx playwright test src/tests/growth-page.spec.ts`

Expected: PASS for section, range, metric, and action switching.

### Task 6: Simplify the idle workout-log state

**Files:**
- Modify: `src/features/workout-log/WorkoutLogOverview.tsx`

**Step 1: Remove idle-only secondary cards**

- Remove `RecentWorkoutCard` and `WorkoutProgressCard` from the overview composition and their now-unused derivations/imports.
- Preserve the weekly overview and start-workout sheet.

**Step 2: Increase CTA prominence**

- Place the CTA in its own spacious action area.
- Increase minimum height and visual emphasis while retaining lime styling and focus behavior.

**Step 3: Run workout tests**

Run: `npx playwright test src/tests/workout-log-overview.spec.ts`

Expected: PASS.

### Task 7: Build, regress, and visually verify

**Files:**
- Modify only if verification exposes an in-scope defect.

**Step 1: Run the production build**

Run: `npm run build`

Expected: TypeScript and Vite complete successfully.

**Step 2: Run focused tests**

Run: `npx playwright test src/tests/growth-metrics.spec.ts src/tests/growth-page.spec.ts src/tests/workout-log-overview.spec.ts`

Expected: All pass.

**Step 3: Run the full regression suite**

Run: `npm test`

Expected: All existing tests pass, or any unrelated pre-existing failure is documented with evidence.

**Step 4: Verify at 390px**

- Inspect both growth tabs and the idle workout-log state at 390px width.
- Verify no horizontal overflow, no bottom-nav overlap, readable charts, and 44px touch targets.

