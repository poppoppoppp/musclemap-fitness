from __future__ import annotations

import json
from dataclasses import dataclass

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.config import ServiceConfig
from app.errors import InferenceServiceError
from app.inference import InferenceOutput
from app.main import create_app
from app.schemas import AnalysisWarning, BoundingBox, HALPE26_NAMES, Keypoint


def test_static_analysis_uses_existing_keypoints_without_running_inference(runtime_bundle) -> None:
    engine = CountingEngine()
    runtime_bundle.engine = engine
    with client(runtime_bundle) as api:
        response = api.post("/v1/posture/analysis/static", json=static_payload())

    body = response.json()
    assert response.status_code == 200
    assert engine.calls == 0
    assert body["analysisVersion"] == "posture-metrics-v1"
    assert body["normalization"]["basis"] == "shoulder-width"
    assert len(body["rawKeypoints"]) == 26
    assert body["filteredKeypoints"] == []
    assert next(metric for metric in body["metrics"] if metric["id"] == "head-lateral-tilt")["status"] == "valid"


def test_dynamic_endpoint_attempts_each_submitted_frame_once_and_preserves_timestamps(runtime_bundle) -> None:
    engine = CountingEngine(fail_on_calls={1})
    runtime_bundle.engine = engine
    timestamps = [0, 241, 519]
    with client(runtime_bundle) as api:
        response = movement_request(api, timestamps=timestamps)

    body = response.json()
    assert response.status_code == 200
    assert engine.calls == 3
    assert [frame["timestampMs"] for frame in body["frames"]] == timestamps
    assert [frame["status"] for frame in body["frames"]] == ["failed", "valid", "valid"]
    assert body["frames"][0]["error"]["code"] == "NO_PERSON_DETECTED"
    assert len(body["analysis"]["rawFrames"]) == 3
    assert body["analysis"]["rawFrames"][0]["valid"] is False
    assert body["analysis"]["status"] == "incomplete"


def test_dynamic_frame_count_limit_is_checked_before_inference(runtime_bundle) -> None:
    engine = CountingEngine()
    runtime_bundle.engine = engine
    with client(runtime_bundle, movement_max_frames=2) as api:
        response = movement_request(api, timestamps=[0, 200, 400])

    assert response.status_code == 413
    assert response.json()["error"]["code"] == "MOVEMENT_FRAME_LIMIT_EXCEEDED"
    assert engine.calls == 0


def test_dynamic_per_frame_byte_limit_is_enforced(runtime_bundle) -> None:
    with client(runtime_bundle, movement_max_frame_bytes=50, movement_max_request_bytes=10_000) as api:
        response = movement_request(api, timestamps=[0], image_bytes=image(width=20, height=20))

    assert response.status_code == 413
    assert response.json()["error"]["code"] == "IMAGE_TOO_LARGE"


def test_dynamic_total_request_limit_is_checked_before_inference(runtime_bundle) -> None:
    engine = CountingEngine()
    runtime_bundle.engine = engine
    with client(runtime_bundle, movement_max_request_bytes=300) as api:
        response = movement_request(api, timestamps=[0, 200])

    assert response.status_code == 413
    assert response.json()["error"]["code"] == "MOVEMENT_REQUEST_TOO_LARGE"
    assert engine.calls == 0


def test_dynamic_single_frame_pixel_limit_is_enforced(runtime_bundle) -> None:
    with client(runtime_bundle, movement_max_frame_pixels=99, movement_max_total_pixels=1_000) as api:
        response = movement_request(api, timestamps=[0], image_bytes=image(width=10, height=10))

    assert response.status_code == 413
    assert response.json()["error"]["code"] == "IMAGE_DIMENSIONS_EXCEEDED"


def test_dynamic_total_decoded_pixel_limit_is_checked_before_inference(runtime_bundle) -> None:
    engine = CountingEngine()
    runtime_bundle.engine = engine
    with client(runtime_bundle, movement_max_frame_pixels=200, movement_max_total_pixels=150) as api:
        response = movement_request(api, timestamps=[0, 200], image_bytes=image(width=10, height=10))

    assert response.status_code == 413
    assert response.json()["error"]["code"] == "MOVEMENT_TOTAL_PIXELS_EXCEEDED"
    assert engine.calls == 0


def test_dynamic_rejects_non_increasing_or_mismatched_timestamps(runtime_bundle) -> None:
    with client(runtime_bundle) as api:
        duplicate = movement_request(api, timestamps=[0, 0])
        mismatch = movement_request(api, timestamps=[0, 200], frame_count=1)

    assert duplicate.status_code == 422
    assert duplicate.json()["error"]["code"] == "MOVEMENT_TIMESTAMPS_INVALID"
    assert mismatch.status_code == 422
    assert mismatch.json()["error"]["code"] == "MOVEMENT_TIMESTAMPS_INVALID"


@dataclass
class CountingEngine:
    fail_on_calls: set[int] | None = None
    calls: int = 0

    def infer(self, _: np.ndarray) -> InferenceOutput:
        self.calls += 1
        if self.fail_on_calls and self.calls in self.fail_on_calls:
            raise InferenceServiceError(
                code="NO_PERSON_DETECTED",
                message="No person in this frame.",
                status_code=422,
                retryable=True,
            )
        points = static_points()
        return InferenceOutput(
            bounding_box=BoundingBox(x=10, y=10, width=80, height=180, score=0.9),
            keypoints=[Keypoint(index=index, name=name, x=points[name][0], y=points[name][1], score=0.95) for index, name in enumerate(HALPE26_NAMES)],
            warnings=[AnalysisWarning(code="TEST", severity="info", message="test")],
            detection_time_ms=1,
            pose_time_ms=2,
        )


def client(runtime_bundle, **overrides) -> TestClient:
    defaults = {
        "max_upload_mb": 1,
        "max_image_pixels": 1_000_000,
        "movement_max_frames": 40,
        "movement_max_frame_bytes": 1_000_000,
        "movement_max_request_bytes": 1_000_000,
        "movement_max_frame_pixels": 1_000_000,
        "movement_max_total_pixels": 2_000_000,
    }
    return TestClient(create_app(config=ServiceConfig(**(defaults | overrides)), runtime_factory=lambda _: runtime_bundle))


def movement_request(api: TestClient, *, timestamps: list[float], frame_count: int | None = None, image_bytes: bytes | None = None):
    encoded = image_bytes or image()
    count = len(timestamps) if frame_count is None else frame_count
    return api.post(
        "/v1/posture/analysis/movement",
        data={"action": "bilateral-arm-raise", "view": "front", "timestampsMs": json.dumps(timestamps)},
        files=[("frames", (f"frame-{index}.jpg", encoded, "image/jpeg")) for index in range(count)],
    )


def static_payload() -> dict:
    values = static_points()
    return {
        "view": "front",
        "modelId": "rtmpose-m-body26-256x192",
        "modelVersion": "1.3.2",
        "boundingBox": {"x": 10, "y": 10, "width": 80, "height": 180, "score": 0.9},
        "keypoints": [
            {"index": index, "name": name, "x": values[name][0], "y": values[name][1], "score": 0.95}
            for index, name in enumerate(HALPE26_NAMES)
        ],
    }


def static_points() -> dict[str, tuple[float, float]]:
    defaults = {name: (50.0, 50.0) for name in HALPE26_NAMES}
    defaults.update({
        "nose": (50, 10), "left_ear": (40, 20), "right_ear": (60, 22),
        "left_shoulder": (30, 40), "right_shoulder": (70, 44),
        "left_wrist": (30, 70), "right_wrist": (70, 70),
        "left_hip": (35, 80), "right_hip": (65, 82),
        "left_knee": (36, 120), "right_knee": (64, 120),
        "left_ankle": (35, 160), "right_ankle": (65, 160),
        "left_big_toe": (30, 180), "right_big_toe": (60, 180),
        "left_small_toe": (38, 180), "right_small_toe": (68, 180),
        "left_heel": (34, 170), "right_heel": (64, 170),
    })
    return defaults


def image(width: int = 8, height: int = 10) -> bytes:
    success, encoded = cv2.imencode(".jpg", np.zeros((height, width, 3), dtype=np.uint8))
    assert success
    return encoded.tobytes()
