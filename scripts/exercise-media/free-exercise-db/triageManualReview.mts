import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createCurlFetch, ensureCachedImage, type CachedImageRecord } from './acceptedMedia.ts';
import {
  buildManualReviewProposal,
  buildManualReviewTriageSummary,
  createManualReviewContactSheet,
  createManualReviewCurlRunner,
  createManualReviewFinalCheckPage,
  partitionManualReview,
  recoverManualReviewCacheEntry,
  seedManualReviewCacheFromMirror,
  selectManualReviewRecords,
  validateCandidateImageUrls,
  type ManualReviewTriageProgress,
  type PreparedContactSheetExercise
} from './manualReviewTriage.ts';
import type { ManualOverrides, MatchRecord } from './types.ts';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..', '..', '..');
const reportDirectory = path.join(projectRoot, 'reports', 'exercise-media', 'free-exercise-db');
const contactSheetDirectory = path.join(reportDirectory, 'manual-review-contact-sheets');
const cacheRoot = 'D:\\AI\\FreeExerciseDB-cache\\manual-review';
const cacheManifestPath = path.join(cacheRoot, 'cache-manifest.json');
const progressPath = path.join(reportDirectory, 'manual-review-triage-progress.json');
const proposalPath = path.join(reportDirectory, 'manual-review-proposal.json');
const summaryJsonPath = path.join(reportDirectory, 'manual-review-triage-summary.json');
const summaryMarkdownPath = path.join(reportDirectory, 'manual-review-triage-summary.md');
const finalCheckPath = path.join(reportDirectory, 'manual-review-final-check.html');
const batchSize = 8;

interface ReviewCacheManifest {
  version: 1;
  updatedAt: string;
  commit: string;
  images: Record<string, Omit<CachedImageRecord, 'status'>>;
}

const [matches, overrides, summarySource] = await Promise.all([
  readJson<MatchRecord[]>(path.join(reportDirectory, 'matches.json')),
  readJson<ManualOverrides>(path.join(scriptDirectory, 'manual-overrides.json')),
  readJson<{ source: { commit: string } }>(path.join(reportDirectory, 'summary.json'))
]);
const sourceCommit = summarySource.source.commit;
const extractedSourceRoot = path.join('D:\\AI\\FreeExerciseDB-cache', `source-${sourceCommit}`, `free-exercise-db-${sourceCommit}`, 'exercises');
const { records: scope, excluded } = selectManualReviewRecords(matches, overrides);
if (!scope.length) throw new Error('当前没有符合条件的 manual-review 记录');
const acceptedSnapshot = JSON.stringify(overrides.accepted);
const formalMediaSnapshot = await snapshotFormalMedia(projectRoot, matches);
const batches = partitionManualReview(scope, batchSize);
const cacheManifest = await loadCacheManifest(sourceCommit);
const fetchImpl = createCurlFetch(createManualReviewCurlRunner());
const contactSheets: string[] = [];

await mkdir(contactSheetDirectory, { recursive: true });
for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
  const batchNumber = batchIndex + 1;
  const prepared: PreparedContactSheetExercise[] = [];
  for (const item of batches[batchIndex]) {
    const candidates = item.topCandidates.slice(0, 3);
    const preparedCandidates: PreparedContactSheetExercise['candidates'] = [];
    for (const candidate of candidates) {
      const urls = validateCandidateImageUrls(candidate, sourceCommit);
      const candidateDirectory = path.join(cacheRoot, item.exercise.exerciseId, candidate.sourceId);
      const startFile = path.join(candidateDirectory, '0.jpg');
      const peakFile = path.join(candidateDirectory, '1.jpg');
      const stages = [
        { index: 0, url: urls.startImageUrl, file: startFile },
        { index: 1, url: urls.peakImageUrl, file: peakFile }
      ];
      for (const stage of stages) {
        const key = `${item.exercise.exerciseId}/${candidate.sourceId}/${stage.index}.jpg`;
        if (!cacheManifest.images[key]) {
          const recovered = await recoverManualReviewCacheEntry(stage.file, stage.url).catch(() => null);
          if (recovered) cacheManifest.images[key] = recovered;
          else {
            const mirrorFile = path.join(extractedSourceRoot, candidate.sourceId, `${stage.index}.jpg`);
            const seeded = await seedManualReviewCacheFromMirror(mirrorFile, stage.file, stage.url).catch(() => null);
            if (seeded) cacheManifest.images[key] = seeded;
          }
        }
        const cached = await ensureCachedImage({
          sourceUrl: stage.url,
          cacheFile: stage.file,
          known: cacheManifest.images[key],
          fetchImpl,
          retries: 3,
          requestTimeoutMs: 150000
        });
        cacheManifest.images[key] = stripStatus(cached);
        cacheManifest.updatedAt = new Date().toISOString();
        await writeJsonAtomically(cacheManifestPath, cacheManifest);
      }
      preparedCandidates.push({ candidate, startFile, peakFile });
    }
    prepared.push({ match: item, candidates: preparedCandidates });
  }
  cacheManifest.updatedAt = new Date().toISOString();
  await writeJsonAtomically(cacheManifestPath, cacheManifest);
  const fileName = `batch-${String(batchNumber).padStart(2, '0')}.webp`;
  const outputFile = path.join(contactSheetDirectory, fileName);
  await createManualReviewContactSheet(outputFile, prepared, batchNumber);
  contactSheets.push(`manual-review-contact-sheets/${fileName}`);
  console.log(`批次 ${batchNumber}/${batches.length}: ${prepared.length} 个动作，联系表 ${fileName}`);
}

let progress = await readJsonIfExists<ManualReviewTriageProgress>(progressPath);
if (!progress) {
  progress = {
    version: 1,
    sourceManualReviewCount: scope.length,
    sourceCommit,
    batchSize,
    processedExerciseIds: [],
    records: {},
    updatedAt: new Date().toISOString(),
    currentBatchNumber: 0
  };
  await writeJsonAtomically(progressPath, progress);
} else if (progress.sourceManualReviewCount !== scope.length || progress.sourceCommit !== sourceCommit) {
  throw new Error('现有进度文件与当前 manual-review 范围或 source commit 不一致');
}

const proposal = buildManualReviewProposal(progress);
const triageSummary = buildManualReviewTriageSummary(proposal, contactSheets);
const imageDataUrls = await selectedImageDataUrls(proposal);
await Promise.all([
  writeJsonAtomically(proposalPath, proposal),
  writeJsonAtomically(summaryJsonPath, triageSummary),
  writeTextAtomically(summaryMarkdownPath, summaryMarkdown(triageSummary)),
  writeTextAtomically(finalCheckPath, createManualReviewFinalCheckPage(proposal, scope, imageDataUrls))
]);

const overridesAfter = await readJson<ManualOverrides>(path.join(scriptDirectory, 'manual-overrides.json'));
if (JSON.stringify(overridesAfter.accepted) !== acceptedSnapshot) throw new Error('正式 accepted 决定发生变化，已停止');
const formalMediaAfter = await snapshotFormalMedia(projectRoot, matches);
if (JSON.stringify(formalMediaAfter) !== JSON.stringify(formalMediaSnapshot)) throw new Error('正式 App 媒体发生变化，已停止');

console.log('Free Exercise DB manual-review 人工复核辅助 V0.2');
console.log(`报告 manual-review: ${matches.filter(({ tier }) => tier === 'manual-review').length}`);
console.log(`实际处理范围: ${scope.length}`);
console.log(`排除 final decision / complete media / other tier: ${excluded.finalDecision} / ${excluded.completeMedia} / ${excluded.otherTier}`);
console.log(`已处理进度: ${proposal.processedCount}/${proposal.sourceManualReviewCount}`);
console.log(`联系表: ${contactSheets.length}`);
console.log(`proposal: ${path.relative(projectRoot, proposalPath)}`);
console.log(`final check: ${path.relative(projectRoot, finalCheckPath)}`);

async function selectedImageDataUrls(proposal: ReturnType<typeof buildManualReviewProposal>) {
  const records = Object.values({ ...proposal.proposedAccepted, ...proposal.proposedForced, ...proposal.proposedReuse, ...proposal.proposedRejected, ...proposal.unresolved });
  const data: Record<string, string> = {};
  for (const record of records) {
    if (!record.sourceId) continue;
    for (const index of [0, 1]) {
      const file = path.join(cacheRoot, record.exerciseId, record.sourceId, `${index}.jpg`);
      const bytes = await readFile(file).catch(() => null);
      if (bytes) data[`${record.exerciseId}/${record.sourceId}/${index}`] = `data:image/jpeg;base64,${bytes.toString('base64')}`;
    }
  }
  return data;
}

async function loadCacheManifest(commit: string): Promise<ReviewCacheManifest> {
  const existing = await readJsonIfExists<ReviewCacheManifest>(cacheManifestPath);
  if (existing && existing.commit !== commit) throw new Error(`审核缓存 commit 不一致：${existing.commit} != ${commit}`);
  return existing ?? { version: 1, updatedAt: new Date().toISOString(), commit, images: {} };
}

function stripStatus(record: CachedImageRecord): Omit<CachedImageRecord, 'status'> {
  const { status: _status, ...stored } = record;
  return stored;
}

async function snapshotFormalMedia(root: string, allMatches: MatchRecord[]) {
  const completeIds = allMatches.filter(({ exercise }) => exercise.mediaStatus === 'complete').map(({ exercise }) => exercise.exerciseId).sort();
  const snapshot: Record<string, { start: number; peak: number }> = {};
  for (const exerciseId of completeIds) {
    const directory = path.join(root, 'public', 'exercise-media', exerciseId);
    snapshot[exerciseId] = {
      start: (await stat(path.join(directory, 'start.webp'))).size,
      peak: (await stat(path.join(directory, 'peak.webp'))).size
    };
  }
  return snapshot;
}

function summaryMarkdown(summary: ReturnType<typeof buildManualReviewTriageSummary>) {
  return `# Free Exercise DB Manual Review Triage Summary\n\n` +
    `- 原始处理范围：${summary.sourceManualReviewCount}\n` +
    `- 已完成视觉复核：${summary.visuallyReviewedCount}\n` +
    `- proposed-accepted：${summary.proposedAccepted}\n` +
    `- proposed-forced：${summary.proposedForced}\n` +
    `- proposed-reuse：${summary.proposedReuse}\n` +
    `- proposed-rejected：${summary.proposedRejected}\n` +
    `- unresolved：${summary.unresolved}\n` +
    `- 预计新增图片动作：${summary.estimatedNewMediaExercises}\n` +
    `- 预计共图动作：${summary.estimatedReuseExercises}\n` +
    `- 仍需用户亲自判断：${summary.requiresUserReview}\n\n` +
    `## 联系表\n\n${summary.contactSheets.map((file) => `- ${file}`).join('\n')}\n`;
}

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, 'utf8')) as T;
}

async function readJsonIfExists<T>(file: string): Promise<T | null> {
  try { return await readJson<T>(file); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
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
