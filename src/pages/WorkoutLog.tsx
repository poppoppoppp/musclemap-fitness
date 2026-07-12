import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { PLAN_STORAGE_KEY } from '../utils/planRules';
import { readStorage } from '../utils/storage';
import { readWorkoutLogs, saveWorkoutLog } from '../utils/workoutHistory';

export type WorkoutLogPageMode = 'overview' | 'active' | 'completed';

export default function WorkoutLog() {
  const navigate = useNavigate();
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(() => readActiveWorkout());
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>(() => readWorkoutLogs());
  const [recentPlan] = useState<GeneratedPlan | null>(() => {
    const value = readStorage<GeneratedPlan | null>(PLAN_STORAGE_KEY, null);
    return isGeneratedPlan(value) ? value : null;
  });
  const mode: WorkoutLogPageMode = activeWorkout ? 'active' : 'overview';

  const persistActiveWorkout = (workout: ActiveWorkout) => {
    writeActiveWorkout(workout);
    setActiveWorkout(readActiveWorkout() ?? workout);
  };

  const handleStartFree = () => {
    const workout = readActiveWorkout() ?? createManualActiveWorkout();
    writeActiveWorkout(workout);
    setActiveWorkout(readActiveWorkout() ?? workout);
  };

  const handleStartPlanDay = (day: GeneratedWorkoutDay) => {
    if (!recentPlan) return;
    const workout = readActiveWorkout() ?? createActiveWorkoutFromPlanDay(recentPlan, day);
    writeActiveWorkout(workout);
    setActiveWorkout(readActiveWorkout() ?? workout);
  };

  const handleStartRecentExercise = (exerciseId: string) => {
    const existing = readActiveWorkout();
    setActiveWorkout(existing ?? startWorkoutWithExercise(exerciseId));
  };

  const handleArchive = (log: WorkoutLog) => {
    saveWorkoutLog(log);
    clearActiveWorkout();
    setActiveWorkout(null);
    setWorkoutLogs(readWorkoutLogs());
    navigate(`/workout-history/${log.id}`, { replace: true, state: { justCompleted: true } });
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
