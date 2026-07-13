import { Link } from 'react-router-dom';
import type { ActiveWorkoutExercise } from '../../types/activeWorkout';
import type { PostureProtocolWorkoutSnapshot } from '../../types/posture';

interface PostureProtocolGroupCardProps {
  group: PostureProtocolWorkoutSnapshot;
  exercises: ActiveWorkoutExercise[];
  groupIndex: number;
  groupCount: number;
  onMoveGroup: (instanceId: string, direction: 'up' | 'down') => void;
  onMoveExercise: (groupId: string, exerciseId: string, direction: 'up' | 'down') => void;
  onDelete: (instanceId: string) => void;
}

export default function PostureProtocolGroupCard({ group, exercises, groupIndex, groupCount, onMoveGroup, onMoveExercise, onDelete }: PostureProtocolGroupCardProps) {
  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));

  return (
    <details
      id={`posture-protocol-group-${group.instanceId}`}
      data-testid="posture-protocol-group"
      open
      className="group rounded-2xl border border-lime-300/20 bg-lime-300/[0.035]"
    >
      <summary className="flex min-h-[76px] cursor-pointer list-none items-center gap-3 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-lime-300/50">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-300 text-sm font-black text-[#10130d]">态</span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold text-lime-300">体态改善</span>
          <strong className="mt-0.5 block text-wrap-pretty text-sm font-black leading-5 text-zinc-100">{group.nameSnapshot}</strong>
          <span className="mt-1 block text-xs text-zinc-500">{group.exerciseInstanceIds.length} 个动作</span>
        </span>
        {group.isModified ? <span data-testid="posture-group-modified" className="shrink-0 rounded-full bg-amber-300/10 px-2 py-1 text-[11px] font-bold text-amber-200">已修改</span> : null}
        <span aria-hidden="true" className="shrink-0 text-zinc-500 transition group-open:rotate-180">⌄</span>
      </summary>

      <div className="border-t border-white/[0.08] px-3 pb-3 pt-3">
        <p className="text-xs leading-5 text-zinc-500">{group.targetIssueNamesSnapshot.join(' · ')}</p>
        <ol className="mt-3 space-y-2">
          {group.exerciseInstanceIds.map((instanceId, index) => {
            const snapshot = group.exerciseSnapshots.find((item) => item.instanceId === instanceId);
            const exercise = exerciseById.get(instanceId);
            if (!snapshot || !exercise) return null;
            const query = new URLSearchParams({
              from: 'workout',
              postureProtocolInstanceId: group.instanceId,
              activeExerciseId: exercise.id
            });
            return (
              <li key={instanceId} className="flex min-w-0 items-center gap-2 rounded-xl bg-black/20 p-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-lime-300/30 text-xs font-black text-lime-300">{index + 1}</span>
                <Link to={`/exercises/${exercise.exerciseId}?${query.toString()}`} className="min-w-0 flex-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-300/50">
                  <strong className="block truncate text-xs font-black text-zinc-200">{snapshot.nameSnapshot}</strong>
                  <span className="mt-0.5 block text-[11px] text-zinc-500">{exercise.endedAt ? '已完成' : exercise.startedAt ? '进行中' : '待进行'}</span>
                </Link>
                <button
                  type="button"
                  aria-label={`上移${snapshot.nameSnapshot}`}
                  disabled={index === 0}
                  onClick={() => onMoveExercise(group.instanceId, exercise.id, 'up')}
                  className="h-11 w-10 rounded-lg text-sm font-black text-zinc-400 disabled:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-white/25"
                >↑</button>
                <button
                  type="button"
                  data-testid="move-posture-exercise-down"
                  aria-label={`下移${snapshot.nameSnapshot}`}
                  disabled={index === group.exerciseInstanceIds.length - 1}
                  onClick={() => onMoveExercise(group.instanceId, exercise.id, 'down')}
                  className="h-11 w-10 rounded-lg text-sm font-black text-zinc-400 disabled:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-white/25"
                >↓</button>
              </li>
            );
          })}
        </ol>

        <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
          <button type="button" disabled={groupIndex === 0} onClick={() => onMoveGroup(group.instanceId, 'up')} className="min-h-11 rounded-xl border border-white/10 text-xs font-bold text-zinc-400 disabled:text-zinc-700">上移方案</button>
          <button type="button" disabled={groupIndex === groupCount - 1} onClick={() => onMoveGroup(group.instanceId, 'down')} className="min-h-11 rounded-xl border border-white/10 text-xs font-bold text-zinc-400 disabled:text-zinc-700">下移方案</button>
          <button type="button" data-testid="delete-posture-protocol-group" onClick={() => onDelete(group.instanceId)} className="min-h-11 rounded-xl border border-red-300/20 px-3 text-xs font-bold text-red-300">删除整套</button>
        </div>
      </div>
    </details>
  );
}
