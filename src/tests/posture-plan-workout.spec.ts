import { expect, test } from '@playwright/test';
import type { PosturePlan } from '../types/posturePlan';
import {
  addPosturePlanTaskToActiveWorkout,
  archiveActiveWorkout,
  createManualActiveWorkout,
  normalizeActiveWorkout,
  startPosturePlanWorkout
} from '../utils/activeWorkout';

const occurrence = { date: '2026-07-17', weekIndex: 1 };

test('starts a plan-linked posture workout', () => {
  const workout = startPosturePlanWorkout(plan, occurrence, new Date('2026-07-17T08:00:00+08:00'));
  expect(workout.posturePlanContext).toEqual({ planId: plan.id, weekIndex: 1, scheduledDate: occurrence.date });
  expect(workout.postureProtocolGroups).toHaveLength(1);
});

test('appends today task without replacing existing exercises', () => {
  const existing = createManualActiveWorkout(new Date('2026-07-17T08:00:00+08:00'));
  existing.exercises = [{ id: 'existing', exerciseId: 'barbell-bench-press', order: 0, source: 'manual', sets: [{ id: 'set-1', setIndex: 1 }] }];
  const next = addPosturePlanTaskToActiveWorkout(existing, plan, occurrence, new Date('2026-07-17T08:05:00+08:00'));
  expect(next.exercises[0].id).toBe('existing');
  expect(next.posturePlanContext?.planId).toBe(plan.id);
  expect(next.exercises.length).toBeGreaterThan(1);
});

test('does not overwrite an unfinished posture task from another scheduled date', () => {
  const existing = startPosturePlanWorkout(plan, { date: '2026-07-16', weekIndex: 1 }, new Date('2026-07-16T08:00:00+08:00'));
  const next = addPosturePlanTaskToActiveWorkout(existing, plan, occurrence, new Date('2026-07-17T08:00:00+08:00'));
  expect(next).toBe(existing);
  expect(next.posturePlanContext?.scheduledDate).toBe('2026-07-16');
});

test('archives plan context and keeps legacy workouts valid', () => {
  const workout = startPosturePlanWorkout(plan, occurrence, new Date('2026-07-17T08:00:00+08:00'));
  workout.exercises[0].sets[0].durationSeconds = 30;
  const archived = archiveActiveWorkout(workout, new Date('2026-07-17T08:20:00+08:00'));
  expect(archived.ok && archived.log.posturePlanContext?.planId).toBe(plan.id);
  expect(normalizeActiveWorkout({ ...createManualActiveWorkout(), posturePlanContext: undefined })).not.toBeNull();
});

test('does not start a plan whose protocol is no longer eligible', () => {
  const workout = startPosturePlanWorkout({ ...plan, protocolId: 'CERVICAL_002' }, occurrence);
  expect(workout.exercises).toEqual([]);
  expect(workout.posturePlanContext).toBeUndefined();
});

const plan: PosturePlan = {
  id: 'plan-1', protocolId: 'UPPER_POSTURE_001', assessmentId: 'assessment-1', status: 'active', startDate: '2026-07-16', durationWeeks: 3,
  weeklyFrequency: 3, weekdays: [1, 3, 5], recommendationReasons: ['匹配颈部区域'],
  qualitySnapshot: { dataQuality: 'high', completeness: 'complete', sourceUrl: 'https://example.com' }, reassessmentIds: [],
  createdAt: '2026-07-16T08:00:00.000Z', updatedAt: '2026-07-16T08:00:00.000Z'
};
