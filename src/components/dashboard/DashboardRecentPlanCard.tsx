import { Link } from 'react-router-dom';
import type { GeneratedPlan, GeneratedWorkoutDay } from '../../types/workout';
import BackPoseIcon from '../icons/BackPoseIcon';
import ChevronIcon from '../icons/ChevronIcon';
import DocumentIcon from '../icons/DocumentIcon';
import PlayIcon from '../icons/PlayIcon';

interface DashboardRecentPlanCardProps {
  day: GeneratedWorkoutDay | null;
  onStartPlanDay: () => void;
  plan: GeneratedPlan | null;
}

export default function DashboardRecentPlanCard({ plan, day, onStartPlanDay }: DashboardRecentPlanCardProps) {
  return (
    <div data-testid="dashboard-recent-plan" className="rounded-2xl border border-app-line bg-app-surface p-4">
      <div className="grid gap-4 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center">
        <div className="hidden aspect-square overflow-hidden rounded-2xl border border-app-line bg-app-surfaceMuted sm:block">
          <div className="flex h-full items-end justify-center pb-4">
            <BackPoseIcon className="h-24 w-24 text-app-accent" />
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-xl font-semibold text-app-text">{plan?.name ?? '暂无训练计划'}</h3>
              <p className="mt-3 text-sm leading-6 text-app-muted">
                {day ? (
                  <>
                    <span className="text-app-accent">•</span> 今天可执行：<span className="font-semibold text-app-text">{day.name}</span>
                  </>
                ) : (
                  '生成计划后会显示可执行训练日'
                )}
              </p>
            </div>
            <ChevronIcon className="mt-2 h-6 w-6 shrink-0 text-app-subtle" />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link
              to="/plan-builder"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-app-line bg-app-surface px-4 py-3 text-sm font-semibold text-app-text transition hover:bg-app-surfaceMuted focus:outline-none focus:ring-2 focus:ring-app-accent/30"
            >
              <DocumentIcon className="h-5 w-5" />
              去计划页
            </Link>
            <button
              type="button"
              disabled={!plan || !day}
              onClick={onStartPlanDay}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-app-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-app-accentHover focus:outline-none focus:ring-2 focus:ring-app-accent/30 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <PlayIcon className="h-5 w-5" />
              从计划开始
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
