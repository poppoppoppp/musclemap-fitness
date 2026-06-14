import type { Exercise } from '../../types/exercise';
import type { WorkoutLog, WorkoutLogExercise, WorkoutSet } from '../../types/workout';
import { normalizeMuscleId } from '../../utils/workoutSummary';
import Badge from '../ui/Badge';

type WorkoutExerciseDetailListProps = {
  workout: WorkoutLog;
  exercises: Exercise[];
};

const muscleLabels: Record<string, string> = {
  chest: '胸',
  back: '背',
  shoulders: '肩',
  biceps: '二头',
  triceps: '三头',
  abs: '腹',
  obliques: '腹斜',
  glutes: '臀',
  quadriceps: '股四头',
  hamstrings: '腘绳',
  calves: '小腿'
};

export default function WorkoutExerciseDetailList({ workout, exercises }: WorkoutExerciseDetailListProps) {
  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const workoutExercises = Array.isArray(workout.exercises) ? [...workout.exercises].sort((left, right) => left.order - right.order) : [];

  if (workoutExercises.length === 0) {
    return (
      <section className="rounded-2xl border border-app-line bg-app-surface p-5">
        <p className="text-sm text-app-muted">这次训练没有动作数据。</p>
      </section>
    );
  }

  return (
    <section data-testid="workout-exercise-detail-list" className="space-y-4">
      {workoutExercises.map((exercise) => (
        <WorkoutExerciseReport key={exercise.id} workoutExercise={exercise} exercise={exerciseById.get(exercise.exerciseId)} />
      ))}
    </section>
  );
}

function WorkoutExerciseReport({ workoutExercise, exercise }: { workoutExercise: WorkoutLogExercise; exercise?: Exercise }) {
  const sets = Array.isArray(workoutExercise.sets) ? workoutExercise.sets : [];
  const muscleTags = buildMuscleTags(exercise);

  return (
    <article
      data-testid="workout-detail-exercise"
      className="min-w-0 rounded-2xl border border-app-line bg-app-surface p-5 text-app-text shadow-[0_6px_16px_rgba(17,24,39,0.05)]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="break-words text-2xl font-semibold tracking-tight">{exercise?.name ?? '未知动作'}</h2>
          <p className="mt-1 break-words text-sm text-app-muted">{exercise?.nameEn ?? workoutExercise.exerciseId}</p>
        </div>
        <Badge tone="accent" className="text-sm">{sets.length} 组</Badge>
      </div>

      {muscleTags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {muscleTags.map((tag) => (
            <Badge key={`${tag.kind}-${tag.label}`} tone={tag.kind === 'primary' ? 'accent' : 'neutral'}>
              {tag.label}
            </Badge>
          ))}
        </div>
      ) : null}

      {workoutExercise.notes ? <p className="mt-4 break-words text-sm leading-6 text-app-muted">{workoutExercise.notes}</p> : null}

      <div className="mt-5 grid gap-2 min-[420px]:grid-cols-2">
        {sets.length > 0 ? (
          sets.map((set, index) => (
            <div key={set.id} data-testid="workout-set-pill" className="grid min-h-12 grid-cols-[2rem_minmax(0,1fr)] items-center gap-2 rounded-2xl border border-app-line bg-app-surfaceMuted px-3 py-2 text-sm">
              <span className="text-center font-semibold text-app-muted">{isFiniteSetIndex(set.setIndex) ? set.setIndex : index + 1}</span>
              <span className="min-w-0 break-words font-semibold text-app-text">{formatSet(set)}</span>
            </div>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-app-line bg-app-surfaceMuted px-4 py-3 text-sm text-app-muted">暂无组数据</p>
        )}
      </div>
    </article>
  );
}

function buildMuscleTags(exercise?: Exercise) {
  if (!exercise) return [];
  const primary = uniqueNormalized(exercise.primaryMuscles);
  const secondary = uniqueNormalized(exercise.secondaryMuscles).filter((muscleId) => !primary.includes(muscleId));

  return [
    ...primary.map((muscleId) => ({ kind: 'primary' as const, label: muscleLabels[muscleId] ?? muscleId })),
    ...secondary.map((muscleId) => ({ kind: 'secondary' as const, label: muscleLabels[muscleId] ?? muscleId }))
  ];
}

function uniqueNormalized(muscleIds: string[]) {
  return [...new Set((muscleIds ?? []).map(normalizeMuscleId))];
}

function formatSet(set: WorkoutSet) {
  const weight = typeof set.weight === 'number' && Number.isFinite(set.weight) ? `${formatNumber(set.weight)}kg` : '自重';
  const reps = typeof set.reps === 'number' && Number.isFinite(set.reps) ? `${formatNumber(set.reps)}` : '-- 次';
  return `${weight} × ${reps}`;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function isFiniteSetIndex(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
