import { Link } from 'react-router-dom';
import type { WorkoutLog } from '../../types/workout';
import { countValidSets, formatDuration } from '../../utils/workoutHistory';
import ChevronIcon from '../icons/ChevronIcon';
import ClockIcon from '../icons/ClockIcon';
import DumbbellIcon from '../icons/DumbbellIcon';

interface DashboardRecentWorkoutCardProps {
  log: WorkoutLog | null;
}

export default function DashboardRecentWorkoutCard({ log }: DashboardRecentWorkoutCardProps) {
  const duration = formatDuration(log?.durationSeconds);

  return (
    <Link
      data-testid="dashboard-recent-workout"
      to={log ? `/workout-history/${log.id}` : '/workout-history'}
      className="block rounded-2xl border border-app-line bg-app-surface p-5 transition hover:border-app-accent/45 focus:outline-none focus:ring-2 focus:ring-app-accent/30"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <ClockIcon className="h-8 w-8 text-app-accent" />
            <h2 className="text-xl font-semibold text-app-text">最近一次训练</h2>
          </div>
          <div className="mt-6 flex items-center gap-4 text-sm leading-6 text-app-muted">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-app-accent/20 bg-app-accentSoft text-app-accent">
              <DumbbellIcon className="h-6 w-6" />
            </span>
            <p className="min-w-0 truncate">
              {log ? `${log.date} · ${log.exercises.length} 个动作 · ${countValidSets(log)} 组${duration ? ` · ${duration}` : ''}` : '完成训练后会显示在这里'}
            </p>
          </div>
        </div>
        <ChevronIcon className="mt-2 h-6 w-6 shrink-0 text-app-subtle" />
      </div>
    </Link>
  );
}
