import DumbbellIcon from '../../components/icons/DumbbellIcon';
import type { WorkoutProgressSummary } from '../../utils/workoutOverview';
import { formatPercentage, formatWeight } from '../../utils/workoutOverview';

export default function WorkoutProgressCard({ summary }: { summary: WorkoutProgressSummary | null }) {
  if (!summary) {
    return (
      <section data-testid="workout-progress-card" className="rounded-[22px] border border-lime-300/20 bg-white/[0.04] p-5">
        <h2 className="text-lg font-black tracking-tight text-white">近期表现</h2>
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-dashed border-white/10 px-4 py-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lime-300/10 text-lime-300"><DumbbellIcon className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-5 text-zinc-200">暂无足够数据生成趋势</p>
            <p className="mt-1 text-sm text-zinc-500">继续记录同一动作后可查看变化</p>
          </div>
        </div>
      </section>
    );
  }

  const percentage = formatPercentage(summary.percentageChange);
  const percentageTone = summary.percentageChange === null || summary.percentageChange === 0
    ? 'text-zinc-400'
    : summary.percentageChange > 0 ? 'text-lime-300' : 'text-rose-300';

  return (
    <section data-testid="workout-progress-card" className="rounded-[22px] border border-lime-300/20 bg-white/[0.04] p-4 sm:p-5">
      <h2 className="text-lg font-black tracking-tight text-white">近期表现</h2>
      <div className="mt-4 flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-lime-300/10 text-lime-300"><DumbbellIcon className="h-6 w-6" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-black text-zinc-100">{summary.exerciseName}</p>
          <p className="mt-1 text-xs font-medium text-zinc-500">{summary.metricLabel} · 最近 {summary.points.length} 次</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-black tabular-nums text-white">{formatWeight(summary.previousValue)} → {formatWeight(summary.currentValue)}</p>
          {percentage ? <p className={`mt-1 text-sm font-black tabular-nums ${percentageTone}`}>{percentage}</p> : null}
        </div>
      </div>
      <TrendChart summary={summary} />
    </section>
  );
}

function TrendChart({ summary }: { summary: WorkoutProgressSummary }) {
  const width = 320;
  const height = 92;
  const paddingX = 12;
  const paddingY = 12;
  const values = summary.points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const points = summary.points.map((point, index) => {
    const x = summary.points.length === 1 ? width / 2 : paddingX + (index / (summary.points.length - 1)) * (width - paddingX * 2);
    const ratio = range === 0 ? 0.5 : (point.value - min) / range;
    const y = height - paddingY - ratio * (height - paddingY * 2);
    return { ...point, x, y };
  });
  const line = points.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <svg data-testid="workout-progress-chart" className="mt-4 h-auto w-full overflow-visible" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${summary.exerciseName}${summary.metricLabel}趋势`}>
      <polyline points={line} fill="none" stroke="rgb(190 242 100)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((point, index) => (
        <circle key={`${point.logId}-${point.dateKey}`} cx={point.x} cy={point.y} r={index === points.length - 1 ? 5 : 4} fill="rgb(190 242 100)" stroke="rgb(17 20 17)" strokeWidth="2" />
      ))}
    </svg>
  );
}
