import { useState } from 'react';
import { Link } from 'react-router-dom';
import DumbbellIcon from '../../components/icons/DumbbellIcon';
import { getExerciseById } from '../../data/exercises';
import type { ActiveWorkoutExercise } from '../../types/activeWorkout';
import { getActiveExerciseElementId, getWorkoutExerciseDetailHref, useExerciseElapsed } from './CurrentExerciseCard';
import WorkoutSetTable from './WorkoutSetTable';

interface CompletedExercisesListProps {
  exercises: ActiveWorkoutExercise[];
  pendingExercises?: ActiveWorkoutExercise[];
  onAddSet: (exerciseId: string) => void;
  onDeleteSet: (exerciseId: string, setId: string) => void;
  onSetChange: (exerciseId: string, setId: string, key: 'weight' | 'reps' | 'durationSeconds', value: string) => void;
  onNotesChange: (exerciseId: string, notes: string) => void;
  onDeleteExercise: (exerciseId: string) => void;
}

export default function CompletedExercisesList(props: CompletedExercisesListProps) {
  const [expanded, setExpanded] = useState(true);
  return (
    <section data-testid="completed-exercises" className="rounded-2xl border border-white/10 bg-white/[0.025] p-3.5 min-[390px]:p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-black text-zinc-200">已完成动作 {props.exercises.length}</h2>
        <button type="button" onClick={() => setExpanded((value) => !value)} data-testid="toggle-completed-exercises" aria-expanded={expanded} className="min-h-10 rounded-full px-3 text-sm font-bold text-zinc-500 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30">{expanded ? '收起' : '展开'}</button>
      </div>
      {expanded ? (
        <>
          {props.exercises.length > 0 ? (
            <div className="mt-2 space-y-2">
              {props.exercises.map((exercise) => <CompletedExerciseItem key={exercise.id} exercise={exercise} {...props} />)}
            </div>
          ) : <p className="mt-2 text-sm text-zinc-600">完成当前动作后会显示在这里</p>}
          {(props.pendingExercises?.length ?? 0) > 0 ? (
            <div className="mt-4 border-t border-white/[0.07] pt-3">
              <h3 className="text-sm font-black text-zinc-500">待进行动作 {props.pendingExercises?.length}</h3>
              <div className="mt-2 space-y-2">
                {props.pendingExercises?.map((exercise) => <PendingExerciseItem key={exercise.id} exercise={exercise} {...props} />)}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function CompletedExerciseItem({ exercise, onAddSet, onDeleteSet, onSetChange, onNotesChange, onDeleteExercise }: { exercise: ActiveWorkoutExercise } & Omit<CompletedExercisesListProps, 'exercises' | 'pendingExercises'>) {
  const detail = getExerciseById(exercise.exerciseId);
  const elapsed = useExerciseElapsed(exercise);
  const title = detail?.name ?? detail?.nameEn ?? exercise.exerciseId ?? '未知动作';
  return (
    <details id={getActiveExerciseElementId(exercise.id)} data-testid="workout-log-exercise" data-active-exercise-id={exercise.id} className="group rounded-xl border border-white/[0.08] bg-black/15 open:bg-black/25">
      <summary data-testid="toggle-workout-exercise-collapse" data-active-exercise-id={exercise.id} className="flex min-h-[66px] cursor-pointer list-none items-center gap-3 px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-lime-300/45">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-black/30 text-zinc-600"><DumbbellIcon className="h-5 w-5" /></span>
        <span data-testid="completed-exercise-summary" className="min-w-0 flex-1">
          <span className="block truncate text-sm font-black text-zinc-200">{title}</span>
          <span className="mt-0.5 block truncate text-xs font-semibold text-zinc-500">{formatExerciseSummary(exercise)}</span>
        </span>
        <span aria-hidden="true" className="shrink-0 text-lime-300/70 transition group-open:rotate-180">⌄</span>
      </summary>
      <div data-testid="completed-exercise-details" className="border-t border-white/[0.07] px-3 pb-3 pt-2.5">
        <div className="flex items-center justify-between gap-3">
          <Link to={getWorkoutExerciseDetailHref(exercise)} className="text-sm font-bold text-zinc-400 transition hover:text-lime-300 focus:outline-none focus:ring-2 focus:ring-lime-300/50">查看动作详情</Link>
          {elapsed ? <span data-testid="current-exercise-timer" className="font-mono text-xs font-bold text-zinc-500 tabular-nums">用时 {elapsed}</span> : null}
        </div>
        <WorkoutSetTable exerciseId={exercise.id} weightType={detail?.weightType} entryMode={exercise.setEntryMode} sets={exercise.sets} onSetChange={onSetChange} onDeleteSet={onDeleteSet} />
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => onAddSet(exercise.id)} data-testid="add-set" className="min-h-11 flex-1 rounded-xl border border-lime-300/25 text-sm font-bold text-lime-300 focus:outline-none focus:ring-2 focus:ring-lime-300/50">+ 添加一组</button>
          <button type="button" onClick={() => onDeleteExercise(exercise.id)} data-testid="delete-workout-exercise" className="min-h-11 rounded-xl border border-red-300/20 px-3 text-sm font-bold text-red-300 focus:outline-none focus:ring-2 focus:ring-red-300/40">删除动作</button>
        </div>
        <label className="mt-3 grid gap-1.5 text-sm font-bold text-zinc-500">动作备注<textarea data-testid="exercise-notes-input" value={exercise.notes ?? ''} onChange={(event) => onNotesChange(exercise.id, event.target.value)} className="min-h-20 w-full resize-y rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm !text-white outline-none focus:border-lime-300 focus:ring-2 focus:ring-lime-300/15" /></label>
      </div>
    </details>
  );
}

function PendingExerciseItem({ exercise, onAddSet, onDeleteSet, onSetChange, onNotesChange, onDeleteExercise }: { exercise: ActiveWorkoutExercise } & Omit<CompletedExercisesListProps, 'exercises' | 'pendingExercises'>) {
  const detail = getExerciseById(exercise.exerciseId);
  const title = detail?.name ?? detail?.nameEn ?? exercise.exerciseId ?? '未知动作';
  return (
    <details id={getActiveExerciseElementId(exercise.id)} data-testid="workout-log-exercise" data-active-exercise-id={exercise.id} className="group rounded-xl border border-white/[0.07] bg-black/10 open:bg-black/25">
      <summary data-testid="pending-exercise-summary" className="flex min-h-[58px] cursor-pointer list-none items-center gap-3 px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white/20">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-black/25 text-zinc-700"><DumbbellIcon className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-black text-zinc-400">{title}</span><span className="mt-0.5 block text-xs font-semibold text-zinc-600">待进行 · {exercise.sets.length} 组</span></span>
        <span aria-hidden="true" className="text-zinc-600 transition group-open:rotate-180">⌄</span>
      </summary>
      <div className="border-t border-white/[0.07] px-3 pb-3 pt-2.5">
        {exercise.planned ? <p className="text-xs leading-5 text-zinc-500">计划建议：{[`${exercise.planned.sets ?? exercise.sets.length} 组`, exercise.planned.repRange ? `${exercise.planned.repRange} 次` : '', exercise.planned.restSeconds !== undefined ? `休息 ${exercise.planned.restSeconds} 秒` : '', exercise.planned.note ?? ''].filter(Boolean).join(' · ')}</p> : null}
        <WorkoutSetTable exerciseId={exercise.id} weightType={detail?.weightType} entryMode={exercise.setEntryMode} sets={exercise.sets} onSetChange={onSetChange} onDeleteSet={onDeleteSet} />
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => onAddSet(exercise.id)} data-testid="add-set" className="min-h-11 flex-1 rounded-xl border border-lime-300/20 text-sm font-bold text-lime-300/80 focus:outline-none focus:ring-2 focus:ring-lime-300/45">+ 添加一组</button>
          <button type="button" onClick={() => onDeleteExercise(exercise.id)} data-testid="delete-workout-exercise" className="min-h-11 rounded-xl border border-red-300/15 px-3 text-sm font-bold text-red-300/80 focus:outline-none focus:ring-2 focus:ring-red-300/35">删除动作</button>
        </div>
        <label className="mt-3 grid gap-1.5 text-sm font-bold text-zinc-600">动作备注<textarea data-testid="exercise-notes-input" value={exercise.notes ?? ''} onChange={(event) => onNotesChange(exercise.id, event.target.value)} className="min-h-20 w-full resize-y rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm !text-white outline-none focus:border-lime-300 focus:ring-2 focus:ring-lime-300/15" /></label>
      </div>
    </details>
  );
}

export function formatExerciseSummary(exercise: ActiveWorkoutExercise) {
  const sets = exercise.sets.filter((set) => isDisplayableNumber(set.weight) || isDisplayableNumber(set.reps) || isDisplayableNumber(set.durationSeconds));
  if (sets.length === 0) return `已完成 ${exercise.sets.length} 组`;
  const weights = sets.map((set) => set.weight).filter(isDisplayableNumber);
  const reps = sets.map((set) => set.reps).filter(isDisplayableNumber);
  const durations = sets.map((set) => set.durationSeconds).filter(isDisplayableNumber);
  const details: string[] = [`${sets.length} 组`];
  if (weights.length > 0) details.push(`${formatNumber(Math.max(...weights))}kg`);
  if (reps.length > 0) {
    const minimum = Math.min(...reps);
    const maximum = Math.max(...reps);
    details.push(weights.length > 0 ? `× ${minimum === maximum ? minimum : `${minimum}–${maximum}`}` : `${minimum === maximum ? minimum : `${minimum}–${maximum}`} 次`);
  }
  if (durations.length > 0) details.push(`${Math.min(...durations) === Math.max(...durations) ? durations[0] : `${Math.min(...durations)}–${Math.max(...durations)}`} 秒`);
  return details.join(' · ').replace(' · ×', ' ×');
}

function isDisplayableNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}
