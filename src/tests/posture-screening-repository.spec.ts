import { expect, test } from '@playwright/test';
import { PostureScreeningRepository } from '../repositories/postureScreeningRepository';
import type { PostureRecommendationSnapshot } from '../repositories/postureScreeningRepository';
import type { PostureScreeningInput } from '../utils/postureScreeningRules';
import { evaluatePostureScreening } from '../utils/postureScreeningRules';

const screeningInput = (): PostureScreeningInput => ({
  age: 30,
  boundaryAccepted: true,
  safetyFlags: [],
  primaryConcern: 'neck-upper-quarter',
  subjectiveObservations: ['head-position-concern'],
  movement: {
    testId: 'upper-quarter-reach-observation-v1',
    status: 'completed',
    stopSymptoms: [],
    observations: ['head-advances-during-reach'],
  },
  photo: { status: 'skipped', observations: [], reasonCodes: [] },
});

test('creates and updates one resumable draft', () => {
  const repository = new PostureScreeningRepository(new MemoryStorage(), undefined, undefined, () => new Date('2026-07-17T08:00:00.000Z'));
  const created = repository.saveDraft({ currentStep: 'safety', answers: { age: 30, boundaryAccepted: true }, photoMeasurements: [] });
  expect(created.ok).toBe(true);
  if (!created.ok) return;

  const updated = repository.saveDraft({ currentStep: 'concern', answers: { age: 30, boundaryAccepted: true, safetyFlags: [] }, photoMeasurements: [] });
  expect(updated.ok).toBe(true);
  if (!updated.ok) return;

  expect(updated.draft.id).toBe(created.draft.id);
  expect(updated.draft.createdAt).toBe(created.draft.createdAt);
  expect(repository.readDraft()).toEqual({ ok: true, value: updated.draft });
  repository.clearDraft();
  expect(repository.readDraft()).toEqual({ ok: true, value: null });
});

test('lists immutable completed session snapshots newest first', () => {
  const timestamps = [
    new Date('2026-07-17T08:00:00.000Z'),
    new Date('2026-07-18T08:00:00.000Z'),
  ];
  const repository = new PostureScreeningRepository(new MemoryStorage(), undefined, undefined, () => timestamps.shift() ?? new Date('2026-07-19T08:00:00.000Z'));
  const firstInput = screeningInput();
  const first = repository.saveSession({ input: firstInput, result: evaluatePostureScreening(firstInput), photoMeasurements: [] });
  const secondInput = screeningInput();
  const second = repository.saveSession({ input: secondInput, result: evaluatePostureScreening(secondInput), photoMeasurements: [] });
  expect(first.ok && second.ok).toBe(true);
  if (!first.ok || !second.ok) return;

  firstInput.subjectiveObservations.push('neck-upper-quarter-impact');
  first.session.result.reasonCodes.push('MUTATED_RETURN_VALUE');

  const listed = repository.readSessions();
  expect(listed.ok).toBe(true);
  expect(listed.value.map(({ id }) => id)).toEqual([second.session.id, first.session.id]);
  expect(repository.getSession(first.session.id)?.input.subjectiveObservations).toEqual(['head-position-concern']);
  expect(repository.getSession(first.session.id)?.result.reasonCodes).not.toContain('MUTATED_RETURN_VALUE');
});

test('persists optional automated capture and recommendation snapshots without mutating legacy fields', () => {
  const storage = new MemoryStorage();
  const repository = new PostureScreeningRepository(storage, undefined, undefined, () => new Date('2026-07-22T08:00:00.000Z'));
  const input = screeningInput();
  const captureSnapshot = makeCaptureSnapshot();
  const recommendationSnapshots: PostureRecommendationSnapshot[] = [{
    patternId: 'forward-head-upper-quarter-tendency',
    status: 'available' as const,
    issueNames: ['上半身体态控制不足'],
    protocolId: 'UPPER_POSTURE_001',
    protocolTitle: '头前移与圆肩含胸靠墙控制方案',
    userFacingGoal: '改善上半身活动与控制表现',
    limitations: ['不构成医疗诊断。'],
    reason: '筛查 finding 命中明确白名单。',
  }];

  const saved = repository.saveSession({
    input,
    result: evaluatePostureScreening(input),
    photoMeasurements: [],
    captureSnapshot,
    recommendationSnapshots,
  });
  expect(saved.ok).toBe(true);
  if (!saved.ok) return;

  captureSnapshot.staticCaptures[0].metrics[0].values[0].value = 999;
  recommendationSnapshots[0]!.protocolTitle = 'mutated';
  expect(repository.getSession(saved.session.id)?.captureSnapshot?.staticCaptures[0].metrics[0].values[0].value).toBe(3.18);
  expect(repository.getSession(saved.session.id)?.recommendationSnapshots?.[0]?.protocolTitle).toBe('头前移与圆肩含胸靠墙控制方案');

  const raw = JSON.parse(storage.getItem('musclemap.postureScreeningSessions.v1') ?? '[]');
  expect(raw[0].captureSnapshot.staticCaptures[0].model.checkpointSha256).toBe('rtmpose-hash');
  expect(raw[0].captureSnapshot.staticCaptures[0].detector.checkpointSha256).toBe('rtmdet-hash');
  expect(JSON.stringify(raw[0])).not.toContain('blob');
  expect(JSON.stringify(raw[0])).not.toContain('rawFrames');
  expect(JSON.stringify(raw[0])).not.toContain('keypoints');
});

test('continues to normalize legacy sessions that omit automated snapshots', () => {
  const input = screeningInput();
  const result = evaluatePostureScreening(input);
  const legacy = {
    id: 'legacy-session', status: result.status, input, result, photoMeasurements: [],
    createdAt: '2026-07-17T08:00:00.000Z', updatedAt: '2026-07-17T08:00:00.000Z', completedAt: '2026-07-17T08:00:00.000Z',
  };
  const repository = new PostureScreeningRepository(new MemoryStorage({
    'musclemap.postureScreeningSessions.v1': JSON.stringify([legacy]),
  }));

  expect(repository.readSessions()).toEqual({ ok: true, value: [legacy] });
});

test('rejects malformed optional automated snapshots instead of silently accepting them', () => {
  const input = screeningInput();
  const result = evaluatePostureScreening(input);
  const malformed = {
    id: 'malformed-session', status: result.status, input, result, photoMeasurements: [],
    captureSnapshot: { protocolVersion: 'wrong-version', staticCaptures: 'not-an-array' },
    recommendationSnapshots: [{ patternId: 'unknown', status: 'available' }],
    createdAt: '2026-07-17T08:00:00.000Z', updatedAt: '2026-07-17T08:00:00.000Z', completedAt: '2026-07-17T08:00:00.000Z',
  };
  const repository = new PostureScreeningRepository(new MemoryStorage({
    'musclemap.postureScreeningSessions.v1': JSON.stringify([malformed]),
  }));

  expect(repository.readSessions()).toEqual({ ok: false, error: 'damaged-storage', value: [] });
});

test('returns an empty diagnostic result for malformed storage', () => {
  const repository = new PostureScreeningRepository(new MemoryStorage({
    'musclemap.postureScreeningSessions.v1': '{bad-json',
    'musclemap.postureScreeningDraft.v1': JSON.stringify({ currentStep: 'unknown' }),
  }));

  expect(repository.readSessions()).toEqual({ ok: false, error: 'damaged-storage', value: [] });
  expect(repository.readDraft()).toEqual({ ok: false, error: 'damaged-storage', value: null });
});

test('surfaces localStorage write failures', () => {
  const repository = new PostureScreeningRepository(new ThrowingStorage());
  const input = screeningInput();
  expect(repository.saveDraft({ currentStep: 'boundary', answers: {}, photoMeasurements: [] })).toEqual({ ok: false, error: 'storage-failed' });
  expect(repository.saveSession({ input, result: evaluatePostureScreening(input), photoMeasurements: [] })).toEqual({ ok: false, error: 'storage-failed' });
});

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('stores photo metadata and blob locally then removes raw photo without measurements', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const modulePath = '/src/repositories/postureScreeningRepository.ts';
    const rulesPath = '/src/utils/postureScreeningRules.ts';
    const { PostureScreeningRepository } = await import(/* @vite-ignore */ modulePath) as typeof import('../repositories/postureScreeningRepository');
    const { evaluatePostureScreening } = await import(/* @vite-ignore */ rulesPath) as typeof import('../utils/postureScreeningRules');
    const storage = MemoryStorageForBrowser();
    const repository = new PostureScreeningRepository(storage, indexedDB, `posture-screening-${crypto.randomUUID()}`);
    const asset = await repository.savePhotoAsset({ ownerId: 'draft-1', view: 'front', blob: new Blob(['front-photo'], { type: 'image/jpeg' }), width: 1080, height: 1920 });
    if (!asset.ok) return { error: asset.error };
    const input: PostureScreeningInput = {
      age: 30,
      boundaryAccepted: true,
      safetyFlags: [],
      primaryConcern: 'shoulder-asymmetry',
      subjectiveObservations: ['shoulder-height-concern'],
      movement: { testId: 'upper-quarter-reach-observation-v1', status: 'completed', stopSymptoms: [], observations: [] },
      photo: { status: 'completed', observations: ['shoulder-height-difference'], reasonCodes: [] },
    };
    const saved = repository.saveSession({
      input,
      result: evaluatePostureScreening(input),
      photoMeasurements: [{
        view: 'front',
        photoAssetId: asset.asset.id,
        photoAssetAvailable: true,
        landmarks: { leftAcromion: { x: 0.35, y: 0.4 }, rightAcromion: { x: 0.65, y: 0.44 } },
        measurements: [{ metricId: 'frontal-shoulder-height-difference', value: 0.04, unit: 'ratio', evidenceIds: ['upper-body-photogrammetry-review-v1'] }],
        quality: 'valid',
      }],
    });
    if (!saved.ok) return { error: saved.error };
    const blobBefore = await repository.getPhotoBlob(asset.asset.id);
    const deleted = await repository.deleteSessionPhoto(saved.session.id, asset.asset.id);
    const sessionAfter = repository.getSession(saved.session.id);
    return {
      blobText: await blobBefore?.text(),
      deleted,
      blobAfter: Boolean(await repository.getPhotoBlob(asset.asset.id)),
      photoAfter: sessionAfter?.photoMeasurements[0],
    };

    function MemoryStorageForBrowser(): Storage {
      const values = new Map<string, string>();
      return {
        get length() { return values.size; },
        clear: () => values.clear(),
        getItem: (key) => values.get(key) ?? null,
        key: (index) => [...values.keys()][index] ?? null,
        removeItem: (key) => values.delete(key),
        setItem: (key, value) => values.set(key, value),
      };
    }
  });

  expect(result).toMatchObject({
    blobText: 'front-photo',
    deleted: { ok: true },
    blobAfter: false,
    photoAfter: {
      photoAssetAvailable: false,
      landmarks: { leftAcromion: { x: 0.35, y: 0.4 } },
      measurements: [{ metricId: 'frontal-shoulder-height-difference', value: 0.04 }],
    },
  });
  expect(result.photoAfter).not.toHaveProperty('photoAssetId');
});

test('deleting a session cascades all referenced photo assets', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const modulePath = '/src/repositories/postureScreeningRepository.ts';
    const rulesPath = '/src/utils/postureScreeningRules.ts';
    const { PostureScreeningRepository } = await import(/* @vite-ignore */ modulePath) as typeof import('../repositories/postureScreeningRepository');
    const { evaluatePostureScreening } = await import(/* @vite-ignore */ rulesPath) as typeof import('../utils/postureScreeningRules');
    const values = new Map<string, string>();
    const storage: Storage = { get length() { return values.size; }, clear: () => values.clear(), getItem: (key) => values.get(key) ?? null, key: (index) => [...values.keys()][index] ?? null, removeItem: (key) => values.delete(key), setItem: (key, value) => values.set(key, value) };
    const repository = new PostureScreeningRepository(storage, indexedDB, `posture-screening-${crypto.randomUUID()}`);
    const front = await repository.savePhotoAsset({ ownerId: 'draft-1', view: 'front', blob: new Blob(['front']), width: 800, height: 1200 });
    const lateral = await repository.savePhotoAsset({ ownerId: 'draft-1', view: 'left-lateral', blob: new Blob(['lateral']), width: 800, height: 1200 });
    if (!front.ok || !lateral.ok) return { error: 'asset-save-failed' };
    const input: PostureScreeningInput = { age: 30, boundaryAccepted: true, safetyFlags: [], primaryConcern: 'neck-upper-quarter', subjectiveObservations: ['head-position-concern'], movement: { testId: 'upper-quarter-reach-observation-v1', status: 'completed', stopSymptoms: [], observations: ['head-advances-during-reach'] }, photo: { status: 'completed', observations: [], reasonCodes: [] } };
    const session = repository.saveSession({ input, result: evaluatePostureScreening(input), photoMeasurements: [
      { view: 'front', photoAssetId: front.asset.id, photoAssetAvailable: true, landmarks: {}, measurements: [], quality: 'valid' },
      { view: 'left-lateral', photoAssetId: lateral.asset.id, photoAssetAvailable: true, landmarks: {}, measurements: [], quality: 'valid' },
    ] });
    if (!session.ok) return { error: session.error };
    const deleted = await repository.deleteSession(session.session.id);
    return { deleted, session: repository.getSession(session.session.id), front: await repository.getPhotoBlob(front.asset.id), lateral: await repository.getPhotoBlob(lateral.asset.id) };
  });

  expect(result).toEqual({ deleted: { ok: true }, session: null, front: null, lateral: null });
});

test('discarding a draft cascades its local photo assets', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const modulePath = '/src/repositories/postureScreeningRepository.ts';
    const { PostureScreeningRepository } = await import(/* @vite-ignore */ modulePath) as typeof import('../repositories/postureScreeningRepository');
    const values = new Map<string, string>();
    const storage: Storage = { get length() { return values.size; }, clear: () => values.clear(), getItem: (key) => values.get(key) ?? null, key: (index) => [...values.keys()][index] ?? null, removeItem: (key) => values.delete(key), setItem: (key, value) => values.set(key, value) };
    const repository = new PostureScreeningRepository(storage, indexedDB, `posture-screening-${crypto.randomUUID()}`);
    const asset = await repository.savePhotoAsset({ ownerId: 'draft-1', view: 'front', blob: new Blob(['draft-photo']), width: 800, height: 1200 });
    if (!asset.ok) return { error: asset.error };
    const saved = repository.saveDraft({ currentStep: 'photo', answers: {}, photoMeasurements: [{ view: 'front', photoAssetId: asset.asset.id, photoAssetAvailable: true, landmarks: {}, measurements: [], quality: 'valid' }] });
    if (!saved.ok) return { error: saved.error };
    const discarded = await repository.discardDraft();
    return { discarded, draft: repository.readDraft(), blob: await repository.getPhotoBlob(asset.asset.id) };
  });

  expect(result).toEqual({ discarded: { ok: true }, draft: { ok: true, value: null }, blob: null });
});

test('surfaces IndexedDB open failures', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const modulePath = '/src/repositories/postureScreeningRepository.ts';
    const { PostureScreeningRepository } = await import(/* @vite-ignore */ modulePath) as typeof import('../repositories/postureScreeningRepository');
    const values = new Map<string, string>();
    const storage: Storage = { get length() { return values.size; }, clear: () => values.clear(), getItem: (key) => values.get(key) ?? null, key: (index) => [...values.keys()][index] ?? null, removeItem: (key) => values.delete(key), setItem: (key, value) => values.set(key, value) };
    const brokenFactory = { open: () => { throw new Error('open-failed'); } } as unknown as IDBFactory;
    const repository = new PostureScreeningRepository(storage, brokenFactory);
    return {
      save: await repository.savePhotoAsset({ ownerId: 'draft-1', view: 'front', blob: new Blob(['photo']), width: 800, height: 1200 }),
      read: await repository.readPhotoBlob('missing-photo'),
    };
  });
  expect(result).toEqual({
    save: { ok: false, error: 'storage-failed' },
    read: { ok: false, error: 'storage-failed', value: null },
  });
});

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  constructor(initial: Record<string, string> = {}) { Object.entries(initial).forEach(([key, value]) => this.values.set(key, value)); }
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

class ThrowingStorage extends MemoryStorage {
  override setItem(): void { throw new Error('quota-exceeded'); }
}

function makeCaptureSnapshot() {
  return {
    protocolVersion: 'automated-posture-capture-v1' as const,
    validity: 'partial' as const,
    completedAt: '2026-07-22T08:00:00.000Z',
    staticCaptures: [{
      view: 'front' as const,
      visibleSide: null,
      status: 'valid' as const,
      quality: { completeness: 1, landmarkReliability: 0.96, sharpness: 1, stability: 0.98, failedRules: [] },
      warnings: [{ code: 'IGNORED_WEAK_PERSON_CANDIDATE', severity: 'warning' as const, message: 'Ignored weak candidate.' }],
      model: { id: 'rtmpose', version: '1.3.2', checkpointSha256: 'rtmpose-hash' },
      detector: { id: 'rtmdet', version: '3.2.0', checkpointSha256: 'rtmdet-hash' },
      metrics: [{
        metricId: 'head-lateral-tilt', label: '头部左右倾斜', status: 'valid' as const, quality: 'valid' as const,
        values: [{ label: 'angle', value: 3.18, unit: 'degrees' }], confidence: 0.92, unavailableReasons: [],
        formula: 'atan2(...)', analysisVersion: 'posture-metrics-v1', modelId: 'rtmpose', modelVersion: '1.3.2',
      }],
    }],
    movements: [{
      action: 'bodyweight-squat' as const, view: 'front' as const, visibleSide: null, status: 'valid' as const,
      submittedFrames: 40, validFrames: 40,
      phases: { status: 'complete' as const, startIndex: 0, peakIndex: 20, returnIndex: 39, holdIndices: [20, 21], reasons: [] },
      warnings: [],
      model: { id: 'rtmpose', version: '1.3.2', checkpointSha256: 'rtmpose-hash' },
      detector: { id: 'rtmdet', version: '3.2.0', checkpointSha256: 'rtmdet-hash' },
      metrics: [],
    }],
  };
}
