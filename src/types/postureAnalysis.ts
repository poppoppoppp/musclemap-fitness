export type PostureCaptureView = 'front' | 'back' | 'left-lateral' | 'right-lateral';
export type PostureAnalysisJobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type PostureAnalysisRuntime = 'pytorch' | 'onnxruntime-cpu' | 'onnxruntime-cuda' | 'tensorrt';

export interface PostureCaptureFrame {
  captureId: string;
  localAssetId: string;
  capturedAt: string;
  view: PostureCaptureView;
  width: number;
  height: number;
  mimeType: string;
}

export interface PostureCaptureKeypoint {
  id: string;
  x: number;
  y: number;
  z?: number;
  visibility?: number;
  presence?: number;
}

export interface PostureCaptureQuality {
  wholeBody: 'pass' | 'fail' | 'unknown';
  direction: 'pass' | 'fail' | 'unknown';
  occlusion: 'pass' | 'fail' | 'unknown';
  stability: 'pass' | 'fail' | 'unknown';
  confidence: number | null;
  reasonCodes: string[];
}

export interface PostureCaptureAssistResult {
  purpose: 'capture-assistance-only';
  captureId: string;
  runtimeVersion: string;
  modelId: string;
  keypointSchema: 'mediapipe-pose-33';
  keypoints: PostureCaptureKeypoint[];
  quality: PostureCaptureQuality;
  selectedAsBestFrame: boolean;
}

export interface PostureAnalysisRequest {
  requestId: string;
  captures: PostureCaptureFrame[];
  consentRecordedAt: string;
  requestedAt: string;
}

export interface PostureAnalysisJob {
  jobId: string;
  requestId: string;
  status: PostureAnalysisJobStatus;
  createdAt: string;
  updatedAt: string;
  resultId?: string;
  error?: PostureAnalysisError;
}

export interface PostureModelProvenance {
  modelId: string;
  modelVersion: string;
  framework: 'mmpose';
  configName: string;
  checkpointSha256: string;
  keypointSchema: string;
  officialSource: string;
}

export interface PostureRuntimeProvenance {
  runtime: PostureAnalysisRuntime;
  runtimeVersion: string;
  device: 'cpu' | 'gpu';
  detectorModelId: string;
}

export interface PostureAnalysisKeypoint {
  id: string;
  x: number;
  y: number;
  score: number;
}

export interface PosturePersonDetection {
  detectionId: string;
  captureId: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  score: number;
  keypoints: PostureAnalysisKeypoint[];
}

export interface PostureAnalysisQuality {
  valid: boolean;
  score: number | null;
  reasonCodes: string[];
  comparableCaptureIds: string[];
}

export interface PostureAnalysisWarning {
  code: string;
  severity: 'info' | 'warning' | 'blocking';
  captureId?: string;
  message: string;
}

export interface PostureAnalysisResult {
  resultId: string;
  requestId: string;
  analysisVersion: string;
  model: PostureModelProvenance;
  runtime: PostureRuntimeProvenance;
  processingTimeMs: number;
  detections: PosturePersonDetection[];
  quality: PostureAnalysisQuality;
  warnings: PostureAnalysisWarning[];
  completedAt: string;
}

export interface PostureAnalysisError {
  code: string;
  retryable: boolean;
  message: string;
}

export interface PostureAnalysisGateway {
  createJob(request: PostureAnalysisRequest): Promise<PostureAnalysisJob>;
  getJob(jobId: string): Promise<PostureAnalysisJob>;
  getResult(resultId: string): Promise<PostureAnalysisResult>;
}

export type PostureInferenceView = 'front' | 'back' | 'side';

export interface PostureInferenceModelInfo {
  id: string;
  version: string;
  config: string;
  checkpointSha256: string;
}

export interface PostureInferenceKeypointSchema {
  id: 'halpe26';
  count: 26;
  names: string[];
}

export interface PostureInferenceCoordinateSpace {
  id: 'original-image-pixels';
  units: 'pixels';
  origin: 'top-left';
  xAxis: 'right';
  yAxis: 'down';
}

export interface PostureInferenceRuntimeInfo {
  runtime: 'pytorch';
  runtimeVersion: string;
  device: 'cpu' | 'gpu';
  deviceName: string;
  cudaVersion: string | null;
  dependencyVersions: Record<string, string>;
}

export interface PostureInferenceTiming {
  decode: number;
  detection: number;
  pose: number;
  total: number;
}

export interface PostureInferenceImageInfo {
  width: number;
  height: number;
  mimeType: string;
  bytes: number;
}

export interface PostureInferenceBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
}

export interface PostureInferenceKeypoint {
  index: number;
  name: string;
  x: number;
  y: number;
  score: number;
}

export interface PostureInferenceWarning {
  code: string;
  severity: 'info' | 'warning';
  message: string;
  keypointIndices: number[];
}

export interface PostureKeypointResponse {
  requestId: string;
  model: PostureInferenceModelInfo;
  detector: PostureInferenceModelInfo;
  keypointSchema: PostureInferenceKeypointSchema;
  coordinateSpace: PostureInferenceCoordinateSpace;
  runtime: PostureInferenceRuntimeInfo;
  timingMs: PostureInferenceTiming;
  image: PostureInferenceImageInfo;
  person: {
    boundingBox: PostureInferenceBoundingBox;
    keypoints: PostureInferenceKeypoint[];
  };
  warnings: PostureInferenceWarning[];
}

export interface PostureInferenceErrorBody {
  error: {
    code: string;
    message: string;
    retryable: boolean;
    details: Record<string, unknown>;
  };
}

export type PostureVisibleSide = 'left' | 'right';
export type PostureMovementAction = 'bilateral-arm-raise' | 'bodyweight-squat' | 'neck-retraction';

export interface PostureAnalysisPoint {
  name: string;
  x: number;
  y: number;
  score: number;
}

export interface PostureNormalizationInfo {
  basis: 'shoulder-width' | 'torso-length' | 'bounding-box-diagonal';
  pixels: number;
  centerX: number;
  centerY: number;
}

export interface PostureMetricValue {
  label: string;
  value: number;
  unit: string;
}

export interface PostureMetricResult {
  id: string;
  label: string;
  status: 'valid' | 'unavailable';
  quality: 'valid' | 'invalid';
  requiredViews: string[];
  keypoints: string[];
  formula: string;
  values: PostureMetricValue[];
  confidence: number | null;
  unavailableReasons: string[];
  analysisVersion: string;
  modelId: string;
  modelVersion: string;
}

export interface PostureStaticAnalysisResponse {
  analysisVersion: string;
  view: PostureInferenceView;
  visibleSide: PostureVisibleSide | null;
  normalization: PostureNormalizationInfo;
  rawKeypoints: PostureAnalysisPoint[];
  normalizedKeypoints: PostureAnalysisPoint[];
  filteredKeypoints: PostureAnalysisPoint[];
  metrics: PostureMetricResult[];
}

export interface DynamicCapturedFrame {
  id: string;
  timestampMs: number;
  blob: Blob;
  width: number;
  height: number;
}

export interface PostureMovementFrameResult {
  index: number;
  timestampMs: number;
  status: 'valid' | 'failed';
  image: PostureInferenceImageInfo | null;
  person: { boundingBox: PostureInferenceBoundingBox; keypoints: PostureInferenceKeypoint[] } | null;
  timingMs: PostureInferenceTiming | null;
  error: PostureInferenceErrorBody['error'] | null;
}

export interface PostureProcessedMovementFrame {
  index: number;
  timestampMs: number;
  normalizedKeypoints: PostureAnalysisPoint[];
  filteredKeypoints: PostureAnalysisPoint[];
  valid: boolean;
  outlier: boolean;
  reasons: string[];
}

export interface PostureTrajectory {
  id: string;
  label: string;
  unit: string;
  samples: Array<{ frameIndex: number; timestampMs: number; value: number }>;
}

export interface PostureMovementAnalysisResponse {
  requestId: string;
  model: PostureInferenceModelInfo;
  detector: PostureInferenceModelInfo;
  runtime: PostureInferenceRuntimeInfo;
  timingMs: PostureInferenceTiming;
  limits: {
    maxFrames: number;
    maxFrameBytes: number;
    maxRequestBytes: number;
    maxFramePixels: number;
    maxTotalPixels: number;
  };
  frames: PostureMovementFrameResult[];
  analysis: {
    analysisVersion: string;
    action: PostureMovementAction;
    view: 'front' | 'side';
    visibleSide: PostureVisibleSide | null;
    status: 'valid' | 'incomplete';
    requiredKeypoints: string[];
    rawFrames: Array<{
      index: number;
      timestampMs: number;
      keypoints: PostureAnalysisPoint[];
      boundingBox: [number, number, number, number];
      valid: boolean;
      reasons: string[];
    }>;
    processedFrames: PostureProcessedMovementFrame[];
    phases: {
      status: 'complete' | 'incomplete';
      startIndex: number | null;
      peakIndex: number | null;
      returnIndex: number | null;
      holdIndices: number[];
      reasons: string[];
    };
    metrics: PostureMetricResult[];
    trajectories: PostureTrajectory[];
  };
}
