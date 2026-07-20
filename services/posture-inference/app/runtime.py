from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from time import perf_counter
from typing import Protocol

import numpy as np
from numpy.typing import NDArray

from .config import ServiceConfig
from .inference import InferenceOutput, load_openmmlab_engine
from .model_manifest import VerifiedArtifact, verify_model_files
from .schemas import ModelProvenance, RuntimeInfo


class InferenceRunner(Protocol):
    def infer(self, image: NDArray[np.uint8]) -> InferenceOutput: ...


@dataclass
class RuntimeBundle:
    engine: InferenceRunner
    model: ModelProvenance
    detector: ModelProvenance
    runtime: RuntimeInfo
    model_load_time_ms: float


def create_runtime(config: ServiceConfig) -> RuntimeBundle:
    import mmcv
    import mmdet
    import mmengine
    import mmpose
    import torch
    import torchvision

    artifacts = verify_model_files(config.manifest_path, config.model_dir)
    pose_artifact = _artifact(artifacts, "pose-estimator")
    detector_artifact = _artifact(artifacts, "person-detector")
    if config.device.startswith("cuda") and not torch.cuda.is_available():
        raise RuntimeError(f"Configured CUDA device is unavailable: {config.device}")

    mmpose_root = Path(mmpose.__file__).resolve().parent / ".mim"
    detector_config = mmpose_root / "demo" / "mmdetection_cfg" / "rtmdet_m_640-8xb32_coco-person.py"
    pose_config = (
        mmpose_root
        / "configs"
        / "body_2d_keypoint"
        / "rtmpose"
        / "body8"
        / "rtmpose-m_8xb512-700e_body8-halpe26-256x192.py"
    )
    load_started = perf_counter()
    engine = load_openmmlab_engine(
        detector_config=detector_config,
        detector_checkpoint=detector_artifact.path,
        pose_config=pose_config,
        pose_checkpoint=pose_artifact.path,
        device=config.device,
        detection_score_threshold=config.detection_score_threshold,
        keypoint_score_threshold=config.keypoint_score_threshold,
    )
    if config.device.startswith("cuda"):
        torch.cuda.synchronize()
    load_time_ms = (perf_counter() - load_started) * 1000
    device_kind = "gpu" if config.device.startswith("cuda") else "cpu"
    device_name = torch.cuda.get_device_name(config.device) if device_kind == "gpu" else "CPU"
    return RuntimeBundle(
        engine=engine,
        model=_provenance(pose_artifact),
        detector=_provenance(detector_artifact),
        runtime=RuntimeInfo(
            runtime_version=torch.__version__,
            device=device_kind,
            device_name=device_name,
            cuda_version=torch.version.cuda if device_kind == "gpu" else None,
            dependency_versions={
                "torchvision": torchvision.__version__,
                "mmcv": mmcv.__version__,
                "mmengine": mmengine.__version__,
                "mmdet": mmdet.__version__,
                "mmpose": mmpose.__version__,
            },
        ),
        model_load_time_ms=load_time_ms,
    )


def _artifact(artifacts: list[VerifiedArtifact], kind: str) -> VerifiedArtifact:
    matches = [artifact for artifact in artifacts if artifact.metadata.get("kind") == kind]
    if len(matches) != 1:
        raise RuntimeError(f"Manifest must contain exactly one {kind} artifact.")
    return matches[0]


def _provenance(artifact: VerifiedArtifact) -> ModelProvenance:
    metadata = artifact.metadata
    return ModelProvenance(
        id=artifact.id,
        version=str(metadata["version"]),
        config=str(metadata["config"]),
        checkpoint_sha256=artifact.sha256,
    )
