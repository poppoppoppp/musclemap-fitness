import { expect, test } from '@playwright/test';
import {
  DIRECT_KEYPOINT_MAPPINGS,
  compareKeypoints,
  NON_COMPARABLE_HALPE26,
  NON_COMPARABLE_MEDIAPIPE,
} from '../features/posture/capture/inference/keypointComparison';
import type { PostureCaptureKeypoint, PostureInferenceKeypoint } from '../types/postureAnalysis';

test('uses 17 explicit semantic mappings and never guesses eyes or toes by index', () => {
  expect(DIRECT_KEYPOINT_MAPPINGS).toHaveLength(17);
  expect(DIRECT_KEYPOINT_MAPPINGS.map((item) => item.id)).toEqual([
    'nose',
    'left-ear', 'right-ear',
    'left-shoulder', 'right-shoulder',
    'left-elbow', 'right-elbow',
    'left-wrist', 'right-wrist',
    'left-hip', 'right-hip',
    'left-knee', 'right-knee',
    'left-ankle', 'right-ankle',
    'left-heel', 'right-heel',
  ]);
  expect(NON_COMPARABLE_MEDIAPIPE).toContainEqual(expect.objectContaining({ id: 'left-foot-index', index: 31 }));
  expect(NON_COMPARABLE_HALPE26).toContainEqual(expect.objectContaining({ id: 'left-big-toe', index: 20 }));
  expect(DIRECT_KEYPOINT_MAPPINGS.some((item) => [1, 2, 3, 4, 5, 6, 31, 32].includes(item.mediaPipeIndex))).toBe(false);
  expect(DIRECT_KEYPOINT_MAPPINGS.some((item) => [1, 2, 17, 18, 19, 20, 21, 22, 23].includes(item.halpeIndex))).toBe(false);
});

test('converts MediaPipe normalized coordinates to the same original-image pixel space', () => {
  const mediaPipe = mediaPipePoints();
  const rtmPose = rtmPosePoints();
  mediaPipe[0] = { ...mediaPipe[0], x: 0.25, y: 0.4 };
  rtmPose[0] = { ...rtmPose[0], x: 50, y: 40 };

  const result = compareKeypoints({
    mediaPipe,
    rtmPose,
    imageWidth: 200,
    imageHeight: 100,
    boundingBox: { x: 10, y: 5, width: 180, height: 90, score: 0.9 },
    view: 'front',
  });

  expect(result.points.find((point) => point.id === 'nose')).toMatchObject({
    mediaPipePixel: { x: 50, y: 40 },
    rtmPosePixel: { x: 50, y: 40 },
    distancePixels: 0,
    normalizedDistance: 0,
  });
});

test('front and back normalize with mean model shoulder width', () => {
  const result = compareKeypoints({
    mediaPipe: mediaPipePoints(),
    rtmPose: rtmPosePoints(),
    imageWidth: 100,
    imageHeight: 100,
    boundingBox: { x: 0, y: 0, width: 100, height: 100, score: 0.9 },
    view: 'front',
  });

  expect(result.normalization).toEqual({ basis: 'shoulder-width', pixels: 40 });
});

test('side normalizes with a same-side shoulder-to-hip torso length', () => {
  const result = compareKeypoints({
    mediaPipe: mediaPipePoints(),
    rtmPose: rtmPosePoints(),
    imageWidth: 100,
    imageHeight: 100,
    boundingBox: { x: 0, y: 0, width: 100, height: 100, score: 0.9 },
    view: 'side',
  });

  expect(result.normalization.basis).toBe('torso-length');
  expect(result.normalization.pixels).toBe(30);
});

test('falls back to bounding-box diagonal and excludes low-confidence common points', () => {
  const mediaPipe = mediaPipePoints();
  const rtmPose = rtmPosePoints();
  mediaPipe[11] = { ...mediaPipe[11], visibility: 0.1 };
  mediaPipe[12] = { ...mediaPipe[12], visibility: 0.1 };
  mediaPipe[23] = { ...mediaPipe[23], visibility: 0.1 };
  mediaPipe[24] = { ...mediaPipe[24], visibility: 0.1 };
  rtmPose[15] = { ...rtmPose[15], score: 0.1 };

  const result = compareKeypoints({
    mediaPipe,
    rtmPose,
    imageWidth: 100,
    imageHeight: 100,
    boundingBox: { x: 0, y: 0, width: 60, height: 80, score: 0.9 },
    view: 'front',
  });

  expect(result.normalization).toEqual({ basis: 'bounding-box-diagonal', pixels: 100 });
  expect(result.points.find((point) => point.id === 'left-ankle')).toMatchObject({ comparable: false, reason: 'low-confidence' });
  expect(result.lowConfidenceRtmPose).toContainEqual({ index: 15, name: 'left_ankle', score: 0.1 });
  expect(result.comparablePointCount).toBeLessThan(17);
});

function mediaPipePoints(): PostureCaptureKeypoint[] {
  const points = Array.from({ length: 33 }, (_, index) => ({ id: String(index), x: 0.5, y: 0.5, visibility: 0.99, presence: 0.99 }));
  points[11] = { ...points[11], x: 0.3, y: 0.3 };
  points[12] = { ...points[12], x: 0.7, y: 0.3 };
  points[23] = { ...points[23], x: 0.3, y: 0.6 };
  points[24] = { ...points[24], x: 0.7, y: 0.6 };
  return points;
}

function rtmPosePoints(): PostureInferenceKeypoint[] {
  const names = [
    'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear', 'left_shoulder', 'right_shoulder',
    'left_elbow', 'right_elbow', 'left_wrist', 'right_wrist', 'left_hip', 'right_hip', 'left_knee',
    'right_knee', 'left_ankle', 'right_ankle', 'head', 'neck', 'hip', 'left_big_toe', 'right_big_toe',
    'left_small_toe', 'right_small_toe', 'left_heel', 'right_heel',
  ];
  const points = names.map((name, index) => ({ index, name, x: 50, y: 50, score: 0.99 }));
  points[5] = { ...points[5], x: 30, y: 30 };
  points[6] = { ...points[6], x: 70, y: 30 };
  points[11] = { ...points[11], x: 30, y: 60 };
  points[12] = { ...points[12], x: 70, y: 60 };
  return points;
}
