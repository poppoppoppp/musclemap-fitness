import type { PostureCaptureMetricSnapshot, PostureCaptureSnapshot, PostureMovementCaptureSnapshot, PostureStaticCaptureSnapshot } from '../../repositories/postureScreeningRepository';

const viewLabels = { front: '正面', side: '侧面', back: '背面' } as const;
const actionLabels = { 'bilateral-arm-raise': '双臂上举', 'bodyweight-squat': '徒手深蹲', 'neck-retraction': '颈部回缩' } as const;

export default function PostureCaptureSnapshotReport({ snapshot }: { snapshot: PostureCaptureSnapshot }) {
  const warnings = [
    ...snapshot.staticCaptures.flatMap((capture) => capture.warnings.map((warning) => ({ ...warning, source: `${viewLabels[capture.view]}静态` }))),
    ...snapshot.movements.flatMap((movement) => movement.warnings.map((warning) => ({ ...warning, source: actionLabels[movement.action] }))),
  ];
  const models = uniqueModels(snapshot);
  return (
    <section className="mt-8" aria-labelledby="capture-snapshot-title" data-testid="capture-snapshot-report">
      <h2 id="capture-snapshot-title" className="text-lg font-black">自动采集快照</h2>
      <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-sm font-black text-white">筛查有效性：{validityLabel(snapshot.validity)}</p>
        <p className="mt-1 text-xs leading-5 text-zinc-400">以下内容只读取完成筛查时保存的结构化快照，不重新运行当前算法。</p>
      </div>

      <div className="mt-5 space-y-4">
        {snapshot.staticCaptures.map((capture) => <StaticCapture key={`${capture.view}-${capture.visibleSide ?? 'none'}`} capture={capture} />)}
        {snapshot.movements.map((movement) => <MovementCapture key={movement.action} movement={movement} />)}
      </div>

      <section className="mt-6 rounded-xl border border-white/10 p-4">
        <h3 className="text-sm font-black text-white">数据质量与 warning</h3>
        {warnings.length ? <ul className="mt-3 space-y-2">{warnings.map((warning, index) => <li key={`${warning.source}-${warning.code}-${warning.frameIndex ?? index}`} className="text-xs leading-5 text-zinc-300"><span className="font-black text-amber-200">{warning.code}</span> · {warning.source}{warning.frameIndex === undefined ? '' : ` · 帧 ${warning.frameIndex}`}：{warning.message}</li>)}</ul> : <p className="mt-2 text-xs text-zinc-400">保存快照中没有 warning。</p>}
      </section>

      <section className="mt-6 rounded-xl border border-white/10 p-4">
        <h3 className="text-sm font-black text-white">模型与 checkpoint</h3>
        <ul className="mt-3 space-y-3">{models.map((model) => <li key={`${model.role}-${model.id}-${model.checkpointSha256}`} className="text-xs leading-5 text-zinc-300"><span className="font-black text-zinc-100">{model.role}</span> {model.id} / {model.version}<br /><span className="break-all text-zinc-500">{model.checkpointSha256}</span></li>)}</ul>
        <p className="mt-3 text-xs text-zinc-500">采集协议 {snapshot.protocolVersion}</p>
      </section>
    </section>
  );
}

function StaticCapture({ capture }: { capture: PostureStaticCaptureSnapshot }) {
  return <section className="rounded-xl border border-white/10 px-4 py-4"><div className="flex justify-between gap-3"><h3 className="font-black text-white">{viewLabels[capture.view]}静态{capture.visibleSide ? ` · ${capture.visibleSide === 'left' ? '左侧可见' : '右侧可见'}` : ''}</h3><span className="text-xs font-bold text-zinc-400">{captureStatusLabel(capture.status)}</span></div>{capture.quality ? <p className="mt-2 text-xs leading-5 text-zinc-400">完整度 {percent(capture.quality.completeness)} · 关键点可靠性 {percent(capture.quality.landmarkReliability)} · 清晰度 {percent(capture.quality.sharpness)} · 稳定性 {percent(capture.quality.stability)}</p> : <p className="mt-2 text-xs text-zinc-500">无可用质量快照</p>}<MetricList metrics={capture.metrics} /></section>;
}

function MovementCapture({ movement }: { movement: PostureMovementCaptureSnapshot }) {
  return <section className="rounded-xl border border-white/10 px-4 py-4"><div className="flex justify-between gap-3"><h3 className="font-black text-white">{actionLabels[movement.action]}</h3><span className="text-xs font-bold text-zinc-400">{captureStatusLabel(movement.status)}</span></div><p className="mt-2 text-xs leading-5 text-zinc-400">有效帧 {movement.validFrames}/{movement.submittedFrames} · 动作阶段 {movement.phases.status === 'complete' ? '完整' : '不完整'} · 起始/峰值/返回 {formatIndex(movement.phases.startIndex)}/{formatIndex(movement.phases.peakIndex)}/{formatIndex(movement.phases.returnIndex)}</p>{movement.phases.reasons.length ? <p className="mt-1 text-xs text-amber-200">阶段原因：{movement.phases.reasons.join('、')}</p> : null}<MetricList metrics={movement.metrics} /></section>;
}

function MetricList({ metrics }: { metrics: PostureCaptureMetricSnapshot[] }) {
  if (!metrics.length) return <p className="mt-3 text-xs text-zinc-500">没有保存的结构化指标。</p>;
  return <ul className="mt-3 divide-y divide-white/10">{metrics.map((metric) => <li key={metric.metricId} className="py-3"><div className="flex justify-between gap-3"><p className="text-sm font-black text-zinc-100">{metric.label}</p><span className="text-[11px] text-zinc-500">{metric.metricId}</span></div>{metric.status === 'valid' ? <p className="mt-1 text-sm text-zinc-300">{metric.values.map((value) => `${value.label} ${formatValue(value.value, value.unit)}`).join(' · ')}</p> : <p className="mt-1 text-xs text-amber-200">无法判断：{metric.unavailableReasons.join('、') || '未提供原因'}</p>}<p className="mt-1 text-[11px] text-zinc-500">质量 {metric.quality} · 置信度 {metric.confidence === null ? '不可用' : percent(metric.confidence)} · 算法 {metric.analysisVersion}</p></li>)}</ul>;
}

function uniqueModels(snapshot: PostureCaptureSnapshot) {
  const values = [...snapshot.staticCaptures, ...snapshot.movements].flatMap((capture) => [
    capture.model ? { role: '姿态模型', ...capture.model } : null,
    capture.detector ? { role: '人体检测器', ...capture.detector } : null,
  ]).filter((value): value is { role: string; id: string; version: string; checkpointSha256: string } => value !== null);
  return [...new Map(values.map((value) => [`${value.role}|${value.id}|${value.version}|${value.checkpointSha256}`, value])).values()];
}

function validityLabel(value: PostureCaptureSnapshot['validity']) { return value === 'valid' ? '有效' : value === 'partial' ? '部分有效' : '无效'; }
function captureStatusLabel(value: string) { return value === 'valid' ? '有效' : value === 'partial' ? '部分有效' : value === 'incomplete' ? '不完整' : '无法判断'; }
function percent(value: number) { return `${(value * 100).toFixed(0)}%`; }
function formatIndex(value: number | null) { return value === null ? '—' : String(value); }
function formatValue(value: number, unit: string) { return unit === 'deg' || unit === 'degrees' ? `${value.toFixed(1)}°` : `${Number(value.toFixed(3))} ${unit}`; }
