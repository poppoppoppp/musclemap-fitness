from __future__ import annotations

import argparse
import json
import statistics
import sys
from pathlib import Path
from time import perf_counter
from typing import Any

import cv2
import psutil

SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from app.config import ServiceConfig
from app.errors import InferenceServiceError
from app.runtime import create_runtime


def main() -> None:
    parser = argparse.ArgumentParser(description="Benchmark real RTMDet + RTMPose PyTorch inference.")
    parser.add_argument("--device", choices=["cpu", "cuda:0"], required=True)
    parser.add_argument("--image", action="append", required=True, help="VIEW=PATH; may be repeated")
    parser.add_argument("--warmup", type=int, default=5)
    parser.add_argument("--runs", type=int, default=30)
    parser.add_argument("--output", type=Path)
    arguments = parser.parse_args()
    images = [_parse_image(value) for value in arguments.image]
    process = psutil.Process()
    rss_before = process.memory_info().rss
    config = ServiceConfig(device=arguments.device)

    runtime_started = perf_counter()
    bundle = create_runtime(config)
    runtime_total_ms = (perf_counter() - runtime_started) * 1000
    rss_after_load = process.memory_info().rss
    torch = None
    if arguments.device.startswith("cuda"):
        import torch as torch_module

        torch = torch_module
        torch.cuda.reset_peak_memory_stats()

    results: list[dict[str, Any]] = []
    for view, path in images:
        image = cv2.imread(str(path), cv2.IMREAD_COLOR)
        if image is None:
            raise RuntimeError(f"Cannot decode benchmark image: {path}")
        first = _run_once(bundle, image)
        for _ in range(arguments.warmup):
            _run_once(bundle, image)
        samples: list[float] = []
        errors: list[dict[str, Any]] = []
        for _ in range(arguments.runs):
            try:
                samples.append(_run_once(bundle, image)["totalMs"])
            except InferenceServiceError as error:
                errors.append({"code": error.code, "message": error.message})
        results.append(
            {
                "view": view,
                "path": str(path),
                "width": int(image.shape[1]),
                "height": int(image.shape[0]),
                "firstInference": first,
                "warmed": _summary(samples),
                "errors": errors,
            }
        )

    report = {
        "device": bundle.runtime.model_dump(by_alias=True),
        "model": bundle.model.model_dump(by_alias=True),
        "detector": bundle.detector.model_dump(by_alias=True),
        "modelLoadMs": bundle.model_load_time_ms,
        "runtimeCreationMs": runtime_total_ms,
        "rssBytes": {
            "beforeLoad": rss_before,
            "afterLoad": rss_after_load,
            "final": process.memory_info().rss,
        },
        "cudaMemoryBytes": None
        if torch is None
        else {
            "allocated": torch.cuda.memory_allocated(),
            "reserved": torch.cuda.memory_reserved(),
            "peakAllocated": torch.cuda.max_memory_allocated(),
            "peakReserved": torch.cuda.max_memory_reserved(),
        },
        "warmupRuns": arguments.warmup,
        "measuredRuns": arguments.runs,
        "images": results,
    }
    serialized = json.dumps(report, ensure_ascii=False, indent=2)
    if arguments.output:
        arguments.output.parent.mkdir(parents=True, exist_ok=True)
        arguments.output.write_text(serialized, encoding="utf-8")
    print(serialized)


def _parse_image(value: str) -> tuple[str, Path]:
    if "=" not in value:
        raise argparse.ArgumentTypeError("--image must use VIEW=PATH")
    view, path = value.split("=", 1)
    if view not in {"front", "side", "back", "none", "multiple"}:
        raise argparse.ArgumentTypeError(f"Unsupported benchmark view: {view}")
    return view, Path(path)


def _run_once(bundle, image) -> dict[str, float]:
    started = perf_counter()
    output = bundle.engine.infer(image)
    total_ms = (perf_counter() - started) * 1000
    return {
        "totalMs": total_ms,
        "detectionMs": output.detection_time_ms,
        "poseMs": output.pose_time_ms,
    }


def _summary(samples: list[float]) -> dict[str, float | int | None]:
    if not samples:
        return {"count": 0, "meanMs": None, "p50Ms": None, "p95Ms": None, "maxMs": None}
    ordered = sorted(samples)
    return {
        "count": len(samples),
        "meanMs": statistics.fmean(samples),
        "p50Ms": _percentile(ordered, 0.5),
        "p95Ms": _percentile(ordered, 0.95),
        "maxMs": max(samples),
    }


def _percentile(ordered: list[float], quantile: float) -> float:
    index = (len(ordered) - 1) * quantile
    lower = int(index)
    upper = min(lower + 1, len(ordered) - 1)
    fraction = index - lower
    return ordered[lower] * (1 - fraction) + ordered[upper] * fraction


if __name__ == "__main__":
    main()
