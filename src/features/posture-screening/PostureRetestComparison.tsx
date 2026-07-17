import type { PostureScreeningSession } from '../../repositories/postureScreeningRepository';
import { comparePostureScreeningSessions } from '../../utils/postureScreeningComparison';

const metricLabels: Record<string, string> = {
  'craniovertebral-angle': '颅椎角',
  'frontal-head-tilt': '正面头部倾斜角',
  'frontal-shoulder-height-difference': '正面肩高差',
  'lateral-shoulder-angle': '侧面肩部角度',
  'lateral-trunk-inclination': '侧面躯干倾角',
  'frontal-trunk-deviation': '正面躯干偏移角',
};

export default function PostureRetestComparison({ baseline, current }: { baseline: PostureScreeningSession; current: PostureScreeningSession }) {
  const comparison = comparePostureScreeningSessions(baseline, current);
  return (
    <section className="mt-5 border-t border-white/10 pt-4" aria-labelledby={`comparison-${current.id}`}>
      <h3 id={`comparison-${current.id}`} className="text-sm font-black text-zinc-100">同方法复测对照</h3>
      <p className="mt-2 text-xs leading-5 text-zinc-400">{comparison.summary}</p>
      {comparison.measurements.length ? <ul className="mt-3 divide-y divide-white/10 border-y border-white/10">{comparison.measurements.map((measurement) => <li key={measurement.metricId} className="py-3"><p className="text-xs font-black text-zinc-200">{metricLabels[measurement.metricId ?? ''] ?? measurement.metricId}</p><p className="mt-1 text-xs leading-5 text-zinc-400">{measurement.summary}</p></li>)}</ul> : null}
    </section>
  );
}
