import { useEffect, useRef } from 'react';
import type {
  PostureCaptureKeypoint,
  PostureInferenceBoundingBox,
  PostureInferenceKeypoint,
} from '../../../../types/postureAnalysis';
import { POSE_CONNECTIONS } from '../mediapipe/poseConnections';
import { HALPE26_CONNECTIONS } from '../inference/halpe26';

export type KeypointOverlayMode = 'original' | 'mediapipe' | 'rtmpose' | 'both';

interface KeypointComparisonCanvasProps {
  mediaPipe: PostureCaptureKeypoint[];
  rtmPose: PostureInferenceKeypoint[];
  boundingBox?: PostureInferenceBoundingBox;
  imageWidth: number;
  imageHeight: number;
  mode: KeypointOverlayMode;
}

export default function KeypointComparisonCanvas({
  mediaPipe,
  rtmPose,
  boundingBox,
  imageWidth,
  imageHeight,
  mode,
}: KeypointComparisonCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => drawOverlays(canvas, { mediaPipe, rtmPose, boundingBox, imageWidth, imageHeight, mode });
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [boundingBox, imageHeight, imageWidth, mediaPipe, mode, rtmPose]);
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
      data-testid="keypoint-overlay-canvas"
      data-overlay-mode={mode}
    />
  );
}

function drawOverlays(
  canvas: HTMLCanvasElement,
  { mediaPipe, rtmPose, boundingBox, imageWidth, imageHeight, mode }: Omit<KeypointComparisonCanvasProps, 'mode'> & { mode: KeypointOverlayMode },
) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }
  const context = canvas.getContext('2d');
  if (!context) return;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  if (mode === 'original' || !imageWidth || !imageHeight) return;
  const transform = containTransform(width, height, imageWidth, imageHeight);
  if (mode === 'mediapipe' || mode === 'both') {
    drawSkeleton(
      context,
      POSE_CONNECTIONS,
      (index) => {
        const point = mediaPipe[index];
        if (!point || (point.visibility ?? 0) < 0.3) return null;
        return transform(point.x * imageWidth, point.y * imageHeight);
      },
      '#bef264',
      width,
    );
  }
  if (mode === 'rtmpose' || mode === 'both') {
    drawSkeleton(
      context,
      HALPE26_CONNECTIONS,
      (index) => {
        const point = rtmPose[index];
        if (!point || point.score < 0.3) return null;
        return transform(point.x, point.y);
      },
      '#22d3ee',
      width,
    );
    if (boundingBox) drawBoundingBox(context, boundingBox, transform);
  }
}

function drawSkeleton(
  context: CanvasRenderingContext2D,
  connections: ReadonlyArray<readonly [number, number]>,
  point: (index: number) => { x: number; y: number } | null,
  colour: string,
  width: number,
) {
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.lineWidth = Math.max(1.5, width / 220);
  context.strokeStyle = colour;
  for (const [fromIndex, toIndex] of connections) {
    const from = point(fromIndex);
    const to = point(toIndex);
    if (!from || !to) continue;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  }
  const indices = new Set(connections.flatMap(([from, to]) => [from, to]));
  for (const index of indices) {
    const current = point(index);
    if (!current) continue;
    context.beginPath();
    context.arc(current.x, current.y, Math.max(2, width / 160), 0, Math.PI * 2);
    context.fillStyle = colour;
    context.fill();
    context.strokeStyle = 'rgba(8, 10, 8, 0.9)';
    context.lineWidth = 1;
    context.stroke();
  }
}

function drawBoundingBox(
  context: CanvasRenderingContext2D,
  box: PostureInferenceBoundingBox,
  transform: (x: number, y: number) => { x: number; y: number },
) {
  const topLeft = transform(box.x, box.y);
  const bottomRight = transform(box.x + box.width, box.y + box.height);
  context.save();
  context.strokeStyle = 'rgba(34, 211, 238, 0.75)';
  context.lineWidth = 1.5;
  context.setLineDash([6, 4]);
  context.strokeRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
  context.restore();
}

function containTransform(containerWidth: number, containerHeight: number, imageWidth: number, imageHeight: number) {
  const scale = Math.min(containerWidth / imageWidth, containerHeight / imageHeight);
  const offsetX = (containerWidth - imageWidth * scale) / 2;
  const offsetY = (containerHeight - imageHeight * scale) / 2;
  return (x: number, y: number) => ({ x: offsetX + x * scale, y: offsetY + y * scale });
}
