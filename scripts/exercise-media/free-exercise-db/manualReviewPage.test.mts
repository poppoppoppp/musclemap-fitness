import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  LOCAL_STORAGE_KEY,
  buildManualReviewPageModel,
  createManualReviewPageHtml,
  materializeManualReviewAssets,
  mergeManualReviewExport,
  type ManualReviewUserState
} from './manualReviewPage.ts';
import type { ManualReviewTriageProgress, ManualReviewTriageRecord } from './manualReviewTriage.ts';
import type { ManualOverrides, MatchRecord } from './types.ts';

test('buildManualReviewPageModel includes the full scope, preserves advisory proposals, and sorts 72 before 70', () => {
  const matches = [match('unreviewed', 0.9), match('proposed-low', 0.5), match('proposed-high', 0.8)];
  const progress = triageProgress(matches.length, {
    'proposed-low': proposal('proposed-low', 'Source_proposed-low'),
    'proposed-high': proposal('proposed-high', 'Source_proposed-high')
  });

  const model = buildManualReviewPageModel(matches, progress, baseOverrides());

  assert.equal(model.records.length, 3);
  assert.equal(model.codexProposedCount, 2);
  assert.equal(model.unreviewedByCodexCount, 1);
  assert.deepEqual(model.records.map(({ exerciseId }) => exerciseId), ['proposed-high', 'proposed-low', 'unreviewed']);
  assert.equal(model.records[0].defaultSourceId, 'Source_proposed-high');
  assert.equal(model.records[2].defaultSourceId, 'Source_unreviewed');
  assert.equal(model.formalOverrides.accepted.existing, 'Existing_Source');
});

test('mergeManualReviewExport preserves the formal base, enforces final-decision exclusivity, and omits skipped', () => {
  const state: ManualReviewUserState = {
    accepted: { newAccepted: 'A' },
    forced: { newForced: 'F', newAccepted: 'stale' },
    reuse: { newReuse: { baseExerciseId: 'existing', sourceId: 'R', reason: 'same', differences: 'grip' }, newForced: { baseExerciseId: 'existing', sourceId: 'stale', reason: '', differences: '' } },
    rejected: { rejected: ['Bad_1'] },
    notes: { newAccepted: 'checked' },
    skipped: ['skipped'],
    filters: {},
    currentExerciseId: 'newAccepted',
    updatedAt: null
  };

  const merged = mergeManualReviewExport(baseOverrides(), state);

  assert.equal(merged.accepted.existing, 'Existing_Source');
  assert.equal(merged.accepted.newAccepted, 'A');
  assert.equal(merged.forced.newAccepted, undefined);
  assert.equal(merged.forced.newForced, 'F');
  assert.equal(merged.reuse.newForced, undefined);
  assert.equal(merged.reuse.newReuse.sourceId, 'R');
  assert.equal('skipped' in merged.accepted || 'skipped' in merged.forced || 'skipped' in merged.reuse, false);
  assert.deepEqual(merged.rejected.rejected, ['Bad_1']);
});

test('materializeManualReviewAssets creates one local pair per unique source without changing bytes', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'manual-review-assets-'));
  const cacheRoot = path.join(root, 'cache');
  const outputRoot = path.join(root, 'assets');
  const sourceDirectory = path.join(cacheRoot, 'exercise-a', 'Shared_Source');
  await mkdir(sourceDirectory, { recursive: true });
  await writeFile(path.join(sourceDirectory, '0.jpg'), Buffer.from('start-image'));
  await writeFile(path.join(sourceDirectory, '1.jpg'), Buffer.from('peak-image'));
  const model = buildManualReviewPageModel([match('exercise-a', 0.8, 'Shared_Source'), match('exercise-b', 0.7, 'Shared_Source')], triageProgress(2, {}), baseOverrides());

  const manifest = await materializeManualReviewAssets(model.records, cacheRoot, outputRoot);

  assert.equal(manifest.uniqueSourceCount, 1);
  assert.equal(manifest.imageCount, 2);
  assert.ok(['hard-link', 'copy', 'mixed'].includes(manifest.mode));
  for (const stage of ['0.jpg', '1.jpg']) {
    const source = await readFile(path.join(sourceDirectory, stage));
    const output = await readFile(path.join(outputRoot, 'Shared_Source', stage));
    assert.equal(sha(source), sha(output));
    assert.ok((await stat(path.join(outputRoot, 'Shared_Source', stage))).size > 0);
  }
});

test('createManualReviewPageHtml uses local assets and keeps proposals separate from explicit user state', () => {
  const model = buildManualReviewPageModel([match('proposed', 0.8), match('unreviewed', 0.7)], triageProgress(2, { proposed: proposal('proposed', 'Source_proposed') }), baseOverrides());
  const html = createManualReviewPageHtml(model, ['manual-review-contact-sheets/batch-01.webp']);

  assert.match(html, new RegExp(LOCAL_STORAGE_KEY.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(html, /manual-review-assets\/Source_proposed\/0\.jpg/);
  assert.doesNotMatch(html, /raw\.githubusercontent\.com/);
  for (const label of ['接受当前候选', '拒绝当前候选', '强制采用当前候选', '标记共图', '暂时跳过', '确认Codex建议', '导出 manual-overrides.json', '导出 manual-review-session.json']) assert.match(html, new RegExp(label));
  assert.match(html, /Codex已复核，仅供参考/);
  assert.match(html, /尚未由Codex复核，请用户自行判断/);
  assert.match(html, /const state=loadState\(\)/);
  assert.doesNotMatch(html, /state\.accepted\s*=\s*payload\.proposal/);

  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
  assert.equal(scripts.length, 1);
  assert.doesNotThrow(() => new Function(scripts[0]));
});

test('PowerShell launcher quotes the server path that contains spaces', async () => {
  const script = await readFile(new URL('./startManualReviewServer.ps1', import.meta.url), 'utf8');
  assert.match(script, /\$QuotedServerScript\s*=\s*'"'\s*\+\s*\$ServerScript\s*\+\s*'"'/);
  assert.match(script, /-ArgumentList\s+@\(\$QuotedServerScript\)/);
});

function match(exerciseId: string, confidence: number, sourceId = `Source_${exerciseId}`): MatchRecord {
  const candidate = {
    sourceId, sourceName: sourceId, sourceEquipment: 'dumbbell', sourcePrimaryMuscles: ['chest'], sourceSecondaryMuscles: ['triceps'], sourceCategory: 'strength', sourceForce: 'push', sourceMechanic: 'compound', imageCount: 2,
    startImageUrl: `https://raw.githubusercontent.com/repo/commit/${sourceId}/0.jpg`, peakImageUrl: `https://raw.githubusercontent.com/repo/commit/${sourceId}/1.jpg`, humanRejected: false,
    score: { nameScore: confidence, equipmentScore: 1, primaryMuscleScore: 1, secondaryMuscleScore: 0.5, attributeScore: 1, conflictPenalty: 0, finalConfidence: confidence, matchedAlias: null, keyMatches: ['器械一致'], keyDifferences: [], conflicts: [] }
  };
  return {
    exercise: { exerciseId, name: exerciseId, nameEn: exerciseId, equipment: ['哑铃'], primaryMuscles: ['pectoralis-major'], secondaryMuscles: ['triceps-brachii'], category: 'strength', force: 'push', mechanic: 'compound', laterality: null, tags: [], sourceType: 'core', hasStartImage: false, hasPeakImage: false, mediaStatus: 'missing' },
    tier: 'manual-review', confidence, tierReason: 'review', bestCandidate: candidate, topCandidates: [candidate], rejectedCandidates: [], recommendedAction: 'review', appliedOverride: null, overrideStatus: null, reuseDecision: null, note: null
  };
}

function proposal(exerciseId: string, sourceId: string): ManualReviewTriageRecord {
  return { exerciseId, sourceId, decision: 'proposed-accepted', confidence: 0.8, visualEvidence: ['reviewed'], metadataEvidence: ['matched'], differences: [], risks: [], alternativeCandidates: [], reviewerMode: 'codex-visual-review', contactSheetPath: 'manual-review-contact-sheets/batch-01.webp', batchNumber: 1, updatedAt: '2026-07-15T00:00:00.000Z', baseExerciseId: null, rejectedSourceIds: [] };
}

function triageProgress(count: number, records: Record<string, ManualReviewTriageRecord>): ManualReviewTriageProgress {
  return { version: 1, sourceManualReviewCount: count, sourceCommit: 'commit', batchSize: 8, processedExerciseIds: Object.keys(records), records, updatedAt: '2026-07-15T00:00:00.000Z', currentBatchNumber: 1 };
}

function baseOverrides(): ManualOverrides {
  return { version: 1, updatedAt: null, accepted: { existing: 'Existing_Source' }, forced: {}, reuse: {}, rejected: {}, notes: {} };
}

function sha(value: Buffer) {
  return createHash('sha256').update(value).digest('hex');
}
