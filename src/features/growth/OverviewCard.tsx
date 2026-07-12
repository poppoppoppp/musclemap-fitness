import type { TrainingOverviewResult } from '../../types/growth';

export default function OverviewCard({ result }: { result: TrainingOverviewResult }) {
  const { current, changes } = result;
  const items = [
    { id: 'completed-workouts', label: '完成训练', value: current.completedWorkouts, unit: '次', change: changes?.completedWorkouts },
    { id: 'active-weeks', label: '活跃周数', value: current.activeWeeks, unit: '周', change: changes?.activeWeeks },
    { id: 'average-weekly', label: '平均每周训练', value: current.averagePerActiveWeek, unit: '次/周', change: changes?.averagePerActiveWeek }
  ];
  return <section data-testid="growth-overview-card" className="rounded-[24px] border border-lime-300/20 bg-[#111611]/95 p-5"><h2 className="text-xl font-black">成长概览</h2>{current.completedWorkouts === 0 ? <div className="py-8 text-center"><p className="font-bold text-zinc-300">暂无训练记录</p><p className="mt-2 text-sm text-zinc-500">完成训练后会生成真实成长概览。</p></div> : <div className="mt-6 grid grid-cols-3 divide-x divide-white/10">{items.map((item) => <div key={item.id} className="min-w-0 px-3 first:pl-0 last:pr-0"><p data-testid={`overview-${item.id}`} className="text-[1.6rem] font-black tracking-[-0.04em]">{format(item.value)}<span className="ml-1 text-xs tracking-normal text-zinc-400">{item.unit}</span></p><p className="mt-2 text-xs font-semibold text-zinc-300">{item.label}</p>{item.change !== undefined ? <p data-testid="overview-period-comparison" className="mt-1 text-[0.68rem] text-lime-300">较上周期 {item.change > 0 ? '+' : ''}{format(item.change)}{item.unit}</p> : null}</div>)}</div>}</section>;
}
function format(value: number) { const rounded = Math.round(value * 10) / 10; return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1); }
