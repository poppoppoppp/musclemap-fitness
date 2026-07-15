import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createCurlFetch, FIXED_SOURCE_COMMIT, processAcceptedMedia } from './acceptedMedia.ts';
import { collectRuntimeExercises } from './runtimeExercises.ts';
import type { FreeDbExercise, ManualOverrides, MatchRecord, SourceMetadata } from './types.ts';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const cacheDir = process.env.FREE_EXERCISE_DB_CACHE ?? 'D:\\AI\\FreeExerciseDB-cache';

try {
  const overrides = JSON.parse(await readFile(path.join(projectRoot, 'scripts', 'exercise-media', 'free-exercise-db', 'manual-overrides.json'), 'utf8')) as ManualOverrides;
  const matches = JSON.parse(await readFile(path.join(projectRoot, 'reports', 'exercise-media', 'free-exercise-db', 'matches.json'), 'utf8')) as MatchRecord[];
  const sourceText = await readFile(path.join(cacheDir, 'exercises.json'), 'utf8');
  const sourceExercises = JSON.parse(sourceText) as FreeDbExercise[];
  const metadata = JSON.parse(await readFile(path.join(cacheDir, 'metadata.json'), 'utf8')) as SourceMetadata;
  validateFixedCache(sourceText, sourceExercises, metadata);
  const appExercises = await collectRuntimeExercises(projectRoot);

  const summary = await processAcceptedMedia({
    projectRoot,
    cacheDir,
    overrides,
    matches,
    sourceExercises,
    appExerciseIds: new Set(appExercises.map((exercise) => exercise.exerciseId)),
    fetchImpl: createCurlFetch()
  });

  console.log('Free Exercise DB 已审核图片下载与接入 V0.1');
  console.log(`accepted 总数: ${summary.acceptedTotal}`);
  console.log(`成功下载 / 复用缓存原图: ${summary.downloadedImages} / ${summary.cachedReusedImages}`);
  console.log(`成功转换图片: ${summary.convertedImages}`);
  console.log(`新增完整动作: ${summary.newlyCompletedExercises}`);
  console.log(`已存在 / 冲突 / 失败动作: ${summary.existingSkippedExercises} / ${summary.conflictSkippedExercises} / ${summary.failedExercises}`);
  console.log(`下载体积 / WebP 输出体积: ${summary.downloadedBytes} / ${summary.outputBytes} bytes`);
  console.log(`缓存路径: ${summary.cachePath}`);
  console.log('报告: reports/exercise-media/free-exercise-db/download-summary.json');
} catch (error) {
  console.error(`已审核图片接入失败: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}

function validateFixedCache(serialized: string, exercises: FreeDbExercise[], metadata: SourceMetadata) {
  if (metadata.commit !== FIXED_SOURCE_COMMIT) {
    throw new Error(`Free Exercise DB 缓存 commit 必须为 ${FIXED_SOURCE_COMMIT}，实际为 ${metadata.commit}`);
  }
  if (metadata.sha256 !== createHash('sha256').update(serialized).digest('hex')) {
    throw new Error('Free Exercise DB 缓存 SHA-256 与 metadata.json 不一致');
  }
  if (metadata.recordCount !== exercises.length) {
    throw new Error(`Free Exercise DB 缓存条数不一致：metadata=${metadata.recordCount}，实际=${exercises.length}`);
  }
}
