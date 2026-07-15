import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import sharp from 'sharp';

import {
  buildManualReviewProposal,
  buildManualReviewTriageSummary,
  createManualReviewContactSheet,
  createManualReviewCurlRunner,
  createManualReviewFinalCheckPage,
  expandManualReviewDecision,
  mergeTriageBatch,
  partitionManualReview,
  recoverManualReviewCacheEntry,
  seedManualReviewCacheFromMirror,
  selectManualReviewRecords,
  validateCandidateImageUrls,
  validateTriageRecord,
  type ManualReviewTriageRecord
} from './manualReviewTriage.ts';
import type { ManualOverrides, MatchRecord } from './types.ts';

const overrides: ManualOverrides = {
  version: 1,
  updatedAt: null,
  accepted: { accepted: 'Accepted_Source' },
  forced: { forced: 'Forced_Source' },
  reuse: { reuse: { baseExerciseId: 'base', sourceId: 'Reuse_Source', reason: 'same', differences: 'grip' } },
  rejected: {},
  notes: {}
};

test('selectManualReviewRecords only returns uncovered visible manual-review records without final decisions', () => {
  const matches = [
    match('eligible'),
    match('accepted'),
    match('forced'),
    match('reuse'),
    match('covered', 'manual-review', 'complete'),
    match('exact', 'exact'),
    match('unmatched', 'unmatched')
  ];

  const result = selectManualReviewRecords(matches, overrides);

  assert.deepEqual(result.records.map(({ exercise }) => exercise.exerciseId), ['eligible']);
  assert.deepEqual(result.excluded, {
    finalDecision: 3,
    completeMedia: 1,
    otherTier: 2
  });
});

test('partitionManualReview keeps deterministic batches of at most eight records', () => {
  const batches = partitionManualReview(Array.from({ length: 18 }, (_, index) => match(`exercise-${String(index).padStart(2, '0')}`)), 8);
  assert.deepEqual(batches.map((batch) => batch.length), [8, 8, 2]);
  assert.equal(batches[0][0].exercise.exerciseId, 'exercise-00');
  assert.equal(batches[2][1].exercise.exerciseId, 'exercise-17');
});

test('validateCandidateImageUrls requires the report commit and exact start/peak source paths', () => {
  const item = match('eligible');
  assert.doesNotThrow(() => validateCandidateImageUrls(item.topCandidates[0], 'commit'));
  const floating = structuredClone(item.topCandidates[0]);
  floating.startImageUrl = floating.startImageUrl?.replace('/commit/', '/main/') ?? null;
  assert.throws(() => validateCandidateImageUrls(floating, 'commit'), /固定 commit/);
  const swapped = structuredClone(item.topCandidates[0]);
  swapped.peakImageUrl = swapped.startImageUrl;
  assert.throws(() => validateCandidateImageUrls(swapped, 'commit'), /1\.jpg/);
});

test('createManualReviewCurlRunner gives slow review images a bounded 120 second transfer window', async () => {
  let received: string[] = [];
  const runner = createManualReviewCurlRunner(((file: string, args: string[], options: unknown, callback: (error: Error | null, stdout: Buffer) => void) => {
    assert.equal(file, 'curl.exe');
    received = args;
    callback(null, Buffer.from('image'));
  }) as never);
  assert.equal((await runner('https://example.test/image.jpg')).toString(), 'image');
  assert.deepEqual(received.slice(received.indexOf('--max-time'), received.indexOf('--max-time') + 2), ['--max-time', '120']);
});

test('recoverManualReviewCacheEntry validates an orphaned image before allowing offline reuse', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'manual-review-recover-'));
  const valid = path.join(directory, 'valid.jpg');
  await sharp({ create: { width: 200, height: 160, channels: 3, background: '#ccc' } }).jpeg().toFile(valid);
  const recovered = await recoverManualReviewCacheEntry(valid, 'https://example.test/valid.jpg');
  assert.equal(recovered.format, 'jpeg');
  assert.equal(recovered.width, 200);
  assert.equal(recovered.height, 160);
  assert.match(recovered.sha256, /^[a-f0-9]{64}$/);

  const invalid = path.join(directory, 'invalid.jpg');
  await writeFile(invalid, '<html>error</html>');
  await assert.rejects(() => recoverManualReviewCacheEntry(invalid, 'https://example.test/invalid.jpg'));
});

test('seedManualReviewCacheFromMirror validates then atomically creates the review cache file', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'manual-review-seed-'));
  const source = path.join(directory, 'source.jpg');
  const target = path.join(directory, 'nested', 'target.jpg');
  await sharp({ create: { width: 240, height: 180, channels: 3, background: '#aca' } }).jpeg().toFile(source);
  const seeded = await seedManualReviewCacheFromMirror(source, target, 'https://example.test/source.jpg');
  assert.equal(seeded.width, 240);
  assert.equal(seeded.height, 180);
  await access(target);

  const invalid = path.join(directory, 'invalid.jpg');
  const invalidTarget = path.join(directory, 'nested', 'invalid-target.jpg');
  await writeFile(invalid, '<html>error</html>');
  await assert.rejects(() => seedManualReviewCacheFromMirror(invalid, invalidTarget, 'https://example.test/invalid.jpg'));
  await assert.rejects(() => access(invalidTarget));
});

test('validateTriageRecord forbids metadata-only acceptance and hard-conflict acceptance', () => {
  const item = match('eligible');
  assert.throws(() => validateTriageRecord(item, decision({ reviewerMode: 'metadata-only' })), /metadata-only/);
  assert.throws(() => validateTriageRecord(item, decision(), { hardConflictSourceIds: new Set(['Source_A']) }), /硬冲突/);
  assert.doesNotThrow(() => validateTriageRecord(item, decision({ decision: 'proposed-forced', risks: ['算法 laterality 冲突为误报，图片明确展示 alternating'] }), { hardConflictSourceIds: new Set(['Source_A']) }));
  assert.doesNotThrow(() => validateTriageRecord(item, decision({ decision: 'unresolved', reviewerMode: 'unresolved', sourceId: null })));
});

test('expandManualReviewDecision adds candidate metadata, alternatives, rejection ids, and batch audit fields', () => {
  const item = match('eligible');
  const record = expandManualReviewDecision(item, {
    exerciseId: 'eligible', decision: 'proposed-rejected', sourceId: null,
    visualEvidence: ['三组候选均已查看'], differences: ['姿态不一致'], risks: ['会误导训练者']
  }, 4, 'manual-review-contact-sheets/batch-04.webp', '2026-07-15T00:00:00.000Z');
  assert.equal(record.batchNumber, 4);
  assert.equal(record.reviewerMode, 'codex-visual-review');
  assert.deepEqual(record.rejectedSourceIds, ['Source_A']);
  assert.ok(record.metadataEvidence.length > 0);
  assert.equal(record.contactSheetPath, 'manual-review-contact-sheets/batch-04.webp');
});

test('mergeTriageBatch resumes existing progress and rejects duplicate or out-of-scope decisions', () => {
  const scope = [match('a'), match('b')];
  const first = mergeTriageBatch(null, scope, [decision({ exerciseId: 'a' })], 1, 'commit');
  const resumed = mergeTriageBatch(first, scope, [decision({ exerciseId: 'b', decision: 'proposed-rejected', sourceId: null })], 2, 'commit');
  assert.deepEqual(Object.keys(resumed.records).sort(), ['a', 'b']);
  assert.equal(resumed.records.a.batchNumber, 1);
  assert.throws(() => mergeTriageBatch(resumed, scope, [decision({ exerciseId: 'a' })], 3, 'commit'), /已存在/);
  assert.throws(() => mergeTriageBatch(resumed, scope, [decision({ exerciseId: 'outside' })], 3, 'commit'), /处理范围/);
});

test('buildManualReviewProposal places every processed record in exactly one advisory bucket', () => {
  const scope = ['a', 'b', 'c', 'd', 'e'].map((id) => match(id));
  const progress = mergeTriageBatch(null, scope, [
    decision({ exerciseId: 'a', decision: 'proposed-accepted' }),
    decision({ exerciseId: 'b', decision: 'proposed-forced' }),
    decision({ exerciseId: 'c', decision: 'proposed-reuse', baseExerciseId: 'a' }),
    decision({ exerciseId: 'd', decision: 'proposed-rejected', sourceId: null }),
    decision({ exerciseId: 'e', decision: 'unresolved', reviewerMode: 'unresolved', sourceId: null })
  ], 1, 'commit');

  const proposal = buildManualReviewProposal(progress);

  assert.equal(proposal.processedCount, 5);
  assert.deepEqual([
    Object.keys(proposal.proposedAccepted).length,
    Object.keys(proposal.proposedForced).length,
    Object.keys(proposal.proposedReuse).length,
    Object.keys(proposal.proposedRejected).length,
    Object.keys(proposal.unresolved).length
  ], [1, 1, 1, 1, 1]);
});

test('buildManualReviewTriageSummary reports advisory coverage and remaining user review count', () => {
  const scope = ['a', 'b', 'c'].map((id) => match(id));
  const progress = mergeTriageBatch(null, scope, [
    decision({ exerciseId: 'a', decision: 'proposed-accepted' }),
    decision({ exerciseId: 'b', decision: 'proposed-reuse', baseExerciseId: 'a' }),
    decision({ exerciseId: 'c', decision: 'unresolved', reviewerMode: 'unresolved', sourceId: null, risks: ['需要用户判断'] })
  ], 1, 'commit');
  const summary = buildManualReviewTriageSummary(buildManualReviewProposal(progress), ['sheet-01.webp']);
  assert.equal(summary.estimatedNewMediaExercises, 1);
  assert.equal(summary.estimatedReuseExercises, 1);
  assert.equal(summary.requiresUserReview, 3);
  assert.deepEqual(summary.contactSheets, ['sheet-01.webp']);
});

test('createManualReviewContactSheet writes a readable image with both stages for every candidate', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'manual-review-sheet-'));
  const start = path.join(directory, 'start.jpg');
  const peak = path.join(directory, 'peak.jpg');
  await Promise.all([
    sharp({ create: { width: 320, height: 240, channels: 3, background: '#d66' } }).jpeg().toFile(start),
    sharp({ create: { width: 320, height: 240, channels: 3, background: '#66d' } }).jpeg().toFile(peak)
  ]);
  const output = path.join(directory, 'sheet.webp');

  await createManualReviewContactSheet(output, [{
    match: match('eligible'),
    candidates: [{ candidate: match('eligible').topCandidates[0], startFile: start, peakFile: peak }]
  }], 1);

  const metadata = await sharp(output).metadata();
  assert.equal(metadata.format, 'webp');
  assert.ok((metadata.width ?? 0) >= 1600);
  assert.ok((metadata.height ?? 0) >= 900);
  assert.ok((await stat(output)).size > 1000);
});

test('createManualReviewFinalCheckPage keeps proposals advisory and exposes review/export controls', () => {
  const progress = mergeTriageBatch(null, [match('a')], [decision({ exerciseId: 'a' })], 1, 'commit');
  const html = createManualReviewFinalCheckPage(buildManualReviewProposal(progress), [match('a')], {});
  assert.match(html, /manual-review-final-check/);
  assert.match(html, /确认建议/);
  assert.match(html, /改为拒绝/);
  assert.match(html, /标记 unresolved/);
  assert.match(html, /导出审核结果/);
  assert.doesNotMatch(html, /manual-overrides\.json[^<]*自动/);
});

function match(exerciseId: string, tier: MatchRecord['tier'] = 'manual-review', mediaStatus: MatchRecord['exercise']['mediaStatus'] = 'missing'): MatchRecord {
  const candidate = {
    sourceId: 'Source_A', sourceName: 'Source A', sourceEquipment: 'dumbbell', sourcePrimaryMuscles: ['chest'], sourceSecondaryMuscles: [],
    sourceCategory: 'strength', sourceForce: 'push', sourceMechanic: 'compound', imageCount: 2,
    startImageUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/commit/exercises/Source_A/0.jpg',
    peakImageUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/commit/exercises/Source_A/1.jpg', humanRejected: false,
    score: { nameScore: 0.8, equipmentScore: 1, primaryMuscleScore: 1, secondaryMuscleScore: 0.5, attributeScore: 1, conflictPenalty: 0, finalConfidence: 0.85, matchedAlias: null, keyMatches: ['器械一致'], keyDifferences: [], conflicts: [] }
  };
  return {
    exercise: { exerciseId, name: exerciseId, nameEn: exerciseId, equipment: ['哑铃'], primaryMuscles: ['pectoralis-major'], secondaryMuscles: [], category: 'strength', force: 'push', mechanic: 'compound', laterality: null, tags: [], sourceType: 'core', hasStartImage: mediaStatus === 'complete', hasPeakImage: mediaStatus === 'complete', mediaStatus },
    tier, confidence: 0.85, tierReason: 'review', bestCandidate: candidate, topCandidates: [candidate], rejectedCandidates: [], recommendedAction: 'review', appliedOverride: null, overrideStatus: null, reuseDecision: null, note: null
  };
}

function decision(overrides: Partial<ManualReviewTriageRecord> = {}): ManualReviewTriageRecord {
  return {
    exerciseId: 'eligible', sourceId: 'Source_A', decision: 'proposed-accepted', confidence: 0.85,
    visualEvidence: ['start 与 peak 可辨认', '器械和姿态一致'], metadataEvidence: ['名称和器械一致'], differences: [], risks: [], alternativeCandidates: [],
    reviewerMode: 'codex-visual-review', contactSheetPath: 'manual-review-contact-sheets/batch-01.webp', batchNumber: 1,
    updatedAt: '2026-07-15T00:00:00.000Z', baseExerciseId: null, rejectedSourceIds: [],
    ...overrides
  };
}
