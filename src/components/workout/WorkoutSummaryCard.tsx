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
import MetricTile from '../ui/MetricTile';
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
      className="rounded-2xl border border-app-line bg-app-surface p-5 text-app-text shadow-[0_6px_16px_rgba(17,24,39,0.05)]"
    >
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div>
          <p className="text-sm font-medium text-app-muted">训练日期</p>
          <p className="mt-2 break-words text-2xl font-semibold tracking-tight">{workout.date}</p>
          <p className="mt-3 text-sm text-app-muted">总耗时</p>
          <p className="mt-1 text-xl font-semibold text-app-accent">{durationMinutes} 分钟</p>
          <p className="mt-3 text-sm text-app-muted">{formatSource(workout)}</p>
          {workout.notes ? <p className="mt-3 break-words text-sm leading-6 text-app-muted">{workout.notes}</p> : null}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:w-[360px] md:grid-cols-2">
          <MetricTile label="消耗热量" value={`${calories} kcal`} />
          <MetricTile label="总训练容量" value={`${formatNumber(volume)} kg`} />
          <MetricTile label="总组数" value={`${setCount} 组`} tone="accent" />
          <MetricTile label="动作数量" value={`${exerciseCount} 个动作`} />
        </div>
      </div>

      <div className="mt-5 border-t border-app-line pt-5">
        <WorkoutMuscleMap2D primaryMuscles={workedMuscles.primary} secondaryMuscles={workedMuscles.secondary} />
      </div>
    </section>
  );
}

function formatSource(workout: WorkoutLog) {
  if (workout.planId) return '来源：计划训练';
  return '来源：手动记录';
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
