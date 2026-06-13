import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { exercises, getExerciseById } from '../data/exercises';
import type { ActiveWorkout, ActiveWorkoutExercise } from '../types/activeWorkout';
import type { GeneratedPlan, GeneratedWorkoutDay, WorkoutLog, WorkoutLogExercise, WorkoutSet } from '../types/workout';
import {
  addExerciseToActiveWorkout,
  addSetToActiveWorkoutExercise,
  archiveActiveWorkout,
  clearActiveWorkout,
  createActiveWorkoutFromPlanDay,
  createManualActiveWorkout,
  endActiveWorkoutExercise,
  readActiveWorkout,
  removeExerciseFromActiveWorkout,
  removeSetFromActiveWorkoutExercise,
  updateActiveWorkoutExerciseNotes,
  updateActiveWorkoutSet,
  writeActiveWorkout,
  type ActiveWorkoutArchiveError
} from '../utils/activeWorkout';
import { LATEST_WORKOUT_LOG_KEY, WORKOUT_LOGS_KEY } from '../utils/backup';
import { PLAN_STORAGE_KEY } from '../utils/planRules';
import { readStorage, writeStorage } from '../utils/storage';

const archiveMessages: Record<ActiveWorkoutArchiveError, string> = {
  'no-exercise': '请先添加至少一个动作',
  'no-valid-set': '请至少填写一组重量或次数',
  'integer-reps': '次数必须是整数',
  'invalid-number': '请输入有效的重量或次数'
};

export default function WorkoutLog() {
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);
  const [recentPlan, setRecentPlan] = useState<GeneratedPlan | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState(exercises[0]?.id ?? '');
  const [latestLog, setLatestLog] = useState<WorkoutLog | null>(null);
  const [status, setStatus] = useState('');
  const [timerNowMs, setTimerNowMs] = useState(() => Date.now());

  useEffect(() => {
    setActiveWorkout(readActiveWorkout());
    const plan = readStorage<GeneratedPlan | null>(PLAN_STORAGE_KEY, null);
    setRecentPlan(isGeneratedPlan(plan) ? plan : null);
    const latest = readStorage<WorkoutLog | null>(LATEST_WORKOUT_LOG_KEY, null);
    setLatestLog(isWorkoutLog(latest) ? latest : null);
  }, []);

  useEffect(() => {
    const hasRunningExerciseTimer = activeWorkout?.exercises.some((exercise) => exercise.startedAt && !exercise.endedAt) ?? false;
    if (!hasRunningExerciseTimer) return;

    const intervalId = window.setInterval(() => setTimerNowMs(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [activeWorkout]);

  const summary = useMemo(() => {
    if (!activeWorkout) return { exerciseCount: 0, validSetCount: 0 };
    return {
      exerciseCount: activeWorkout.exercises.length,
      validSetCount: activeWorkout.exercises.reduce(
        (count, exercise) => count + exercise.sets.filter((set) => isDisplayableNumber(set.weight) || isDisplayableNumber(set.reps)).length,
        0
      )
    };
  }, [activeWorkout]);

  const persistActiveWorkout = (workout: ActiveWorkout) => {
    writeActiveWorkout(workout);
    setActiveWorkout(readActiveWorkout());
  };

  const handleStartWorkout = () => {
    const existing = readActiveWorkout();
    if (existing) {
      setActiveWorkout(existing);
      setStatus('已有进行中的训练，请继续当前训练或先结束当前训练');
      return;
    }

    const workout = createManualActiveWorkout();
    writeActiveWorkout(workout);
    setActiveWorkout(workout);
    setStatus('训练已开始');
  };

  const handleAddManualExercise = () => {
    if (!selectedExerciseId) return;
    if (!activeWorkout) {
      setStatus('请先开始训练，再添加动作');
      return;
    }
    persistActiveWorkout(addExerciseToActiveWorkout(activeWorkout, selectedExerciseId));
    setStatus('');
  };

  const handleStartFromPlanDay = (day: GeneratedWorkoutDay) => {
    if (!recentPlan) return;
    const existing = readActiveWorkout();
    if (existing) {
      setActiveWorkout(existing);
      setStatus('当前已有进行中的训练，请先结束或放弃当前训练');
      return;
    }

    const workout = createActiveWorkoutFromPlanDay(recentPlan, day);
    writeActiveWorkout(workout);
    setActiveWorkout(readActiveWorkout());
    setStatus('已从最近计划开始训练');
  };

  const handleDeleteExercise = (activeExerciseId: string) => {
    if (!activeWorkout) return;
    persistActiveWorkout(removeExerciseFromActiveWorkout(activeWorkout, activeExerciseId));
  };

  const handleAddSet = (activeExerciseId: string) => {
    if (!activeWorkout) return;
    persistActiveWorkout(addSetToActiveWorkoutExercise(activeWorkout, activeExerciseId));
  };

  const handleDeleteSet = (activeExerciseId: string, setId: string) => {
    if (!activeWorkout) return;
    persistActiveWorkout(removeSetFromActiveWorkoutExercise(activeWorkout, activeExerciseId, setId));
  };

  const handleSetChange = (activeExerciseId: string, setId: string, key: 'weight' | 'reps', value: string) => {
    if (!activeWorkout) return;
    persistActiveWorkout(updateActiveWorkoutSet(activeWorkout, activeExerciseId, setId, key, value));
  };

  const handleNotesChange = (activeExerciseId: string, notes: string) => {
    if (!activeWorkout) return;
    persistActiveWorkout(updateActiveWorkoutExerciseNotes(activeWorkout, activeExerciseId, notes));
  };

  const handleEndCurrentExercise = (activeExerciseId: string) => {
    if (!activeWorkout) return;
    persistActiveWorkout(endActiveWorkoutExercise(activeWorkout, activeExerciseId));
  };

  const handleEndWorkout = () => {
    if (!activeWorkout) return;

    const archived = archiveActiveWorkout(activeWorkout);
    if (!archived.ok) {
      setStatus(archiveMessages[archived.error]);
      return;
    }

    const existing = readStorage<WorkoutLog[]>(WORKOUT_LOGS_KEY, []);
    const logs = Array.isArray(existing) ? existing.filter(isWorkoutLog) : [];
    const nextLogs = [archived.log, ...logs];

    writeStorage(WORKOUT_LOGS_KEY, nextLogs);
    writeStorage(LATEST_WORKOUT_LOG_KEY, archived.log);
    clearActiveWorkout();
    setActiveWorkout(null);
    setLatestLog(archived.log);
    setStatus('训练已结束并保存');
  };

  const handleDiscardWorkout = () => {
    if (!activeWorkout) return;
    const confirmed = window.confirm('确定放弃当前训练吗？本次未结束的内容不会保存为训练记录。');
    if (!confirmed) return;
    clearActiveWorkout();
    setActiveWorkout(null);
    setStatus('当前训练已放弃');
  };

  return (
    <div className="pb-32 lg:pb-0">
      <PageHeader title="训练记录" />

      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="order-2 space-y-4 lg:order-1">
          {activeWorkout ? (
          <Card>
            <h2 className="text-lg font-semibold text-white">当前训练</h2>
              <div data-testid="active-workout-card" className="mt-4 space-y-3 text-sm text-[#a1a1a6]">
                <div className="rounded-2xl border border-accent/30 bg-accent/10 p-4 text-[#d6eaff]">
                  <p className="font-semibold">进行中</p>
                  <p className="mt-1">{summary.exerciseCount} 个动作 · {summary.validSetCount} 个有效组</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  <Button type="button" className="min-h-11" onClick={handleEndWorkout} data-testid="end-active-workout">
                    结束训练
                  </Button>
                  <Button type="button" variant="secondary" className="min-h-11" onClick={handleDiscardWorkout} data-testid="discard-active-workout">
                    放弃当前训练
                  </Button>
                </div>
              </div>
          </Card>
          ) : null}

          <Card>
            <h2 className="text-lg font-semibold text-white">手动添加动作</h2>
            <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-[#a1a1a6]" htmlFor="manual-exercise-select">
                动作
              </label>
              <select
                id="manual-exercise-select"
                data-testid="manual-exercise-select"
                value={selectedExerciseId}
                onChange={(event) => setSelectedExerciseId(event.target.value)}
                className="min-h-11 w-full rounded-xl border border-white/[0.12] bg-black/40 px-3 py-2 text-sm text-[#f5f5f7] outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/[0.45]"
              >
                {exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name} / {exercise.nameEn}
                  </option>
                ))}
              </select>
              <Button type="button" variant="secondary" className="min-h-11 w-full" onClick={handleAddManualExercise} data-testid="add-manual-exercise">
                添加动作
              </Button>
              {!activeWorkout ? <p className="text-sm leading-6 text-[#86868b]">请先开始训练，再把动作加入当前训练。</p> : null}
            </div>
          </Card>

          <Card>
            <div data-testid="latest-plan-start">
              <h2 className="text-lg font-semibold text-white">从最近计划开始训练</h2>
              {recentPlan && recentPlan.days.length > 0 ? (
                <div className="mt-4 space-y-3">
                  <p className="text-sm font-medium text-[#a1a1a6]">{recentPlan.name}</p>
                  <div className="space-y-3">
                    {recentPlan.days.map((day) => (
                      <div key={day.id} className="rounded-2xl border border-white/10 bg-black/[0.35] p-4 text-sm text-[#a1a1a6]" data-testid="latest-plan-day">
                        <p className="font-semibold text-white">{day.name}</p>
                        <p className="mt-1">训练重点：{day.focus}</p>
                        <p className="mt-1">动作数量：{day.items.length}</p>
                        <Button
                          type="button"
                          variant="secondary"
                          className="mt-3 min-h-11 w-full"
                          onClick={() => handleStartFromPlanDay(day)}
                          data-testid={`start-plan-day-${day.id}`}
                        >
                          开始这一天训练
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-[#a1a1a6]">暂无最近计划，可先去训练计划页生成计划。</p>
              )}
            </div>
          </Card>

          <LatestWorkoutLog log={latestLog} />

          <Card>
            <div className="flex flex-col gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">训练历史</h2>
                <p className="mt-2 text-sm leading-6 text-[#a1a1a6]">查看已保存的全部训练记录。</p>
              </div>
              <Link
                to="/workout-history"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#2c2c2e] px-5 py-2 text-sm font-semibold text-[#f5f5f7] transition hover:bg-[#3a3a3c] focus:outline-none focus:ring-2 focus:ring-accent"
              >
                查看训练历史
              </Link>
            </div>
          </Card>
        </div>

        <Card className="order-1 lg:order-2">
          <div className="flex flex-col gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">本次训练</h2>
              <p className="mt-1 text-sm text-[#86868b]">{activeWorkout ? activeWorkout.trainingDate : '尚未开始'}</p>
            </div>
            {activeWorkout ? (
              <Button type="button" className="hidden min-h-11 sm:inline-flex" onClick={handleEndWorkout}>
                结束训练
              </Button>
            ) : null}
          </div>

          <p data-testid="save-status" className="mt-3 min-h-6 text-sm text-[#2997ff]">
            {status}
          </p>

          <div className="mt-4 space-y-4">
            {!activeWorkout ? (
              <div data-testid="active-workout-empty" className="rounded-[18px] border border-dashed border-white/[0.16] bg-black/20 px-4 py-6 text-sm text-[#a1a1a6]">
                <p>还没有开始训练。</p>
                <Button type="button" className="mt-4 min-h-11 w-full sm:w-fit" onClick={handleStartWorkout} data-testid="start-active-workout">
                  开始训练
                </Button>
              </div>
            ) : activeWorkout.exercises.length === 0 ? (
              <p className="rounded-[18px] border border-dashed border-white/[0.16] bg-black/20 px-4 py-6 text-sm text-[#a1a1a6]">还没有动作。去 3D 肌群选择或手动添加一个动作。</p>
            ) : (
              activeWorkout.exercises.map((exercise) => (
                <WorkoutExerciseEditor
                  key={exercise.id}
                  exercise={exercise}
                  onAddSet={handleAddSet}
                  onDeleteSet={handleDeleteSet}
                  onSetChange={handleSetChange}
                  onNotesChange={handleNotesChange}
                  onDeleteExercise={handleDeleteExercise}
                  onEndCurrentExercise={handleEndCurrentExercise}
                  nowMs={timerNowMs}
                />
              ))
            )}
          </div>

          {activeWorkout ? (
            <div className="mt-6 border-t border-white/10 pt-4 sm:hidden">
              <Button type="button" className="min-h-11 w-full" onClick={handleEndWorkout} data-testid="end-active-workout-bottom">
                结束训练
              </Button>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

function WorkoutExerciseEditor({
  exercise,
  onAddSet,
  onDeleteSet,
  onSetChange,
  onNotesChange,
  onDeleteExercise,
  onEndCurrentExercise,
  nowMs
}: {
  exercise: ActiveWorkoutExercise;
  onAddSet: (exerciseId: string) => void;
  onDeleteSet: (exerciseId: string, setId: string) => void;
  onSetChange: (exerciseId: string, setId: string, key: 'weight' | 'reps', value: string) => void;
  onNotesChange: (exerciseId: string, notes: string) => void;
  onDeleteExercise: (exerciseId: string) => void;
  onEndCurrentExercise: (exerciseId: string) => void;
  nowMs: number;
}) {
  const detail = getExerciseById(exercise.exerciseId);
  const timer = getExerciseTimerState(exercise, nowMs);

  return (
    <article data-testid="workout-log-exercise" className="rounded-[18px] border border-white/10 bg-black/[0.35] p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-white">{detail?.nameEn ?? exercise.exerciseId}</h3>
            {timer ? (
              <span
                data-testid="current-exercise-timer"
                className={`rounded-full border px-3 py-1 text-xs font-bold tabular-nums ${
                  timer.isEnded
                    ? 'border-white/[0.12] bg-white/[0.06] text-[#a1a1a6]'
                    : 'border-[#2997ff]/35 bg-[#2997ff]/15 text-[#8fd0ff]'
                }`}
              >
                {timer.isEnded ? '用时' : '当前动作'} {timer.label}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-[#86868b]">{detail?.name ?? exercise.exerciseId}</p>
          {exercise.planned ? (
            <p className="mt-2 text-sm text-[#2997ff]">
              计划建议：{exercise.planned.sets ?? exercise.sets.length} 组，{exercise.planned.repRange ?? '-'} 次，休息 {exercise.planned.restSeconds ?? '-'} 秒
              {exercise.planned.note ? `，${exercise.planned.note}` : ''}
            </p>
          ) : null}
        </div>
        <Button type="button" variant="ghost" className="min-h-11" onClick={() => onDeleteExercise(exercise.id)} data-testid="delete-workout-exercise">
          删除动作
        </Button>
      </div>

      <div className="mt-4 space-y-3">
        {exercise.sets.map((set) => (
          <div key={set.id} data-testid="workout-set-row" className="grid gap-2 rounded-2xl bg-[#2c2c2e] p-3 sm:grid-cols-[64px_1fr_1fr_auto] sm:items-end">
            <div className="text-sm font-medium text-[#a1a1a6]">第 {set.setIndex} 组</div>
            <label className="grid gap-1 text-sm text-[#a1a1a6]">
              重量
              <input
                data-testid="set-weight-input"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.5"
                value={set.weight ?? ''}
                onChange={(event) => onSetChange(exercise.id, set.id, 'weight', event.target.value)}
                className="min-h-11 w-full rounded-xl border border-white/[0.12] bg-black/40 px-3 py-2 text-base text-[#f5f5f7] outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/[0.45]"
              />
            </label>
            <label className="grid gap-1 text-sm text-[#a1a1a6]">
              次数
              <input
                data-testid="set-reps-input"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={set.reps ?? ''}
                onChange={(event) => onSetChange(exercise.id, set.id, 'reps', event.target.value)}
                className="min-h-11 w-full rounded-xl border border-white/[0.12] bg-black/40 px-3 py-2 text-base text-[#f5f5f7] outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/[0.45]"
              />
            </label>
            <Button type="button" variant="ghost" className="min-h-11" onClick={() => onDeleteSet(exercise.id, set.id)} data-testid="delete-set">
              删除
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-3">
        <Button type="button" variant="secondary" className="min-h-11 w-full sm:w-fit" onClick={() => onAddSet(exercise.id)} data-testid="add-set">
          新增一组
        </Button>
        {timer && !timer.isEnded ? (
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 w-full border-[#2997ff]/25 bg-[#0f1d2f] text-[#8fd0ff] sm:w-fit"
            onClick={() => onEndCurrentExercise(exercise.id)}
            data-testid="end-current-exercise"
          >
            当前动作结束
          </Button>
        ) : null}
        <label className="grid gap-1 text-sm text-[#a1a1a6]">
          动作备注
          <textarea
            data-testid="exercise-notes-input"
            value={exercise.notes ?? ''}
            onChange={(event) => onNotesChange(exercise.id, event.target.value)}
            className="min-h-20 w-full rounded-xl border border-white/[0.12] bg-black/40 px-3 py-2 text-sm text-[#f5f5f7] outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/[0.45]"
          />
        </label>
      </div>
    </article>
  );
}

function LatestWorkoutLog({ log }: { log: WorkoutLog | null }) {
  if (!log) {
    return (
      <Card>
        <h2 className="text-lg font-semibold text-white">最近一次训练</h2>
        <p className="mt-3 text-sm text-[#a1a1a6]">暂无已保存的训练记录。</p>
      </Card>
    );
  }

  const displayableExercises = getDisplayableWorkoutExercises(log);

  return (
    <Card>
      <div data-testid="latest-workout-log">
        <h2 className="text-lg font-semibold text-white">最近一次训练</h2>
        <p className="mt-1 text-sm text-[#86868b]">{log.date}</p>
        {displayableExercises.length > 0 ? (
          <div className="mt-3 space-y-3">
            {displayableExercises.map((item) => {
              const exercise = getExerciseById(item.exerciseId);
              return (
                <div key={item.id} className="rounded-2xl bg-black/[0.35] p-4 text-sm text-[#a1a1a6]">
                  <p className="font-semibold text-white">{exercise?.nameEn ?? item.exerciseId}</p>
                  <p className="mt-1">{exercise?.name ?? item.exerciseId}</p>
                  <p className="mt-1">{item.sets.map(formatDisplayWorkoutSet).join(' / ')}</p>
                  {item.notes ? <p className="mt-1 text-[#2997ff]">{item.notes}</p> : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-sm text-[#a1a1a6]">暂无可展示的训练记录。</p>
        )}
      </div>
    </Card>
  );
}

function getDisplayableWorkoutExercises(log: WorkoutLog): WorkoutLogExercise[] {
  return log.exercises
    .map((exercise) => ({
      ...exercise,
      sets: Array.isArray(exercise.sets) ? exercise.sets.filter(isDisplayableWorkoutSet) : []
    }))
    .filter((exercise) => exercise.sets.length > 0);
}

function isDisplayableWorkoutSet(set: WorkoutSet) {
  return isDisplayableNumber(set.weight) || isDisplayableNumber(set.reps);
}

function isDisplayableNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function formatWorkoutSet(set: WorkoutSet) {
  if (isDisplayableNumber(set.weight) && isDisplayableNumber(set.reps)) {
    return `绗?${set.setIndex} 缁勶細${set.weight}kg x ${set.reps} 娆?`;
  }

  if (isDisplayableNumber(set.weight)) {
    return `绗?${set.setIndex} 缁勶細${set.weight}kg`;
  }

  return `绗?${set.setIndex} 缁勶細${set.reps} 娆?`;
}

function formatDisplayWorkoutSet(set: WorkoutSet) {
  if (isDisplayableNumber(set.weight) && isDisplayableNumber(set.reps)) {
    return `第 ${set.setIndex} 组：${set.weight}kg x ${set.reps} 次`;
  }

  if (isDisplayableNumber(set.weight)) {
    return `第 ${set.setIndex} 组：${set.weight}kg`;
  }

  return `第 ${set.setIndex} 组：${set.reps} 次`;
}

function getExerciseTimerState(exercise: ActiveWorkoutExercise, nowMs: number) {
  if (!exercise.startedAt) return null;

  const startedAtMs = new Date(exercise.startedAt).getTime();
  const endedAtMs = exercise.endedAt ? new Date(exercise.endedAt).getTime() : nowMs;
  if (!Number.isFinite(startedAtMs) || !Number.isFinite(endedAtMs)) return null;

  return {
    isEnded: Boolean(exercise.endedAt),
    label: formatElapsedSeconds(Math.max(0, Math.floor((endedAtMs - startedAtMs) / 1000)))
  };
}

function formatElapsedSeconds(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  const paddedMinutes = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes);
  const paddedSeconds = String(seconds).padStart(2, '0');

  return hours > 0 ? `${hours}:${paddedMinutes}:${paddedSeconds}` : `${paddedMinutes}:${paddedSeconds}`;
}

function isWorkoutLog(value: unknown): value is WorkoutLog {
  if (!value || typeof value !== 'object') return false;
  const log = value as WorkoutLog;
  return typeof log.id === 'string' && typeof log.date === 'string' && Array.isArray(log.exercises);
}

function isGeneratedPlan(value: unknown): value is GeneratedPlan {
  if (!value || typeof value !== 'object') return false;
  const plan = value as GeneratedPlan;
  return typeof plan.id === 'string' && typeof plan.name === 'string' && Array.isArray(plan.days);
}
