export type PostureScreeningStatus =
  | 'draft'
  | 'completed'
  | 'functional-only'
  | 'mixed-evidence'
  | 'safety-review'
  | 'measurement-invalid';

export type PostureEvidenceClass = 'subjective' | 'functional' | 'geometry';

export type PostureEvidenceGradeLevel = 'supportive' | 'limited' | 'context-only';

export interface PostureEvidenceGrade {
  level: PostureEvidenceGradeLevel;
  basis: string;
}

export type PostureMeasurementError =
  | {
      status: 'reported';
      statistic: 'SEM' | 'MDC' | 'range';
      value: number;
      unit: 'deg' | 'ratio';
      applicability: 'direct' | 'conditional' | 'not-transferable';
      context: string;
    }
  | {
      status: 'not-established' | 'not-applicable';
      context: string;
    };

export interface PostureEvidenceSource {
  identifier: string;
  title: string;
  url: string;
  doi?: string;
}

export interface PostureScreeningEvidenceRecord {
  id: string;
  version: string;
  construct: string;
  population: string;
  method: string;
  source: PostureEvidenceSource;
  evidenceGrade: PostureEvidenceGrade;
  measurementError: PostureMeasurementError;
  contraindications: string[];
  allowedConclusions: string[];
  forbiddenConclusions: string[];
}

export interface PostureEvidenceReferenceOwner {
  ownerId: string;
  evidenceIds: string[];
}

export interface PostureFinding {
  patternId: string;
  label: string;
  evidenceClasses: PostureEvidenceClass[];
  evidenceIds: string[];
  reasonCodes: string[];
  confidence: 'supported' | 'limited' | 'insufficient';
  allowedConclusion: string;
  forbiddenConclusions: string[];
}

export interface PostureNextAction {
  id: string;
  label: string;
  kind: 'continue' | 'edit' | 'retake' | 'skip-photo' | 'history' | 'retest' | 'professional-review' | 'return';
}
