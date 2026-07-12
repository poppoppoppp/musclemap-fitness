import type { BodySnapshot } from '../types/body';
import { readStorage } from './storage';

export const BODY_SNAPSHOTS_KEY = 'musclemap.bodySnapshots.v0.1';

export function readBodySnapshots(): BodySnapshot[] {
  const snapshots = readStorage<unknown>(BODY_SNAPSHOTS_KEY, []);
  return Array.isArray(snapshots) ? snapshots.filter(isBodySnapshot) : [];
}

export function getLatestBodySnapshot(snapshots: BodySnapshot[]): BodySnapshot | null {
  return snapshots.reduce<BodySnapshot | null>((latest, snapshot) => {
    if (!latest) return snapshot;
    if (snapshot.date !== latest.date) return snapshot.date > latest.date ? snapshot : latest;
    return snapshot.createdAt > latest.createdAt ? snapshot : latest;
  }, null);
}

export function isBodySnapshot(value: unknown): value is BodySnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const snapshot = value as Record<string, unknown>;
  return (
    typeof snapshot.id === 'string' &&
    typeof snapshot.date === 'string' &&
    typeof snapshot.createdAt === 'string' &&
    isOptionalFiniteNumber(snapshot.bodyWeightKg) &&
    isOptionalFiniteNumber(snapshot.waistCm)
  );
}

function isOptionalFiniteNumber(value: unknown) {
  return value === undefined || (typeof value === 'number' && Number.isFinite(value));
}
