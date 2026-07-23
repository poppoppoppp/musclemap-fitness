import type { ActiveWorkout, ActiveWorkoutExercise, ActiveWorkoutSet, ActiveWorkoutSource } from '../types/activeWorkout';
import type { PostureDataset, PostureDose, PostureProtocolExerciseSnapshot, PostureProtocolStepSnapshot, PostureProtocolWorkoutSnapshot } from '../types/posture';
import type { TrainingTemplate, TrainingTemplateItem } from '../types/trainingTemplate';
import type { PosturePlan } from '../types/posturePlan';
import type { GeneratedPlan, GeneratedPlanItem, GeneratedWorkoutDay, WorkoutLog, WorkoutLogExercise, WorkoutSet } from '../types/workout';
import {
  formatDose,
  getPostureProtocolById,
  getPostureStandardExerciseById,
  getRequiredProtocolSelectionGroups,
  getSelectedAddableProtocolSteps,
  isProtocolVisibleInApp,
  postureDataset
} from './postureProtocols';
import { readStorage, removeStorage, writeStorage } from './storage';
import { getPosturePlanEligibility } from './posturePlanRules';

export const ACTIVE_WORKOUT_KEY = 'musclemap.activeWorkout.v0.7';

export type ActiveWorkoutArchiveError = 'no-exercise' | 'no-valid-set' | 'integer-reps' | 'invalid-number';
export type ActiveWorkoutArchiveResult =
  | { ok: true; log: WorkoutLog }
  | { ok: false; error: ActiveWorkoutArchiveError };

export function readActiveWorkout(): ActiveWorkout | null {
  const workout = readStorage<ActiveWorkout | null>(ACTIVE_WORKOUT_KEY, null);
  return normalizeActiveWorkout(workout);
}

export function normalizeActiveWorkout(value: unknown): ActiveWorkout | null {
  return isActiveWorkout(value) ? value : null;
}

export function writeActiveWorkout(workout: ActiveWorkout): void {
  writeStorage(ACTIVE_WORKOUT_KEY, { ...workout, updatedAt: new Date().toISOString() });
}

export function clearActiveWorkout(): void {
  removeStorage(ACTIVE_WORKOUT_KEY);
}

export function createManualActiveWorkout(now = new Date()): ActiveWorkout {
  const timestamp = now.toISOString();
  return {
    id: createId('active-workout'),
    status: 'active',
    startedAt: timestamp,
    trainingDate: getLocalDateKeyFromDate(now),
    source: 'manual',
    exercises: [],
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function startPosturePlanWorkout(
  plan: PosturePlan,
  occurrence: { date: string; weekIndex: number },
  now = new Date(),
  dataset: PostureDataset = postureDataset
): ActiveWorkout {
  const workout = createManualActiveWorkout(now);
  workout.source = 'posture';
  return addPosturePlanTaskToActiveWorkout(workout, plan, occurrence, now, dataset);
}

export function addPosturePlanTaskToActiveWorkout(
  workout: ActiveWorkout,
  plan: PosturePlan,
  occurrence: { date: string; weekIndex: number },
  now = new Date(),
  dataset: PostureDataset = postureDataset
): ActiveWorkout {
  if (workout.posturePlanContext) return workout;
  const protocol = getPostureProtocolById(plan.protocolId, dataset);
  if (!protocol || !getPosturePlanEligibility(protocol, dataset).eligible) return workout;
  const next = addPostureProtocolToActiveWorkout(workout, plan.protocolId, now, dataset);
  if (next === workout) return workout;
  return touch({
    ...next,
    posturePlanContext: { planId: plan.id, weekIndex: occurrence.weekIndex, scheduledDate: occurrence.date }
  });
}

export function addExerciseToActiveWorkout(workout: ActiveWorkout, exerciseId: string): ActiveWorkout {
  return touch({
    ...workout,
    exercises: [...workout.exercises, createActiveWorkoutExercise(exerciseId, workout.exercises.length, 'manual')]
  });
}

export function addPostureProtocolToActiveWorkout(
  workout: ActiveWorkout,
  protocolId: string,
  now = new Date(),
  dataset: PostureDataset = postureDataset,
  selectedExerciseIds: string[] = []
): ActiveWorkout {
  const protocol = getPostureProtocolById(protocolId, dataset);
  if (!protocol || !isProtocolVisibleInApp(protocol, dataset)) return workout;

  const selected = new Set(selectedExerciseIds);
  const hasRequiredSelections = getRequiredProtocolSelectionGroups(protocol).every((groupId) =>
    protocol.steps.filter((step) => step.selectionGroupId === groupId && step.exerciseId && selected.has(step.exerciseId)).length === 1
  );
  if (!hasRequiredSelections) return workout;

  const instanceId = createId('posture-protocol');
  const addedAt = now.toISOString();
  const includedSteps = getSelectedAddableProtocolSteps(protocol, selectedExerciseIds);
  const includedStepIds = new Set(includedSteps.map(({ id }) => id));
  const addedExercises: ActiveWorkoutExercise[] = [];
  const exerciseSnapshots: PostureProtocolExerciseSnapshot[] = [];
  const stepSnapshots: PostureProtocolStepSnapshot[] = [];

  for (const step of [...protocol.steps].sort((left, right) => left.order - right.order)) {
    if (step.kind === 'observation') {
      const observation = dataset.observations.find(({ id }) => id === step.observationId);
      if (!observation) continue;
      stepSnapshots.push({
        id: step.id,
        order: step.order,
        groupKey: step.groupKey,
        groupLabel: step.groupLabel,
        kind: 'observation',
        titleSnapshot: observation.name,
        observationId: observation.id,
        includedInWorkout: false,
        purposeSnapshot: observation.purpose,
        limitationSnapshot: observation.limitation
      });
      continue;
    }

    if (!step.exerciseId) continue;
    const standardExercise = getPostureStandardExerciseById(step.exerciseId, dataset);
    if (!standardExercise) continue;
    const includedInWorkout = includedStepIds.has(step.id);
    let exercise: ActiveWorkoutExercise | undefined;
    if (includedInWorkout) {
      exercise = createActiveWorkoutExercise(
        step.exerciseId,
        workout.exercises.length + addedExercises.length,
        'posture',
        getInitialPostureSetCount(step.dose)
      );
      exercise.postureProtocolInstanceId = instanceId;
      if (step.dose?.durationSeconds !== undefined || step.dose?.durationRangeSeconds !== undefined) {
        exercise.setEntryMode = 'duration';
      }
      const planned = getPosturePlannedDose(step.dose);
      if (planned) exercise.planned = planned;
      addedExercises.push(exercise);

      const item = protocol.exerciseItems.find((candidate) => candidate.exerciseId === step.exerciseId && candidate.order === step.order);
      if (item) {
        exerciseSnapshots.push({
          instanceId: exercise.id,
          exerciseId: step.exerciseId,
          nameSnapshot: standardExercise.name,
          order: step.order,
          roleInProtocol: step.groupKey,
          roleExplanation: step.groupLabel,
          prescription: { ...item.prescription },
          specialCues: [...(step.notes ?? [])],
          sourceOriginalText: item.sourceOriginalText,
          groupKey: step.groupKey,
          groupLabel: step.groupLabel,
          dose: cloneDose(step.dose),
          doseConfidence: step.dose?.confidence,
          visualReviewRequired: standardExercise.visualReviewRequired,
          visualReviewNote: standardExercise.visualReviewNote
        });
      }
    }

    stepSnapshots.push({
      id: step.id,
      order: step.order,
      groupKey: step.groupKey,
      groupLabel: step.groupLabel,
      kind: 'exercise',
      titleSnapshot: standardExercise.name,
      exerciseId: step.exerciseId,
      exerciseInstanceId: exercise?.id,
      includedInWorkout,
      optional: step.optional,
      selectionGroupId: step.selectionGroupId,
      dose: cloneDose(step.dose),
      notes: step.notes ? [...step.notes] : undefined,
      visualReviewRequired: standardExercise.visualReviewRequired,
      visualReviewNote: standardExercise.visualReviewNote
    });
  }

  if (addedExercises.length === 0) return workout;

  const group: PostureProtocolWorkoutSnapshot = {
    instanceId,
    sourceProtocolId: protocol.id,
    nameSnapshot: protocol.title,
    targetIssueNamesSnapshot: [...protocol.targetIssues],
    limitationsSnapshot: [...protocol.limitations],
    addedAt,
    isModified: false,
    order: workout.postureProtocolGroups?.length ?? 0,
    exerciseInstanceIds: addedExercises.map(({ id }) => id),
    exerciseSnapshots,
    stepSnapshots
  };

  return touch({
    ...workout,
    exercises: [...workout.exercises, ...addedExercises],
    postureProtocolGroups: [...(workout.postureProtocolGroups ?? []), group]
  });
}

export function startWorkoutWithExercise(exerciseId: string): ActiveWorkout {
  const workout = createManualActiveWorkout();
  const nextWorkout: ActiveWorkout = {
    ...workout,
    source: 'exercise-detail',
    exercises: [createActiveWorkoutExercise(exerciseId, 0, 'exercise-detail')]
  };
  writeActiveWorkout(nextWorkout);
  return readActiveWorkout() ?? nextWorkout;
}

export function createActiveWorkoutFromPlanDay(plan: GeneratedPlan, day: GeneratedWorkoutDay, now = new Date()): ActiveWorkout {
  const timestamp = now.toISOString();
  return {
    id: createId('active-workout'),
    status: 'active',
    startedAt: timestamp,
    trainingDate: getLocalDateKeyFromDate(now),
    source: 'plan',
    planId: plan.id,
    planDayId: day.id,
    exercises: day.items.map(mapGeneratedPlanItemToActiveWorkoutExercise),
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function createActiveWorkoutFromTemplate(template: TrainingTemplate, now = new Date()): ActiveWorkout {
  const timestamp = now.toISOString();
  const templateExercises = [...template.items].sort((left, right) => left.order - right.order).map(mapTrainingTemplateItemToActiveWorkoutExercise);
  const instantiatedPosture = instantiateTemplatePostureGroups(template.postureProtocolGroups, templateExercises.length, now);
  return {
    id: createId('active-workout'),
    status: 'active',
    startedAt: timestamp,
    trainingDate: getLocalDateKeyFromDate(now),
    source: 'template',
    templateId: template.id,
    exercises: [...templateExercises, ...instantiatedPosture.exercises],
    ...(instantiatedPosture.groups ? { postureProtocolGroups: instantiatedPosture.groups } : {}),
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function instantiateTemplatePostureGroups(
  groups: PostureProtocolWorkoutSnapshot[] | undefined,
  exerciseOffset: number,
  now: Date
): { groups?: PostureProtocolWorkoutSnapshot[]; exercises: ActiveWorkoutExercise[] } {
  if (!groups?.length) return { exercises: [] };
  const exercises: ActiveWorkoutExercise[] = [];
  const instantiatedGroups = [...groups].sort((left, right) => left.order - right.order).flatMap((group, order) => {
    const instanceId = createId('posture-protocol');
    const snapshotsById = new Map(group.exerciseSnapshots.map((snapshot) => [snapshot.instanceId, snapshot]));
    const exerciseIdMap = new Map<string, string>();
    const groupExercises = group.exerciseInstanceIds.flatMap((templateExerciseId) => {
      const snapshot = snapshotsById.get(templateExerciseId);
      if (!snapshot) return [];
      const exercise = createActiveWorkoutExercise(
        snapshot.exerciseId,
        exerciseOffset + exercises.length,
        'template',
        getInitialTemplatePostureSetCount(snapshot)
      );
      exercise.postureProtocolInstanceId = instanceId;
      if (snapshot.dose?.durationSeconds !== undefined || snapshot.dose?.durationRangeSeconds !== undefined || snapshot.prescription.durationSeconds !== null) {
        exercise.setEntryMode = 'duration';
      }
      exercise.planned = getTemplatePosturePlannedDose(snapshot);
      exerciseIdMap.set(templateExerciseId, exercise.id);
      exercises.push(exercise);
      return [exercise];
    });
    if (groupExercises.length === 0) return [];

    const exerciseInstanceIds = group.exerciseInstanceIds.flatMap((templateExerciseId) => {
      const exerciseInstanceId = exerciseIdMap.get(templateExerciseId);
      return exerciseInstanceId ? [exerciseInstanceId] : [];
    });
    return [{
      ...group,
      instanceId,
      addedAt: now.toISOString(),
      order,
      targetIssueNamesSnapshot: [...group.targetIssueNamesSnapshot],
      limitationsSnapshot: group.limitationsSnapshot ? [...group.limitationsSnapshot] : undefined,
      exerciseInstanceIds,
      exerciseSnapshots: group.exerciseSnapshots.flatMap((snapshot) => {
        const exerciseInstanceId = exerciseIdMap.get(snapshot.instanceId);
        return exerciseInstanceId ? [{
          ...snapshot,
          instanceId: exerciseInstanceId,
          prescription: { ...snapshot.prescription },
          specialCues: [...snapshot.specialCues],
          dose: cloneDose(snapshot.dose)
        }] : [];
      }),
      stepSnapshots: group.stepSnapshots?.map((snapshot) => ({
        ...snapshot,
        exerciseInstanceId: snapshot.exerciseInstanceId ? exerciseIdMap.get(snapshot.exerciseInstanceId) : undefined,
        includedInWorkout: snapshot.kind === 'exercise' && snapshot.includedInWorkout
          ? Boolean(snapshot.exerciseInstanceId && exerciseIdMap.has(snapshot.exerciseInstanceId))
          : snapshot.includedInWorkout,
        dose: cloneDose(snapshot.dose),
        notes: snapshot.notes ? [...snapshot.notes] : undefined
      }))
    }];
  });
  return { groups: instantiatedGroups.length ? instantiatedGroups : undefined, exercises };
}

function getInitialTemplatePostureSetCount(snapshot: PostureProtocolExerciseSnapshot) {
  if (typeof snapshot.dose?.sets === 'number') return snapshot.dose.sets;
  if (typeof snapshot.prescription.sets === 'number') return snapshot.prescription.sets;
  return getInitialPostureSetCount(snapshot.dose);
}

function getTemplatePosturePlannedDose(snapshot: PostureProtocolExerciseSnapshot): ActiveWorkoutExercise['planned'] {
  const fromDose = getPosturePlannedDose(snapshot.dose) ?? {};
  return {
    ...fromDose,
    ...(fromDose.sets === undefined && snapshot.prescription.sets !== null ? { sets: snapshot.prescription.sets } : {}),
    ...(fromDose.repRange === undefined && snapshot.prescription.reps !== null ? { repRange: String(snapshot.prescription.reps) } : {}),
    ...(fromDose.durationSeconds === undefined && snapshot.prescription.durationSeconds !== null ? { durationSeconds: snapshot.prescription.durationSeconds } : {}),
    ...(snapshot.prescription.restSeconds !== null ? { restSeconds: snapshot.prescription.restSeconds } : {}),
    ...(fromDose.note === undefined && snapshot.sourceOriginalText ? { note: snapshot.sourceOriginalText } : {})
  };
}

export function mapTrainingTemplateItemToActiveWorkoutExercise(item: TrainingTemplateItem, index: number): ActiveWorkoutExercise {
  return {
    id: createId('active-exercise'),
    exerciseId: item.exerciseId,
    order: index,
    source: 'template',
    planned: {
      sets: item.sets,
      repRange: item.repRange,
      restSeconds: item.restSeconds,
      note: item.note
    },
    sets: Array.from({ length: Math.max(1, item.sets) }, (_, setIndex) => createActiveWorkoutSet(setIndex + 1))
  };
}

export function mapGeneratedPlanItemToActiveWorkoutExercise(item: GeneratedPlanItem, index: number): ActiveWorkoutExercise {
  return {
    id: createId('active-exercise'),
    exerciseId: item.exerciseId,
    order: index,
    source: 'plan',
    planned: {
      sets: item.sets,
      repRange: item.repRange,
      restSeconds: item.restSeconds,
      note: item.note
    },
    sets: Array.from({ length: Math.max(1, item.sets) }, (_, setIndex) => createActiveWorkoutSet(setIndex + 1))
  };
}

export function addExerciseToExistingActiveWorkout(exerciseId: string): { status: 'added' | 'duplicate' | 'missing'; workout: ActiveWorkout | null } {
  const workout = readActiveWorkout();
  if (!workout) return { status: 'missing', workout: null };
  if (isExerciseInActiveWorkout(workout, exerciseId)) return { status: 'duplicate', workout };

  const nextWorkout = touch({
    ...workout,
    exercises: [...workout.exercises, createActiveWorkoutExercise(exerciseId, workout.exercises.length, 'exercise-detail')]
  });
  writeActiveWorkout(nextWorkout);
  return { status: 'added', workout: readActiveWorkout() ?? nextWorkout };
}

export function isExerciseInActiveWorkout(workout: ActiveWorkout, exerciseId: string): boolean {
  return workout.exercises.some((exercise) => exercise.exerciseId === exerciseId);
}

export function removeExerciseFromActiveWorkout(workout: ActiveWorkout, activeExerciseId: string): ActiveWorkout {
  const removedExercise = workout.exercises.find((exercise) => exercise.id === activeExerciseId);
  const postureProtocolGroups = updateGroupsAfterExerciseRemoval(
    workout.postureProtocolGroups,
    removedExercise?.postureProtocolInstanceId,
    activeExerciseId
  );
  return touch({
    ...workout,
    exercises: workout.exercises
      .filter((exercise) => exercise.id !== activeExerciseId)
      .map((exercise, index) => ({ ...exercise, order: index })),
    postureProtocolGroups
  });
}

export function removePostureProtocolGroup(workout: ActiveWorkout, instanceId: string): ActiveWorkout {
  const group = workout.postureProtocolGroups?.find((item) => item.instanceId === instanceId);
  if (!group) return workout;
  const linkedIds = new Set(group.exerciseInstanceIds);
  return touch({
    ...workout,
    exercises: workout.exercises
      .filter((exercise) => !linkedIds.has(exercise.id))
      .map((exercise, index) => ({ ...exercise, order: index })),
    postureProtocolGroups: (workout.postureProtocolGroups ?? [])
      .filter((item) => item.instanceId !== instanceId)
      .map((item, index) => ({ ...item, order: index }))
  });
}

export function movePostureProtocolGroup(
  workout: ActiveWorkout,
  instanceId: string,
  direction: 'up' | 'down'
): ActiveWorkout {
  const groups = [...(workout.postureProtocolGroups ?? [])].sort((left, right) => left.order - right.order);
  const index = groups.findIndex((group) => group.instanceId === instanceId);
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || targetIndex < 0 || targetIndex >= groups.length) return workout;
  [groups[index], groups[targetIndex]] = [groups[targetIndex], groups[index]];
  const linkedIds = new Set(groups.flatMap((group) => group.exerciseInstanceIds));
  const linkedPositions = workout.exercises.flatMap((exercise, exerciseIndex) => linkedIds.has(exercise.id) ? [exerciseIndex] : []);
  const exerciseById = new Map(workout.exercises.map((exercise) => [exercise.id, exercise]));
  const orderedLinkedExercises = groups.flatMap((group) =>
    group.exerciseInstanceIds.flatMap((exerciseId) => {
      const exercise = exerciseById.get(exerciseId);
      return exercise ? [exercise] : [];
    })
  );
  const exercises = [...workout.exercises];
  linkedPositions.forEach((position, orderedIndex) => {
    const exercise = orderedLinkedExercises[orderedIndex];
    if (exercise) exercises[position] = exercise;
  });
  return touch({
    ...workout,
    exercises: exercises.map((exercise, order) => ({ ...exercise, order })),
    postureProtocolGroups: groups.map((group, order) => ({ ...group, order }))
  });
}

export function movePostureProtocolExercise(
  workout: ActiveWorkout,
  protocolInstanceId: string,
  activeExerciseId: string,
  direction: 'up' | 'down'
): ActiveWorkout {
  const group = workout.postureProtocolGroups?.find(({ instanceId }) => instanceId === protocolInstanceId);
  if (!group) return workout;
  const index = group.exerciseInstanceIds.indexOf(activeExerciseId);
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || targetIndex < 0 || targetIndex >= group.exerciseInstanceIds.length) return workout;

  const exerciseInstanceIds = [...group.exerciseInstanceIds];
  [exerciseInstanceIds[index], exerciseInstanceIds[targetIndex]] = [exerciseInstanceIds[targetIndex], exerciseInstanceIds[index]];
  const snapshotById = new Map(group.exerciseSnapshots.map((snapshot) => [snapshot.instanceId, snapshot]));
  const exerciseSnapshots = exerciseInstanceIds.flatMap((id, order) => {
    const snapshot = snapshotById.get(id);
    return snapshot ? [{ ...snapshot, order: order + 1 }] : [];
  });
  const exercises = [...workout.exercises];
  const sourceIndex = exercises.findIndex(({ id }) => id === activeExerciseId);
  const siblingIndex = exercises.findIndex(({ id }) => id === group.exerciseInstanceIds[targetIndex]);
  if (sourceIndex >= 0 && siblingIndex >= 0) [exercises[sourceIndex], exercises[siblingIndex]] = [exercises[siblingIndex], exercises[sourceIndex]];

  return touch({
    ...workout,
    exercises: exercises.map((exercise, order) => ({ ...exercise, order })),
    postureProtocolGroups: workout.postureProtocolGroups?.map((item) =>
      item.instanceId === protocolInstanceId
        ? { ...item, exerciseInstanceIds, exerciseSnapshots, isModified: true }
        : item
    )
  });
}

export function addSetToActiveWorkoutExercise(workout: ActiveWorkout, activeExerciseId: string): ActiveWorkout {
  return updateExercise(workout, activeExerciseId, (exercise) => ({
    ...exercise,
    sets: [...exercise.sets, createActiveWorkoutSet(exercise.sets.length + 1)]
  }));
}

export function removeSetFromActiveWorkoutExercise(workout: ActiveWorkout, activeExerciseId: string, setId: string): ActiveWorkout {
  return updateExercise(workout, activeExerciseId, (exercise) => {
    const nextSets = exercise.sets.filter((set) => set.id !== setId);
    return {
      ...exercise,
      sets: reindexSets(nextSets.length > 0 ? nextSets : [createActiveWorkoutSet(1)])
    };
  });
}

export function updateActiveWorkoutSet(
  workout: ActiveWorkout,
  activeExerciseId: string,
  setId: string,
  key: 'weight' | 'reps' | 'durationSeconds',
  value: string
): ActiveWorkout {
  return updateExercise(workout, activeExerciseId, (exercise) => {
    const nextExercise = {
      ...exercise,
      sets: exercise.sets.map((set) => (set.id === setId ? updateSetValue(set, key, value) : set))
    };

    if (nextExercise.startedAt || nextExercise.endedAt || !hasAnyDisplayableSetValue(nextExercise)) return nextExercise;

    return {
      ...nextExercise,
      startedAt: new Date().toISOString()
    };
  });
}

export function updateActiveWorkoutExerciseNotes(workout: ActiveWorkout, activeExerciseId: string, notes: string): ActiveWorkout {
  return updateExercise(workout, activeExerciseId, (exercise) => ({ ...exercise, notes }));
}

export function endActiveWorkoutExercise(workout: ActiveWorkout, activeExerciseId: string, endedAt = new Date()): ActiveWorkout {
  return updateExercise(workout, activeExerciseId, (exercise) => {
    if (!exercise.startedAt || exercise.endedAt) return exercise;

    return {
      ...exercise,
      endedAt: endedAt.toISOString()
    };
  });
}

export function getLocalDateKeyFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function archiveActiveWorkout(workout: ActiveWorkout, endedAt = new Date()): ActiveWorkoutArchiveResult {
  if (workout.exercises.length === 0) return { ok: false, error: 'no-exercise' };

  const exercisesWithSets: WorkoutLogExercise[] = [];

  for (const exercise of workout.exercises) {
    const validSets: WorkoutSet[] = [];

    for (const set of exercise.sets) {
      const normalizedSet = normalizeSet(set, validSets.length + 1);
      if (normalizedSet.error) return { ok: false, error: normalizedSet.error };
      if (normalizedSet.set) validSets.push(normalizedSet.set);
    }

    if (validSets.length > 0) {
      exercisesWithSets.push({
        id: exercise.id,
        exerciseId: exercise.exerciseId,
        order: exercisesWithSets.length,
        postureProtocolInstanceId: exercise.postureProtocolInstanceId,
        sets: validSets,
        notes: exercise.notes?.trim() || undefined
      });
    }
  }

  if (exercisesWithSets.length === 0) return { ok: false, error: 'no-valid-set' };

  const startedAtMs = new Date(workout.startedAt).getTime();
  const endedAtMs = endedAt.getTime();
  const durationSeconds =
    Number.isFinite(startedAtMs) && Number.isFinite(endedAtMs) && endedAtMs >= startedAtMs
      ? Math.round((endedAtMs - startedAtMs) / 1000)
      : undefined;

  return {
    ok: true,
    log: {
      id: createId('workout-log'),
      date: workout.trainingDate,
      planId: workout.planId,
      durationSeconds,
      exercises: exercisesWithSets,
      postureProtocolGroups: clonePostureGroups(workout.postureProtocolGroups),
      posturePlanContext: workout.posturePlanContext ? { ...workout.posturePlanContext } : undefined,
      notes: workout.notes?.trim() || undefined,
      createdAt: endedAt.toISOString()
    }
  };
}

function updateExercise(
  workout: ActiveWorkout,
  activeExerciseId: string,
  updater: (exercise: ActiveWorkoutExercise) => ActiveWorkoutExercise
): ActiveWorkout {
  const current = workout.exercises.find((exercise) => exercise.id === activeExerciseId);
  return touch({
    ...workout,
    exercises: workout.exercises.map((exercise) => (exercise.id === activeExerciseId ? updater(exercise) : exercise)),
    postureProtocolGroups: markPostureGroupModified(workout.postureProtocolGroups, current?.postureProtocolInstanceId)
  });
}

function updateSetValue(set: ActiveWorkoutSet, key: 'weight' | 'reps' | 'durationSeconds', value: string): ActiveWorkoutSet {
  const trimmed = value.trim();
  if (trimmed === '') {
    const { [key]: _removed, ...rest } = set;
    return rest;
  }
  return { ...set, [key]: Number(trimmed) };
}

function normalizeSet(set: ActiveWorkoutSet, setIndex: number): { set?: WorkoutSet; error?: ActiveWorkoutArchiveError } {
  if (set.weight !== undefined && (!Number.isFinite(set.weight) || set.weight < 0)) return { error: 'invalid-number' };
  if (set.reps !== undefined && (!Number.isFinite(set.reps) || set.reps <= 0)) return { error: 'invalid-number' };
  if (set.reps !== undefined && !Number.isInteger(set.reps)) return { error: 'integer-reps' };
  if (set.durationSeconds !== undefined && (!Number.isFinite(set.durationSeconds) || set.durationSeconds <= 0)) return { error: 'invalid-number' };
  if (set.weight === undefined && set.reps === undefined && set.durationSeconds === undefined) return {};

  return {
    set: {
      id: set.id,
      setIndex,
      weight: set.weight,
      reps: set.reps,
      durationSeconds: set.durationSeconds,
      completed: true,
      restSeconds: set.restSeconds
    }
  };
}

function createActiveWorkoutSet(setIndex: number): ActiveWorkoutSet {
  return {
    id: createId('active-set'),
    setIndex,
    completed: false
  };
}

function getInitialPostureSetCount(dose: PostureDose | undefined) {
  if (typeof dose?.sets === 'number') return dose.sets;
  if (typeof dose?.sets === 'string') {
    const first = Number.parseInt(dose.sets, 10);
    if (Number.isFinite(first) && first > 0) return first;
  }
  return 1;
}

function getPosturePlannedDose(dose: PostureDose | undefined): ActiveWorkoutExercise['planned'] | undefined {
  if (!dose || Object.keys(dose).length === 0 || dose.confidence === 'low' || dose.confidence === 'mediumLow') return undefined;
  const repRange = dose.repsPerSide !== undefined
    ? `每侧 ${dose.repsPerSide}`
    : dose.reps !== undefined
      ? String(dose.reps)
      : undefined;
  const note = formatDose(dose);
  const planned = {
    ...(typeof dose.sets === 'number' ? { sets: dose.sets } : {}),
    ...(repRange ? { repRange } : {}),
    ...(dose.durationSeconds !== undefined ? { durationSeconds: dose.durationSeconds } : {}),
    ...(dose.durationRangeSeconds !== undefined ? { durationRangeSeconds: [...dose.durationRangeSeconds] as [number, number] } : {}),
    ...(note !== '剂量未说明' ? { note } : {})
  };
  return Object.keys(planned).length > 0 ? planned : undefined;
}

function cloneDose(dose: PostureDose | undefined): PostureDose | undefined {
  if (!dose) return undefined;
  return {
    ...dose,
    durationRangeSeconds: dose.durationRangeSeconds ? [...dose.durationRangeSeconds] as [number, number] : undefined
  };
}

function createActiveWorkoutExercise(
  exerciseId: string,
  order: number,
  source: ActiveWorkoutSource,
  setCount = 1
): ActiveWorkoutExercise {
  return {
    id: createId('active-exercise'),
    exerciseId,
    order,
    source,
    sets: Array.from({ length: Math.max(1, setCount) }, (_, index) => createActiveWorkoutSet(index + 1))
  };
}

function reindexSets(sets: ActiveWorkoutSet[]) {
  return sets.map((set, index) => ({ ...set, setIndex: index + 1 }));
}

function hasAnyDisplayableSetValue(exercise: ActiveWorkoutExercise) {
  return exercise.sets.some((set) => set.weight !== undefined || set.reps !== undefined || set.durationSeconds !== undefined);
}

function touch(workout: ActiveWorkout): ActiveWorkout {
  return { ...workout, updatedAt: new Date().toISOString() };
}

function isActiveWorkout(value: unknown): value is ActiveWorkout {
  if (!value || typeof value !== 'object') return false;
  const workout = value as ActiveWorkout;
  return (
    workout.status === 'active' &&
    typeof workout.id === 'string' &&
    typeof workout.startedAt === 'string' &&
    typeof workout.trainingDate === 'string' &&
    (workout.source === 'manual' || workout.source === 'exercise-detail' || workout.source === 'plan' || workout.source === 'posture' || workout.source === 'template') &&
    Array.isArray(workout.exercises)
  );
}

function markPostureGroupModified(
  groups: PostureProtocolWorkoutSnapshot[] | undefined,
  instanceId: string | undefined
): PostureProtocolWorkoutSnapshot[] | undefined {
  if (!groups || !instanceId) return groups;
  return groups.map((group) => (group.instanceId === instanceId ? { ...group, isModified: true } : group));
}

function updateGroupsAfterExerciseRemoval(
  groups: PostureProtocolWorkoutSnapshot[] | undefined,
  protocolInstanceId: string | undefined,
  activeExerciseId: string
): PostureProtocolWorkoutSnapshot[] | undefined {
  if (!groups || !protocolInstanceId) return groups;
  return groups.flatMap((group) => {
    if (group.instanceId !== protocolInstanceId) return [group];
    const exerciseInstanceIds = group.exerciseInstanceIds.filter((id) => id !== activeExerciseId);
    if (exerciseInstanceIds.length === 0) return [];
    const snapshotById = new Map(group.exerciseSnapshots.map((snapshot) => [snapshot.instanceId, snapshot]));
    return [{
      ...group,
      exerciseInstanceIds,
      exerciseSnapshots: exerciseInstanceIds.flatMap((id, order) => {
        const snapshot = snapshotById.get(id);
        return snapshot ? [{ ...snapshot, order: order + 1 }] : [];
      }),
      stepSnapshots: group.stepSnapshots?.map((snapshot) => snapshot.exerciseInstanceId === activeExerciseId
        ? { ...snapshot, includedInWorkout: false, exerciseInstanceId: undefined }
        : snapshot),
      isModified: true
    }];
  }).map((group, order) => ({ ...group, order }));
}

function clonePostureGroups(groups: PostureProtocolWorkoutSnapshot[] | undefined) {
  if (!groups) return undefined;
  return groups.map((group) => ({
    ...group,
    targetIssueNamesSnapshot: [...group.targetIssueNamesSnapshot],
    limitationsSnapshot: group.limitationsSnapshot ? [...group.limitationsSnapshot] : undefined,
    exerciseInstanceIds: [...group.exerciseInstanceIds],
    exerciseSnapshots: group.exerciseSnapshots.map((snapshot) => ({
      ...snapshot,
      prescription: { ...snapshot.prescription },
      specialCues: [...snapshot.specialCues],
      dose: cloneDose(snapshot.dose)
    })),
    stepSnapshots: group.stepSnapshots?.map((snapshot) => ({
      ...snapshot,
      dose: cloneDose(snapshot.dose),
      notes: snapshot.notes ? [...snapshot.notes] : undefined
    }))
  }));
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
