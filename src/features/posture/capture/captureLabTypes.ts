import type { PostureCaptureKeypoint } from '../../../types/postureAnalysis';

export type CaptureLabMode = 'front' | 'back' | 'side';
export type PoseModelVariant = 'full' | 'lite';
export type PoseRuntimeMode = 'worker' | 'main-thread-limited';
export type CaptureRuleStatus = 'pass' | 'fail' | 'unknown';

export interface CaptureRuleResult {
  status: CaptureRuleStatus;
  reasonCode?: string;
  detail?: string;
}

export interface CaptureImageQuality {
  meanLuma: number;
  sharpness: number;
}

export interface CaptureStabilityResult {
  stable: boolean;
  score: number;
  sampleCount: number;
}

export interface CaptureQualityEvaluation {
  passed: boolean;
  blockingReasons: string[];
  rules: {
    wholeBody: CaptureRuleResult;
    head: CaptureRuleResult;
    shoulders: CaptureRuleResult;
    hips: CaptureRuleResult;
    knees: CaptureRuleResult;
    ankles: CaptureRuleResult;
    distance: CaptureRuleResult;
    centering: CaptureRuleResult;
    stance: CaptureRuleResult;
    occlusion: CaptureRuleResult;
    stability: CaptureRuleResult;
    lighting: CaptureRuleResult;
    sharpness: CaptureRuleResult;
  };
  metrics: {
    completeness: number;
    averageReliability: number;
      bodyHeightRatio: number | null;
      centerOffset: number | null;
      stanceRatio: number | null;
      sharpness: number;
    stability: number;
  };
}

export interface CaptureCandidateQuality {
  completeness: number;
  landmarkReliability: number;
  sharpness: number;
  stability: number;
  failedRules: string[];
}

export interface CaptureCandidate {
  id: string;
  score: number;
  blob: Blob;
  width: number;
  height: number;
  capturedAtMs: number;
  quality: CaptureCandidateQuality;
  landmarks?: PostureCaptureKeypoint[];
}

export interface StabilitySample {
  timestampMs: number;
  landmarks: PostureCaptureKeypoint[];
}

export interface PoseInferenceResult {
  landmarks: PostureCaptureKeypoint[];
  inferenceTimeMs: number;
  timestampMs: number;
}

export interface CaptureLabTelemetry {
  model: PoseModelVariant;
  runtimeMode: PoseRuntimeMode;
  modelLoadDurationMs: number;
  processedFps: number;
  averageInferenceMs: number;
  p95InferenceMs: number;
  droppedFrames: number;
  processedFrames: number;
  candidateCount: number;
  candidateBytes: number;
  userAgent: string;
  platform: string;
  viewport: string;
  cameraSettings: MediaTrackSettings | null;
}

export interface CaptureLabError {
  code: string;
  title: string;
  message: string;
  recoverable: boolean;
}
