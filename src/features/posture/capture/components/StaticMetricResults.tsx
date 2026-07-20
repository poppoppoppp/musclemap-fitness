import { useState } from 'react';
import type { PostureInferenceView, PostureKeypointResponse, PostureMetricResult, PostureVisibleSide } from '../../../../types/postureAnalysis';
import { useStaticPostureAnalysis } from '../hooks/useStaticPostureAnalysis';

interface StaticMetricResultsProps {
  keypointResult: PostureKeypointResponse;
  view: PostureInferenceView;
  baseUrl?: string;
}

export default function StaticMetricResults({ keypointResult, view, baseUrl }: StaticMetricResultsProps) {
  const [visibleSide, setVisibleSide] = useState<PostureVisibleSide>();
  const analysis = useStaticPostureAnalysis(keypointResult, view, visibleSide, baseUrl);
  return (
    <section className="mt-5 border-t border-cyan-300/15 pt-5" aria-labelledby="static-metric-title">
      <p className="text-xs font-black tracking-[0.1em] text-violet-300">批次二 · 非医学测量</p>
      <h3 id="static-metric-title" className="mt-2 text-lg font-black text-zinc-100">静态测量指标</h3>
      <p className="mt-2 text-xs leading-5 text-zinc-400">只展示公式与关键点的几何数值，不设置正常范围，也不输出体态结论。</p>

      {view === 'side' && (
        <div className="mt-4">
          <p className="text-xs text-zinc-400">请选择画面中实际可见的同一侧链；系统不会自动猜测或左右混拼。</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(['left', 'right'] as const).map((side) => (
              <button
                key={side}
                type="button"
                aria-pressed={visibleSide === side}
                onClick={() => setVisibleSide(side)}
                className={`min-h-11 rounded-xl border px-3 text-sm font-black ${visibleSide === side ? 'border-violet-300 bg-violet-300 text-zinc-950' : 'border-zinc-700 bg-zinc-950 text-zinc-300'}`}
              >
                {side === 'left' ? '左侧可见' : '右侧可见'}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => void analysis.submit()}
        disabled={analysis.status === 'loading' || (view === 'side' && !visibleSide)}
        className="mt-4 min-h-12 w-full rounded-xl bg-violet-300 px-4 font-black text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
      >
        计算透明静态指标
      </button>

      {analysis.status === 'loading' && <p className="mt-3 text-center text-xs text-violet-100" role="status">正在根据现有 RTMPose 关键点计算，不会重复运行模型…</p>}
      {analysis.status === 'error' && analysis.error && (
        <div className="mt-4 rounded-xl border border-red-300/30 bg-red-300/10 p-4" role="alert">
          <p className="text-xs font-black text-red-200">{analysis.error.code}</p>
          <p className="mt-2 text-sm text-zinc-200">{analysis.error.message}</p>
        </div>
      )}
      {analysis.status === 'success' && analysis.result && (
        <div className="mt-5" data-testid="posture-static-analysis-success">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
            <span>{analysis.result.analysisVersion}</span>
            <span>RTMPose {keypointResult.model.version}</span>
            <span>{describeBasis(analysis.result.normalization.basis)}</span>
          </div>
          <div className="mt-4 grid gap-3">
            {analysis.result.metrics.map((metric) => <MetricCard key={metric.id} metric={metric} />)}
          </div>
        </div>
      )}
    </section>
  );
}

function MetricCard({ metric }: { metric: PostureMetricResult }) {
  return (
    <article className={`rounded-xl border p-4 ${metric.status === 'valid' ? 'border-violet-300/20 bg-violet-300/[0.05]' : 'border-zinc-800 bg-zinc-950'}`}>
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-black text-zinc-100">{metric.label}</h4>
        <span className={`shrink-0 text-[10px] font-black ${metric.status === 'valid' ? 'text-lime-300' : 'text-amber-200'}`}>{metric.status === 'valid' ? '有效' : '不可计算'}</span>
      </div>
      {metric.status === 'valid' ? (
        <div className="mt-3 flex flex-wrap gap-3">
          {metric.values.map((value) => (
            <span key={value.label} className="text-sm font-black tabular-nums text-violet-100">{formatMetricValue(value.value, value.unit)}</span>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs leading-5 text-amber-100">{metric.unavailableReasons.map(describeUnavailableReason).join('；')}</p>
      )}
      <p className="mt-3 break-words font-mono text-[10px] leading-4 text-zinc-500">{metric.formula}</p>
      <p className="mt-2 text-[10px] text-zinc-500">关键点：{metric.keypoints.join('、') || '无'} · {metric.confidence === null ? '无可用置信度' : `最低输入置信度 ${metric.confidence.toFixed(2)}`}</p>
    </article>
  );
}

function formatMetricValue(value: number, unit: string) {
  if (unit === 'degrees') return `${value.toFixed(2)}°`;
  if (unit.startsWith('percent-')) return `${value.toFixed(2)}%`;
  return `${value.toFixed(2)} ${unit}`;
}

function describeUnavailableReason(reason: string) {
  if (reason.startsWith('VIEW_NOT_SUPPORTED')) return '当前视角不支持';
  if (reason === 'VISIBLE_SIDE_REQUIRED') return '必须选择同一可见侧';
  if (reason.startsWith('MISSING_KEYPOINT')) return `缺少关键点 ${reason.split(':')[1]}`;
  if (reason.startsWith('LOW_CONFIDENCE_KEYPOINT')) return `关键点置信度不足 ${reason.split(':')[1]}`;
  if (reason === 'DEGENERATE_GEOMETRY') return '参考长度为零，无法归一化';
  return reason;
}

function describeBasis(basis: string) {
  if (basis === 'shoulder-width') return '按肩宽归一化';
  if (basis === 'torso-length') return '按同侧躯干长度归一化';
  return '按人体框对角线归一化';
}
