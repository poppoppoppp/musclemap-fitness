from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


HALPE26_NAMES = (
    "nose",
    "left_eye",
    "right_eye",
    "left_ear",
    "right_ear",
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_wrist",
    "right_wrist",
    "left_hip",
    "right_hip",
    "left_knee",
    "right_knee",
    "left_ankle",
    "right_ankle",
    "head",
    "neck",
    "hip",
    "left_big_toe",
    "right_big_toe",
    "left_small_toe",
    "right_small_toe",
    "left_heel",
    "right_heel",
)


def _camel_case(value: str) -> str:
    first, *rest = value.split("_")
    return first + "".join(word.capitalize() for word in rest)


class ApiModel(BaseModel):
    model_config = ConfigDict(alias_generator=_camel_case, populate_by_name=True)


class ModelProvenance(ApiModel):
    id: str
    version: str
    config: str
    checkpoint_sha256: str


class KeypointSchemaInfo(ApiModel):
    id: Literal["halpe26"] = "halpe26"
    count: Literal[26] = 26
    names: tuple[str, ...] = HALPE26_NAMES


class CoordinateSpace(ApiModel):
    id: Literal["original-image-pixels"] = "original-image-pixels"
    units: Literal["pixels"] = "pixels"
    origin: Literal["top-left"] = "top-left"
    x_axis: Literal["right"] = "right"
    y_axis: Literal["down"] = "down"


class RuntimeInfo(ApiModel):
    runtime: Literal["pytorch"] = "pytorch"
    runtime_version: str
    device: Literal["cpu", "gpu"]
    device_name: str
    cuda_version: str | None = None
    dependency_versions: dict[str, str]


class TimingInfo(ApiModel):
    decode: float
    detection: float
    pose: float
    total: float


class ImageInfo(ApiModel):
    width: int
    height: int
    mime_type: str
    bytes: int


class BoundingBox(ApiModel):
    x: float
    y: float
    width: float
    height: float
    score: float


class Keypoint(ApiModel):
    index: int
    name: str
    x: float
    y: float
    score: float


class PersonKeypoints(ApiModel):
    bounding_box: BoundingBox
    keypoints: list[Keypoint]


class AnalysisWarning(ApiModel):
    code: str
    severity: Literal["info", "warning"]
    message: str
    keypoint_indices: list[int] = Field(default_factory=list)
    details: dict[str, Any] = Field(default_factory=dict)


class KeypointResponse(ApiModel):
    request_id: str
    model: ModelProvenance
    detector: ModelProvenance
    keypoint_schema: KeypointSchemaInfo = Field(default_factory=KeypointSchemaInfo)
    coordinate_space: CoordinateSpace = Field(default_factory=CoordinateSpace)
    runtime: RuntimeInfo
    timing_ms: TimingInfo
    image: ImageInfo
    person: PersonKeypoints
    warnings: list[AnalysisWarning]


class ErrorDetail(ApiModel):
    code: str
    message: str
    retryable: bool
    details: dict[str, Any] = Field(default_factory=dict)


class ErrorResponse(ApiModel):
    error: ErrorDetail


class HealthResponse(ApiModel):
    status: Literal["ready", "unavailable"]
    ready: bool
    runtime: Literal["pytorch"] = "pytorch"
    device: str
    model_ids: list[str]


class ModelsResponse(ApiModel):
    model: ModelProvenance
    detector: ModelProvenance
    keypoint_schema: KeypointSchemaInfo = Field(default_factory=KeypointSchemaInfo)
    coordinate_space: CoordinateSpace = Field(default_factory=CoordinateSpace)
    runtime: RuntimeInfo


class StaticAnalysisRequest(ApiModel):
    view: Literal["front", "back", "side"]
    visible_side: Literal["left", "right"] | None = None
    model_id: str
    model_version: str
    bounding_box: BoundingBox
    keypoints: list[Keypoint]


class AnalysisPointInfo(ApiModel):
    name: str
    x: float
    y: float
    score: float


class NormalizedPointInfo(AnalysisPointInfo):
    pass


class NormalizationInfoResponse(ApiModel):
    basis: Literal["shoulder-width", "torso-length", "bounding-box-diagonal"]
    pixels: float
    center_x: float
    center_y: float


class MetricValueResponse(ApiModel):
    label: str
    value: float
    unit: str


class MetricResultResponse(ApiModel):
    id: str
    label: str
    status: Literal["valid", "unavailable"]
    quality: Literal["valid", "invalid"]
    required_views: list[str]
    keypoints: list[str]
    formula: str
    values: list[MetricValueResponse]
    confidence: float | None
    unavailable_reasons: list[str]
    analysis_version: str
    model_id: str
    model_version: str


class StaticAnalysisResponse(ApiModel):
    analysis_version: str
    view: Literal["front", "back", "side"]
    visible_side: Literal["left", "right"] | None
    normalization: NormalizationInfoResponse
    raw_keypoints: list[AnalysisPointInfo]
    normalized_keypoints: list[NormalizedPointInfo]
    filtered_keypoints: list[NormalizedPointInfo]
    metrics: list[MetricResultResponse]


class RawMovementFrameResponse(ApiModel):
    index: int
    timestamp_ms: float
    keypoints: list[AnalysisPointInfo]
    bounding_box: tuple[float, float, float, float]
    valid: bool
    reasons: list[str]


class ProcessedMovementFrameResponse(ApiModel):
    index: int
    timestamp_ms: float
    normalized_keypoints: list[NormalizedPointInfo]
    filtered_keypoints: list[NormalizedPointInfo]
    valid: bool
    outlier: bool
    reasons: list[str]


class MovementPhasesResponse(ApiModel):
    status: Literal["complete", "incomplete"]
    start_index: int | None
    peak_index: int | None
    return_index: int | None
    hold_indices: list[int]
    reasons: list[str]


class TrajectorySampleResponse(ApiModel):
    frame_index: int
    timestamp_ms: float
    value: float


class TrajectoryResponse(ApiModel):
    id: str
    label: str
    unit: str
    samples: list[TrajectorySampleResponse]


class MovementAnalysisInfo(ApiModel):
    analysis_version: str
    action: Literal["bilateral-arm-raise", "bodyweight-squat", "neck-retraction"]
    view: Literal["front", "side"]
    visible_side: Literal["left", "right"] | None
    status: Literal["valid", "incomplete"]
    required_keypoints: list[str]
    raw_frames: list[RawMovementFrameResponse]
    processed_frames: list[ProcessedMovementFrameResponse]
    phases: MovementPhasesResponse
    metrics: list[MetricResultResponse]
    trajectories: list[TrajectoryResponse]


class MovementInferenceFrame(ApiModel):
    index: int
    timestamp_ms: float
    status: Literal["valid", "failed"]
    image: ImageInfo | None = None
    person: PersonKeypoints | None = None
    timing_ms: TimingInfo | None = None
    error: ErrorDetail | None = None
    warnings: list[AnalysisWarning] = Field(default_factory=list)


class MovementLimitsResponse(ApiModel):
    max_frames: int
    max_frame_bytes: int
    max_request_bytes: int
    max_frame_pixels: int
    max_total_pixels: int


class MovementAnalysisResponse(ApiModel):
    request_id: str
    model: ModelProvenance
    detector: ModelProvenance
    runtime: RuntimeInfo
    timing_ms: TimingInfo
    limits: MovementLimitsResponse
    frames: list[MovementInferenceFrame]
    analysis: MovementAnalysisInfo
