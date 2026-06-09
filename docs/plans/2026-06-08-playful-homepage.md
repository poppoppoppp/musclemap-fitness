# Playful Homepage Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Replace the current redundant homepage with a playful training-map dashboard based on the approved reference image.

**Architecture:** Keep the existing React/Vite route structure. Rebuild `Dashboard.tsx` as a self-contained homepage that reads current workout, latest generated plan, and latest workout log from existing storage helpers, while `BottomNav.tsx` becomes a four-item mobile nav matching the new information architecture.

**Tech Stack:** React 19, React Router, TypeScript, Tailwind CSS, Playwright.

---

### Task 1: Homepage Behavior Test

**Files:**
- Modify: `src/tests/user-flow.spec.ts`

**Step 1: Write the failing test**

Add an e2e test that seeds local storage with a recent plan and latest workout, opens `/`, and verifies:
- the heading "今天点亮哪块肌肉？" is visible
- exactly one "3D 选肌群" link points to `/three-muscle-selector`
- "开始记录" points to `/workout-log`
- recent plan and recent workout cards render
- old homepage duplicate links for 动作库 and 训练计划 are absent from the main content

**Step 2: Run test to verify it fails**

Run: `npx playwright test src/tests/user-flow.spec.ts -g "homepage presents playful training map"`
Expected: FAIL because the current homepage still renders the old card list.

### Task 2: Dashboard Redesign

**Files:**
- Modify: `src/pages/Dashboard.tsx`

**Step 1: Implement minimal UI**

Replace the old secondary entry grid with:
- Brand/header row.
- Hero muscle map card linking to `/three-muscle-selector`.
- Primary "开始记录" or "继续训练" CTA.
- Recent plan panel using `PLAN_STORAGE_KEY`.
- Recent workout panel using `readWorkoutLogs`.

**Step 2: Run focused test**

Run: `npx playwright test src/tests/user-flow.spec.ts -g "homepage presents playful training map"`
Expected: PASS.

### Task 3: Bottom Nav Simplification

**Files:**
- Modify: `src/components/layout/BottomNav.tsx`

**Step 1: Update nav items**

Use four bottom nav items: 首页, 计划, 训练, 我的. Route 我的 to data management for now because the project has no profile/settings page.

**Step 2: Verify navigation**

Run the homepage test and a mobile core page smoke test.

### Task 4: Build and Visual QA

**Files:**
- No production edits unless QA finds issues.

**Step 1: Run build**

Run: `npm run build`
Expected: TypeScript and Vite build exit 0.

**Step 2: Run browser QA**

Start Vite, open the homepage at mobile viewport, capture a screenshot, compare against the supplied concept, and fix visible layout, overflow, or copy drift.
