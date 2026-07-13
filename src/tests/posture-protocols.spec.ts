import { expect, test } from '@playwright/test';
import {
  getAddableProtocolItems,
  getVisiblePostureIssues,
  getVisiblePostureProtocols,
  isProtocolVisibleInApp,
  postureDataset
} from '../utils/postureProtocols';
import type { PostureDataset, PostureProtocol } from '../types/posture';
import { exercises, getExerciseById } from '../data/exercises';
import {
  addPostureProtocolToActiveWorkout,
  archiveActiveWorkout,
  createManualActiveWorkout,
  movePostureProtocolExercise,
  movePostureProtocolGroup,
  normalizeActiveWorkout,
  removeExerciseFromActiveWorkout,
  removePostureProtocolGroup,
  updateActiveWorkoutSet
} from '../utils/activeWorkout';

test('only centrally released ready protocols enter the V0.1 interface', () => {
  expect(getVisiblePostureProtocols(postureDataset).map(({ id }) => id)).toEqual(['SHOULDER_001']);

  const conditional = postureDataset.protocols.find(({ id }) => id === 'THORACIC_001');
  const metadataOnly = postureDataset.protocols.find(({ id }) => id === 'SHOULDER_002');
  expect(conditional && isProtocolVisibleInApp(conditional, postureDataset)).toBe(false);
  expect(metadataOnly && isProtocolVisibleInApp(metadataOnly, postureDataset)).toBe(false);
});

test('visible posture issues are deduplicated and count only released protocols', () => {
  expect(getVisiblePostureIssues(postureDataset)).toEqual([
    expect.objectContaining({ id: 'humeral-anterior-translation', protocolCount: 1 }),
    expect.objectContaining({ id: 'shoulder-clicking-discomfort', protocolCount: 1 })
  ]);
});

test('addable exercises follow positive order and exclude optional or held items', () => {
  const shoulder = postureDataset.protocols.find(({ id }) => id === 'SHOULDER_001');
  expect(shoulder).toBeTruthy();
  expect(getAddableProtocolItems(shoulder!, postureDataset).map(({ exerciseId, order }) => ({ exerciseId, order }))).toEqual([
    { exerciseId: 'quadruped-scapular-protraction-stability', order: 1 },
    { exerciseId: 'band-assisted-scapular-posterior-tilt-raise', order: 2 }
  ]);
  expect(getAddableProtocolItems(shoulder!, postureDataset).map(({ exerciseId }) => exerciseId)).not.toContain(
    'infraspinatus-teres-minor-local-pressure-release'
  );
});

test('protocol visibility requires a real addable exercise and handles empty data', () => {
  const protocol: PostureProtocol = {
    id: 'EMPTY_READY',
    name: '空方案',
    status: 'ready',
    appEligibility: 'review_before_release',
    targetIssueIds: [],
    summary: '',
    sourceOriginal: {},
    exerciseItems: []
  };
  const emptyDataset: PostureDataset = {
    schemaVersion: 'test',
    datasetName: 'test',
    postureIssues: [],
    standardExercises: [],
    protocols: [],
    theoryMaterials: [],
    guidanceMaterials: []
  };

  expect(isProtocolVisibleInApp(protocol, { ...emptyDataset, protocols: [protocol] })).toBe(false);
  expect(getVisiblePostureProtocols(emptyDataset)).toEqual([]);
  expect(getVisiblePostureIssues(emptyDataset)).toEqual([]);
});

test('adding a protocol creates an independent ordered workout snapshot', () => {
  const workout = createManualActiveWorkout(new Date('2026-07-13T12:00:00.000Z'));
  const added = addPostureProtocolToActiveWorkout(
    workout,
    'SHOULDER_001',
    new Date('2026-07-13T12:05:00.000Z')
  );
  const group = added.postureProtocolGroups?.[0];

  expect(group).toMatchObject({
    sourceProtocolId: 'SHOULDER_001',
    nameSnapshot: '肩部弹响/不适与肩胛控制方案',
    targetIssueNamesSnapshot: ['肱骨前移', '肩部弹响或不适'],
    isModified: false,
    order: 0
  });
  expect(group?.exerciseSnapshots.map(({ exerciseId, order, nameSnapshot }) => ({ exerciseId, order, nameSnapshot }))).toEqual([
    {
      exerciseId: 'quadruped-scapular-protraction-stability',
      order: 1,
      nameSnapshot: '四点跪姿肩胛前伸稳定'
    },
    {
      exerciseId: 'band-assisted-scapular-posterior-tilt-raise',
      order: 2,
      nameSnapshot: '弹力带辅助肩胛后倾上举'
    }
  ]);
  expect(added.exercises.map(({ exerciseId, postureProtocolInstanceId }) => ({ exerciseId, postureProtocolInstanceId }))).toEqual([
    { exerciseId: 'quadruped-scapular-protraction-stability', postureProtocolInstanceId: group?.instanceId },
    { exerciseId: 'band-assisted-scapular-posterior-tilt-raise', postureProtocolInstanceId: group?.instanceId }
  ]);
  expect(added.exercises[0].planned?.sets).toBe(3);
  expect(added.exercises[1].planned?.sets).toBeUndefined();

  group?.exerciseSnapshots[0].specialCues.push('本地修改');
  const sourceCueList = postureDataset.protocols
    .find(({ id }) => id === 'SHOULDER_001')
    ?.exerciseItems.find(({ order }) => order === 1)?.specialCues;
  expect(sourceCueList).not.toContain('本地修改');
});

test('editing, deleting and reordering protocol exercises marks the group modified', () => {
  const added = addPostureProtocolToActiveWorkout(createManualActiveWorkout(), 'SHOULDER_001');
  const group = added.postureProtocolGroups![0];
  const firstExercise = added.exercises.find(({ id }) => id === group.exerciseInstanceIds[0])!;
  const edited = updateActiveWorkoutSet(added, firstExercise.id, firstExercise.sets[0].id, 'reps', '8');
  expect(edited.postureProtocolGroups?.[0].isModified).toBe(true);

  const reordered = movePostureProtocolExercise(added, group.instanceId, firstExercise.id, 'down');
  expect(reordered.postureProtocolGroups?.[0].exerciseInstanceIds[1]).toBe(firstExercise.id);
  expect(reordered.postureProtocolGroups?.[0].exerciseSnapshots.map(({ order }) => order)).toEqual([1, 2]);
  expect(reordered.postureProtocolGroups?.[0].isModified).toBe(true);

  const removed = removeExerciseFromActiveWorkout(added, firstExercise.id);
  expect(removed.postureProtocolGroups?.[0].exerciseInstanceIds).not.toContain(firstExercise.id);
  expect(removed.postureProtocolGroups?.[0].isModified).toBe(true);
});

test('protocol groups move as outer units and whole-group deletion removes linked exercises', () => {
  const once = addPostureProtocolToActiveWorkout(createManualActiveWorkout(), 'SHOULDER_001');
  const twice = addPostureProtocolToActiveWorkout(once, 'SHOULDER_001');
  const [first, second] = twice.postureProtocolGroups!;
  const moved = movePostureProtocolGroup(twice, second.instanceId, 'up');
  expect(moved.postureProtocolGroups?.map(({ instanceId }) => instanceId)).toEqual([second.instanceId, first.instanceId]);
  expect(moved.exercises.map(({ postureProtocolInstanceId }) => postureProtocolInstanceId)).toEqual([
    second.instanceId,
    second.instanceId,
    first.instanceId,
    first.instanceId
  ]);

  const deleted = removePostureProtocolGroup(moved, second.instanceId);
  expect(deleted.postureProtocolGroups?.map(({ instanceId }) => instanceId)).toEqual([first.instanceId]);
  expect(deleted.exercises.some(({ postureProtocolInstanceId }) => postureProtocolInstanceId === second.instanceId)).toBe(false);
});

test('archive retains protocol names, issue labels, action context and user parameters', () => {
  const added = addPostureProtocolToActiveWorkout(createManualActiveWorkout(), 'SHOULDER_001');
  const first = added.exercises[0];
  const edited = updateActiveWorkoutSet(added, first.id, first.sets[0].id, 'reps', '10');
  const archived = archiveActiveWorkout(edited, new Date('2026-07-13T13:00:00.000Z'));

  expect(archived.ok).toBe(true);
  if (!archived.ok) return;
  expect(archived.log.postureProtocolGroups?.[0]).toMatchObject({
    sourceProtocolId: 'SHOULDER_001',
    nameSnapshot: '肩部弹响/不适与肩胛控制方案',
    targetIssueNamesSnapshot: ['肱骨前移', '肩部弹响或不适'],
    isModified: true
  });
  expect(archived.log.postureProtocolGroups?.[0].exerciseSnapshots[0]).toMatchObject({
    nameSnapshot: '四点跪姿肩胛前伸稳定',
    prescription: expect.objectContaining({ sets: 3 })
  });
  expect(archived.log.exercises[0]).toMatchObject({
    postureProtocolInstanceId: archived.log.postureProtocolGroups?.[0].instanceId,
    sets: [expect.objectContaining({ reps: 10 })]
  });
});

test('legacy active workouts normalize without requiring posture fields', () => {
  const legacy = {
    id: 'legacy',
    status: 'active',
    startedAt: '2026-07-13T10:00:00.000Z',
    trainingDate: '2026-07-13',
    source: 'manual',
    exercises: [],
    createdAt: '2026-07-13T10:00:00.000Z',
    updatedAt: '2026-07-13T10:00:00.000Z'
  };
  expect(normalizeActiveWorkout(legacy)).toEqual(legacy);
  expect(normalizeActiveWorkout({ ...legacy, status: 'complete' })).toBeNull();
});

test('standard posture actions reuse exercise details without entering the ordinary catalog', () => {
  const exercise = getExerciseById('quadruped-scapular-protraction-stability');

  expect(exercises.some(({ id }) => id === exercise?.id)).toBe(false);
  expect(exercise).toMatchObject({
    name: '四点跪姿肩胛前伸稳定',
    equipment: ['瑜伽垫'],
    steps: [
      '保持大臂外旋。',
      '主动将肩胛骨向外展开，使胸口远离地面。',
      '将上背部尽可能顶高，在该位置保持并配合均匀呼吸。',
      '控制肩胛回到自然位置。'
    ],
    postureDetails: expect.objectContaining({
      breathing: '保持姿势时均匀呼吸；视频未给出固定呼吸次数。',
      verificationStatus: '待科学核验'
    })
  });
  expect(getExerciseById('kneeling-posterior-thoracic-expansion-breathing')).toBeUndefined();
});
