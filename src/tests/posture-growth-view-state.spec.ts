import { expect, test } from '@playwright/test';
import type { PostureScreeningSession } from '../repositories/postureScreeningRepository';
import type { PosturePlan } from '../types/posturePlan';
import {
  canCreatePosturePlanFromSession,
  derivePostureGrowthViewState,
  findLatestComparablePostureTrend,
} from '../utils/postureGrowth';

test('active and paused plans follow the fixed state priority', () => {
  const session = makeSession({ id: 'eligible', completedAt: '2026-07-20T08:00:00.000Z' });
  const paused = makePlan({ id: 'paused', status: 'paused', updatedAt: '2026-07-21T08:00:00.000Z' });
  const active = makePlan({ id: 'active', status: 'active', updatedAt: '2026-07-19T08:00:00.000Z' });

  expect(derive([session], [paused, active]).status).toBe('active-plan');
  expect(derive([session], [paused]).status).toBe('paused-plan');
});

test('only a creatable screening completed after the explicit plan completion becomes assessed', () => {
  const completedPlan = makePlan({ status: 'completed', completedAt: '2026-07-20T08:00:00.000Z' });
  const older = makeSession({ id: 'older', completedAt: '2026-07-19T08:00:00.000Z' });
  const sameTime = makeSession({ id: 'same', completedAt: '2026-07-20T08:00:00.000Z' });
  const newer = makeSession({ id: 'newer', completedAt: '2026-07-21T08:00:00.000Z' });

  expect(derive([newer], [completedPlan])).toMatchObject({ status: 'assessed', session: { id: 'newer' }, creatable: true });
  expect(derive([older], [completedPlan]).status).toBe('completed-plan');
  expect(derive([sameTime], [completedPlan]).status).toBe('completed-plan');
});

test('completed plan outranks restricted assessments and restricted-only data stays visible', () => {
  const restricted = makeSession({ id: 'restricted', status: 'mixed-evidence', findings: [] });
  const completedPlan = makePlan({ status: 'completed', completedAt: '2026-07-18T08:00:00.000Z' });

  expect(derive([restricted], [completedPlan]).status).toBe('completed-plan');
  expect(derive([restricted], [])).toMatchObject({ status: 'assessed', session: { id: 'restricted' }, creatable: false });
  expect(derive([], []).status).toBe('empty');
});

test('plan creation eligibility rejects every restricted result branch', () => {
  expect(canCreatePosturePlanFromSession(makeSession())).toBe(true);
  expect(canCreatePosturePlanFromSession(makeSession({ status: 'functional-only' }))).toBe(true);

  for (const status of ['safety-review', 'measurement-invalid', 'mixed-evidence', 'draft'] as const) {
    expect(canCreatePosturePlanFromSession(makeSession({ status }))).toBe(false);
  }

  expect(canCreatePosturePlanFromSession(makeSession({ findings: [] }))).toBe(false);
  expect(canCreatePosturePlanFromSession(makeSession({ findingConfidence: 'limited' }))).toBe(false);
  expect(canCreatePosturePlanFromSession(makeSession({ professionalReview: true }))).toBe(false);
});

test('trend requires an explicit comparable baseline and retest relationship', () => {
  const baseline = makeSession({ id: 'baseline', completedAt: '2026-07-10T08:00:00.000Z', measurement: 45 });
  const unrelated = makeSession({ id: 'unrelated', completedAt: '2026-07-20T08:00:00.000Z', measurement: 47 });
  const retest = makeSession({ id: 'retest', completedAt: '2026-07-21T08:00:00.000Z', measurement: 47, baselineSessionId: baseline.id });

  expect(findLatestComparablePostureTrend([baseline, unrelated])).toBeNull();
  expect(findLatestComparablePostureTrend([retest, baseline])).toMatchObject({
    baseline: { id: 'baseline' },
    current: { id: 'retest' },
    comparison: { status: 'comparable' },
  });
});

test('derivation does not mutate selector inputs', () => {
  const sessions = [makeSession()];
  const plans = [makePlan({ status: 'completed', completedAt: '2026-07-01T08:00:00.000Z' })];
  const before = JSON.stringify({ sessions, plans });

  derive(sessions, plans);

  expect(JSON.stringify({ sessions, plans })).toBe(before);
});

function derive(sessions: PostureScreeningSession[], plans: PosturePlan[]) {
  return derivePostureGrowthViewState({
    sessions,
    plans,
    logs: [],
    feedback: [],
    now: new Date('2026-07-22T08:00:00.000Z'),
  });
}

function makeSession(options: {
  id?: string;
  status?: PostureScreeningSession['status'];
  completedAt?: string;
  findings?: PostureScreeningSession['result']['findings'];
  findingConfidence?: 'supported' | 'limited' | 'insufficient';
  professionalReview?: boolean;
  measurement?: number;
  baselineSessionId?: string;
} = {}): PostureScreeningSession {
  const completedAt = options.completedAt ?? '2026-07-20T08:00:00.000Z';
  const status = options.status ?? 'completed';
  const findings = options.findings ?? [{
    patternId: 'forward-head-upper-quarter-tendency',
    label: '头位前移伴上段控制负担倾向',
    evidenceClasses: ['subjective', 'functional'],
    evidenceIds: ['evidence-1'],
    reasonCodes: ['SUPPORTED'],
    confidence: options.findingConfidence ?? 'supported',
    allowedConclusion: '存在可重复的表现倾向。',
    forbiddenConclusions: ['不构成诊断。'],
  }];
  return {
    id: options.id ?? 'session',
    status,
    input: {
      age: 30,
      boundaryAccepted: true,
      safetyFlags: [],
      primaryConcern: 'neck-upper-quarter',
      functionalImpact: 3,
      subjectiveObservations: ['head-position-concern'],
      movement: {
        testId: 'upper-quarter-reach-observation-v1',
        status: 'completed',
        stopSymptoms: [],
        observations: ['head-advances-during-reach'],
      },
      photo: { status: options.measurement === undefined ? 'skipped' : 'completed', observations: [], reasonCodes: [] },
    },
    result: {
      status,
      summary: findings.length ? '本次筛查形成了可解释结果。' : '现有证据不足。',
      findings,
      evidenceIds: [],
      reasonCodes: findings.length ? [] : ['INSUFFICIENT_EVIDENCE'],
      nextActions: options.professionalReview
        ? [{ id: 'professional', label: '寻求专业评估', kind: 'professional-review' }]
        : [{ id: 'return', label: '返回体态主页', kind: 'return' }],
      algorithmVersion: '1.0.0',
      protocolVersion: 'adult-posture-screening-v1',
    },
    photoMeasurements: options.measurement === undefined ? [] : [{
      view: 'left-lateral',
      protocolVersion: 'posture-photo-standard-v1',
      photoAssetAvailable: false,
      landmarks: {},
      measurements: [{
        metricId: 'craniovertebral-angle',
        value: options.measurement,
        unit: 'deg',
        evidenceIds: ['cva-image-reliability-v1'],
      }],
      quality: 'valid',
    }],
    context: options.baselineSessionId ? { baselineSessionId: options.baselineSessionId } : undefined,
    createdAt: completedAt,
    updatedAt: completedAt,
    completedAt,
  };
}

function makePlan(options: Partial<PosturePlan> = {}): PosturePlan {
  const createdAt = '2026-07-01T08:00:00.000Z';
  return {
    id: 'plan',
    protocolId: 'UPPER_POSTURE_001',
    assessmentId: 'legacy-assessment',
    status: 'active',
    startDate: '2026-07-01',
    durationWeeks: 4,
    weeklyFrequency: 2,
    weekdays: [2, 5],
    recommendationReasons: ['用户主动选择'],
    qualitySnapshot: { dataQuality: 'medium', completeness: 'complete', sourceUrl: 'https://example.com' },
    reassessmentIds: [],
    createdAt,
    updatedAt: createdAt,
    ...options,
  };
}
