import type { PostureCompleteness, PostureDataQuality } from './posture';

export type PosturePlanStatus = 'active' | 'paused' | 'completed';
export type PostureAssessmentKind = 'initial' | 'reassessment';
export type PostureGoal = 'comfort' | 'mobility' | 'training' | 'appearance';
export type PostureRegion = 'shoulder_scapula' | 'pelvis_lumbopelvic' | 'cervical_head' | 'upper_posture' | 'thoracic' | 'winged_scapula' | 'ribcage_breathing' | 'orofacial';
export type PostureRiskFlag = 'numbness' | 'radiating-pain' | 'dizziness' | 'chest-pain' | 'breathing-difficulty' | 'recent-trauma';
export type PostureSymptomDuration = 'lt-1m' | '1-3m' | 'gt-3m';
export type PostureEquipment = 'bodyweight' | 'mat' | 'wall' | 'resistance-band' | 'dumbbell' | 'cable' | 'foam-roller' | 'towel';
export type PostureWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface PostureAssessmentInput {
  kind: PostureAssessmentKind;
  goals: PostureGoal[];
  regions: PostureRegion[];
  symptomDuration: PostureSymptomDuration;
  discomfort: number;
  functionScore: number;
  riskFlags: PostureRiskFlag[];
  equipment: PostureEquipment[];
  sessionMinutes: number;
  weeklyFrequency: number;
  planId?: string;
}

export interface PostureAssessment extends PostureAssessmentInput {
  id: string;
  createdAt: string;
}

export interface PostureAssessmentDraft {
  step: number;
  goals?: readonly PostureGoal[];
  regions?: readonly PostureRegion[];
  symptomDuration?: PostureSymptomDuration;
  discomfort?: number;
  functionScore?: number;
  riskFlags?: readonly PostureRiskFlag[];
  equipment?: readonly PostureEquipment[];
  sessionMinutes?: number;
  weeklyFrequency?: number;
}

export interface PosturePlanQualitySnapshot {
  dataQuality: PostureDataQuality;
  completeness: PostureCompleteness;
  sourceUrl: string;
}

export interface PosturePlanInput {
  protocolId: string;
  assessmentId: string;
  startDate: string;
  durationWeeks: number;
  weeklyFrequency: number;
  weekdays: PostureWeekday[];
  recommendationReasons: string[];
  qualitySnapshot: PosturePlanQualitySnapshot;
}

export interface PosturePlan extends PosturePlanInput {
  id: string;
  status: PosturePlanStatus;
  createdAt: string;
  updatedAt: string;
  reassessmentIds: string[];
  pausedAt?: string;
  completedAt?: string;
}

export interface PostureSessionFeedback {
  id: string;
  planId: string;
  workoutLogId: string;
  discomfortBefore: number;
  discomfortAfter?: number;
  difficulty?: 'easy' | 'appropriate' | 'hard';
  status: 'completed' | 'aborted';
  abortReason?: string;
  note?: string;
  createdAt: string;
}

export interface PosturePlanWorkoutContext {
  planId: string;
  weekIndex: number;
  scheduledDate: string;
}
