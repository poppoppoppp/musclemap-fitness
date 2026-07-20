import { createRef } from 'react';
import { createRoot } from 'react-dom/client';
import CaptureViewport from '../../features/posture/capture/components/CaptureViewport';
import { initialCaptureSequence } from '../../features/posture/capture/captureSequence';
import type { CaptureQualityEvaluation } from '../../features/posture/capture/captureLabTypes';
import { initialStanceCalibration, type StanceCalibrationState } from '../../features/posture/capture/quality/stanceCalibration';

export function mountPostureStanceCalibration(element: Element | null) {
  if (!element) throw new Error('Missing stance calibration harness root.');
  const parameters = new URLSearchParams(window.location.search);
  const status = parameters.get('status') ?? 'calibrating';
  const elapsedMs = Number(parameters.get('elapsedMs') ?? 6_400);
  const stanceCalibration: StanceCalibrationState = status === 'calibrated'
    ? { ...initialStanceCalibration(), status: 'calibrated', elapsedMs: 10_000, frontMinSpanToTorsoRatio: 0.4 }
    : { ...initialStanceCalibration(), status: 'calibrating', startedAtMs: 0, lastSampleAtMs: elapsedMs, elapsedMs, samples: [0.44] };
  const quality: CaptureQualityEvaluation = {
    passed: false,
    blockingReasons: ['FRONT_STANCE_NOT_PLAUSIBLE'],
    rules: {
      wholeBody: { status: 'pass' }, head: { status: 'pass' }, shoulders: { status: 'pass' }, hips: { status: 'pass' },
      knees: { status: 'pass' }, ankles: { status: 'pass' }, distance: { status: 'pass' }, centering: { status: 'pass' },
      stance: { status: 'fail', reasonCode: 'FRONT_STANCE_NOT_PLAUSIBLE' }, occlusion: { status: 'pass' },
      stability: { status: 'pass' }, lighting: { status: 'pass' }, sharpness: { status: 'pass' },
    },
    metrics: { completeness: 1, averageReliability: 0.96, bodyHeightRatio: 0.8, centerOffset: 0.01, stanceRatio: 0.44, sharpness: 100, stability: 0.98 },
  };
  createRoot(element).render(
    <CaptureViewport
      videoRef={createRef<HTMLVideoElement>()}
      mode="front"
      landmarks={[]}
      quality={quality}
      sequence={initialCaptureSequence()}
      clockMs={elapsedMs}
      active
      stanceCalibration={stanceCalibration}
    />,
  );
}
