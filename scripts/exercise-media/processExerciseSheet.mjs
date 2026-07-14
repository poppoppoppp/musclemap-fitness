import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';
import ts from 'typescript';

export function calculateStageCrop({ imageWidth, imageHeight, rows, columns, row, column, stageIndex, stages }) {
  const cellLeft = Math.round(((column - 1) * imageWidth) / columns);
  const cellRight = column === columns ? imageWidth : Math.round((column * imageWidth) / columns);
  const cellTop = Math.round(((row - 1) * imageHeight) / rows);
  const cellBottom = row === rows ? imageHeight : Math.round((row * imageHeight) / rows);
  const cellWidth = cellRight - cellLeft;
  const stageLeft = Math.round(cellLeft + (stageIndex * cellWidth) / stages);
  const stageRight = stageIndex === stages - 1
    ? cellRight
    : Math.round(cellLeft + ((stageIndex + 1) * cellWidth) / stages);

  return {
    left: stageLeft,
    top: cellTop,
    width: stageRight - stageLeft,
    height: cellBottom - cellTop
  };
}

export async function loadExerciseIds(projectRoot) {
  const exerciseIds = new Set();
  const exerciseSource = path.join(projectRoot, 'src', 'data', 'exercises.ts');
  await collectExerciseArrayIds(exerciseSource, (name) => name === 'existingExercises', exerciseIds);

  const catalogDirectory = path.join(projectRoot, 'src', 'data', 'exerciseCatalog');
  const catalogFiles = (await readdir(catalogDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => path.join(catalogDirectory, entry.name));

  for (const catalogFile of catalogFiles) {
    await collectExerciseArrayIds(catalogFile, (name) => name.endsWith('Exercises'), exerciseIds);
  }

  return exerciseIds;
}

async function collectExerciseArrayIds(filePath, matchesArrayName, exerciseIds) {
  const sourceText = await readFile(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;

    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !matchesArrayName(declaration.name.text) || !ts.isArrayLiteralExpression(declaration.initializer)) continue;

      for (const element of declaration.initializer.elements) {
        const exerciseId = readExerciseId(element);
        if (exerciseId) exerciseIds.add(exerciseId);
      }
    }
  }
}

function readExerciseId(element) {
  if (ts.isCallExpression(element)) {
    const firstArgument = element.arguments[0];
    return firstArgument && ts.isStringLiteralLike(firstArgument) ? firstArgument.text : null;
  }

  if (!ts.isObjectLiteralExpression(element)) return null;
  const idProperty = element.properties.find((property) => ts.isPropertyAssignment(property) && getPropertyName(property.name) === 'id');
  return idProperty && ts.isPropertyAssignment(idProperty) && ts.isStringLiteralLike(idProperty.initializer)
    ? idProperty.initializer.text
    : null;
}

function getPropertyName(name) {
  return ts.isIdentifier(name) || ts.isStringLiteralLike(name) ? name.text : null;
}

export async function processExerciseSheet(configPath, projectRoot = process.cwd(), logger = console) {
  const absoluteConfigPath = path.resolve(projectRoot, configPath);
  const config = JSON.parse(await readFile(absoluteConfigPath, 'utf8'));
  validateConfig(config);

  const sourcePath = path.resolve(projectRoot, config.sourceFile);
  const metadata = await sharp(sourcePath).metadata();
  if (!metadata.width || !metadata.height) throw new Error(`无法读取源图尺寸: ${config.sourceFile}`);

  const exerciseIds = await loadExerciseIds(projectRoot);
  const failures = [];
  let successfulExercises = 0;
  let successfulImages = 0;
  let skippedExercises = 0;

  logger.log(`批次 ID: ${config.batchId}`);
  logger.log(`源图路径: ${config.sourceFile}`);
  logger.log(`源图实际尺寸: ${metadata.width} × ${metadata.height}`);

  for (const exercise of config.exercises) {
    const location = `第 ${exercise.row} 行，第 ${exercise.column} 列`;
    logger.log(`\n动作: ${exercise.name} (${exercise.exerciseId})，${location}`);

    if (!exerciseIds.has(exercise.exerciseId)) {
      const reason = `exerciseId 不存在于当前动作数据集: ${exercise.exerciseId}`;
      logger.error(`  跳过: ${reason}`);
      failures.push(reason);
      skippedExercises += 1;
      continue;
    }

    let exerciseSucceeded = true;
    for (const [stageIndex, stage] of config.layout.stageOrder.entries()) {
      const crop = calculateStageCrop({
        imageWidth: metadata.width,
        imageHeight: metadata.height,
        rows: config.layout.rows,
        columns: config.layout.columns,
        row: exercise.row,
        column: exercise.column,
        stageIndex,
        stages: config.layout.stageOrder.length
      });
      const relativeOutputPath = path.posix.join('public', 'exercise-media', exercise.exerciseId, `${stage}.webp`);
      const outputPath = path.join(projectRoot, ...relativeOutputPath.split('/'));
      const status = existsSync(outputPath) ? '覆盖' : '新建';

      logger.log(`  ${stage} 原始裁切坐标: left=${crop.left}, top=${crop.top}, width=${crop.width}, height=${crop.height}`);
      try {
        await mkdir(path.dirname(outputPath), { recursive: true });
        await sharp(sourcePath)
          .extract(crop)
          .flatten({ background: config.output.background })
          .resize({
            width: config.output.width,
            height: config.output.height,
            fit: 'contain',
            position: 'centre',
            background: config.output.background
          })
          .webp({ quality: config.output.quality })
          .toFile(outputPath);
        logger.log(`  输出: ${relativeOutputPath} (${status})`);
        successfulImages += 1;
      } catch (error) {
        const reason = `${exercise.exerciseId}/${stage}: ${error instanceof Error ? error.message : String(error)}`;
        logger.error(`  失败: ${reason}`);
        failures.push(reason);
        exerciseSucceeded = false;
      }
    }

    if (exerciseSucceeded) successfulExercises += 1;
  }

  logger.log('\n处理汇总');
  logger.log(`批次 ID: ${config.batchId}`);
  logger.log(`成功处理动作数: ${successfulExercises}`);
  logger.log(`成功输出图片数: ${successfulImages}`);
  logger.log(`跳过动作数: ${skippedExercises}`);
  logger.log(`失败原因: ${failures.length ? failures.join('；') : '无'}`);

  return {
    batchId: config.batchId,
    sourceFile: config.sourceFile,
    sourceWidth: metadata.width,
    sourceHeight: metadata.height,
    successfulExercises,
    successfulImages,
    skippedExercises,
    failures
  };
}

function validateConfig(config) {
  if (!config || typeof config !== 'object') throw new Error('批次配置必须是 JSON 对象');
  if (!config.batchId || !config.sourceFile) throw new Error('批次配置缺少 batchId 或 sourceFile');
  if (!Number.isInteger(config.layout?.rows) || config.layout.rows < 1) throw new Error('layout.rows 必须是正整数');
  if (!Number.isInteger(config.layout?.columns) || config.layout.columns < 1) throw new Error('layout.columns 必须是正整数');
  if (!Array.isArray(config.layout?.stageOrder) || config.layout.stageOrder.join(',') !== 'start,peak') {
    throw new Error('layout.stageOrder 必须为 ["start", "peak"]');
  }
  if (!Array.isArray(config.exercises)) throw new Error('exercises 必须是数组');
  if (!Number.isInteger(config.output?.width) || config.output.width < 1 || !Number.isInteger(config.output?.height) || config.output.height < 1) {
    throw new Error('output.width 和 output.height 必须是正整数');
  }
  if (config.output.format !== 'webp') throw new Error('output.format 必须为 webp');
  if (!Number.isInteger(config.output.quality) || config.output.quality < 1 || config.output.quality > 100) throw new Error('output.quality 必须是 1 到 100 的整数');
  if (typeof config.output.background !== 'string' || !config.output.background) throw new Error('output.background 必须是颜色字符串');

  for (const exercise of config.exercises) {
    if (!exercise.exerciseId || !exercise.name) throw new Error('每个动作必须包含 exerciseId 和 name');
    if (!Number.isInteger(exercise.row) || exercise.row < 1 || exercise.row > config.layout.rows) throw new Error(`${exercise.exerciseId} 的 row 超出布局范围`);
    if (!Number.isInteger(exercise.column) || exercise.column < 1 || exercise.column > config.layout.columns) throw new Error(`${exercise.exerciseId} 的 column 超出布局范围`);
  }
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const configPath = process.argv[2];
  if (!configPath) {
    console.error('用法: npm run media:process -- <批次配置文件>');
    process.exitCode = 1;
  } else {
    try {
      await processExerciseSheet(configPath);
    } catch (error) {
      console.error(`批次处理失败: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    }
  }
}
