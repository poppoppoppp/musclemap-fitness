import { expect, test } from '@playwright/test';
import { equipmentOptions } from '../data/equipment';
import { exercises } from '../data/exercises';
import { muscles } from '../data/muscles';
import { filterExercises as filterPickerExercises, getRelatedExercises } from '../utils/exerciseFilters';
import { filterExercises as filterLibraryExercises } from '../utils/filters';

const existingExerciseIds = [
  'lat-pulldown', 'pull-up', 'one-arm-dumbbell-row', 'seated-row', 'barbell-row', 'chest-supported-row',
  'straight-arm-pulldown', 'face-pull', 'bent-over-reverse-fly', 'reverse-fly', 'dumbbell-shrug',
  'barbell-shrug', 'back-extension', 'deadlift', 'romanian-deadlift', 't-bar-row', 'wide-grip-seated-row',
  'narrow-grip-pulldown', 'y-raise', 'superman', 'push-up', 'inverted-row', 'towel-row', 'prone-w-raise',
  'barbell-bench-press', 'dumbbell-bench-press', 'machine-chest-press', 'cable-chest-fly',
  'dumbbell-shoulder-press', 'machine-shoulder-press', 'dumbbell-lateral-raise', 'cable-lateral-raise',
  'squat', 'leg-press', 'leg-extension', 'leg-curl', 'lunge', 'standing-calf-raise', 'dumbbell-curl',
  'hammer-curl', 'cable-triceps-pushdown', 'lying-triceps-extension', 'plank', 'side-plank',
  'russian-twist', 'crunch', 'dead-bug', 'hanging-leg-raise'
] as const;

const allowedDifficulties = new Set(['beginner', 'intermediate', 'advanced']);
const allowedForces = new Set(['pull', 'push', 'static', 'hinge']);
const allowedMechanics = new Set(['compound', 'isolation']);
const allowedCategories = new Set(['strength', 'mobility', 'activation', 'bodyweight']);

test('catalog contains 260 unique exercises and preserves every existing exercise', () => {
  expect(exercises).toHaveLength(260);
  expect(new Set(exercises.map((exercise) => exercise.id)).size).toBe(exercises.length);
  expect(new Set(exercises.map((exercise) => exercise.name)).size).toBe(exercises.length);
  expect(exercises.every((exercise) => exercise.id.trim() && exercise.name.trim() && exercise.nameEn.trim())).toBe(true);

  const ids = new Set(exercises.map((exercise) => exercise.id));
  for (const existingId of existingExerciseIds) expect(ids.has(existingId)).toBe(true);
});

test('catalog references only registered muscles, equipment and enum values', () => {
  const muscleIds = new Set(muscles.map((muscle) => muscle.id));
  const equipment = new Set<string>(equipmentOptions);

  for (const exercise of exercises) {
    expect(exercise.primaryMuscles.length, `${exercise.id} needs a primary muscle`).toBeGreaterThan(0);
    expect(exercise.equipment.length, `${exercise.id} needs equipment`).toBeGreaterThan(0);
    for (const muscleId of [...exercise.primaryMuscles, ...exercise.secondaryMuscles]) {
      expect(muscleIds.has(muscleId), `${exercise.id} references ${muscleId}`).toBe(true);
    }
    for (const item of exercise.equipment) {
      expect(equipment.has(item), `${exercise.id} references ${item}`).toBe(true);
    }
    expect(allowedDifficulties.has(exercise.difficulty), `${exercise.id} difficulty`).toBe(true);
    expect(allowedForces.has(exercise.force), `${exercise.id} force`).toBe(true);
    expect(allowedMechanics.has(exercise.mechanic), `${exercise.id} mechanic`).toBe(true);
    expect(allowedCategories.has(exercise.category), `${exercise.id} category`).toBe(true);
  }
});

test('catalog covers every requested training area', () => {
  const primaryMuscleIds = new Set(exercises.flatMap((exercise) => exercise.primaryMuscles));
  for (const muscleId of [
    'pectoralis-major', 'latissimus-dorsi', 'anterior-deltoid', 'lateral-deltoid', 'rear-deltoid',
    'biceps-brachii', 'triceps-brachii', 'forearm-flexors', 'forearm-extensors', 'rectus-abdominis',
    'gluteus-maximus', 'quadriceps', 'hamstrings', 'calves', 'hip-adductors', 'hip-abductors'
  ]) {
    expect(primaryMuscleIds.has(muscleId), `missing primary coverage for ${muscleId}`).toBe(true);
  }

  expect(exercises.filter((exercise) => exercise.tags.includes('全身复合')).length).toBeGreaterThanOrEqual(10);
});

test('shared filters search expanded names, aliases, equipment and muscle mappings', () => {
  for (const query of ['卧推', '侧平举', '下拉', '绳索', '哑铃', '单臂']) {
    expect(filterPickerExercises(query, 'all').length, `picker query ${query}`).toBeGreaterThan(0);
  }

  expect(filterPickerExercises('上斜卧推', 'chest').some((exercise) => exercise.id === 'incline-barbell-bench-press')).toBe(true);
  expect(filterPickerExercises('前臂', 'arms').some((exercise) => exercise.id === 'barbell-wrist-curl')).toBe(true);
  expect(filterPickerExercises('内收肌', 'legs').some((exercise) => exercise.id === 'machine-hip-adduction')).toBe(true);
  expect(filterPickerExercises('外展肌', 'legs').some((exercise) => exercise.id === 'machine-hip-abduction')).toBe(true);
  expect(getRelatedExercises('hip-adductors').some(({ exercise }) => exercise.id === 'cable-hip-adduction')).toBe(true);

  expect(filterLibraryExercises(exercises, { query: '单臂', muscleId: '', equipment: '' }).length).toBeGreaterThan(0);
  expect(filterLibraryExercises(exercises, { query: '', muscleId: 'forearm-flexors', equipment: '' }).length).toBeGreaterThan(0);
  expect(filterLibraryExercises(exercises, { query: '', muscleId: '', equipment: '壶铃' }).length).toBeGreaterThan(0);
  expect(filterLibraryExercises(exercises, { query: '', bodyPart: '全身', muscleId: '', equipment: '' })).toHaveLength(12);
});
