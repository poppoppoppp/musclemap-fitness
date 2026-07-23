import { useEffect, useRef, useState } from 'react';
import CaptureViewport from '../posture/capture/components/CaptureViewport';
import type { CaptureCandidate, CaptureLabMode } from '../posture/capture/captureLabTypes';
import { useHighAccuracyKeypoints } from '../posture/capture/hooks/useHighAccuracyKeypoints';
import { usePostureCaptureLab } from '../posture/capture/hooks/usePostureCaptureLab';
import { useStaticPostureAnalysis } from '../posture/capture/hooks/useStaticPostureAnalysis';
import type { PostureStaticCaptureSnapshot } from '../../repositories/postureScreeningRepository';
import type { PostureInferenceView, PostureKeypointResponse, PostureVisibleSide } from '../../types/postureAnalysis';
import { buildStaticCaptureSnapshot } from '../../utils/postureCaptureSnapshot';

interface Props {
  view: PostureInferenceView;
  stepNumber: number;
  onBack: () => void;
  onComplete: (snapshot: PostureStaticCaptureSnapshot) => void;
  onSkipAll?: () => void;
}

const viewCopy: Record<PostureInferenceView, { title: string; cue: string }> = {
  front: { title: '正面静态采集', cue: '正对镜头自然站立，保持全身入镜。' },
  side: { title: '侧面静态采集', cue: '身体侧对镜头，选择镜头实际看到的一侧。' },
  back: { title: '背面静态采集', cue: '背对镜头自然站立，确认全身轮廓清晰。' },
};

export default function PostureAutomatedStaticStep({ view, stepNumber, onBack, onComplete, onSkipAll }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visibleSide, setVisibleSide] = useState<PostureVisibleSide>();
  const lab = usePostureCaptureLab({ videoRef });

  useEffect(() => { lab.changeMode(view as CaptureLabMode); }, [view]);

  const leave = () => { lab.exit(); onBack(); };
  const copy = viewCopy[view];
  const best = lab.candidates[0];

  return (
    <section className="mt-7" aria-labelledby={`automated-static-${view}`}>
      <p className="text-xs font-black tracking-[0.12em] text-lime-300">正式采集 {stepNumber}/6</p>
      <h2 id={`automated-static-${view}`} className="mt-2 text-xl font-black text-white">{copy.title}</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-300">{copy.cue}</p>

      {view === 'side' ? <SideSelector value={visibleSide} onChange={setVisibleSide} /> : null}

      {lab.stage === 'result' ? (
        best ? <StaticAnalysis candidate={best} view={view} visibleSide={visibleSide} onComplete={onComplete} onRetake={lab.retake} />
          : <p role="alert" className="mt-5 rounded-xl border border-amber-300/30 p-4 text-sm text-amber-100">没有候选帧通过采集质量限制，请重新采集。</p>
      ) : lab.stage === 'error' && lab.error ? (
        <div role="alert" className="mt-5 rounded-xl border border-red-300/30 bg-red-300/10 p-4">
          <p className="font-black text-red-100">{lab.error.title}</p><p className="mt-2 text-sm text-zinc-300">{lab.error.message}</p>
          {lab.error.recoverable ? <button type="button" onClick={() => void lab.start('full')} className="mt-4 min-h-11 rounded-xl bg-lime-300 px-4 font-black text-zinc-950">重试</button> : null}
        </div>
      ) : lab.stage === 'idle' ? (
        <button type="button" onClick={() => void lab.start('full')} disabled={view === 'side' && !visibleSide} className="mt-5 min-h-12 w-full rounded-xl bg-lime-300 px-4 font-black text-zinc-950 disabled:opacity-50">打开摄像头并开始本视角采集</button>
      ) : (
        <div className="mt-5">
          <CaptureViewport videoRef={videoRef} mode={view as CaptureLabMode} landmarks={lab.landmarks} quality={lab.quality} sequence={lab.sequence} clockMs={lab.clockMs} active={lab.stage === 'live'} stanceCalibration={lab.stanceCalibration} />
          {lab.stage !== 'live' ? <p role="status" className="mt-3 text-center text-xs text-zinc-400">正在准备本地采集模型与摄像头…</p> : null}
        </div>
      )}

      <button type="button" onClick={leave} className="mt-4 min-h-11 w-full rounded-xl border border-white/15 px-4 text-sm font-bold text-zinc-200">返回上一步</button>
      {onSkipAll ? <button type="button" onClick={() => { lab.exit(); onSkipAll(); }} className="mt-3 min-h-11 w-full rounded-xl border border-zinc-700 px-4 text-xs font-bold text-zinc-400">当前设备无法采集，暂不进行自动采集</button> : null}
    </section>
  );
}

function StaticAnalysis({ candidate, view, visibleSide, onComplete, onRetake }: {
  candidate: CaptureCandidate;
  view: PostureInferenceView;
  visibleSide?: PostureVisibleSide;
  onComplete: (snapshot: PostureStaticCaptureSnapshot) => void;
  onRetake: () => void;
}) {
  const highAccuracy = useHighAccuracyKeypoints(candidate, view);
  return (
    <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.05] p-4">
      <h3 className="font-black text-white">高精度关键点与静态指标</h3>
      <p className="mt-2 text-xs leading-5 text-zinc-400">候选图像仅在当前页面内存中用于分析，正式记录不保存图像或关键点。</p>
      {highAccuracy.result ? <StaticMetricSubmission keypointResult={highAccuracy.result} view={view} visibleSide={visibleSide} quality={candidate.quality} onComplete={onComplete} /> : (
        <button type="button" onClick={() => void highAccuracy.submit()} disabled={highAccuracy.status === 'loading'} className="mt-4 min-h-12 w-full rounded-xl bg-cyan-300 px-4 font-black text-zinc-950 disabled:opacity-50">提交 RTMDet + RTMPose 分析</button>
      )}
      {highAccuracy.status === 'loading' ? <p role="status" className="mt-3 text-xs text-cyan-100">正在分析最佳候选帧…</p> : null}
      {highAccuracy.error ? <p role="alert" className="mt-3 text-xs leading-5 text-red-200">{highAccuracy.error.code}：{highAccuracy.error.message}</p> : null}
      <button type="button" onClick={onRetake} className="mt-3 min-h-11 w-full rounded-xl border border-white/15 text-sm font-bold text-zinc-300">重新采集本视角</button>
    </div>
  );
}

function StaticMetricSubmission({ keypointResult, view, visibleSide, quality, onComplete }: {
  keypointResult: PostureKeypointResponse;
  view: PostureInferenceView;
  visibleSide?: PostureVisibleSide;
  quality: CaptureCandidate['quality'];
  onComplete: (snapshot: PostureStaticCaptureSnapshot) => void;
}) {
  const analysis = useStaticPostureAnalysis(keypointResult, view, visibleSide);
  return analysis.result ? (
    <div className="mt-4">
      <p className="text-sm text-zinc-200">已生成 {analysis.result.metrics.length} 项结构化指标，其中 {analysis.result.metrics.filter(({ status }) => status === 'valid').length} 项可计算。</p>
      <button type="button" onClick={() => onComplete(buildStaticCaptureSnapshot(keypointResult, analysis.result!, quality))} className="mt-4 min-h-12 w-full rounded-xl bg-lime-300 px-4 font-black text-zinc-950">保存本视角快照并继续</button>
    </div>
  ) : (
    <div className="mt-4">
      <button type="button" onClick={() => void analysis.submit()} disabled={analysis.status === 'loading' || (view === 'side' && !visibleSide)} className="min-h-12 w-full rounded-xl bg-cyan-300 px-4 font-black text-zinc-950 disabled:opacity-50">计算本视角静态指标</button>
      {analysis.status === 'loading' ? <p role="status" className="mt-3 text-xs text-cyan-100">正在计算静态指标…</p> : null}
      {analysis.error ? <p role="alert" className="mt-3 text-xs leading-5 text-red-200">{analysis.error.code}：{analysis.error.message}</p> : null}
    </div>
  );
}

function SideSelector({ value, onChange }: { value?: PostureVisibleSide; onChange: (side: PostureVisibleSide) => void }) {
  return <div className="mt-4 grid grid-cols-2 gap-2" aria-label="侧面可见侧">{(['left', 'right'] as const).map((side) => <button key={side} type="button" onClick={() => onChange(side)} aria-pressed={value === side} className={`min-h-11 rounded-xl border text-sm font-black ${value === side ? 'border-lime-300 bg-lime-300 text-zinc-950' : 'border-white/15 text-zinc-300'}`}>{side === 'left' ? '左侧可见' : '右侧可见'}</button>)}</div>;
}
