import { exercises } from '../data/exercises';
import { muscles } from '../data/muscles';
import type { Exercise } from '../types/exercise';

export type ExerciseCategoryId = 'all' | 'chest' | 'back' | 'shoulders' | 'arms' | 'core' | 'legs';

type ExerciseCategory = {
  id: ExerciseCategoryId;
  label: string;
  bodyPart?: string;
};

export type RelatedExercise = {
  exercise: Exercise;
  matchType: 'primary' | 'secondary';
};

export const exerciseCategories: ExerciseCategory[] = [
  { id: 'all', label: '全部' },
  { id: 'chest', label: '胸', bodyPart: '胸部' },
  { id: 'back', label: '背', bodyPart: '背部' },
  { id: 'shoulders', label: '肩', bodyPart: '肩部' },
  { id: 'arms', label: '手臂', bodyPart: '手臂' },
  { id: 'core', label: '核心', bodyPart: '核心' },
  { id: 'legs', label: '腿', bodyPart: '腿部' }
];

const muscleById = new Map(muscles.map((muscle) => [muscle.id, muscle]));
const categoryMuscleIds = new Map(
  exerciseCategories.map((category) => [
    category.id,
    category.bodyPart ? new Set(muscles.filter((muscle) => muscle.bodyPart === category.bodyPart).map((muscle) => muscle.id)) : null
  ])
);

export function filterExercises(query: string, categoryId: ExerciseCategoryId): Exercise[] {
  const normalizedQuery = normalize(query);
  const muscleIds = categoryMuscleIds.get(categoryId) ?? null;

  return exercises
    .map((exercise, index) => ({
      exercise,
      index,
      categoryRank: getCategoryRank(exercise, muscleIds)
    }))
    .filter(({ exercise, categoryRank }) => categoryRank < 2 && matchesSearch(exercise, normalizedQuery))
    .sort((a, b) => a.categoryRank - b.categoryRank || a.index - b.index)
    .map(({ exercise }) => exercise);
}

export function getRelatedExercises(muscleId: string, limit?: number): RelatedExercise[] {
  const related = exercises
    .map((exercise, index) => ({
      exercise,
      index,
      matchType: exercise.primaryMuscles.includes(muscleId)
        ? ('primary' as const)
        : exercise.secondaryMuscles.includes(muscleId)
          ? ('secondary' as const)
          : null
    }))
    .filter((item): item is typeof item & { matchType: 'primary' | 'secondary' } => item.matchType !== null)
    .sort((a, b) => Number(a.matchType === 'secondary') - Number(b.matchType === 'secondary') || a.index - b.index)
    .map(({ exercise, matchType }) => ({ exercise, matchType }));

  return typeof limit === 'number' ? related.slice(0, limit) : related;
}

function getCategoryRank(exercise: Exercise, muscleIds: Set<string> | null) {
  if (!muscleIds) return 0;
  if (exercise.primaryMuscles.some((muscleId) => muscleIds.has(muscleId))) return 0;
  if (exercise.secondaryMuscles.some((muscleId) => muscleIds.has(muscleId))) return 1;
  return 2;
}

function matchesSearch(exercise: Exercise, normalizedQuery: string) {
  if (!normalizedQuery) return true;

  const muscleTerms = [...exercise.primaryMuscles, ...exercise.secondaryMuscles].flatMap((muscleId) => {
    const muscle = muscleById.get(muscleId);
    return muscle ? [muscle.nameZh, muscle.nameEn] : [];
  });
  const terms = [exercise.name, exercise.nameEn, ...exercise.tags, ...exercise.equipment, ...muscleTerms];
  return terms.some((term) => normalize(term).includes(normalizedQuery));
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}
