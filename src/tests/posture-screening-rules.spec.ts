import { expect, test } from '@playwright/test';
import {
  getPostureFollowUpQuestions,
  postureScreeningQuestionEvidenceReferences,
  postureScreeningQuestions,
} from '../data/posture/postureScreeningQuestions';
import {
  getGuidedPostureTest,
  postureScreeningTestEvidenceReferences,
} from '../data/posture/postureScreeningTests';
import { postureScreeningEvidence } from '../data/posture/postureScreeningEvidence';
import type { PostureScreeningInput } from '../utils/postureScreeningRules';
import {
  evaluatePostureScreening,
  postureScreeningRuleEvidenceReferences,
} from '../utils/postureScreeningRules';
import { validatePostureScreeningEvidence } from '../utils/postureScreeningEvidence';

const baseInput = (overrides: Partial<PostureScreeningInput> = {}): PostureScreeningInput => ({
  age: 30,
  boundaryAccepted: true,
  safetyFlags: [],
  primaryConcern: 'neck-upper-quarter',
  subjectiveObservations: [],
  movement: {
    testId: 'upper-quarter-reach-observation-v1',
    status: 'completed',
    stopSymptoms: [],
    observations: [],
  },
  photo: { status: 'skipped', observations: [], reasonCodes: [] },
  ...overrides,
});

test('keeps the common path concise and limits each region to two follow-up questions', () => {
  expect(postureScreeningQuestions.filter(({ stage }) => stage !== 'follow-up')).toHaveLength(4);
  for (const concern of ['neck-upper-quarter', 'thoracic-trunk', 'shoulder-asymmetry', 'unsure'] as const) {
    const followUps = getPostureFollowUpQuestions(concern);
    expect(followUps.length).toBeLessThanOrEqual(2);
    expect(followUps.every(({ concerns }) => concerns.includes(concern))).toBe(true);
  }
  expect(getGuidedPostureTest('neck-upper-quarter').estimatedSeconds).toBe(30);
  expect(getGuidedPostureTest('thoracic-trunk').id).toBe('seated-thoracic-rotation-observation-v1');
});

test('keeps every question, guided test, and decision rule linked to registered evidence', () => {
  expect(
    validatePostureScreeningEvidence(postureScreeningEvidence, [
      ...postureScreeningQuestionEvidenceReferences,
      ...postureScreeningTestEvidenceReferences,
      ...postureScreeningRuleEvidenceReferences,
    ]),
  ).toEqual([]);
});

test('stops before movement instructions when the user is outside the adult boundary', () => {
  const result = evaluatePostureScreening(baseInput({ age: 17, boundaryAccepted: false }));
  expect(result).toMatchObject({
    status: 'safety-review',
    reasonCodes: ['AGE_OUT_OF_SCOPE'],
    findings: [],
    nextActions: [{ id: 'return-posture-hub', kind: 'return' }],
  });
});

test('stops on pre-screen red flags or symptoms arising during the guided test', () => {
  const redFlag = evaluatePostureScreening(baseInput({ safetyFlags: ['progressive-neurological-symptoms'] }));
  expect(redFlag.status).toBe('safety-review');
  expect(redFlag.reasonCodes).toEqual(['SAFETY_PROGRESSIVE_NEUROLOGICAL_SYMPTOMS']);
  expect(redFlag.nextActions.map(({ kind }) => kind)).toContain('professional-review');

  const stoppedTest = evaluatePostureScreening(baseInput({
    movement: {
      testId: 'upper-quarter-reach-observation-v1',
      status: 'stopped',
      stopSymptoms: ['dizziness'],
      observations: [],
    },
  }));
  expect(stoppedTest).toMatchObject({
    status: 'safety-review',
    reasonCodes: ['TEST_STOPPED_DIZZINESS'],
  });
});

test('returns a supported functional-only tendency when subjective and movement evidence agree', () => {
  const result = evaluatePostureScreening(baseInput({
    subjectiveObservations: ['head-position-concern'],
    movement: {
      testId: 'upper-quarter-reach-observation-v1',
      status: 'completed',
      stopSymptoms: [],
      observations: ['head-advances-during-reach'],
    },
  }));

  expect(result.status).toBe('functional-only');
  expect(result.findings).toHaveLength(1);
  expect(result.findings[0]).toMatchObject({
    patternId: 'forward-head-upper-quarter-tendency',
    confidence: 'supported',
    evidenceClasses: ['subjective', 'functional'],
  });
  expect(result.reasonCodes).toContain('PHOTO_SKIPPED');
});

test('supports shoulder asymmetry with functional plus geometry evidence', () => {
  const result = evaluatePostureScreening(baseInput({
    primaryConcern: 'shoulder-asymmetry',
    movement: {
      testId: 'upper-quarter-reach-observation-v1',
      status: 'completed',
      stopSymptoms: [],
      observations: ['arm-raise-asymmetry'],
    },
    photo: { status: 'completed', observations: ['shoulder-height-difference'], reasonCodes: [] },
  }));

  expect(result.status).toBe('completed');
  expect(result.findings[0]).toMatchObject({
    patternId: 'frontal-shoulder-asymmetry-tendency',
    evidenceClasses: ['functional', 'geometry'],
    confidence: 'supported',
  });
});

test('supports subjective plus geometry agreement but records missing functional support', () => {
  const result = evaluatePostureScreening(baseInput({
    primaryConcern: 'shoulder-asymmetry',
    subjectiveObservations: ['shoulder-height-concern'],
    photo: { status: 'completed', observations: ['shoulder-height-difference'], reasonCodes: [] },
  }));

  expect(result.status).toBe('completed');
  expect(result.findings[0]).toMatchObject({ confidence: 'supported', evidenceClasses: ['subjective', 'geometry'] });
  expect(result.reasonCodes).toContain('FUNCTIONAL_EVIDENCE_NOT_PROVIDED');
});

test('does not name a tendency from one evidence class', () => {
  const result = evaluatePostureScreening(baseInput({
    subjectiveObservations: ['head-position-concern'],
  }));

  expect(result.status).toBe('functional-only');
  expect(result.findings).toEqual([]);
  expect(result.reasonCodes).toEqual(['PHOTO_SKIPPED', 'INSUFFICIENT_EVIDENCE']);
});

test('ignores stale geometry observations after the user skips photos', () => {
  const result = evaluatePostureScreening(baseInput({
    primaryConcern: 'shoulder-asymmetry',
    subjectiveObservations: ['shoulder-height-concern'],
    photo: { status: 'skipped', observations: ['shoulder-height-difference'], reasonCodes: [] },
  }));

  expect(result.findings).toEqual([]);
  expect(result.reasonCodes).toEqual(['PHOTO_SKIPPED', 'INSUFFICIENT_EVIDENCE']);
});

test('records a first CVA measurement without converting it into a categorical tendency', () => {
  const cvaMeasurementOnly = 'cva-measurement-only' as PostureScreeningInput['photo']['observations'][number];
  const result = evaluatePostureScreening(baseInput({
    subjectiveObservations: ['head-position-concern'],
    photo: { status: 'completed', observations: [cvaMeasurementOnly], reasonCodes: [] },
  }));

  expect(result.status).toBe('completed');
  expect(result.findings).toEqual([]);
  expect(result.reasonCodes).toEqual(['INSUFFICIENT_EVIDENCE']);
});

test('returns mixed evidence instead of forcing a dominant pattern', () => {
  const result = evaluatePostureScreening(baseInput({
    subjectiveObservations: ['head-position-concern'],
    movement: {
      testId: 'upper-quarter-reach-observation-v1',
      status: 'completed',
      stopSymptoms: [],
      observations: ['thoracic-rotation-limited'],
    },
    photo: { status: 'completed', observations: ['shoulder-height-difference'], reasonCodes: [] },
  }));

  expect(result.status).toBe('mixed-evidence');
  expect(result.findings).toEqual([]);
  expect(result.reasonCodes).toContain('EVIDENCE_POINTS_TO_DIFFERENT_PATTERNS');
  expect(result.nextActions.map(({ kind }) => ({ kind }))).toEqual(
    expect.arrayContaining([{ kind: 'edit' }, { kind: 'retest' }]),
  );
});

test('keeps a supported finding but marks an additional unmatched pattern as mixed evidence', () => {
  const result = evaluatePostureScreening(baseInput({
    subjectiveObservations: ['head-position-concern'],
    movement: {
      testId: 'upper-quarter-reach-observation-v1',
      status: 'completed',
      stopSymptoms: [],
      observations: ['head-advances-during-reach'],
    },
    photo: { status: 'completed', observations: ['shoulder-height-difference'], reasonCodes: [] },
  }));

  expect(result.status).toBe('mixed-evidence');
  expect(result.findings).toHaveLength(1);
  expect(result.findings[0].patternId).toBe('forward-head-upper-quarter-tendency');
  expect(result.reasonCodes).toContain('ADDITIONAL_UNCONFIRMED_PATTERN');
  expect(result.evidenceIds).toContain('upper-body-photogrammetry-review-v1');
});

test('turns invalid geometry into a recoverable measurement branch', () => {
  const result = evaluatePostureScreening(baseInput({
    subjectiveObservations: ['shoulder-height-concern'],
    photo: { status: 'invalid', observations: [], reasonCodes: ['LANDMARK_MISSING_LEFT_ACROMION'] },
  }));

  expect(result).toMatchObject({
    status: 'measurement-invalid',
    reasonCodes: ['LANDMARK_MISSING_LEFT_ACROMION'],
    findings: [],
  });
  expect(result.nextActions.map(({ kind }) => ({ kind }))).toEqual(
    expect.arrayContaining([{ kind: 'retake' }, { kind: 'skip-photo' }]),
  );
});

test('versions every result and never emits diagnostic or muscle-causation language', () => {
  const result = evaluatePostureScreening(baseInput({
    subjectiveObservations: ['thoracic-stiffness-or-rotation-concern'],
    movement: {
      testId: 'seated-thoracic-rotation-observation-v1',
      status: 'completed',
      stopSymptoms: [],
      observations: ['thoracic-rotation-limited'],
    },
  }));

  expect(result).toMatchObject({
    algorithmVersion: '1.0.0',
    protocolVersion: 'adult-posture-screening-v1',
  });
  expect(result.evidenceIds.length).toBeGreaterThan(0);
  const userFacingClaims = [result.summary, ...result.findings.map(({ allowedConclusion }) => allowedConclusion)].join(' ');
  expect(userFacingClaims).not.toMatch(/确诊|诊断为|肌肉无力|肌肉紧张|结构性后凸|脊柱侧弯/);
});
