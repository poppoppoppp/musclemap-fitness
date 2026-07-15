import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildManualReviewPageModel,
  createManualReviewPageHtml,
  materializeManualReviewAssets
} from './manualReviewPage.ts';
import { buildManualReviewProposal, type ManualReviewTriageProgress } from './manualReviewTriage.ts';
import type { ManualOverrides, MatchRecord } from './types.ts';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..', '..', '..');
const reportDirectory = path.join(projectRoot, 'reports', 'exercise-media', 'free-exercise-db');
const progressPath = path.join(reportDirectory, 'manual-review-triage-progress.json');
const matchesPath = path.join(reportDirectory, 'matches.json');
const overridesPath = path.join(scriptDirectory, 'manual-overrides.json');
const proposalPath = path.join(reportDirectory, 'manual-review-proposal.json');
const pagePath = path.join(reportDirectory, 'manual-review-final-check.html');
const assetsRoot = path.join(reportDirectory, 'manual-review-assets');
const assetsManifestPath = path.join(reportDirectory, 'manual-review-assets-manifest.json');
const cacheRoot = 'D:\\AI\\FreeExerciseDB-cache\\manual-review';

const overridesBefore = await readFile(overridesPath, 'utf8');
const publicSnapshotBefore = await snapshotDirectory(path.join(projectRoot, 'public', 'exercise-media'));
const [matches, progress, overrides] = await Promise.all([
  readJson<MatchRecord[]>(matchesPath),
  readJson<ManualReviewTriageProgress>(progressPath),
  readJson<ManualOverrides>(overridesPath)
]);
const model = buildManualReviewPageModel(matches, progress, overrides);
if (model.total !== progress.sourceManualReviewCount) throw new Error(`页面范围 ${model.total} 与进度范围 ${progress.sourceManualReviewCount} 不一致`);
if (model.codexProposedCount !== progress.processedExerciseIds.length) throw new Error(`页面提案 ${model.codexProposedCount} 与进度记录 ${progress.processedExerciseIds.length} 不一致`);
const proposal = buildManualReviewProposal(progress);
const contactSheets = (await readdir(path.join(reportDirectory, 'manual-review-contact-sheets'))).filter((file) => /^batch-\d+\.webp$/i.test(file)).sort().map((file) => `manual-review-contact-sheets/${file}`);
const assetsManifest = await materializeManualReviewAssets(model.records, cacheRoot, assetsRoot);
await Promise.all([
  writeJsonAtomically(proposalPath, proposal),
  writeJsonAtomically(assetsManifestPath, assetsManifest),
  writeTextAtomically(pagePath, createManualReviewPageHtml(model, contactSheets))
]);
const overridesAfter = await readFile(overridesPath, 'utf8');
if (overridesAfter !== overridesBefore) throw new Error('正式 manual-overrides.json 发生变化');
const publicSnapshotAfter = await snapshotDirectory(path.join(projectRoot, 'public', 'exercise-media'));
if (JSON.stringify(publicSnapshotAfter) !== JSON.stringify(publicSnapshotBefore)) throw new Error('public/exercise-media 发生变化');

console.log('Free Exercise DB 人工审核页整理 V0.3');
console.log(`manual-review: ${model.total}`);
console.log(`Codex 已提案 / 尚未复核: ${model.codexProposedCount} / ${model.unreviewedByCodexCount}`);
console.log(`正式 accepted 基线: ${Object.keys(model.formalOverrides.accepted).length}`);
console.log(`本地唯一候选源 / 图片: ${assetsManifest.uniqueSourceCount} / ${assetsManifest.imageCount}`);
console.log(`资产方式 / 额外空间: ${assetsManifest.mode} / ${assetsManifest.additionalBytes} bytes`);
console.log(`联系表: ${contactSheets.length}`);
console.log(`页面: ${path.relative(projectRoot, pagePath)}`);

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, 'utf8')) as T;
}

async function writeJsonAtomically(file: string, value: unknown) {
  return writeTextAtomically(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeTextAtomically(file: string, value: string) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${randomUUID()}`;
  await writeFile(temporary, value, 'utf8');
  await rename(temporary, file);
}

async function snapshotDirectory(directory: string) {
  const files: Array<{ path: string; bytes: number; modified: number }> = [];
  async function walk(current: string) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const file = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(file);
      else {
        const metadata = await stat(file);
        files.push({ path: path.relative(directory, file), bytes: metadata.size, modified: metadata.mtimeMs });
      }
    }
  }
  await walk(directory);
  return files.sort((left, right) => left.path.localeCompare(right.path));
}
