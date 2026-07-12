import { useMemo, useState } from 'react';
import { bodyMetricDefinitions } from '../../data/growthMockData';
import type { BodySnapshot } from '../../types/body';
import type { BodyMetricId, GrowthTimeRange } from '../../types/growth';
import { deriveBodyMetricSeries } from '../../utils/growthMetrics';
import TrendChart from './TrendChart';

export default function BodyMetricsCard({ snapshots, range }: { snapshots: BodySnapshot[]; range: GrowthTimeRange }) {
  const [metricId, setMetricId] = useState<BodyMetricId>('weight');
  const definition = bodyMetricDefinitions.find(({ id }) => id === metricId) ?? bodyMetricDefinitions[0];
  const series = useMemo(() => deriveBodyMetricSeries(snapshots, definition.id, range, new Date(), definition.fallbackPoints), [definition, range, snapshots]);
  const currentValue = series.points.at(-1)?.value ?? 0;
  const firstValue = series.points[0]?.value ?? currentValue;
  const change = series.source === 'real' ? currentValue - firstValue : definition.change;

  return (
    <section className="rounded-[24px] border border-lime-300/20 bg-[#111611]/95 p-5">
      <div className="flex items-center gap-2"><h2 className="text-xl font-black tracking-[-0.025em] text-white">身体数据</h2><span className="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-600 text-[0.65rem] font-bold text-zinc-400">i</span></div>
      <div className="mt-5 grid grid-cols-3 rounded-full border border-white/10 bg-black/25 p-1">
        {bodyMetricDefinitions.map((metric) => {
          const selected = metric.id === definition.id;
          return <button key={metric.id} type="button" aria-pressed={selected} onClick={() => setMetricId(metric.id)} className={`min-h-10 rounded-full text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/70 ${selected ? 'bg-lime-300 text-black' : 'text-zinc-400 hover:text-white'}`}>{metric.label}</button>;
        })}
      </div>
      <div className="mt-6 flex items-end justify-between gap-4">
        <div><p className="text-sm text-zinc-400">当前{definition.label}</p><p className="mt-2 text-[2.7rem] font-black leading-none tracking-[-0.04em] text-white">{formatNumber(currentValue)}<span className="ml-2 text-base tracking-normal text-lime-300">{definition.unit}</span></p></div>
        <div className="pb-1 text-right"><p className="text-sm text-zinc-400">比上周期</p><p className="mt-2 text-2xl font-black text-lime-300">{change > 0 ? '+' : ''}{formatNumber(change)} <span className="text-sm">{definition.unit}</span></p></div>
      </div>
      <div className="mt-4"><TrendChart compact id={`body-${definition.id}`} points={series.points} label={`${definition.label}趋势`} /></div>
    </section>
  );
}

function formatNumber(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
