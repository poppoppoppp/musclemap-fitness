import rawPostureDataset from '../data/posture/postureDataset.v0.1.json' with { type: 'json' };
import type {
  PostureDataset,
  PostureProtocol,
  PostureProtocolExerciseItem,
  VisiblePostureIssue
} from '../types/posture';

export const postureDataset = rawPostureDataset as unknown as PostureDataset;

// V0.1 manual release gate. Keep review decisions here instead of scattering
// appEligibility exceptions across components.
const RELEASED_PROTOCOL_IDS = new Set(['SHOULDER_001']);

export function getAddableProtocolItems(
  protocol: PostureProtocol,
  dataset: PostureDataset = postureDataset
): PostureProtocolExerciseItem[] {
  const standardExerciseIds = new Set(
    safeArray(dataset.standardExercises)
      .filter((exercise) => exercise.appEligibility !== 'hold')
      .map(({ id }) => id)
  );

  return safeArray(protocol.exerciseItems)
    .filter(
      (item) =>
        item.includeByDefault !== false &&
        item.appEligibility !== 'hold' &&
        standardExerciseIds.has(item.exerciseId)
    )
    .sort((left, right) => left.order - right.order);
}

export function isProtocolVisibleInApp(
  protocol: PostureProtocol,
  dataset: PostureDataset = postureDataset
): boolean {
  return (
    protocol.status === 'ready' &&
    RELEASED_PROTOCOL_IDS.has(protocol.id) &&
    getAddableProtocolItems(protocol, dataset).length > 0
  );
}

export function getVisiblePostureProtocols(dataset: PostureDataset = postureDataset): PostureProtocol[] {
  return safeArray(dataset.protocols).filter((protocol) => isProtocolVisibleInApp(protocol, dataset));
}

export function isPostureExerciseVisibleInApp(exerciseId: string, dataset: PostureDataset = postureDataset): boolean {
  return getVisiblePostureProtocols(dataset).some((protocol) =>
    getAddableProtocolItems(protocol, dataset).some((item) => item.exerciseId === exerciseId)
  );
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

export function getPostureStandardExerciseById(exerciseId: string, dataset: PostureDataset = postureDataset) {
  return safeArray(dataset.standardExercises).find((exercise) => exercise.id === exerciseId);
}

function safeArray<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}
