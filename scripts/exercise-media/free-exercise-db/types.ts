export type MediaStatus = 'complete' | 'partial' | 'missing';
export type MatchTier = 'already-covered' | 'exact' | 'high-confidence' | 'manual-review' | 'unmatched';

export interface AppExerciseRecord {
  exerciseId: string;
  name: string;
  nameEn: string;
  equipment: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  category: string;
  force: string | null;
  mechanic: string | null;
  laterality: string | null;
  tags: string[];
  sourceType: 'core' | 'posture';
  hasStartImage: boolean;
  hasPeakImage: boolean;
  mediaStatus: MediaStatus;
}

export interface FreeDbExercise {
  id: string;
  name: string;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  category: string;
  force: string | null;
  mechanic: string | null;
  instructions: string[];
  images: string[];
}

export interface MatchConflict {
  code: 'equipment' | 'laterality' | 'position' | 'angle' | 'variant' | 'primary-muscle' | 'force' | 'movement-pattern' | 'posture-context' | 'images';
  message: string;
}

export interface ScoreBreakdown {
  nameScore: number;
  equipmentScore: number;
  primaryMuscleScore: number;
  secondaryMuscleScore: number;
  attributeScore: number;
  conflictPenalty: number;
  finalConfidence: number;
  matchedAlias: string | null;
  keyMatches: string[];
  keyDifferences: string[];
  conflicts: MatchConflict[];
}

export interface CandidateMatch {
  sourceId: string;
  sourceName: string;
  sourceEquipment: string | null;
  sourcePrimaryMuscles: string[];
  sourceSecondaryMuscles: string[];
  sourceCategory: string;
  sourceForce: string | null;
  sourceMechanic: string | null;
  imageCount: number;
  startImageUrl: string | null;
  peakImageUrl: string | null;
  humanRejected: boolean;
  score: ScoreBreakdown;
}

export interface MatchRecord {
  exercise: AppExerciseRecord;
  tier: MatchTier;
  confidence: number;
  tierReason: string;
  bestCandidate: CandidateMatch | null;
  topCandidates: CandidateMatch[];
  rejectedCandidates: CandidateMatch[];
  recommendedAction: string;
  appliedOverride: string | null;
  overrideStatus: 'accepted' | 'forced' | 'reuse' | null;
  reuseDecision: ReuseDecision | null;
  note: string | null;
}

export interface ReuseDecision {
  baseExerciseId: string;
  sourceId: string;
  reason: string;
  differences: string;
}

export interface ManualOverrides {
  version: 1;
  updatedAt: string | null;
  accepted: Record<string, string>;
  rejected: Record<string, string[]>;
  forced: Record<string, string>;
  reuse: Record<string, ReuseDecision>;
  notes: Record<string, string>;
}

export interface SourceMetadata {
  downloadedAt: string;
  sourceUrl: string;
  commit: string;
  sha256: string;
  recordCount: number;
  license: 'Unlicense';
  cacheFile: string;
  cacheFallback: boolean;
}
