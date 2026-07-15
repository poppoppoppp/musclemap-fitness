import type { ManualOverrides, ReuseDecision } from './types.ts';

interface NormalizeOptions {
  exerciseIds?: Set<string>;
  sourceIds?: Set<string>;
}

export function normalizeManualOverrides(input: unknown, options: NormalizeOptions = {}): { overrides: ManualOverrides; warnings: string[] } {
  const warnings: string[] = [];
  const source = isRecord(input) ? input : {};
  if (!isRecord(input)) warnings.push('manual-overrides 根节点不是对象，已使用空审核状态');

  const overrides: ManualOverrides = {
    version: 1,
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : null,
    accepted: readStringMap(source.accepted),
    rejected: readRejectedMap(source.rejected),
    forced: readStringMap(source.forced),
    reuse: readReuseMap(source.reuse),
    notes: readStringMap(source.notes)
  };

  enforceFinalDecisionExclusivity(overrides, warnings);
  if (options.exerciseIds || options.sourceIds) validateReferences(overrides, options, warnings);
  return { overrides, warnings };
}

function enforceFinalDecisionExclusivity(overrides: ManualOverrides, warnings: string[]) {
  for (const exerciseId of Object.keys(overrides.forced)) {
    if (overrides.accepted[exerciseId] || overrides.reuse[exerciseId]) {
      warnings.push(`manual-overrides 最终决定互斥冲突：${exerciseId}，保留 forced`);
      delete overrides.accepted[exerciseId];
      delete overrides.reuse[exerciseId];
    }
  }
  for (const exerciseId of Object.keys(overrides.accepted)) {
    if (overrides.reuse[exerciseId]) {
      warnings.push(`manual-overrides 最终决定互斥冲突：${exerciseId}，保留 accepted`);
      delete overrides.reuse[exerciseId];
    }
  }
}

function validateReferences(overrides: ManualOverrides, options: NormalizeOptions, warnings: string[]) {
  const exerciseIds = options.exerciseIds;
  const sourceIds = options.sourceIds;

  for (const field of ['accepted', 'forced'] as const) {
    for (const [exerciseId, sourceId] of Object.entries(overrides[field])) {
      if (!isKnown(exerciseIds, exerciseId)) {
        warnings.push(`manual-overrides ${field} 引用不存在的 exerciseId：${exerciseId}`);
        delete overrides[field][exerciseId];
      } else if (!isKnown(sourceIds, sourceId)) {
        warnings.push(`manual-overrides ${field} 引用不存在的 sourceId：${sourceId}（${exerciseId}）`);
        delete overrides[field][exerciseId];
      }
    }
  }

  for (const [exerciseId, rejectedIds] of Object.entries(overrides.rejected)) {
    if (!isKnown(exerciseIds, exerciseId)) {
      warnings.push(`manual-overrides rejected 引用不存在的 exerciseId：${exerciseId}`);
      delete overrides.rejected[exerciseId];
      continue;
    }
    const valid = rejectedIds.filter((sourceId) => {
      if (isKnown(sourceIds, sourceId)) return true;
      warnings.push(`manual-overrides rejected 引用不存在的 sourceId：${sourceId}（${exerciseId}）`);
      return false;
    });
    if (valid.length) overrides.rejected[exerciseId] = valid;
    else delete overrides.rejected[exerciseId];
  }

  for (const [exerciseId, decision] of Object.entries(overrides.reuse)) {
    if (!isKnown(exerciseIds, exerciseId)) {
      warnings.push(`manual-overrides reuse 引用不存在的 exerciseId：${exerciseId}`);
      delete overrides.reuse[exerciseId];
    } else if (!isKnown(exerciseIds, decision.baseExerciseId)) {
      warnings.push(`manual-overrides reuse 引用不存在的 baseExerciseId：${decision.baseExerciseId}（${exerciseId}）`);
      delete overrides.reuse[exerciseId];
    } else if (!isKnown(sourceIds, decision.sourceId)) {
      warnings.push(`manual-overrides reuse 引用不存在的 sourceId：${decision.sourceId}（${exerciseId}）`);
      delete overrides.reuse[exerciseId];
    }
  }

  for (const exerciseId of Object.keys(overrides.notes)) {
    if (!isKnown(exerciseIds, exerciseId)) {
      warnings.push(`manual-overrides notes 引用不存在的 exerciseId：${exerciseId}`);
      delete overrides.notes[exerciseId];
    }
  }
}

function readStringMap(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0));
}

function readRejectedMap(value: unknown): Record<string, string[]> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([exerciseId, sourceIds]) => {
    if (!Array.isArray(sourceIds)) return [];
    const unique = [...new Set(sourceIds.filter((sourceId): sourceId is string => typeof sourceId === 'string' && sourceId.length > 0))];
    return unique.length ? [[exerciseId, unique]] : [];
  }));
}

function readReuseMap(value: unknown): Record<string, ReuseDecision> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([exerciseId, raw]) => {
    if (!isRecord(raw) || typeof raw.baseExerciseId !== 'string' || typeof raw.sourceId !== 'string' || !raw.baseExerciseId || !raw.sourceId) return [];
    return [[exerciseId, {
      baseExerciseId: raw.baseExerciseId,
      sourceId: raw.sourceId,
      reason: typeof raw.reason === 'string' ? raw.reason : '',
      differences: typeof raw.differences === 'string' ? raw.differences : ''
    }]];
  }));
}

function isKnown(values: Set<string> | undefined, value: string) {
  return !values || values.has(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
