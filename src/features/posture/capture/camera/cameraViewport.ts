export interface ViewportSize {
  width: number;
  height: number;
}

export interface ContainRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function buildCameraVideoConstraints(viewport: ViewportSize): MediaTrackConstraints {
  const preferPortrait = viewport.height > viewport.width && viewport.width <= 768;
  return {
    facingMode: 'user',
    width: { ideal: preferPortrait ? 720 : 1280 },
    height: { ideal: preferPortrait ? 1280 : 720 },
    frameRate: { ideal: 30, max: 30 },
  };
}

export function fitAspectRatioWithinBounds(aspectRatio: number, maxWidth: number, maxHeight: number) {
  if (!(aspectRatio > 0) || !(maxWidth > 0) || !(maxHeight > 0)) return { width: 0, height: 0 };
  const widthLimitedHeight = maxWidth / aspectRatio;
  if (widthLimitedHeight <= maxHeight) return { width: maxWidth, height: widthLimitedHeight };
  return { width: maxHeight * aspectRatio, height: maxHeight };
}

export function calculateContainRect(
  mediaWidth: number,
  mediaHeight: number,
  containerWidth: number,
  containerHeight: number,
): ContainRect {
  if (!(mediaWidth > 0) || !(mediaHeight > 0) || !(containerWidth > 0) || !(containerHeight > 0)) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  const mediaRatio = mediaWidth / mediaHeight;
  const containerRatio = containerWidth / containerHeight;
  const width = mediaRatio > containerRatio ? containerWidth : containerHeight * mediaRatio;
  const height = mediaRatio > containerRatio ? containerWidth / mediaRatio : containerHeight;
  return {
    x: (containerWidth - width) / 2,
    y: (containerHeight - height) / 2,
    width,
    height,
  };
}

export function mapNormalizedPointToContainRect(
  point: { x: number; y: number },
  rect: ContainRect,
  mirrored: boolean,
) {
  return {
    x: rect.x + (mirrored ? 1 - point.x : point.x) * rect.width,
    y: rect.y + point.y * rect.height,
  };
}
