# MuscleMap posture inference service

This local batch-one service runs the official OpenMMLab RTMDet-m person detector followed by RTMPose-m body26 through PyTorch. It returns technical keypoints and confidence values only. It does not produce posture findings, diagnoses, plans, or training recommendations.

## Windows environment

Use Python 3.10. The current reviewed GPU stack is pinned in `requirements-cu121.txt` for the RTX 3050 Laptop GPU.

```powershell
py -3.10 -m venv services/posture-inference/.venv
services/posture-inference/.venv/Scripts/python.exe -m pip install --upgrade pip wheel
services/posture-inference/.venv/Scripts/python.exe -m pip install setuptools==80.9.0 numpy==1.23.5
services/posture-inference/.venv/Scripts/python.exe -m pip install --no-build-isolation chumpy==0.70
services/posture-inference/.venv/Scripts/python.exe -m pip install -r services/posture-inference/requirements-cu121.txt
```

MMPose 1.3.2 depends on the legacy `chumpy` package. Its setup imports pip and its runtime imports NumPy aliases removed in NumPy 1.24, so the bootstrap and NumPy pin are deliberate compatibility constraints. Setuptools remains below 81 because MMEngine's installed-package lookup used by MMPose 1.3.2 imports `pkg_resources`.

## Models

Checkpoints are ignored under `models/checkpoints/`. Their exact official URLs, byte sizes, full SHA-256 values, schemas and licence notes are in `models/manifest.json`. Model verification is mandatory before initialization; the service never downloads a model while starting or handling a request.

## Run

GPU:

```powershell
$env:PYTHONPATH=(Resolve-Path 'services/posture-inference').Path
$env:POSTURE_DEVICE='cuda:0'
services/posture-inference/.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8765
```

CPU uses the same environment and checkpoints:

```powershell
$env:POSTURE_DEVICE='cpu'
services/posture-inference/.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8765
```

The frontend must set its own base URL:

```powershell
$env:VITE_POSTURE_INFERENCE_API_URL='http://127.0.0.1:8765'
```

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `POSTURE_MODEL_DIR` | service `models/checkpoints` | Local checkpoint directory |
| `POSTURE_MANIFEST_PATH` | service `models/manifest.json` | Reviewed model manifest |
| `POSTURE_DEVICE` | `cuda:0` | PyTorch device; use `cpu` for CPU reference |
| `POSTURE_MAX_UPLOAD_MB` | `10` | Encoded upload byte limit |
| `POSTURE_MAX_IMAGE_PIXELS` | `24000000` | Decoded pixel limit |
| `POSTURE_DETECTION_SCORE_THRESHOLD` | `0.3` | Eligible person threshold |
| `POSTURE_KEYPOINT_SCORE_THRESHOLD` | `0.3` | Low-confidence warning threshold |
| `POSTURE_ALLOWED_ORIGINS` | localhost Vite origins | Comma-separated CORS origins |

## API

- `GET /health`: readiness, runtime, device and loaded model IDs.
- `GET /v1/models`: detector/pose provenance, HALPE26 schema and coordinate definition.
- `POST /v1/posture/keypoints`: multipart `image` and optional `view=front|back|side`.

Supported encodings are JPEG, PNG and WebP. Response keypoints and bounding boxes are floating-point pixels in the decoded original image: top-left origin, x right, y down. The service does not mirror or normalize coordinates.

No eligible person, multiple eligible people, invalid media, corrupt images, oversized uploads, excessive decoded dimensions and unavailable models return real structured errors. Multiple people are rejected instead of silently selecting one.

## Tests

```powershell
$env:PYTHONPATH=(Resolve-Path 'services/posture-inference').Path
services/posture-inference/.venv/Scripts/python.exe -m pytest services/posture-inference/tests -q
```

Injected engines exist only in tests for HTTP contract coverage. Production app creation always uses verified official checkpoints.

## Benchmark

Run the real official detector and pose model repeatedly against an explicit local image:

```powershell
services/posture-inference/.venv/Scripts/python.exe services/posture-inference/scripts/benchmark.py --image public/exercise-media/squat/start.webp --view side --warmup-runs 5 --measured-runs 30 --output services/posture-inference/benchmark/results/gpu.json
```

Set `POSTURE_DEVICE=cpu` for the CPU reference run. Benchmark inputs must be real photographs with a recorded source and licence; generated, rendered, or pose-modified bodies are not accepted as human-validation evidence. The results directory and any temporary benchmark images are ignored. Capture Lab human images remain browser-memory-only.
