import type { TrainingOverviewMetrics } from '../../types/growth';

export default function OverviewCard({ metrics }: { metrics: TrainingOverviewMetrics }) {
  const items = [
    { label: '完成训练', value: metrics.completedWorkouts, unit: '次', comparison: metrics.completedWorkouts > 0 ? '比上周期 ↑12%' : '等待首次训练' },
    { label: '活跃周数', value: metrics.activeWeeks, unit: '周', comparison: metrics.activeWeeks > 0 ? '比上周期 ↑1周' : '本周期暂无记录' },
    { label: '平均每周训练', value: metrics.averagePerActiveWeek, unit: '次/周', comparison: metrics.averagePerActiveWeek > 0 ? '比上周期 ↑0.6次' : '完成训练后生成' }
  ];

  return (
    <section data-testid="growth-overview-card" className="relative overflow-hidden rounded-[24px] border border-lime-300/20 bg-[#111611]/95 p-5 shadow-[0_20px_55px_rgba(0,0,0,0.18)]">
      <div aria-hidden="true" className="absolute right-4 top-0 h-28 w-28 rounded-full bg-lime-300/[0.07] blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-black tracking-[-0.025em] text-white">成长概览</h2>
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-600 text-[0.65rem] font-bold text-zinc-400">i</span>
        </div>
        <div className="mt-7 grid grid-cols-3 divide-x divide-white/10">
          {items.map((item) => (
            <div key={item.label} className="min-w-0 px-3 first:pl-0 last:pr-0">
              <p className="text-[1.65rem] font-black tracking-[-0.04em] text-white sm:text-[2rem]">
                {item.value}<span className="ml-1 text-xs font-bold tracking-normal text-zinc-400">{item.unit}</span>
              </p>
              <p className="mt-2 text-xs font-semibold text-zinc-300">{item.label}</p>
              <p className="mt-1.5 text-[0.65rem] leading-4 text-lime-300/90">{item.comparison}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 border-t border-white/10 pt-4 text-center text-sm leading-6 text-zinc-400">保持稳定的训练节奏，你正在持续进步！</p>
      </div>
    </section>
  );
}
