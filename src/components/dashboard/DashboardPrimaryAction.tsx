import { Link } from 'react-router-dom';
import DumbbellIcon from '../icons/DumbbellIcon';

interface DashboardPrimaryActionProps {
  activeElapsedLabel: string | null;
  activeSummary: string | null;
  isActive: boolean;
}

export default function DashboardPrimaryAction({ activeElapsedLabel, activeSummary, isActive }: DashboardPrimaryActionProps) {
  return (
    <div>
      <Link
        to="/workout-log"
        className="flex min-h-16 items-center justify-center gap-4 rounded-2xl bg-app-accent px-6 py-4 text-xl font-bold text-white shadow-[0_10px_24px_rgba(22,119,255,0.22)] transition hover:bg-app-accentHover active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-app-accent/30"
      >
        <DumbbellIcon className="h-8 w-8" />
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
