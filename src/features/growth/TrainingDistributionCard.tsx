import type { TrainingDistributionItem } from '../../types/growth';

export default function TrainingDistributionCard({ items, onDetails }: { items: TrainingDistributionItem[]; onDetails: () => void }) {
  const max = Math.max(...items.map(({ sets }) => sets), 1);
  const total = items.reduce((sum, item) => sum + item.sets, 0);
  return <section className="rounded-[24px] border border-lime-300/20 bg-[#111611]/95 p-5"><div className="flex items-center justify-between"><h2 className="text-xl font-black">训练分布</h2><button type="button" aria-label="查看训练分布详情" onClick={onDetails} className="min-h-11 text-sm font-bold text-lime-300">查看详情 ›</button></div>{total === 0 ? <div className="py-10 text-center text-sm text-zinc-500">当前范围内暂无训练分布</div> : <div className="mt-5 space-y-4">{items.map((item) => <div key={item.id} className="grid grid-cols-[3rem_1fr_3.5rem] items-center gap-3" aria-label={`${item.label} ${item.sets}组`}><span className="text-sm font-semibold text-zinc-300">{item.label}</span><span className="h-2.5 overflow-hidden rounded-full bg-white/[0.07]"><span className="block h-full rounded-full bg-lime-300" style={{ width: `${item.sets ? Math.max(item.sets / max * 100, 8) : 0}%` }} /></span><span className="text-right text-sm"><strong className="text-lime-300">{item.sets}</strong> 组</span></div>)}</div>}</section>;
}
