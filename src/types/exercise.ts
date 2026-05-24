import type { Difficulty, ExerciseCategory, ForceType, MechanicType } from './common';

export interface Exercise {
  id: string;
  name: string;
  nameEn: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  difficulty: Difficulty;
  force: ForceType;
  mechanic: MechanicType;
  category: ExerciseCategory;
  steps: string[];
  cues: string[];
  commonMistakes: string[];
  alternatives: string[];
  tags: string[];
}
