import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { access, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

import type { FreeDbExercise, ManualOverrides } from './types.ts';

export const FIXED_SOURCE_COMMIT = 'b0eed061e1c832b3ed815fbaa4b45b3cdc14df49';
const RAW_ROOT = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db';

export type CurlRunner = (url: string, signal?: AbortSignal) => Promise<Buffer>;

export function createCurlFetch(runner: CurlRunner = runCurl): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input);
    const body = await runner(url, init?.signal ?? undefined);
    return new Response(new Uint8Array(body), { status: 200, headers: { 'content-type': 'image/jpeg' } });
  }) as typeof fetch;
}

export interface AcceptedMediaStage {
  sourcePath: string;
  sourceUrl: string;
}

export interface AcceptedMediaJob {
  exerciseId: string;
  sourceId: string;
  start: AcceptedMediaStage;
  peak: AcceptedMediaStage;
}

export interface AcceptedMediaFailure {
  exerciseId: string;
  sourceId: string;
  reason: string;
}

export interface CachedImageRecord {
  sourceUrl: string;
  sha256: string;
  bytes: number;
  width: number;
  height: number;
  format: string;
  status: 'downloaded' | 'reused';
}

interface EnsureCachedImageOptions {
  sourceUrl: string;
  cacheFile: string;
  known?: Pick<CachedImageRecord, 'sourceUrl' | 'sha256'> | null;
  fetchImpl?: typeof fetch;
  retries?: number;
  requestTimeoutMs?: number;
}

interface PublishedStage {
  outputPath: string;
  sha256: string;
  bytes: number;
}

interface PublishAcceptedMediaOptions {
  exerciseId: string;
  startFile: string;
  peakFile: string;
  mediaRoot: string;
}

export type PublishAcceptedMediaResult =
  | { status: 'conflict'; reason: string }
  | { status: 'created'; start: PublishedStage; peak: PublishedStage };

interface MatchCandidateReference {
  sourceId?: unknown;
  startImageUrl?: unknown;
  peakImageUrl?: unknown;
}

interface MatchReference {
  exercise?: { exerciseId?: unknown };
  bestCandidate?: MatchCandidateReference | null;
  topCandidates?: MatchCandidateReference[];
  rejectedCandidates?: MatchCandidateReference[];
}

interface BuildAcceptedJobsOptions {
  overrides: ManualOverrides;
  appExerciseIds: Set<string>;
  sourceExercises: FreeDbExercise[];
  matches: MatchReference[];
  expectedAcceptedCount?: number;
}

interface ProcessAcceptedMediaOptions extends BuildAcceptedJobsOptions {
  projectRoot: string;
  cacheDir: string;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

interface SourceManifestStage {
  sourceUrl: string;
  sourceSha256: string;
  outputPath: string;
  outputSha256: string;
}

interface SourceManifestEntry {
  sourceId: string;
  start: SourceManifestStage;
  peak: SourceManifestStage;
}

interface SourceManifest {
  version: 1;
  generatedAt: string;
  source: { repository: 'yuhonas/free-exercise-db'; commit: string; license: 'Unlicense' };
  exercises: Record<string, SourceManifestEntry>;
}

interface CacheIndexEntry {
  sourceUrl: string;
  sha256: string;
  bytes: number;
  width: number;
  height: number;
  format: string;
}

interface CacheIndex {
  version: 1;
  updatedAt: string;
  commit: string;
  images: Record<string, CacheIndexEntry>;
}

export interface AcceptedMediaExerciseResult {
  exerciseId: string;
  sourceId: string;
  status: 'created' | 'existing' | 'conflict' | 'failed' | 'invalid';
  reason?: string;
  start?: { sourceSha256: string; outputSha256: string; bytes: number };
  peak?: { sourceSha256: string; outputSha256: string; bytes: number };
}

export interface AcceptedMediaRunSummary {
  version: 1;
  generatedAt: string;
  sourceCommit: string;
  cachePath: string;
  acceptedTotal: number;
  validAccepted: number;
  downloadedImages: number;
  cachedReusedImages: number;
  convertedImages: number;
  existingSkippedExercises: number;
  conflictSkippedExercises: number;
  downloadFailedExercises: number;
  corruptImageExercises: number;
  failedExercises: number;
  newlyCompletedExercises: number;
  downloadedBytes: number;
  outputBytes: number;
  integratedAcceptedExercises: number;
  cachedAcceptedImages: number;
  cachedAcceptedBytes: number;
  integratedWebpImages: number;
  integratedWebpBytes: number;
  failures: AcceptedMediaFailure[];
  exercises: AcceptedMediaExerciseResult[];
}

export function buildAcceptedJobs(options: BuildAcceptedJobsOptions): { jobs: AcceptedMediaJob[]; failures: AcceptedMediaFailure[] } {
  const expectedCount = options.expectedAcceptedCount ?? 47;
  const accepted = Object.entries(options.overrides.accepted).sort(([left], [right]) => left.localeCompare(right));
  if (accepted.length !== expectedCount) {
    throw new Error(`accepted 数量必须为 ${expectedCount}，实际为 ${accepted.length}`);
  }

  const sources = new Map(options.sourceExercises.map((exercise) => [exercise.id, exercise]));
  const matches = new Map(options.matches.flatMap((match) => {
    const exerciseId = match.exercise?.exerciseId;
    return typeof exerciseId === 'string' ? [[exerciseId, match] as const] : [];
  }));
  const jobs: AcceptedMediaJob[] = [];
  const failures: AcceptedMediaFailure[] = [];

  for (const [exerciseId, sourceId] of accepted) {
    const fail = (reason: string) => failures.push({ exerciseId, sourceId, reason });
    if (!options.appExerciseIds.has(exerciseId)) {
      fail(`exerciseId 不存在于当前 App 可见动作集合：${exerciseId}`);
      continue;
    }

    const source = sources.get(sourceId);
    if (!source) {
      fail(`sourceId 不存在于 Free Exercise DB 缓存：${sourceId}`);
      continue;
    }
    if (source.images.length < 2) {
      fail(`sourceId 至少两张图片，实际为 ${source.images.length}`);
      continue;
    }

    const start = stageFromPath(source.images[0]);
    const peak = stageFromPath(source.images[1]);
    const match = matches.get(exerciseId);
    const candidate = match && [match.bestCandidate, ...(match.topCandidates ?? []), ...(match.rejectedCandidates ?? [])]
      .find((item) => item?.sourceId === sourceId);
    if (!candidate) {
      fail(`matches.json 中找不到 accepted sourceId：${sourceId}`);
      continue;
    }
    if (candidate.startImageUrl !== start.sourceUrl || candidate.peakImageUrl !== peak.sourceUrl) {
      fail(`matches.json 图片 URL 未固定到 accepted sourceId 与固定 commit：${FIXED_SOURCE_COMMIT}`);
      continue;
    }

    jobs.push({ exerciseId, sourceId, start, peak });
  }

  return { jobs, failures };
}

export async function processAcceptedMedia(options: ProcessAcceptedMediaOptions): Promise<AcceptedMediaRunSummary> {
  const now = options.now ?? (() => new Date());
  const generatedAt = now().toISOString();
  const mediaRoot = path.join(options.projectRoot, 'public', 'exercise-media');
  const reportDirectory = path.join(options.projectRoot, 'reports', 'exercise-media', 'free-exercise-db');
  const manifestPath = path.join(mediaRoot, 'source-manifest.json');
  const cacheIndexPath = path.join(options.cacheDir, 'images-manifest.json');
  const built = buildAcceptedJobs(options);
  const manifest = await readSourceManifest(manifestPath, generatedAt);
  const cacheIndex = await readCacheIndex(cacheIndexPath, generatedAt);
  const summary: AcceptedMediaRunSummary = {
    version: 1,
    generatedAt,
    sourceCommit: FIXED_SOURCE_COMMIT,
    cachePath: path.join(options.cacheDir, 'images'),
    acceptedTotal: Object.keys(options.overrides.accepted).length,
    validAccepted: built.jobs.length,
    downloadedImages: 0,
    cachedReusedImages: 0,
    convertedImages: 0,
    existingSkippedExercises: 0,
    conflictSkippedExercises: 0,
    downloadFailedExercises: 0,
    corruptImageExercises: 0,
    failedExercises: built.failures.length,
    newlyCompletedExercises: 0,
    downloadedBytes: 0,
    outputBytes: 0,
    integratedAcceptedExercises: 0,
    cachedAcceptedImages: 0,
    cachedAcceptedBytes: 0,
    integratedWebpImages: 0,
    integratedWebpBytes: 0,
    failures: [...built.failures],
    exercises: built.failures.map((failure) => ({ ...failure, status: 'invalid' as const }))
  };

  for (const job of built.jobs) {
    const existing = manifest.exercises[job.exerciseId];
    if (existing && existing.sourceId === job.sourceId && await manifestOutputsMatch(options.projectRoot, existing)) {
      summary.existingSkippedExercises += 1;
      summary.exercises.push({ exerciseId: job.exerciseId, sourceId: job.sourceId, status: 'existing' });
      continue;
    }

    const targetDirectory = path.join(mediaRoot, job.exerciseId);
    if (await exists(targetDirectory)) {
      const reason = `目标目录已存在但没有匹配且可验证的 manifest，未覆盖：${targetDirectory}`;
      summary.conflictSkippedExercises += 1;
      summary.failures.push({ exerciseId: job.exerciseId, sourceId: job.sourceId, reason });
      summary.exercises.push({ exerciseId: job.exerciseId, sourceId: job.sourceId, status: 'conflict', reason });
      continue;
    }

    try {
      const start = await cacheJobStage(job.sourceId, '0.jpg', job.start, options, cacheIndex, cacheIndexPath, generatedAt);
      recordCacheStatus(summary, start);
      const peak = await cacheJobStage(job.sourceId, '1.jpg', job.peak, options, cacheIndex, cacheIndexPath, generatedAt);
      recordCacheStatus(summary, peak);
      const startFile = path.join(options.cacheDir, 'images', job.sourceId, '0.jpg');
      const peakFile = path.join(options.cacheDir, 'images', job.sourceId, '1.jpg');
      await validateDistinctImages(startFile, peakFile);
      const published = await publishAcceptedMedia({ exerciseId: job.exerciseId, startFile, peakFile, mediaRoot });
      if (published.status === 'conflict') {
        summary.conflictSkippedExercises += 1;
        summary.failures.push({ exerciseId: job.exerciseId, sourceId: job.sourceId, reason: published.reason });
        summary.exercises.push({ exerciseId: job.exerciseId, sourceId: job.sourceId, status: 'conflict', reason: published.reason });
        continue;
      }

      manifest.generatedAt = generatedAt;
      manifest.exercises[job.exerciseId] = {
        sourceId: job.sourceId,
        start: {
          sourceUrl: job.start.sourceUrl,
          sourceSha256: start.sha256,
          outputPath: published.start.outputPath,
          outputSha256: published.start.sha256
        },
        peak: {
          sourceUrl: job.peak.sourceUrl,
          sourceSha256: peak.sha256,
          outputPath: published.peak.outputPath,
          outputSha256: published.peak.sha256
        }
      };
      await writeJsonAtomically(manifestPath, manifest);
      summary.convertedImages += 2;
      summary.newlyCompletedExercises += 1;
      summary.outputBytes += published.start.bytes + published.peak.bytes;
      summary.exercises.push({
        exerciseId: job.exerciseId,
        sourceId: job.sourceId,
        status: 'created',
        start: { sourceSha256: start.sha256, outputSha256: published.start.sha256, bytes: published.start.bytes },
        peak: { sourceSha256: peak.sha256, outputSha256: published.peak.sha256, bytes: published.peak.bytes }
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const corrupt = /HTML|解码|图片为空|宽高|完全相同|Input file|unsupported image format/i.test(reason);
      if (corrupt) summary.corruptImageExercises += 1;
      else summary.downloadFailedExercises += 1;
      summary.failedExercises += 1;
      summary.failures.push({ exerciseId: job.exerciseId, sourceId: job.sourceId, reason });
      summary.exercises.push({ exerciseId: job.exerciseId, sourceId: job.sourceId, status: 'failed', reason });
    }
  }

  const totals = await measureAcceptedArtifacts(built.jobs, options.projectRoot, options.cacheDir, manifest, cacheIndex);
  summary.integratedAcceptedExercises = totals.integratedAcceptedExercises;
  summary.cachedAcceptedImages = totals.cachedAcceptedImages;
  summary.cachedAcceptedBytes = totals.cachedAcceptedBytes;
  summary.integratedWebpImages = totals.integratedWebpImages;
  summary.integratedWebpBytes = totals.integratedWebpBytes;
  await mkdir(reportDirectory, { recursive: true });
  await Promise.all([
    writeJsonAtomically(path.join(reportDirectory, 'download-summary.json'), summary),
    writeTextAtomically(path.join(reportDirectory, 'download-summary.md'), createDownloadSummaryMarkdown(summary))
  ]);
  return summary;
}

function stageFromPath(sourcePath: string): AcceptedMediaStage {
  return {
    sourcePath,
    sourceUrl: `${RAW_ROOT}/${FIXED_SOURCE_COMMIT}/exercises/${sourcePath}`
  };
}

export async function ensureCachedImage(options: EnsureCachedImageOptions): Promise<CachedImageRecord> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const retries = options.retries ?? 3;
  const requestTimeoutMs = options.requestTimeoutMs ?? 15000;
  if (!Number.isInteger(retries) || retries < 1) throw new Error('retries 必须是正整数');
  if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs < 1) throw new Error('requestTimeoutMs 必须是正整数');

  if (options.known?.sourceUrl === options.sourceUrl && await exists(options.cacheFile)) {
    const actualSha256 = await sha256File(options.cacheFile);
    if (actualSha256 === options.known.sha256) {
      const image = await validateImage(options.cacheFile);
      return {
        sourceUrl: options.sourceUrl,
        sha256: actualSha256,
        bytes: (await stat(options.cacheFile)).size,
        ...image,
        status: 'reused'
      };
    }
  }

  await mkdir(path.dirname(options.cacheFile), { recursive: true });
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const temporaryFile = `${options.cacheFile}.tmp-${randomUUID()}`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(new Error(`请求超时 ${requestTimeoutMs}ms`)), requestTimeoutMs);
      let body: Buffer;
      try {
        const response = await fetchImpl(options.sourceUrl, {
          headers: { 'User-Agent': 'MuscleMap-Fitness-accepted-media' },
          signal: controller.signal
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
        if (contentType.includes('text/html')) throw new Error('下载响应是 HTML，不是图片');
        body = Buffer.from(await response.arrayBuffer());
      } finally {
        clearTimeout(timeout);
      }
      if (body.length === 0) throw new Error('下载图片为空文件');
      await writeFile(temporaryFile, body, { flag: 'wx' });
      const image = await validateImage(temporaryFile);
      const sha256 = sha256Buffer(body);
      await replaceAtomically(temporaryFile, options.cacheFile);
      return {
        sourceUrl: options.sourceUrl,
        sha256,
        bytes: body.length,
        ...image,
        status: 'downloaded'
      };
    } catch (error) {
      lastError = error;
      await rm(temporaryFile, { force: true });
    }
  }
  throw new Error(`图片下载或解码失败（${retries} 次尝试）：${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

export async function validateDistinctImages(startFile: string, peakFile: string) {
  const [startSha256, peakSha256] = await Promise.all([sha256File(startFile), sha256File(peakFile)]);
  if (startSha256 === peakSha256) throw new Error('start 与 peak 原图是完全相同文件');
  return { startSha256, peakSha256 };
}

export async function publishAcceptedMedia(options: PublishAcceptedMediaOptions): Promise<PublishAcceptedMediaResult> {
  const targetDirectory = path.join(options.mediaRoot, options.exerciseId);
  if (await exists(targetDirectory)) {
    return { status: 'conflict', reason: `目标目录已存在，未覆盖：${targetDirectory}` };
  }

  await validateDistinctImages(options.startFile, options.peakFile);
  await mkdir(options.mediaRoot, { recursive: true });
  const stagingDirectory = path.join(options.mediaRoot, `${options.exerciseId}.tmp-${randomUUID()}`);
  const stagingStart = path.join(stagingDirectory, 'start.webp');
  const stagingPeak = path.join(stagingDirectory, 'peak.webp');
  try {
    await mkdir(stagingDirectory);
    const [startImage, peakImage] = await Promise.all([
      convertToProjectWebp(options.startFile),
      convertToProjectWebp(options.peakFile)
    ]);
    await Promise.all([writeFile(stagingStart, startImage.data), writeFile(stagingPeak, peakImage.data)]);
    const start = publishedStage(startImage.data, `/exercise-media/${options.exerciseId}/start.webp`);
    const peak = publishedStage(peakImage.data, `/exercise-media/${options.exerciseId}/peak.webp`);
    await rename(stagingDirectory, targetDirectory);
    return { status: 'created', start, peak };
  } catch (error) {
    await rm(stagingDirectory, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  }
}

async function convertToProjectWebp(inputFile: string) {
  const result = await sharp(inputFile)
    .rotate()
    .resize({ width: 640, height: 800, fit: 'contain', position: 'centre', background: '#ffffff' })
    .flatten({ background: '#ffffff' })
    .webp({ quality: 88 })
    .toBuffer({ resolveWithObject: true });
  if (result.info.format !== 'webp' || result.info.width !== 640 || result.info.height !== 800) {
    throw new Error(`WebP 输出验证失败：${result.info.format} ${result.info.width}×${result.info.height}`);
  }
  return result;
}

async function validateImage(filePath: string) {
  const metadata = await sharp(filePath).metadata();
  if (!metadata.width || !metadata.height || metadata.width < 16 || metadata.height < 16 || metadata.width > 20000 || metadata.height > 20000) {
    throw new Error(`图片宽高不合理：${metadata.width ?? 0}×${metadata.height ?? 0}`);
  }
  if (!metadata.format) throw new Error('图片格式无法识别');
  return { width: metadata.width, height: metadata.height, format: metadata.format };
}

function publishedStage(value: Buffer, outputPath: string): PublishedStage {
  return { outputPath, sha256: sha256Buffer(value), bytes: value.length };
}

async function replaceAtomically(temporaryFile: string, targetFile: string) {
  if (!await exists(targetFile)) {
    await rename(temporaryFile, targetFile);
    return;
  }
  const backupFile = `${targetFile}.replace-${randomUUID()}`;
  await rename(targetFile, backupFile);
  try {
    await rename(temporaryFile, targetFile);
    await rm(backupFile, { force: true });
  } catch (error) {
    await rename(backupFile, targetFile).catch(() => undefined);
    throw error;
  }
}

async function sha256File(filePath: string) {
  return sha256Buffer(await readFile(filePath));
}

function sha256Buffer(value: Buffer) {
  return createHash('sha256').update(value).digest('hex');
}

async function exists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function cacheJobStage(
  sourceId: string,
  fileName: '0.jpg' | '1.jpg',
  stage: AcceptedMediaStage,
  options: ProcessAcceptedMediaOptions,
  cacheIndex: CacheIndex,
  cacheIndexPath: string,
  generatedAt: string
) {
  const key = `${sourceId}/${fileName}`;
  const record = await ensureCachedImage({
    sourceUrl: stage.sourceUrl,
    cacheFile: path.join(options.cacheDir, 'images', sourceId, fileName),
    known: cacheIndex.images[key],
    fetchImpl: options.fetchImpl
  });
  const { status: _status, ...stored } = record;
  cacheIndex.updatedAt = generatedAt;
  cacheIndex.images[key] = stored;
  await writeJsonAtomically(cacheIndexPath, cacheIndex);
  return record;
}

function recordCacheStatus(summary: AcceptedMediaRunSummary, record: CachedImageRecord) {
  if (record.status === 'downloaded') {
    summary.downloadedImages += 1;
    summary.downloadedBytes += record.bytes;
  } else {
    summary.cachedReusedImages += 1;
  }
}

async function manifestOutputsMatch(projectRoot: string, entry: SourceManifestEntry) {
  const stages = [entry.start, entry.peak];
  for (const stage of stages) {
    const relativePath = stage.outputPath.replace(/^\//, '').split('/');
    const filePath = path.join(projectRoot, 'public', ...relativePath);
    if (!await exists(filePath) || await sha256File(filePath) !== stage.outputSha256) return false;
    const metadata = await sharp(filePath).metadata().catch(() => null);
    if (metadata?.format !== 'webp' || metadata.width !== 640 || metadata.height !== 800) return false;
  }
  return true;
}

async function measureAcceptedArtifacts(
  jobs: AcceptedMediaJob[],
  projectRoot: string,
  cacheDir: string,
  manifest: SourceManifest,
  cacheIndex: CacheIndex
) {
  let integratedAcceptedExercises = 0;
  let cachedAcceptedImages = 0;
  let cachedAcceptedBytes = 0;
  let integratedWebpImages = 0;
  let integratedWebpBytes = 0;

  for (const job of jobs) {
    for (const fileName of ['0.jpg', '1.jpg'] as const) {
      const indexed = cacheIndex.images[`${job.sourceId}/${fileName}`];
      const cacheFile = path.join(cacheDir, 'images', job.sourceId, fileName);
      if (indexed && await exists(cacheFile) && await sha256File(cacheFile) === indexed.sha256) {
        cachedAcceptedImages += 1;
        cachedAcceptedBytes += (await stat(cacheFile)).size;
      }
    }

    const entry = manifest.exercises[job.exerciseId];
    if (!entry || entry.sourceId !== job.sourceId || !await manifestOutputsMatch(projectRoot, entry)) continue;
    integratedAcceptedExercises += 1;
    integratedWebpImages += 2;
    for (const stage of [entry.start, entry.peak]) {
      const relativePath = stage.outputPath.replace(/^\//, '').split('/');
      integratedWebpBytes += (await stat(path.join(projectRoot, 'public', ...relativePath))).size;
    }
  }
  return { integratedAcceptedExercises, cachedAcceptedImages, cachedAcceptedBytes, integratedWebpImages, integratedWebpBytes };
}

async function readSourceManifest(filePath: string, generatedAt: string): Promise<SourceManifest> {
  if (!await exists(filePath)) {
    return {
      version: 1,
      generatedAt,
      source: { repository: 'yuhonas/free-exercise-db', commit: FIXED_SOURCE_COMMIT, license: 'Unlicense' },
      exercises: {}
    };
  }
  const parsed = JSON.parse(await readFile(filePath, 'utf8')) as SourceManifest;
  if (parsed.version !== 1 || parsed.source?.commit !== FIXED_SOURCE_COMMIT || !parsed.exercises || typeof parsed.exercises !== 'object') {
    throw new Error('现有 source-manifest.json 版本或数据源 commit 不兼容，未覆盖');
  }
  return parsed;
}

async function readCacheIndex(filePath: string, generatedAt: string): Promise<CacheIndex> {
  if (!await exists(filePath)) {
    return { version: 1, updatedAt: generatedAt, commit: FIXED_SOURCE_COMMIT, images: {} };
  }
  const parsed = JSON.parse(await readFile(filePath, 'utf8')) as CacheIndex;
  if (parsed.version !== 1 || parsed.commit !== FIXED_SOURCE_COMMIT || !parsed.images || typeof parsed.images !== 'object') {
    throw new Error('现有图片缓存索引版本或数据源 commit 不兼容');
  }
  return parsed;
}

async function writeJsonAtomically(filePath: string, value: unknown) {
  await writeTextAtomically(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeTextAtomically(filePath: string, value: string) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryFile = `${filePath}.tmp-${randomUUID()}`;
  try {
    await writeFile(temporaryFile, value, { flag: 'wx' });
    await replaceAtomically(temporaryFile, filePath);
  } catch (error) {
    await rm(temporaryFile, { force: true }).catch(() => undefined);
    throw error;
  }
}

function createDownloadSummaryMarkdown(summary: AcceptedMediaRunSummary) {
  const failures = summary.failures.length
    ? summary.failures.map((failure) => `- \`${failure.exerciseId}\` ← \`${failure.sourceId}\`: ${failure.reason}`).join('\n')
    : '- 无';
  return `# Free Exercise DB 已审核图片下载报告

- 数据源 commit：\`${summary.sourceCommit}\`
- accepted 总数：${summary.acceptedTotal}
- 有效 accepted：${summary.validAccepted}
- 成功下载原图数：${summary.downloadedImages}
- 复用缓存原图数：${summary.cachedReusedImages}
- 成功转换图片数：${summary.convertedImages}
- 已存在跳过动作数：${summary.existingSkippedExercises}
- 冲突跳过动作数：${summary.conflictSkippedExercises}
- 下载失败动作数：${summary.downloadFailedExercises}
- 图片损坏动作数：${summary.corruptImageExercises}
- 最终新增完整图片动作数：${summary.newlyCompletedExercises}
- 最终已接入 accepted 动作数：${summary.integratedAcceptedExercises}
- 本次下载体积：${summary.downloadedBytes} bytes
- accepted 缓存原图总数 / 总体积：${summary.cachedAcceptedImages} / ${summary.cachedAcceptedBytes} bytes
- 本次 WebP 输出体积：${summary.outputBytes} bytes
- accepted WebP 总数 / 总体积：${summary.integratedWebpImages} / ${summary.integratedWebpBytes} bytes
- 缓存路径：\`${summary.cachePath}\`

## 失败与跳过

${failures}
`;
}

function runCurl(url: string, signal?: AbortSignal): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    execFile('curl.exe', [
      '--silent',
      '--show-error',
      '--fail',
      '--location',
      '--connect-timeout', '10',
      '--max-time', '15',
      url
    ], {
      encoding: null,
      maxBuffer: 20 * 1024 * 1024,
      signal,
      windowsHide: true
    }, (error, stdout) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });
}
