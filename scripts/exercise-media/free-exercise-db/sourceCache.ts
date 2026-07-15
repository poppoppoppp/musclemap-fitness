import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { FreeDbExercise, SourceMetadata } from './types.ts';

const COMMIT_URL = 'https://api.github.com/repos/yuhonas/free-exercise-db/commits/main';
const RAW_ROOT = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db';
export const DEFAULT_CACHE_DIR = 'D:\\AI\\FreeExerciseDB-cache';

interface LoadOptions {
  cacheDir?: string;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

export async function loadFreeDb(options: LoadOptions = {}): Promise<{ exercises: FreeDbExercise[]; metadata: SourceMetadata }> {
  const cacheDir = options.cacheDir ?? process.env.FREE_EXERCISE_DB_CACHE ?? DEFAULT_CACHE_DIR;
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => new Date());
  const cacheFile = path.join(cacheDir, 'exercises.json');
  const metadataFile = path.join(cacheDir, 'metadata.json');
  await mkdir(cacheDir, { recursive: true });

  try {
    const commit = await fetchCommit(fetchImpl);
    const cached = await readCache(cacheFile, metadataFile).catch(() => null);
    if (cached && cached.metadata.commit === commit) return cached;

    const sourceUrl = `${RAW_ROOT}/${commit}/dist/exercises.json`;
    const response = await fetchImpl(sourceUrl, { headers: { 'User-Agent': 'MuscleMap-Fitness-media-report' } });
    if (!response.ok) throw new Error(`Free Exercise DB 下载失败: HTTP ${response.status}`);
    const serialized = `${await response.text().then((text) => JSON.stringify(parseExercises(text), null, 2))}\n`;
    const exercises = parseExercises(serialized);
    const metadata: SourceMetadata = {
      downloadedAt: now().toISOString(),
      sourceUrl,
      commit,
      sha256: sha256(serialized),
      recordCount: exercises.length,
      license: 'Unlicense',
      cacheFile,
      cacheFallback: false
    };
    await writeAtomically(cacheFile, serialized);
    await writeAtomically(metadataFile, `${JSON.stringify(metadata, null, 2)}\n`);
    return { exercises, metadata };
  } catch (error) {
    try {
      const cached = await readCache(cacheFile, metadataFile);
      return { exercises: cached.exercises, metadata: { ...cached.metadata, cacheFallback: true } };
    } catch {
      throw new Error(`无法下载 Free Exercise DB，且没有有效缓存：${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

async function fetchCommit(fetchImpl: typeof fetch) {
  const response = await fetchImpl(COMMIT_URL, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'MuscleMap-Fitness-media-report' }
  });
  if (!response.ok) throw new Error(`无法解析 Free Exercise DB commit: HTTP ${response.status}`);
  const payload = await response.json() as { sha?: unknown };
  if (typeof payload.sha !== 'string' || !/^[a-f0-9]{40}$/.test(payload.sha)) throw new Error('Free Exercise DB commit 响应缺少有效 SHA');
  return payload.sha;
}

async function readCache(cacheFile: string, metadataFile: string) {
  const [serialized, metadataText] = await Promise.all([readFile(cacheFile, 'utf8'), readFile(metadataFile, 'utf8')]);
  const exercises = parseExercises(serialized);
  const metadata = JSON.parse(metadataText) as SourceMetadata;
  if (metadata.sha256 !== sha256(serialized)) throw new Error('Free Exercise DB 缓存 SHA-256 校验失败');
  if (metadata.recordCount !== exercises.length) throw new Error('Free Exercise DB 缓存条数与元数据不一致');
  return { exercises, metadata: { ...metadata, cacheFallback: false } };
}

function parseExercises(serialized: string): FreeDbExercise[] {
  const parsed = JSON.parse(serialized) as unknown;
  if (!Array.isArray(parsed)) throw new Error('Free Exercise DB 数据不是数组');
  return parsed.map((item, index) => {
    if (!item || typeof item !== 'object') throw new Error(`Free Exercise DB 第 ${index + 1} 条不是对象`);
    const exercise = item as Partial<FreeDbExercise>;
    if (typeof exercise.id !== 'string' || typeof exercise.name !== 'string' || !Array.isArray(exercise.images)) {
      throw new Error(`Free Exercise DB 第 ${index + 1} 条缺少 id、name 或 images`);
    }
    return {
      id: exercise.id,
      name: exercise.name,
      equipment: typeof exercise.equipment === 'string' ? exercise.equipment : null,
      primaryMuscles: stringArray(exercise.primaryMuscles),
      secondaryMuscles: stringArray(exercise.secondaryMuscles),
      category: typeof exercise.category === 'string' ? exercise.category : '',
      force: typeof exercise.force === 'string' ? exercise.force : null,
      mechanic: typeof exercise.mechanic === 'string' ? exercise.mechanic : null,
      instructions: stringArray(exercise.instructions),
      images: stringArray(exercise.images)
    };
  });
}

function stringArray(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; }
function sha256(value: string) { return createHash('sha256').update(value).digest('hex'); }

async function writeAtomically(filePath: string, content: string) {
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, content);
  await rename(temporaryPath, filePath);
}
