import { Link } from 'react-router-dom';
import ChevronIcon from '../../components/icons/ChevronIcon';
import DumbbellIcon from '../../components/icons/DumbbellIcon';
import type { RecentWorkoutSummary } from '../../utils/workoutOverview';

export default function RecentWorkoutCard({ summary }: { summary: RecentWorkoutSummary | null }) {
  if (!summary) {
    return (
      <section data-testid="recent-workout-card" className="rounded-[22px] border border-lime-300/20 bg-white/[0.04] p-5">
        <h2 className="text-lg font-black tracking-tight text-white">最近一次训练</h2>
        <div className="mt-5 rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center">
          <p className="font-bold text-zinc-200">暂无训练记录</p>
          <p className="mt-2 text-sm leading-6 text-zinc-500">完成一次训练后会显示在这里</p>
        </div>
      </section>
    );
  }

  return (
    <section data-testid="recent-workout-card" className="rounded-[22px] border border-lime-300/20 bg-white/[0.04] p-4 sm:p-5">
      <h2 className="text-lg font-black tracking-tight text-white">最近一次训练</h2>
      <div className="mt-4 flex min-w-0 items-center gap-3 border-b border-white/10 pb-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-lime-300/10 text-lime-300">
          <DumbbellIcon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-black text-zinc-100">{summary.dateLabel} · {summary.themeLabel}</p>
          <p className="mt-1 flex flex-wrap gap-x-2 text-xs font-medium text-zinc-400">
            <span>{summary.durationLabel}</span>
            <span>{summary.exerciseCount} 个动作</span>
            <span>{summary.validSetCount} 组</span>
          </p>
        </div>
      </div>

      {summary.exercises.length > 0 ? (
        <div className="divide-y divide-white/10">
          {summary.exercises.map((exercise) => (
            <div key={exercise.id} data-testid="recent-workout-exercise" className="flex min-h-12 items-center gap-3 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-lime-300">
                <DumbbellIcon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-200">{exercise.name}</span>
              <span className="shrink-0 text-sm font-bold tabular-nums text-zinc-100">{exercise.valueLabel}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-5 text-sm text-zinc-500">本次训练没有可展示的有效组</p>
      )}

      <Link to={`/workout-history/${summary.log.id}`} className="mt-2 flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-black text-lime-300 transition hover:bg-lime-300/[0.06] focus:outline-none focus:ring-2 focus:ring-lime-300/60">
        查看完整记录
        <ChevronIcon className="h-4 w-4" />
      </Link>
    </section>
  );
}
