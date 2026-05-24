import type { BodyView } from './common';

export interface Muscle {
  id: string;
  nameZh: string;
  nameEn: string;
  bodyPart: string;
  region: string;
  description: string;
  function: string;
  trainingValue: string;
  commonMistakes: string[];
  confusions: string[];
  exerciseIds: string[];
  mapRegionIds: string[];
}

export interface MuscleMapRegion {
  id: string;
  muscleId: string;
  view: BodyView;
  label: string;
}
