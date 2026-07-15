import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  expandManualReviewDecision,
  mergeTriageBatch,
  partitionManualReview,
  selectManualReviewRecords,
  type ManualReviewDecisionInput,
  type ManualReviewTriageProgress
} from './manualReviewTriage.ts';
import type { ManualOverrides, MatchRecord } from './types.ts';

const inputFile = process.argv[2];
if (!inputFile) throw new Error('用法: npx tsx recordManualReviewBatch.mts <batch-decisions.json>');
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..', '..', '..');
const reportDirectory = path.join(projectRoot, 'reports', 'exercise-media', 'free-exercise-db');
const progressPath = path.join(reportDirectory, 'manual-review-triage-progress.json');
const [matches, overrides, sourceSummary, progress, input] = await Promise.all([
  readJson<MatchRecord[]>(path.join(reportDirectory, 'matches.json')),
  readJson<ManualOverrides>(path.join(scriptDirectory, 'manual-overrides.json')),
  readJson<{ source: { commit: string } }>(path.join(reportDirectory, 'summary.json')),
  readJson<ManualReviewTriageProgress>(progressPath),
  readJson<{ batchNumber: number; decisions: ManualReviewDecisionInput[] }>(path.resolve(inputFile))
]);
const scope = selectManualReviewRecords(matches, overrides).records;
const batch = partitionManualReview(scope, progress.batchSize)[input.batchNumber - 1];
if (!batch) throw new Error(`批次不存在: ${input.batchNumber}`);
const expectedIds = batch.map(({ exercise }) => exercise.exerciseId).sort();
const actualIds = input.decisions.map(({ exerciseId }) => exerciseId).sort();
if (JSON.stringify(expectedIds) !== JSON.stringify(actualIds)) throw new Error(`批次 ${input.batchNumber} exerciseId 不完整或越界`);
const byId = new Map(batch.map((item) => [item.exercise.exerciseId, item]));
const contactSheetPath = `manual-review-contact-sheets/batch-${String(input.batchNumber).padStart(2, '0')}.webp`;
const updatedAt = new Date().toISOString();
const expanded = input.decisions.map((decision) => expandManualReviewDecision(byId.get(decision.exerciseId)!, decision, input.batchNumber, contactSheetPath, updatedAt));
const next = mergeTriageBatch(progress, scope, expanded, input.batchNumber, sourceSummary.source.commit, progress.batchSize);
await writeJsonAtomically(progressPath, next);
console.log(`已保存批次 ${input.batchNumber}: ${expanded.length} 条；总进度 ${next.processedExerciseIds.length}/${next.sourceManualReviewCount}`);

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, 'utf8')) as T;
}

async function writeJsonAtomically(file: string, value: unknown) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${randomUUID()}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporary, file);
}
