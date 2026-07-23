import type {
  PostureDose,
  PosturePrescription,
  PostureProtocolExerciseSnapshot,
  PostureProtocolStepSnapshot,
  PostureProtocolWorkoutSnapshot
} from '../types/posture';
import type { TrainingTemplate, TrainingTemplateDraft, TrainingTemplateInput, TrainingTemplateItem } from '../types/trainingTemplate';
import { getExerciseById } from '../data/exercises';
import { readStorage, writeStorage } from './storage';

export const TRAINING_TEMPLATES_STORAGE_KEY = 'musclemap.trainingTemplates.v1';
export const TRAINING_TEMPLATE_DRAFTS_STORAGE_KEY = 'musclemap.trainingTemplateDrafts.v1';

export type TrainingTemplateMutationResult =
  | { ok: true; template: TrainingTemplate }
  | { ok: false; error: 'not-found' | 'storage' };

export type TrainingTemplateStorageResult = { ok: true } | { ok: false; error: 'storage' };
export type TrainingTemplateProtocolMutationResult =
  | { ok: true; status: 'added' | 'already-added'; template: TrainingTemplate }
  | { ok: false; error: 'not-found' | 'invalid' | 'storage' };

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
    const postureProtocolGroups = normalizePostureProtocolGroups(candidate.postureProtocolGroups);

    return [{
      id: candidate.id,
      name: candidate.name.trim(),
      focusTags: candidate.focusTags.filter(isNonEmptyString).map((tag) => tag.trim()),
      items,
      ...(postureProtocolGroups ? { postureProtocolGroups } : {}),
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
    ...(input.postureProtocolGroups ? { postureProtocolGroups: normalizePostureProtocolGroups(input.postureProtocolGroups) } : {}),
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
    postureProtocolGroups: input.postureProtocolGroups === undefined
      ? current.postureProtocolGroups
      : normalizePostureProtocolGroups(input.postureProtocolGroups),
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
    postureProtocolGroups: clonePostureProtocolGroupsWithNewIds(current.postureProtocolGroups),
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
  const postureProtocolGroups = Array.isArray(value.postureProtocolGroups)
    ? normalizePostureProtocolGroups(value.postureProtocolGroups) ?? []
    : undefined;
  return {
    key,
    name: value.name.trim(),
    focusTags: cleanFocusTags(value.focusTags),
    items: normalizeDraftItems(value.items),
    ...(postureProtocolGroups ? { postureProtocolGroups } : {}),
    savedAt: value.savedAt
  };
}

export function addPostureProtocolGroupToTrainingTemplate(
  templateId: string,
  group: PostureProtocolWorkoutSnapshot
): TrainingTemplateProtocolMutationResult {
  const templates = readTrainingTemplates();
  const current = templates.find((template) => template.id === templateId);
  if (!current) return { ok: false, error: 'not-found' };
  if (current.postureProtocolGroups?.some(({ sourceProtocolId }) => sourceProtocolId === group.sourceProtocolId)) {
    return { ok: true, status: 'already-added', template: current };
  }
  const normalized = normalizePostureProtocolGroups([group]);
  if (!normalized?.length) return { ok: false, error: 'invalid' };
  const clonedGroup = clonePostureProtocolGroupsWithNewIds(normalized)?.[0];
  if (!clonedGroup) return { ok: false, error: 'invalid' };
  const updated: TrainingTemplate = {
    ...current,
    postureProtocolGroups: [...(current.postureProtocolGroups ?? []), { ...clonedGroup, order: current.postureProtocolGroups?.length ?? 0 }],
    updatedAt: new Date().toISOString()
  };
  const result = writeTrainingTemplates(templates.map((template) => template.id === templateId ? updated : template));
  return result.ok ? { ok: true, status: 'added', template: updated } : result;
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

export function normalizePostureProtocolGroups(value: unknown): PostureProtocolWorkoutSnapshot[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const seenInstanceIds = new Set<string>();
  const seenProtocolIds = new Set<string>();
  const groups = value.flatMap((candidate) => {
    if (!isPlainObject(candidate)) return [];
    if (!isNonEmptyString(candidate.instanceId) || !isNonEmptyString(candidate.sourceProtocolId) || !isNonEmptyString(candidate.nameSnapshot)) return [];
    if (seenInstanceIds.has(candidate.instanceId) || seenProtocolIds.has(candidate.sourceProtocolId)) return [];
    if (!Array.isArray(candidate.targetIssueNamesSnapshot) || !Array.isArray(candidate.exerciseInstanceIds) || !Array.isArray(candidate.exerciseSnapshots)) return [];
    if (!isIsoDate(candidate.addedAt) || typeof candidate.isModified !== 'boolean') return [];

    const snapshotsById = new Map<string, PostureProtocolExerciseSnapshot>();
    candidate.exerciseSnapshots.forEach((snapshot) => {
      const normalized = normalizeProtocolExerciseSnapshot(snapshot);
      if (normalized && !snapshotsById.has(normalized.instanceId)) snapshotsById.set(normalized.instanceId, normalized);
    });
    const exerciseInstanceIds = candidate.exerciseInstanceIds.filter(isNonEmptyString).filter((id, index, ids) => ids.indexOf(id) === index && snapshotsById.has(id));
    if (exerciseInstanceIds.length === 0) return [];
    const exerciseSnapshots = exerciseInstanceIds.map((id) => snapshotsById.get(id)!);
    const validExerciseIds = new Set(exerciseInstanceIds);
    const stepSnapshots = Array.isArray(candidate.stepSnapshots)
      ? candidate.stepSnapshots.flatMap((step) => {
          const normalized = normalizeProtocolStepSnapshot(step, validExerciseIds);
          return normalized ? [normalized] : [];
        })
      : undefined;

    seenInstanceIds.add(candidate.instanceId);
    seenProtocolIds.add(candidate.sourceProtocolId);
    const group: PostureProtocolWorkoutSnapshot = {
      instanceId: candidate.instanceId,
      sourceProtocolId: candidate.sourceProtocolId,
      nameSnapshot: candidate.nameSnapshot.trim(),
      targetIssueNamesSnapshot: candidate.targetIssueNamesSnapshot.filter(isNonEmptyString).map((name) => name.trim()),
      ...(Array.isArray(candidate.limitationsSnapshot) ? { limitationsSnapshot: candidate.limitationsSnapshot.filter(isNonEmptyString).map((item) => item.trim()) } : {}),
      ...(candidate.sourceSnapshot === 'posture-screening' || candidate.sourceSnapshot === 'posture-library' ? { sourceSnapshot: candidate.sourceSnapshot } : {}),
      addedAt: candidate.addedAt,
      isModified: candidate.isModified,
      order: 0,
      exerciseInstanceIds,
      exerciseSnapshots,
      ...(stepSnapshots ? { stepSnapshots } : {})
    };
    return [group];
  }).map((group, order) => ({ ...group, order }));
  return groups.length > 0 ? groups : undefined;
}

export function clonePostureProtocolGroupsWithNewIds(groups: PostureProtocolWorkoutSnapshot[] | undefined) {
  return groups?.map((group, order) => {
    const instanceId = crypto.randomUUID();
    const exerciseIdMap = new Map(group.exerciseInstanceIds.map((exerciseInstanceId) => [exerciseInstanceId, crypto.randomUUID()]));
    const exerciseInstanceIds = group.exerciseInstanceIds.flatMap((exerciseInstanceId) => {
      const nextId = exerciseIdMap.get(exerciseInstanceId);
      return nextId ? [nextId] : [];
    });
    return {
      ...group,
      instanceId,
      order,
      targetIssueNamesSnapshot: [...group.targetIssueNamesSnapshot],
      limitationsSnapshot: group.limitationsSnapshot ? [...group.limitationsSnapshot] : undefined,
      exerciseInstanceIds,
      exerciseSnapshots: group.exerciseSnapshots.flatMap((snapshot) => {
        const nextId = exerciseIdMap.get(snapshot.instanceId);
        return nextId ? [{
          ...snapshot,
          instanceId: nextId,
          prescription: { ...snapshot.prescription },
          specialCues: [...snapshot.specialCues],
          dose: cloneDose(snapshot.dose)
        }] : [];
      }),
      stepSnapshots: group.stepSnapshots?.map((snapshot) => ({
        ...snapshot,
        exerciseInstanceId: snapshot.exerciseInstanceId ? exerciseIdMap.get(snapshot.exerciseInstanceId) : undefined,
        dose: cloneDose(snapshot.dose),
        notes: snapshot.notes ? [...snapshot.notes] : undefined
      }))
    };
  });
}

function normalizeProtocolExerciseSnapshot(value: unknown): PostureProtocolExerciseSnapshot | null {
  if (!isPlainObject(value)) return null;
  if (!isNonEmptyString(value.instanceId) || !isNonEmptyString(value.exerciseId) || !isNonEmptyString(value.nameSnapshot)) return null;
  if (!isNonEmptyString(value.roleInProtocol) || !isNonEmptyString(value.roleExplanation) || typeof value.sourceOriginalText !== 'string') return null;
  if (!Array.isArray(value.specialCues)) return null;
  const prescription = normalizePrescription(value.prescription);
  if (!prescription) return null;
  return {
    instanceId: value.instanceId,
    exerciseId: value.exerciseId,
    nameSnapshot: value.nameSnapshot.trim(),
    order: Number.isInteger(value.order) ? value.order as number : 0,
    roleInProtocol: value.roleInProtocol,
    roleExplanation: value.roleExplanation,
    prescription,
    specialCues: value.specialCues.filter(isNonEmptyString).map((cue) => cue.trim()),
    sourceOriginalText: value.sourceOriginalText,
    ...(isNonEmptyString(value.groupKey) ? { groupKey: value.groupKey } : {}),
    ...(isNonEmptyString(value.groupLabel) ? { groupLabel: value.groupLabel } : {}),
    ...(normalizeDose(value.dose) ? { dose: normalizeDose(value.dose) } : {}),
    ...(isDoseConfidence(value.doseConfidence) ? { doseConfidence: value.doseConfidence } : {}),
    ...(typeof value.visualReviewRequired === 'boolean' ? { visualReviewRequired: value.visualReviewRequired } : {}),
    ...(typeof value.visualReviewNote === 'string' ? { visualReviewNote: value.visualReviewNote } : {})
  };
}

function normalizeProtocolStepSnapshot(value: unknown, validExerciseIds: Set<string>): PostureProtocolStepSnapshot | null {
  if (!isPlainObject(value) || !isNonEmptyString(value.id) || !isNonEmptyString(value.groupKey) || !isNonEmptyString(value.groupLabel) || !isNonEmptyString(value.titleSnapshot)) return null;
  if ((value.kind !== 'exercise' && value.kind !== 'observation') || typeof value.includedInWorkout !== 'boolean') return null;
  if (value.kind === 'exercise' && !isNonEmptyString(value.exerciseId)) return null;
  if (value.kind === 'observation' && !isNonEmptyString(value.observationId)) return null;
  const linkedExerciseId = isNonEmptyString(value.exerciseInstanceId) && validExerciseIds.has(value.exerciseInstanceId) ? value.exerciseInstanceId : undefined;
  return {
    id: value.id,
    order: Number.isInteger(value.order) ? value.order as number : 0,
    groupKey: value.groupKey,
    groupLabel: value.groupLabel,
    kind: value.kind,
    titleSnapshot: value.titleSnapshot,
    includedInWorkout: value.kind === 'exercise' ? Boolean(value.includedInWorkout && linkedExerciseId) : false,
    ...(isNonEmptyString(value.exerciseId) ? { exerciseId: value.exerciseId } : {}),
    ...(linkedExerciseId ? { exerciseInstanceId: linkedExerciseId } : {}),
    ...(isNonEmptyString(value.observationId) ? { observationId: value.observationId } : {}),
    ...(typeof value.optional === 'boolean' ? { optional: value.optional } : {}),
    ...(isNonEmptyString(value.selectionGroupId) ? { selectionGroupId: value.selectionGroupId } : {}),
    ...(normalizeDose(value.dose) ? { dose: normalizeDose(value.dose) } : {}),
    ...(Array.isArray(value.notes) ? { notes: value.notes.filter(isNonEmptyString) } : {}),
    ...(typeof value.purposeSnapshot === 'string' ? { purposeSnapshot: value.purposeSnapshot } : {}),
    ...(typeof value.limitationSnapshot === 'string' ? { limitationSnapshot: value.limitationSnapshot } : {}),
    ...(typeof value.visualReviewRequired === 'boolean' ? { visualReviewRequired: value.visualReviewRequired } : {}),
    ...(typeof value.visualReviewNote === 'string' ? { visualReviewNote: value.visualReviewNote } : {})
  };
}

function normalizePrescription(value: unknown): PosturePrescription | null {
  if (!isPlainObject(value)) return null;
  if (!isNullableNumber(value.sets) || !isNullableNumber(value.reps) || !isNullableNumber(value.durationSeconds) || !isNullableNumber(value.restSeconds)) return null;
  if (value.frequencyText !== null && typeof value.frequencyText !== 'string') return null;
  if (typeof value.rawText !== 'string') return null;
  return {
    sets: value.sets,
    reps: value.reps,
    durationSeconds: value.durationSeconds,
    restSeconds: value.restSeconds,
    frequencyText: value.frequencyText,
    rawText: value.rawText
  };
}

function normalizeDose(value: unknown): PostureDose | undefined {
  if (!isPlainObject(value)) return undefined;
  const dose: PostureDose = {};
  if (isNumberOrString(value.reps)) dose.reps = value.reps;
  if (isNumberOrString(value.repsPerSide)) dose.repsPerSide = value.repsPerSide;
  if (isNumberOrString(value.sets)) dose.sets = value.sets;
  if (typeof value.durationSeconds === 'number') dose.durationSeconds = value.durationSeconds;
  if (Array.isArray(value.durationRangeSeconds) && value.durationRangeSeconds.length === 2 && value.durationRangeSeconds.every((item) => typeof item === 'number')) dose.durationRangeSeconds = [value.durationRangeSeconds[0], value.durationRangeSeconds[1]];
  if (typeof value.holdSeconds === 'number') dose.holdSeconds = value.holdSeconds;
  if (typeof value.frequency === 'string') dose.frequency = value.frequency;
  if (typeof value.load === 'string') dose.load = value.load;
  if (typeof value.mode === 'string') dose.mode = value.mode;
  if (value.source === 'source' || value.source === 'suspectedOnScreenText') dose.source = value.source;
  if (isDoseConfidence(value.confidence)) dose.confidence = value.confidence;
  if (typeof value.notes === 'string') dose.notes = value.notes;
  return Object.keys(dose).length > 0 ? dose : undefined;
}

function cloneDose(dose: PostureDose | undefined): PostureDose | undefined {
  return dose ? { ...dose, durationRangeSeconds: dose.durationRangeSeconds ? [...dose.durationRangeSeconds] as [number, number] : undefined } : undefined;
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === 'number';
}

function isNumberOrString(value: unknown): value is number | string {
  return typeof value === 'number' || typeof value === 'string';
}

function isDoseConfidence(value: unknown): value is NonNullable<PostureDose['confidence']> {
  return value === 'high' || value === 'medium' || value === 'mediumLow' || value === 'low';
}
