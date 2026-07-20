from __future__ import annotations

import argparse
import sys
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from app.model_manifest import verify_model_files


def main() -> None:
    service_root = Path(__file__).parents[1]
    parser = argparse.ArgumentParser(description="Verify local posture checkpoints against the reviewed manifest.")
    parser.add_argument("--manifest", type=Path, default=service_root / "models" / "manifest.json")
    parser.add_argument("--model-dir", type=Path, default=service_root / "models" / "checkpoints")
    arguments = parser.parse_args()
    artifacts = verify_model_files(arguments.manifest, arguments.model_dir)
    for artifact in artifacts:
        print(f"{artifact.id}\t{artifact.bytes}\t{artifact.sha256}")


if __name__ == "__main__":
    main()
