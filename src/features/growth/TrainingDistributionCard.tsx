import type { TrainingDistributionItem } from '../../types/growth';

export default function TrainingDistributionCard({ items }: { items: TrainingDistributionItem[] }) {
  const max = Math.max(...items.map(({ sets }) => sets), 1);
  return (
    <section className="rounded-[24px] border border-lime-300/20 bg-[#111611]/95 p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-black tracking-[-0.025em] text-white">训练分布</h2>
        <button type="button" className="min-h-11 text-sm font-bold text-lime-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/70">查看详情 <span aria-hidden="true">›</span></button>
      </div>
      <div className="mt-5 space-y-4">
        {items.map((item) => (
          <div key={item.id} className="grid grid-cols-[3rem_1fr_3.5rem] items-center gap-3" aria-label={`${item.label} ${item.sets}组`}>
            <span className="text-sm font-semibold text-zinc-300">{item.label}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-white/[0.07]"><span className="block h-full rounded-full bg-gradient-to-r from-lime-400/75 to-lime-300" style={{ width: `${item.sets === 0 ? 0 : Math.max((item.sets / max) * 100, 8)}%` }} /></span>
            <span className="text-right text-sm"><strong className="text-base text-lime-300">{item.sets}</strong> <span className="text-zinc-500">组</span></span>
          </div>
        ))}
      </div>
    </section>
  );
}
