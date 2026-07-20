interface TelemetryInput {
  startedAtMs: number;
  endedAtMs: number;
  inferenceLatenciesMs: number[];
  processedFrames: number;
  droppedFrames: number;
}

export function summarizeRuntimeTelemetry(input: TelemetryInput) {
  const elapsedSeconds = Math.max((input.endedAtMs - input.startedAtMs) / 1000, 0.001);
  const latencies = input.inferenceLatenciesMs.filter(Number.isFinite).sort((left, right) => left - right);
  const averageInferenceMs = latencies.length
    ? latencies.reduce((sum, value) => sum + value, 0) / latencies.length
    : 0;
  const p95Index = Math.max(0, Math.ceil(latencies.length * 0.95) - 1);
  return {
    processedFps: round(input.processedFrames / elapsedSeconds),
    averageInferenceMs: round(averageInferenceMs),
    p95InferenceMs: round(latencies[p95Index] ?? 0),
    processedFrames: input.processedFrames,
    droppedFrames: input.droppedFrames,
  };
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}
