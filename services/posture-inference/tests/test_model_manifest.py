import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from app.model_manifest import ManifestError, verify_model_files


class ModelManifestTest(unittest.TestCase):
    def test_rejects_checkpoint_with_wrong_sha256(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            model_dir = Path(temporary_directory)
            checkpoint = model_dir / "pose.pth"
            checkpoint.write_bytes(b"tampered")
            manifest_path = model_dir / "manifest.json"
            manifest_path.write_text(
                json.dumps(
                    {
                        "schemaVersion": 1,
                        "artifacts": [
                            {
                                "id": "pose",
                                "file": "pose.pth",
                                "bytes": len(b"reviewed"),
                                "sha256": hashlib.sha256(b"reviewed").hexdigest(),
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )

            with self.assertRaisesRegex(ManifestError, "SHA-256 mismatch"):
                verify_model_files(manifest_path, model_dir)

    def test_accepts_exact_reviewed_checkpoint(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            model_dir = Path(temporary_directory)
            contents = b"reviewed"
            checkpoint = model_dir / "pose.pth"
            checkpoint.write_bytes(contents)
            manifest_path = model_dir / "manifest.json"
            manifest_path.write_text(
                json.dumps(
                    {
                        "schemaVersion": 1,
                        "artifacts": [
                            {
                                "id": "pose",
                                "file": "pose.pth",
                                "bytes": len(contents),
                                "sha256": hashlib.sha256(contents).hexdigest(),
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )

            verified = verify_model_files(manifest_path, model_dir)

            self.assertEqual([artifact.id for artifact in verified], ["pose"])


if __name__ == "__main__":
    unittest.main()
