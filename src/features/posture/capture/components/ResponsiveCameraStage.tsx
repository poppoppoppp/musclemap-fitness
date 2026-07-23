import type { ReactNode, RefObject } from 'react';
import { useVideoViewport, type VideoViewportState } from '../hooks/useVideoViewport';

interface ResponsiveCameraStageProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  active: boolean;
  mirrored?: boolean;
  immersive?: boolean;
  children?: ReactNode | ((viewport: VideoViewportState) => ReactNode);
}

export default function ResponsiveCameraStage({
  videoRef,
  active,
  mirrored = true,
  immersive = true,
  children,
}: ResponsiveCameraStageProps) {
  const viewport = useVideoViewport(videoRef);
  const content = typeof children === 'function' ? children(viewport) : children;

  return (
    <div
      className={immersive ? 'fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-black' : 'flex w-full items-center justify-center overflow-hidden bg-black'}
      data-testid="camera-immersive-shell"
    >
      <div
        className="relative shrink-0 overflow-hidden bg-black"
        style={{ width: viewport.stageWidth, height: viewport.stageHeight }}
        data-testid="responsive-camera-stage"
      >
        <video
          ref={videoRef}
          muted
          playsInline
          className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-200 ${mirrored ? 'scale-x-[-1]' : ''} ${active ? 'opacity-100' : 'opacity-0'}`}
          data-testid="responsive-camera-video"
        />
        {content}
      </div>
    </div>
  );
}
