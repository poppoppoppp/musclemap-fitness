import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CalendarIcon from '../../components/icons/CalendarIcon';
import type { GeneratedPlan, GeneratedWorkoutDay, WorkoutLog } from '../../types/workout';
import { getRecentExerciseIds, getWeeklyWorkoutSummary } from '../../utils/workoutOverview';
import StartWorkoutSheet from './StartWorkoutSheet';
import WeeklyWorkoutSummaryCard from './WeeklyWorkoutSummaryCard';

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
        <div className="px-2 pb-2 pt-5">
          <p className="mb-4 text-center text-sm leading-6 text-zinc-400">准备好后，从一次专注的训练开始</p>
          <button type="button" onClick={() => setSheetOpen(true)} className="min-h-[68px] w-full rounded-full bg-lime-300 px-6 text-lg font-black text-[#10130d] shadow-[0_12px_32px_rgba(163,230,53,0.2)] transition hover:bg-lime-200 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-lime-200 focus:ring-offset-2 focus:ring-offset-[#080a08]">
            开始记录训练
          </button>
        </div>
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
