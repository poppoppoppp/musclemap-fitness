import type { Difficulty, ExerciseCategory, ForceType, MechanicType } from '../../types/common';
import type { Exercise } from '../../types/exercise';

type CatalogExerciseOptions = {
  secondaryMuscles?: string[];
  difficulty?: Difficulty;
  force: ForceType;
  mechanic: MechanicType;
  category?: ExerciseCategory;
  tags?: string[];
};

export function catalogExercise(
  id: string,
  name: string,
  nameEn: string,
  primaryMuscles: string[],
  equipment: string[],
  options: CatalogExerciseOptions
): Exercise {
  return {
    id,
    name,
    nameEn,
    primaryMuscles,
    secondaryMuscles: options.secondaryMuscles ?? [],
    equipment,
    difficulty: options.difficulty ?? 'intermediate',
    force: options.force,
    mechanic: options.mechanic,
    category: options.category ?? 'strength',
    steps: [],
    cues: [],
    commonMistakes: [],
    alternatives: [],
    tags: options.tags ?? []
  };
}
