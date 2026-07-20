import { expect, test } from '@playwright/test';
import {
  POSTURE_PLANS_KEY,
  PosturePlanRepository
} from '../repositories/posturePlanRepository';
import type { PostureAssessmentInput, PosturePlanInput } from '../types/posturePlan';

const assessmentInput: PostureAssessmentInput = {
  kind: 'initial',
  goals: ['comfort'],
  regions: ['cervical_head'],
  symptomDuration: '1-3m',
  discomfort: 4,
  functionScore: 6,
  riskFlags: [],
  equipment: ['bodyweight'],
  sessionMinutes: 15,
  weeklyFrequency: 3
};

test('stores one active plan with its assessment', () => {
  const repository = createRepository();
  const assessment = repository.saveAssessment(assessmentInput);
  const created = repository.tryCreatePlan(planInput(assessment.id));
  expect(created.ok).toBe(true);
  if (!created.ok) return;
  expect(repository.getActivePlan()?.id).toBe(created.plan.id);
  expect(repository.listAssessments()).toEqual([assessment]);
});

test('refuses a second active plan', () => {
  const repository = createRepository();
  const assessment = repository.saveAssessment(assessmentInput);
  expect(repository.tryCreatePlan(planInput(assessment.id)).ok).toBe(true);
  expect(repository.tryCreatePlan({ ...planInput(assessment.id), protocolId: 'PELVIS_002' })).toEqual({ ok: false, error: 'active-plan-exists' });
});

test('creates a manual plan from one screening source and stores its trace snapshot', () => {
  const repository = createRepository();
  const created = repository.tryCreatePlan(manualScreeningPlanInput());

  expect(created.ok).toBe(true);
  if (!created.ok) return;
  expect(created.plan.assessmentId).toBeUndefined();
  expect(created.plan.screeningSessionId).toBe('screening-1');
  expect(created.plan.sourceSnapshot).toEqual({
    screeningCompletedAt: '2026-07-15T08:00:00.000Z',
    primaryFinding: '头肩控制需要改善',
    selectedProtocolId: 'UPPER_POSTURE_001',
    createdAt: '2026-07-16T08:00:00.000Z',
    selectionMode: 'manual'
  });
});

test('rejects ambiguous or incomplete plan sources at creation', () => {
  const repository = createRepository();
  const manualInput = manualScreeningPlanInput();

  expect(repository.tryCreatePlan({ ...manualInput, assessmentId: 'assessment-1' })).toEqual({ ok: false, error: 'invalid-plan' });
  expect(repository.tryCreatePlan({ ...manualInput, sourceSnapshot: undefined })).toEqual({ ok: false, error: 'invalid-plan' });
  expect(repository.tryCreatePlan({
    ...manualInput,
    sourceSnapshot: { ...manualInput.sourceSnapshot!, selectedProtocolId: 'THORACIC_001' }
  })).toEqual({ ok: false, error: 'invalid-plan' });
  expect(repository.tryCreatePlan({
    ...manualInput,
    sourceSnapshot: { ...manualInput.sourceSnapshot!, selectionMode: 'automatic' }
  } as unknown as PosturePlanInput)).toEqual({ ok: false, error: 'invalid-plan' });
});

test('keeps persisted legacy plans that have neither source field', () => {
  const storage = new MemoryStorage();
  const repository = new PosturePlanRepository(storage, () => new Date('2026-07-16T08:00:00.000Z'));
  const assessment = repository.saveAssessment(assessmentInput);
  const created = repository.tryCreatePlan(planInput(assessment.id));
  if (!created.ok) throw new Error('fixture create failed');
  const legacyPlan = { ...created.plan } as Record<string, unknown>;
  delete legacyPlan.assessmentId;
  storage.setItem(POSTURE_PLANS_KEY, JSON.stringify([legacyPlan]));

  expect(repository.listPlans()).toEqual([legacyPlan]);
});

test('ignores malformed persisted source fields without throwing', () => {
  const storage = new MemoryStorage();
  const repository = new PosturePlanRepository(storage, () => new Date('2026-07-16T08:00:00.000Z'));
  const assessment = repository.saveAssessment(assessmentInput);
  const created = repository.tryCreatePlan(planInput(assessment.id));
  if (!created.ok) throw new Error('fixture create failed');
  storage.setItem(POSTURE_PLANS_KEY, JSON.stringify([{ ...created.plan, assessmentId: 42 }]));

  expect(() => repository.listPlans()).not.toThrow();
  expect(repository.listPlans()).toEqual([]);
});

test('ignores corrupt records while preserving valid plans', () => {
  const storage = new MemoryStorage();
  const repository = new PosturePlanRepository(storage, () => new Date('2026-07-16T08:00:00.000Z'));
  const assessment = repository.saveAssessment(assessmentInput);
  const created = repository.tryCreatePlan(planInput(assessment.id));
  if (!created.ok) throw new Error('fixture create failed');
  storage.setItem(POSTURE_PLANS_KEY, JSON.stringify([created.plan, { id: 4 }]));
  storage.setItem('musclemap.postureAssessments.v1', JSON.stringify([
    ...repository.listAssessments(),
    { ...assessment, discomfort: 99 }
  ]));
  expect(repository.listPlans()).toEqual([created.plan]);
  expect(repository.listAssessments()).toEqual([assessment]);
});

test('saves and restores an assessment draft', () => {
  const repository = createRepository();
  const draft = { goals: ['mobility'] as const, regions: ['thoracic'] as const, step: 2 };
  repository.saveAssessmentDraft(draft);
  expect(repository.readAssessmentDraft()).toEqual(draft);
  repository.clearAssessmentDraft();
  expect(repository.readAssessmentDraft()).toBeNull();
});

function planInput(assessmentId: string): PosturePlanInput {
  return {
    protocolId: 'CERVICAL_001',
    assessmentId,
    startDate: '2026-07-16',
    durationWeeks: 3,
    weeklyFrequency: 3,
    weekdays: [1, 3, 5],
    recommendationReasons: ['匹配颈部与头部区域'],
    qualitySnapshot: { dataQuality: 'high', completeness: 'complete', sourceUrl: 'https://example.com/source' }
  };
}

function manualScreeningPlanInput(): PosturePlanInput {
  return {
    protocolId: 'UPPER_POSTURE_001',
    screeningSessionId: 'screening-1',
    sourceSnapshot: {
      screeningCompletedAt: '2026-07-15T08:00:00.000Z',
      primaryFinding: '头肩控制需要改善',
      selectedProtocolId: 'UPPER_POSTURE_001',
      createdAt: '2026-07-15T08:05:00.000Z',
      selectionMode: 'manual'
    },
    startDate: '2026-07-16',
    durationWeeks: 4,
    weeklyFrequency: 3,
    weekdays: [1, 3, 5],
    recommendationReasons: ['用户主动选择'],
    qualitySnapshot: { dataQuality: 'high', completeness: 'complete', sourceUrl: 'https://example.com/source' }
  };
}

function createRepository() {
  return new PosturePlanRepository(new MemoryStorage(), () => new Date('2026-07-16T08:00:00.000Z'));
}

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}
