import { expect, test } from '@playwright/test';
import type { PostureAssessment } from '../types/posturePlan';
import {
  getPosturePlanEligibility,
  getPostureRecommendationResult,
  getRecommendedPostureProtocols
} from '../utils/posturePlanRules';
import { getPostureProtocolById, postureDataset } from '../utils/postureProtocols';

test('blocks limited, low-quality, unsourced, missing-dose, and unresolved-visual protocols', () => {
  expect(eligibility('CERVICAL_002')).toMatchObject({ eligible: false, reasons: expect.arrayContaining(['limited', 'missing-dose']) });
  expect(eligibility('SHOULDER_001')).toMatchObject({ eligible: false, reasons: expect.arrayContaining(['missing-source', 'missing-dose']) });
  expect(eligibility('OROFACIAL_001')).toMatchObject({ eligible: false, reasons: expect.arrayContaining(['secondary', 'low-quality']) });
  expect(eligibility('PELVIS_001')).toMatchObject({ eligible: false, reasons: expect.arrayContaining(['visual-review-required']) });
});

test('keeps secondary protocols out of automatic recommendations', () => {
  expect(getRecommendedPostureProtocols(assessment, postureDataset).map(({ protocol }) => protocol.id)).not.toContain('OROFACIAL_001');
});

test('returns at most two deterministic recommendations with user-facing reasons', () => {
  const first = getRecommendedPostureProtocols(assessment, postureDataset);
  const second = getRecommendedPostureProtocols(assessment, postureDataset);
  expect(first).toEqual(second);
  expect(first.length).toBeGreaterThan(0);
  expect(first.length).toBeLessThanOrEqual(2);
  expect(first.every(({ reasons }) => reasons.length > 0)).toBe(true);
});

test('blocks all recommendations when a risk flag is present', () => {
  expect(getPostureRecommendationResult({ ...assessment, riskFlags: ['numbness'] }, postureDataset)).toEqual({
    status: 'blocked',
    riskFlags: ['numbness']
  });
});

const assessment: PostureAssessment = {
  id: 'assessment-1',
  createdAt: '2026-07-16T08:00:00.000Z',
  kind: 'initial',
  goals: ['comfort', 'mobility'],
  regions: ['cervical_head', 'upper_posture'],
  symptomDuration: '1-3m',
  discomfort: 4,
  functionScore: 6,
  riskFlags: [],
  equipment: ['bodyweight', 'mat', 'wall', 'resistance-band', 'dumbbell', 'cable', 'foam-roller', 'towel'],
  sessionMinutes: 20,
  weeklyFrequency: 3
};

function eligibility(protocolId: string) {
  const protocol = getPostureProtocolById(protocolId);
  if (!protocol) throw new Error(`Missing fixture ${protocolId}`);
  return getPosturePlanEligibility(protocol, postureDataset);
}
