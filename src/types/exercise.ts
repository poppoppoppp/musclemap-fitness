import type { Difficulty, ExerciseCategory, ForceType, MechanicType } from './common';

export type ExerciseWeightType = 'external_weight' | 'bodyweight' | 'bodyweight_added' | 'bodyweight_assisted';

export type ExerciseLaterality = 'unilateral' | 'bilateral' | 'alternating';

export interface ExerciseMedia {
  startImage?: string;
  peakImage?: string;
  startCaption?: string;
  peakCaption?: string;
  returnCaption?: string;
}

export interface ExerciseTroubleshootingItem {
  id: string;
  title: string;
  quickFix: string;
  causes: string[];
  fixes: string[];
  image?: string | null;
}

export interface ExerciseInstructions {
  startPosition: string;
  execution: string;
  returnProcess: string;
  rangeOfMotion: string;
  notes?: string[];
}

export interface ExerciseAlternativeDetail {
  exerciseId: string;
  reason: string;
}

export interface PostureExerciseDetails {
  startPosition: string;
  breathing: string;
  regression: string | null;
  progression: string | null;
  stopConditions: string[];
  sourceSummary: string;
  sourceTimestamp: string | null;
  verificationStatus: string;
  dataConfidence: string;
}

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
  weightType: ExerciseWeightType;
  steps: string[];
  cues: string[];
  commonMistakes: string[];
  alternatives: string[];
  tags: string[];
  primaryRegion?: string;
  laterality?: ExerciseLaterality;
  media?: ExerciseMedia;
  keyCues?: string[];
  troubleshooting?: ExerciseTroubleshootingItem[];
  instructions?: ExerciseInstructions;
  breathing?: string;
  alternativeDetails?: ExerciseAlternativeDetail[];
  postureDetails?: PostureExerciseDetails;
}
