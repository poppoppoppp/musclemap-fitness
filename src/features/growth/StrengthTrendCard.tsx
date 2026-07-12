import type { StrengthTrend } from '../../types/growth';
import TrendChart from './TrendChart';

interface StrengthTrendCardProps {
  trends: StrengthTrend[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export default function StrengthTrendCard({ trends, selectedId, onSelect }: StrengthTrendCardProps) {
  const trend = trends.find(({ id }) => id === selectedId) ?? trends[0];
  return (
    <section className="rounded-[24px] border border-lime-300/20 bg-[#111611]/95 p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-black tracking-[-0.025em] text-white">力量趋势</h2>
        <label className="relative">
          <span className="sr-only">选择动作</span>
          <select value={trend.id} onChange={(event) => onSelect(event.target.value)} className="min-h-10 appearance-none rounded-full border border-white/10 bg-black/30 py-2 pl-4 pr-9 text-sm font-bold text-white outline-none focus:border-lime-300/50 focus:ring-2 focus:ring-lime-300/20">
            {trends.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
          <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">⌄</span>
        </label>
      </div>
      <div className="mt-6 grid gap-5 sm:grid-cols-[8rem_1fr] sm:items-end">
        <div>
          <p className="text-sm text-zinc-400">估算 1RM</p>
          <p className="mt-2 text-[2.45rem] font-black leading-none tracking-[-0.04em] text-lime-300">{formatNumber(trend.currentValue)}<span className="ml-1.5 text-base tracking-normal">kg</span></p>
          <p className="mt-4 text-sm text-zinc-400">比上周期 <span className="ml-1 font-bold text-lime-300">+{formatNumber(trend.change)} kg</span></p>
        </div>
        <TrendChart id={`strength-${trend.id}`} points={trend.points} label={`${trend.label}估算 1RM 趋势`} />
      </div>
      <div className="mt-5 flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-black/20 px-4">
        <p className="text-sm text-zinc-300">本周期刷新 <span className="font-black text-lime-300">3</span> 项纪录</p>
        <button type="button" className="min-h-11 whitespace-nowrap text-sm font-bold text-lime-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/70">查看纪录 <span aria-hidden="true">›</span></button>
      </div>
    </section>
  );
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
