import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DumbbellIcon from '../../components/icons/DumbbellIcon';
import { getExerciseById } from '../../data/exercises';
import { getMuscleById } from '../../data/muscles';
import type { ActiveWorkoutExercise } from '../../types/activeWorkout';
import WorkoutSetTable from './WorkoutSetTable';

interface CurrentExerciseCardProps {
  exercise: ActiveWorkoutExercise;
  position: number;
  totalExercises: number;
  onAddSet: (exerciseId: string) => void;
  onDeleteSet: (exerciseId: string, setId: string) => void;
  onSetChange: (exerciseId: string, setId: string, key: 'weight' | 'reps', value: string) => void;
  onNotesChange: (exerciseId: string, notes: string) => void;
  onDeleteExercise: (exerciseId: string) => void;
  onEndExercise: (exerciseId: string) => void;
}

export default function CurrentExerciseCard({ exercise, position, totalExercises, onAddSet, onDeleteSet, onSetChange, onNotesChange, onDeleteExercise, onEndExercise }: CurrentExerciseCardProps) {
  const detail = getExerciseById(exercise.exerciseId);
  const elapsedLabel = useExerciseElapsed(exercise);
  const title = detail?.name ?? detail?.nameEn ?? exercise.exerciseId ?? '未知动作';
  const muscleSummary = detail ? formatMuscleSummary(detail.primaryMuscles, detail.secondaryMuscles) : '';
  const canFinish = Boolean(exercise.startedAt) && !exercise.endedAt;

  return (
    <article id={getActiveExerciseElementId(exercise.id)} tabIndex={-1} data-testid="workout-log-exercise" data-active-exercise-id={exercise.id} className="rounded-2xl border border-white/12 bg-white/[0.035] p-3.5 outline-none min-[390px]:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-zinc-400">当前动作 <span data-testid="current-exercise-position" className="ml-1 text-zinc-500">{position} / {totalExercises}</span></p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] font-semibold text-zinc-500">动作计时</p>
          {elapsedLabel ? <p data-testid="current-exercise-timer" className="mt-0.5 font-mono text-lg font-black text-lime-300 tabular-nums">{elapsedLabel}</p> : <p className="mt-0.5 text-sm font-bold text-zinc-600">尚未开始</p>}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Link to={`/exercises/${exercise.exerciseId}`} aria-label={`查看${title}动作详情`} className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/25 text-zinc-500 transition hover:border-lime-300/30 hover:text-lime-300 focus:outline-none focus:ring-2 focus:ring-lime-300/60">
          <DumbbellIcon className="h-7 w-7" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link to={`/exercises/${exercise.exerciseId}`} className="block text-wrap-pretty text-lg font-black leading-6 text-white transition hover:text-lime-300 focus:outline-none focus:ring-2 focus:ring-lime-300/60">{title}</Link>
          {muscleSummary ? <p className="mt-1 text-sm font-medium text-zinc-500">{muscleSummary}</p> : <p className="mt-1 text-sm font-medium text-zinc-600">动作信息暂不可用</p>}
        </div>
        <details className="relative shrink-0 self-start">
          <summary aria-label="当前动作更多设置" className="flex h-10 w-8 cursor-pointer list-none items-center justify-center rounded-full font-black text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/30">•••</summary>
          <div className="absolute right-0 top-11 z-20 w-36 rounded-xl border border-white/10 bg-[#171a16] p-1.5 shadow-lg">
            <button type="button" onClick={() => onDeleteExercise(exercise.id)} data-testid="delete-workout-exercise" className="min-h-10 w-full rounded-lg px-3 text-left text-sm font-bold text-red-300 hover:bg-red-400/10 focus:outline-none focus:ring-2 focus:ring-red-300/40">删除动作</button>
          </div>
        </details>
      </div>

      {exercise.planned ? (
        <details className="mt-3 rounded-xl border border-white/[0.07] bg-black/15 px-3 py-2 text-sm">
          <summary className="cursor-pointer font-semibold text-zinc-500 focus:outline-none focus:ring-2 focus:ring-lime-300/40">查看计划建议</summary>
          <p className="mt-2 leading-6 text-zinc-400">{formatPlannedExercise(exercise)}</p>
        </details>
      ) : null}

      <WorkoutSetTable exerciseId={exercise.id} weightType={detail?.weightType} sets={exercise.sets} onSetChange={onSetChange} onDeleteSet={onDeleteSet} />

      <div className="mt-3 grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2.5">
        <button type="button" onClick={() => onAddSet(exercise.id)} data-testid="add-set" className="min-h-12 rounded-xl border border-lime-300/30 bg-black/20 px-2 text-sm font-black text-lime-300 transition hover:border-lime-300/55 hover:bg-lime-300/[0.05] focus:outline-none focus:ring-2 focus:ring-lime-300/50">+ 添加一组</button>
        <button type="button" onClick={() => onEndExercise(exercise.id)} disabled={!canFinish} data-testid="end-current-exercise" className="min-h-12 rounded-xl bg-lime-300 px-2 text-sm font-black text-[#10130d] shadow-[0_5px_8px_rgba(132,204,22,0.12)] transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-zinc-600 disabled:shadow-none focus:outline-none focus:ring-2 focus:ring-lime-100">完成当前动作</button>
      </div>

      <details className="mt-3 rounded-xl border border-white/[0.07] bg-black/15 px-3 py-2.5">
        <summary data-testid="toggle-exercise-notes" className="cursor-pointer text-sm font-bold text-zinc-500 focus:outline-none focus:ring-2 focus:ring-lime-300/40">动作备注</summary>
        <textarea data-testid="exercise-notes-input" value={exercise.notes ?? ''} onChange={(event) => onNotesChange(exercise.id, event.target.value)} placeholder="记录动作感受或调整" className="mt-2 min-h-20 w-full resize-y rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm !text-white outline-none placeholder:!text-zinc-500 focus:border-lime-300 focus:ring-2 focus:ring-lime-300/15" />
      </details>
    </article>
  );
}

export function useExerciseElapsed(exercise: ActiveWorkoutExercise) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const startedAtMs = exercise.startedAt ? new Date(exercise.startedAt).getTime() : Number.NaN;
  const endedAtMs = exercise.endedAt ? new Date(exercise.endedAt).getTime() : Number.NaN;
  const running = Number.isFinite(startedAtMs) && !Number.isFinite(endedAtMs);

  useEffect(() => {
    if (!running) return;
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [running]);

  if (!Number.isFinite(startedAtMs)) return null;
  const endMs = Number.isFinite(endedAtMs) ? endedAtMs : nowMs;
  const seconds = Math.max(0, Math.floor((endMs - startedAtMs) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

export function formatMuscleSummary(primary: string[], secondary: string[]) {
  return [...primary, ...secondary]
    .map((id) => getMuscleById(id)?.nameZh)
    .filter((name): name is string => Boolean(name))
    .filter((name, index, values) => values.indexOf(name) === index)
    .slice(0, 3)
    .join(' · ');
}

export function getActiveExerciseElementId(activeExerciseId: string) {
  return `active-exercise-${activeExerciseId}`;
}

function formatPlannedExercise(exercise: ActiveWorkoutExercise) {
  const parts = [
    `${exercise.planned?.sets ?? exercise.sets.length} 组`,
    exercise.planned?.repRange ? `${exercise.planned.repRange} 次` : '',
    exercise.planned?.restSeconds !== undefined ? `休息 ${exercise.planned.restSeconds} 秒` : '',
    exercise.planned?.note ?? ''
  ].filter(Boolean);
  return parts.join(' · ');
}
