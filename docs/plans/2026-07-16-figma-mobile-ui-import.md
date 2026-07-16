# Figma Mobile UI Import Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Import every MuscleMap Fitness route into a new Figma Design file at a mobile viewport in both default and representative populated states.

**Architecture:** Run the existing Vite app without source changes, prepare browser-local state for each capture set, and use the Figma MCP webpage capture workflow route by route. Store every capture in one Figma file, organize it by state, and visually validate the resulting editable frames.

**Tech Stack:** Vite, React, React Router, browser localStorage, Figma MCP, in-app browser

---

### Task 1: Verify Figma access and create the target file

**Files:**
- Reference: `docs/plans/2026-07-16-figma-mobile-ui-import-design.md`

**Step 1: Call the read-only Figma identity check**

Run `figma_whoami`.

Expected: authenticated user information and at least one writable plan key.

**Step 2: Create the Figma Design file**

Call `figma_create_new_file` with editor type `design`, the selected plan key, and file name `MuscleMap Fitness - Mobile UI Import`.

Expected: a new Figma file key and URL.

**Step 3: Record the file key for all subsequent captures**

Keep the returned file key in the active task context. Do not write credentials or account details to the repository.

### Task 2: Start and verify the existing application

**Files:**
- Reference: `package.json`
- Reference: `src/app/router.tsx`

**Step 1: Start the development server**

Run: `npm run dev -- --port 4173`

Expected: Vite reports a local URL at `http://localhost:4173`.

**Step 2: Open the application at the mobile viewport**

Open `http://localhost:4173/` with viewport width 390 and height 844.

Expected: the dashboard renders without a blocking runtime error or horizontal overflow.

**Step 3: Enumerate capture routes**

Capture the static routes `/`, `/muscle-map`, `/music`, `/exercises`, `/growth`, `/growth/body-records`, `/growth/photos`, `/plan-builder`, `/templates/new`, `/data-management`, `/three-muscle-selector`, `/three-muscle-demo`, `/workout-log`, and `/workout-history`.

Discover valid representative parameters at runtime for `/exercises/:exerciseId`, `/growth/photos/compare/:category`, and `/workout-history/:logId`.

### Task 3: Capture default states

**Files:**
- No repository files changed.

**Step 1: Prepare default browser-local state**

Clear only the application origin's localStorage and reload the dashboard.

Expected: the application shows its default or empty state.

**Step 2: Capture each static route**

For each route from Task 2, navigate to the route and run the `figma_generate_figma_design` capture workflow with the target file key. Poll each capture until it completes before reusing the route.

Expected: one editable mobile capture per route in the target Figma file.

**Step 3: Capture valid default dynamic-route instances**

Use a built-in exercise identifier and any valid default comparison category. Capture workout history detail only if a default record exists; otherwise reserve it for the populated set.

Expected: dynamic screens that can render without seeded records are captured without error boundaries.

### Task 4: Prepare and capture populated states

**Files:**
- No repository files changed.

**Step 1: Create representative data through the existing UI**

Use the application controls to create representative body measurements, progress photos when supported without external files, a training plan or template, an active/completed workout, and other locally stored state needed by the routes.

Expected: dashboard, growth, planning, and workout-history screens show meaningful non-empty content.

**Step 2: Discover populated dynamic-route URLs**

Open one exercise detail, one progress-photo comparison category, and one completed workout detail through the application UI. Record their runtime URLs for capture.

Expected: all parameterized routes resolve to valid content.

**Step 3: Capture every populated route**

Repeat the Figma webpage capture workflow for every static route and all representative dynamic-route instances.

Expected: one populated editable capture per route in the same target Figma file.

### Task 5: Organize and validate the Figma file

**Files:**
- No repository files changed.

**Step 1: Organize captures by state**

Use Figma MCP editing only inside the new target file to group or label frames under `Default States` and `Populated States`, naming frames as `state / route / page name`.

Expected: default and populated frames are easy to compare.

**Step 2: Visually inspect representative captures**

Check the dashboard, muscle map, exercise library/detail, growth, active workout, and workout-history detail for fonts, images, bottom navigation, scrolling, and mobile-width layout.

Expected: no missing primary content, obvious clipping, or desktop-width frames.

**Step 3: Verify repository integrity**

Run: `git status --short`

Expected: no source-code changes from the import workflow; pre-existing unrelated changes may remain untouched.

**Step 4: Report the result**

Return the Figma file URL, captured route count, any states that could not be represented, and the repository integrity check.
