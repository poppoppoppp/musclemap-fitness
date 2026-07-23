import { expect, test } from '@playwright/test';
import {
  buildCameraVideoConstraints,
  calculateContainRect,
  fitAspectRatioWithinBounds,
  mapNormalizedPointToContainRect,
} from '../features/posture/capture/camera/cameraViewport';

test('requests portrait ideals on narrow portrait screens and landscape ideals otherwise', () => {
  expect(buildCameraVideoConstraints({ width: 390, height: 844 })).toMatchObject({
    facingMode: 'user',
    width: { ideal: 720 },
    height: { ideal: 1280 },
    frameRate: { ideal: 30, max: 30 },
  });
  expect(buildCameraVideoConstraints({ width: 1440, height: 900 })).toMatchObject({
    facingMode: 'user',
    width: { ideal: 1280 },
    height: { ideal: 720 },
  });
  expect(buildCameraVideoConstraints({ width: 844, height: 390 })).toMatchObject({
    width: { ideal: 1280 },
    height: { ideal: 720 },
  });
});

test('fits portrait landscape and square media into all available bounds without changing aspect ratio', () => {
  expect(fitAspectRatioWithinBounds(720 / 1280, 390, 844)).toEqual({ width: 390, height: 693.3333333333334 });
  expect(fitAspectRatioWithinBounds(1280 / 720, 1440, 900)).toEqual({ width: 1440, height: 810 });
  expect(fitAspectRatioWithinBounds(1, 1440, 900)).toEqual({ width: 900, height: 900 });
});

test('calculates the same contain rectangle used by an object-contain video', () => {
  expect(calculateContainRect(720, 720, 524, 698)).toEqual({ x: 0, y: 87, width: 524, height: 524 });
  expect(calculateContainRect(1280, 720, 1440, 900)).toEqual({ x: 0, y: 45, width: 1440, height: 810 });
});

test('maps normalized points through the contain rectangle and mirrors only the final x coordinate', () => {
  const rect = calculateContainRect(720, 720, 524, 698);

  expect(mapNormalizedPointToContainRect({ x: 0.25, y: 0.5 }, rect, false)).toEqual({ x: 131, y: 349 });
  expect(mapNormalizedPointToContainRect({ x: 0.25, y: 0.5 }, rect, true)).toEqual({ x: 393, y: 349 });
});
