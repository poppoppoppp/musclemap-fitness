import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardMuscleHero, { type DashboardMuscleArea } from '../components/dashboard/DashboardMuscleHero';
import DashboardPrimaryAction from '../components/dashboard/DashboardPrimaryAction';
import DashboardRecentPlanCard from '../components/dashboard/DashboardRecentPlanCard';
import DashboardRecentWorkoutCard from '../components/dashboard/DashboardRecentWorkoutCard';
import { createActiveWorkoutFromPlanDay, createManualActiveWorkout, readActiveWorkout, writeActiveWorkout } from '../utils/activeWorkout';
import { PLAN_STORAGE_KEY } from '../utils/planRules';
import { readStorage } from '../utils/storage';
import { countValidSets, readWorkoutLogs } from '../utils/workoutHistory';
import type { ActiveWorkout } from '../types/activeWorkout';
import type { GeneratedPlan, WorkoutLog } from '../types/workout';

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);
  const [recentPlan, setRecentPlan] = useState<GeneratedPlan | null>(null);
  const [latestWorkout, setLatestWorkout] = useState<WorkoutLog | null>(null);
  const [selectedArea, setSelectedArea] = useState<DashboardMuscleArea>('chest');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    setActiveWorkout(readActiveWorkout());

    const plan = readStorage<GeneratedPlan | null>(PLAN_STORAGE_KEY, null);
    setRecentPlan(isGeneratedPlan(plan) ? plan : null);

    setLatestWorkout(readWorkoutLogs()[0] ?? null);
  }, []);

  useEffect(() => {
    if (!activeWorkout) {
      setElapsedSeconds(0);
      return;
    }

    const startedAtMs = new Date(activeWorkout.startedAt).getTime();
    if (!Number.isFinite(startedAtMs)) {
      setElapsedSeconds(0);
      return;
    }

    const updateElapsed = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)));
    };

    updateElapsed();
    const intervalId = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(intervalId);
  }, [activeWorkout]);

  const activeSummary = useMemo(() => {
    if (!activeWorkout) return null;
    const validSetCount = activeWorkout.exercises.reduce(
      (count, exercise) =>
        count + exercise.sets.filter((set) => isDisplayableNumber(set.weight) || isDisplayableNumber(set.reps)).length,
      0
    );
    return `${activeWorkout.exercises.length} 个动作 · ${validSetCount} 个有效组`;
  }, [activeWorkout]);

  const activeElapsedLabel = activeWorkout ? formatElapsedSeconds(elapsedSeconds) : null;
  const nextPlanDay = recentPlan?.days[0] ?? null;

  const handleStartPlanDay = () => {
    if (!recentPlan || !nextPlanDay) return;

    const existing = readActiveWorkout();
    if (existing) {
      navigate('/workout-log');
      return;
    }

    writeActiveWorkout(createActiveWorkoutFromPlanDay(recentPlan, nextPlanDay));
    navigate('/workout-log');
  };

  const handleStartWorkout = () => {
    const existing = readActiveWorkout();
    if (existing) {
      setActiveWorkout(existing);
      return;
    }

    const workout = createManualActiveWorkout();
    writeActiveWorkout(workout);
    setActiveWorkout(readActiveWorkout() ?? workout);
  };

  return (
    <div className="relative -mx-4 -mt-5 min-h-[calc(100vh-6rem)] overflow-hidden bg-[#F6F8FC] px-5 pb-8 pt-7 sm:-mx-6 sm:px-6">
      <div className="relative mx-auto max-w-[440px] space-y-4">
        <header className="flex items-center justify-between gap-3">
          <p className="text-nowrap text-[1.55rem] font-black italic leading-none tracking-normal text-[#102A5C] sm:text-[1.8rem]">
            MuscleMap <span className="text-[#2478FF]">Fitness</span>
          </p>
          <div className="flex h-12 shrink-0 items-center gap-2 rounded-full border border-[#E5EAF2] bg-white px-4 text-lg font-bold text-[#101828] shadow-[0_6px_18px_rgba(16,24,40,0.05)]">
            <span aria-hidden="true">🔥</span>
            <span>{latestWorkout ? countValidSets(latestWorkout) : activeWorkout?.exercises.length ?? 0}</span>
          </div>
        </header>

        <DashboardMuscleHero selectedArea={selectedArea} onSelectArea={setSelectedArea} />

        <DashboardPrimaryAction
          activeElapsedLabel={activeElapsedLabel}
          activeSummary={activeSummary}
          isActive={Boolean(activeWorkout)}
          onStartWorkout={handleStartWorkout}
        />

        <DashboardRecentPlanCard plan={recentPlan} day={nextPlanDay} onStartPlanDay={handleStartPlanDay} />

        <DashboardRecentWorkoutCard log={latestWorkout} />
      </div>
    </div>
  );
}

function isGeneratedPlan(value: unknown): value is GeneratedPlan {
  if (!value || typeof value !== 'object') return false;
  const plan = value as GeneratedPlan;
  return typeof plan.id === 'string' && typeof plan.name === 'string' && Array.isArray(plan.days);
}

function isDisplayableNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
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
