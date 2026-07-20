import numpy as np
import pytest

from app.errors import InferenceServiceError
from app.inference import (
    DetectionCandidate,
    InferenceEngine,
    OpenMMLabDetector,
    OpenMMLabPoseEstimator,
    PoseOutput,
)
from app.schemas import HALPE26_NAMES


class StubDetector:
    def __init__(self, detections: list[DetectionCandidate]) -> None:
        self.detections = detections
        self.calls = 0

    def detect(self, image: np.ndarray) -> list[DetectionCandidate]:
        self.calls += 1
        return self.detections


class StubPoseEstimator:
    def __init__(self, output: PoseOutput | None = None) -> None:
        points = np.column_stack((np.arange(26, dtype=float), np.arange(26, dtype=float) + 0.5))
        self.output = output or PoseOutput(keypoints=points, scores=np.full(26, 0.9))
        self.calls = 0
        self.last_box: DetectionCandidate | None = None

    def infer(self, image: np.ndarray, detection: DetectionCandidate) -> PoseOutput:
        self.calls += 1
        self.last_box = detection
        return self.output


def test_rejects_image_without_an_eligible_person() -> None:
    engine = InferenceEngine(StubDetector([]), StubPoseEstimator(), detection_score_threshold=0.3, keypoint_score_threshold=0.3)

    with pytest.raises(InferenceServiceError) as caught:
        engine.infer(np.zeros((100, 80, 3), dtype=np.uint8))

    assert caught.value.code == "NO_PERSON_DETECTED"
    assert caught.value.retryable is True


def test_rejects_multiple_people_instead_of_selecting_silently() -> None:
    detections = [
        DetectionCandidate(1, 2, 30, 90, 0.95),
        DetectionCandidate(40, 3, 79, 95, 0.8),
    ]
    pose = StubPoseEstimator()
    engine = InferenceEngine(StubDetector(detections), pose, detection_score_threshold=0.3, keypoint_score_threshold=0.3)

    with pytest.raises(InferenceServiceError) as caught:
        engine.infer(np.zeros((100, 80, 3), dtype=np.uint8))

    assert caught.value.code == "MULTIPLE_PEOPLE_DETECTED"
    assert caught.value.details["personCount"] == 2
    assert pose.calls == 0


def test_returns_ordered_halpe26_pixels_box_confidence_warnings_and_timings() -> None:
    scores = np.full(26, 0.9)
    scores[[3, 20]] = [0.2, 0.1]
    keypoints = np.column_stack((np.arange(26, dtype=float) + 10, np.arange(26, dtype=float) + 20))
    detection = DetectionCandidate(10, 20, 70, 95, 0.88)
    detector = StubDetector([detection])
    pose = StubPoseEstimator(PoseOutput(keypoints=keypoints, scores=scores))
    engine = InferenceEngine(detector, pose, detection_score_threshold=0.3, keypoint_score_threshold=0.3)

    result = engine.infer(np.zeros((100, 80, 3), dtype=np.uint8))

    assert result.bounding_box.model_dump() == {"x": 10.0, "y": 20.0, "width": 60.0, "height": 75.0, "score": 0.88}
    assert len(result.keypoints) == 26
    assert [(point.index, point.name) for point in result.keypoints] == list(enumerate(HALPE26_NAMES))
    assert result.keypoints[25].model_dump() == {"index": 25, "name": "right_heel", "x": 35.0, "y": 45.0, "score": 0.9}
    assert result.warnings[0].code == "LOW_CONFIDENCE_KEYPOINTS"
    assert result.warnings[0].keypoint_indices == [3, 20]
    assert result.detection_time_ms >= 0
    assert result.pose_time_ms >= 0
    assert pose.last_box == detection


def test_rejects_invalid_pose_output_shape() -> None:
    invalid = PoseOutput(keypoints=np.zeros((25, 2)), scores=np.ones(25))
    engine = InferenceEngine(
        StubDetector([DetectionCandidate(1, 2, 30, 90, 0.95)]),
        StubPoseEstimator(invalid),
        detection_score_threshold=0.3,
        keypoint_score_threshold=0.3,
    )

    with pytest.raises(InferenceServiceError) as caught:
        engine.infer(np.zeros((100, 80, 3), dtype=np.uint8))

    assert caught.value.code == "MODEL_OUTPUT_INVALID"
    assert caught.value.status_code == 500


def test_reuses_injected_model_instances_across_inferences() -> None:
    detector = StubDetector([DetectionCandidate(1, 2, 30, 90, 0.95)])
    pose = StubPoseEstimator()
    engine = InferenceEngine(detector, pose, detection_score_threshold=0.3, keypoint_score_threshold=0.3)

    engine.infer(np.zeros((100, 80, 3), dtype=np.uint8))
    engine.infer(np.zeros((100, 80, 3), dtype=np.uint8))

    assert detector.calls == 2
    assert pose.calls == 2


def test_openmmlab_adapters_restore_their_registry_scope(monkeypatch: pytest.MonkeyPatch) -> None:
    scopes: list[str] = []
    monkeypatch.setattr("mmengine.registry.init_default_scope", scopes.append)

    class DetectorInstances:
        bboxes = np.asarray([[1, 2, 30, 90]], dtype=float)
        scores = np.asarray([0.95], dtype=float)
        labels = np.asarray([0], dtype=int)

        def cpu(self) -> "DetectorInstances":
            return self

        def numpy(self) -> "DetectorInstances":
            return self

    detector = OpenMMLabDetector.__new__(OpenMMLabDetector)
    detector.model = object()
    monkeypatch.setattr(
        "mmdet.apis.inference_detector",
        lambda model, image: type("Sample", (), {"pred_instances": DetectorInstances()})(),
    )

    pose = OpenMMLabPoseEstimator.__new__(OpenMMLabPoseEstimator)
    pose.model = object()
    pose_instances = type(
        "PoseInstances",
        (),
        {"keypoints": np.zeros((1, 26, 2)), "keypoint_scores": np.ones((1, 26))},
    )()
    monkeypatch.setattr(
        "mmpose.apis.inference_topdown",
        lambda model, image, **kwargs: [type("Sample", (), {"pred_instances": pose_instances})()],
    )

    image = np.zeros((100, 80, 3), dtype=np.uint8)
    detection = detector.detect(image)[0]
    pose.infer(image, detection)

    assert scopes == ["mmdet", "mmpose"]
