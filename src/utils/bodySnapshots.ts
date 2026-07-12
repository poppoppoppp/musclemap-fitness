import type { BodyMetricRecord } from '../types/body';
import { BODY_METRICS_KEY, createBodyMetricRepository, normalizeBodyMetricRecord } from '../repositories/bodyMetricRepository';

export const BODY_SNAPSHOTS_KEY = BODY_METRICS_KEY;

export function readBodySnapshots(): BodyMetricRecord[] {
  if (typeof window === 'undefined') return [];
  return createBodyMetricRepository().list();
}

export function getLatestBodySnapshot(snapshots: BodyMetricRecord[]): BodyMetricRecord | null {
  return snapshots.map(normalizeBodyMetricRecord).filter((record): record is BodyMetricRecord => record !== null)
    .sort((left, right) => right.date.localeCompare(left.date) || right.updatedAt.localeCompare(left.updatedAt))[0] ?? null;
}

export function isBodySnapshot(value: unknown): value is BodyMetricRecord {
  return normalizeBodyMetricRecord(value) !== null;
}
