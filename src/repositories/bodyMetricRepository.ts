import type { BodyMetricRecord, LegacyBodySnapshot } from '../types/body';

export const BODY_METRICS_KEY = 'musclemap.bodySnapshots.v0.1';

export type BodyMetricInput = {
  date: string;
  weightKg?: number;
  waistCm?: number;
  armCm?: number;
};

export type BodyMetricSaveError = 'invalid-date' | 'measurement-required' | 'invalid-weight' | 'invalid-waist' | 'invalid-arm' | 'storage-failed' | 'not-found';
export type BodyMetricSaveResult = { ok: true; record: BodyMetricRecord } | { ok: false; error: BodyMetricSaveError };

export class BodyMetricRepository {
  constructor(private readonly storage: Storage, private readonly now: () => Date = () => new Date()) {}

  list(): BodyMetricRecord[] {
    const raw = this.storage.getItem(BODY_METRICS_KEY);
    if (!raw) return [];
    try {
      const values = JSON.parse(raw) as unknown;
      if (!Array.isArray(values)) return [];
      return values.flatMap(normalizeRecord).sort((left, right) => right.date.localeCompare(left.date) || right.updatedAt.localeCompare(left.updatedAt));
    } catch {
      return [];
    }
  }

  get(id: string) {
    return this.list().find((record) => record.id === id) ?? null;
  }

  getByDate(date: string) {
    return this.list().find((record) => record.date === date) ?? null;
  }

  save(input: BodyMetricInput): BodyMetricSaveResult {
    const error = validateBodyMetricInput(input);
    if (error) return { ok: false, error };
    const records = this.list();
    const existing = records.find((record) => record.date === input.date);
    const timestamp = this.now().toISOString();
    const record: BodyMetricRecord = existing
      ? cleanRecord({ ...existing, ...definedMeasurements(input), updatedAt: timestamp })
      : cleanRecord({ id: createId(timestamp), ...input, createdAt: timestamp, updatedAt: timestamp });
    return this.persist(records.filter(({ id }) => id !== record.id).concat(record), record);
  }

  update(id: string, input: BodyMetricInput): BodyMetricSaveResult {
    const error = validateBodyMetricInput(input);
    if (error) return { ok: false, error };
    const records = this.list();
    const existing = records.find((record) => record.id === id);
    if (!existing) return { ok: false, error: 'not-found' };
    const sameDateRecord = records.find((record) => record.date === input.date && record.id !== id);
    const timestamp = this.now().toISOString();
    const record = cleanRecord({
      ...(sameDateRecord ?? existing),
      ...input,
      id: sameDateRecord?.id ?? existing.id,
      createdAt: sameDateRecord?.createdAt ?? existing.createdAt,
      updatedAt: timestamp
    });
    return this.persist(records.filter(({ id: recordId }) => recordId !== id && recordId !== sameDateRecord?.id).concat(record), record);
  }

  delete(id: string) {
    const records = this.list();
    if (!records.some((record) => record.id === id)) return false;
    try {
      this.storage.setItem(BODY_METRICS_KEY, JSON.stringify(records.filter((record) => record.id !== id)));
      return true;
    } catch {
      return false;
    }
  }

  private persist(records: BodyMetricRecord[], record: BodyMetricRecord): BodyMetricSaveResult {
    try {
      this.storage.setItem(BODY_METRICS_KEY, JSON.stringify(records.sort((left, right) => right.date.localeCompare(left.date))));
      return { ok: true, record };
    } catch {
      return { ok: false, error: 'storage-failed' };
    }
  }
}

export function createBodyMetricRepository() {
  if (typeof window === 'undefined') throw new Error('Body metric storage is only available in the browser.');
  return new BodyMetricRepository(window.localStorage);
}

export function validateBodyMetricInput(input: BodyMetricInput): BodyMetricSaveError | null {
  if (!isDateKey(input.date)) return 'invalid-date';
  if (input.weightKg === undefined && input.waistCm === undefined && input.armCm === undefined) return 'measurement-required';
  if (input.weightKg !== undefined && (!Number.isFinite(input.weightKg) || input.weightKg < 20 || input.weightKg > 500)) return 'invalid-weight';
  if (input.waistCm !== undefined && (!Number.isFinite(input.waistCm) || input.waistCm < 30 || input.waistCm > 300)) return 'invalid-waist';
  if (input.armCm !== undefined && (!Number.isFinite(input.armCm) || input.armCm < 10 || input.armCm > 150)) return 'invalid-arm';
  return null;
}

export function normalizeBodyMetricRecord(value: unknown): BodyMetricRecord | null {
  return normalizeRecord(value)[0] ?? null;
}

function normalizeRecord(value: unknown): BodyMetricRecord[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  const record = value as Partial<BodyMetricRecord & LegacyBodySnapshot>;
  if (typeof record.id !== 'string' || !isDateKey(record.date) || typeof record.createdAt !== 'string') return [];
  const normalized: BodyMetricRecord = cleanRecord({
    id: record.id,
    date: record.date,
    weightKg: finite(record.weightKg) ? record.weightKg : finite(record.bodyWeightKg) ? record.bodyWeightKg : undefined,
    waistCm: finite(record.waistCm) ? record.waistCm : undefined,
    armCm: finite(record.armCm) ? record.armCm : undefined,
    createdAt: record.createdAt,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : record.createdAt
  });
  return normalized.weightKg === undefined && normalized.waistCm === undefined && normalized.armCm === undefined ? [] : [normalized];
}

function cleanRecord(record: BodyMetricRecord): BodyMetricRecord {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined)) as unknown as BodyMetricRecord;
}

function definedMeasurements(input: BodyMetricInput) {
  return Object.fromEntries(Object.entries(input).filter(([key, value]) => key !== 'date' && value !== undefined));
}

function finite(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.getFullYear() === Number(match[1]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[3]);
}
function createId(timestamp: string) { return `body-${timestamp.replace(/\D/g, '')}-${Math.random().toString(36).slice(2, 8)}`; }
