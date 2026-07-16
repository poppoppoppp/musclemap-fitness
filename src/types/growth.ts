export type GrowthSection = 'training' | 'body' | 'posture';
export type GrowthTimeRange = '4w' | '3m' | '6m' | 'all';
export type BodyMetricId = 'weight' | 'waist' | 'arm';

export interface GrowthTrendPoint {
  label: string;
  value: number;
  detail?: string;
}

export interface TrainingOverviewMetrics {
  completedWorkouts: number;
  activeWeeks: number;
  averagePerActiveWeek: number;
}

export interface TrainingOverviewResult {
  current: TrainingOverviewMetrics;
  previous: TrainingOverviewMetrics | null;
  changes: TrainingOverviewMetrics | null;
}

export interface TrainingDistributionItem {
  id: 'chest' | 'back' | 'shoulders' | 'legs' | 'arms' | 'core';
  label: string;
  sets: number;
  exercises: Array<{ exerciseId: string; label: string; sets: number }>;
}

export interface StrengthTrendPoint {
  date: string;
  value: number;
  reps?: number;
  setIndex: number;
  sourceWeight?: number;
  bodyWeight?: number;
  modifierWeight?: number;
}

export interface StrengthTrend {
  exerciseId: string;
  label: string;
  weightType: import('./exercise').ExerciseWeightType;
  lastRecordedAt: string;
  points: StrengthTrendPoint[];
  status: 'empty' | 'single' | 'trend';
  missingBodyWeightCount: number;
}

export interface BodyMetricDefinition {
  id: BodyMetricId;
  label: string;
  unit: 'kg' | 'cm';
}
