# Workout Completed Detail Design

## Scope

The existing `/workout-history/:logId` route becomes both the just-completed result and the durable history detail/editor. No completed view or storage field is added. Active workout keeps the existing archive validation and data format.

## Navigation

Successful archive writes and synchronizes workout history, clears the active workout, then navigates to the archived log with router state `{ justCompleted: true }`. Only that transient state renders the saved confirmation. The completed back action returns to `/workout-log`; normal history detail returns to browser history or `/workout-history` on direct loads.

## History persistence

`workoutHistory.ts` owns log update, deletion, sorting, and latest-log synchronization. Derived counts, muscles, summaries, overview cards, history cards, and dashboard data remain computed at read time. Editing never creates new persisted fields.

## Detail and editing

The detail page uses a local draft and stays read-only by default. Edit mode supports date, workout notes, exercise notes, set weight/reps, set add/delete, exercise delete, and record delete. Save removes empty sets, rejects invalid values and empty exercises, then persists through the history utility. Cancel drops the draft.

## Visual design

The route uses the current `#080a08`, lime-300, translucent neutral borders, system typography, 440px content cap, and existing BottomNav. Duration is the only dominant statistic. The existing muscle SVG receives a dark lime variant. Exercise imagery uses the existing dumbbell fallback because the repository has no exercise thumbnail field.

## Active adjustments

The bottom mini player is removed. A compact cover/title summary replaces the Header music button and still links to the dashboard playlist. A shared `.workout-dark` input context overrides the global light text fill in mobile WebKit.
