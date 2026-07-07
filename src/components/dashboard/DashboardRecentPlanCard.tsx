import { Link } from 'react-router-dom';
import type { GeneratedPlan, GeneratedWorkoutDay } from '../../types/workout';
import CalendarIcon from '../icons/CalendarIcon';

interface DashboardRecentPlanCardProps {
  day: GeneratedWorkoutDay | null;
  onStartPlanDay: () => void;
  percentage: number;
  plan: GeneratedPlan | null;
}

export default function DashboardRecentPlanCard({ day, onStartPlanDay, percentage, plan }: DashboardRecentPlanCardProps) {
  return (
    <section aria-labelledby="recent-plan-title">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="recent-plan-title" className="text-lg font-extrabold text-white">当前计划</h2>
        <Link to="/plan-builder" className="min-h-11 py-3 text-sm font-semibold text-zinc-400 hover:text-white">管理计划</Link>
      </div>
      <div data-testid="dashboard-recent-plan" className="rounded-[22px] border border-white/10 bg-white/[0.055] p-4">
        {plan ? (
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-lime-300/10 text-lime-300">
              <CalendarIcon className="h-7 w-7" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold text-white">{plan.name}</p>
              <p className="mt-1 truncate text-sm text-zinc-400">{day ? `${day.name} · ${day.focus}` : '计划暂无训练日'}</p>
              <div className="mt-3 flex items-center gap-3">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <span className="block h-full rounded-full bg-lime-300" style={{ width: `${percentage}%` }} />
                </span>
                <span className="text-xs font-bold tabular-nums text-lime-300">{percentage}%</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onStartPlanDay}
              disabled={!day}
              className="min-h-11 shrink-0 rounded-full border border-lime-300/40 px-4 text-sm font-bold text-lime-300 transition hover:bg-lime-300/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              继续
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-zinc-500"><CalendarIcon className="h-7 w-7" /></span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-zinc-100">还没有训练计划</p>
              <p className="mt-1 text-sm text-zinc-400">选择适合你的训练安排</p>
            </div>
            <Link to="/plan-builder" className="flex min-h-11 items-center rounded-full bg-white/10 px-4 text-sm font-bold text-white hover:bg-white/15">选择计划</Link>
          </div>
        )}
      </div>
    </section>
  );
}
