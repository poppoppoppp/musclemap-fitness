import { expect, test } from '@playwright/test';
import { postureDataset } from '../utils/postureProtocols';
import { validatePostureDataset } from '../utils/postureDatasetValidation';
import { getVisiblePostureProtocols } from '../utils/postureProtocols';
import { exercises, getExerciseById } from '../data/exercises';

test('loads the complete v0.2 posture exercise registry', () => {
  expect(postureDataset.schemaVersion).toBe('2.0.0');
  expect(postureDataset.standardExercises).toHaveLength(32);
});

test('validates the complete dataset and every reference', () => {
  expect(postureDataset.categories).toHaveLength(8);
  expect(postureDataset.protocols).toHaveLength(12);
  expect(postureDataset.theoryMaterials).toHaveLength(2);
  expect(postureDataset.guidanceMaterials).toHaveLength(1);
  expect(postureDataset.observations).toHaveLength(4);
  expect(validatePostureDataset(postureDataset)).toEqual([]);
});

test('reports duplicate IDs and missing step references', () => {
  const duplicateProtocol = structuredClone(postureDataset);
  duplicateProtocol.protocols.push(structuredClone(duplicateProtocol.protocols[0]));
  expect(validatePostureDataset(duplicateProtocol).map(({ code }) => code)).toContain('duplicate-protocol-id');

  const missingExercise = structuredClone(postureDataset);
  missingExercise.protocols[0].steps[0].exerciseId = 'EX_MISSING';
  expect(validatePostureDataset(missingExercise).map(({ code }) => code)).toContain('missing-exercise-reference');

  const missingObservation = structuredClone(postureDataset);
  missingObservation.protocols[2].steps[0].observationId = 'OBS_MISSING';
  expect(validatePostureDataset(missingObservation).map(({ code }) => code)).toContain('missing-observation-reference');
});

test('preserves missing doses and rejects unsafe public goals', () => {
  const cervical = postureDataset.protocols.find(({ id }) => id === 'CERVICAL_002');
  expect(cervical?.steps.every(({ dose }) => dose && Object.keys(dose).length === 0)).toBe(true);

  const unsafe = structuredClone(postureDataset);
  unsafe.protocols[7].userFacingGoal = unsafe.protocols[7].sourceClaims[0];
  expect(validatePostureDataset(unsafe).map(({ code }) => code)).toContain('source-claim-used-as-goal');
});

test('resolves every stable exercise ID without adding posture actions to the ordinary catalog', () => {
  expect(getVisiblePostureProtocols(postureDataset)).toHaveLength(12);
  for (const { id } of postureDataset.standardExercises) {
    expect(getExerciseById(id), id).toBeDefined();
    expect(exercises.some((exercise) => exercise.id === id), id).toBe(false);
  }
});

test('reuses ordinary exercise content and resolves v0.1 legacy IDs', () => {
  const bridge = getExerciseById('EX_GLUTE_BRIDGE');
  const libraryBridge = getExerciseById('glute-bridge');
  expect(bridge?.steps).toEqual(libraryBridge?.steps);

  expect(getExerciseById('quadruped-scapular-protraction-stability')?.name).toBe('四点跪姿肩胛前伸控制');
  expect(getExerciseById('band-assisted-scapular-posterior-tilt-raise')?.name).toBe('弹力带辅助肩胛后倾上举');
  expect(getExerciseById('kneeling-posterior-thoracic-expansion-breathing')?.name).toBe('跪姿胸椎后侧扩张呼吸');
});
