import type { PostureGrowthTrend } from '../../types/postureGrowth';

export default function PostureTrendCard({ trend }: { trend: PostureGrowthTrend }) {
  return (
    <section data-testid="posture-trend" className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-center justify-between gap-3"><h2 className="text-base font-black text-white">可比复测</h2><span className="text-xs font-bold text-lime-300">同方法 · 同视角 · 同指标</span></div>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{trend.comparison.summary}</p>
      <div className="mt-4 space-y-2">
        {trend.comparison.measurements.map((measurement) => (
          <div key={`${measurement.metricId}-${measurement.unit}`} className="rounded-xl bg-black/20 px-3 py-3">
            <p className="text-xs font-bold text-zinc-500">{measurement.metricId}</p>
            <p className="mt-1 text-sm font-bold text-zinc-100">{measurement.baseline} → {measurement.current} {measurement.unit === 'deg' ? '°' : ''}</p>
            <p className="mt-1 text-xs leading-5 text-zinc-400">{measurement.summary}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
