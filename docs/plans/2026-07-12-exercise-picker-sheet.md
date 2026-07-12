# Exercise Picker Sheet Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Replace the active workout's native exercise select with an accessible bottom sheet that supports search, muscle-group filtering, and an embedded compact 2D muscle picker.

**Architecture:** Keep active workout ownership in `ActiveWorkoutView` and reuse `addExerciseToActiveWorkout` for state updates. Put deterministic search, category, and muscle relationship rules in a shared utility consumed by both the sheet and `TwoDMuscleSelector`; render the existing `InteractiveMuscleMap2D` inside the sheet without duplicating SVG or navigation.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, React portals, Playwright.

---

### Task 1: Specify filtering and picker behavior

**Files:**
- Create: `src/tests/exercise-picker.spec.ts`
- Modify: `src/tests/user-flow.spec.ts`

1. Add Playwright coverage for opening/closing, categories, multilingual and equipment search, embedded 2D mode, adding, persistence, duplicate state, focus restoration, and mobile overflow.
2. Run `npx playwright test src/tests/exercise-picker.spec.ts --project=chromium` and confirm the new picker tests fail because the sheet does not exist.
3. Replace legacy manual-select interactions in existing active-workout tests with the new picker flow after implementation.

### Task 2: Add shared exercise filtering and 2D relationship logic

**Files:**
- Create: `src/utils/exerciseFilters.ts`
- Modify: `src/pages/TwoDMuscleSelector.tsx`

1. Define category mappings only from muscle IDs present in `muscles.ts`.
2. Implement normalized search across exercise names, tags, equipment, and Chinese/English muscle names.
3. Implement stable primary-before-secondary ordering for categories and individual muscles.
4. Reuse the relationship helper in `TwoDMuscleSelector` while preserving its existing four-result page behavior.
5. Run the targeted 2D selector tests and confirm they pass.

### Task 3: Build and integrate the accessible bottom sheet

**Files:**
- Create: `src/components/workout/ExercisePickerSheet.tsx`
- Modify: `src/features/workout-log/ActiveWorkoutView.tsx`

1. Render the sheet through a portal with dialog semantics, focus trap/restoration, Escape and backdrop closing, scroll lock, safe-area padding, and reduced-motion handling.
2. Add list mode with search, fixed muscle categories, compact real-data cards, disabled existing actions, and explicit empty state.
3. Add an in-sheet 2D mode using `InteractiveMuscleMap2D`, front/back-aware selection shortcuts, related exercises, and a return action.
4. Add selected exercises through the existing workout state path, close on success, retain the sheet on duplicates, and focus/scroll the new workout card.
5. Remove the native select and make the single `＋ 添加动作` trigger visible after the workout exercise content.
6. Run targeted picker and active-workout tests, then the full Playwright suite and `npm run build`.
