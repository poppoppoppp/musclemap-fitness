import { expect, test } from '@playwright/test';
import { BodyMetricRepository } from '../repositories/bodyMetricRepository';

test('normalizes legacy snapshots without losing existing weight or waist values', () => {
  const storage = new MemoryStorage({
    'musclemap.bodySnapshots.v0.1': JSON.stringify([{ id: 'legacy', date: '2026-06-01', bodyWeightKg: 72.3, waistCm: 80, createdAt: '2026-06-01T08:00:00.000Z' }])
  });
  const records = new BodyMetricRepository(storage).list();
  expect(records).toEqual([{ id: 'legacy', date: '2026-06-01', weightKg: 72.3, waistCm: 80, createdAt: '2026-06-01T08:00:00.000Z', updatedAt: '2026-06-01T08:00:00.000Z' }]);
});

test('same-day save merges new values into the existing record', () => {
  const storage = new MemoryStorage();
  const repository = new BodyMetricRepository(storage, () => new Date('2026-07-12T10:00:00.000Z'));
  const first = repository.save({ date: '2026-07-12', weightKg: 72.3 });
  const second = repository.save({ date: '2026-07-12', waistCm: 78.5 });
  expect(second.ok).toBe(true);
  if (!first.ok || !second.ok) return;
  expect(second.record.id).toBe(first.record.id);
  expect(repository.list()).toEqual([{ ...second.record, weightKg: 72.3, waistCm: 78.5 }]);
});

test('requires at least one valid positive measurement and rejects unreasonable values', () => {
  const repository = new BodyMetricRepository(new MemoryStorage());
  expect(repository.save({ date: '2026-07-12' })).toEqual({ ok: false, error: 'measurement-required' });
  expect(repository.save({ date: '2026-07-12', weightKg: -1 })).toEqual({ ok: false, error: 'invalid-weight' });
  expect(repository.save({ date: '2026-07-12', waistCm: 999 })).toEqual({ ok: false, error: 'invalid-waist' });
  expect(repository.save({ date: '2026-07-12', armCm: 0 })).toEqual({ ok: false, error: 'invalid-arm' });
});

test('updates and deletes records while keeping newest dates first', () => {
  const repository = new BodyMetricRepository(new MemoryStorage(), () => new Date('2026-07-12T10:00:00.000Z'));
  const older = repository.save({ date: '2026-06-01', weightKg: 73 });
  const newer = repository.save({ date: '2026-07-01', weightKg: 72 });
  if (!older.ok || !newer.ok) throw new Error('fixture save failed');
  expect(repository.list().map(({ id }) => id)).toEqual([newer.record.id, older.record.id]);
  expect(repository.update(older.record.id, { date: '2026-06-01', weightKg: 72.5, armCm: 35 })).toMatchObject({ ok: true, record: { weightKg: 72.5, armCm: 35 } });
  expect(repository.delete(newer.record.id)).toBe(true);
  expect(repository.list()).toHaveLength(1);
});

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  constructor(initial: Record<string, string> = {}) { Object.entries(initial).forEach(([key, value]) => this.values.set(key, value)); }
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}
