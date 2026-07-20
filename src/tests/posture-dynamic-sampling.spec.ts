import { expect, test } from '@playwright/test';
import { DYNAMIC_MOVEMENT_CONFIGS } from '../features/posture/capture/analysis/analysisConfig';
import { selectFramesByTimestamp } from '../features/posture/capture/analysis/selectFramesByTimestamp';


test('selects nearest frames to uniform five FPS targets while preserving real timestamps', () => {
  const timestamps = [0, 41, 93, 171, 222, 391, 403, 612, 799, 1011];
  const selected = selectFramesByTimestamp(
    timestamps.map((timestampMs, index) => ({ index, timestampMs })),
    { targetFps: 5, maxFrames: 40 },
  );

  expect(selected.map((frame) => frame.timestampMs)).toEqual([0, 222, 403, 612, 799, 1011]);
  expect(selected.every((frame) => timestamps.includes(frame.timestampMs))).toBe(true);
});


test('caps an eight-second high-frequency capture at forty total frames including endpoints', () => {
  const frames = Array.from({ length: 121 }, (_, index) => ({ index, timestampMs: index * (8000 / 120) }));
  const selected = selectFramesByTimestamp(frames, { targetFps: 5, maxFrames: 40 });

  expect(selected).toHaveLength(40);
  expect(selected[0].timestampMs).toBe(0);
  expect(selected.at(-1)?.timestampMs).toBe(frames.at(-1)?.timestampMs);
});


test('five FPS is explicit on the three slow action configurations, not a global fallback', () => {
  expect(DYNAMIC_MOVEMENT_CONFIGS['bilateral-arm-raise']).toMatchObject({ durationMs: 6000, analysisFps: 5, maxFrames: 40 });
  expect(DYNAMIC_MOVEMENT_CONFIGS['bodyweight-squat']).toMatchObject({ durationMs: 8000, analysisFps: 5, maxFrames: 40 });
  expect(DYNAMIC_MOVEMENT_CONFIGS['neck-retraction']).toMatchObject({ durationMs: 6000, analysisFps: 5, maxFrames: 40, view: 'side' });
  expect('defaultAnalysisFps' in DYNAMIC_MOVEMENT_CONFIGS).toBe(false);
});
