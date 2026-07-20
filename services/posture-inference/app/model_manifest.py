from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


class ManifestError(RuntimeError):
    """Raised when a reviewed model artifact is missing or altered."""


@dataclass(frozen=True)
class VerifiedArtifact:
    id: str
    path: Path
    bytes: int
    sha256: str
    metadata: dict[str, Any]


def verify_model_files(manifest_path: Path, model_dir: Path) -> list[VerifiedArtifact]:
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ManifestError(f"Model manifest is missing or invalid: {manifest_path}") from error

    if manifest.get("schemaVersion") != 1 or not isinstance(manifest.get("artifacts"), list):
        raise ManifestError("Model manifest schema is invalid.")

    verified: list[VerifiedArtifact] = []
    for item in manifest["artifacts"]:
        artifact_id = _required(item, "id")
        file_name = _required(item, "file")
        expected_bytes = item.get("bytes")
        expected_sha256 = _required(item, "sha256").lower()
        path = (model_dir / file_name).resolve()
        if path.parent != model_dir.resolve():
            raise ManifestError(f"Model path escapes the model directory: {file_name}")
        try:
            actual_bytes = path.stat().st_size
        except OSError as error:
            raise ManifestError(f"Model checkpoint is missing: {artifact_id} ({path})") from error
        if actual_bytes != expected_bytes:
            raise ManifestError(
                f"Model size mismatch for {artifact_id}: expected {expected_bytes}, received {actual_bytes}."
            )
        actual_sha256 = _sha256(path)
        if actual_sha256 != expected_sha256:
            raise ManifestError(
                f"Model SHA-256 mismatch for {artifact_id}: expected {expected_sha256}, received {actual_sha256}."
            )
        verified.append(
            VerifiedArtifact(
                id=artifact_id,
                path=path,
                bytes=actual_bytes,
                sha256=actual_sha256,
                metadata=dict(item),
            )
        )
    return verified


def _required(item: Any, key: str) -> str:
    if not isinstance(item, dict) or not isinstance(item.get(key), str) or not item[key]:
        raise ManifestError(f"Model manifest artifact is missing {key}.")
    return item[key]


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as checkpoint:
        for chunk in iter(lambda: checkpoint.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()
