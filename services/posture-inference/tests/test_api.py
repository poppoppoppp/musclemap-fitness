from __future__ import annotations

import cv2
import numpy as np
from fastapi.testclient import TestClient

from app.config import ServiceConfig
from app.errors import InferenceServiceError
from app.main import create_app


def test_health_reports_loaded_models_and_device(runtime_bundle) -> None:
    with _client(runtime_bundle) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ready",
        "ready": True,
        "runtime": "pytorch",
        "device": "gpu",
        "modelIds": ["rtmpose-m-body26-256x192", "rtmdet-m-person-640"],
    }


def test_models_reports_provenance_schema_runtime_and_coordinate_space(runtime_bundle) -> None:
    with _client(runtime_bundle) as client:
        response = client.get("/v1/models")

    body = response.json()
    assert response.status_code == 200
    assert body["model"]["config"] == "rtmpose-m_8xb512-700e_body8-halpe26-256x192"
    assert body["detector"]["id"] == "rtmdet-m-person-640"
    assert body["keypointSchema"]["count"] == 26
    assert body["coordinateSpace"] == {
        "id": "original-image-pixels",
        "units": "pixels",
        "origin": "top-left",
        "xAxis": "right",
        "yAxis": "down",
    }


def test_keypoint_endpoint_returns_original_dimensions_box_points_and_timing(runtime_bundle) -> None:
    with _client(runtime_bundle) as client:
        response = client.post(
            "/v1/posture/keypoints",
            files={"image": ("best.webp", _image(".webp", width=11, height=7), "image/webp")},
            data={"view": "front"},
        )

    body = response.json()
    assert response.status_code == 200
    assert body["image"]["width"] == 11
    assert body["image"]["height"] == 7
    assert body["image"]["mimeType"] == "image/webp"
    assert body["person"]["boundingBox"]["score"] == 0.88
    assert len(body["person"]["keypoints"]) == 26
    assert body["timingMs"]["decode"] >= 0
    assert body["timingMs"]["detection"] == 12.5
    assert body["timingMs"]["pose"] == 8.25
    assert body["timingMs"]["total"] >= body["timingMs"]["detection"] + body["timingMs"]["pose"]


def test_structured_inference_error_keeps_stable_code(runtime_bundle) -> None:
    runtime_bundle.engine.error = InferenceServiceError(
        code="NO_PERSON_DETECTED",
        message="No person met the detector confidence threshold.",
        status_code=422,
        retryable=True,
    )
    with _client(runtime_bundle) as client:
        response = client.post(
            "/v1/posture/keypoints",
            files={"image": ("best.jpg", _image(".jpg"), "image/jpeg")},
        )

    assert response.status_code == 422
    assert response.json()["error"] == {
        "code": "NO_PERSON_DETECTED",
        "message": "No person met the detector confidence threshold.",
        "retryable": True,
        "details": {},
    }


def test_unavailable_runtime_has_real_health_and_503_states() -> None:
    app = create_app(config=_config(), runtime_factory=lambda _: (_ for _ in ()).throw(RuntimeError("checkpoint missing")))
    with TestClient(app) as client:
        health = client.get("/health")
        inference = client.post(
            "/v1/posture/keypoints",
            files={"image": ("best.jpg", _image(".jpg"), "image/jpeg")},
        )

    assert health.status_code == 200
    assert health.json()["status"] == "unavailable"
    assert inference.status_code == 503
    assert inference.json()["error"]["code"] == "MODEL_UNAVAILABLE"
    assert "checkpoint missing" in inference.json()["error"]["message"]


def test_corrupt_image_returns_structured_decode_error(runtime_bundle) -> None:
    with _client(runtime_bundle) as client:
        response = client.post(
            "/v1/posture/keypoints",
            files={"image": ("broken.webp", b"broken", "image/webp")},
        )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "IMAGE_DECODE_FAILED"


def _client(runtime_bundle) -> TestClient:
    return TestClient(create_app(config=_config(), runtime_factory=lambda _: runtime_bundle))


def _config() -> ServiceConfig:
    return ServiceConfig(max_upload_mb=1, max_image_pixels=1000)


def _image(extension: str, width: int = 8, height: int = 10) -> bytes:
    success, encoded = cv2.imencode(extension, np.zeros((height, width, 3), dtype=np.uint8))
    assert success
    return encoded.tobytes()
