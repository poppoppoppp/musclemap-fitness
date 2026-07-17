import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardMusicPlayer from '../components/dashboard/DashboardMusicPlayer';
import DashboardPostureTaskCard from '../components/dashboard/DashboardPostureTaskCard';
import DashboardPrimaryAction from '../components/dashboard/DashboardPrimaryAction';
import DashboardRecentPlanCard from '../components/dashboard/DashboardRecentPlanCard';
import DashboardRecentWorkoutCard from '../components/dashboard/DashboardRecentWorkoutCard';
import UserIcon from '../components/icons/UserIcon';
import { createPosturePlanRepository } from '../repositories/posturePlanRepository';
import type { ActiveWorkout } from '../types/activeWorkout';
import type { GeneratedPlan, WorkoutLog } from '../types/workout';
import { addPosturePlanTaskToActiveWorkout, createActiveWorkoutFromPlanDay, createManualActiveWorkout, readActiveWorkout, startPosturePlanWorkout, writeActiveWorkout } from '../utils/activeWorkout';
import { getDashboardPlanProgress, getDashboardWorkoutSummary } from '../utils/dashboard';
import { PLAN_STORAGE_KEY } from '../utils/planRules';
import { getPostureTodayTask } from '../utils/posturePlanRules';
import { readStorage } from '../utils/storage';
import { readWorkoutLogs } from '../utils/workoutHistory';

export default function Dashboard() {
  const navigate = useNavigate();
  const [postureRepository] = useState(createPosturePlanRepository);
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(() => readActiveWorkout());
  const [recentPlan] = useState<GeneratedPlan | null>(() => {
    const plan = readStorage<GeneratedPlan | null>(PLAN_STORAGE_KEY, null);
    return isGeneratedPlan(plan) ? plan : null;
  });
  const [workoutLogs] = useState<WorkoutLog[]>(() => readWorkoutLogs());
  const [posturePlan] = useState(() => postureRepository.getActivePlan());
  const [postureFeedback] = useState(() => postureRepository.listFeedback());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!activeWorkout) {
      setElapsedSeconds(0);
      return;
    }

    const startedAtMs = new Date(activeWorkout.startedAt).getTime();
    if (!Number.isFinite(startedAtMs)) return;

    const updateElapsed = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)));
    updateElapsed();
    const intervalId = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(intervalId);
  }, [activeWorkout]);

  const recentWorkouts = workoutLogs.slice(0, 5).map((log) => ({
    log,
    summary: getDashboardWorkoutSummary(log, recentPlan)
  }));
  const planProgress = recentPlan ? getDashboardPlanProgress(recentPlan, workoutLogs) : null;
  const activeSummary = activeWorkout ? `${activeWorkout.exercises.length} 个动作已加入` : null;
  const activeElapsedLabel = activeWorkout ? formatElapsedSeconds(elapsedSeconds) : null;
  const postureTask = posturePlan ? getPostureTodayTask(posturePlan, workoutLogs, postureFeedback) : null;

  const handleStartPlanDay = () => {
    if (!recentPlan || !planProgress?.nextDay) return;
    const existing = readActiveWorkout();
    if (!existing) writeActiveWorkout(createActiveWorkoutFromPlanDay(recentPlan, planProgress.nextDay));
    navigate('/workout-log');
  };

  const handleStartTraining = () => {
    const existing = readActiveWorkout();
    if (existing) {
      setActiveWorkout(existing);
      return;
    }

    const workout = createManualActiveWorkout();
    writeActiveWorkout(workout);
    setActiveWorkout(workout);
  };

  const handleStartPostureTask = () => {
    if (!posturePlan || !postureTask) return;
    const existing = readActiveWorkout();
    const workout = existing
      ? addPosturePlanTaskToActiveWorkout(existing, posturePlan, postureTask)
      : startPosturePlanWorkout(posturePlan, postureTask);
    writeActiveWorkout(workout);
    setActiveWorkout(workout);
    navigate('/workout-log');
  };

  return (
    <div className="relative -mx-4 -mt-5 min-h-[calc(100vh-5rem)] overflow-hidden bg-[#080a08] px-4 pb-8 pt-6 text-white sm:-mx-6 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_72%_0%,rgba(190,242,48,0.10),transparent_42%)]" />
      <div className="relative mx-auto max-w-[440px] space-y-7">
        <header className="flex min-h-14 items-center justify-between gap-4">
          <h1 className="text-[1.75rem] font-black tracking-[-0.035em] text-white">
            Muscle<span className="text-lime-300">Map</span>
          </h1>
          <Link
            to="/data-management"
            aria-label="打开我的"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-zinc-300 transition hover:border-lime-300/40 hover:text-lime-300 focus:outline-none focus:ring-2 focus:ring-lime-300/70"
          >
            <UserIcon className="h-5 w-5" />
          </Link>
        </header>

        <DashboardPrimaryAction
          activeElapsedLabel={activeElapsedLabel}
          activeSummary={activeSummary}
          isActive={Boolean(activeWorkout)}
          onStartWorkout={handleStartTraining}
        />
        {posturePlan && postureTask ? (
          <DashboardPostureTaskCard
            feedback={postureFeedback}
            logs={workoutLogs}
            onStart={handleStartPostureTask}
            plan={posturePlan}
            task={postureTask}
          />
        ) : null}
        <DashboardRecentWorkoutCard workouts={recentWorkouts} />
        <DashboardRecentPlanCard
          day={planProgress?.nextDay ?? null}
          onStartPlanDay={handleStartPlanDay}
          percentage={planProgress?.percentage ?? 0}
          plan={recentPlan}
        />
        <DashboardMusicPlayer />
      </div>
    </div>
  );
}

function isGeneratedPlan(value: unknown): value is GeneratedPlan {
  if (!value || typeof value !== 'object') return false;
  const plan = value as GeneratedPlan;
  return typeof plan.id === 'string' && typeof plan.name === 'string' && Array.isArray(plan.days);
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
