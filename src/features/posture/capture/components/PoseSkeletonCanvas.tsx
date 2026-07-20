import { useEffect, useRef } from 'react';
import type { PostureCaptureKeypoint } from '../../../../types/postureAnalysis';
import { POSE_CONNECTIONS } from '../mediapipe/poseConnections';

interface PoseSkeletonCanvasProps {
  landmarks: PostureCaptureKeypoint[];
  mediaWidth: number;
  mediaHeight: number;
  mirrored?: boolean;
  className?: string;
}

export default function PoseSkeletonCanvas({ landmarks, mediaWidth, mediaHeight, mirrored = false, className = '' }: PoseSkeletonCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => drawSkeleton(canvas, landmarks, mediaWidth, mediaHeight, mirrored);
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [landmarks, mediaHeight, mediaWidth, mirrored]);

  return <canvas ref={canvasRef} className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} aria-hidden="true" />;
}

function drawSkeleton(canvas: HTMLCanvasElement, landmarks: PostureCaptureKeypoint[], mediaWidth: number, mediaHeight: number, mirrored: boolean) {
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
  if (landmarks.length !== 33 || !mediaWidth || !mediaHeight) return;

  const mediaRatio = mediaWidth / mediaHeight;
  const containerRatio = width / height;
  const drawnWidth = mediaRatio > containerRatio ? width : height * mediaRatio;
  const drawnHeight = mediaRatio > containerRatio ? width / mediaRatio : height;
  const offsetX = (width - drawnWidth) / 2;
  const offsetY = (height - drawnHeight) / 2;
  const point = (index: number) => {
    const landmark = landmarks[index];
    if (!landmark || !Number.isFinite(landmark.x) || !Number.isFinite(landmark.y)) return null;
    return {
      x: offsetX + (mirrored ? 1 - landmark.x : landmark.x) * drawnWidth,
      y: offsetY + landmark.y * drawnHeight,
      visibility: landmark.visibility ?? 0,
    };
  };

  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.lineWidth = Math.max(1.5, width / 220);
  context.strokeStyle = 'rgba(190, 242, 100, 0.82)';
  for (const [fromIndex, toIndex] of POSE_CONNECTIONS) {
    const from = point(fromIndex);
    const to = point(toIndex);
    if (!from || !to || from.visibility < 0.3 || to.visibility < 0.3) continue;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  }

  for (let index = 0; index < landmarks.length; index += 1) {
    const current = point(index);
    if (!current || current.visibility < 0.3) continue;
    context.beginPath();
    context.arc(current.x, current.y, Math.max(2, width / 150), 0, Math.PI * 2);
    context.fillStyle = current.visibility >= 0.65 ? '#bef264' : '#fbbf24';
    context.fill();
    context.strokeStyle = 'rgba(9, 11, 9, 0.9)';
    context.lineWidth = 1;
    context.stroke();
  }
}
