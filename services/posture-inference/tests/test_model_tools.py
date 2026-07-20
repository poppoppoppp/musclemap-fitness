import hashlib
import subprocess
import sys
from pathlib import Path

import pytest

from scripts.download_models import DownloadError, download_artifact, validate_artifact_source


def test_accepts_only_official_openmmlab_https_downloads() -> None:
    validate_artifact_source("https://download.openmmlab.com/mmpose/model.pth")

    with pytest.raises(DownloadError, match="official OpenMMLab"):
        validate_artifact_source("https://example.com/model.pth")
    with pytest.raises(DownloadError, match="HTTPS"):
        validate_artifact_source("http://download.openmmlab.com/mmpose/model.pth")


def test_hash_mismatch_does_not_replace_existing_checkpoint(tmp_path: Path) -> None:
    destination = tmp_path / "model.pth"
    destination.write_bytes(b"existing")
    artifact = {
        "id": "pose",
        "checkpointSource": "https://download.openmmlab.com/mmpose/model.pth",
        "file": destination.name,
        "bytes": len(b"reviewed"),
        "sha256": hashlib.sha256(b"reviewed").hexdigest(),
    }

    with pytest.raises(DownloadError, match="SHA-256 mismatch"):
        download_artifact(artifact, tmp_path, fetch=lambda _: [b"tampered"])

    assert destination.read_bytes() == b"existing"
    assert not (tmp_path / "model.pth.download").exists()


def test_verified_download_atomically_replaces_destination(tmp_path: Path) -> None:
    contents = b"reviewed"
    artifact = {
        "id": "pose",
        "checkpointSource": "https://download.openmmlab.com/mmpose/model.pth",
        "file": "model.pth",
        "bytes": len(contents),
        "sha256": hashlib.sha256(contents).hexdigest(),
    }

    result = download_artifact(artifact, tmp_path, fetch=lambda _: [b"rev", b"iewed"])

    assert result == tmp_path / "model.pth"
    assert result.read_bytes() == contents
    assert not (tmp_path / "model.pth.download").exists()


@pytest.mark.parametrize("script", ["verify_models.py", "benchmark.py"])
def test_service_scripts_can_be_invoked_directly(script: str) -> None:
    service_root = Path(__file__).parents[1]

    result = subprocess.run(
        [sys.executable, str(service_root / "scripts" / script), "--help"],
        cwd=service_root,
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr
