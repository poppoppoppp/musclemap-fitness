import type {
  PostureEvidenceReferenceOwner,
  PostureScreeningEvidenceRecord,
} from '../types/postureScreening';

export type PostureEvidenceValidationCode =
  | 'duplicate-evidence-id'
  | 'invalid-evidence-id'
  | 'invalid-evidence-version'
  | 'missing-construct'
  | 'missing-population'
  | 'missing-method'
  | 'missing-source-identifier'
  | 'missing-source-title'
  | 'invalid-source-url'
  | 'missing-evidence-grade-basis'
  | 'invalid-measurement-error'
  | 'missing-allowed-conclusion'
  | 'missing-forbidden-conclusion'
  | 'diagnostic-allowed-conclusion'
  | 'missing-evidence-reference';

export interface PostureEvidenceValidationError {
  code: PostureEvidenceValidationCode;
  evidenceId: string;
  ownerId?: string;
}

const hasText = (value: string | undefined) => Boolean(value?.trim());

export function validatePostureScreeningEvidence(
  evidence: readonly PostureScreeningEvidenceRecord[],
  references: readonly PostureEvidenceReferenceOwner[] = [],
): PostureEvidenceValidationError[] {
  const errors: PostureEvidenceValidationError[] = [];
  const counts = new Map<string, number>();

  for (const record of evidence) counts.set(record.id, (counts.get(record.id) ?? 0) + 1);
  for (const [evidenceId, count] of counts) {
    if (count > 1) errors.push({ code: 'duplicate-evidence-id', evidenceId });
  }

  for (const record of evidence) {
    const evidenceId = record.id;
    if (!/-v\d+$/.test(evidenceId)) errors.push({ code: 'invalid-evidence-id', evidenceId });
    if (!/^\d+\.\d+\.\d+$/.test(record.version)) errors.push({ code: 'invalid-evidence-version', evidenceId });
    if (!hasText(record.construct)) errors.push({ code: 'missing-construct', evidenceId });
    if (!hasText(record.population)) errors.push({ code: 'missing-population', evidenceId });
    if (!hasText(record.method)) errors.push({ code: 'missing-method', evidenceId });
    if (!hasText(record.source.identifier)) errors.push({ code: 'missing-source-identifier', evidenceId });
    if (!hasText(record.source.title)) errors.push({ code: 'missing-source-title', evidenceId });
    if (!/^https?:\/\//.test(record.source.url)) errors.push({ code: 'invalid-source-url', evidenceId });
    if (!hasText(record.evidenceGrade.basis)) errors.push({ code: 'missing-evidence-grade-basis', evidenceId });
    if (!hasText(record.measurementError.context)) errors.push({ code: 'invalid-measurement-error', evidenceId });
    if (record.measurementError.status === 'reported' && !(record.measurementError.value > 0)) {
      errors.push({ code: 'invalid-measurement-error', evidenceId });
    }
    if (record.allowedConclusions.length === 0) errors.push({ code: 'missing-allowed-conclusion', evidenceId });
    if (record.forbiddenConclusions.length === 0) errors.push({ code: 'missing-forbidden-conclusion', evidenceId });
    if (record.allowedConclusions.some((conclusion) => /诊断|确诊|diagnos/i.test(conclusion))) {
      errors.push({ code: 'diagnostic-allowed-conclusion', evidenceId });
    }
  }

  const knownIds = new Set(evidence.map(({ id }) => id));
  for (const reference of references) {
    for (const evidenceId of reference.evidenceIds) {
      if (!knownIds.has(evidenceId)) {
        errors.push({ code: 'missing-evidence-reference', evidenceId, ownerId: reference.ownerId });
      }
    }
  }

  return errors;
}
