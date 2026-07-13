export type PostureItemStatus = 'ready' | 'conditionally_ready' | 'metadata_only';

export interface PostureIssue {
  id: string;
  name: string;
  description: string;
}

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

export interface PostureProtocol {
  id: string;
  name: string;
  status: PostureItemStatus;
  appEligibility: string;
  targetIssueIds: string[];
  summary: string;
  sourceOriginal: Record<string, unknown>;
  exerciseItems: PostureProtocolExerciseItem[];
  theoryIds?: string[];
  guidanceIds?: string[];
  verificationStatus?: string;
  notes?: string[];
  recoveryMissing?: string[];
}

export interface PostureStandardExercise {
  id: string;
  name: string;
  aliases: string[];
  category: string;
  equipment: string[];
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

export interface PostureTheoryMaterial {
  id: string;
  name: string;
  status: PostureItemStatus;
  appEligibility: string;
  targetIssueIds: string[];
  sourceOriginal: Record<string, unknown> | null;
  standardizedSummary: Record<string, unknown> | null;
  verificationStatus?: string;
}

export interface PostureGuidanceMaterial {
  id: string;
  name: string;
  status: PostureItemStatus;
  appEligibility: string;
  targetIssueIds: string[];
  sourceOriginal: Record<string, unknown> | null;
  standardizedSummary: Record<string, unknown> | null;
}

export interface PostureDataset {
  schemaVersion: string;
  datasetName: string;
  generatedAt?: string;
  language?: string;
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
}

export interface PostureProtocolWorkoutSnapshot {
  instanceId: string;
  sourceProtocolId: string;
  nameSnapshot: string;
  targetIssueNamesSnapshot: string[];
  addedAt: string;
  isModified: boolean;
  order: number;
  exerciseInstanceIds: string[];
  exerciseSnapshots: PostureProtocolExerciseSnapshot[];
}
