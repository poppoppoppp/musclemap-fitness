import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import DumbbellIcon from '../components/icons/DumbbellIcon';
import WorkoutMuscleMap2D from '../components/workout/WorkoutMuscleMap2D';
import { exercises } from '../data/exercises';
import type { WorkoutLog, WorkoutLogExercise, WorkoutSet } from '../types/workout';
import {
  countValidSets,
  deleteWorkoutLog,
  formatWorkoutDuration,
  getDisplayableWorkoutExercises,
  getWorkoutLogById,
  normalizeWorkoutLogForSave,
  readWorkoutLogs,
  saveWorkoutLog,
  summarizeWorkoutExercise,
  validateWorkoutLog
} from '../utils/workoutHistory';
import { estimateWorkoutCalories, getWorkedMusclesFromWorkout } from '../utils/workoutSummary';

const muscleNames: Record<string, string> = {
  chest: '胸部', back: '背部', shoulders: '肩部', biceps: '二头肌', triceps: '三头肌', abs: '腹部', obliques: '腹斜肌',
  glutes: '臀部', quadriceps: '股四头肌', hamstrings: '腘绳肌', calves: '小腿'
};

export default function WorkoutLogDetail() {
  const { logId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [log, setLog] = useState<WorkoutLog | null>(() => getWorkoutLogById(readWorkoutLogs(), logId));
  const [draft, setDraft] = useState<WorkoutLog | null>(null);
  const [error, setError] = useState('');
  const editing = draft !== null;
  const justCompleted = Boolean((location.state as { justCompleted?: boolean } | null)?.justCompleted);

  useEffect(() => {
    if (!justCompleted) return;
    window.history.replaceState({ ...window.history.state, usr: null }, '');
  }, [justCompleted]);

  const handleBack = () => {
    if (justCompleted) navigate('/workout-log', { replace: true });
    else if (location.key === 'default') navigate('/workout-history');
    else navigate(-1);
  };

  if (!log) {
    return (
      <div className="workout-dark -mx-4 -mt-5 min-h-[calc(100dvh-5rem)] bg-[#080a08] px-4 pb-28 pt-5 text-white sm:-mx-6 sm:px-6">
        <div className="mx-auto max-w-[440px]">
          <DetailHeader onBack={handleBack} />
          <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.035] p-5 text-center">
            <DumbbellIcon className="mx-auto h-8 w-8 text-zinc-600" />
            <h1 className="mt-3 text-lg font-black">未找到这次训练记录</h1>
            <p className="mt-1 text-sm text-zinc-500">记录可能已被删除，或链接已经失效。</p>
            <Link to="/workout-history" className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-white/10 px-5 text-sm font-bold text-zinc-200">返回训练历史</Link>
          </section>
        </div>
      </div>
    );
  }

  const displayed = editing && draft ? draft : log;
  const displayExercises = editing && draft ? [...draft.exercises].sort((left, right) => left.order - right.order) : getDisplayableWorkoutExercises(displayed);
  const muscles = getWorkedMusclesFromWorkout(displayed, exercises);
  const calories = estimateWorkoutCalories(displayed);

  const beginEdit = () => {
    setDraft(cloneWorkout(log));
    setError('');
  };
  const cancelEdit = () => {
    setDraft(null);
    setError('');
  };
  const saveEdit = () => {
    if (!draft) return;
    const validationError = validateWorkoutLog(draft);
    if (validationError) {
      setError(validationError);
      return;
    }
    const normalized = normalizeWorkoutLogForSave(draft);
    saveWorkoutLog(normalized);
    setLog(normalized);
    setDraft(null);
    setError('');
  };
  const removeRecord = () => {
    if (!window.confirm('确定删除这条训练记录吗？删除后无法恢复。')) return;
    deleteWorkoutLog(log.id);
    navigate('/workout-history', { replace: true });
  };

  return (
    <div data-testid="workout-log-detail" className="workout-dark relative -mx-4 -mt-5 min-h-[calc(100dvh-5rem)] overflow-hidden bg-[#080a08] px-4 pb-28 pt-5 text-white sm:-mx-6 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-[radial-gradient(circle_at_70%_0%,rgba(190,242,48,0.06),transparent_48%)]" />
      <div className="relative mx-auto max-w-[440px] space-y-3.5">
        <DetailHeader onBack={handleBack} editing={editing} onEdit={beginEdit} onCancel={cancelEdit} />

        {justCompleted ? <section data-testid="workout-completed-notice" className="flex items-center gap-3 rounded-2xl border border-lime-300/20 bg-lime-300/[0.045] px-4 py-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-lime-300/50 text-sm font-black text-lime-300">✓</span><span><strong className="block text-sm text-lime-300">训练已完成</strong><span className="text-xs text-zinc-500">本次训练已保存</span></span></section> : null}

        <section className="rounded-3xl border border-lime-300/25 bg-white/[0.025] px-4 py-5 text-center shadow-[0_0_24px_rgba(190,242,100,0.035)]">
          <p className="text-sm font-semibold text-zinc-500">训练时长</p>
          <p data-testid="workout-detail-duration" className="mt-1 font-mono text-4xl font-black tabular-nums tracking-tight text-lime-300">{formatWorkoutDuration(displayed.durationSeconds)}</p>
          <p className="mt-2 text-xs font-semibold text-zinc-600">{formatWorkoutDate(displayed.date)}</p>
          <div className={`mt-5 grid ${calories > 0 ? 'grid-cols-3' : 'grid-cols-2'} divide-x divide-white/10`}>
            <Stat testId="workout-detail-valid-sets" label="总组数" value={`${countValidSets(displayed)} 组`} />
            <Stat testId="workout-detail-exercise-count" label="动作数量" value={`${displayExercises.filter((exercise) => exercise.sets.some((set) => set.weight !== undefined || set.reps !== undefined)).length} 个`} />
            {calories > 0 ? <Stat testId="workout-detail-calories" label="约消耗热量" value={`约 ${calories} kcal`} /> : null}
          </div>
        </section>

        {editing && draft ? <label className="block rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-sm font-bold text-zinc-300">训练日期<input data-testid="workout-date-input" type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-[#111411] px-3 outline-none focus:border-lime-300" /></label> : null}

        <section data-testid="workout-muscle-card" className="rounded-3xl border border-white/10 bg-white/[0.025] p-4">
          <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(132px,1.1fr)] items-center gap-2">
            <div className="min-w-0">
              <h2 className="text-base font-black">主要训练肌群</h2>
              {muscles.primary.length || muscles.secondary.length ? <><MuscleText label="主要" muscles={muscles.primary} className="text-lime-300" /><MuscleText label="次要" muscles={muscles.secondary} className="text-lime-700" /></> : <p className="mt-3 text-sm leading-6 text-zinc-500">暂无可识别肌群数据</p>}
            </div>
            <WorkoutMuscleMap2D primaryMuscles={muscles.primary} secondaryMuscles={muscles.secondary} variant="dark" />
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-4">
          <h2 className="mb-3 text-base font-black">训练动作</h2>
          <div className="space-y-2">
            {displayExercises.map((exercise, index) => <ExerciseRow key={exercise.id} exercise={exercise} editing={editing} onChange={(next) => updateDraftExercise(draft, setDraft, index, next)} onDelete={() => draft && setDraft({ ...draft, exercises: draft.exercises.filter((_, itemIndex) => itemIndex !== index) })} />)}
          </div>
        </section>

        <section data-testid="workout-notes-card" className="rounded-3xl border border-white/10 bg-white/[0.025] p-4">
          <h2 className="text-base font-black">训练备注</h2>
          {editing && draft ? <textarea data-testid="workout-notes-input" value={draft.notes ?? ''} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} rows={4} placeholder="记录本次训练感受" className="mt-3 w-full resize-y rounded-xl border border-white/10 bg-[#111411] p-3 text-sm outline-none focus:border-lime-300" /> : <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-400">{displayed.notes?.trim() || '暂无训练备注'}</p>}
        </section>

        {error ? <p data-testid="workout-edit-error" role="alert" className="rounded-xl border border-red-300/20 bg-red-400/[0.07] px-3 py-2 text-sm font-semibold text-red-200">{error}</p> : null}

        {editing ? <section className="space-y-2"><button type="button" data-testid="save-workout-log" onClick={saveEdit} className="min-h-12 w-full rounded-2xl bg-lime-300 text-sm font-black text-[#10130d]">保存修改</button><button type="button" data-testid="delete-workout-log" onClick={removeRecord} className="min-h-11 w-full rounded-xl border border-red-400/30 text-sm font-bold text-red-300">删除整条训练记录</button></section> : <Link to="/workout-log" className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-lime-300 text-sm font-black text-[#10130d]">返回记录概览</Link>}
      </div>
    </div>
  );
}

function DetailHeader({ onBack, editing = false, onEdit, onCancel }: { onBack: () => void; editing?: boolean; onEdit?: () => void; onCancel?: () => void }) {
  return <header className="grid min-h-12 grid-cols-[72px_1fr_72px] items-center"><button type="button" onClick={onBack} aria-label="返回" className="flex h-11 w-11 items-center justify-center rounded-full text-2xl text-zinc-300">‹</button><h1 className="text-center text-lg font-black">训练详情</h1>{onEdit ? <button type="button" data-testid={editing ? 'cancel-workout-edit' : 'edit-workout-log'} onClick={editing ? onCancel : onEdit} className="min-h-11 text-right text-sm font-bold text-lime-300">{editing ? '取消' : '✎ 编辑'}</button> : <span />}</header>;
}

function Stat({ testId, label, value }: { testId: string; label: string; value: string }) {
  return <div data-testid={testId} className="min-w-0 px-1"><strong className="block whitespace-normal text-sm font-black leading-tight text-zinc-100 min-[390px]:text-base">{value}</strong><span className="mt-1 block text-[11px] text-zinc-600">{label}</span></div>;
}

function MuscleText({ label, muscles, className }: { label: string; muscles: string[]; className: string }) {
  if (!muscles.length) return null;
  return <p className="mt-2 text-xs text-zinc-500"><span>{label}：</span><span className={className}>{muscles.map((muscle) => muscleNames[muscle] ?? muscle).join('、')}</span></p>;
}

function ExerciseRow({ exercise, editing, onChange, onDelete }: { exercise: WorkoutLogExercise; editing: boolean; onChange: (exercise: WorkoutLogExercise) => void; onDelete: () => void }) {
  const detail = exercises.find((item) => item.id === exercise.exerciseId);
  const updateSet = (index: number, key: 'weight' | 'reps', value: string) => onChange({ ...exercise, sets: exercise.sets.map((set, setIndex) => setIndex === index ? { ...set, [key]: value === '' ? undefined : Number(value) } : set) });
  return (
    <details data-testid="workout-detail-exercise-row" open={editing || undefined} className="group rounded-2xl border border-white/10 bg-black/10 p-2.5">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/[0.045]"><DumbbellIcon className="h-5 w-5 text-zinc-500" /></span>
        <span className="min-w-0 flex-1"><strong className="block break-words text-sm text-zinc-100">{detail?.name ?? '未知动作'}</strong>{!detail ? <span className="block truncate text-[11px] text-zinc-600">{exercise.exerciseId}</span> : null}<span className="mt-1 block text-xs text-zinc-500">{summarizeWorkoutExercise(exercise)}</span></span>
        <span aria-hidden="true" className="text-zinc-600 transition group-open:rotate-90">›</span>
      </summary>
      <div className="mt-2 border-t border-white/[0.07] pt-3">
        {editing ? <div className="space-y-2">{exercise.sets.map((set, index) => <div key={set.id} data-testid="history-set-row" className="grid grid-cols-[24px_minmax(0,1fr)_minmax(0,1fr)_36px] items-center gap-2"><span className="text-center text-xs text-zinc-500">{index + 1}</span><input data-testid="history-set-weight-input" inputMode="decimal" type="number" min="0" step="any" aria-label={`第 ${index + 1} 组重量`} value={set.weight ?? ''} onChange={(event) => updateSet(index, 'weight', event.target.value)} placeholder="kg" className="h-11 min-w-0 rounded-lg border border-white/10 bg-[#111411] px-2 text-center outline-none focus:border-lime-300" /><input data-testid="history-set-reps-input" inputMode="numeric" type="number" min="0" step="1" aria-label={`第 ${index + 1} 组次数`} value={set.reps ?? ''} onChange={(event) => updateSet(index, 'reps', event.target.value)} placeholder="次" className="h-11 min-w-0 rounded-lg border border-white/10 bg-[#111411] px-2 text-center outline-none focus:border-lime-300" /><button type="button" data-testid="delete-history-set" onClick={() => onChange({ ...exercise, sets: exercise.sets.filter((_, setIndex) => setIndex !== index) })} aria-label={`删除第 ${index + 1} 组`} className="h-9 rounded-lg text-red-300/70">×</button></div>)}<button type="button" data-testid="add-history-set" onClick={() => onChange({ ...exercise, sets: [...exercise.sets, newSet(exercise.sets.length)] })} className="min-h-11 w-full rounded-xl border border-lime-300/20 text-sm font-bold text-lime-300">+ 添加一组</button><textarea data-testid="workout-exercise-notes-input" value={exercise.notes ?? ''} onChange={(event) => onChange({ ...exercise, notes: event.target.value })} rows={2} placeholder="动作备注" className="w-full resize-y rounded-xl border border-white/10 bg-[#111411] p-3 text-sm outline-none focus:border-lime-300" /><button type="button" data-testid="delete-history-exercise" onClick={onDelete} className="min-h-10 w-full rounded-xl border border-red-400/20 text-sm font-bold text-red-300/80">删除此动作</button></div> : <div className="space-y-1 text-xs text-zinc-500">{exercise.sets.filter((set) => set.weight !== undefined || set.reps !== undefined).map((set) => <p key={set.id}>第 {set.setIndex} 组 · {[set.weight !== undefined ? `${set.weight}kg` : '', set.reps !== undefined ? `${set.reps} 次` : ''].filter(Boolean).join(' · ')}</p>)}{exercise.notes?.trim() ? <p className="mt-2 whitespace-pre-wrap text-zinc-400">备注：{exercise.notes}</p> : null}</div>}
      </div>
    </details>
  );
}

function updateDraftExercise(draft: WorkoutLog | null, setDraft: (draft: WorkoutLog) => void, index: number, exercise: WorkoutLogExercise) {
  if (!draft) return;
  setDraft({ ...draft, exercises: draft.exercises.map((item, itemIndex) => itemIndex === index ? exercise : item) });
}

function newSet(index: number): WorkoutSet {
  return { id: `history-set-${Date.now()}-${index}`, setIndex: index + 1, completed: false };
}

function cloneWorkout(log: WorkoutLog): WorkoutLog {
  return JSON.parse(JSON.stringify(log)) as WorkoutLog;
}

function formatWorkoutDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return '日期未知';
  return value;
}
