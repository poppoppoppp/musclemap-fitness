import type {
  PostureEvidenceClass,
  PostureEvidenceReferenceOwner,
  PostureFinding,
  PostureNextAction,
  PostureScreeningStatus,
} from '../types/postureScreening';
import type { PosturePrimaryConcern } from '../data/posture/postureScreeningQuestions';
import type { GuidedPostureTestDefinition } from '../data/posture/postureScreeningTests';

export type PostureSafetyFlag =
  | 'acute-trauma'
  | 'progressive-neurological-symptoms'
  | 'chest-pain-or-fainting'
  | 'severe-unexplained-symptoms';

export type PostureTestStopSymptom = 'dizziness' | 'numbness' | 'radiating-pain' | 'marked-pain-increase' | 'weakness';

export type SubjectivePostureObservation =
  | 'head-position-concern'
  | 'neck-upper-quarter-impact'
  | 'thoracic-stiffness-or-rotation-concern'
  | 'trunk-side-shift-concern'
  | 'shoulder-height-concern'
  | 'overhead-asymmetry-concern';

export type FunctionalPostureObservation =
  | 'head-advances-during-reach'
  | 'upper-quarter-control-limited'
  | 'thoracic-rotation-limited'
  | 'trunk-side-shift-during-reach'
  | 'arm-raise-asymmetry';

export type GeometryPostureObservation =
  | 'cva-measurement-only'
  | 'shoulder-height-difference'
  | 'frontal-trunk-deviation'
  | 'lateral-trunk-measurement-only';

export interface PostureScreeningInput {
  age: number;
  boundaryAccepted: boolean;
  safetyFlags: PostureSafetyFlag[];
  primaryConcern: PosturePrimaryConcern;
  functionalImpact?: number;
  subjectiveObservations: SubjectivePostureObservation[];
  movement: {
    testId: GuidedPostureTestDefinition['id'];
    status: 'completed' | 'stopped';
    stopSymptoms: PostureTestStopSymptom[];
    observations: FunctionalPostureObservation[];
  };
  photo: {
    status: 'completed' | 'skipped' | 'invalid';
    observations: GeometryPostureObservation[];
    reasonCodes: string[];
  };
}

export interface PostureScreeningResult {
  status: PostureScreeningStatus;
  summary: string;
  findings: PostureFinding[];
  evidenceIds: string[];
  reasonCodes: string[];
  nextActions: PostureNextAction[];
  algorithmVersion: '1.0.0';
  protocolVersion: 'adult-posture-screening-v1';
}

type PatternId =
  | 'forward-head-upper-quarter-tendency'
  | 'thoracic-rotation-mobility-tendency'
  | 'frontal-shoulder-asymmetry-tendency'
  | 'frontal-trunk-deviation-tendency';

interface ExtractedSignal {
  patternId: PatternId;
  evidenceClass: PostureEvidenceClass;
  reasonCode: string;
}

interface PatternDefinition {
  label: string;
  allowedConclusion: string;
  forbiddenConclusions: string[];
  evidenceByClass: Partial<Record<PostureEvidenceClass, string[]>>;
}

const patternDefinitions: Record<PatternId, PatternDefinition> = {
  'forward-head-upper-quarter-tendency': {
    label: '头位前移伴上段控制负担倾向',
    allowedConclusion: '主观关注与功能/外观证据共同提示头位前移和上段控制负担倾向。',
    forbiddenConclusions: ['不能确认颈椎病变、疼痛病因或特定肌肉失衡。'],
    evidenceByClass: {
      subjective: ['head-neck-pain-association-limit-v1', 'cva-classic-photogrammetry-review-v1'],
      functional: ['upper-body-photogrammetry-review-v1', 'head-neck-pain-association-limit-v1'],
    },
  },
  'thoracic-rotation-mobility-tendency': {
    label: '胸廓旋转活动受限倾向',
    allowedConclusion: '主观侧差与引导旋转观察共同提示胸廓旋转功能受限倾向。',
    forbiddenConclusions: ['不能定位单一椎体节段、关节或软组织病变。'],
    evidenceByClass: {
      subjective: ['thoracic-rotation-reliability-v1'],
      functional: ['thoracic-rotation-reliability-v1'],
    },
  },
  'frontal-shoulder-asymmetry-tendency': {
    label: '正面肩部外观与抬臂侧差倾向',
    allowedConclusion: '至少两类证据共同提示肩部外观或抬臂表现存在可重复侧差。',
    forbiddenConclusions: ['不能确认翼状肩胛、神经损伤或特定肌肉无力。'],
    evidenceByClass: {
      subjective: ['upper-body-photogrammetry-review-v1'],
      functional: ['scapular-observation-limit-v1'],
      geometry: ['upper-body-photogrammetry-review-v1'],
    },
  },
  'frontal-trunk-deviation-tendency': {
    label: '正面躯干侧偏表现倾向',
    allowedConclusion: '至少两类证据共同提示自然站立或动作中存在可重复的躯干侧偏表现。',
    forbiddenConclusions: ['不能确认脊柱侧弯、骨性结构改变或病因。'],
    evidenceByClass: {
      subjective: ['upper-body-photogrammetry-review-v1'],
      functional: ['upper-body-photogrammetry-review-v1'],
      geometry: ['upper-body-photogrammetry-review-v1', 'thoracic-kyphosis-instrument-review-v1'],
    },
  },
};

export const postureScreeningRuleEvidenceReferences: PostureEvidenceReferenceOwner[] = Object.entries(patternDefinitions).map(
  ([patternId, definition]) => ({
    ownerId: `rule-${patternId}-v1`,
    evidenceIds: [...new Set(Object.values(definition.evidenceByClass).flatMap((ids) => ids ?? []))],
  }),
);

const subjectiveSignalMap: Record<SubjectivePostureObservation, Omit<ExtractedSignal, 'evidenceClass'>> = {
  'head-position-concern': { patternId: 'forward-head-upper-quarter-tendency', reasonCode: 'SUBJECTIVE_HEAD_POSITION_CONCERN' },
  'neck-upper-quarter-impact': { patternId: 'forward-head-upper-quarter-tendency', reasonCode: 'SUBJECTIVE_UPPER_QUARTER_IMPACT' },
  'thoracic-stiffness-or-rotation-concern': { patternId: 'thoracic-rotation-mobility-tendency', reasonCode: 'SUBJECTIVE_THORACIC_ROTATION_CONCERN' },
  'trunk-side-shift-concern': { patternId: 'frontal-trunk-deviation-tendency', reasonCode: 'SUBJECTIVE_TRUNK_SIDE_SHIFT' },
  'shoulder-height-concern': { patternId: 'frontal-shoulder-asymmetry-tendency', reasonCode: 'SUBJECTIVE_SHOULDER_HEIGHT_CONCERN' },
  'overhead-asymmetry-concern': { patternId: 'frontal-shoulder-asymmetry-tendency', reasonCode: 'SUBJECTIVE_OVERHEAD_ASYMMETRY' },
};

const functionalSignalMap: Record<FunctionalPostureObservation, Omit<ExtractedSignal, 'evidenceClass'>> = {
  'head-advances-during-reach': { patternId: 'forward-head-upper-quarter-tendency', reasonCode: 'FUNCTIONAL_HEAD_ADVANCES_DURING_REACH' },
  'upper-quarter-control-limited': { patternId: 'forward-head-upper-quarter-tendency', reasonCode: 'FUNCTIONAL_UPPER_QUARTER_CONTROL_LIMITED' },
  'thoracic-rotation-limited': { patternId: 'thoracic-rotation-mobility-tendency', reasonCode: 'FUNCTIONAL_THORACIC_ROTATION_LIMITED' },
  'trunk-side-shift-during-reach': { patternId: 'frontal-trunk-deviation-tendency', reasonCode: 'FUNCTIONAL_TRUNK_SIDE_SHIFT' },
  'arm-raise-asymmetry': { patternId: 'frontal-shoulder-asymmetry-tendency', reasonCode: 'FUNCTIONAL_ARM_RAISE_ASYMMETRY' },
};

const geometrySignalMap: Partial<Record<GeometryPostureObservation, Omit<ExtractedSignal, 'evidenceClass'>>> = {
  'shoulder-height-difference': { patternId: 'frontal-shoulder-asymmetry-tendency', reasonCode: 'GEOMETRY_SHOULDER_HEIGHT_DIFFERENCE' },
  'frontal-trunk-deviation': { patternId: 'frontal-trunk-deviation-tendency', reasonCode: 'GEOMETRY_FRONTAL_TRUNK_DEVIATION' },
};

export function extractPostureSignals(input: PostureScreeningInput): ExtractedSignal[] {
  const geometrySignals = input.photo.status === 'completed'
    ? input.photo.observations.flatMap((observation) => {
        const signal = geometrySignalMap[observation];
        return signal ? [{ ...signal, evidenceClass: 'geometry' as const }] : [];
      })
    : [];
  return [
    ...input.subjectiveObservations.map((observation) => ({ ...subjectiveSignalMap[observation], evidenceClass: 'subjective' as const })),
    ...input.movement.observations.map((observation) => ({ ...functionalSignalMap[observation], evidenceClass: 'functional' as const })),
    ...geometrySignals,
  ];
}

const evidenceClassOrder: PostureEvidenceClass[] = ['subjective', 'functional', 'geometry'];

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function actions(...items: PostureNextAction[]): PostureNextAction[] {
  return items;
}

function makeResult(
  status: PostureScreeningStatus,
  summary: string,
  findings: PostureFinding[],
  evidenceIds: string[],
  reasonCodes: string[],
  nextActions: PostureNextAction[],
): PostureScreeningResult {
  return {
    status,
    summary,
    findings,
    evidenceIds: unique(evidenceIds),
    reasonCodes,
    nextActions,
    algorithmVersion: '1.0.0',
    protocolVersion: 'adult-posture-screening-v1',
  };
}

function safetyReason(prefix: 'SAFETY' | 'TEST_STOPPED', value: string): string {
  return `${prefix}_${value.replaceAll('-', '_').toUpperCase()}`;
}

export function evaluatePostureScreening(input: PostureScreeningInput): PostureScreeningResult {
  if (!Number.isFinite(input.age) || input.age < 18 || !input.boundaryAccepted) {
    return makeResult(
      'safety-review',
      '当前版本仅支持已满 18 岁并理解筛查边界的成人。',
      [],
      ['posture-reference-values-age-context-v1'],
      [input.age < 18 ? 'AGE_OUT_OF_SCOPE' : 'BOUNDARY_NOT_ACCEPTED'],
      actions({ id: 'return-posture-hub', label: '返回体态主页', kind: 'return' }),
    );
  }

  if (input.safetyFlags.length > 0) {
    return makeResult(
      'safety-review',
      '检测到需要先确认的安全信号，本次自测已暂停。',
      [],
      ['pre-activity-safety-screen-v1'],
      input.safetyFlags.map((flag) => safetyReason('SAFETY', flag)),
      actions(
        { id: 'seek-professional-review', label: '先咨询合格医疗专业人员', kind: 'professional-review' },
        { id: 'return-posture-hub', label: '返回体态主页', kind: 'return' },
      ),
    );
  }

  if (input.movement.status === 'stopped' || input.movement.stopSymptoms.length > 0) {
    const symptoms = input.movement.stopSymptoms.length > 0 ? input.movement.stopSymptoms : ['marked-pain-increase' as const];
    return makeResult(
      'safety-review',
      '引导观察中出现停止信号，本次自测已终止。',
      [],
      ['pre-activity-safety-screen-v1'],
      symptoms.map((symptom) => safetyReason('TEST_STOPPED', symptom)),
      actions(
        { id: 'seek-professional-review', label: '根据症状寻求专业评估', kind: 'professional-review' },
        { id: 'return-posture-hub', label: '返回体态主页', kind: 'return' },
      ),
    );
  }

  if (input.photo.status === 'invalid') {
    return makeResult(
      'measurement-invalid',
      '照片或标点暂不满足测量条件，可重拍或跳过照片继续。',
      [],
      ['upper-body-photogrammetry-review-v1'],
      input.photo.reasonCodes.length > 0 ? input.photo.reasonCodes : ['MEASUREMENT_INVALID'],
      actions(
        { id: 'retake-photo', label: '重新拍摄或标点', kind: 'retake' },
        { id: 'continue-without-photo', label: '跳过照片继续', kind: 'skip-photo' },
      ),
    );
  }

  const signals = extractPostureSignals(input);
  const grouped = new Map<PatternId, ExtractedSignal[]>();
  for (const signal of signals) grouped.set(signal.patternId, [...(grouped.get(signal.patternId) ?? []), signal]);

  const findings: PostureFinding[] = [];
  for (const [patternId, patternSignals] of grouped) {
    const definition = patternDefinitions[patternId];
    const evidenceClasses = evidenceClassOrder.filter((evidenceClass) => patternSignals.some((signal) => signal.evidenceClass === evidenceClass));
    if (evidenceClasses.length < 2) continue;
    findings.push({
      patternId,
      label: definition.label,
      evidenceClasses,
      evidenceIds: unique(evidenceClasses.flatMap((evidenceClass) => definition.evidenceByClass[evidenceClass] ?? [])),
      reasonCodes: unique(patternSignals.map(({ reasonCode }) => reasonCode)),
      confidence: 'supported',
      allowedConclusion: definition.allowedConclusion,
      forbiddenConclusions: definition.forbiddenConclusions,
    });
  }

  const signalEvidenceIds = unique(signals.flatMap((signal) => patternDefinitions[signal.patternId].evidenceByClass[signal.evidenceClass] ?? []));
  const photoReasonCodes = input.photo.status === 'skipped' ? ['PHOTO_SKIPPED'] : [];

  const supportedPatternIds = new Set(findings.map(({ patternId }) => patternId));
  const hasUnmatchedPattern = [...grouped.keys()].some((patternId) => !supportedPatternIds.has(patternId));
  if (findings.length > 0 && hasUnmatchedPattern) {
    return makeResult(
      'mixed-evidence',
      '已有体态表现获得交叉支持，但另有观察指向不同表现，需要保留不确定性。',
      findings,
      signalEvidenceIds,
      [...photoReasonCodes, 'ADDITIONAL_UNCONFIRMED_PATTERN'],
      actions(
        { id: 'edit-observations', label: '检查并修改观察', kind: 'edit' },
        { id: 'repeat-screening', label: '按相同方法重新评估', kind: 'retest' },
        { id: 'return-posture-hub', label: '返回体态主页', kind: 'return' },
      ),
    );
  }

  if (findings.length === 0 && grouped.size > 1) {
    return makeResult(
      'mixed-evidence',
      '目前几类证据指向不同表现，暂不强行归为某一种体态倾向。',
      [],
      signalEvidenceIds,
      [...photoReasonCodes, 'EVIDENCE_POINTS_TO_DIFFERENT_PATTERNS'],
      actions(
        { id: 'edit-observations', label: '检查并修改观察', kind: 'edit' },
        { id: 'repeat-screening', label: '按相同方法重新评估', kind: 'retest' },
        { id: 'return-posture-hub', label: '返回体态主页', kind: 'return' },
      ),
    );
  }

  if (findings.length === 0) {
    const status = input.photo.status === 'skipped' ? 'functional-only' : 'completed';
    return makeResult(
      status,
      '现有证据不足以确认某一种特定体态表现倾向。',
      [],
      signalEvidenceIds,
      [...photoReasonCodes, 'INSUFFICIENT_EVIDENCE'],
      actions(
        { id: 'edit-observations', label: '检查已有观察', kind: 'edit' },
        { id: 'repeat-screening', label: '稍后按相同方法复测', kind: 'retest' },
        { id: 'return-posture-hub', label: '返回体态主页', kind: 'return' },
      ),
    );
  }

  const hasFunctionalSupport = findings.some(({ evidenceClasses }) => evidenceClasses.includes('functional'));
  const resultReasonCodes = [...photoReasonCodes];
  if (!hasFunctionalSupport) resultReasonCodes.push('FUNCTIONAL_EVIDENCE_NOT_PROVIDED');
  const status = input.photo.status === 'skipped' ? 'functional-only' : 'completed';
  return makeResult(
    status,
    findings.length === 1 ? `本次筛查支持：${findings[0].label}。` : `本次筛查支持 ${findings.length} 项相互独立的体态表现倾向。`,
    findings,
    findings.flatMap(({ evidenceIds }) => evidenceIds),
    resultReasonCodes,
    actions(
      { id: 'view-history', label: '查看评估记录', kind: 'history' },
      { id: 'repeat-screening', label: '稍后按相同方法复测', kind: 'retest' },
      { id: 'return-posture-hub', label: '返回体态主页', kind: 'return' },
    ),
  );
}
