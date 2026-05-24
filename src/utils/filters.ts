import type { Exercise } from '../types/exercise';

export interface ExerciseFilters {
  query: string;
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

    const matchesEquipment = !filters.equipment || exercise.equipment.includes(filters.equipment);

    return matchesQuery && matchesMuscle && matchesEquipment;
  });
}
