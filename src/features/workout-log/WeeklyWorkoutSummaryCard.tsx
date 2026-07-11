import type { WeeklyWorkoutSummary } from '../../utils/workoutOverview';
import { formatOverviewDuration } from '../../utils/workoutOverview';

export default function WeeklyWorkoutSummaryCard({ summary }: { summary: WeeklyWorkoutSummary }) {
  return (
    <section data-testid="weekly-workout-summary" className="rounded-[22px] border border-lime-300/25 bg-white/[0.045] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black tracking-tight text-white">本周</h2>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-zinc-400 sm:text-sm">{summary.dateRangeLabel}</span>
      </div>

      <div className="mt-5 grid grid-cols-3 divide-x divide-white/10">
        <Metric value={summary.workoutCount} label="次训练" testId="weekly-training-count" />
        <Metric value={formatOverviewDuration(summary.durationSeconds)} label="训练时长" testId="weekly-duration" compact />
        <Metric value={summary.validSetCount} label="个有效组" testId="weekly-valid-set-count" />
      </div>

      <div className="mt-5 border-t border-white/10 pt-4">
        <div className="grid grid-cols-7 gap-1">
          {summary.days.map((day) => (
            <div
              key={day.dateKey}
              data-testid={`week-day-${day.dateKey}`}
              data-trained={day.trained ? 'true' : 'false'}
              className="flex min-w-0 flex-col items-center gap-2 text-center"
              aria-label={`${day.dateKey}${day.trained ? '已训练' : '未训练'}`}
            >
              <span className="text-[11px] font-semibold text-zinc-500 sm:text-xs">{day.weekday}</span>
              <span className="text-xs font-bold tabular-nums text-zinc-300 sm:text-sm">{day.dayOfMonth}</span>
              <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-black ${day.trained ? 'border-lime-300 bg-lime-300 text-black shadow-[0_0_12px_rgba(190,242,100,0.18)]' : 'border-zinc-600 bg-transparent text-transparent'}`} aria-hidden="true">
                ✓
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Metric({ value, label, testId, compact = false }: { value: string | number; label: string; testId: string; compact?: boolean }) {
  return (
    <div className="min-w-0 px-2 text-center first:pl-0 last:pr-0">
      <strong data-testid={testId} className={`${compact ? 'text-base sm:text-xl' : 'text-2xl sm:text-3xl'} block truncate font-black tabular-nums tracking-tight text-lime-300`}>
        {value}
      </strong>
      <span className="mt-1 block text-[11px] font-medium text-zinc-400 sm:text-xs">{label}</span>
    </div>
  );
}
