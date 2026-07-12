import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { BodyMetricRecord } from '../../types/body';
import type { BodyMetricId, GrowthTimeRange } from '../../types/growth';
import { deriveBodyMetricSeries } from '../../utils/growthMetrics';
import TrendChart from './TrendChart';

const metrics = [
  { id: 'weight' as const, label: '体重', unit: 'kg' },
  { id: 'waist' as const, label: '腰围', unit: 'cm' },
  { id: 'arm' as const, label: '臂围', unit: 'cm' }
];

export default function BodyMetricsCard({ records, range, onRecord }: { records: BodyMetricRecord[]; range: GrowthTimeRange; onRecord: () => void }) {
  const [metricId, setMetricId] = useState<BodyMetricId>('weight');
  const metric = metrics.find(({ id }) => id === metricId) ?? metrics[0];
  const series = deriveBodyMetricSeries(records, metric.id, range);
  const currentValue = series.points.at(-1)?.value;
  const change = series.points.length >= 2 ? series.points.at(-1)!.value - series.points[0].value : null;

  return (
    <section className="rounded-[24px] border border-lime-300/20 bg-[#111611]/95 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black tracking-[-0.025em] text-white">身体数据</h2>
        <div className="flex items-center gap-3">
          {records.length > 0 ? <Link to="/growth/body-records" className="min-h-10 content-center text-sm font-bold text-zinc-300 focus:outline-none focus:ring-2 focus:ring-lime-300/60">查看记录 <span aria-hidden="true">›</span></Link> : null}
          <button type="button" onClick={onRecord} className="min-h-10 rounded-full bg-lime-300 px-3 text-sm font-black text-black focus:outline-none focus:ring-2 focus:ring-lime-100">＋ 记录数据</button>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 rounded-full border border-white/10 bg-black/25 p-1">
        {metrics.map((item) => <button key={item.id} type="button" aria-pressed={item.id === metric.id} onClick={() => setMetricId(item.id)} className={`min-h-10 rounded-full text-sm font-bold focus:outline-none focus:ring-2 focus:ring-lime-300/60 ${item.id === metric.id ? 'bg-lime-300 text-black' : 'text-zinc-400'}`}>{item.label}</button>)}
      </div>
      {series.status === 'empty' ? (
        <div data-testid="body-metric-empty" className="py-10 text-center">
          <p className="font-bold text-zinc-300">暂无{metric.label}记录</p>
          <p className="mt-2 text-sm text-zinc-500">记录真实数据后，这里会显示变化。</p>
          {records.length === 0 ? <button type="button" onClick={onRecord} className="mt-5 min-h-12 rounded-full border border-lime-300/40 px-5 font-black text-lime-300 focus:outline-none focus:ring-2 focus:ring-lime-300/60">记录第一条数据</button> : null}
        </div>
      ) : (
        <>
          <div className="mt-6 flex items-end justify-between gap-4">
            <div><p className="text-sm text-zinc-400">当前{metric.label}</p><p className="mt-2 text-[2.5rem] font-black leading-none tracking-[-0.04em] text-white">{format(currentValue!)}<span className="ml-2 text-base tracking-normal text-lime-300">{metric.unit}</span></p></div>
            {change !== null && range !== 'all' ? <div className="text-right"><p className="text-sm text-zinc-400">本周期变化</p><p className="mt-2 text-xl font-black text-lime-300">{change > 0 ? '+' : ''}{format(change)} {metric.unit}</p></div> : null}
          </div>
          {series.status === 'single' ? <p className="mt-8 rounded-xl bg-white/[0.035] p-4 text-center text-sm text-zinc-400">再记录一次即可生成趋势</p> : <div className="mt-4"><TrendChart compact id={`body-${metric.id}`} points={series.points} label={`${metric.label}趋势`} /></div>}
        </>
      )}
    </section>
  );
}

function format(value: number) { const rounded = Math.round(value * 10) / 10; return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1); }
