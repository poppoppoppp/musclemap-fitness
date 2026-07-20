import { POSTURE_CAPTURE_CONFIG } from '../poseLandmarkerConfig';
import type { CaptureCandidateQuality } from '../captureLabTypes';

export async function encodeVideoCandidate(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<{ blob: Blob; width: number; height: number }> {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  const scale = Math.min(
    1,
    POSTURE_CAPTURE_CONFIG.capture.maxCandidateWidth / sourceWidth,
    POSTURE_CAPTURE_CONFIG.capture.maxCandidateHeight / sourceHeight,
  );
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('无法创建候选帧画布');
  context.drawImage(video, 0, 0, width, height);
  let blob = await canvasToBlob(canvas, POSTURE_CAPTURE_CONFIG.capture.candidateMimeType);
  if (blob.type !== POSTURE_CAPTURE_CONFIG.capture.candidateMimeType) blob = await canvasToBlob(canvas, 'image/jpeg');
  return { blob, width, height };
}

export function scoreCaptureCandidate(quality: CaptureCandidateQuality) {
  const weights = POSTURE_CAPTURE_CONFIG.capture.scoreWeights;
  return clamp01(quality.completeness) * weights.completeness
    + clamp01(quality.landmarkReliability) * weights.landmarkReliability
    + clamp01(quality.sharpness) * weights.sharpness
    + clamp01(quality.stability) * weights.stability;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error(`候选帧编码失败：${type}`)), type, POSTURE_CAPTURE_CONFIG.capture.candidateQuality);
  });
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}
