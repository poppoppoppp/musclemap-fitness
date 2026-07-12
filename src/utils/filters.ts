import type { Exercise } from '../types/exercise';
import { muscles } from '../data/muscles';

export interface ExerciseFilters {
  query: string;
  bodyPart?: string;
  muscleId: string;
  equipment: string;
}

export function filterExercises(exercises: Exercise[], filters: ExerciseFilters): Exercise[] {
  const query = filters.query.trim().toLowerCase();

  return exercises.filter((exercise) => {
    const matchesQuery =
      !query ||
      [exercise.name, exercise.nameEn, ...exercise.tags, ...exercise.equipment]
        .join(' ')
        .toLowerCase()
        .includes(query);

    const matchesMuscle =
      !filters.muscleId ||
      exercise.primaryMuscles.includes(filters.muscleId) ||
      exercise.secondaryMuscles.includes(filters.muscleId);

    const matchesBodyPart =
      !filters.bodyPart ||
      (filters.bodyPart === '全身'
        ? exercise.tags.includes('全身复合')
        : [...exercise.primaryMuscles, ...exercise.secondaryMuscles].some(
            (muscleId) => muscleBodyPartById.get(muscleId) === filters.bodyPart
          ));

    const matchesEquipment = !filters.equipment || exercise.equipment.includes(filters.equipment);

    return matchesQuery && matchesBodyPart && matchesMuscle && matchesEquipment;
  });
}

const muscleBodyPartById = new Map(muscles.map((muscle) => [muscle.id, muscle.bodyPart]));
