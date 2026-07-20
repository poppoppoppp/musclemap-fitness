import { useEffect, useMemo, useState } from 'react';
import type { DynamicCapturedFrame, PostureMetricResult, PostureMovementAnalysisResponse } from '../../../../types/postureAnalysis';
import KeypointComparisonCanvas from './KeypointComparisonCanvas';
import TrajectoryChart from './TrajectoryChart';

export default function DynamicAnalysisResult({ result, capturedFrames }: { result: PostureMovementAnalysisResponse; capturedFrames: DynamicCapturedFrame[] }) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const inferenceFrame = result.frames[frameIndex];
  const captured = capturedFrames[inferenceFrame?.index ?? 0];
  useEffect(() => {
    if (!captured) return setFrameUrl(null);
    const url = URL.createObjectURL(captured.blob);
    setFrameUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [captured]);
  const validFrames = useMemo(() => result.frames.filter((frame) => frame.status === 'valid').length, [result.frames]);
  return (
    <section className="mt-6" data-testid="posture-dynamic-analysis-success">
      <div className={`rounded-2xl border p-4 ${result.analysis.status === 'valid' ? 'border-lime-300/25 bg-lime-300/[0.06]' : 'border-amber-300/30 bg-amber-300/10'}`}>
        <p className="text-xs font-black tracking-[0.1em] text-lime-300">{result.analysis.analysisVersion}</p>
        <h3 className="mt-2 text-lg font-black text-zinc-100">{result.analysis.status === 'valid' ? '动作完整' : '动作不完整、无法计算'}</h3>
        {result.analysis.status === 'incomplete' && <p className="mt-2 text-xs leading-5 text-amber-100">缺少起点、峰值停留或返回阶段。系统不会插值补造缺失阶段。</p>}
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-zinc-400">
          <span>{result.runtime.device.toUpperCase()} / {result.runtime.deviceName}</span>
          <span>总耗时 {result.timingMs.total.toFixed(1)} ms</span>
          <span>有效推理帧 {validFrames} / {result.frames.length}</span>
          <span>模型 {result.model.id}</span>
        </div>
      </div>

      {inferenceFrame && captured && frameUrl && (
        <div className="mt-4">
          <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-black" style={{ aspectRatio: `${captured.width} / ${captured.height}` }}>
            <img src={frameUrl} alt={`动作帧 ${frameIndex + 1}`} className="h-full w-full object-contain" />
            {inferenceFrame.person && <KeypointComparisonCanvas mediaPipe={[]} rtmPose={inferenceFrame.person.keypoints} boundingBox={inferenceFrame.person.boundingBox} imageWidth={captured.width} imageHeight={captured.height} mode="rtmpose" />}
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(0, result.frames.length - 1)}
            value={frameIndex}
            onChange={(event) => setFrameIndex(Number(event.target.value))}
            className="mt-3 w-full accent-lime-300"
            data-testid="movement-frame-slider"
            aria-label="动作帧回看"
          />
          <p className="mt-1 text-center text-xs text-zinc-500">帧 {frameIndex + 1} / {result.frames.length} · {inferenceFrame.timestampMs.toFixed(1)} ms · {inferenceFrame.status === 'valid' ? '有效' : inferenceFrame.error?.code}</p>
        </div>
      )}

      <div className="mt-4 grid gap-3">
        {result.analysis.metrics.map((metric) => <MovementMetric key={metric.id} metric={metric} />)}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {result.analysis.trajectories.map((trajectory) => <TrajectoryChart key={trajectory.id} trajectory={trajectory} />)}
      </div>
    </section>
  );
}

function MovementMetric({ metric }: { metric: PostureMetricResult }) {
  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex justify-between gap-3"><h4 className="text-sm font-black text-zinc-100">{metric.label}</h4><span className={metric.status === 'valid' ? 'text-xs text-lime-300' : 'text-xs text-amber-200'}>{metric.status === 'valid' ? '有效' : '不可计算'}</span></div>
      {metric.status === 'valid'
        ? <p className="mt-2 text-sm font-black text-lime-100">{metric.values.map((value) => `${value.label} ${formatValue(value.value, value.unit)}`).join(' · ')}</p>
        : <p className="mt-2 text-xs text-amber-100">动作阶段不完整</p>}
      <p className="mt-2 font-mono text-[10px] leading-4 text-zinc-500">{metric.formula}</p>
    </article>
  );
}

function formatValue(value: number, unit: string) {
  if (unit === 'degrees') return `${value.toFixed(1)}°`;
  if (unit.startsWith('percent-')) return `${value.toFixed(1)}%`;
  return `${value.toFixed(2)} ${unit}`;
}
