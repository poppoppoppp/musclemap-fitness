export type GrowthSection = 'training' | 'body';
export type GrowthTimeRange = '4w' | '3m' | '6m' | 'all';
export type BodyMetricId = 'weight' | 'waist' | 'arm';

export interface GrowthTrendPoint {
  label: string;
  value: number;
}

export interface TrainingOverviewMetrics {
  completedWorkouts: number;
  activeWeeks: number;
  averagePerActiveWeek: number;
}

export interface TrainingDistributionItem {
  id: 'chest' | 'back' | 'shoulders' | 'legs' | 'arms';
  label: string;
  sets: number;
}

export interface StrengthTrend {
  id: string;
  label: string;
  currentValue: number;
  change: number;
  unit: 'kg';
  points: GrowthTrendPoint[];
}

export interface BodyMetricDefinition {
  id: BodyMetricId;
  label: string;
  unit: 'kg' | 'cm';
  change: number;
  fallbackPoints: GrowthTrendPoint[];
}

export interface ProgressPhotoCategory {
  id: string;
  label: string;
  featured: boolean;
  earliestDate: string;
  latestDate: string;
  imageUrl?: string;
}
