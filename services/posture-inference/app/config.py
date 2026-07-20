from __future__ import annotations

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


SERVICE_ROOT = Path(__file__).resolve().parents[1]


class ServiceConfig(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="POSTURE_", extra="ignore")

    model_dir: Path = SERVICE_ROOT / "models" / "checkpoints"
    manifest_path: Path = SERVICE_ROOT / "models" / "manifest.json"
    device: str = "cuda:0"
    max_upload_mb: int = Field(default=10, ge=1, le=50)
    max_image_pixels: int = Field(default=24_000_000, ge=1)
    movement_max_frames: int = Field(default=40, ge=1, le=40)
    movement_max_frame_bytes: int = Field(default=4 * 1024 * 1024, ge=1)
    movement_max_request_bytes: int = Field(default=40 * 1024 * 1024, ge=1)
    movement_max_frame_pixels: int = Field(default=4_000_000, ge=1)
    movement_max_total_pixels: int = Field(default=80_000_000, ge=1)
    detection_score_threshold: float = Field(default=0.3, ge=0, le=1)
    keypoint_score_threshold: float = Field(default=0.3, ge=0, le=1)
    allowed_origins: str = "http://127.0.0.1:5173,http://localhost:5173"

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    @property
    def allowed_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]
