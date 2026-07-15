import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildMatchRecord } from './matcher.ts';
import { normalizeManualOverrides } from './manualOverrides.ts';
import { writeReports } from './reportWriters.ts';
import { collectRuntimeExercises } from './runtimeExercises.ts';
import { loadFreeDb } from './sourceCache.ts';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..', '..', '..');
const outputDirectory = path.join(projectRoot, 'reports', 'exercise-media', 'free-exercise-db');
const overridesPath = path.join(scriptDirectory, 'manual-overrides.json');

const rawOverrides = JSON.parse(await readFile(overridesPath, 'utf8')) as unknown;
const [appExercises, freeDb] = await Promise.all([
  collectRuntimeExercises(projectRoot),
  loadFreeDb()
]);
const { overrides, warnings } = normalizeManualOverrides(rawOverrides, {
  exerciseIds: new Set(appExercises.map(({ exerciseId }) => exerciseId)),
  sourceIds: new Set(freeDb.exercises.map(({ id }) => id))
});
for (const warning of warnings) console.warn(`警告: ${warning}`);
const matches = appExercises.map((exercise) => buildMatchRecord(exercise, freeDb.exercises, freeDb.metadata.commit, overrides));
const { summary, outputFiles } = await writeReports(outputDirectory, matches, freeDb.metadata, overrides);

console.log(`Free Exercise DB 匹配报告 V${summary.reportVersion}`);
console.log(`App 可见动作: ${summary.visibleExerciseCount}`);
console.log(`本地完整媒体: ${summary.media.complete}`);
console.log(`exact / high-confidence / manual-review / unmatched: ${summary.tiers.exact} / ${summary.tiers.highConfidence} / ${summary.tiers.manualReview} / ${summary.tiers.unmatched}`);
console.log(`Free Exercise DB: ${summary.freeDbExerciseCount} 条 @ ${summary.source.commit}`);
console.log(`缓存: ${summary.source.cacheFile}${summary.source.cacheFallback ? ' (网络失败，使用缓存)' : ''}`);
console.log(`输出文件: ${outputFiles.length}`);
for (const outputFile of outputFiles) console.log(`  ${path.relative(projectRoot, outputFile)}`);
