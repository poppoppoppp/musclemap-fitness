from __future__ import annotations

import argparse
import hashlib
import json
import os
from collections.abc import Callable, Iterable
from pathlib import Path
from typing import Any
from urllib.parse import urlparse
from urllib.request import Request, urlopen


OFFICIAL_DOWNLOAD_HOST = "download.openmmlab.com"
DOWNLOAD_CHUNK_BYTES = 1024 * 1024


class DownloadError(RuntimeError):
    pass


def validate_artifact_source(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme != "https":
        raise DownloadError(f"Model downloads must use HTTPS: {url}")
    if parsed.hostname != OFFICIAL_DOWNLOAD_HOST:
        raise DownloadError(f"Model download is not from the official OpenMMLab host: {url}")


def download_artifact(
    artifact: dict[str, Any],
    model_dir: Path,
    *,
    fetch: Callable[[str], Iterable[bytes]] | None = None,
) -> Path:
    url = str(artifact["checkpointSource"])
    validate_artifact_source(url)
    model_dir = model_dir.resolve()
    model_dir.mkdir(parents=True, exist_ok=True)
    destination = (model_dir / str(artifact["file"])).resolve()
    if destination.parent != model_dir:
        raise DownloadError(f"Model path escapes the checkpoint directory: {artifact['file']}")
    temporary = destination.with_name(destination.name + ".download")
    expected_bytes = int(artifact["bytes"])
    expected_sha256 = str(artifact["sha256"]).lower()
    digest = hashlib.sha256()
    received_bytes = 0
    source = fetch or _fetch
    try:
        with temporary.open("xb") as output:
            for chunk in source(url):
                if not chunk:
                    continue
                output.write(chunk)
                digest.update(chunk)
                received_bytes += len(chunk)
        if received_bytes != expected_bytes:
            raise DownloadError(
                f"Size mismatch for {artifact['id']}: expected {expected_bytes}, received {received_bytes}."
            )
        received_sha256 = digest.hexdigest()
        if received_sha256 != expected_sha256:
            raise DownloadError(
                f"SHA-256 mismatch for {artifact['id']}: expected {expected_sha256}, received {received_sha256}."
            )
        os.replace(temporary, destination)
        return destination
    finally:
        temporary.unlink(missing_ok=True)


def _fetch(url: str) -> Iterable[bytes]:
    request = Request(url, headers={"User-Agent": "MuscleMap-posture-model-acquirer/1.0"})
    with urlopen(request, timeout=120) as response:
        validate_artifact_source(response.geturl())
        while chunk := response.read(DOWNLOAD_CHUNK_BYTES):
            yield chunk


def main() -> None:
    parser = argparse.ArgumentParser(description="Download reviewed official OpenMMLab posture checkpoints.")
    parser.add_argument("--manifest", type=Path, default=Path(__file__).parents[1] / "models" / "manifest.json")
    parser.add_argument("--model-dir", type=Path, default=Path(__file__).parents[1] / "models" / "checkpoints")
    arguments = parser.parse_args()
    manifest = json.loads(arguments.manifest.read_text(encoding="utf-8"))
    for artifact in manifest["artifacts"]:
        path = download_artifact(artifact, arguments.model_dir)
        print(f"Verified and saved {artifact['id']} to {path}")


if __name__ == "__main__":
    main()
