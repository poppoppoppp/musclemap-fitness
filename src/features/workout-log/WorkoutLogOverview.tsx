import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CalendarIcon from '../../components/icons/CalendarIcon';
import type { GeneratedPlan, GeneratedWorkoutDay, WorkoutLog } from '../../types/workout';
import { getRecentExerciseIds, getRecentWorkoutSummary, getWeeklyWorkoutSummary, getWorkoutProgressSummary } from '../../utils/workoutOverview';
import RecentWorkoutCard from './RecentWorkoutCard';
import StartWorkoutSheet from './StartWorkoutSheet';
import WeeklyWorkoutSummaryCard from './WeeklyWorkoutSummaryCard';
import WorkoutProgressCard from './WorkoutProgressCard';

interface WorkoutLogOverviewProps {
  logs: WorkoutLog[];
  recentPlan: GeneratedPlan | null;
  onStartFree: () => void;
  onStartPlanDay: (day: GeneratedWorkoutDay) => void;
  onStartRecentExercise: (exerciseId: string) => void;
}

export default function WorkoutLogOverview({ logs, recentPlan, onStartFree, onStartPlanDay, onStartRecentExercise }: WorkoutLogOverviewProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const weeklySummary = useMemo(() => getWeeklyWorkoutSummary(logs), [logs]);
  const recentSummary = useMemo(() => getRecentWorkoutSummary(logs, recentPlan), [logs, recentPlan]);
  const progressSummary = useMemo(() => getWorkoutProgressSummary(logs), [logs]);
  const recentExerciseIds = useMemo(() => getRecentExerciseIds(logs), [logs]);

  return (
    <div data-testid="workout-log-overview" className="relative -mx-4 -mt-5 min-h-[calc(100dvh-5rem)] overflow-hidden bg-[#080a08] px-4 pb-8 pt-6 text-white sm:-mx-6 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_75%_0%,rgba(190,242,48,0.09),transparent_44%)]" />
      <div className="relative mx-auto max-w-[440px] space-y-4">
        <header className="flex min-h-14 items-center justify-between gap-4">
          <h1 className="text-[1.75rem] font-black tracking-[-0.035em] text-white">训练记录</h1>
          <Link to="/workout-history" aria-label="查看训练日历与历史" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-lime-300 transition hover:border-lime-300/35 hover:bg-lime-300/[0.07] focus:outline-none focus:ring-2 focus:ring-lime-300/70">
            <CalendarIcon className="h-5 w-5" />
          </Link>
        </header>

        <WeeklyWorkoutSummaryCard summary={weeklySummary} />
        <RecentWorkoutCard summary={recentSummary} />
        <WorkoutProgressCard summary={progressSummary} />

        <button type="button" onClick={() => setSheetOpen(true)} className="min-h-14 w-full rounded-2xl bg-lime-300 px-5 text-base font-black text-black shadow-[0_7px_18px_rgba(163,230,53,0.17)] transition hover:bg-lime-200 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-lime-200 focus:ring-offset-2 focus:ring-offset-[#080a08]">
          开始记录训练
        </button>
      </div>

      <StartWorkoutSheet
        open={sheetOpen}
        plan={recentPlan}
        recentExerciseIds={recentExerciseIds}
        onClose={() => setSheetOpen(false)}
        onStartFree={onStartFree}
        onStartPlanDay={onStartPlanDay}
        onStartRecentExercise={onStartRecentExercise}
      />
    </div>
  );
}
