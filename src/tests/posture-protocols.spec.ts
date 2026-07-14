import { expect, test } from '@playwright/test';
import {
  getAddableProtocolItems,
  getVisiblePostureIssues,
  getVisiblePostureProtocols,
  isProtocolVisibleInApp,
  postureDataset
} from '../utils/postureProtocols';
import type { PostureDataset, PostureProtocol } from '../types/posture';
import type { ActiveWorkoutSet } from '../types/activeWorkout';
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

test('all twelve supplied training protocols enter the v0.2 interface', () => {
  expect(getVisiblePostureProtocols(postureDataset).map(({ id }) => id)).toEqual([
    'SHOULDER_001',
    'SHOULDER_002',
    'PELVIS_001',
    'PELVIS_002',
    'CERVICAL_001',
    'CERVICAL_002',
    'UPPER_POSTURE_001',
    'OROFACIAL_001',
    'THORACIC_001',
    'WINGED_SCAPULA_001',
    'WINGED_SCAPULA_002',
    'RIB_FLARE_001'
  ]);
  expect(getVisiblePostureProtocols(postureDataset).every((protocol) => isProtocolVisibleInApp(protocol, postureDataset))).toBe(true);
});

test('legacy issue adapter remains deduplicated for old return links', () => {
  const issues = getVisiblePostureIssues(postureDataset);
  expect(new Set(issues.map(({ id }) => id)).size).toBe(issues.length);
  expect(issues.find(({ id }) => id === '肩部弹响或不适')?.protocolCount).toBe(1);
});

test('addable exercises follow positive order and exclude optional or held items', () => {
  const shoulder = postureDataset.protocols.find(({ id }) => id === 'SHOULDER_001');
  expect(shoulder).toBeTruthy();
  expect(getAddableProtocolItems(shoulder!, postureDataset).map(({ exerciseId, order }) => ({ exerciseId, order }))).toEqual([
    { exerciseId: 'EX_SCAP_QUADRUPED_PROTRACTION', order: 2 },
    { exerciseId: 'EX_SCAP_BAND_POSTERIOR_TILT_ELEVATION', order: 3 }
  ]);
  expect(getAddableProtocolItems(shoulder!, postureDataset).map(({ exerciseId }) => exerciseId)).not.toContain(
    'EX_POSTERIOR_SHOULDER_PRESSURE_RELEASE'
  );
});

test('protocol visibility requires a real addable exercise and handles empty data', () => {
  const protocol: PostureProtocol = { ...structuredClone(postureDataset.protocols[0]), id: 'EMPTY_READY', steps: [], exerciseItems: [] };
  const emptyDataset: PostureDataset = {
    ...structuredClone(postureDataset),
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
    nameSnapshot: '肩胛控制与肩部不适辅助方案',
    targetIssueNamesSnapshot: ['肩部弹响或不适', '推肩、卧推、划船时肩部控制不足', '肩胛稳定不足'],
    isModified: false,
    order: 0
  });
  expect(group?.exerciseSnapshots.map(({ exerciseId, order, nameSnapshot }) => ({ exerciseId, order, nameSnapshot }))).toEqual([
    {
      exerciseId: 'EX_SCAP_QUADRUPED_PROTRACTION',
      order: 2,
      nameSnapshot: '四点跪姿肩胛前伸控制'
    },
    {
      exerciseId: 'EX_SCAP_BAND_POSTERIOR_TILT_ELEVATION',
      order: 3,
      nameSnapshot: '弹力带辅助肩胛后倾上举'
    }
  ]);
  expect(added.exercises.map(({ exerciseId, postureProtocolInstanceId }) => ({ exerciseId, postureProtocolInstanceId }))).toEqual([
    { exerciseId: 'EX_SCAP_QUADRUPED_PROTRACTION', postureProtocolInstanceId: group?.instanceId },
    { exerciseId: 'EX_SCAP_BAND_POSTERIOR_TILT_ELEVATION', postureProtocolInstanceId: group?.instanceId }
  ]);
  expect(added.exercises[0].planned?.sets).toBe(3);
  expect(added.exercises[1].planned?.sets).toBeUndefined();

  group?.exerciseSnapshots[0].specialCues.push('本地修改');
  const sourceNotes = postureDataset.protocols.find(({ id }) => id === 'SHOULDER_001')?.steps[1].notes;
  expect(sourceNotes).not.toContain('本地修改');
});

test('observations and excluded optional steps stay in the protocol snapshot only', () => {
  const added = addPostureProtocolToActiveWorkout(createManualActiveWorkout(), 'PELVIS_001');
  const group = added.postureProtocolGroups![0];

  expect(added.exercises).toHaveLength(5);
  expect(group.exerciseSnapshots).toHaveLength(5);
  expect(group.stepSnapshots).toHaveLength(7);
  expect(group.stepSnapshots?.filter(({ kind }) => kind === 'observation')).toHaveLength(2);
  expect(group.stepSnapshots?.filter(({ kind }) => kind === 'observation').every(({ includedInWorkout }) => !includedInWorkout)).toBe(true);

  const shoulder = addPostureProtocolToActiveWorkout(createManualActiveWorkout(), 'SHOULDER_001');
  const shoulderGroup = shoulder.postureProtocolGroups![0];
  expect(shoulderGroup.stepSnapshots?.find(({ optional }) => optional)).toMatchObject({
    exerciseId: 'EX_POSTERIOR_SHOULDER_PRESSURE_RELEASE',
    includedInWorkout: false
  });
});

test('a required variant adds exactly the selected exercise', () => {
  const workout = createManualActiveWorkout();
  expect(addPostureProtocolToActiveWorkout(workout, 'SHOULDER_002')).toBe(workout);

  const added = addPostureProtocolToActiveWorkout(
    workout,
    'SHOULDER_002',
    new Date('2026-07-14T08:00:00.000Z'),
    postureDataset,
    ['EX_LOW_ANGLE_ABDUCTION_CABLE']
  );
  expect(added.exercises.map(({ exerciseId }) => exerciseId)).toEqual(['EX_LOW_ANGLE_ABDUCTION_CABLE']);
  expect(added.postureProtocolGroups?.[0].exerciseSnapshots).toHaveLength(1);
});

test('an explicit duration dose can be recorded and archived without reps', () => {
  const added = addPostureProtocolToActiveWorkout(createManualActiveWorkout(), 'PELVIS_002');
  const exercise = added.exercises[0];

  expect(exercise.planned).toMatchObject({ sets: 1, durationSeconds: 60 });
  (exercise.sets[0] as ActiveWorkoutSet & { durationSeconds?: number }).durationSeconds = 45;

  const archived = archiveActiveWorkout(added, new Date('2026-07-14T09:00:00.000Z'));
  expect(archived.ok).toBe(true);
  if (!archived.ok) return;
  expect(archived.log.exercises[0].sets).toEqual([
    expect.objectContaining({ durationSeconds: 45, completed: true })
  ]);
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
  expect(removed.postureProtocolGroups?.[0].stepSnapshots?.find(({ exerciseInstanceId }) => exerciseInstanceId === firstExercise.id)).toBeUndefined();
  expect(removed.postureProtocolGroups?.[0].stepSnapshots?.find(({ exerciseId }) => exerciseId === firstExercise.exerciseId)).toMatchObject({
    includedInWorkout: false,
    exerciseInstanceId: undefined
  });
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
    nameSnapshot: '肩胛控制与肩部不适辅助方案',
    targetIssueNamesSnapshot: ['肩部弹响或不适', '推肩、卧推、划船时肩部控制不足', '肩胛稳定不足'],
    isModified: true
  });
  expect(archived.log.postureProtocolGroups?.[0].exerciseSnapshots[0]).toMatchObject({
    nameSnapshot: '四点跪姿肩胛前伸控制',
    prescription: expect.objectContaining({ sets: 3 })
  });
  expect(archived.log.postureProtocolGroups?.[0].stepSnapshots).toHaveLength(3);
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
    name: '四点跪姿肩胛前伸控制',
    equipment: ['瑜伽垫'],
    steps: ['保持肘关节角度基本不变。', '主动推地，让胸廓远离地面，肩胛骨向前、向外滑动。', '缓慢回到起始位置。'],
    postureDetails: expect.objectContaining({
      breathing: '保持均匀呼吸。',
      verificationStatus: '已按提供资料标准化'
    })
  });
  expect(getExerciseById('kneeling-posterior-thoracic-expansion-breathing')).toBeDefined();
});
