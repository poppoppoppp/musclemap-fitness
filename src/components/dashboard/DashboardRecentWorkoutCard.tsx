import { Link } from 'react-router-dom';
import type { WorkoutLog } from '../../types/workout';
import { countValidSets } from '../../utils/workoutHistory';
import ChevronIcon from '../icons/ChevronIcon';
import DumbbellIcon from '../icons/DumbbellIcon';

interface DashboardRecentWorkoutCardProps {
  log: WorkoutLog | null;
}

export default function DashboardRecentWorkoutCard({ log }: DashboardRecentWorkoutCardProps) {
  return (
    <Link
      data-testid="dashboard-recent-workout"
      to={log ? `/workout-history/${log.id}` : '/workout-history'}
      className="flex min-h-[86px] items-center gap-4 rounded-[22px] bg-white px-4 py-4 shadow-[0_10px_26px_rgba(16,24,40,0.06)] transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#2478FF]/25"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#E9F8F3] text-[#12B886]">
        <DumbbellIcon className="h-8 w-8" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-black leading-6 text-[#101828]">最近一次训练</span>
        <span className="mt-1 block whitespace-nowrap text-[12px] font-medium sm:text-base" style={{ color: '#667085' }}>
          {log ? `${log.date} · ${log.exercises.length} 个动作 · ${countValidSets(log)} 组` : '2026-06-15 · 5 个动作 · 18 组'}
        </span>
      </span>
      <ChevronIcon className="h-7 w-7 shrink-0 text-[#667085]" />
    </Link>
  );
}
