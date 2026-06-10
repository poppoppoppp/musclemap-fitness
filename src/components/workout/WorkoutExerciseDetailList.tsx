import type { Exercise } from '../../types/exercise';
import type { WorkoutLog, WorkoutLogExercise, WorkoutSet } from '../../types/workout';
import { normalizeMuscleId } from '../../utils/workoutSummary';

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
      <section className="rounded-[22px] border border-white/10 bg-[#1c1c1f] p-5">
        <p className="text-sm text-[#94a3b8]">这次训练没有动作数据。</p>
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
      className="min-w-0 rounded-[22px] border border-white/10 bg-[#1c1c1f] p-5 text-white shadow-[0_16px_50px_rgba(0,0,0,0.18)]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="break-words text-2xl font-semibold tracking-tight">{exercise?.name ?? '未知动作'}</h2>
          <p className="mt-1 break-words text-sm text-[#94a3b8]">{exercise?.nameEn ?? workoutExercise.exerciseId}</p>
        </div>
        <p className="w-fit rounded-full bg-[#2997ff]/[0.15] px-3 py-1 text-sm font-semibold text-[#8fdcff]">{sets.length} 组</p>
      </div>

      {muscleTags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {muscleTags.map((tag) => (
            <span key={`${tag.kind}-${tag.label}`} className={tag.kind === 'primary' ? 'rounded-full bg-[#2997ff]/[0.18] px-3 py-1 text-xs font-semibold text-[#8fdcff]' : 'rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#cbd5e1]'}>
              {tag.label}
            </span>
          ))}
        </div>
      ) : null}

      {workoutExercise.notes ? <p className="mt-4 break-words text-sm leading-6 text-[#cbd5e1]">{workoutExercise.notes}</p> : null}

      <div className="mt-5 grid gap-2 min-[420px]:grid-cols-2">
        {sets.length > 0 ? (
          sets.map((set, index) => (
            <div key={set.id} data-testid="workout-set-pill" className="grid min-h-12 grid-cols-[2rem_minmax(0,1fr)] items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm">
              <span className="text-center font-semibold text-[#94a3b8]">{isFiniteSetIndex(set.setIndex) ? set.setIndex : index + 1}</span>
              <span className="min-w-0 break-words font-semibold text-[#f5f5f7]">{formatSet(set)}</span>
            </div>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-white/[0.15] bg-black/20 px-4 py-3 text-sm text-[#94a3b8]">暂无组数据</p>
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
