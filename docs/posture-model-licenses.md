# Posture model and runtime licence inventory

Status: Phase 2 browser assets reviewed on 2026-07-19. Batch-one backend runtime and official checkpoint sources were inventoried on 2026-07-20; upstream training-dataset terms still block a production release.

## Phase 2

| Artifact | Version | Official source | Licence | Intended use | Review note |
| --- | --- | --- | --- | --- | --- |
| MediaPipe Tasks Vision Web | 0.10.35 | `@mediapipe/tasks-vision` official npm package | Apache-2.0 | Browser Pose Landmarker runtime | Pinned in package and lockfile; integrity recorded in the asset manifest |
| Pose Landmarker Full float16 | 1 | Google MediaPipe model storage | Apache-2.0 per official BlazePose GHUM model card | Default capture assistance | Not a medical model; not used for diagnosis or formal findings |
| Pose Landmarker Lite float16 | 1 | Google MediaPipe model storage | Apache-2.0 per official BlazePose GHUM model card | Explicit performance degradation | Never selected silently |
| MediaPipe WASM loaders and binaries | package 0.10.35 | Files shipped in the official npm package | Apache-2.0 | Local Worker runtime | Vite emits the pinned package files as local build assets; no runtime CDN |

Official references:

- [MediaPipe repository licence](https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE)
- [Pose Landmarker model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20BlazePose%20GHUM%203D.pdf)
- [Pose Landmarker Web guide](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js)

The model card identifies single-person full-body pose estimation as the intended class of use and documents sensitivity to scale, orientation, occlusion, lighting, noise, and motion. This experiment therefore treats the output only as capture assistance and reports explicit poor-quality states.

## Phase 3 release block

Before any backend implementation or release, separately review and record MMPose, RTMPose/RTMW checkpoints, detector weights, training-dataset conditions, MMDeploy, PyTorch, ONNX Runtime, CUDA and TensorRT terms. The MediaPipe review does not cover those artifacts.

## Batch-one PyTorch technical baseline

| Artifact | Fixed version | Official source | Local SHA-256 | Licence record | Technical-use note |
| --- | --- | --- | --- | --- | --- |
| MMPose / RTMPose body26 | MMPose 1.3.2 | Official MMPose v1.3.2 config and OpenMMLab download service | `4d3e73ddd31222b7b0db36caeda396af1d7630c3b5a60451bdfa99a79e8dbb90` | MMPose repository Apache-2.0; all contributing dataset terms remain applicable | Local keypoint interoperability testing only |
| RTMDet-m person detector | MMDetection 3.2.0 config consumed through MMPose 1.3.2 | Official MMPose detector config and OpenMMLab download service | `35b0c7406499e0d141dd6a0235db07c10d2bee8f891f8f4e353c16a009de30e8` | MMDetection repository Apache-2.0; COCO and Objects365 terms remain applicable | Local single-person detection testing only |
| MMEngine | 0.10.7 | Official OpenMMLab Python package | Installed-package hash to be recorded with environment evidence | Apache-2.0 | Runtime dependency |
| MMCV | 2.1.0 | Official OpenMMLab CUDA 12.1 / Torch 2.1 Windows wheel index | Installed-wheel hash to be recorded with environment evidence | Apache-2.0 | Runtime dependency |
| PyTorch / torchvision | 2.1.0+cu121 / 0.16.0+cu121 | Official PyTorch CUDA 12.1 package index | Installed-wheel metadata to be recorded with environment evidence | BSD-style | PyTorch reference runtime only |
| FastAPI / Pydantic / OpenCV | pinned in service requirements | Official Python package releases | Lock/install evidence to be recorded | Project-specific open-source licences | Local API and image decoding |

The RTMPose body26 configuration combines COCO-WholeBody, AI Challenger, CrowdPose, MPII, JHMDB, Halpe and PoseTrack18 training sources. The detector checkpoint identifies COCO and Objects365 person data in its official name. This inventory does not claim that Apache-2.0 for the repositories replaces dataset licences. Production or commercial release remains blocked until each upstream dataset condition and attribution requirement is reviewed.

The exact URLs, byte sizes and hashes are machine-readable in `services/posture-inference/models/manifest.json`. Real checkpoint files remain outside Git.
