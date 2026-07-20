from __future__ import annotations

from dataclasses import dataclass
from time import sleep

import numpy as np
import pytest

from app.inference import InferenceOutput
from app.runtime import RuntimeBundle
from app.schemas import (
    AnalysisWarning,
    BoundingBox,
    Keypoint,
    ModelProvenance,
    RuntimeInfo,
)


@dataclass
class StubEngine:
    error: Exception | None = None

    def infer(self, image: np.ndarray) -> InferenceOutput:
        if self.error:
            raise self.error
        sleep(0.021)
        return InferenceOutput(
            bounding_box=BoundingBox(x=10, y=20, width=60, height=75, score=0.88),
            keypoints=[Keypoint(index=index, name=f"point-{index}", x=index + 1, y=index + 2, score=0.9) for index in range(26)],
            warnings=[AnalysisWarning(code="TEST_WARNING", severity="info", message="technical test")],
            detection_time_ms=12.5,
            pose_time_ms=8.25,
        )


@pytest.fixture
def runtime_bundle() -> RuntimeBundle:
    return RuntimeBundle(
        engine=StubEngine(),
        model=ModelProvenance(
            id="rtmpose-m-body26-256x192",
            version="1.3.2",
            config="rtmpose-m_8xb512-700e_body8-halpe26-256x192",
            checkpoint_sha256="pose-sha",
        ),
        detector=ModelProvenance(
            id="rtmdet-m-person-640",
            version="3.2.0",
            config="rtmdet_m_640-8xb32_coco-person",
            checkpoint_sha256="detector-sha",
        ),
        runtime=RuntimeInfo(
            runtime_version="2.1.0+cu121",
            device="gpu",
            device_name="test gpu",
            cuda_version="12.1",
            dependency_versions={"mmpose": "1.3.2"},
        ),
        model_load_time_ms=1234.5,
    )
