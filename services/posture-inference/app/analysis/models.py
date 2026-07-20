from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True)
class AnalysisPoint:
    name: str
    x: float
    y: float
    score: float


@dataclass(frozen=True)
class NormalizedPoint:
    name: str
    x: float
    y: float
    score: float


@dataclass(frozen=True)
class NormalizationInfo:
    basis: Literal["shoulder-width", "torso-length", "bounding-box-diagonal"]
    pixels: float
    center_x: float
    center_y: float


@dataclass(frozen=True)
class MetricValue:
    label: str
    value: float
    unit: str


@dataclass(frozen=True)
class MetricResult:
    id: str
    label: str
    status: Literal["valid", "unavailable"]
    quality: Literal["valid", "invalid"]
    required_views: tuple[str, ...]
    keypoints: tuple[str, ...]
    formula: str
    values: tuple[MetricValue, ...]
    confidence: float | None
    unavailable_reasons: tuple[str, ...]
    analysis_version: str
    model_id: str
    model_version: str


@dataclass(frozen=True)
class StaticAnalysisResult:
    analysis_version: str
    view: str
    visible_side: str | None
    normalization: NormalizationInfo
    raw_keypoints: tuple[AnalysisPoint, ...]
    normalized_keypoints: tuple[NormalizedPoint, ...]
    filtered_keypoints: tuple[NormalizedPoint, ...]
    metrics: tuple[MetricResult, ...]


@dataclass(frozen=True)
class MovementInputFrame:
    index: int
    timestamp_ms: float
    keypoints: tuple[AnalysisPoint, ...]
    bounding_box: tuple[float, float, float, float]
    failure_reason: str | None = None


@dataclass(frozen=True)
class RawMovementFrame:
    index: int
    timestamp_ms: float
    keypoints: tuple[AnalysisPoint, ...]
    bounding_box: tuple[float, float, float, float]
    valid: bool
    reasons: tuple[str, ...]


@dataclass(frozen=True)
class ProcessedMovementFrame:
    index: int
    timestamp_ms: float
    normalized_keypoints: tuple[NormalizedPoint, ...]
    filtered_keypoints: tuple[NormalizedPoint, ...]
    valid: bool
    outlier: bool
    reasons: tuple[str, ...]


@dataclass(frozen=True)
class MovementPhases:
    status: Literal["complete", "incomplete"]
    start_index: int | None
    peak_index: int | None
    return_index: int | None
    hold_indices: tuple[int, ...]
    reasons: tuple[str, ...]


@dataclass(frozen=True)
class TrajectorySample:
    frame_index: int
    timestamp_ms: float
    value: float


@dataclass(frozen=True)
class Trajectory:
    id: str
    label: str
    unit: str
    samples: tuple[TrajectorySample, ...]


@dataclass(frozen=True)
class MovementAnalysisResult:
    analysis_version: str
    action: str
    view: str
    visible_side: str | None
    status: Literal["valid", "incomplete"]
    required_keypoints: tuple[str, ...]
    raw_frames: tuple[RawMovementFrame, ...]
    processed_frames: tuple[ProcessedMovementFrame, ...]
    phases: MovementPhases
    metrics: tuple[MetricResult, ...]
    trajectories: tuple[Trajectory, ...]
