import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import ResponsiveCameraStage from '../../features/posture/capture/components/ResponsiveCameraStage';
import '../../index.css';

function Harness() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const parameters = new URLSearchParams(window.location.search);
  const mediaWidth = Number(parameters.get('mediaWidth') ?? 720);
  const mediaHeight = Number(parameters.get('mediaHeight') ?? 720);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    Object.defineProperty(video, 'videoWidth', { configurable: true, value: mediaWidth });
    Object.defineProperty(video, 'videoHeight', { configurable: true, value: mediaHeight });
    video.dispatchEvent(new Event('loadedmetadata'));
  }, [mediaHeight, mediaWidth]);

  return (
    <ResponsiveCameraStage videoRef={videoRef} active mirrored>
      <div data-testid="camera-stage-overlay">
        <button type="button">正面</button>
        <p>请完整站入画面</p>
      </div>
    </ResponsiveCameraStage>
  );
}

export function mountPostureCameraViewport(target: HTMLElement) {
  createRoot(target).render(<Harness />);
}
