import type { CaptureCandidate } from '../captureLabTypes';

interface CandidateLimits {
  maxCandidates: number;
  maxBlobBytes: number;
  maxTotalBytes: number;
  maxWidth: number;
  maxHeight: number;
}

export class BoundedCandidateStore {
  private candidates: CaptureCandidate[] = [];

  constructor(private readonly limits: CandidateLimits) {}

  get totalBytes() {
    return this.candidates.reduce((sum, candidate) => sum + candidate.blob.size, 0);
  }

  consider(candidate: CaptureCandidate): boolean {
    if (!this.valid(candidate)) return false;
    const next = [...this.candidates.filter((item) => item.id !== candidate.id), candidate]
      .sort((left, right) => right.score - left.score)
      .slice(0, this.limits.maxCandidates);

    while (sumBytes(next) > this.limits.maxTotalBytes) next.pop();
    const accepted = next.some((item) => item.id === candidate.id);
    this.candidates = next;
    return accepted;
  }

  snapshot(): CaptureCandidate[] {
    return [...this.candidates];
  }

  clear() {
    this.candidates = [];
  }

  private valid(candidate: CaptureCandidate) {
    return candidate.blob.size <= this.limits.maxBlobBytes
      && candidate.width <= this.limits.maxWidth
      && candidate.height <= this.limits.maxHeight
      && candidate.width > 0
      && candidate.height > 0;
  }
}

function sumBytes(candidates: CaptureCandidate[]) {
  return candidates.reduce((sum, candidate) => sum + candidate.blob.size, 0);
}
