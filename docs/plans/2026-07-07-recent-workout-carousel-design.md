# Recent Workout Carousel Design

## Scope

Turn the homepage “最近一次训练” card into a touch-friendly carousel containing at most the five most recent workout logs. The feature changes only homepage browsing; it does not modify workout history, sorting, or stored records.

## Interaction

- The newest workout is selected initially.
- Users swipe horizontally to select an adjacent workout.
- Cards snap to the center so the selected record is unambiguous.
- Tapping a card opens that workout’s existing detail route.
- Pagination dots show the current position when more than one workout exists.
- “查看全部” continues to open the complete history.
- Zero records retain the current honest empty state.

## Visual behavior

Reuse the existing dark card and lime-green active language. Adjacent cards may peek slightly at the edge to teach the swipe gesture. The carousel must not cause document-level horizontal overflow, and it must remain usable with keyboard navigation and reduced motion.

## Data flow

`Dashboard` passes `workoutLogs.slice(0, 5)` and their derived summaries to `DashboardRecentWorkoutCard`. The component owns only the selected slide index and updates it from scroll position. Existing log ordering remains the source of truth.

## Verification

Playwright verifies the five-item limit, newest-first default, horizontal selection, pagination, detail links, empty state, and no page overflow at 390x844.
