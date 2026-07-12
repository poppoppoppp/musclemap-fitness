import { expect, test } from '@playwright/test';
import type { BodySnapshot } from '../types/body';
import type { WorkoutLog } from '../types/workout';
import {
  deriveBodyMetricSeries,
  deriveTrainingDistribution,
  deriveTrainingOverview,
  filterWorkoutLogsByRange
} from '../utils/growthMetrics';

const now = new Date(2026, 6, 12, 12);

test('filters workout logs by the selected local date range', () => {
  const logs = [
    log('recent', '2026-07-10'),
    log('four-week-edge', '2026-06-14'),
    log('three-month-edge', '2026-04-12'),
    log('old', '2025-12-20')
  ];

  expect(filterWorkoutLogsByRange(logs, '4w', now).map(({ id }) => id)).toEqual(['recent', 'four-week-edge']);
  expect(filterWorkoutLogsByRange(logs, '3m', now).map(({ id }) => id)).toEqual(['recent', 'four-week-edge', 'three-month-edge']);
  expect(filterWorkoutLogsByRange(logs, '6m', now).map(({ id }) => id)).toEqual(['recent', 'four-week-edge', 'three-month-edge']);
  expect(filterWorkoutLogsByRange(logs, 'all', now)).toHaveLength(4);
});

test('derives completed workouts active weeks and average frequency from real logs', () => {
  const logs = [
    log('week-a-1', '2026-07-06'),
    log('week-a-2', '2026-07-09'),
    log('week-b', '2026-06-30'),
    log('outside', '2026-01-01')
  ];

  expect(deriveTrainingOverview(logs, '3m', now)).toEqual({
    completedWorkouts: 3,
    activeWeeks: 2,
    averagePerActiveWeek: 1.5
  });
});

test('aggregates valid sets into the five requested muscle groups', () => {
  const logs: WorkoutLog[] = [{
    ...log('distribution', '2026-07-10'),
    exercises: [
      exercise('bench', 'barbell-bench-press', 2),
      exercise('row', 'seated-row', 3),
      exercise('shoulders', 'dumbbell-lateral-raise', 1),
      exercise('legs', 'squat', 4),
      exercise('arms', 'dumbbell-curl', 2)
    ]
  }];

  expect(deriveTrainingDistribution(logs, '3m', now)).toEqual([
    { id: 'chest', label: '胸部', sets: 2 },
    { id: 'back', label: '背部', sets: 3 },
    { id: 'shoulders', label: '肩部', sets: 1 },
    { id: 'legs', label: '腿部', sets: 4 },
    { id: 'arms', label: '手臂', sets: 2 }
  ]);
});

test('uses real body snapshot series when enough values exist and falls back otherwise', () => {
  const snapshots: BodySnapshot[] = [
    { id: 'a', date: '2026-05-01', bodyWeightKg: 73.2, createdAt: '2026-05-01T08:00:00.000Z' },
    { id: 'b', date: '2026-06-01', bodyWeightKg: 72.8, waistCm: 81, createdAt: '2026-06-01T08:00:00.000Z' },
    { id: 'c', date: '2026-07-01', bodyWeightKg: 72.3, createdAt: '2026-07-01T08:00:00.000Z' }
  ];
  const fallback = [
    { label: '4/12', value: 82 },
    { label: '7/12', value: 80 }
  ];

  expect(deriveBodyMetricSeries(snapshots, 'weight', '3m', now, fallback)).toEqual({
    source: 'real',
    points: [
      { label: '5/1', value: 73.2 },
      { label: '6/1', value: 72.8 },
      { label: '7/1', value: 72.3 }
    ]
  });
  expect(deriveBodyMetricSeries(snapshots, 'waist', '3m', now, fallback)).toEqual({ source: 'mock', points: fallback });
  expect(deriveBodyMetricSeries(snapshots, 'arm', '3m', now, fallback)).toEqual({ source: 'mock', points: fallback });
});

function log(id: string, date: string): WorkoutLog {
  return { id, date, createdAt: `${date}T08:00:00.000Z`, exercises: [] };
}

function exercise(id: string, exerciseId: string, setCount: number) {
  return {
    id,
    exerciseId,
    order: 0,
    sets: Array.from({ length: setCount }, (_, index) => ({
      id: `${id}-set-${index}`,
      setIndex: index + 1,
      reps: 10,
      completed: true
    }))
  };
}
