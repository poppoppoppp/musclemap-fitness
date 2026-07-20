export function selectFramesByTimestamp<T extends { timestampMs: number }>(
  frames: readonly T[],
  { targetFps, maxFrames }: { targetFps: number; maxFrames: number },
): T[] {
  if (targetFps <= 0 || maxFrames <= 0) throw new Error('Sampling frequency and frame limit must be positive.');
  const ordered = [...frames].sort((left, right) => left.timestampMs - right.timestampMs);
  if (ordered.length <= 1) return ordered.slice(0, maxFrames);
  const start = ordered[0].timestampMs;
  const end = ordered[ordered.length - 1].timestampMs;
  const duration = end - start;
  const desired = Math.floor(duration * targetFps / 1000) + 1;
  const count = Math.min(maxFrames, desired);
  if (ordered.length <= count) return ordered;
  if (count <= 1) return [ordered[0]];
  const capped = desired > maxFrames;
  const interval = 1000 / targetFps;
  const targets = Array.from({ length: count }, (_, index) => capped
    ? start + (duration * index) / (count - 1)
    : start + interval * index);
  const selected: T[] = [];
  let previousIndex = -1;
  targets.forEach((target, targetIndex) => {
    const remaining = targets.length - targetIndex - 1;
    const lastAllowed = ordered.length - remaining - 1;
    let bestIndex = previousIndex + 1;
    for (let index = previousIndex + 1; index <= lastAllowed; index += 1) {
      if (Math.abs(ordered[index].timestampMs - target) < Math.abs(ordered[bestIndex].timestampMs - target)) bestIndex = index;
    }
    selected.push(ordered[bestIndex]);
    previousIndex = bestIndex;
  });
  return selected;
}
