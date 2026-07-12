import type { Difficulty, ExerciseCategory, ForceType, MechanicType } from '../../types/common';
import type { Exercise, ExerciseWeightType } from '../../types/exercise';

type CatalogExerciseOptions = {
  secondaryMuscles?: string[];
  difficulty?: Difficulty;
  force: ForceType;
  mechanic: MechanicType;
  category?: ExerciseCategory;
  tags?: string[];
  weightType?: ExerciseWeightType;
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
    weightType: options.weightType ?? (options.category === 'bodyweight' ? 'bodyweight' : 'external_weight'),
    steps: [],
    cues: [],
    commonMistakes: [],
    alternatives: [],
    tags: options.tags ?? []
  };
}
