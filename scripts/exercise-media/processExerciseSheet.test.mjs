import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import sharp from 'sharp';

import { calculateStageCrop, loadExerciseIds, processExerciseSheet } from './processExerciseSheet.mjs';

test('calculateStageCrop partitions non-divisible image dimensions without gaps or overflow', () => {
  const imageWidth = 1201;
  const imageHeight = 1801;
  const rows = 3;
  const columns = 2;
  const stages = 2;

  for (let row = 1; row <= rows; row += 1) {
    for (let column = 1; column <= columns; column += 1) {
      const start = calculateStageCrop({ imageWidth, imageHeight, rows, columns, row, column, stageIndex: 0, stages });
      const peak = calculateStageCrop({ imageWidth, imageHeight, rows, columns, row, column, stageIndex: 1, stages });

      assert.equal(start.left + start.width, peak.left);
      assert.equal(start.top, peak.top);
      assert.equal(start.height, peak.height);
      assert.equal(peak.left + peak.width, Math.round((column * imageWidth) / columns));
      assert.equal(start.top + start.height, Math.round((row * imageHeight) / rows));
      assert.ok(start.left >= 0 && start.top >= 0);
      assert.ok(peak.left + peak.width <= imageWidth);
      assert.ok(peak.top + peak.height <= imageHeight);
    }
  }
});

test('loadExerciseIds reads real top-level exercise IDs and ignores nested item IDs', async () => {
  const exerciseIds = await loadExerciseIds(process.cwd());
  const expected = [
    'lat-pulldown',
    'pull-up',
    'one-arm-dumbbell-row',
    'seated-row',
    'barbell-row',
    'chest-supported-row'
  ];

  for (const exerciseId of expected) {
    assert.ok(exerciseIds.has(exerciseId), `Missing exercise ID: ${exerciseId}`);
  }

  assert.equal(exerciseIds.has('arm-fatigue'), false);
});

test('processExerciseSheet skips a missing exercise ID and continues with valid exercises', async () => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'musclemap-media-'));

  try {
    await mkdir(path.join(projectRoot, 'src', 'data', 'exerciseCatalog'), { recursive: true });
    await mkdir(path.join(projectRoot, 'public'), { recursive: true });
    await writeFile(path.join(projectRoot, 'src', 'data', 'exercises.ts'), "const existingExercises = [{ id: 'valid-exercise' }];\n");
    await sharp({ create: { width: 8, height: 6, channels: 3, background: '#ffffff' } })
      .png()
      .toFile(path.join(projectRoot, 'public', 'source.png'));
    await writeFile(path.join(projectRoot, 'batch.json'), JSON.stringify({
      batchId: 'test-batch',
      sourceFile: 'public/source.png',
      layout: { rows: 1, columns: 2, stageOrder: ['start', 'peak'] },
      output: { width: 4, height: 5, format: 'webp', quality: 88, background: '#f7f6f2' },
      exercises: [
        { row: 1, column: 1, exerciseId: 'missing-exercise', name: 'Missing' },
        { row: 1, column: 2, exerciseId: 'valid-exercise', name: 'Valid' }
      ]
    }));

    const logger = { log() {}, error() {} };
    const result = await processExerciseSheet('batch.json', projectRoot, logger);

    assert.equal(result.successfulExercises, 1);
    assert.equal(result.successfulImages, 2);
    assert.equal(result.skippedExercises, 1);
    assert.match(result.failures[0], /missing-exercise/);
    const start = await sharp(await readFile(path.join(projectRoot, 'public', 'exercise-media', 'valid-exercise', 'start.webp'))).metadata();
    const peak = await sharp(await readFile(path.join(projectRoot, 'public', 'exercise-media', 'valid-exercise', 'peak.webp'))).metadata();
    assert.deepEqual({ width: start.width, height: start.height, format: start.format }, { width: 4, height: 5, format: 'webp' });
    assert.deepEqual({ width: peak.width, height: peak.height, format: peak.format }, { width: 4, height: 5, format: 'webp' });
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});
