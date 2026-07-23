import { useMemo, useRef, useState } from 'react';
import ResponsiveCameraStage from '../posture/capture/components/ResponsiveCameraStage';
import { useDynamicPostureCapture } from '../posture/capture/hooks/useDynamicPostureCapture';
import type { PostureMovementCaptureSnapshot } from '../../repositories/postureScreeningRepository';
import type { PostureMovementAction, PostureVisibleSide } from '../../types/postureAnalysis';
import { buildMovementCaptureSnapshot } from '../../utils/postureCaptureSnapshot';

interface Props {
  action: PostureMovementAction;
  stepNumber: number;
  onBack: () => void;
  onComplete: (snapshot: PostureMovementCaptureSnapshot) => void;
}

const actionCopy: Record<PostureMovementAction, { title: string; cue: string }> = {
  'bilateral-arm-raise': { title: '双臂上举', cue: '面对镜头，按节奏完成一次双臂上举并回到起始位。' },
  'bodyweight-squat': { title: '徒手深蹲', cue: '面对镜头，按节奏完成一次下蹲并回到站立位。' },
  'neck-retraction': { title: '颈部回缩', cue: '侧对镜头，完成一次缓慢回缩、停留并回到起始位。' },
};

export default function PostureAutomatedMovementStep({ action, stepNumber, onBack, onComplete }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visibleSide, setVisibleSide] = useState<PostureVisibleSide>();
  const capture = useDynamicPostureCapture({ videoRef, action, visibleSide });
  const copy = actionCopy[action];
  const currentCue = useMemo(() => {
    const ratio = capture.config.durationMs ? capture.elapsedMs / capture.config.durationMs : 0;
    return capture.config.paceCues.find((cue) => ratio >= cue.startRatio && ratio < cue.endRatio) ?? capture.config.paceCues.at(-1);
  }, [capture.config, capture.elapsedMs]);
  const cameraActive = capture.stage === 'ready' || capture.stage === 'countdown' || capture.stage === 'capturing';

  const back = () => { capture.reset(); onBack(); };
  return (
    <section className="mt-7" aria-labelledby={`automated-movement-${action}`}>
      <p className="text-xs font-black tracking-[0.12em] text-lime-300">正式采集 {stepNumber}/6</p>
      <h2 id={`automated-movement-${action}`} className="mt-2 text-xl font-black text-white">{copy.title}</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-300">{copy.cue}</p>
      {action === 'neck-retraction' ? <SideSelector value={visibleSide} onChange={setVisibleSide} /> : null}

      <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
        <ResponsiveCameraStage videoRef={videoRef} active={cameraActive} mirrored immersive={cameraActive}>
          {capture.stage === 'countdown' ? <div className="absolute inset-0 grid place-items-center bg-black/60"><p className="text-6xl font-black text-lime-300">{capture.countdownRemaining}</p></div> : null}
          {capture.stage === 'capturing' && currentCue ? <div className="absolute inset-x-3 bottom-3 rounded-xl bg-black/75 p-4 text-center"><p className="font-black text-white">{currentCue.instruction}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-700"><div className="h-full bg-lime-300" style={{ width: `${Math.min(100, capture.elapsedMs / capture.config.durationMs * 100)}%` }} /></div></div> : null}
          {capture.stage === 'ready' ? <button type="button" onClick={capture.startCapture} className="pointer-events-auto absolute inset-x-3 bottom-3 min-h-12 rounded-xl bg-lime-300 px-4 font-black text-zinc-950">开始一次完整动作</button> : null}
        </ResponsiveCameraStage>
        <div className="p-4">
          {capture.stage === 'idle' || capture.stage === 'requesting-camera' ? <button type="button" onClick={() => void capture.startCamera()} disabled={capture.stage === 'requesting-camera' || (action === 'neck-retraction' && !visibleSide)} className="min-h-12 w-full rounded-xl bg-lime-300 px-4 font-black text-zinc-950 disabled:opacity-50">打开摄像头</button> : null}
          {capture.stage === 'captured' || capture.stage === 'submitting' ? <div><p className="text-center text-xs text-zinc-400">采集 {capture.rawFrameCount} 帧，提交 {capture.frames.length} 帧</p><button type="button" onClick={() => void capture.submit()} disabled={capture.stage === 'submitting'} className="mt-3 min-h-12 w-full rounded-xl bg-cyan-300 px-4 font-black text-zinc-950 disabled:opacity-50">提交动作分析</button></div> : null}
          {capture.result ? <div data-testid="formal-movement-result"><p className="text-sm leading-6 text-zinc-200">有效帧 {capture.result.frames.filter(({ status }) => status === 'valid').length}/{capture.result.frames.length}；阶段 {capture.result.analysis.phases.status === 'complete' ? '完整' : '不完整'}；可计算指标 {capture.result.analysis.metrics.filter(({ status }) => status === 'valid').length} 项。</p><button type="button" onClick={() => onComplete(buildMovementCaptureSnapshot(capture.result!))} className="mt-4 min-h-12 w-full rounded-xl bg-lime-300 px-4 font-black text-zinc-950">保存动作快照并继续</button></div> : null}
          {capture.error ? <div role="alert" className="rounded-xl border border-red-300/30 bg-red-300/10 p-3"><p className="text-xs font-black text-red-100">{capture.error.code}</p><p className="mt-1 text-xs text-zinc-300">{capture.error.message}</p><button type="button" onClick={() => capture.frames.length ? void capture.submit() : void capture.startCamera()} className="mt-3 min-h-11 rounded-xl bg-cyan-300 px-3 text-sm font-black text-zinc-950">重试</button></div> : null}
        </div>
      </div>
      <button type="button" onClick={back} className="mt-4 min-h-11 w-full rounded-xl border border-white/15 px-4 text-sm font-bold text-zinc-200">返回上一步</button>
    </section>
  );
}

function SideSelector({ value, onChange }: { value?: PostureVisibleSide; onChange: (side: PostureVisibleSide) => void }) {
  return <div className="mt-4 grid grid-cols-2 gap-2" aria-label="颈部回缩可见侧">{(['left', 'right'] as const).map((side) => <button key={side} type="button" onClick={() => onChange(side)} aria-pressed={value === side} className={`min-h-11 rounded-xl border text-sm font-black ${value === side ? 'border-lime-300 bg-lime-300 text-zinc-950' : 'border-white/15 text-zinc-300'}`}>{side === 'left' ? '左侧可见' : '右侧可见'}</button>)}</div>;
}
