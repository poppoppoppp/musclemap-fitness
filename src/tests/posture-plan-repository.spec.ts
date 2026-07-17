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
