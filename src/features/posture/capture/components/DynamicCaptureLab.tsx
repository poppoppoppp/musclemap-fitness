import { useMemo, useRef, useState } from 'react';
import type { PostureMovementAction, PostureVisibleSide } from '../../../../types/postureAnalysis';
import { DYNAMIC_MOVEMENT_CONFIGS } from '../analysis/analysisConfig';
import { useDynamicPostureCapture } from '../hooks/useDynamicPostureCapture';
import DynamicAnalysisResult from './DynamicAnalysisResult';
import ResponsiveCameraStage from './ResponsiveCameraStage';

interface DynamicCaptureLabProps {
  inferenceApiUrl?: string;
  onBack: () => void;
}

export default function DynamicCaptureLab({ inferenceApiUrl, onBack }: DynamicCaptureLabProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [action, setAction] = useState<PostureMovementAction>('bilateral-arm-raise');
  const [visibleSide, setVisibleSide] = useState<PostureVisibleSide>();
  const capture = useDynamicPostureCapture({ videoRef, action, visibleSide, baseUrl: inferenceApiUrl });
  const currentCue = useMemo(() => {
    const ratio = capture.config.durationMs ? capture.elapsedMs / capture.config.durationMs : 0;
    return capture.config.paceCues.find((cue) => ratio >= cue.startRatio && ratio < cue.endRatio) ?? capture.config.paceCues.at(-1);
  }, [capture.config, capture.elapsedMs]);
  const chooseAction = (next: PostureMovementAction) => {
    setAction(next);
    setVisibleSide(undefined);
  };
  const back = () => {
    capture.reset();
    onBack();
  };
  const cameraImmersive = capture.stage === 'ready' || capture.stage === 'countdown' || capture.stage === 'capturing';
  return (
    <div>
      <button type="button" onClick={back} className="mb-5 min-h-11 text-sm font-bold text-zinc-300">← 返回静态拍摄</button>
      <header>
        <p className="text-xs font-black tracking-[0.12em] text-lime-300">动态动作实验</p>
        <h1 className="mt-2 text-3xl font-black text-zinc-100">一次缓慢、完整重复</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">浏览器约 15 FPS 保留临时帧，再按真实时间戳均匀选择 5 FPS、最多 40 帧送入 RTMPose。失败帧也计入上限。</p>
      </header>

      <div className="mt-5 grid gap-2 sm:grid-cols-3" aria-label="动态动作选择">
        {(Object.values(DYNAMIC_MOVEMENT_CONFIGS)).map((item) => (
          <button key={item.id} type="button" onClick={() => chooseAction(item.id)} aria-pressed={action === item.id} className={`rounded-xl border p-3 text-left ${action === item.id ? 'border-lime-300 bg-lime-300 text-zinc-950' : 'border-zinc-800 bg-zinc-950 text-zinc-200'}`}>
            <span className="block text-sm font-black">{item.label}</span><span className={`mt-1 block text-[10px] leading-4 ${action === item.id ? 'text-zinc-800' : 'text-zinc-500'}`}>{item.help}</span>
          </button>
        ))}
      </div>

      {action === 'neck-retraction' && (
        <section className="mt-4 rounded-xl border border-violet-300/20 bg-violet-300/[0.05] p-4">
          <p className="text-xs text-zinc-300">侧面动作必须指定实际可见侧，所有帧只使用该侧耳、肩和髋。</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(['left', 'right'] as const).map((side) => <button key={side} type="button" onClick={() => setVisibleSide(side)} aria-pressed={visibleSide === side} className={`min-h-11 rounded-xl border text-sm font-black ${visibleSide === side ? 'border-violet-300 bg-violet-300 text-zinc-950' : 'border-zinc-700 text-zinc-300'}`}>{side === 'left' ? '左侧可见' : '右侧可见'}</button>)}
          </div>
        </section>
      )}

      <section className="mt-5 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
        <ResponsiveCameraStage videoRef={videoRef} active={cameraImmersive} mirrored immersive={cameraImmersive}>
          <div className="pointer-events-none absolute inset-0" data-testid="dynamic-camera-stage">
            {cameraImmersive && (
              <div className="pointer-events-auto absolute inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-20 flex items-center justify-between gap-3" data-testid="dynamic-floating-controls">
                <button type="button" onClick={back} className="min-h-10 rounded-xl bg-zinc-950/85 px-3 text-xs font-black text-zinc-100 backdrop-blur-md">返回</button>
                <div className="rounded-xl bg-zinc-950/85 px-3 py-2 text-xs font-black text-lime-200 backdrop-blur-md">{capture.config.label}</div>
              </div>
            )}
          {capture.stage === 'countdown' && <div className="absolute inset-0 grid place-items-center bg-black/60"><div className="text-center"><p className="text-sm font-black text-zinc-100">准备倒计时</p><p className="mt-2 text-6xl font-black text-lime-300">{capture.countdownRemaining}</p></div></div>}
          {capture.stage === 'capturing' && currentCue && <div className="absolute inset-x-3 bottom-3 rounded-xl bg-black/75 p-4 text-center"><p className="text-xs font-black text-lime-300">{currentCue.label}</p><p className="mt-1 text-base font-black text-white">{currentCue.instruction}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-700"><div className="h-full bg-lime-300" style={{ width: `${Math.min(100, capture.elapsedMs / capture.config.durationMs * 100)}%` }} /></div></div>}
            {capture.stage === 'ready' && (
              <button type="button" onClick={capture.startCapture} className="pointer-events-auto absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] min-h-12 rounded-xl bg-lime-300 px-4 font-black text-zinc-950">开始一次完整动作</button>
            )}
          </div>
        </ResponsiveCameraStage>
        <div className="p-4">
          {capture.stage === 'idle' || capture.stage === 'requesting-camera' || capture.stage === 'error' ? (
            <button type="button" onClick={() => void capture.startCamera()} disabled={capture.stage === 'requesting-camera' || (action === 'neck-retraction' && !visibleSide)} className="min-h-12 w-full rounded-xl bg-lime-300 px-4 font-black text-zinc-950 disabled:opacity-50">打开动态实验摄像头</button>
          ) : capture.stage === 'ready' ? (
            null
          ) : capture.stage === 'captured' || capture.stage === 'submitting' ? (
            <div>
              <p className="text-center text-xs text-zinc-400">浏览器采集 {capture.rawFrameCount} 帧 · 送入 RTMPose {capture.frames.length} 帧</p>
              <button type="button" onClick={() => void capture.submit()} disabled={capture.stage === 'submitting'} className="mt-3 min-h-12 w-full rounded-xl bg-cyan-300 px-4 font-black text-zinc-950 disabled:opacity-50">提交动态 RTMPose 分析</button>
              {capture.stage === 'submitting' && <p className="mt-2 text-center text-xs text-cyan-100" role="status">正在逐帧运行 RTMDet 与 RTMPose；每帧只尝试一次…</p>}
            </div>
          ) : null}
          {capture.error && <div className="mt-3 rounded-xl border border-red-300/30 bg-red-300/10 p-3" role="alert"><p className="text-xs font-black text-red-200">{capture.error.code}</p><p className="mt-1 text-xs text-zinc-300">{capture.error.message}</p>{capture.frames.length > 0 && <button type="button" onClick={() => void capture.submit()} className="mt-3 min-h-11 rounded-xl bg-cyan-300 px-3 text-sm font-black text-zinc-950">重试同一组帧</button>}</div>}
        </div>
      </section>

      {capture.result && <DynamicAnalysisResult result={capture.result} capturedFrames={capture.frames} />}
    </div>
  );
}
