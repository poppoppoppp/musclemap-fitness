import { useEffect, useMemo, useState } from 'react';
import type { PostureInferenceView } from '../../../../types/postureAnalysis';
import type { CaptureCandidate, CaptureLabTelemetry } from '../captureLabTypes';
import { describeQualityReason } from '../quality/qualityCopy';
import { useHighAccuracyKeypoints } from '../hooks/useHighAccuracyKeypoints';
import { compareKeypoints } from '../inference/keypointComparison';
import KeypointComparisonCanvas, { type KeypointOverlayMode } from './KeypointComparisonCanvas';
import StaticMetricResults from './StaticMetricResults';

interface CaptureResultProps {
  candidates: CaptureCandidate[];
  telemetry: CaptureLabTelemetry;
  captureMode: PostureInferenceView;
  inferenceApiUrl?: string;
  onRetake: () => void;
  onExit: () => void;
}

const OVERLAY_MODES: Array<{ id: KeypointOverlayMode; label: string }> = [
  { id: 'original', label: '原图' },
  { id: 'mediapipe', label: 'MediaPipe' },
  { id: 'rtmpose', label: 'RTMPose' },
  { id: 'both', label: '双模型' },
];

export default function CaptureResult({ candidates, telemetry, captureMode, inferenceApiUrl, onRetake, onExit }: CaptureResultProps) {
  const best = candidates[0];
  const [bestUrl, setBestUrl] = useState<string | null>(null);
  const [overlayMode, setOverlayMode] = useState<KeypointOverlayMode>('mediapipe');
  const highAccuracy = useHighAccuracyKeypoints(best, captureMode, inferenceApiUrl);
  useEffect(() => {
    if (!best) return setBestUrl(null);
    const url = URL.createObjectURL(best.blob);
    setBestUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [best]);
  useEffect(() => {
    if (highAccuracy.status === 'success') setOverlayMode('both');
  }, [highAccuracy.status]);

  const camera = useMemo(() => telemetry.cameraSettings, [telemetry.cameraSettings]);
  const comparison = useMemo(() => best && highAccuracy.result ? compareKeypoints({
    mediaPipe: best.landmarks ?? [],
    rtmPose: highAccuracy.result.person.keypoints,
    imageWidth: highAccuracy.result.image.width,
    imageHeight: highAccuracy.result.image.height,
    boundingBox: highAccuracy.result.person.boundingBox,
    view: captureMode,
  }) : null, [best, captureMode, highAccuracy.result]);
  return (
    <div data-testid="capture-result">
      <header>
        <p className="text-xs font-black tracking-[0.12em] text-lime-300">采集实验结果</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.035em] text-zinc-100">最佳候选帧</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">结果只保存在当前页面内存中，不会生成筛查结论或训练方案。</p>
      </header>

      {best && bestUrl ? (
        <div className="relative mt-6 overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950" style={{ aspectRatio: `${best.width} / ${best.height}` }}>
          <img src={bestUrl} alt="本次采集选出的最佳候选帧" className="h-full w-full object-contain" data-testid="capture-best-frame-image" />
          <KeypointComparisonCanvas
            mediaPipe={best.landmarks ?? []}
            rtmPose={highAccuracy.result?.person.keypoints ?? []}
            boundingBox={highAccuracy.result?.person.boundingBox}
            imageWidth={best.width}
            imageHeight={best.height}
            mode={highAccuracy.result ? overlayMode : 'mediapipe'}
          />
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-5 text-sm leading-6 text-amber-100">采集结束，但没有候选帧通过硬性内存与质量限制。请重拍。</div>
      )}

      {best && (
        <section className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <h2 className="text-base font-black text-zinc-100">最佳帧质量项</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4">
            <Metric label="关键点完整度" value={formatPercent(best.quality.completeness)} />
            <Metric label="关键点可靠性" value={formatPercent(best.quality.landmarkReliability)} />
            <Metric label="清晰度评分" value={formatPercent(best.quality.sharpness)} />
            <Metric label="稳定性评分" value={formatPercent(best.quality.stability)} />
          </dl>
          <div className="mt-4 border-t border-zinc-800 pt-4">
            <p className="text-xs text-zinc-500">未通过的拍摄规则</p>
            <p className="mt-1 text-sm leading-6 text-zinc-300">{best.quality.failedRules.length ? best.quality.failedRules.map(describeQualityReason).join('；') : '无'}</p>
          </div>
        </section>
      )}

      {best && (
        <section className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-4">
          <p className="text-xs font-black tracking-[0.1em] text-cyan-300">RTMPOSE BODY26 技术对比</p>
          <h2 className="mt-2 text-lg font-black text-zinc-100">高精度关键点分析</h2>
          <p className="mt-2 text-xs leading-5 text-zinc-400">仅比较两个模型的关键点输出，不是医学准确率，不生成体态结论或训练建议。</p>

          {highAccuracy.status === 'success' && highAccuracy.result ? (
            <div className="mt-4" data-testid="posture-inference-success">
              <div className="grid grid-cols-4 gap-2" aria-label="关键点叠加模式">
                {OVERLAY_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setOverlayMode(mode.id)}
                    aria-pressed={overlayMode === mode.id}
                    className={`min-h-11 rounded-xl border px-2 text-xs font-black ${overlayMode === mode.id ? 'border-cyan-300 bg-cyan-300 text-zinc-950' : 'border-zinc-700 bg-zinc-950 text-zinc-300'}`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-400">
                <span><span className="text-lime-300">●</span> MediaPipe 33</span>
                <span><span className="text-cyan-300">●</span> RTMPose HALPE26</span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-4">
                <Metric label="姿态模型" value={highAccuracy.result.model.id} />
                <Metric label="人体检测器" value={highAccuracy.result.detector.id} />
                <Metric label="设备" value={`${highAccuracy.result.runtime.device.toUpperCase()} / ${highAccuracy.result.runtime.deviceName}`} />
                <Metric label="总耗时" value={`${highAccuracy.result.timingMs.total.toFixed(1)} ms`} />
                <Metric label="检测 / 姿态" value={`${highAccuracy.result.timingMs.detection.toFixed(1)} / ${highAccuracy.result.timingMs.pose.toFixed(1)} ms`} />
                <Metric label="人体框置信度" value={formatPercent(highAccuracy.result.person.boundingBox.score)} />
                <Metric label="公共可比较点" value={`${comparison?.comparablePointCount ?? 0} / ${comparison?.points.length ?? 17}`} />
                <Metric label="差异归一化" value={describeNormalization(comparison?.normalization.basis)} />
                <Metric label="差异中位数" value={formatDifference(comparison?.medianNormalizedDistance)} />
                <Metric label="差异 P95" value={formatDifference(comparison?.p95NormalizedDistance)} />
              </dl>
              <div className="mt-4 border-t border-zinc-800 pt-4">
                <p className="text-xs text-zinc-500">RTMPose 低置信度点（阈值 0.30）</p>
                <p className="mt-1 text-sm leading-6 text-zinc-300">
                  {comparison?.lowConfidenceRtmPose.length
                    ? comparison.lowConfidenceRtmPose.map((point) => `${point.name} ${point.score.toFixed(2)}`).join('、')
                    : '无'}
                </p>
              </div>
              <StaticMetricResults keypointResult={highAccuracy.result} view={captureMode} baseUrl={inferenceApiUrl} />
            </div>
          ) : highAccuracy.status === 'error' && highAccuracy.error ? (
            <div className="mt-4 rounded-xl border border-red-300/30 bg-red-300/10 p-4" role="alert" data-testid="posture-inference-error">
              <p className="text-xs font-black text-red-200">{highAccuracy.error.code}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-200">{highAccuracy.error.message}</p>
              <p className="mt-2 text-xs leading-5 text-zinc-400">高精度分析失败时不会把 MediaPipe 结果冒充后端结果。</p>
              <button type="button" onClick={() => void highAccuracy.submit()} className="mt-4 min-h-11 rounded-xl bg-cyan-300 px-4 text-sm font-black text-zinc-950">重试同一最佳帧</button>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void highAccuracy.submit()}
            disabled={highAccuracy.status === 'loading'}
            className="mt-4 min-h-12 w-full rounded-xl bg-cyan-300 px-4 font-black text-zinc-950 disabled:cursor-wait disabled:opacity-60"
          >
            提交高精度关键点分析
          </button>
          {highAccuracy.status === 'loading' && (
            <p className="mt-3 text-center text-xs text-cyan-100" role="status" data-testid="posture-inference-loading">正在运行 RTMDet 与 RTMPose，请保持当前最佳帧页面打开…</p>
          )}
        </section>
      )}

      <section className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
        <h2 className="text-base font-black text-zinc-100">本次运行技术数据</h2>
        <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4">
          <Metric label="模型" value={telemetry.model === 'full' ? 'Full' : 'Lite'} />
          <Metric label="运行方式" value={telemetry.runtimeMode === 'worker' ? 'Web Worker' : '主线程受限模式'} />
          <Metric label="模型加载" value={`${Math.round(telemetry.modelLoadDurationMs)} ms`} />
          <Metric label="实际推理 FPS" value={telemetry.processedFps.toFixed(1)} />
          <Metric label="平均推理延迟" value={`${telemetry.averageInferenceMs.toFixed(1)} ms`} />
          <Metric label="P95 推理延迟" value={`${telemetry.p95InferenceMs.toFixed(1)} ms`} />
          <Metric label="处理帧" value={String(telemetry.processedFrames)} />
          <Metric label="丢弃帧" value={String(telemetry.droppedFrames)} />
          <Metric label="候选帧" value={String(telemetry.candidateCount)} />
          <Metric label="候选内存" value={formatBytes(telemetry.candidateBytes)} />
          <Metric label="摄像头" value={camera?.width && camera?.height ? `${camera.width} x ${camera.height}` : '浏览器未提供'} />
          <Metric label="视口" value={telemetry.viewport} />
        </dl>
        <div className="mt-5 border-t border-zinc-800 pt-4 text-xs leading-5 text-zinc-500">
          <p className="break-words">平台：{telemetry.platform}</p>
          <p className="mt-2 break-words">浏览器：{telemetry.userAgent}</p>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button type="button" onClick={onRetake} className="min-h-12 rounded-xl border border-zinc-700 bg-zinc-900 px-4 font-black text-zinc-100 active:translate-y-px">重新拍摄</button>
        <button type="button" onClick={onExit} className="min-h-12 rounded-xl bg-lime-300 px-4 font-black text-zinc-950 active:translate-y-px">返回体态改善</button>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-l border-zinc-800 pl-3">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-black tabular-nums text-zinc-100">{value}</dd>
    </div>
  );
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KiB` : `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
}

function formatDifference(value: number | null | undefined) {
  return value === null || value === undefined ? '不可用' : `${(value * 100).toFixed(1)}%`;
}

function describeNormalization(value: 'shoulder-width' | 'torso-length' | 'bounding-box-diagonal' | undefined) {
  if (value === 'shoulder-width') return '肩宽';
  if (value === 'torso-length') return '躯干长度';
  if (value === 'bounding-box-diagonal') return '人体框对角线';
  return '不可用';
}
