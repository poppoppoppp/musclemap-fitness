import type { RefObject } from 'react';
import type { PostureCaptureKeypoint } from '../../../../types/postureAnalysis';
import type { CaptureLabMode, CaptureQualityEvaluation } from '../captureLabTypes';
import type { CaptureSequenceState } from '../captureSequence';
import { POSTURE_CAPTURE_CONFIG } from '../poseLandmarkerConfig';
import { describeQualityReason } from '../quality/qualityCopy';
import type { StanceCalibrationState } from '../quality/stanceCalibration';
import PoseSkeletonCanvas from './PoseSkeletonCanvas';

interface CaptureViewportProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  mode: CaptureLabMode;
  landmarks: PostureCaptureKeypoint[];
  quality: CaptureQualityEvaluation | null;
  sequence: CaptureSequenceState;
  clockMs: number;
  active: boolean;
  stanceCalibration: StanceCalibrationState;
}

export default function CaptureViewport({ videoRef, mode, landmarks, quality, sequence, clockMs, active, stanceCalibration }: CaptureViewportProps) {
  const video = videoRef.current;
  const countdown = sequence.countdownStartedAtMs === null ? null : Math.max(1, Math.ceil((POSTURE_CAPTURE_CONFIG.capture.countdownDurationMs - (clockMs - sequence.countdownStartedAtMs)) / 1000));
  const capturePercent = sequence.captureStartedAtMs === null ? 0 : Math.min(100, Math.max(0, ((clockMs - sequence.captureStartedAtMs) / POSTURE_CAPTURE_CONFIG.capture.captureDurationMs) * 100));
  const mainReason = quality?.blockingReasons[0];
  const modeCopy = mode === 'front' ? '正面模式' : mode === 'side' ? '侧面模式' : '背面模式由你确认';

  return (
    <div className="relative mx-auto aspect-[3/4] max-h-[66dvh] w-full overflow-hidden rounded-2xl border border-zinc-700 bg-[#11140f] shadow-[0_24px_70px_rgba(5,10,3,0.45)]" data-testid="capture-viewport">
      <video ref={videoRef} muted playsInline className={`h-full w-full scale-x-[-1] object-contain transition-opacity duration-200 ${active ? 'opacity-100' : 'opacity-0'}`} />
      <PoseSkeletonCanvas landmarks={landmarks} mediaWidth={video?.videoWidth ?? 0} mediaHeight={video?.videoHeight ?? 0} mirrored />
      <div className="pointer-events-none absolute inset-4 rounded-xl border border-lime-200/25" aria-hidden="true" />
      <div className="absolute left-4 top-4 rounded-lg bg-zinc-950/85 px-3 py-2 text-xs font-black text-lime-200 backdrop-blur-sm">{modeCopy}</div>
      {active && (
        <div className="absolute inset-x-4 bottom-4 rounded-xl border border-white/10 bg-zinc-950/90 p-3 backdrop-blur-md" aria-live="polite">
          {stanceCalibration.status !== 'idle' && (
            <div className="mb-2 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100" data-testid="stance-calibration-status">
              {stanceCalibration.status === 'calibrating'
                ? <><span className="font-black">自然站姿校准</span> · 还需保持约 {Math.max(1, Math.ceil((POSTURE_CAPTURE_CONFIG.quality.stanceCalibrationDurationMs - stanceCalibration.elapsedMs) / 1000))} 秒</>
                : <><span className="font-black">已按当前自然站姿校准</span> · 继续原拍摄流程</>}
            </div>
          )}
          <p className={`text-sm font-black ${quality?.passed ? 'text-lime-300' : 'text-zinc-100'}`}>
            {sequence.phase === 'capturing' ? `正在采集候选帧 ${Math.round(capturePercent)}%` : mainReason ? describeQualityReason(mainReason) : '请完整站入画面'}
          </p>
          <p className="mt-1 text-xs text-zinc-400">{quality?.passed ? '保持当前站位和光线' : '条件连续合格后会自动倒计时'}</p>
        </div>
      )}
      {sequence.phase === 'countdown' && countdown !== null && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/35" data-testid="capture-countdown">
          <span className="flex size-24 items-center justify-center rounded-full border-2 border-lime-300 bg-zinc-950/90 text-5xl font-black tabular-nums text-lime-300">{countdown}</span>
        </div>
      )}
    </div>
  );
}
