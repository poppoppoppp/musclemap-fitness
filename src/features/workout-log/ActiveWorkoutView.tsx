import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ExercisePickerSheet from '../../components/workout/ExercisePickerSheet';
import type { ActiveWorkout, ActiveWorkoutExercise } from '../../types/activeWorkout';
import type { WorkoutLog, WorkoutSet } from '../../types/workout';
import {
  addExerciseToActiveWorkout,
  addPostureProtocolToActiveWorkout,
  addSetToActiveWorkoutExercise,
  archiveActiveWorkout,
  endActiveWorkoutExercise,
  removeExerciseFromActiveWorkout,
  removeSetFromActiveWorkoutExercise,
  updateActiveWorkoutExerciseNotes,
  updateActiveWorkoutSet,
  isExerciseInActiveWorkout,
  movePostureProtocolExercise,
  movePostureProtocolGroup,
  removePostureProtocolGroup,
  type ActiveWorkoutArchiveError
} from '../../utils/activeWorkout';
import ActiveWorkoutHeader from './ActiveWorkoutHeader';
import CompletedExercisesList from './CompletedExercisesList';
import CurrentExerciseCard, { getActiveExerciseElementId } from './CurrentExerciseCard';
import WorkoutMiniPlayer from './WorkoutMiniPlayer';
import WorkoutTimerCard from './WorkoutTimerCard';
import PostureProtocolGroupCard from './PostureProtocolGroupCard';

const archiveMessages: Record<ActiveWorkoutArchiveError, string> = {
  'no-exercise': '请先添加至少一个动作',
  'no-valid-set': '请至少填写一组重量或次数',
  'integer-reps': '次数必须是整数',
  'invalid-number': '请输入有效的重量或次数'
};

interface ActiveWorkoutViewProps {
  workout: ActiveWorkout;
  onChange: (workout: ActiveWorkout) => void;
  onArchive: (log: WorkoutLog) => void;
  onDiscard: () => void;
}

export default function ActiveWorkoutView({ workout, onChange, onArchive, onDiscard }: ActiveWorkoutViewProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const focusedExerciseId = searchParams.get('focusExercise');
  const [status, setStatus] = useState('');
  const [pickerOpen, setPickerOpen] = useState(() => searchParams.get('picker') === 'posture');
  const currentExercise = useMemo(() => getCurrentExercise(workout.exercises, focusedExerciseId), [workout.exercises, focusedExerciseId]);
  const completedExercises = useMemo(() => workout.exercises.filter((exercise) => Boolean(exercise.endedAt)).sort(byExerciseOrder), [workout.exercises]);
  const pendingExercises = useMemo(() => workout.exercises.filter((exercise) => !exercise.endedAt && exercise.id !== currentExercise?.id).sort(byExerciseOrder), [workout.exercises, currentExercise?.id]);
  const currentPosition = currentExercise ? workout.exercises.findIndex((exercise) => exercise.id === currentExercise.id) + 1 : 0;
  const postureGroups = useMemo(() => [...(workout.postureProtocolGroups ?? [])].sort((left, right) => left.order - right.order), [workout.postureProtocolGroups]);

  useEffect(() => {
    if (!focusedExerciseId) return;
    const timeoutId = window.setTimeout(() => document.getElementById(getActiveExerciseElementId(focusedExerciseId))?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 0);
    return () => window.clearTimeout(timeoutId);
  }, [focusedExerciseId, workout.exercises]);

  const handleEndWorkout = () => {
    const archived = archiveActiveWorkout(workout);
    if (!archived.ok) {
      setStatus(archiveMessages[archived.error]);
      return;
    }
    onArchive(archived.log);
  };

  const handleDiscardWorkout = () => {
    if (window.confirm('确定放弃当前训练吗？本次未结束的内容不会保存为训练记录。')) onDiscard();
  };

  const handleAddExercise = (exerciseId: string) => {
    if (isExerciseInActiveWorkout(workout, exerciseId)) return false;
    const nextWorkout = addExerciseToActiveWorkout(workout, exerciseId);
    const activeExerciseId = nextWorkout.exercises.at(-1)?.id;
    onChange(nextWorkout);
    setStatus('');
    setPickerOpen(false);
    if (activeExerciseId) {
      window.setTimeout(() => {
        const element = document.getElementById(getActiveExerciseElementId(activeExerciseId));
        element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        element?.focus({ preventScroll: true });
      }, 0);
    }
    return true;
  };

  const handleAddPostureProtocol = (protocolId: string, selectedExerciseIds: string[] = []) => {
    const nextWorkout = addPostureProtocolToActiveWorkout(workout, protocolId, new Date(), undefined, selectedExerciseIds);
    if (nextWorkout === workout) return false;
    const group = nextWorkout.postureProtocolGroups?.at(-1);
    onChange(nextWorkout);
    setStatus(group ? `已加入「${group.nameSnapshot}」` : '');
    closePicker();
    if (group) {
      window.setTimeout(() => {
        const element = document.getElementById(`posture-protocol-group-${group.instanceId}`);
        element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        element?.focus({ preventScroll: true });
      }, 0);
    }
    return true;
  };

  const closePicker = () => {
    setPickerOpen(false);
    if (searchParams.get('picker') !== 'posture') return;
    const next = new URLSearchParams(searchParams);
    for (const key of ['picker', 'postureProtocolId', 'postureIssueId', 'postureCategoryId', 'postureScroll']) next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const handleDeleteExercise = (activeExerciseId: string) => {
    onChange(removeExerciseFromActiveWorkout(workout, activeExerciseId));
    setStatus('');
  };

  const handleDeletePostureGroup = (instanceId: string) => {
    onChange(removePostureProtocolGroup(workout, instanceId));
    setStatus('');
  };

  const handleMovePostureGroup = (instanceId: string, direction: 'up' | 'down') => {
    onChange(movePostureProtocolGroup(workout, instanceId, direction));
    setStatus('');
  };

  const handleMovePostureExercise = (groupId: string, exerciseId: string, direction: 'up' | 'down') => {
    onChange(movePostureProtocolExercise(workout, groupId, exerciseId, direction));
    setStatus('');
  };

  const handleEndCurrentExercise = (activeExerciseId: string) => {
    onChange(endActiveWorkoutExercise(workout, activeExerciseId));
    setStatus('');
  };

  const sharedExerciseProps = {
    onAddSet: (exerciseId: string) => onChange(addSetToActiveWorkoutExercise(workout, exerciseId)),
    onDeleteSet: (exerciseId: string, setId: string) => onChange(removeSetFromActiveWorkoutExercise(workout, exerciseId, setId)),
    onSetChange: (exerciseId: string, setId: string, key: 'weight' | 'reps' | 'durationSeconds', value: string) => onChange(updateActiveWorkoutSet(workout, exerciseId, setId, key, value)),
    onNotesChange: (exerciseId: string, notes: string) => onChange(updateActiveWorkoutExerciseNotes(workout, exerciseId, notes)),
    onDeleteExercise: handleDeleteExercise
  };

  return (
    <div data-testid="active-workout-view" className="workout-dark relative -mx-4 -mt-5 min-h-[calc(100dvh-5rem)] overflow-hidden bg-[#080a08] px-4 pb-3 pt-5 text-white sm:-mx-6 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-[radial-gradient(circle_at_70%_0%,rgba(190,242,48,0.07),transparent_48%)]" />
      <div className="relative mx-auto max-w-[440px] space-y-3.5">
        <ActiveWorkoutHeader onEndWorkout={handleEndWorkout} onDiscardWorkout={handleDiscardWorkout} musicPlayer={<WorkoutMiniPlayer compact />} />
        <WorkoutTimerCard startedAt={workout.startedAt} />
        <p data-testid="save-status" role={status ? 'status' : undefined} className={`min-h-0 text-sm font-semibold ${status ? `rounded-xl border px-3 py-2 ${status.startsWith('已加入') ? 'border-lime-300/20 bg-lime-300/[0.06] text-lime-200' : 'border-red-300/20 bg-red-400/[0.07] text-red-200'}` : ''}`}>{status}</p>

        {postureGroups.map((group, index) => (
          <PostureProtocolGroupCard
            key={group.instanceId}
            group={group}
            exercises={workout.exercises}
            groupIndex={index}
            groupCount={postureGroups.length}
            onMoveGroup={handleMovePostureGroup}
            onMoveExercise={handleMovePostureExercise}
            onDelete={handleDeletePostureGroup}
          />
        ))}

        {currentExercise ? (
          <div data-testid="current-exercise-card">
            <CurrentExerciseCard
              exercise={currentExercise}
              position={currentPosition}
              totalExercises={workout.exercises.length}
              {...sharedExerciseProps}
              onEndExercise={handleEndCurrentExercise}
            />
          </div>
        ) : (
          <section data-testid="no-current-exercise" className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center">
            <h2 className="text-base font-black text-zinc-300">{workout.exercises.length > 0 ? '所有动作均已完成' : '还没有训练动作'}</h2>
            <p className="mt-1 text-sm text-zinc-600">{workout.exercises.length > 0 ? '可以添加动作继续训练，或结束并保存本次训练' : '添加第一个动作后即可开始记录'}</p>
          </section>
        )}

        <CompletedExercisesList exercises={completedExercises} pendingExercises={pendingExercises} {...sharedExerciseProps} />

        <button type="button" onClick={() => setPickerOpen(true)} data-testid="open-exercise-picker" aria-haspopup="dialog" className="min-h-12 w-full rounded-2xl border border-lime-300/30 bg-lime-300/[0.05] text-sm font-black text-lime-300 transition hover:border-lime-300/50 hover:bg-lime-300/[0.09] focus:outline-none focus:ring-2 focus:ring-lime-300/50">
          {workout.exercises.length === 0 ? '＋ 添加第一个动作' : '＋ 添加动作'}
        </button>

        <ExercisePickerSheet
          open={pickerOpen}
          existingExerciseIds={new Set(workout.exercises.map((exercise) => exercise.exerciseId))}
          onAddExercise={handleAddExercise}
          onAddPostureProtocol={handleAddPostureProtocol}
          initialPostureProtocolId={searchParams.get('postureProtocolId')}
          initialPostureCategoryId={searchParams.get('postureCategoryId') ?? searchParams.get('postureIssueId')}
          initialPostureScrollTop={Number(searchParams.get('postureScroll') ?? 0)}
          onClose={closePicker}
        />

      </div>
    </div>
  );
}

export function getCurrentExercise(exerciseList: ActiveWorkoutExercise[], focusedExerciseId: string | null = null) {
  const unfinished = exerciseList.filter((exercise) => !exercise.endedAt);
  const focused = focusedExerciseId ? unfinished.find((exercise) => exercise.id === focusedExerciseId) : null;
  if (focused) return focused;
  const started = unfinished
    .map((exercise) => ({ exercise, startedAtMs: exercise.startedAt ? new Date(exercise.startedAt).getTime() : Number.NaN }))
    .filter((item) => Number.isFinite(item.startedAtMs))
    .sort((a, b) => b.startedAtMs - a.startedAtMs || a.exercise.order - b.exercise.order);
  return started[0]?.exercise ?? unfinished.sort(byExerciseOrder)[0] ?? null;
}

function byExerciseOrder(a: ActiveWorkoutExercise, b: ActiveWorkoutExercise) {
  return a.order - b.order;
}

function isDisplayableNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function formatWorkoutSet(set: WorkoutSet) {
  if (isDisplayableNumber(set.weight) && isDisplayableNumber(set.reps)) return `第 ${set.setIndex} 组：${set.weight}kg x ${set.reps} 次`;
  if (isDisplayableNumber(set.weight)) return `第 ${set.setIndex} 组：${set.weight}kg`;
  if (isDisplayableNumber(set.reps)) return `第 ${set.setIndex} 组：${set.reps} 次`;
  return `第 ${set.setIndex} 组`;
}
