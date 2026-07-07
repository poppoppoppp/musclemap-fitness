import type { GeneratedPlan, GeneratedWorkoutDay, WorkoutLog } from '../types/workout';
import { countValidSets, formatDuration } from './workoutHistory';
import { estimateWorkoutCalories } from './workoutSummary';

export interface DashboardWorkoutSummary {
  calories: number | null;
  date: string;
  duration: string | null;
  setCount: number;
  title: string;
}

export interface DashboardPlanProgress {
  completedCount: number;
  nextDay: GeneratedWorkoutDay | null;
  percentage: number;
}

export function getDashboardWorkoutSummary(log: WorkoutLog, plan: GeneratedPlan | null): DashboardWorkoutSummary {
  const calories = estimateWorkoutCalories(log);
  const linkedPlanName = log.planId && plan?.id === log.planId ? plan.name : null;

  return {
    calories: calories > 0 ? calories : null,
    date: log.date,
    duration: formatDuration(log.durationSeconds),
    setCount: countValidSets(log),
    title: linkedPlanName ?? `自由训练 · ${log.exercises.length} 个动作`
  };
}

export function getDashboardPlanProgress(plan: GeneratedPlan, logs: WorkoutLog[]): DashboardPlanProgress {
  const completedCount = logs.filter((log) => log.planId === plan.id).length;
  const dayCount = plan.days.length;

  if (dayCount === 0) {
    return { completedCount, nextDay: null, percentage: 0 };
  }

  return {
    completedCount,
    nextDay: plan.days[completedCount % dayCount] ?? null,
    percentage: Math.min(100, Math.round((completedCount / dayCount) * 100))
  };
}
