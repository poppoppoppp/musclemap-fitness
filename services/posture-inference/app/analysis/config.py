from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


ANALYSIS_VERSION = "posture-metrics-v1"
MIN_KEYPOINT_SCORE = 0.30
MEDIAN_WINDOW = 3
EMA_ALPHA = 0.35
OUTLIER_MAD_MULTIPLIER = 4.5
MAX_MOVEMENT_FRAMES = 40


MovementId = Literal["bilateral-arm-raise", "bodyweight-squat", "neck-retraction"]


@dataclass(frozen=True)
class MovementConfig:
    id: MovementId
    required_view: Literal["front", "side"]
    duration_ms: int
    analysis_fps: int = 5
    max_frames: int = MAX_MOVEMENT_FRAMES
    minimum_hold_ms: int = 250


MOVEMENT_CONFIGS: dict[MovementId, MovementConfig] = {
    "bilateral-arm-raise": MovementConfig("bilateral-arm-raise", "front", 6_000),
    "bodyweight-squat": MovementConfig("bodyweight-squat", "front", 8_000),
    "neck-retraction": MovementConfig("neck-retraction", "side", 6_000),
}
