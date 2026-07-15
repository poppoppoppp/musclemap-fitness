import { access } from 'node:fs/promises';
import path from 'node:path';

import { exercises, getExerciseById } from '../../../src/data/exercises.ts';
import { getProtocolExerciseSteps, getVisiblePostureProtocols } from '../../../src/utils/postureProtocols.ts';

import { getMediaStatus } from './matcher.ts';
import type { AppExerciseRecord } from './types.ts';

export async function collectRuntimeExercises(projectRoot: string): Promise<AppExerciseRecord[]> {
  const visiblePostureIds = [...new Set(getVisiblePostureProtocols().flatMap((protocol) => getProtocolExerciseSteps(protocol).flatMap((step) => step.exerciseId ? [step.exerciseId] : [])))];
  const postureExercises = visiblePostureIds.flatMap((exerciseId) => {
    const exercise = getExerciseById(exerciseId);
    return exercise ? [exercise] : [];
  });
  const records = [
    ...exercises.map((exercise) => ({ exercise, sourceType: 'core' as const })),
    ...postureExercises.map((exercise) => ({ exercise, sourceType: 'posture' as const }))
  ];
  const unique = new Map(records.map((record) => [record.exercise.id, record]));

  return Promise.all([...unique.values()].sort((left, right) => left.exercise.id.localeCompare(right.exercise.id)).map(async ({ exercise, sourceType }) => {
    const mediaStatus = await getMediaStatus(projectRoot, exercise.id);
    return {
      exerciseId: exercise.id,
      name: exercise.name,
      nameEn: exercise.nameEn,
      equipment: [...exercise.equipment],
      primaryMuscles: [...exercise.primaryMuscles],
      secondaryMuscles: [...exercise.secondaryMuscles],
      category: exercise.category,
      force: exercise.force ?? null,
      mechanic: exercise.mechanic ?? null,
      laterality: exercise.laterality ?? null,
      tags: [...exercise.tags],
      sourceType,
      hasStartImage: mediaStatus === 'complete' || mediaStatus === 'partial' && await fileStageExists(projectRoot, exercise.id, 'start'),
      hasPeakImage: mediaStatus === 'complete' || mediaStatus === 'partial' && await fileStageExists(projectRoot, exercise.id, 'peak'),
      mediaStatus
    };
  }));
}

async function fileStageExists(projectRoot: string, exerciseId: string, stage: 'start' | 'peak') {
  try {
    await access(path.join(projectRoot, 'public', 'exercise-media', exerciseId, `${stage}.webp`));
    return true;
  } catch {
    return false;
  }
}
