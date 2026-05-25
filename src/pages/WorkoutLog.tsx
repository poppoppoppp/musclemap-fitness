import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { exercises, getExerciseById } from '../data/exercises';
import type { GeneratedPlan, GeneratedWorkoutDay, WorkoutLog, WorkoutLogExercise, WorkoutSet } from '../types/workout';
import { PLAN_STORAGE_KEY } from '../utils/planRules';
import { LATEST_WORKOUT_LOG_KEY, WORKOUT_LOGS_KEY } from '../utils/backup';
import { readStorage, writeStorage } from '../utils/storage';

interface EditableWorkoutSet {
  id: string;
  setIndex: number;
  weight: string;
  reps: string;
  completed: boolean;
}

interface EditableWorkoutExercise {
  id: string;
  exerciseId: string;
  order: number;
  sets: EditableWorkoutSet[];
  notes: string;
  prescription?: {
    sets: number;
    repRange: string;
    restSeconds: number;
  };
}

interface EditableWorkoutLog {
  id: string;
  date: string;
  planId?: string;
  exercises: EditableWorkoutExercise[];
  notes: string;
  createdAt: string;
}

type SaveValidationError = 'no-exercise' | 'no-valid-set' | 'integer-reps' | 'invalid-number';

type NormalizeResult = { ok: true; log: WorkoutLog } | { ok: false; error: SaveValidationError };

const saveMessages: Record<SaveValidationError, string> = {
  'no-exercise': '请先添加至少一个动作',
  'no-valid-set': '请至少填写一组重量或次数',
  'integer-reps': '次数必须是整数',
  'invalid-number': '请输入有效的重量或次数'
};

export default function WorkoutLog() {
  const [recentPlan, setRecentPlan] = useState<GeneratedPlan | null>(null);
  const [selectedDayId, setSelectedDayId] = useState('');
  const [selectedExerciseId, setSelectedExerciseId] = useState(exercises[0]?.id ?? '');
  const [currentLog, setCurrentLog] = useState<EditableWorkoutLog>(() => createEmptyLog());
  const [latestLog, setLatestLog] = useState<WorkoutLog | null>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const plan = readStorage<GeneratedPlan | null>(PLAN_STORAGE_KEY, null);
    setRecentPlan(isGeneratedPlan(plan) ? plan : null);
    setSelectedDayId(isGeneratedPlan(plan) ? plan.days[0]?.id ?? '' : '');

    const latest = readStorage<WorkoutLog | null>(LATEST_WORKOUT_LOG_KEY, null);
    setLatestLog(isWorkoutLog(latest) ? latest : null);
  }, []);

  const selectedPlanDay = useMemo(
    () => recentPlan?.days.find((day) => day.id === selectedDayId) ?? null,
    [recentPlan, selectedDayId]
  );

  const handleStartFromPlan = () => {
    if (!recentPlan || !selectedPlanDay) return;
    setCurrentLog(createLogFromPlanDay(recentPlan.id, selectedPlanDay));
    setStatus('');
  };

  const handleAddManualExercise = () => {
    if (!selectedExerciseId) return;
    setCurrentLog((log) => ({
      ...log,
      exercises: [
        ...log.exercises,
        {
          id: createId('log-exercise'),
          exerciseId: selectedExerciseId,
          order: log.exercises.length,
          sets: [createEditableSet(1)],
          notes: ''
        }
      ]
    }));
    setStatus('');
  };

  const handleAddSet = (exerciseId: string) => {
    setCurrentLog((log) => ({
      ...log,
      exercises: log.exercises.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: [...exercise.sets, createEditableSet(exercise.sets.length + 1)]
            }
          : exercise
      )
    }));
  };

  const handleDeleteSet = (exerciseId: string, setId: string) => {
    setCurrentLog((log) => ({
      ...log,
      exercises: log.exercises.map((exercise) => {
        if (exercise.id !== exerciseId) return exercise;
        const nextSets = exercise.sets.filter((set) => set.id !== setId);
        return {
          ...exercise,
          sets: reindexSets(nextSets.length > 0 ? nextSets : [createEditableSet(1)])
        };
      })
    }));
  };

  const handleSetChange = (exerciseId: string, setId: string, key: 'weight' | 'reps', value: string) => {
    setCurrentLog((log) => ({
      ...log,
      exercises: log.exercises.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: exercise.sets.map((set) => (set.id === setId ? { ...set, [key]: value } : set))
            }
          : exercise
      )
    }));
  };

  const handleNotesChange = (exerciseId: string, notes: string) => {
    setCurrentLog((log) => ({
      ...log,
      exercises: log.exercises.map((exercise) => (exercise.id === exerciseId ? { ...exercise, notes } : exercise))
    }));
  };

  const handleSave = () => {
    const normalized = normalizeLog(currentLog);
    if (!normalized.ok) {
      setStatus(saveMessages[normalized.error]);
      return;
    }

    const existing = readStorage<WorkoutLog[]>(WORKOUT_LOGS_KEY, []);
    const logs = Array.isArray(existing) ? existing.filter(isWorkoutLog) : [];
    const index = logs.findIndex((log) => log.id === normalized.log.id);
    const nextLogs = index >= 0 ? logs.map((log) => (log.id === normalized.log.id ? normalized.log : log)) : [normalized.log, ...logs];

    writeStorage(LATEST_WORKOUT_LOG_KEY, normalized.log);
    writeStorage(WORKOUT_LOGS_KEY, nextLogs);
    setLatestLog(normalized.log);
    setStatus('训练记录已保存');
  };

  return (
    <div className="pb-32 lg:pb-0">
      <PageHeader title="训练记录" description="记录今天完成的动作、重量、次数和训练备注。" />

      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card>
            <h2 className="text-lg font-semibold text-white">从最近计划开始</h2>
            {recentPlan && recentPlan.days.length > 0 ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-slate-300">{recentPlan.name}</p>
                <label className="block text-sm font-medium text-slate-300" htmlFor="plan-day-select">
                  训练日
                </label>
                <select
                  id="plan-day-select"
                  data-testid="plan-day-select"
                  value={selectedDayId}
                  onChange={(event) => setSelectedDayId(event.target.value)}
                  className="min-h-11 w-full rounded-md border border-line bg-slate-950 px-3 py-2 text-sm text-white"
                >
                  {recentPlan.days.map((day) => (
                    <option key={day.id} value={day.id}>
                      {day.name}
                    </option>
                  ))}
                </select>
                <Button type="button" className="min-h-11 w-full" onClick={handleStartFromPlan} data-testid="start-from-plan">
                  带入计划动作
                </Button>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-300">还没有最近生成计划，可以先手动添加动作。</p>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-white">手动添加动作</h2>
            <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-slate-300" htmlFor="manual-exercise-select">
                动作
              </label>
              <select
                id="manual-exercise-select"
                data-testid="manual-exercise-select"
                value={selectedExerciseId}
                onChange={(event) => setSelectedExerciseId(event.target.value)}
                className="min-h-11 w-full rounded-md border border-line bg-slate-950 px-3 py-2 text-sm text-white"
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
            </div>
          </Card>

          <LatestWorkoutLog log={latestLog} />
        </div>

        <Card>
          <div className="flex flex-col gap-2 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">本次训练</h2>
              <p className="mt-1 text-sm text-slate-400">{currentLog.date}</p>
            </div>
            <Button type="button" className="min-h-11" onClick={handleSave} data-testid="save-workout-log">
              保存记录
            </Button>
          </div>

          <p data-testid="save-status" className="mt-3 min-h-6 text-sm text-cyan-100">
            {status}
          </p>

          <div className="mt-4 space-y-4">
            {currentLog.exercises.length === 0 ? (
              <p className="rounded-md border border-dashed border-line px-4 py-6 text-sm text-slate-300">
                当前还没有动作。可以从最近计划带入，或手动添加一个动作。
              </p>
            ) : (
              currentLog.exercises.map((exercise) => (
                <WorkoutExerciseEditor
                  key={exercise.id}
                  exercise={exercise}
                  onAddSet={handleAddSet}
                  onDeleteSet={handleDeleteSet}
                  onSetChange={handleSetChange}
                  onNotesChange={handleNotesChange}
                />
              ))
            )}
          </div>

          {currentLog.exercises.length > 0 ? (
            <div className="mt-6 border-t border-line pt-4 sm:hidden">
              <Button type="button" className="min-h-11 w-full" onClick={handleSave} data-testid="save-workout-log-bottom">
                保存训练记录
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
  onNotesChange
}: {
  exercise: EditableWorkoutExercise;
  onAddSet: (exerciseId: string) => void;
  onDeleteSet: (exerciseId: string, setId: string) => void;
  onSetChange: (exerciseId: string, setId: string, key: 'weight' | 'reps', value: string) => void;
  onNotesChange: (exerciseId: string, notes: string) => void;
}) {
  const detail = getExerciseById(exercise.exerciseId);

  return (
    <article data-testid="workout-log-exercise" className="rounded-md border border-line bg-slate-950 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-white">{detail?.nameEn ?? exercise.exerciseId}</h3>
          <p className="text-sm text-slate-400">{detail?.name ?? exercise.exerciseId}</p>
        </div>
        {exercise.prescription ? (
          <div className="flex flex-wrap gap-2 text-xs text-slate-300">
            <span className="rounded bg-slate-900 px-2 py-1">建议 {exercise.prescription.sets} 组</span>
            <span className="rounded bg-slate-900 px-2 py-1">{exercise.prescription.repRange}</span>
            <span className="rounded bg-slate-900 px-2 py-1">休息 {exercise.prescription.restSeconds} 秒</span>
          </div>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        {exercise.sets.map((set) => (
          <div key={set.id} data-testid="workout-set-row" className="grid gap-2 rounded-md bg-slate-900 p-3 sm:grid-cols-[64px_1fr_1fr_auto] sm:items-end">
            <div className="text-sm font-medium text-slate-300">第 {set.setIndex} 组</div>
            <label className="grid gap-1 text-sm text-slate-300">
              重量
              <input
                data-testid="set-weight-input"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.5"
                value={set.weight}
                onChange={(event) => onSetChange(exercise.id, set.id, 'weight', event.target.value)}
                className="min-h-11 w-full rounded-md border border-line bg-slate-950 px-3 py-2 text-base text-white"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-300">
              次数
              <input
                data-testid="set-reps-input"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={set.reps}
                onChange={(event) => onSetChange(exercise.id, set.id, 'reps', event.target.value)}
                className="min-h-11 w-full rounded-md border border-line bg-slate-950 px-3 py-2 text-base text-white"
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
        <label className="grid gap-1 text-sm text-slate-300">
          动作备注
          <textarea
            data-testid="exercise-notes-input"
            value={exercise.notes}
            onChange={(event) => onNotesChange(exercise.id, event.target.value)}
            className="min-h-20 w-full rounded-md border border-line bg-slate-950 px-3 py-2 text-sm text-white"
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
        <p className="mt-3 text-sm text-slate-300">暂无已保存的训练记录。</p>
      </Card>
    );
  }

  const displayableExercises = getDisplayableWorkoutExercises(log);

  return (
    <Card>
      <div data-testid="latest-workout-log">
        <h2 className="text-lg font-semibold text-white">最近一次训练</h2>
        <p className="mt-1 text-sm text-slate-400">{log.date}</p>
        {displayableExercises.length > 0 ? (
          <div className="mt-3 space-y-3">
            {displayableExercises.map((item) => {
            const exercise = getExerciseById(item.exerciseId);
            return (
              <div key={item.id} className="rounded-md bg-slate-950 p-3 text-sm text-slate-300">
                <p className="font-semibold text-white">{exercise?.nameEn ?? item.exerciseId}</p>
                <p className="mt-1">{exercise?.name ?? item.exerciseId}</p>
                <p className="mt-1">
                  {item.sets.map(formatWorkoutSet).join(' / ')}
                </p>
                {item.notes ? <p className="mt-1 text-cyan-100">{item.notes}</p> : null}
              </div>
            );
            })}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-300">暂无可展示的训练记录。</p>
        )}
      </div>
    </Card>
  );
}

function createEmptyLog(): EditableWorkoutLog {
  return {
    id: createId('workout-log'),
    date: new Date().toISOString().slice(0, 10),
    exercises: [],
    notes: '',
    createdAt: new Date().toISOString()
  };
}

function createLogFromPlanDay(planId: string, day: GeneratedWorkoutDay): EditableWorkoutLog {
  return {
    ...createEmptyLog(),
    planId,
    exercises: day.items.map((item, index) => ({
      id: createId('log-exercise'),
      exerciseId: item.exerciseId,
      order: index,
      sets: Array.from({ length: Math.max(1, item.sets) }, (_, setIndex) => createEditableSet(setIndex + 1)),
      notes: '',
      prescription: {
        sets: item.sets,
        repRange: item.repRange,
        restSeconds: item.restSeconds
      }
    }))
  };
}

function createEditableSet(setIndex: number): EditableWorkoutSet {
  return {
    id: createId('set'),
    setIndex,
    weight: '',
    reps: '',
    completed: false
  };
}

function reindexSets(sets: EditableWorkoutSet[]) {
  return sets.map((set, index) => ({ ...set, setIndex: index + 1 }));
}

function normalizeLog(log: EditableWorkoutLog): NormalizeResult {
  if (log.exercises.length === 0) return { ok: false, error: 'no-exercise' };

  const exercisesWithSets: WorkoutLogExercise[] = [];

  for (const exercise of log.exercises) {
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
        notes: exercise.notes.trim() || undefined,
        sets: validSets
      });
    }
  }

  if (exercisesWithSets.length === 0) return { ok: false, error: 'no-valid-set' };

  return {
    ok: true,
    log: {
      id: log.id,
      date: log.date,
      planId: log.planId,
      exercises: exercisesWithSets,
      notes: log.notes.trim() || undefined,
      createdAt: log.createdAt
    }
  };
}

function normalizeSet(set: EditableWorkoutSet, setIndex: number): { set?: WorkoutSet; error?: SaveValidationError } {
  const weight = parseOptionalWeight(set.weight);
  const reps = parseOptionalReps(set.reps);

  if (weight.error) return { error: weight.error };
  if (reps.error) return { error: reps.error };
  if (weight.value === undefined && reps.value === undefined) return {};

  return {
    set: {
      id: set.id,
      setIndex,
      weight: weight.value,
      reps: reps.value,
      completed: true
    }
  };
}

function parseOptionalWeight(value: string): { value?: number; error?: SaveValidationError } {
  const trimmed = value.trim();
  if (trimmed === '') return {};
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return { error: 'invalid-number' };
  return { value: parsed };
}

function parseOptionalReps(value: string): { value?: number; error?: SaveValidationError } {
  const trimmed = value.trim();
  if (trimmed === '') return {};
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) return { error: 'invalid-number' };
  if (!Number.isInteger(parsed)) return { error: 'integer-reps' };
  return { value: parsed };
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
  return isValidOptionalNumber(set.weight) || isValidOptionalNumber(set.reps);
}

function isValidOptionalNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function formatWorkoutSet(set: WorkoutSet) {
  if (isValidOptionalNumber(set.weight) && isValidOptionalNumber(set.reps)) {
    return `第 ${set.setIndex} 组：${set.weight}kg x ${set.reps} 次`;
  }

  if (isValidOptionalNumber(set.weight)) {
    return `第 ${set.setIndex} 组：${set.weight}kg`;
  }

  return `第 ${set.setIndex} 组：${set.reps} 次`;
}

function isGeneratedPlan(value: unknown): value is GeneratedPlan {
  if (!value || typeof value !== 'object') return false;
  const plan = value as GeneratedPlan;
  return typeof plan.id === 'string' && Array.isArray(plan.days);
}

function isWorkoutLog(value: unknown): value is WorkoutLog {
  if (!value || typeof value !== 'object') return false;
  const log = value as WorkoutLog;
  return typeof log.id === 'string' && typeof log.date === 'string' && Array.isArray(log.exercises);
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
