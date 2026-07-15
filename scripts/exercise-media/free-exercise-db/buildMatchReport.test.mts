import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { collectRuntimeExercises } from './runtimeExercises.ts';
import { buildMatchRecord, determineTier, detectHardConflicts, getMediaStatus, normalizeExerciseName, scoreCandidate } from './matcher.ts';
import { equipmentCompatibility, mapProjectEquipment } from './equipmentMap.ts';
import { createMatchesCsv, createReuseGroups, createSummary } from './reportWriters.ts';
import { loadFreeDb } from './sourceCache.ts';
import { normalizeManualOverrides } from './manualOverrides.ts';
import { createReviewPage } from './reviewPage.ts';

test('normalizeManualOverrides upgrades the legacy format without losing decisions', () => {
  const result = normalizeManualOverrides({
    accepted: { press: 'Press_Source' },
    rejected: { row: ['Wrong_Row_A', 'Wrong_Row_B'] },
    forced: {}
  });

  assert.equal(result.overrides.version, 1);
  assert.equal(result.overrides.updatedAt, null);
  assert.deepEqual(result.overrides.accepted, { press: 'Press_Source' });
  assert.deepEqual(result.overrides.rejected.row, ['Wrong_Row_A', 'Wrong_Row_B']);
  assert.deepEqual(result.overrides.reuse, {});
  assert.deepEqual(result.overrides.notes, {});
  assert.deepEqual(result.warnings, []);
});

test('normalizeManualOverrides makes accepted, forced, and reuse mutually exclusive', () => {
  const result = normalizeManualOverrides({
    version: 1,
    accepted: { press: 'Accepted_Source' },
    rejected: {},
    forced: { press: 'Forced_Source' },
    reuse: { press: { baseExerciseId: 'base-press', sourceId: 'Reuse_Source', reason: 'same base', differences: 'grip' } },
    notes: {}
  });

  assert.deepEqual(result.overrides.accepted, {});
  assert.deepEqual(result.overrides.reuse, {});
  assert.equal(result.overrides.forced.press, 'Forced_Source');
  assert.ok(result.warnings.some((warning) => warning.includes('press') && warning.includes('互斥')));
});

test('normalizeManualOverrides deduplicates multiple rejected source ids', () => {
  const result = normalizeManualOverrides({
    accepted: {}, rejected: { curl: ['Wrong_A', 'Wrong_B', 'Wrong_A'] }, forced: {}
  });

  assert.deepEqual(result.overrides.rejected.curl, ['Wrong_A', 'Wrong_B']);
});

test('normalizeManualOverrides warns about invalid exercise and source references', () => {
  const result = normalizeManualOverrides({
    version: 1,
    accepted: { missingExercise: 'Valid_Source', validExercise: 'Missing_Source' },
    rejected: { validExercise: ['Missing_Rejected_Source'] },
    forced: {},
    reuse: { reuseExercise: { baseExerciseId: 'missingBase', sourceId: 'Valid_Source', reason: 'reuse', differences: '' } },
    notes: { ghost: 'invalid note' }
  }, {
    exerciseIds: new Set(['validExercise', 'reuseExercise']),
    sourceIds: new Set(['Valid_Source'])
  });

  assert.deepEqual(result.overrides.accepted, {});
  assert.deepEqual(result.overrides.rejected, {});
  assert.deepEqual(result.overrides.reuse, {});
  assert.deepEqual(result.overrides.notes, {});
  assert.ok(result.warnings.some((warning) => warning.includes('missingExercise')));
  assert.ok(result.warnings.some((warning) => warning.includes('Missing_Source')));
  assert.ok(result.warnings.some((warning) => warning.includes('missingBase')));
  assert.ok(result.warnings.some((warning) => warning.includes('ghost')));
});

test('normalizeExerciseName unifies safe aliases while preserving semantic modifiers', () => {
  assert.equal(normalizeExerciseName('One-Arm DB Pull-Up Exercise'), 'singlearm dumbbell pullup');
  assert.equal(normalizeExerciseName('single_arm dumbbell pullup movement'), 'singlearm dumbbell pullup');
  assert.notEqual(normalizeExerciseName('Incline Dumbbell Press'), normalizeExerciseName('Decline Dumbbell Press'));
  assert.notEqual(normalizeExerciseName('Seated Cable Row'), normalizeExerciseName('Standing Cable Row'));
});

test('getMediaStatus distinguishes complete, partial, and missing media', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'musclemap-free-db-media-'));
  try {
    await mkdir(path.join(root, 'public', 'exercise-media', 'complete'), { recursive: true });
    await mkdir(path.join(root, 'public', 'exercise-media', 'partial'), { recursive: true });
    await writeFile(path.join(root, 'public', 'exercise-media', 'complete', 'start.webp'), 'start');
    await writeFile(path.join(root, 'public', 'exercise-media', 'complete', 'peak.webp'), 'peak');
    await writeFile(path.join(root, 'public', 'exercise-media', 'partial', 'start.webp'), 'start');

    assert.equal(await getMediaStatus(root, 'complete'), 'complete');
    assert.equal(await getMediaStatus(root, 'partial'), 'partial');
    assert.equal(await getMediaStatus(root, 'missing'), 'missing');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('hard conflicts prevent equipment and laterality mismatches from auto matching', () => {
  const project = {
    exerciseId: 'one-arm-dumbbell-row',
    name: '单臂哑铃划船',
    nameEn: 'One-arm Dumbbell Row',
    equipment: ['哑铃'],
    primaryMuscles: ['latissimus-dorsi'],
    secondaryMuscles: ['rhomboids'],
    category: 'strength',
    force: 'pull',
    mechanic: 'compound',
    laterality: 'unilateral',
    tags: []
  };
  const source = {
    id: 'Barbell_Row',
    name: 'Barbell Row',
    equipment: 'barbell',
    primaryMuscles: ['lats'],
    secondaryMuscles: ['middle back'],
    category: 'strength',
    force: 'pull',
    mechanic: 'compound',
    instructions: [],
    images: ['Barbell_Row/0.jpg', 'Barbell_Row/1.jpg']
  };

  const conflicts = detectHardConflicts(project, source);
  assert.ok(conflicts.some((conflict) => conflict.code === 'equipment'));
  assert.ok(conflicts.some((conflict) => conflict.code === 'laterality'));
  assert.ok(scoreCandidate(project, source).finalConfidence < 0.85);
});

test('hard conflicts preserve critical movement, posture, grip, and laterality modifiers', () => {
  const project = (nameEn: string, laterality: string | null = null) => ({
    nameEn,
    equipment: ['哑铃'],
    primaryMuscles: ['quadriceps'],
    category: 'strength',
    force: 'push',
    laterality
  });
  const source = (name: string) => ({
    id: name.replaceAll(' ', '_'),
    name,
    equipment: 'dumbbell',
    primaryMuscles: ['quadriceps'],
    secondaryMuscles: [],
    category: 'strength',
    force: 'push',
    mechanic: 'compound',
    instructions: [],
    images: ['0.jpg', '1.jpg']
  });

  assert.ok(detectHardConflicts(project('Dumbbell Split Squat'), source('Dumbbell Squat')).some(({ code }) => code === 'variant'));
  assert.ok(detectHardConflicts(project('Alternating Dumbbell Bench Press', 'alternating'), source('Dumbbell Bench Press')).some(({ code }) => code === 'laterality'));
  assert.ok(detectHardConflicts(project('Seated Dumbbell Shoulder Press'), source('Dumbbell Shoulder Press')).some(({ code }) => code === 'position'));
  assert.ok(detectHardConflicts(project('Wide-grip Pull-up'), source('Wide-Grip Rear Pull-Up')).some(({ code }) => code === 'variant'));
  assert.ok(detectHardConflicts(project('Incline Lateral Raise'), source('One-Arm Incline Lateral Raise')).some(({ code }) => code === 'laterality'));
  assert.ok(detectHardConflicts(project('Barbell Bench Press'), source('Barbell Guillotine Bench Press')).some(({ code }) => code === 'variant'));
  assert.ok(detectHardConflicts(project('Cable Overhead Triceps Extension'), source('Cable Rope Overhead Triceps Extension')).some(({ code }) => code === 'variant'));
  assert.ok(detectHardConflicts(project('Single-arm Overhead Dumbbell Extension', 'unilateral'), source('Dumbbell One-Arm Triceps Extension')).some(({ code }) => code === 'variant'));
  assert.ok(detectHardConflicts(project('Machine Shoulder Press'), source('Machine Shoulder Military Press')).some(({ code }) => code === 'variant'));
});

test('single-leg names contribute unilateral semantics', () => {
  assert.equal(normalizeExerciseName('Single-leg Glute Bridge'), 'singleleg glute bridge');
  const project = {
    nameEn: 'Glute Bridge', equipment: ['自重'], primaryMuscles: ['gluteus-maximus'],
    category: 'strength', force: 'push', laterality: null
  };
  const source = {
    id: 'Single_Leg_Glute_Bridge', name: 'Single Leg Glute Bridge', equipment: 'body only',
    primaryMuscles: ['glutes'], secondaryMuscles: [], category: 'strength', force: 'push', mechanic: 'compound',
    instructions: [], images: ['0.jpg', '1.jpg']
  };
  assert.ok(detectHardConflicts(project, source).some(({ code }) => code === 'laterality'));
});

test('concrete equipment mismatch is not weakened by an accessory mapped as other', () => {
  const projectEquipment = mapProjectEquipment(['哑铃', '卧推凳'], 'Spider Curl');
  assert.ok(projectEquipment.has('dumbbell'));
  assert.ok(projectEquipment.has('other'));
  assert.equal(equipmentCompatibility(projectEquipment, 'e-z curl bar'), 0);
});

test('lying triceps extension is not an exact alias for the behind-head close-grip barbell variant', () => {
  const project = {
    exerciseId: 'lying-triceps-extension',
    nameEn: 'Lying Triceps Extension',
    equipment: ['杠铃', '卧推凳'],
    primaryMuscles: ['triceps-brachii'],
    secondaryMuscles: [],
    category: 'strength',
    force: 'push',
    mechanic: 'isolation',
    laterality: null
  };
  const source = {
    id: 'Lying_Close-Grip_Barbell_Triceps_Extension_Behind_The_Head',
    name: 'Lying Close-Grip Barbell Triceps Extension Behind The Head',
    equipment: 'barbell',
    primaryMuscles: ['triceps'],
    secondaryMuscles: [],
    category: 'strength',
    force: 'push',
    mechanic: 'isolation',
    instructions: [],
    images: ['0.jpg', '1.jpg']
  };

  const score = scoreCandidate(project, source);
  assert.equal(score.matchedAlias, null);
  assert.ok(score.conflicts.some(({ code }) => code === 'variant'));
});

test('collectRuntimeExercises returns unique core and visible posture actions', async () => {
  const exercises = await collectRuntimeExercises(process.cwd());
  const ids = exercises.map(({ exerciseId }) => exerciseId);

  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes('lat-pulldown'));
  assert.ok(ids.some((id) => id.startsWith('EX_')));
});

test('determineTier blocks candidates with missing images and sends close candidates to manual review', () => {
  const baseScore = {
    nameScore: 0.98,
    equipmentScore: 1,
    primaryMuscleScore: 1,
    secondaryMuscleScore: 0.7,
    attributeScore: 0.9,
    conflictPenalty: 0,
    finalConfidence: 0.96,
    matchedAlias: null,
    keyMatches: [],
    keyDifferences: [],
    conflicts: []
  };
  const candidate = (sourceId: string, confidence: number, conflicts = []) => ({
    sourceId,
    sourceName: sourceId,
    sourceEquipment: 'dumbbell',
    sourcePrimaryMuscles: ['chest'],
    sourceSecondaryMuscles: [],
    sourceCategory: 'strength',
    sourceForce: 'push',
    sourceMechanic: 'compound',
    imageCount: conflicts.length ? 1 : 2,
    startImageUrl: 'start',
    peakImageUrl: conflicts.length ? null : 'peak',
    score: { ...baseScore, finalConfidence: confidence, conflicts }
  });

  assert.equal(determineTier('missing', [candidate('only-one-image', 0.96, [{ code: 'images', message: 'one image' }])]).tier, 'manual-review');
  assert.equal(determineTier('missing', [candidate('first', 0.93), candidate('second', 0.91)]).tier, 'manual-review');
  assert.equal(determineTier('complete', [candidate('first', 0.99)]).tier, 'already-covered');
});

test('loadFreeDb falls back to a valid existing cache when the network fails', async () => {
  const cacheDir = await mkdtemp(path.join(os.tmpdir(), 'musclemap-free-db-cache-'));
  try {
    const data = [{ id: 'Cached', name: 'Cached', equipment: 'body only', primaryMuscles: ['abdominals'], secondaryMuscles: [], category: 'strength', force: 'pull', mechanic: 'compound', instructions: [], images: ['Cached/0.jpg', 'Cached/1.jpg'] }];
    const serialized = `${JSON.stringify(data)}\n`;
    await writeFile(path.join(cacheDir, 'exercises.json'), serialized);
    await writeFile(path.join(cacheDir, 'metadata.json'), JSON.stringify({
      downloadedAt: '2026-07-15T00:00:00.000Z',
      sourceUrl: 'https://example.test/exercises.json',
      commit: 'cached-commit',
      sha256: createHash('sha256').update(serialized).digest('hex'),
      recordCount: 1,
      license: 'Unlicense',
      cacheFile: path.join(cacheDir, 'exercises.json'),
      cacheFallback: false
    }));

    const result = await loadFreeDb({ cacheDir, fetchImpl: async () => { throw new Error('offline'); } });
    assert.equal(result.exercises.length, 1);
    assert.equal(result.metadata.cacheFallback, true);
    assert.equal(result.metadata.commit, 'cached-commit');
  } finally {
    await rm(cacheDir, { recursive: true, force: true });
  }
});

test('loadFreeDb replaces an older cache when the upstream commit changes', async () => {
  const cacheDir = await mkdtemp(path.join(os.tmpdir(), 'musclemap-free-db-update-'));
  try {
    const oldData = '[]\n';
    await writeFile(path.join(cacheDir, 'exercises.json'), oldData);
    await writeFile(path.join(cacheDir, 'metadata.json'), JSON.stringify({
      downloadedAt: '2026-07-14T00:00:00.000Z', sourceUrl: 'old', commit: 'b'.repeat(40),
      sha256: createHash('sha256').update(oldData).digest('hex'), recordCount: 0, license: 'Unlicense',
      cacheFile: path.join(cacheDir, 'exercises.json'), cacheFallback: false
    }));
    const newData = [{ id: 'New', name: 'New', equipment: 'body only', primaryMuscles: [], secondaryMuscles: [], category: 'strength', force: null, mechanic: null, instructions: [], images: ['New/0.jpg', 'New/1.jpg'] }];
    const fetchImpl = async (input: string | URL | Request) => String(input).includes('/commits/')
      ? new Response(JSON.stringify({ sha: 'c'.repeat(40) }), { status: 200 })
      : new Response(JSON.stringify(newData), { status: 200 });

    const result = await loadFreeDb({ cacheDir, fetchImpl: fetchImpl as typeof fetch, now: () => new Date('2026-07-15T00:00:00.000Z') });
    assert.equal(result.metadata.commit, 'c'.repeat(40));
    assert.equal(result.metadata.cacheFallback, false);
    assert.equal(result.exercises[0].id, 'New');
  } finally {
    await rm(cacheDir, { recursive: true, force: true });
  }
});

test('buildMatchRecord and createSummary preserve one mutually exclusive tier per action', () => {
  const source = {
    id: 'Dumbbell_Bench_Press',
    name: 'Dumbbell Bench Press',
    equipment: 'dumbbell',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['triceps', 'shoulders'],
    category: 'strength',
    force: 'push',
    mechanic: 'compound',
    instructions: [],
    images: ['Dumbbell_Bench_Press/0.jpg', 'Dumbbell_Bench_Press/1.jpg']
  };
  const baseExercise = {
    exerciseId: 'dumbbell-bench-press',
    name: '哑铃卧推',
    nameEn: 'Dumbbell Bench Press',
    equipment: ['哑铃', '卧推凳'],
    primaryMuscles: ['pectoralis-major'],
    secondaryMuscles: ['triceps-brachii', 'anterior-deltoid'],
    category: 'strength',
    force: 'push',
    mechanic: 'compound',
    laterality: null,
    tags: [],
    sourceType: 'core',
    hasStartImage: false,
    hasPeakImage: false,
    mediaStatus: 'missing'
  } as const;
  const exact = buildMatchRecord(baseExercise, [source], 'a'.repeat(40), { accepted: {}, rejected: {}, forced: {} });
  const covered = buildMatchRecord({ ...baseExercise, exerciseId: 'covered', mediaStatus: 'complete', hasStartImage: true, hasPeakImage: true }, [source], 'a'.repeat(40), { accepted: {}, rejected: {}, forced: {} });
  const summary = createSummary([exact, covered], 873, { partialCount: 0, missingCount: 1 });

  assert.equal(exact.tier, 'exact');
  assert.equal(covered.tier, 'already-covered');
  assert.equal(summary.visibleExerciseCount, 2);
  assert.equal(summary.tiers.exact + summary.tiers.alreadyCovered + summary.tiers.highConfidence + summary.tiers.manualReview + summary.tiers.unmatched, 2);
});

test('rejected candidates cannot remain best but stay visible in the match record', () => {
  const project = reviewProject();
  const first = reviewSource('Preferred_Source', 'Dumbbell Bench Press');
  const second = reviewSource('Fallback_Source', 'Dumbbell Chest Press');
  const overrides = normalizeManualOverrides({ accepted: {}, rejected: { review: ['Preferred_Source'] }, forced: {} }).overrides;

  const record = buildMatchRecord(project, [first, second], 'a'.repeat(40), overrides);

  assert.equal(record.bestCandidate?.sourceId, 'Fallback_Source');
  assert.deepEqual(record.rejectedCandidates.map(({ sourceId }) => sourceId), ['Preferred_Source']);
  assert.equal(record.rejectedCandidates[0].humanRejected, true);
});

test('forced source overrides automatic ranking without pretending to be exact', () => {
  const project = reviewProject();
  const automatic = reviewSource('Automatic_Source', 'Dumbbell Bench Press');
  const forced = reviewSource('Forced_Source', 'Unusual Dumbbell Press');
  const overrides = normalizeManualOverrides({ accepted: {}, rejected: {}, forced: { review: 'Forced_Source' } }).overrides;

  const record = buildMatchRecord(project, [automatic, forced], 'a'.repeat(40), overrides);

  assert.equal(record.bestCandidate?.sourceId, 'Forced_Source');
  assert.equal(record.overrideStatus, 'forced');
  assert.equal(record.tier, 'manual-review');
  assert.match(record.tierReason, /forced/);
});

test('reuse and notes are carried into the generated match record', () => {
  const project = reviewProject();
  const source = reviewSource('Reuse_Source', 'Dumbbell Bench Press');
  const overrides = normalizeManualOverrides({
    version: 1,
    accepted: {}, rejected: {}, forced: {},
    reuse: { review: { baseExerciseId: 'base-review', sourceId: 'Reuse_Source', reason: 'same movement', differences: 'neutral grip' } },
    notes: { review: 'Check handle before integration.' }
  }).overrides;

  const record = buildMatchRecord(project, [source], 'a'.repeat(40), overrides);

  assert.equal(record.overrideStatus, 'reuse');
  assert.deepEqual(record.reuseDecision, overrides.reuse.review);
  assert.equal(record.note, 'Check handle before integration.');
  assert.match(record.tierReason, /基础动作图片/);
});

test('createMatchesCsv writes a UTF-8 BOM and required columns', () => {
  const csv = createMatchesCsv([]);
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.match(csv, /exerciseId,name,nameEn,mediaStatus,tier,confidence/);
  assert.match(csv, /startImageUrl,peakImageUrl/);
});

test('createReviewPage includes persistence, decisions, navigation, import, export, and shortcuts', () => {
  const source = reviewSource('Review_Source', 'Dumbbell Bench Press');
  const overrides = normalizeManualOverrides({ accepted: {}, rejected: {}, forced: {} }).overrides;
  const match = buildMatchRecord(reviewProject(), [source], 'a'.repeat(40), overrides);
  const html = createReviewPage([match], {
    visibleExerciseCount: 1,
    tiers: { alreadyCovered: 0, exact: 1, highConfidence: 0, manualReview: 0, unmatched: 0 },
    media: { complete: 0, partial: 0, missing: 1 }
  }, {
    downloadedAt: '2026-07-15T00:00:00.000Z', sourceUrl: 'https://example.test/exercises.json', commit: 'a'.repeat(40),
    sha256: 'b'.repeat(64), recordCount: 1, license: 'Unlicense', cacheFile: 'cache.json', cacheFallback: false
  }, overrides);

  assert.match(html, /musclemap-fitness:free-exercise-db-review:v0\.1/);
  assert.match(html, /接受此匹配/);
  assert.match(html, /拒绝此候选/);
  assert.match(html, /强制采用此候选/);
  assert.match(html, /标记为共图/);
  assert.match(html, /稍后处理/);
  assert.match(html, /下一条未审核/);
  assert.match(html, /返回第一条未审核/);
  assert.match(html, /baseExerciseId/);
  assert.match(html, /localStorage\.setItem/);
  assert.match(html, /manual-overrides\.json/);
  assert.match(html, /review-summary\.json/);
  assert.match(html, /导入已有 manual-overrides\.json/);
  assert.match(html, /完全覆盖/);
  assert.match(html, /event\.key\.toLowerCase\(\)/);
  assert.match(html, /exact.*high-confidence/s);
  assert.match(html, /const start=found>=0\?found:-1/);
  assert.match(html, /validateImportShape/);
  assert.match(html, /candidate\.accepted/);
  assert.match(html, /finalCandidateClass/);
});

test('createReviewPage emits syntactically valid client JavaScript', () => {
  const overrides = normalizeManualOverrides({ accepted: {}, rejected: {}, forced: {} }).overrides;
  const match = buildMatchRecord(reviewProject(), [reviewSource('Review_Source', 'Dumbbell Bench Press')], 'a'.repeat(40), overrides);
  const html = createReviewPage([match], {
    visibleExerciseCount: 1, tiers: { exact: 1 }, media: { complete: 0, partial: 0, missing: 1 }
  }, {
    downloadedAt: '2026-07-15T00:00:00.000Z', sourceUrl: 'source', commit: 'a'.repeat(40), sha256: 'b'.repeat(64),
    recordCount: 1, license: 'Unlicense', cacheFile: 'cache', cacheFallback: false
  }, overrides);
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];

  assert.doesNotThrow(() => new Function(scripts.at(-1)?.[1] ?? ''));
});

test('generated report applies all 117 human-accepted source ids without relying on automatic tiers', async () => {
  const root = process.cwd();
  const overrides = JSON.parse(await readFile(path.join(root, 'scripts', 'exercise-media', 'free-exercise-db', 'manual-overrides.json'), 'utf8'));
  const matches = JSON.parse(await readFile(path.join(root, 'reports', 'exercise-media', 'free-exercise-db', 'matches.json'), 'utf8'));
  const accepted = Object.entries(overrides.accepted as Record<string, string>);

  assert.equal(accepted.length, 117);
  for (const [exerciseId, sourceId] of accepted) {
    const match = matches.find((record: MatchRecord) => record.exercise.exerciseId === exerciseId) as MatchRecord | undefined;
    assert.equal(match?.overrideStatus, 'accepted', exerciseId);
    assert.equal(match?.bestCandidate?.sourceId, sourceId, exerciseId);
  }
});

test('createReuseGroups only groups compatible grip variants', () => {
  const record = (exerciseId: string, nameEn: string) => ({
    exercise: {
      exerciseId, name: exerciseId, nameEn, equipment: ['高位下拉器'], primaryMuscles: ['latissimus-dorsi'], secondaryMuscles: [],
      category: 'strength', force: 'pull', mechanic: 'compound', laterality: null, tags: [], sourceType: 'core',
      hasStartImage: false, hasPeakImage: false, mediaStatus: 'missing'
    },
    tier: 'manual-review', confidence: 0.8, tierReason: 'variant', bestCandidate: null, topCandidates: [], recommendedAction: 'review', appliedOverride: null
  } as const);
  const groups = createReuseGroups([
    record('wide-grip-lat-pulldown', 'Wide-grip Lat Pulldown'),
    record('narrow-grip-lat-pulldown', 'Narrow-grip Lat Pulldown'),
    record('single-arm-lat-pulldown', 'Single-arm Lat Pulldown')
  ]);

  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].exerciseIds.sort(), ['narrow-grip-lat-pulldown', 'wide-grip-lat-pulldown']);
  assert.equal(groups[0].recommendSharing, true);
});

function reviewProject() {
  return {
    exerciseId: 'review', name: '审核动作', nameEn: 'Dumbbell Bench Press', equipment: ['哑铃', '卧推凳'],
    primaryMuscles: ['pectoralis-major'], secondaryMuscles: ['triceps-brachii'], category: 'strength',
    force: 'push', mechanic: 'compound', laterality: null, tags: [], sourceType: 'core' as const,
    hasStartImage: false, hasPeakImage: false, mediaStatus: 'missing' as const
  };
}

function reviewSource(id: string, name: string) {
  return {
    id, name, equipment: 'dumbbell', primaryMuscles: ['chest'], secondaryMuscles: ['triceps'],
    category: 'strength', force: 'push', mechanic: 'compound', instructions: [], images: [`${id}/0.jpg`, `${id}/1.jpg`]
  };
}
