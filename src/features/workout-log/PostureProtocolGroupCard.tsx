import { Link } from 'react-router-dom';
import type { ActiveWorkoutExercise } from '../../types/activeWorkout';
import type { PostureProtocolStepSnapshot, PostureProtocolWorkoutSnapshot } from '../../types/posture';
import { formatDose } from '../../utils/postureProtocols';

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
  const stages = getStageSnapshots(group);

  return (
    <details id={`posture-protocol-group-${group.instanceId}`} data-testid="posture-protocol-group" open className="group rounded-2xl border border-lime-300/20 bg-lime-300/[0.035]">
      <summary className="flex min-h-[76px] cursor-pointer list-none items-center gap-3 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-lime-300/50">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-300 text-sm font-black text-[#10130d]">态</span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold text-lime-300">体态改善</span>
          <strong className="mt-0.5 block text-wrap-pretty text-sm font-black leading-5 text-zinc-100">{group.nameSnapshot}</strong>
          <span className="mt-1 block text-xs text-zinc-500">{group.exerciseInstanceIds.length} 个训练动作</span>
        </span>
        {group.isModified ? <span data-testid="posture-group-modified" className="shrink-0 rounded-full bg-amber-300/10 px-2 py-1 text-[11px] font-bold text-amber-200">已修改</span> : null}
        <span aria-hidden="true" className="shrink-0 text-zinc-500 transition group-open:rotate-180">⌄</span>
      </summary>

      <div className="border-t border-white/[0.08] px-3 pb-3 pt-3">
        <p className="text-xs leading-5 text-zinc-500">{group.targetIssueNamesSnapshot.join(' · ')}</p>
        <div className="mt-3 space-y-3">
          {stages.map((stage) => (
            <section key={stage.key} data-testid="posture-group-stage" className="rounded-xl border border-white/[0.07] bg-black/15 p-2.5">
              <h3 className="px-1 text-xs font-black text-zinc-300">{stage.label}</h3>
              <div className="mt-2 space-y-2">
                {stage.steps.map((step) => {
                  if (step.kind === 'observation') {
                    return (
                      <article key={step.id} data-testid="posture-group-observation" className="rounded-lg border border-sky-300/15 bg-sky-300/[0.035] p-2.5">
                        <div className="flex items-center justify-between gap-2"><strong className="text-xs text-sky-100">{step.titleSnapshot}</strong><span className="shrink-0 text-[10px] font-bold text-sky-300/70">观察不计入训练动作</span></div>
                        {step.purposeSnapshot ? <p className="mt-1 text-[11px] leading-5 text-zinc-400">{step.purposeSnapshot}</p> : null}
                        {step.limitationSnapshot ? <p className="mt-1 text-[11px] leading-5 text-zinc-600">限制：{step.limitationSnapshot}</p> : null}
                      </article>
                    );
                  }

                  const instanceId = step.exerciseInstanceId;
                  const exercise = instanceId ? exerciseById.get(instanceId) : undefined;
                  const includedIndex = instanceId ? group.exerciseInstanceIds.indexOf(instanceId) : -1;
                  const canOpen = Boolean(exercise && instanceId && step.exerciseId);
                  const query = canOpen ? new URLSearchParams({ from: 'workout', postureProtocolInstanceId: group.instanceId, activeExerciseId: instanceId! }) : null;
                  const content = (
                    <span className="min-w-0 flex-1">
                      <strong className="block text-wrap-pretty text-xs font-black leading-5 text-zinc-200">{step.titleSnapshot}</strong>
                      <span className="mt-0.5 block text-[11px] text-zinc-500">{step.dose ? formatDose(step.dose) : '剂量未说明'}{step.optional ? ' · 可选' : ''}</span>
                      {step.visualReviewRequired ? <span className="mt-1 block text-[10px] font-bold text-amber-200">动作图示待人工复核</span> : null}
                    </span>
                  );

                  return (
                    <article key={step.id} className={`flex min-w-0 items-center gap-2 rounded-lg p-2 ${canOpen ? 'bg-black/25' : 'border border-dashed border-white/10 bg-black/10 opacity-70'}`}>
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-lime-300/30 text-xs font-black text-lime-300">{includedIndex >= 0 ? includedIndex + 1 : '–'}</span>
                      {canOpen ? <Link to={`/exercises/${step.exerciseId}?${query!.toString()}`} className="min-w-0 flex-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-300/50">{content}</Link> : content}
                      {canOpen ? <>
                        <button type="button" aria-label={`上移${step.titleSnapshot}`} disabled={includedIndex === 0} onClick={() => onMoveExercise(group.instanceId, instanceId!, 'up')} className="h-11 w-9 rounded-lg text-sm font-black text-zinc-400 disabled:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-white/25">↑</button>
                        <button type="button" data-testid="move-posture-exercise-down" aria-label={`下移${step.titleSnapshot}`} disabled={includedIndex === group.exerciseInstanceIds.length - 1} onClick={() => onMoveExercise(group.instanceId, instanceId!, 'down')} className="h-11 w-9 rounded-lg text-sm font-black text-zinc-400 disabled:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-white/25">↓</button>
                      </> : <span className="shrink-0 text-[10px] font-bold text-zinc-600">未加入</span>}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
          <button type="button" disabled={groupIndex === 0} onClick={() => onMoveGroup(group.instanceId, 'up')} className="min-h-11 rounded-xl border border-white/10 text-xs font-bold text-zinc-400 disabled:text-zinc-700">上移方案</button>
          <button type="button" disabled={groupIndex === groupCount - 1} onClick={() => onMoveGroup(group.instanceId, 'down')} className="min-h-11 rounded-xl border border-white/10 text-xs font-bold text-zinc-400 disabled:text-zinc-700">下移方案</button>
          <button type="button" data-testid="delete-posture-protocol-group" onClick={() => onDelete(group.instanceId)} className="min-h-11 rounded-xl border border-red-300/20 px-3 text-xs font-bold text-red-300">删除整套</button>
        </div>
      </div>
    </details>
  );
}

function getStageSnapshots(group: PostureProtocolWorkoutSnapshot) {
  const steps = group.stepSnapshots ?? group.exerciseSnapshots.map<PostureProtocolStepSnapshot>((snapshot) => ({
    id: snapshot.instanceId,
    order: snapshot.order,
    groupKey: snapshot.groupKey ?? 'protocol',
    groupLabel: snapshot.groupLabel ?? '方案动作',
    kind: 'exercise',
    titleSnapshot: snapshot.nameSnapshot,
    exerciseId: snapshot.exerciseId,
    exerciseInstanceId: snapshot.instanceId,
    includedInWorkout: true,
    dose: snapshot.dose,
    visualReviewRequired: snapshot.visualReviewRequired,
    visualReviewNote: snapshot.visualReviewNote
  }));
  const stages: Array<{ key: string; label: string; steps: PostureProtocolStepSnapshot[] }> = [];
  for (const step of [...steps].sort((left, right) => left.order - right.order)) {
    const current = stages.find(({ key }) => key === step.groupKey);
    if (current) current.steps.push(step);
    else stages.push({ key: step.groupKey, label: step.groupLabel, steps: [step] });
  }
  return stages;
}
