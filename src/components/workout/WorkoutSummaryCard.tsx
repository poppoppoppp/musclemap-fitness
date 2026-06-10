import type { Exercise } from '../../types/exercise';
import type { WorkoutLog } from '../../types/workout';
import {
  calculateWorkoutExerciseCount,
  calculateWorkoutSetCount,
  calculateWorkoutVolume,
  estimateWorkoutCalories,
  getDurationMinutes,
  getWorkedMusclesFromWorkout
} from '../../utils/workoutSummary';
import WorkoutMuscleMap2D from './WorkoutMuscleMap2D';

type WorkoutSummaryCardProps = {
  workout: WorkoutLog;
  exercises: Exercise[];
};

export default function WorkoutSummaryCard({ workout, exercises }: WorkoutSummaryCardProps) {
  const durationMinutes = getDurationMinutes(workout);
  const calories = estimateWorkoutCalories(workout);
  const volume = calculateWorkoutVolume(workout);
  const setCount = calculateWorkoutSetCount(workout);
  const exerciseCount = calculateWorkoutExerciseCount(workout);
  const workedMuscles = getWorkedMusclesFromWorkout(workout, exercises);

  return (
    <section
      data-testid="workout-summary-card"
      className="rounded-[22px] border border-white/10 bg-[#1c1c1f] p-5 text-white shadow-[0_18px_60px_rgba(0,0,0,0.22)]"
    >
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div>
          <p className="text-sm font-medium text-[#94a3b8]">训练日期</p>
          <p className="mt-2 break-words text-2xl font-semibold tracking-tight">{workout.date}</p>
          <p className="mt-3 text-sm text-[#94a3b8]">总耗时</p>
          <p className="mt-1 text-xl font-semibold text-[#2997ff]">{durationMinutes} 分钟</p>
          <p className="mt-3 text-sm text-[#94a3b8]">{formatSource(workout)}</p>
          {workout.notes ? <p className="mt-3 break-words text-sm leading-6 text-[#cbd5e1]">{workout.notes}</p> : null}
        </div>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:w-[360px] md:grid-cols-2">
          <Metric label="消耗热量" value={`${calories} kcal`} />
          <Metric label="总训练容量" value={`${formatNumber(volume)} kg`} />
          <Metric label="总组数" value={`${setCount} 组`} />
          <Metric label="动作数量" value={`${exerciseCount} 个动作`} />
        </dl>
      </div>

      <div className="mt-5 border-t border-white/10 pt-5">
        <WorkoutMuscleMap2D primaryMuscles={workedMuscles.primary} secondaryMuscles={workedMuscles.secondary} />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
      <dt className="text-xs font-medium text-[#94a3b8]">{label}</dt>
      <dd className="mt-2 break-words text-xl font-semibold leading-tight text-[#f5f5f7]">{value}</dd>
    </div>
  );
}

function formatSource(workout: WorkoutLog) {
  if (workout.planId) return '来源：计划训练';
  return '来源：手动记录';
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
