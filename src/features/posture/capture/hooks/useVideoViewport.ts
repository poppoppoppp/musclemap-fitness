import { useEffect, useMemo, useState, type RefObject } from 'react';
import { fitAspectRatioWithinBounds } from '../camera/cameraViewport';

export interface VideoViewportState {
  mediaWidth: number;
  mediaHeight: number;
  stageWidth: number;
  stageHeight: number;
}

function readWindowSize() {
  return {
    width: Math.max(1, window.visualViewport?.width ?? window.innerWidth),
    height: Math.max(1, window.visualViewport?.height ?? window.innerHeight),
  };
}

export function useVideoViewport(videoRef: RefObject<HTMLVideoElement | null>): VideoViewportState {
  const [mediaSize, setMediaSize] = useState({ width: 0, height: 0 });
  const [windowSize, setWindowSize] = useState(readWindowSize);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const readMediaSize = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setMediaSize({ width: video.videoWidth, height: video.videoHeight });
      }
    };

    readMediaSize();
    video.addEventListener('loadedmetadata', readMediaSize);
    video.addEventListener('resize', readMediaSize);
    return () => {
      video.removeEventListener('loadedmetadata', readMediaSize);
      video.removeEventListener('resize', readMediaSize);
    };
  }, [videoRef]);

  useEffect(() => {
    const updateWindowSize = () => setWindowSize(readWindowSize());
    window.addEventListener('resize', updateWindowSize);
    window.visualViewport?.addEventListener('resize', updateWindowSize);
    return () => {
      window.removeEventListener('resize', updateWindowSize);
      window.visualViewport?.removeEventListener('resize', updateWindowSize);
    };
  }, []);

  return useMemo(() => {
    const fallbackPortrait = windowSize.height > windowSize.width && windowSize.width <= 768;
    const aspectRatio = mediaSize.width > 0 && mediaSize.height > 0
      ? mediaSize.width / mediaSize.height
      : fallbackPortrait ? 9 / 16 : 16 / 9;
    const fitted = fitAspectRatioWithinBounds(aspectRatio, windowSize.width, windowSize.height);
    return {
      mediaWidth: mediaSize.width,
      mediaHeight: mediaSize.height,
      stageWidth: fitted.width,
      stageHeight: fitted.height,
    };
  }, [mediaSize, windowSize]);
}
