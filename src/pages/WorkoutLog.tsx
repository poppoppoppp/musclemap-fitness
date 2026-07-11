import { useState } from 'react';
import ActiveWorkoutView from '../features/workout-log/ActiveWorkoutView';
import WorkoutLogOverview from '../features/workout-log/WorkoutLogOverview';
import type { ActiveWorkout } from '../types/activeWorkout';
import type { GeneratedPlan, GeneratedWorkoutDay, WorkoutLog } from '../types/workout';
import {
  clearActiveWorkout,
  createActiveWorkoutFromPlanDay,
  createManualActiveWorkout,
  readActiveWorkout,
  startWorkoutWithExercise,
  writeActiveWorkout
} from '../utils/activeWorkout';
import { LATEST_WORKOUT_LOG_KEY, WORKOUT_LOGS_KEY } from '../utils/backup';
import { PLAN_STORAGE_KEY } from '../utils/planRules';
import { readStorage, writeStorage } from '../utils/storage';
import { readWorkoutLogs } from '../utils/workoutHistory';

export type WorkoutLogPageMode = 'overview' | 'active' | 'completed';

export default function WorkoutLog() {
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(() => readActiveWorkout());
  const [completedWorkout, setCompletedWorkout] = useState<WorkoutLog | null>(null);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>(() => readWorkoutLogs());
  const [recentPlan] = useState<GeneratedPlan | null>(() => {
    const value = readStorage<GeneratedPlan | null>(PLAN_STORAGE_KEY, null);
    return isGeneratedPlan(value) ? value : null;
  });
  const mode: WorkoutLogPageMode = activeWorkout ? 'active' : completedWorkout ? 'completed' : 'overview';

  const persistActiveWorkout = (workout: ActiveWorkout) => {
    writeActiveWorkout(workout);
    setActiveWorkout(readActiveWorkout() ?? workout);
  };

  const handleStartFree = () => {
    setCompletedWorkout(null);
    const workout = readActiveWorkout() ?? createManualActiveWorkout();
    writeActiveWorkout(workout);
    setActiveWorkout(readActiveWorkout() ?? workout);
  };

  const handleStartPlanDay = (day: GeneratedWorkoutDay) => {
    if (!recentPlan) return;
    setCompletedWorkout(null);
    const workout = readActiveWorkout() ?? createActiveWorkoutFromPlanDay(recentPlan, day);
    writeActiveWorkout(workout);
    setActiveWorkout(readActiveWorkout() ?? workout);
  };

  const handleStartRecentExercise = (exerciseId: string) => {
    setCompletedWorkout(null);
    const existing = readActiveWorkout();
    setActiveWorkout(existing ?? startWorkoutWithExercise(exerciseId));
  };

  const handleArchive = (log: WorkoutLog) => {
    const nextLogs = [log, ...readWorkoutLogs().filter((item) => item.id !== log.id)];
    writeStorage(WORKOUT_LOGS_KEY, nextLogs);
    writeStorage(LATEST_WORKOUT_LOG_KEY, log);
    clearActiveWorkout();
    setActiveWorkout(null);
    setWorkoutLogs(readWorkoutLogs());
    setCompletedWorkout(log);
  };

  const handleDiscard = () => {
    clearActiveWorkout();
    setActiveWorkout(null);
  };

  if (mode === 'active' && activeWorkout) {
    return <ActiveWorkoutView workout={activeWorkout} onChange={persistActiveWorkout} onArchive={handleArchive} onDiscard={handleDiscard} />;
  }

  return (
    <div data-workout-log-mode={mode}>
      <WorkoutLogOverview
        logs={workoutLogs}
        recentPlan={recentPlan}
        onStartFree={handleStartFree}
        onStartPlanDay={handleStartPlanDay}
        onStartRecentExercise={handleStartRecentExercise}
      />
    </div>
  );
}

function isGeneratedPlan(value: unknown): value is GeneratedPlan {
  if (!value || typeof value !== 'object') return false;
  const plan = value as GeneratedPlan;
  return typeof plan.id === 'string' && typeof plan.name === 'string' && Array.isArray(plan.days);
}
