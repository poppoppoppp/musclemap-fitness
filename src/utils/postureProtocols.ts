import rawPostureDataset from '../data/posture/postureDataset.v0.2.json' with { type: 'json' };
import rawLegacyPostureDataset from '../data/posture/postureDataset.v0.1.json' with { type: 'json' };
import type {
  PostureDataset,
  PostureDatasetSource,
  PostureDose,
  PostureProtocol,
  PostureProtocolExerciseItem,
  PostureProtocolStep,
  PostureProtocolSource,
  PostureStandardExercise,
  PostureStandardExerciseSource,
  VisiblePostureIssue
} from '../types/posture';
import { validatePostureDataset } from './postureDatasetValidation';

const postureDatasetSource = rawPostureDataset as unknown as PostureDatasetSource;
const postureDatasetIssues = validatePostureDataset(postureDatasetSource);

if (import.meta.env?.DEV && postureDatasetIssues.length > 0) {
  throw new Error(`Invalid posture dataset:\n${postureDatasetIssues.map(({ code, path }) => `${code}: ${path}`).join('\n')}`);
}

export const postureDataset = normalizePostureDataset(postureDatasetSource);

const legacyStandardExercises = (rawLegacyPostureDataset as unknown as { standardExercises?: PostureStandardExercise[] })
  .standardExercises ?? [];

export function getAddableProtocolItems(
  protocol: PostureProtocol,
  dataset: PostureDataset = postureDataset
): PostureProtocolExerciseItem[] {
  const standardExerciseIds = new Set(safeArray(dataset.standardExercises).map(({ id }) => id));
  return safeArray(protocol.exerciseItems)
    .filter((item) => item.includeByDefault !== false && standardExerciseIds.has(item.exerciseId))
    .sort((left, right) => left.order - right.order);
}

export function isProtocolVisibleInApp(
  protocol: PostureProtocol,
  dataset: PostureDataset = postureDataset
): boolean {
  return protocol.visibility !== 'internal' && getAddableProtocolItems(protocol, dataset).length > 0;
}

export function getVisiblePostureProtocols(dataset: PostureDataset = postureDataset): PostureProtocol[] {
  return safeArray(dataset.protocols).filter((protocol) => isProtocolVisibleInApp(protocol, dataset));
}

export function isPostureExerciseVisibleInApp(exerciseId: string, dataset: PostureDataset = postureDataset): boolean {
  return Boolean(getPostureStandardExerciseById(exerciseId, dataset));
}

export function getVisiblePostureProtocolsForIssue(
  issueId: string,
  dataset: PostureDataset = postureDataset
): PostureProtocol[] {
  return getVisiblePostureProtocols(dataset).filter((protocol) => protocol.targetIssueIds.includes(issueId));
}

export function getVisiblePostureIssues(dataset: PostureDataset = postureDataset): VisiblePostureIssue[] {
  const visibleProtocols = getVisiblePostureProtocols(dataset);
  return safeArray(dataset.postureIssues).flatMap((issue) => {
    const protocolCount = visibleProtocols.filter((protocol) => protocol.targetIssueIds.includes(issue.id)).length;
    return protocolCount > 0 ? [{ ...issue, protocolCount }] : [];
  });
}

export function getPostureProtocolById(
  protocolId: string,
  dataset: PostureDataset = postureDataset
): PostureProtocol | undefined {
  return safeArray(dataset.protocols).find((protocol) => protocol.id === protocolId);
}

export function getPostureStandardExerciseById(
  exerciseId: string,
  dataset: PostureDataset = postureDataset
): PostureStandardExercise | undefined {
  const current = safeArray(dataset.standardExercises).find(
    (exercise) => exercise.id === exerciseId || exercise.legacyIds?.includes(exerciseId)
  );
  if (current) return current;
  return legacyStandardExercises.find((exercise) => exercise.id === exerciseId);
}

export function getPostureCategoryProtocolCount(categoryId: string, dataset: PostureDataset = postureDataset): number {
  return getVisiblePostureProtocols(dataset).filter(({ category }) => category === categoryId).length;
}

export function getVisiblePostureProtocolsForCategory(
  categoryId: string,
  dataset: PostureDataset = postureDataset
): PostureProtocol[] {
  return getVisiblePostureProtocols(dataset).filter(({ category }) => category === categoryId);
}

export function getProtocolExerciseSteps(protocol: PostureProtocol): PostureProtocolStep[] {
  return protocol.steps.filter((step) => step.kind === 'exercise' && Boolean(step.exerciseId)).sort(byStepOrder);
}

export function getSelectedAddableProtocolSteps(
  protocol: PostureProtocol,
  selectedExerciseIds: string[] = []
): PostureProtocolStep[] {
  const selected = new Set(selectedExerciseIds);
  return getProtocolExerciseSteps(protocol).filter((step) => {
    if (step.optional) return false;
    if (!step.selectionGroupId) return true;
    return Boolean(step.exerciseId && selected.has(step.exerciseId));
  });
}

export function getRequiredProtocolSelectionGroups(protocol: PostureProtocol): string[] {
  return [...new Set(getProtocolExerciseSteps(protocol).flatMap(({ selectionGroupId }) => selectionGroupId ? [selectionGroupId] : []))];
}

function normalizePostureDataset(source: PostureDatasetSource): PostureDataset {
  const standardExercises = source.standardExercises.map(normalizeStandardExercise);
  const protocols = source.protocols.map((protocol) => normalizeProtocol(protocol, standardExercises));
  const targetIssues = [...new Set(protocols.flatMap(({ targetIssues: issues }) => issues))];
  const postureIssues = targetIssues.map((name, index) => ({
    id: name,
    name,
    description: `与“${name}”相关的动作控制练习。`,
    order: index
  }));

  return {
    ...source,
    postureIssues,
    standardExercises,
    protocols,
    theoryMaterials: source.theoryMaterials,
    guidanceMaterials: source.guidanceMaterials
  };
}

function normalizeProtocol(
  protocol: PostureProtocolSource,
  standardExercises: PostureStandardExercise[]
): PostureProtocol {
  const exerciseIds = new Set(standardExercises.map(({ id }) => id));
  const exerciseItems = protocol.steps.flatMap<PostureProtocolExerciseItem>((step) => {
    if (step.kind !== 'exercise' || !step.exerciseId || !exerciseIds.has(step.exerciseId)) return [];
    return [{
      exerciseId: step.exerciseId,
      order: step.order,
      roleInProtocol: step.groupKey,
      prescription: doseToLegacyPrescription(step.dose),
      roleExplanation: step.groupLabel,
      specialCues: [...(step.notes ?? [])],
      sourceOriginalText: '',
      includeByDefault: !step.optional,
      appEligibility: 'released'
    }];
  });

  return {
    ...protocol,
    name: protocol.title,
    status: 'ready',
    appEligibility: 'released',
    targetIssueIds: [...protocol.targetIssues],
    summary: protocol.userFacingGoal,
    sourceOriginal: protocol.sourceUrl ? { sourceUrl: protocol.sourceUrl } : {},
    exerciseItems
  };
}

function normalizeStandardExercise(exercise: PostureStandardExerciseSource): PostureStandardExercise {
  return {
    ...exercise,
    aliases: [...(exercise.aliases ?? [])],
    sourceOriginal: {
      summary: exercise.visualReviewNote ?? '',
      timestamp: null
    },
    standardized: {
      startPosition: exercise.startPosition ?? '未说明',
      executionSteps: [...(exercise.instructions ?? [])],
      breathing: exercise.breathing ?? '未说明',
      keyCues: [...(exercise.cues ?? [])],
      commonErrors: [...(exercise.commonErrors ?? [])],
      regression: null,
      progression: null,
      stopConditions: [...(exercise.stopConditions ?? [])]
    },
    verificationStatus: exercise.visualReviewRequired ? '需要画面复核' : '已按提供资料标准化',
    dataConfidence: exercise.dataQuality,
    appEligibility: 'released'
  };
}

function doseToLegacyPrescription(dose: PostureDose | undefined) {
  const rawText = formatDose(dose);
  return {
    sets: typeof dose?.sets === 'number' ? dose.sets : null,
    reps: typeof dose?.reps === 'number' ? dose.reps : null,
    durationSeconds: typeof dose?.durationSeconds === 'number' ? dose.durationSeconds : null,
    restSeconds: null,
    frequencyText: dose?.frequency ?? null,
    rawText
  };
}

export function formatDose(dose: PostureDose | undefined): string {
  if (!dose || Object.keys(dose).length === 0) return '剂量未说明';
  const parts: string[] = [];
  if (dose.sets !== undefined) parts.push(`${dose.sets} 组`);
  if (dose.reps !== undefined) parts.push(`${dose.reps} 次`);
  if (dose.repsPerSide !== undefined) parts.push(`每侧 ${dose.repsPerSide} 次`);
  if (dose.durationSeconds !== undefined) parts.push(`${dose.durationSeconds} 秒`);
  if (dose.durationRangeSeconds) parts.push(`${dose.durationRangeSeconds[0]}-${dose.durationRangeSeconds[1]} 秒`);
  if (dose.holdSeconds !== undefined) parts.push(`保持 ${dose.holdSeconds} 秒`);
  if (dose.mode) parts.push(dose.mode);
  if (dose.frequency) parts.push(dose.frequency);
  if (dose.load) parts.push(dose.load);
  return parts.join(' · ') || '剂量未说明';
}

function safeArray<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function byStepOrder(left: PostureProtocolStep, right: PostureProtocolStep) {
  return left.order - right.order;
}
