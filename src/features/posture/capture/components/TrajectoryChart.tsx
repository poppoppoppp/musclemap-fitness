import type { PostureTrajectory } from '../../../../types/postureAnalysis';

export default function TrajectoryChart({ trajectory }: { trajectory: PostureTrajectory }) {
  const samples = trajectory.samples;
  if (!samples.length) return null;
  const width = 320;
  const height = 110;
  const values = samples.map((sample) => sample.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const startTime = samples[0].timestampMs;
  const endTime = samples[samples.length - 1].timestampMs;
  const timeRange = Math.max(1, endTime - startTime);
  const valueRange = Math.max(1e-6, maxValue - minValue);
  const points = samples.map((sample) => {
    const x = ((sample.timestampMs - startTime) / timeRange) * width;
    const y = height - ((sample.value - minValue) / valueRange) * height;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
  return (
    <figure className="rounded-xl border border-zinc-800 bg-zinc-950 p-3" data-testid="posture-trajectory-chart">
      <figcaption className="mb-2 text-xs font-black text-zinc-300">{trajectory.label} · {trajectory.unit}</figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-28 w-full" role="img" aria-label={`${trajectory.label}轨迹`}>
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#3f3f46" strokeWidth="1" />
        <polyline points={points} fill="none" stroke="#a3e635" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <p className="mt-1 text-[10px] text-zinc-500">真实时间 {startTime.toFixed(0)}–{endTime.toFixed(0)} ms · {samples.length} 个有效点</p>
    </figure>
  );
}
