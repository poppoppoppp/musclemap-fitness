# Training Entry Homepage Design

## Goal

Reposition the homepage as the app's decision layer: start or continue training, inspect the latest completed workout, continue the current plan, and prepare training music.

## Scope

- Redesign only the homepage and its homepage presentation of the shared bottom navigation.
- Preserve the existing workout log, active-workout, workout-detail, plan generation, and storage behavior.
- Do not add Workout Mode, rhythm-driven visuals, dynamic themes, external images, large dependencies, or NetEase Cloud Music integration.
- The header displays only `MuscleMap`; the proposed subtitle is intentionally omitted.

## Architecture

`Dashboard` remains the route component and reads existing local data through `readActiveWorkout`, `readWorkoutLogs`, and `PLAN_STORAGE_KEY`. Small dashboard components render the start hero, latest workout, current plan, and music preparation states. Derived labels and progress use existing workout and plan data without changing persisted models.

The homepage gets an isolated dark canvas with neon-lime accents and CSS-only athletic graphics. Other pages retain their current visual system. `BottomNav` detects the home route and applies the dark homepage treatment only there.

## Data and interaction design

- Start card: an existing active workout continues at `/workout-log`; otherwise the existing manual workout creation path is used before navigating there.
- Latest workout: use the first sorted workout log. Date, duration, set count, and calories come from the stored record and existing summary utilities. If absent, show an explicit empty state.
- Current plan: use the stored generated plan. Completed sessions are workout logs whose `planId` matches the plan ID; this count determines progress and the next day without adding a new progress model.
- Music: define a small optional track view model. With no source data, render an empty preparation state. Import opens a lightweight notice that NetEase playlist import is reserved for later.
- Navigation: 首页 `/`, 训练 `/workout-log`, 记录 `/workout-history`, 我的 `/data-management`.

## Validation

Playwright covers populated and empty data states, existing workout continuation, plan continuation, music import notice, navigation targets, and a 390px viewport without horizontal overflow or bottom-nav overlap. Run `npm run build` and `npm run test:e2e`.
