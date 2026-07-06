import { Link } from 'react-router-dom';
import DumbbellIcon from '../icons/DumbbellIcon';

interface DashboardPrimaryActionProps {
  activeElapsedLabel: string | null;
  activeSummary: string | null;
  isActive: boolean;
  onStartWorkout: () => void;
}

export default function DashboardPrimaryAction({ activeElapsedLabel, activeSummary, isActive, onStartWorkout }: DashboardPrimaryActionProps) {
  return (
    <div>
      <Link
        to="/workout-log"
        onClick={onStartWorkout}
        className="flex min-h-[58px] items-center justify-center gap-4 rounded-[18px] bg-[#2478FF] px-6 py-4 text-xl font-black text-white shadow-[0_12px_26px_rgba(36,120,255,0.26)] transition hover:bg-[#1768EA] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#2478FF]/30"
      >
        <DumbbellIcon className="h-7 w-7" />
        {isActive ? '继续训练' : '开始记录'}
        {activeElapsedLabel ? (
          <span
            data-testid="dashboard-active-workout-timer"
            aria-label={`当前训练用时 ${activeElapsedLabel}`}
            className="rounded-full border border-white/25 bg-app-surface/15 px-3 py-1 text-sm font-bold tabular-nums text-white"
          >
            {activeElapsedLabel}
          </span>
        ) : null}
      </Link>
      {activeSummary ? <p className="mt-2 text-center text-sm font-medium text-app-muted">{activeSummary}</p> : null}
    </div>
  );
}
