from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from time import perf_counter
from typing import Protocol

import numpy as np
from numpy.typing import NDArray

from .errors import InferenceServiceError
from .schemas import AnalysisWarning, BoundingBox, HALPE26_NAMES, Keypoint


@dataclass(frozen=True)
class DetectionCandidate:
    x1: float
    y1: float
    x2: float
    y2: float
    score: float


@dataclass(frozen=True)
class PoseOutput:
    keypoints: NDArray[np.floating]
    scores: NDArray[np.floating]


@dataclass(frozen=True)
class InferenceOutput:
    bounding_box: BoundingBox
    keypoints: list[Keypoint]
    warnings: list[AnalysisWarning]
    detection_time_ms: float
    pose_time_ms: float


@dataclass(frozen=True)
class DetectionSelection:
    primary: DetectionCandidate
    ignored: list[DetectionCandidate]


class PersonDetector(Protocol):
    def detect(self, image: NDArray[np.uint8]) -> list[DetectionCandidate]: ...


class PoseEstimator(Protocol):
    def infer(self, image: NDArray[np.uint8], detection: DetectionCandidate) -> PoseOutput: ...


class InferenceEngine:
    def __init__(
        self,
        detector: PersonDetector,
        pose_estimator: PoseEstimator,
        *,
        detection_score_threshold: float,
        keypoint_score_threshold: float,
        secondary_person_score_ratio_threshold: float = 0.65,
        secondary_person_area_ratio_threshold: float = 0.25,
        synchronize: Callable[[], None] | None = None,
    ) -> None:
        self.detector = detector
        self.pose_estimator = pose_estimator
        self.detection_score_threshold = detection_score_threshold
        self.keypoint_score_threshold = keypoint_score_threshold
        self.secondary_person_score_ratio_threshold = secondary_person_score_ratio_threshold
        self.secondary_person_area_ratio_threshold = secondary_person_area_ratio_threshold
        self.synchronize = synchronize or (lambda: None)

    def infer(self, image: NDArray[np.uint8]) -> InferenceOutput:
        self.synchronize()
        detection_started = perf_counter()
        detections = self.detector.detect(image)
        self.synchronize()
        detection_time_ms = (perf_counter() - detection_started) * 1000
        selection = select_dominant_person(
            detections,
            detection_score_threshold=self.detection_score_threshold,
            secondary_score_ratio_threshold=self.secondary_person_score_ratio_threshold,
            secondary_area_ratio_threshold=self.secondary_person_area_ratio_threshold,
        )
        detection = selection.primary
        self.synchronize()
        pose_started = perf_counter()
        pose = self.pose_estimator.infer(image, detection)
        self.synchronize()
        pose_time_ms = (perf_counter() - pose_started) * 1000
        if pose.keypoints.shape != (26, 2) or pose.scores.shape != (26,):
            raise InferenceServiceError(
                code="MODEL_OUTPUT_INVALID",
                message="RTMPose returned an unexpected keypoint shape.",
                status_code=500,
                retryable=False,
                details={"keypointsShape": list(pose.keypoints.shape), "scoresShape": list(pose.scores.shape)},
            )

        keypoints = [
            Keypoint(
                index=index,
                name=name,
                x=float(pose.keypoints[index, 0]),
                y=float(pose.keypoints[index, 1]),
                score=float(pose.scores[index]),
            )
            for index, name in enumerate(HALPE26_NAMES)
        ]
        low_confidence = [point.index for point in keypoints if point.score < self.keypoint_score_threshold]
        warnings = []
        if selection.ignored:
            warnings.append(
                AnalysisWarning(
                    code="IGNORED_WEAK_PERSON_CANDIDATE",
                    severity="warning",
                    message=f"Ignored {len(selection.ignored)} weak or small secondary person candidate(s).",
                    details=_selection_diagnostics(
                        detection,
                        selection.ignored,
                        secondary_score_ratio_threshold=self.secondary_person_score_ratio_threshold,
                        secondary_area_ratio_threshold=self.secondary_person_area_ratio_threshold,
                    ),
                )
            )
        if low_confidence:
            warnings.append(
                AnalysisWarning(
                    code="LOW_CONFIDENCE_KEYPOINTS",
                    severity="warning",
                    message=f"{len(low_confidence)} keypoints are below the configured confidence threshold.",
                    keypoint_indices=low_confidence,
                )
            )
        return InferenceOutput(
            bounding_box=BoundingBox(
                x=detection.x1,
                y=detection.y1,
                width=detection.x2 - detection.x1,
                height=detection.y2 - detection.y1,
                score=detection.score,
            ),
            keypoints=keypoints,
            warnings=warnings,
            detection_time_ms=detection_time_ms,
            pose_time_ms=pose_time_ms,
        )


def select_dominant_person(
    detections: list[DetectionCandidate],
    *,
    detection_score_threshold: float,
    secondary_score_ratio_threshold: float,
    secondary_area_ratio_threshold: float,
) -> DetectionSelection:
    eligible = sorted(
        (detection for detection in detections if detection.score >= detection_score_threshold),
        key=lambda detection: detection.score,
        reverse=True,
    )
    if not eligible:
        raise InferenceServiceError(
            code="NO_PERSON_DETECTED",
            message="No person met the detector confidence threshold.",
            status_code=422,
            retryable=True,
            details={"detectionScoreThreshold": detection_score_threshold},
        )

    primary = eligible[0]
    secondary = eligible[1:]
    plausible_secondary = [
        candidate
        for candidate in secondary
        if _score_ratio(candidate, primary) >= secondary_score_ratio_threshold
        and _area_ratio(candidate, primary) >= secondary_area_ratio_threshold
    ]
    if plausible_secondary:
        raise InferenceServiceError(
            code="MULTIPLE_PEOPLE_DETECTED",
            message="More than one plausible person met the detector policy.",
            status_code=422,
            retryable=True,
            details={
                "personCount": 1 + len(plausible_secondary),
                "eligibleCandidateCount": len(eligible),
                "detectionScoreThreshold": detection_score_threshold,
                **_selection_diagnostics(
                    primary,
                    secondary,
                    secondary_score_ratio_threshold=secondary_score_ratio_threshold,
                    secondary_area_ratio_threshold=secondary_area_ratio_threshold,
                ),
            },
        )
    return DetectionSelection(primary=primary, ignored=secondary)


def _selection_diagnostics(
    primary: DetectionCandidate,
    secondary: list[DetectionCandidate],
    *,
    secondary_score_ratio_threshold: float,
    secondary_area_ratio_threshold: float,
) -> dict[str, object]:
    return {
        "primaryScore": primary.score,
        "secondaryScoreRatioThreshold": secondary_score_ratio_threshold,
        "secondaryAreaRatioThreshold": secondary_area_ratio_threshold,
        "secondaryCandidates": [
            {
                "score": candidate.score,
                "scoreRatio": _score_ratio(candidate, primary),
                "areaRatio": _area_ratio(candidate, primary),
                "boundingBox": {
                    "x": candidate.x1,
                    "y": candidate.y1,
                    "width": candidate.x2 - candidate.x1,
                    "height": candidate.y2 - candidate.y1,
                },
            }
            for candidate in secondary
        ],
    }


def _score_ratio(candidate: DetectionCandidate, primary: DetectionCandidate) -> float:
    return candidate.score / primary.score if primary.score > 0 else 0.0


def _area_ratio(candidate: DetectionCandidate, primary: DetectionCandidate) -> float:
    primary_area = max(0.0, primary.x2 - primary.x1) * max(0.0, primary.y2 - primary.y1)
    candidate_area = max(0.0, candidate.x2 - candidate.x1) * max(0.0, candidate.y2 - candidate.y1)
    return candidate_area / primary_area if primary_area > 0 else 0.0


class OpenMMLabDetector:
    def __init__(self, config_path: Path, checkpoint_path: Path, device: str) -> None:
        from mmdet.apis import init_detector

        self.model = init_detector(str(config_path), str(checkpoint_path), device=device)

    def detect(self, image: NDArray[np.uint8]) -> list[DetectionCandidate]:
        from mmdet.apis import inference_detector
        from mmengine.registry import init_default_scope

        init_default_scope("mmdet")
        sample = inference_detector(self.model, image)
        instances = sample.pred_instances.cpu().numpy()
        return [
            DetectionCandidate(
                x1=float(box[0]),
                y1=float(box[1]),
                x2=float(box[2]),
                y2=float(box[3]),
                score=float(score),
            )
            for box, score, label in zip(instances.bboxes, instances.scores, instances.labels)
            if int(label) == 0
        ]


class OpenMMLabPoseEstimator:
    def __init__(self, config_path: Path, checkpoint_path: Path, device: str) -> None:
        from mmpose.apis import init_model

        self.model = init_model(str(config_path), str(checkpoint_path), device=device)

    def infer(self, image: NDArray[np.uint8], detection: DetectionCandidate) -> PoseOutput:
        from mmengine.registry import init_default_scope
        from mmpose.apis import inference_topdown

        init_default_scope("mmpose")
        boxes = np.asarray([[detection.x1, detection.y1, detection.x2, detection.y2]], dtype=np.float32)
        samples = inference_topdown(self.model, image, bboxes=boxes, bbox_format="xyxy")
        if len(samples) != 1:
            raise InferenceServiceError(
                code="MODEL_OUTPUT_INVALID",
                message="RTMPose did not return exactly one top-down result.",
                status_code=500,
                retryable=False,
            )
        instances = samples[0].pred_instances
        return PoseOutput(
            keypoints=np.asarray(instances.keypoints[0], dtype=float),
            scores=np.asarray(instances.keypoint_scores[0], dtype=float),
        )


def load_openmmlab_engine(
    *,
    detector_config: Path,
    detector_checkpoint: Path,
    pose_config: Path,
    pose_checkpoint: Path,
    device: str,
    detection_score_threshold: float,
    secondary_person_score_ratio_threshold: float,
    secondary_person_area_ratio_threshold: float,
    keypoint_score_threshold: float,
) -> InferenceEngine:
    from mmdet.utils import register_all_modules as register_mmdet_modules
    from mmpose.utils import register_all_modules as register_mmpose_modules

    register_mmdet_modules(init_default_scope=True)
    register_mmpose_modules(init_default_scope=True)
    detector = OpenMMLabDetector(detector_config, detector_checkpoint, device)
    pose_estimator = OpenMMLabPoseEstimator(pose_config, pose_checkpoint, device)

    synchronize = None
    if device.startswith("cuda"):
        import torch

        synchronize = torch.cuda.synchronize
    return InferenceEngine(
        detector,
        pose_estimator,
        detection_score_threshold=detection_score_threshold,
        secondary_person_score_ratio_threshold=secondary_person_score_ratio_threshold,
        secondary_person_area_ratio_threshold=secondary_person_area_ratio_threshold,
        keypoint_score_threshold=keypoint_score_threshold,
        synchronize=synchronize,
    )
