import { createRoot } from 'react-dom/client';
import CaptureResult from '../../features/posture/capture/components/CaptureResult';
import type { CaptureCandidate, CaptureLabTelemetry } from '../../features/posture/capture/captureLabTypes';

const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='), (character) => character.charCodeAt(0));

const candidate: CaptureCandidate = {
  id: 'best-candidate',
  score: 0.95,
  blob: new Blob([png], { type: 'image/png' }),
  width: 1,
  height: 1,
  capturedAtMs: 123,
  quality: {
    completeness: 1,
    landmarkReliability: 0.97,
    sharpness: 0.8,
    stability: 0.9,
    failedRules: [],
  },
  landmarks: Array.from({ length: 33 }, (_, index) => ({ id: String(index), x: 0.5, y: 0.5, visibility: 0.99, presence: 0.99 })),
};

const telemetry: CaptureLabTelemetry = {
  model: 'full',
  runtimeMode: 'worker',
  modelLoadDurationMs: 100,
  processedFps: 9.3,
  averageInferenceMs: 60.2,
  p95InferenceMs: 76.3,
  droppedFrames: 1,
  processedFrames: 50,
  candidateCount: 1,
  candidateBytes: png.byteLength,
  userAgent: 'test browser',
  platform: 'test platform',
  viewport: '390 x 844',
  cameraSettings: null,
};

export function mountPostureCaptureResult(target: HTMLElement) {
  const view = new URLSearchParams(window.location.search).get('view') === 'side' ? 'side' : 'front';
  createRoot(target).render(
    <CaptureResult
      candidates={[candidate]}
      telemetry={telemetry}
      captureMode={view}
      inferenceApiUrl="http://posture.test"
      onRetake={() => undefined}
      onExit={() => undefined}
    />,
  );
}
