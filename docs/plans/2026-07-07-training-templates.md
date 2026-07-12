# Training Templates Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Build a user-owned training template list at `/plan-builder` and an empty template creation flow at `/templates/new`.

**Architecture:** Add a typed local-storage utility as the single persistence boundary. Replace the rendered legacy plan builder with a storage-backed list and add a focused form page, while reusing the existing application shell and bottom navigation.

**Tech Stack:** React 19, React Router, TypeScript, Tailwind CSS, Playwright

---

### Task 1: Specify the template flow with failing E2E tests

**Files:**
- Modify: `src/tests/user-flow.spec.ts`

1. Add tests for the empty list and `/templates/new` content.
2. Add tests for validation, persistence, redirect, and rendering only stored templates.
3. Add routing and 390x844 overflow/navigation-clearance assertions.
4. Run the targeted tests and verify failure because the new route and UI do not exist.

### Task 2: Add typed local template persistence

**Files:**
- Create: `src/types/trainingTemplate.ts`
- Create: `src/utils/trainingTemplates.ts`

1. Define `TrainingTemplate` and `TrainingTemplateItem` exactly for the requested data shape.
2. Implement read, write, and create functions using `musclemap.trainingTemplates.v1`.
3. Keep ids and timestamps generated at creation and initialize `items` to an empty array.

### Task 3: Build the new-template page and routing

**Files:**
- Create: `src/pages/NewTrainingTemplate.tsx`
- Modify: `src/app/router.tsx`
- Modify: `src/components/layout/BottomNav.tsx`

1. Register `/templates/new`.
2. Build the image-reference form with accessible controls and empty exercise state.
3. Implement placeholders and query-parameter routes for add methods.
4. Validate the trimmed name, save locally, and navigate to `/plan-builder`.
5. Treat template routes as part of “我的” for bottom-navigation highlighting.

### Task 4: Replace the visible plan builder with the template list

**Files:**
- Modify: `src/pages/PlanBuilder.tsx`

1. Read saved templates without seeding data.
2. Render the image-reference header, create action, user-created cards, and honest empty state.
3. Display the post-save status passed from the new-template page.
4. Do not implement start, edit, quick-entry, or generated sample templates.

### Task 5: Verify the complete change

**Files:**
- Modify only files required by failing checks.

1. Run targeted Playwright tests until green.
2. Run `npm run build`.
3. Run `npm run test:e2e`.
4. Confirm 390x844 has no horizontal overflow and the save button clears the floating navigation.
