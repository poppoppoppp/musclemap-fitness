import { expect, test } from '@playwright/test';
import type { BodyMetricRecord } from '../types/body';
import type { WorkoutLog } from '../types/workout';
import {
  deriveStrengthTrends,
  deriveTrainingDistributionDetails,
  deriveTrainingOverview,
  findNearestBodyWeight,
  filterWorkoutLogsByRange
} from '../utils/growthMetrics';

const now = new Date(2026, 6, 12, 12);

test('all finite time ranges filter real logs and all keeps every valid record', () => {
  const logs = [log('recent', '2026-07-10'), log('four-week-edge', '2026-06-14'), log('three-month-edge', '2026-04-12'), log('old', '2025-12-20')];
  expect(filterWorkoutLogsByRange(logs, '4w', now).map(({ id }) => id)).toEqual(['recent', 'four-week-edge']);
  expect(filterWorkoutLogsByRange(logs, '3m', now).map(({ id }) => id)).toEqual(['recent', 'four-week-edge', 'three-month-edge']);
  expect(filterWorkoutLogsByRange(logs, '6m', now)).toHaveLength(3);
  expect(filterWorkoutLogsByRange(logs, 'all', now)).toHaveLength(4);
});

test('overview compares a finite range with the preceding equal period and omits comparison for all', () => {
  const logs = [log('current-a', '2026-07-10'), log('current-b', '2026-06-28'), log('previous', '2026-06-01'), log('old', '2025-01-01')];
  const finite = deriveTrainingOverview(logs, '4w', now);
  expect(finite.current.completedWorkouts).toBe(2);
  expect(finite.previous?.completedWorkouts).toBe(1);
  expect(finite.changes.completedWorkouts).toBe(1);
  const all = deriveTrainingOverview(logs, 'all', now);
  expect(all.current.completedWorkouts).toBe(4);
  expect(all.previous).toBeNull();
  expect(all.changes).toBeNull();
});

test('strength selector contains only actually trained actions sorted by latest record', () => {
  const logs = [
    { ...log('older', '2026-07-01'), exercises: [exercise('bench', 'barbell-bench-press', [{ weight: 60, reps: 8 }])] },
    { ...log('latest', '2026-07-10'), exercises: [exercise('row', 'seated-row', [{ weight: 45, reps: 10 }])] }
  ];
  const trends = deriveStrengthTrends(logs, [], '3m', now);
  expect(trends.map(({ exerciseId }) => exerciseId)).toEqual(['seated-row', 'barbell-bench-press']);
  expect(trends.map(({ exerciseId }) => exerciseId)).not.toContain('deadlift');
  expect(trends[0].points[0]).toMatchObject({ date: '2026-07-10', value: 45, reps: 10, setIndex: 1 });
});

test('external weight uses the heaviest valid set from each workout', () => {
  const logs = [{
    ...log('bench-day', '2026-07-10'),
    exercises: [exercise('bench', 'barbell-bench-press', [{ weight: 60, reps: 10 }, { weight: 70, reps: 6 }, { reps: 12 }])]
  }];
  const trend = deriveStrengthTrends(logs, [], '3m', now)[0];
  expect(trend.points).toEqual([{ date: '2026-07-10', value: 70, reps: 6, setIndex: 2, sourceWeight: 70 }]);
  expect(trend.status).toBe('single');
});

test('nearest body weight prefers the earlier record when absolute distance ties', () => {
  const records: BodyMetricRecord[] = [
    body('before', '2026-07-01', 70),
    body('after', '2026-07-03', 72)
  ];
  expect(findNearestBodyWeight(records, '2026-07-02')?.id).toBe('before');
});

test('bodyweight variants calculate effective weight and ignore missing body records', () => {
  const records = [body('weight', '2026-07-09', 72)];
  const logs = [
    { ...log('pull', '2026-07-10'), exercises: [exercise('pull', 'pull-up', [{ reps: 8, weight: 99 }])] },
    { ...log('weighted', '2026-07-10'), exercises: [exercise('weighted', 'weighted-push-up', [{ weight: 10, reps: 10 }])] },
    { ...log('assisted', '2026-07-10'), exercises: [exercise('assisted', 'assisted-pull-up', [{ weight: 20, reps: 12 }])] }
  ];
  const trends = deriveStrengthTrends(logs, records, '3m', now);
  expect(trends.find(({ exerciseId }) => exerciseId === 'pull-up')?.points[0]).toMatchObject({ value: 72, bodyWeight: 72, reps: 8 });
  expect(trends.find(({ exerciseId }) => exerciseId === 'weighted-push-up')?.points[0]).toMatchObject({ value: 82, bodyWeight: 72, modifierWeight: 10 });
  expect(trends.find(({ exerciseId }) => exerciseId === 'assisted-pull-up')?.points[0]).toMatchObject({ value: 52, bodyWeight: 72, modifierWeight: 20 });

  const missing = deriveStrengthTrends(logs, [], '3m', now);
  expect(missing.find(({ exerciseId }) => exerciseId === 'pull-up')).toMatchObject({ status: 'empty', missingBodyWeightCount: 1, points: [] });
});

test('distribution details retain muscle totals and contributing exercises', () => {
  const logs = [{
    ...log('distribution', '2026-07-10'),
    exercises: [exercise('pull', 'lat-pulldown', [{ reps: 10 }, { reps: 10 }]), exercise('row', 'seated-row', [{ reps: 8 }])]
  }];
  const back = deriveTrainingDistributionDetails(logs, '3m', now).find(({ id }) => id === 'back');
  expect(back).toMatchObject({ label: '背部', sets: 3 });
  expect(back?.exercises).toEqual([
    { exerciseId: 'lat-pulldown', label: '高位下拉', sets: 2 },
    { exerciseId: 'seated-row', label: '坐姿划船', sets: 1 }
  ]);
});

function log(id: string, date: string): WorkoutLog {
  return { id, date, createdAt: `${date}T08:00:00.000Z`, exercises: [] };
}

function exercise(id: string, exerciseId: string, values: Array<{ weight?: number; reps?: number }>) {
  return { id, exerciseId, order: 0, sets: values.map((value, index) => ({ id: `${id}-${index}`, setIndex: index + 1, completed: true, ...value })) };
}

function body(id: string, date: string, weightKg: number): BodyMetricRecord {
  return { id, date, weightKg, createdAt: `${date}T08:00:00.000Z`, updatedAt: `${date}T08:00:00.000Z` };
}
