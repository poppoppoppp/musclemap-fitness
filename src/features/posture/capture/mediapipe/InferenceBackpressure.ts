export class InferenceBackpressure {
  private inFlight = false;
  private lastTimestampMs = Number.NEGATIVE_INFINITY;
  private processedFrames = 0;
  private droppedFrames = 0;
  private inferenceLatenciesMs: number[] = [];

  tryAcquire(proposedTimestampMs: number): { accepted: true; timestampMs: number } | { accepted: false } {
    if (this.inFlight) {
      this.droppedFrames += 1;
      return { accepted: false };
    }
    const timestampMs = Number.isFinite(this.lastTimestampMs)
      ? Math.max(proposedTimestampMs, this.lastTimestampMs + 0.001)
      : proposedTimestampMs;
    this.lastTimestampMs = timestampMs;
    this.inFlight = true;
    return { accepted: true, timestampMs };
  }

  release(inferenceTimeMs?: number) {
    if (!this.inFlight) return;
    this.inFlight = false;
    this.processedFrames += 1;
    if (Number.isFinite(inferenceTimeMs)) this.inferenceLatenciesMs.push(inferenceTimeMs as number);
  }

  fail() {
    this.inFlight = false;
  }

  snapshot() {
    return {
      inFlight: this.inFlight,
      processedFrames: this.processedFrames,
      droppedFrames: this.droppedFrames,
      inferenceLatenciesMs: [...this.inferenceLatenciesMs],
    };
  }
}
