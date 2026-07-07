import { Link } from 'react-router-dom';
import type { WorkoutLog } from '../../types/workout';
import type { DashboardWorkoutSummary } from '../../utils/dashboard';
import ChevronIcon from '../icons/ChevronIcon';
import DumbbellIcon from '../icons/DumbbellIcon';

interface DashboardRecentWorkoutCardProps {
  log: WorkoutLog | null;
  summary: DashboardWorkoutSummary | null;
}

export default function DashboardRecentWorkoutCard({ log, summary }: DashboardRecentWorkoutCardProps) {
  return (
    <section aria-labelledby="recent-workout-title">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="recent-workout-title" className="text-lg font-extrabold text-white">最近一次训练</h2>
        <Link to="/workout-history" className="min-h-11 py-3 text-sm font-semibold text-zinc-400 hover:text-white">查看全部</Link>
      </div>
      <Link
        data-testid="dashboard-recent-workout"
        to={log ? `/workout-history/${log.id}` : '/workout-history'}
        className="group flex min-h-[126px] items-center gap-4 rounded-[22px] border border-white/10 bg-white/[0.055] p-4 transition duration-200 hover:border-white/20 hover:bg-white/[0.075] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-lime-300/70"
      >
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] bg-lime-300/10 text-lime-300">
          <DumbbellIcon className="h-8 w-8" />
        </span>
        {summary ? (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-bold text-zinc-100">{summary.title}</span>
            <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-zinc-400">
              <span>{summary.date}</span>
              {summary.duration ? <span>{summary.duration}</span> : null}
              {summary.calories ? <span>{summary.calories} kcal</span> : null}
              <span>{summary.setCount} 组</span>
            </span>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-lime-300">已完成 <span aria-hidden="true">✓</span></span>
          </span>
        ) : (
          <span className="min-w-0 flex-1 text-sm leading-6 text-zinc-400">还没有训练记录，完成一次训练后会显示在这里</span>
        )}
        <ChevronIcon className="h-5 w-5 shrink-0 text-zinc-600 transition group-hover:text-zinc-300" />
      </Link>
    </section>
  );
}
