export interface BodyMetricRecord {
  id: string;
  date: string;
  weightKg?: number;
  waistCm?: number;
  armCm?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LegacyBodySnapshot {
  id: string;
  date: string;
  bodyWeightKg?: number;
  waistCm?: number;
  createdAt: string;
}

export type BodySnapshot = BodyMetricRecord;
