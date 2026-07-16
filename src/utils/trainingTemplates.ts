import type { TrainingTemplate, TrainingTemplateDraft, TrainingTemplateInput, TrainingTemplateItem } from '../types/trainingTemplate';
import { getExerciseById } from '../data/exercises';
import { readStorage, writeStorage } from './storage';

export const TRAINING_TEMPLATES_STORAGE_KEY = 'musclemap.trainingTemplates.v1';
export const TRAINING_TEMPLATE_DRAFTS_STORAGE_KEY = 'musclemap.trainingTemplateDrafts.v1';

export type TrainingTemplateMutationResult =
  | { ok: true; template: TrainingTemplate }
  | { ok: false; error: 'not-found' | 'storage' };

export type TrainingTemplateStorageResult = { ok: true } | { ok: false; error: 'storage' };

export function readTrainingTemplates(): TrainingTemplate[] {
  try {
    return normalizeTrainingTemplates(readStorage<unknown>(TRAINING_TEMPLATES_STORAGE_KEY, []));
  } catch {
    return [];
  }
}

export function normalizeTrainingTemplates(value: unknown): TrainingTemplate[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((candidate) => {
    if (!isPlainObject(candidate)) return [];
    if (!isNonEmptyString(candidate.id) || !isNonEmptyString(candidate.name)) return [];
    if (!Array.isArray(candidate.focusTags) || !Array.isArray(candidate.items)) return [];
    if (!isIsoDate(candidate.createdAt) || !isIsoDate(candidate.updatedAt)) return [];

    const seenExerciseIds = new Set<string>();
    const items = candidate.items.flatMap((item) => {
      if (!isPlainObject(item)) return [];
      if (!isNonEmptyString(item.id) || !isNonEmptyString(item.exerciseId)) return [];
      if (!getExerciseById(item.exerciseId) || seenExerciseIds.has(item.exerciseId)) return [];
      if (!Number.isInteger(item.sets) || (item.sets as number) < 1) return [];
      if (!isNonEmptyString(item.repRange)) return [];
      if (!Number.isInteger(item.restSeconds) || (item.restSeconds as number) < 0) return [];
      if (item.note !== undefined && typeof item.note !== 'string') return [];

      seenExerciseIds.add(item.exerciseId);
      return [{
        id: item.id,
        exerciseId: item.exerciseId,
        order: 0,
        sets: item.sets as number,
        repRange: item.repRange.trim(),
        restSeconds: item.restSeconds as number,
        ...(typeof item.note === 'string' && item.note.trim() ? { note: item.note.trim() } : {})
      }];
    }).map((item, order) => ({ ...item, order }));

    return [{
      id: candidate.id,
      name: candidate.name.trim(),
      focusTags: candidate.focusTags.filter(isNonEmptyString).map((tag) => tag.trim()),
      items,
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt,
      ...(isIsoDate(candidate.lastUsedAt) ? { lastUsedAt: candidate.lastUsedAt } : {})
    }];
  });
}

export function writeTrainingTemplates(templates: TrainingTemplate[]): TrainingTemplateStorageResult {
  try {
    writeStorage(TRAINING_TEMPLATES_STORAGE_KEY, normalizeTrainingTemplates(templates));
    return { ok: true };
  } catch {
    return { ok: false, error: 'storage' };
  }
}

export function getTrainingTemplate(templateId: string): TrainingTemplate | null {
  return readTrainingTemplates().find((template) => template.id === templateId) ?? null;
}

export function createTrainingTemplate(input: Omit<TrainingTemplateInput, 'items'> & { items?: TrainingTemplateItem[] }): TrainingTemplateMutationResult {
  const timestamp = new Date().toISOString();
  const template: TrainingTemplate = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    focusTags: cleanFocusTags(input.focusTags),
    items: normalizeInputItems(input.items ?? []),
    createdAt: timestamp,
    updatedAt: timestamp
  };

  const result = writeTrainingTemplates([...readTrainingTemplates(), template]);
  return result.ok ? { ok: true, template } : result;
}

export function updateTrainingTemplate(templateId: string, input: TrainingTemplateInput): TrainingTemplateMutationResult {
  const templates = readTrainingTemplates();
  const current = templates.find((template) => template.id === templateId);
  if (!current) return { ok: false, error: 'not-found' };

  const updated: TrainingTemplate = {
    ...current,
    name: input.name.trim(),
    focusTags: cleanFocusTags(input.focusTags),
    items: normalizeInputItems(input.items),
    updatedAt: new Date().toISOString()
  };
  const result = writeTrainingTemplates(templates.map((template) => template.id === templateId ? updated : template));
  return result.ok ? { ok: true, template: updated } : result;
}

export function duplicateTrainingTemplate(templateId: string): TrainingTemplateMutationResult {
  const current = getTrainingTemplate(templateId);
  if (!current) return { ok: false, error: 'not-found' };

  const timestamp = new Date().toISOString();
  const duplicate: TrainingTemplate = {
    ...current,
    id: crypto.randomUUID(),
    name: `${current.name} 副本`,
    items: current.items.map((item) => ({ ...item, id: crypto.randomUUID() })),
    createdAt: timestamp,
    updatedAt: timestamp,
    lastUsedAt: undefined
  };
  const result = writeTrainingTemplates([...readTrainingTemplates(), duplicate]);
  return result.ok ? { ok: true, template: duplicate } : result;
}

export function deleteTrainingTemplate(templateId: string): TrainingTemplateStorageResult | { ok: false; error: 'not-found' } {
  const templates = readTrainingTemplates();
  if (!templates.some((template) => template.id === templateId)) return { ok: false, error: 'not-found' };
  return writeTrainingTemplates(templates.filter((template) => template.id !== templateId));
}

export function markTrainingTemplateUsed(templateId: string, lastUsedAt = new Date().toISOString()): TrainingTemplateMutationResult {
  const templates = readTrainingTemplates();
  const current = templates.find((template) => template.id === templateId);
  if (!current) return { ok: false, error: 'not-found' };
  const updated = { ...current, lastUsedAt, updatedAt: lastUsedAt };
  const result = writeTrainingTemplates(templates.map((template) => template.id === templateId ? updated : template));
  return result.ok ? { ok: true, template: updated } : result;
}

export function readTrainingTemplateDraft(key: string): TrainingTemplateDraft | null {
  try {
    const drafts = readStorage<unknown>(TRAINING_TEMPLATE_DRAFTS_STORAGE_KEY, {});
    if (!isPlainObject(drafts)) return null;
    return normalizeDraft(drafts[key], key);
  } catch {
    return null;
  }
}

export function writeTrainingTemplateDraft(draft: TrainingTemplateDraft): TrainingTemplateStorageResult {
  try {
    const drafts = readStorage<unknown>(TRAINING_TEMPLATE_DRAFTS_STORAGE_KEY, {});
    const current = isPlainObject(drafts) ? drafts : {};
    writeStorage(TRAINING_TEMPLATE_DRAFTS_STORAGE_KEY, { ...current, [draft.key]: draft });
    return { ok: true };
  } catch {
    return { ok: false, error: 'storage' };
  }
}

export function clearTrainingTemplateDraft(key: string): TrainingTemplateStorageResult {
  try {
    const drafts = readStorage<unknown>(TRAINING_TEMPLATE_DRAFTS_STORAGE_KEY, {});
    if (!isPlainObject(drafts)) return { ok: true };
    const { [key]: _removed, ...remaining } = drafts;
    writeStorage(TRAINING_TEMPLATE_DRAFTS_STORAGE_KEY, remaining);
    return { ok: true };
  } catch {
    return { ok: false, error: 'storage' };
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function cleanFocusTags(value: unknown[]): string[] {
  return value.filter(isNonEmptyString).map((tag) => tag.trim());
}

function normalizeInputItems(items: TrainingTemplateItem[]): TrainingTemplateItem[] {
  const timestamp = new Date().toISOString();
  const normalized = normalizeTrainingTemplates([{
    id: 'input',
    name: 'input',
    focusTags: [],
    items,
    createdAt: timestamp,
    updatedAt: timestamp
  }]);
  return normalized[0]?.items ?? [];
}

function normalizeDraft(value: unknown, key: string): TrainingTemplateDraft | null {
  if (!isPlainObject(value) || value.key !== key || typeof value.name !== 'string') return null;
  if (!Array.isArray(value.focusTags) || !Array.isArray(value.items) || !isIsoDate(value.savedAt)) return null;
  return {
    key,
    name: value.name.trim(),
    focusTags: cleanFocusTags(value.focusTags),
    items: normalizeDraftItems(value.items),
    savedAt: value.savedAt
  };
}

function normalizeDraftItems(value: unknown[]): TrainingTemplateItem[] {
  const seenExerciseIds = new Set<string>();
  return value.flatMap((item) => {
    if (!isPlainObject(item) || !isNonEmptyString(item.id) || !isNonEmptyString(item.exerciseId)) return [];
    if (!getExerciseById(item.exerciseId) || seenExerciseIds.has(item.exerciseId)) return [];
    seenExerciseIds.add(item.exerciseId);
    return [{
      id: item.id,
      exerciseId: item.exerciseId,
      order: 0,
      sets: Number.isInteger(item.sets) && (item.sets as number) >= 1 ? item.sets as number : 1,
      repRange: isNonEmptyString(item.repRange) ? item.repRange.trim() : '8-12',
      restSeconds: Number.isInteger(item.restSeconds) && (item.restSeconds as number) >= 0 ? item.restSeconds as number : 0,
      ...(typeof item.note === 'string' && item.note.trim() ? { note: item.note.trim() } : {})
    }];
  }).map((item, order) => ({ ...item, order }));
}
