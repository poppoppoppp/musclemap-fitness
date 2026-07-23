export type PostureItemStatus = 'ready' | 'conditionally_ready' | 'metadata_only';
export type PostureDataQuality = 'high' | 'mediumHigh' | 'medium' | 'mediumLow' | 'low';
export type PostureProtocolTier = 'core' | 'adjunct' | 'secondary';
export type PostureCompleteness = 'complete' | 'partial' | 'limited';
export type PostureVisibility = 'primary' | 'secondary' | 'internal';
export type PostureDoseConfidence = 'high' | 'medium' | 'mediumLow' | 'low';

export interface PostureCategory {
  id: string;
  name: string;
  description: string;
}

export interface PostureExerciseFamily {
  id: string;
  name: string;
  variantIds: string[];
}

export interface PostureObservation {
  id: string;
  name: string;
  purpose: string;
  limitation: string;
}

export interface PostureIssue {
  id: string;
  name: string;
  description: string;
}

export interface PostureDose {
  reps?: number | string;
  repsPerSide?: number | string;
  sets?: number | string;
  durationSeconds?: number;
  durationRangeSeconds?: [number, number];
  holdSeconds?: number;
  frequency?: string;
  load?: string;
  mode?: string;
  source?: 'source' | 'suspectedOnScreenText';
  confidence?: PostureDoseConfidence;
  notes?: string;
}

export interface PostureProtocolStep {
  id: string;
  order: number;
  groupKey: string;
  groupLabel: string;
  kind: 'exercise' | 'observation';
  exerciseId?: string;
  observationId?: string;
  optional?: boolean;
  selectionGroupId?: string;
  dose?: PostureDose;
  breathing?: string;
  notes?: string[];
}

export interface PostureProtocolSource {
  id: string;
  title: string;
  category: string;
  tags: string[];
  protocolTier: PostureProtocolTier;
  completeness: PostureCompleteness;
  dataQuality: PostureDataQuality;
  targetIssues: string[];
  userFacingGoal: string;
  steps: PostureProtocolStep[];
  recommendedFrequency?: string;
  sourceClaims: string[];
  limitations: string[];
  visibility: PostureVisibility;
  sourceUrl?: string;
  theoryIds?: string[];
  guidanceIds?: string[];
}

export interface PostureStandardExerciseSource {
  id: string;
  name: string;
  category: string;
  equipment: string[];
  aliases?: string[];
  libraryExerciseId?: string;
  legacyIds?: string[];
  familyId?: string;
  variantOf?: string;
  difficultyRank?: number;
  startPosition?: string;
  instructions?: string[];
  breathing?: string;
  cues?: string[];
  commonErrors?: string[];
  stopConditions?: string[];
  visualReviewRequired?: boolean;
  visualReviewNote?: string;
  dataQuality: PostureDataQuality;
}

export interface PostureTheoryMaterialSource {
  id: string;
  title: string;
  sourceUrl?: string;
  visibility: PostureVisibility;
  content: string[];
  limitations: string[];
}

export interface PostureGuidanceMaterialSource {
  id: string;
  title: string;
  sourceUrl?: string;
  visibility: PostureVisibility;
  content: string[];
}

export interface PostureDatasetSource {
  schemaVersion: string;
  datasetName: string;
  language?: string;
  categories: PostureCategory[];
  exerciseFamilies: PostureExerciseFamily[];
  observations: PostureObservation[];
  standardExercises: PostureStandardExerciseSource[];
  protocols: PostureProtocolSource[];
  theoryMaterials: PostureTheoryMaterialSource[];
  guidanceMaterials: PostureGuidanceMaterialSource[];
}

// Compatibility model retained for v0.1 workout snapshots and the existing
// exercise-detail adapter. New protocol content uses PostureDose and steps.
export interface PosturePrescription {
  sets: number | null;
  reps: number | null;
  durationSeconds: number | null;
  restSeconds: number | null;
  frequencyText: string | null;
  rawText: string;
}

export interface PostureProtocolExerciseItem {
  exerciseId: string;
  order: number;
  roleInProtocol: string;
  prescription: PosturePrescription;
  roleExplanation: string;
  specialCues: string[];
  sourceOriginalText: string;
  includeByDefault?: boolean;
  appEligibility?: string;
}

export interface PostureProtocol extends PostureProtocolSource {
  name: string;
  status: PostureItemStatus;
  appEligibility: string;
  targetIssueIds: string[];
  summary: string;
  sourceOriginal: Record<string, unknown>;
  exerciseItems: PostureProtocolExerciseItem[];
}

export interface PostureStandardExercise extends PostureStandardExerciseSource {
  aliases: string[];
  sourceOriginal: {
    summary: string;
    timestamp: string | null;
  };
  standardized: {
    startPosition: string;
    executionSteps: string[];
    breathing: string;
    keyCues: string[];
    commonErrors: string[];
    regression: string | null;
    progression: string | null;
    stopConditions: string[];
  };
  verificationStatus: string;
  dataConfidence: string;
  appEligibility?: string;
  appEligibilityReason?: string;
}

export interface PostureTheoryMaterial extends PostureTheoryMaterialSource {
  name?: string;
  status?: PostureItemStatus;
  appEligibility?: string;
  targetIssueIds?: string[];
  sourceOriginal?: Record<string, unknown> | null;
  standardizedSummary?: Record<string, unknown> | null;
  verificationStatus?: string;
}

export interface PostureGuidanceMaterial extends PostureGuidanceMaterialSource {
  name?: string;
  status?: PostureItemStatus;
  appEligibility?: string;
  targetIssueIds?: string[];
  sourceOriginal?: Record<string, unknown> | null;
  standardizedSummary?: Record<string, unknown> | null;
}

export interface PostureDataset extends Omit<PostureDatasetSource, 'standardExercises' | 'protocols' | 'theoryMaterials' | 'guidanceMaterials'> {
  postureIssues: PostureIssue[];
  standardExercises: PostureStandardExercise[];
  protocols: PostureProtocol[];
  theoryMaterials: PostureTheoryMaterial[];
  guidanceMaterials: PostureGuidanceMaterial[];
}

export interface VisiblePostureIssue extends PostureIssue {
  protocolCount: number;
}

export interface PostureProtocolExerciseSnapshot {
  instanceId: string;
  exerciseId: string;
  nameSnapshot: string;
  order: number;
  roleInProtocol: string;
  roleExplanation: string;
  prescription: PosturePrescription;
  specialCues: string[];
  sourceOriginalText: string;
  groupKey?: string;
  groupLabel?: string;
  dose?: PostureDose;
  doseConfidence?: PostureDoseConfidence;
  visualReviewRequired?: boolean;
  visualReviewNote?: string;
}

export interface PostureProtocolStepSnapshot {
  id: string;
  order: number;
  groupKey: string;
  groupLabel: string;
  kind: 'exercise' | 'observation';
  titleSnapshot: string;
  includedInWorkout: boolean;
  exerciseId?: string;
  exerciseInstanceId?: string;
  observationId?: string;
  optional?: boolean;
  selectionGroupId?: string;
  dose?: PostureDose;
  notes?: string[];
  purposeSnapshot?: string;
  limitationSnapshot?: string;
  visualReviewRequired?: boolean;
  visualReviewNote?: string;
}

export interface PostureProtocolWorkoutSnapshot {
  instanceId: string;
  sourceProtocolId: string;
  nameSnapshot: string;
  targetIssueNamesSnapshot: string[];
  limitationsSnapshot?: string[];
  sourceSnapshot?: 'posture-screening' | 'posture-library';
  addedAt: string;
  isModified: boolean;
  order: number;
  exerciseInstanceIds: string[];
  exerciseSnapshots: PostureProtocolExerciseSnapshot[];
  stepSnapshots?: PostureProtocolStepSnapshot[];
}
