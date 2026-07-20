import type { CaptureImageQuality } from '../captureLabTypes';

const SAMPLE_WIDTH = 160;
const SAMPLE_HEIGHT = 120;

export function sampleVideoImageQuality(video: HTMLVideoElement, canvas: HTMLCanvasElement): CaptureImageQuality {
  canvas.width = SAMPLE_WIDTH;
  canvas.height = SAMPLE_HEIGHT;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return { meanLuma: 0, sharpness: 0 };
  context.drawImage(video, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
  const pixels = context.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT).data;
  const luma = new Float32Array(SAMPLE_WIDTH * SAMPLE_HEIGHT);
  let totalLuma = 0;
  for (let index = 0, pixel = 0; index < pixels.length; index += 4, pixel += 1) {
    const value = 0.2126 * pixels[index] + 0.7152 * pixels[index + 1] + 0.0722 * pixels[index + 2];
    luma[pixel] = value;
    totalLuma += value;
  }
  return {
    meanLuma: totalLuma / luma.length,
    sharpness: laplacianVariance(luma, SAMPLE_WIDTH, SAMPLE_HEIGHT),
  };
}

function laplacianVariance(luma: Float32Array, width: number, height: number) {
  let sum = 0;
  let sumSquares = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      const value = 4 * luma[index] - luma[index - 1] - luma[index + 1] - luma[index - width] - luma[index + width];
      sum += value;
      sumSquares += value * value;
      count += 1;
    }
  }
  if (!count) return 0;
  const mean = sum / count;
  return sumSquares / count - mean * mean;
}
