import { expect, test } from '@playwright/test';
import type { PosturePlan, PostureSessionFeedback } from '../types/posturePlan';
import {
  getPosturePlanOccurrences,
  getPosturePlanProgress,
  getPostureTodayTask
} from '../utils/posturePlanRules';

test('creates selected weekdays inside rolling plan weeks', () => {
  expect(getPosturePlanOccurrences(plan).slice(0, 4)).toEqual([
    { date: '2026-07-17', weekIndex: 1 },
    { date: '2026-07-20', weekIndex: 1 },
    { date: '2026-07-22', weekIndex: 1 },
    { date: '2026-07-24', weekIndex: 2 }
  ]);
});

test('derives completed and missed sessions from plan-linked logs and feedback', () => {
  const logs = [log('log-1', '2026-07-17'), log('log-2', '2026-07-20')];
  const feedback = [completed('log-1'), completed('log-2')];
  expect(getPosturePlanProgress(plan, logs, feedback, new Date('2026-07-23T09:00:00+08:00'))).toMatchObject({
    completedSessions: 2,
    dueSessions: 3,
    missedSessions: 1,
    weekIndex: 2
  });
});

test('does not count today or paused dates as missed', () => {
  const paused = { ...plan, status: 'paused' as const, pausedAt: '2026-07-20T00:00:00+08:00' };
  expect(getPosturePlanProgress(paused, [], [], new Date('2026-07-22T09:00:00+08:00'))).toMatchObject({
    dueSessions: 1,
    missedSessions: 1
  });
  expect(getPosturePlanProgress(plan, [], [], new Date('2026-07-17T09:00:00+08:00')).missedSessions).toBe(0);
});

test('returns today task until the matching session is completed', () => {
  const now = new Date('2026-07-17T09:00:00+08:00');
  expect(getPostureTodayTask(plan, [], [], now)).toMatchObject({ date: '2026-07-17', weekIndex: 1 });
  expect(getPostureTodayTask(plan, [log('log-1', '2026-07-17')], [completed('log-1')], now)).toBeNull();
});

test('completes only after the full final plan week', () => {
  const weekly: PosturePlan = { ...plan, durationWeeks: 2, weeklyFrequency: 1, weekdays: [5] };
  expect(getPosturePlanProgress(weekly, [], [], new Date('2026-07-25T09:00:00+08:00')).cycleComplete).toBe(false);
  expect(getPosturePlanProgress(weekly, [], [], new Date('2026-07-30T09:00:00+08:00')).cycleComplete).toBe(true);
});

const plan: PosturePlan = {
  id: 'plan-1',
  protocolId: 'CERVICAL_001',
  assessmentId: 'assessment-1',
  status: 'active',
  startDate: '2026-07-16',
  durationWeeks: 3,
  weeklyFrequency: 3,
  weekdays: [1, 3, 5],
  recommendationReasons: ['匹配颈部区域'],
  qualitySnapshot: { dataQuality: 'high', completeness: 'complete', sourceUrl: 'https://example.com' },
  reassessmentIds: [],
  createdAt: '2026-07-16T08:00:00.000Z',
  updatedAt: '2026-07-16T08:00:00.000Z'
};

function log(id: string, scheduledDate: string) {
  return { id, date: scheduledDate, posturePlanContext: { planId: plan.id, weekIndex: 1, scheduledDate } };
}

function completed(workoutLogId: string): PostureSessionFeedback {
  return { id: `feedback-${workoutLogId}`, planId: plan.id, workoutLogId, discomfortBefore: 4, discomfortAfter: 3, difficulty: 'appropriate', status: 'completed', createdAt: '2026-07-17T09:30:00.000Z' };
}
