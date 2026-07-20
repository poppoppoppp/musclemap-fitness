import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CaptureQualityPanel from '../features/posture/capture/components/CaptureQualityPanel';
import CaptureResult from '../features/posture/capture/components/CaptureResult';
import CaptureViewport from '../features/posture/capture/components/CaptureViewport';
import DynamicCaptureLab from '../features/posture/capture/components/DynamicCaptureLab';
import type { CaptureLabMode } from '../features/posture/capture/captureLabTypes';
import { usePostureCaptureLab } from '../features/posture/capture/hooks/usePostureCaptureLab';

const MODES: Array<{ id: CaptureLabMode; label: string; help: string }> = [
  { id: 'front', label: '正面', help: '正对镜头，自然站立' },
  { id: 'back', label: '背面', help: '由你确认背对镜头' },
  { id: 'side', label: '侧面', help: '身体侧向镜头' },
];

export default function PostureCaptureLabPage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [confirmLite, setConfirmLite] = useState(false);
  const [experiment, setExperiment] = useState<'static' | 'dynamic'>('static');
  const lab = usePostureCaptureLab({ videoRef });

  const leave = () => {
    lab.exit();
    navigate('/growth/posture', { replace: true });
  };

  if (experiment === 'dynamic') {
    return <PageShell><DynamicCaptureLab onBack={() => setExperiment('static')} /></PageShell>;
  }

  if (lab.stage === 'result' && lab.telemetry) {
    return (
      <PageShell>
        <CaptureResult candidates={lab.candidates} telemetry={lab.telemetry} captureMode={lab.mode} onRetake={lab.retake} onExit={leave} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <button type="button" onClick={leave} className="mb-5 inline-flex min-h-11 items-center rounded-xl px-1 text-sm font-bold text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300">← 返回体态改善</button>

      <header className="max-w-xl">
        <p className="text-xs font-black tracking-[0.12em] text-lime-300">拍摄实验室</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.035em] text-zinc-100">实时体态拍摄引导</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">官方 MediaPipe 在本机处理画面，只检查拍摄条件，不生成体态结论。</p>
      </header>

      {lab.stage === 'idle' ? (
        <Intro mode={lab.mode} onModeChange={lab.changeMode} onStart={() => lab.start('full')} onDynamic={() => setExperiment('dynamic')} />
      ) : lab.stage === 'error' && lab.error ? (
        <ErrorState error={lab.error} onRetry={() => lab.start(lab.model)} onExit={leave} />
      ) : (
        <div className="mt-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-zinc-500">当前运行</p>
              <p className="mt-1 text-sm font-black text-zinc-100">{lab.model === 'full' ? 'Full 模型' : 'Lite 模型'} / Web Worker</p>
            </div>
            {lab.model === 'full' && lab.stage === 'live' && (
              <button
                type="button"
                onClick={() => setConfirmLite(true)}
                className="min-h-11 shrink-0 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-xs font-black text-zinc-200 active:translate-y-px"
              >
                使用 Lite
              </button>
            )}
          </div>

          {lab.stage === 'live' && <ModeSelector mode={lab.mode} onChange={lab.changeMode} />}
          {lab.performanceWarning && lab.model === 'full' && (
            <div className="mb-4 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100" role="status">
              Full 模型的持续推理帧率低于实验下限。你可以继续，也可以主动切换 Lite。系统不会自动降级。
            </div>
          )}

          <CaptureViewport
            videoRef={videoRef}
            mode={lab.mode}
            landmarks={lab.landmarks}
            quality={lab.quality}
            sequence={lab.sequence}
            clockMs={lab.clockMs}
            active={lab.stage === 'live'}
            stanceCalibration={lab.stanceCalibration}
          />

          {lab.stage !== 'live' && (
            <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-4" role="status" data-testid="capture-loading-state">
              <p className="text-sm font-black text-zinc-100">{stageTitle(lab.stage)}</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">加载完成前不会显示骨架或模拟扫描。</p>
            </div>
          )}
          <CaptureQualityPanel quality={lab.quality} />
          {lab.stage === 'live' && lab.liveRuntime && <LiveRuntime runtime={lab.liveRuntime} />}
          {confirmLite && (
            <LiteConfirmation
              onCancel={() => setConfirmLite(false)}
              onConfirm={() => {
                setConfirmLite(false);
                void lab.switchToLite();
              }}
            />
          )}
        </div>
      )}
    </PageShell>
  );
}

function LiteConfirmation({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/70 p-4 sm:place-items-center" role="presentation">
      <section className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-950 p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="lite-confirm-title">
        <p className="text-xs font-black tracking-[0.12em] text-lime-300">运行模式切换</p>
        <h2 id="lite-confirm-title" className="mt-2 text-xl font-black text-zinc-100">改用 Lite 模型？</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">当前采集会结束，Full 模型将先被销毁，再加载 Lite。系统不会同时保留两个模型。</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} className="min-h-12 rounded-xl border border-zinc-700 bg-zinc-900 px-4 font-black text-zinc-100">继续使用 Full</button>
          <button type="button" onClick={onConfirm} className="min-h-12 rounded-xl bg-lime-300 px-4 font-black text-zinc-950">确认切换 Lite</button>
        </div>
      </section>
    </div>
  );
}

function LiveRuntime({ runtime }: { runtime: NonNullable<ReturnType<typeof usePostureCaptureLab>['liveRuntime']> }) {
  return (
    <section className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-4" aria-label="实时技术数据">
      <div className="grid grid-cols-3 gap-3 text-xs">
        <Info label="模型加载" value={`${Math.round(runtime.modelLoadDurationMs)} ms`} />
        <Info label="实际推理" value={`${runtime.processedFps.toFixed(1)} FPS`} />
        <Info label="平均 / P95" value={`${runtime.averageInferenceMs.toFixed(0)} / ${runtime.p95InferenceMs.toFixed(0)} ms`} />
      </div>
      <p className="mt-3 text-[11px] text-zinc-500">已处理 {runtime.processedFrames} 帧 · 背压丢弃 {runtime.droppedFrames} 帧</p>
    </section>
  );
}

function Intro({ mode, onModeChange, onStart, onDynamic }: { mode: CaptureLabMode; onModeChange: (mode: CaptureLabMode) => void; onStart: () => void; onDynamic: () => void }) {
  return (
    <div className="mt-7">
      <ModeSelector mode={mode} onChange={onModeChange} />
      <section className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
        <h2 className="text-lg font-black text-zinc-100">开始前确认</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Info label="空间" value="镜头前留出完整站立距离" />
          <Info label="光线" value="避免背光，照亮全身轮廓" />
          <Info label="设备" value="固定手机或电脑，不要手持" />
          <Info label="隐私" value="候选帧仅保存在当前页面内存" />
        </div>
      </section>
      <button type="button" onClick={onStart} className="mt-5 min-h-14 w-full rounded-xl bg-lime-300 px-5 text-base font-black text-zinc-950 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-100" data-testid="start-capture-lab">
        加载 Full 模型并打开摄像头
      </button>
      <button type="button" onClick={onDynamic} className="mt-3 min-h-12 w-full rounded-xl border border-cyan-300/30 bg-cyan-300/[0.06] px-5 font-black text-cyan-100">进入动态动作实验</button>
      <p className="mt-3 text-center text-xs leading-5 text-zinc-600">需要 HTTPS 或 localhost，以及摄像头权限。</p>
    </div>
  );
}

function ModeSelector({ mode, onChange }: { mode: CaptureLabMode; onChange: (mode: CaptureLabMode) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2" aria-label="拍摄模式">
      {MODES.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          aria-pressed={mode === item.id}
          className={`min-h-[4.25rem] rounded-xl border px-2 py-2 text-left active:translate-y-px ${mode === item.id ? 'border-lime-300 bg-lime-300 text-zinc-950' : 'border-zinc-800 bg-zinc-950 text-zinc-200'}`}
        >
          <span className="block text-sm font-black">{item.label}</span>
          <span className={`mt-1 block text-[10px] leading-4 ${mode === item.id ? 'text-zinc-800' : 'text-zinc-500'}`}>{item.help}</span>
        </button>
      ))}
    </div>
  );
}

function ErrorState({ error, onRetry, onExit }: { error: NonNullable<ReturnType<typeof usePostureCaptureLab>['error']>; onRetry: () => void; onExit: () => void }) {
  return (
    <section className="mt-7 rounded-2xl border border-red-300/30 bg-red-300/10 p-5" role="alert" data-testid="capture-error-state">
      <p className="text-xs font-black text-red-200">{error.code}</p>
      <h2 className="mt-2 text-xl font-black text-zinc-100">{error.title}</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-300">{error.message}</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {error.recoverable && <button type="button" onClick={onRetry} className="min-h-12 rounded-xl bg-lime-300 px-4 font-black text-zinc-950 active:translate-y-px">重试</button>}
        <button type="button" onClick={onExit} className="min-h-12 rounded-xl border border-zinc-700 bg-zinc-900 px-4 font-black text-zinc-100 active:translate-y-px">返回</button>
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-zinc-800 pl-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-bold leading-5 text-zinc-200">{value}</p>
    </div>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="workout-dark relative -mx-4 -mt-5 min-h-[calc(100dvh-5rem)] bg-[#080a08] px-4 pb-16 pt-6 text-white sm:-mx-6 sm:px-6">
      <main className="mx-auto w-full max-w-[720px]">{children}</main>
    </div>
  );
}

function stageTitle(stage: ReturnType<typeof usePostureCaptureLab>['stage']) {
  if (stage === 'checking') return '正在检查浏览器能力';
  if (stage === 'loading-model') return '正在加载本地 MediaPipe 模型';
  if (stage === 'requesting-camera') return '正在请求摄像头权限';
  if (stage === 'switching-model') return '正在销毁 Full 并加载 Lite';
  return '正在准备实验环境';
}
