from __future__ import annotations

from math import atan2, degrees, isfinite
from statistics import median
from typing import Sequence

import numpy as np

from .config import (
    ANALYSIS_VERSION,
    EMA_ALPHA,
    MEDIAN_WINDOW,
    MIN_KEYPOINT_SCORE,
    MOVEMENT_CONFIGS,
    OUTLIER_MAD_MULTIPLIER,
    MovementId,
)
from .geometry import angle_between, distance, line_angle_degrees, midpoint, normalize_point, signed_distance_to_line
from .models import (
    AnalysisPoint,
    MetricResult,
    MetricValue,
    MovementAnalysisResult,
    MovementInputFrame,
    MovementPhases,
    NormalizedPoint,
    ProcessedMovementFrame,
    RawMovementFrame,
    Trajectory,
    TrajectorySample,
)


def select_frames_by_timestamp(
    frames: Sequence[MovementInputFrame],
    *,
    target_fps: int,
    max_frames: int,
) -> list[MovementInputFrame]:
    if target_fps <= 0 or max_frames <= 0:
        raise ValueError("Sampling frequency and frame limit must be positive.")
    ordered = sorted(frames, key=lambda frame: frame.timestamp_ms)
    if len(ordered) <= 1:
        return list(ordered[:max_frames])
    duration = ordered[-1].timestamp_ms - ordered[0].timestamp_ms
    if duration < 0:
        raise ValueError("Frame timestamps must increase.")
    desired = int(duration * target_fps // 1000) + 1
    count = min(max_frames, desired)
    if len(ordered) <= count:
        return list(ordered)
    if count <= 1:
        return [ordered[0]]
    if desired > max_frames:
        targets = np.linspace(ordered[0].timestamp_ms, ordered[-1].timestamp_ms, count)
    else:
        interval = 1000 / target_fps
        targets = np.asarray([ordered[0].timestamp_ms + index * interval for index in range(count)])
    selected: list[MovementInputFrame] = []
    previous_index = -1
    for target_index, target in enumerate(targets):
        remaining = len(targets) - target_index - 1
        last_allowed = len(ordered) - remaining - 1
        candidate_index = min(
            range(previous_index + 1, last_allowed + 1),
            key=lambda index: abs(ordered[index].timestamp_ms - float(target)),
        )
        selected.append(ordered[candidate_index])
        previous_index = candidate_index
    return selected


def analyze_movement(
    frames: Sequence[MovementInputFrame],
    *,
    action: MovementId,
    view: str,
    visible_side: str | None = None,
    model_id: str = "unknown",
    model_version: str = "unknown",
) -> MovementAnalysisResult:
    config = MOVEMENT_CONFIGS[action]
    required = _required_names(action, visible_side)
    configuration_reasons: list[str] = []
    if view != config.required_view:
        configuration_reasons.append(f"VIEW_NOT_SUPPORTED:{view}")
    if action == "neck-retraction" and visible_side not in ("left", "right"):
        configuration_reasons.append("VISIBLE_SIDE_REQUIRED")
    if len(frames) > config.max_frames:
        configuration_reasons.append("FRAME_LIMIT_EXCEEDED")
    if any(frames[index].timestamp_ms >= frames[index + 1].timestamp_ms for index in range(len(frames) - 1)):
        configuration_reasons.append("TIMESTAMPS_NOT_STRICTLY_INCREASING")

    raw_frames: list[RawMovementFrame] = []
    normalized_by_index: dict[int, tuple[NormalizedPoint, ...]] = {}
    raw_signals: dict[int, dict[str, float]] = {}
    for frame in frames:
        reasons = list(configuration_reasons)
        if frame.failure_reason:
            reasons.append(frame.failure_reason)
        point_map = {point.name: point for point in frame.keypoints}
        reasons.extend(_point_reasons(point_map, required))
        normalized: tuple[NormalizedPoint, ...] = ()
        if not reasons:
            try:
                normalized = _normalize_frame(frame, point_map, action, visible_side)
                raw_signals[frame.index] = _signals(action, _analysis_map(normalized), visible_side)
            except (KeyError, ValueError):
                reasons.append("DEGENERATE_GEOMETRY")
        normalized_by_index[frame.index] = normalized
        raw_frames.append(
            RawMovementFrame(
                index=frame.index,
                timestamp_ms=frame.timestamp_ms,
                keypoints=frame.keypoints,
                bounding_box=frame.bounding_box,
                valid=not reasons,
                reasons=tuple(reasons),
            )
        )

    driver_by_index = {index: signals["driver"] for index, signals in raw_signals.items()}
    outlier_indices = _local_outliers(driver_by_index, raw_frames)
    filtered_by_index = _filter_keypoints(normalized_by_index, raw_frames, outlier_indices, config.analysis_fps)
    processed_frames = tuple(
        ProcessedMovementFrame(
            index=frame.index,
            timestamp_ms=frame.timestamp_ms,
            normalized_keypoints=normalized_by_index.get(frame.index, ()),
            filtered_keypoints=filtered_by_index.get(frame.index, ()),
            valid=frame.valid and frame.index not in outlier_indices,
            outlier=frame.index in outlier_indices,
            reasons=frame.reasons + (("OUTLIER_FRAME",) if frame.index in outlier_indices else ()),
        )
        for frame in raw_frames
    )
    filtered_signals = {
        frame.index: _signals(action, _analysis_map(frame.filtered_keypoints), visible_side)
        for frame in processed_frames
        if frame.valid and frame.filtered_keypoints
    }
    phase_driver = _median_signal(driver_by_index, raw_frames, outlier_indices)
    phases = _segment(
        phase_driver,
        raw_frames,
        absolute_from_baseline=action == "neck-retraction",
        minimum_hold_ms=config.minimum_hold_ms,
    )
    trajectories = _trajectories(action, filtered_signals, raw_frames)
    confidence = min(
        (point.score for frame in raw_frames if frame.valid for point in frame.keypoints if point.name in required),
        default=None,
    )
    metrics = _movement_metrics(
        action,
        filtered_signals,
        phases,
        trajectories,
        confidence,
        model_id,
        model_version,
    )
    return MovementAnalysisResult(
        analysis_version=ANALYSIS_VERSION,
        action=action,
        view=view,
        visible_side=visible_side,
        status="valid" if phases.status == "complete" else "incomplete",
        required_keypoints=required,
        raw_frames=tuple(raw_frames),
        processed_frames=processed_frames,
        phases=phases,
        metrics=metrics,
        trajectories=trajectories,
    )


def _required_names(action: MovementId, visible_side: str | None) -> tuple[str, ...]:
    if action == "bilateral-arm-raise":
        return ("left_shoulder", "right_shoulder", "left_hip", "right_hip", "left_wrist", "right_wrist")
    if action == "bodyweight-squat":
        return ("left_shoulder", "right_shoulder", "left_hip", "right_hip", "left_knee", "right_knee", "left_ankle", "right_ankle")
    side = visible_side if visible_side in ("left", "right") else "visible"
    return ("nose", f"{side}_ear", f"{side}_shoulder", f"{side}_hip")


def _point_reasons(points: dict[str, AnalysisPoint], required: tuple[str, ...]) -> list[str]:
    reasons = []
    for name in required:
        point = points.get(name)
        if point is None:
            reasons.append(f"MISSING_KEYPOINT:{name}")
        elif not all(isfinite(value) for value in (point.x, point.y, point.score)):
            reasons.append(f"NON_FINITE_KEYPOINT:{name}")
        elif point.score < MIN_KEYPOINT_SCORE:
            reasons.append(f"LOW_CONFIDENCE_KEYPOINT:{name}")
    return reasons


def _normalize_frame(
    frame: MovementInputFrame,
    points: dict[str, AnalysisPoint],
    action: MovementId,
    visible_side: str | None,
) -> tuple[NormalizedPoint, ...]:
    x, y, width, height = frame.bounding_box
    center = (x + width / 2, y + height / 2)
    if action == "neck-retraction":
        scale = distance(points[f"{visible_side}_shoulder"], points[f"{visible_side}_hip"])
    else:
        scale = distance(points["left_shoulder"], points["right_shoulder"])
    normalized = []
    for point in frame.keypoints:
        normalized_x, normalized_y = normalize_point(point, center=center, scale=scale)
        normalized.append(NormalizedPoint(point.name, normalized_x, normalized_y, point.score))
    return tuple(normalized)


def _analysis_map(points: Sequence[NormalizedPoint]) -> dict[str, AnalysisPoint]:
    return {point.name: AnalysisPoint(point.name, point.x, point.y, point.score) for point in points}


def _signals(action: MovementId, points: dict[str, AnalysisPoint], visible_side: str | None) -> dict[str, float]:
    if action == "bilateral-arm-raise":
        left = angle_between(_vector(points["left_shoulder"], points["left_hip"]), _vector(points["left_shoulder"], points["left_wrist"]))
        right = angle_between(_vector(points["right_shoulder"], points["right_hip"]), _vector(points["right_shoulder"], points["right_wrist"]))
        trunk = _trunk_angle(points)
        return {"driver": (left + right) / 2, "left-arm-angle": left, "right-arm-angle": right, "trunk-angle": trunk}
    if action == "bodyweight-squat":
        hip_mid = midpoint(points["left_hip"], points["right_hip"], name="hip_mid")
        shoulder_width = distance(points["left_shoulder"], points["right_shoulder"])
        left_knee_offset = signed_distance_to_line(points["left_knee"], points["left_hip"], points["left_ankle"]) / shoulder_width * 100
        right_knee_offset = signed_distance_to_line(points["right_knee"], points["right_hip"], points["right_ankle"]) / shoulder_width * 100
        return {
            "driver": hip_mid.y * 100,
            "left-knee-angle": angle_between(_vector(points["left_knee"], points["left_hip"]), _vector(points["left_knee"], points["left_ankle"])),
            "right-knee-angle": angle_between(_vector(points["right_knee"], points["right_hip"]), _vector(points["right_knee"], points["right_ankle"])),
            "left-knee-offset": left_knee_offset,
            "right-knee-offset": right_knee_offset,
            "trunk-angle": _trunk_angle(points),
        }
    side = str(visible_side)
    ear = points[f"{side}_ear"]
    shoulder = points[f"{side}_shoulder"]
    return {
        "driver": (ear.x - shoulder.x) * 100,
        "ear-shoulder-offset": (ear.x - shoulder.x) * 100,
        "head-angle": line_angle_degrees(ear, points["nose"]),
    }


def _vector(start: AnalysisPoint, end: AnalysisPoint) -> tuple[float, float]:
    return end.x - start.x, end.y - start.y


def _trunk_angle(points: dict[str, AnalysisPoint]) -> float:
    shoulder = midpoint(points["left_shoulder"], points["right_shoulder"], name="shoulder_mid")
    hip = midpoint(points["left_hip"], points["right_hip"], name="hip_mid")
    return degrees(atan2(shoulder.x - hip.x, hip.y - shoulder.y))


def _local_outliers(driver: dict[int, float], frames: Sequence[RawMovementFrame]) -> set[int]:
    valid_indices = [frame.index for frame in frames if frame.valid and frame.index in driver]
    outliers: set[int] = set()
    for position, frame_index in enumerate(valid_indices):
        neighbors = [driver[index] for index in valid_indices[max(0, position - 2):position] + valid_indices[position + 1:position + 3]]
        if len(neighbors) < 3:
            continue
        center = median(neighbors)
        deviations = [abs(value - center) for value in neighbors]
        mad = median(deviations)
        residual = abs(driver[frame_index] - center)
        if (mad <= 1e-9 and residual > 1e-6) or (mad > 1e-9 and residual > OUTLIER_MAD_MULTIPLIER * 1.4826 * mad):
            outliers.add(frame_index)
    return outliers


def _filter_keypoints(
    normalized: dict[int, tuple[NormalizedPoint, ...]],
    frames: Sequence[RawMovementFrame],
    outliers: set[int],
    analysis_fps: int,
) -> dict[int, tuple[NormalizedPoint, ...]]:
    valid_frames = [frame for frame in frames if frame.valid and frame.index not in outliers and normalized.get(frame.index)]
    if not valid_frames:
        return {}
    medians: dict[int, dict[str, NormalizedPoint]] = {}
    radius = MEDIAN_WINDOW // 2
    for position, frame in enumerate(valid_frames):
        window = valid_frames[max(0, position - radius):position + radius + 1]
        by_name: dict[str, list[NormalizedPoint]] = {}
        for item in window:
            for point in normalized[item.index]:
                by_name.setdefault(point.name, []).append(point)
        medians[frame.index] = {
            name: NormalizedPoint(
                name,
                median(point.x for point in points),
                median(point.y for point in points),
                min(point.score for point in points),
            )
            for name, points in by_name.items()
        }
    filtered: dict[int, tuple[NormalizedPoint, ...]] = {}
    previous: dict[str, NormalizedPoint] = {}
    previous_time: float | None = None
    reference_interval = 1000 / analysis_fps
    for frame in valid_frames:
        delta = reference_interval if previous_time is None else max(1, frame.timestamp_ms - previous_time)
        alpha = 1 - (1 - EMA_ALPHA) ** (delta / reference_interval)
        next_points = []
        for name, current in medians[frame.index].items():
            prior = previous.get(name)
            if prior is None:
                value = current
            else:
                value = NormalizedPoint(
                    name,
                    prior.x + alpha * (current.x - prior.x),
                    prior.y + alpha * (current.y - prior.y),
                    current.score,
                )
            previous[name] = value
            next_points.append(value)
        filtered[frame.index] = tuple(next_points)
        previous_time = frame.timestamp_ms
    return filtered


def _median_signal(driver: dict[int, float], frames: Sequence[RawMovementFrame], outliers: set[int]) -> dict[int, float]:
    valid = [frame.index for frame in frames if frame.valid and frame.index in driver and frame.index not in outliers]
    result: dict[int, float] = {}
    for position, frame_index in enumerate(valid):
        window = valid[max(0, position - 1):position + 2]
        result[frame_index] = median(driver[index] for index in window)
    return result


def _segment(
    driver: dict[int, float],
    frames: Sequence[RawMovementFrame],
    *,
    absolute_from_baseline: bool,
    minimum_hold_ms: int,
) -> MovementPhases:
    ordered = [(frame.index, frame.timestamp_ms, driver[frame.index]) for frame in frames if frame.index in driver]
    if len(ordered) < 6:
        return MovementPhases("incomplete", None, None, None, (), ("MOVEMENT_INCOMPLETE",))
    duration = ordered[-1][1] - ordered[0][1]
    baseline_end = ordered[0][1] + duration * 0.2
    baseline_entries = [entry for entry in ordered if entry[1] <= baseline_end]
    if len(baseline_entries) < 2:
        baseline_entries = ordered[:2]
    baseline_count = len(baseline_entries)
    baseline = median(value for _, _, value in baseline_entries)
    progress = [(index, timestamp, abs(value - baseline) if absolute_from_baseline else value - baseline) for index, timestamp, value in ordered]
    peak = float(np.percentile([value for _, _, value in progress], 95))
    if peak <= 1e-6:
        return MovementPhases("incomplete", None, None, None, (), ("MOVEMENT_INCOMPLETE",))
    normalized = [(index, timestamp, value / peak) for index, timestamp, value in progress]
    onset_position = next((position for position in range(baseline_count, len(normalized)) if normalized[position][2] >= 0.15), None)
    if onset_position is None:
        return MovementPhases("incomplete", None, None, None, (), ("MOVEMENT_INCOMPLETE",))
    hold_runs: list[list[int]] = []
    current_run: list[int] = []
    for position in range(onset_position, len(normalized)):
        if normalized[position][2] >= 0.85:
            current_run.append(position)
        elif current_run:
            hold_runs.append(current_run)
            current_run = []
    if current_run:
        hold_runs.append(current_run)
    qualifying_runs = [
        run for run in hold_runs
        if len(run) >= 2 and normalized[run[-1]][1] - normalized[run[0]][1] >= minimum_hold_ms
    ]
    if not qualifying_runs:
        return MovementPhases("incomplete", normalized[max(0, onset_position - 1)][0], None, None, (), ("MOVEMENT_INCOMPLETE",))
    hold_positions = max(qualifying_runs, key=lambda run: max(normalized[position][2] for position in run))
    peak_position = max(hold_positions, key=lambda position: normalized[position][2])
    return_position = next((position for position in range(peak_position + 1, len(normalized)) if normalized[position][2] <= 0.25), None)
    start_index = normalized[max(0, onset_position - 1)][0]
    peak_index = normalized[peak_position][0]
    return_index = normalized[return_position][0] if return_position is not None else None
    if return_index is None:
        return MovementPhases("incomplete", start_index, peak_index, None, tuple(normalized[position][0] for position in hold_positions), ("MOVEMENT_INCOMPLETE",))
    return MovementPhases("complete", start_index, peak_index, return_index, tuple(normalized[position][0] for position in hold_positions), ())


def _trajectories(action: MovementId, signals: dict[int, dict[str, float]], frames: Sequence[RawMovementFrame]) -> tuple[Trajectory, ...]:
    definitions = {
        "bilateral-arm-raise": (("left-arm-angle", "左臂角度", "degrees"), ("right-arm-angle", "右臂角度", "degrees"), ("trunk-angle", "躯干角度", "degrees")),
        "bodyweight-squat": (("left-knee-angle", "左膝角度", "degrees"), ("right-knee-angle", "右膝角度", "degrees"), ("left-knee-offset", "左膝轨迹", "percent-shoulder-width"), ("right-knee-offset", "右膝轨迹", "percent-shoulder-width"), ("trunk-angle", "躯干角度", "degrees")),
        "neck-retraction": (("ear-shoulder-offset", "耳肩水平位置", "percent-torso-length"), ("head-angle", "头部线角度", "degrees")),
    }[action]
    timestamp_by_index = {frame.index: frame.timestamp_ms for frame in frames}
    return tuple(
        Trajectory(
            id=id,
            label=label,
            unit=unit,
            samples=tuple(
                TrajectorySample(frame_index=index, timestamp_ms=timestamp_by_index[index], value=values[id])
                for index, values in signals.items()
                if id in values
            ),
        )
        for id, label, unit in definitions
    )


def _movement_metrics(
    action: MovementId,
    signals: dict[int, dict[str, float]],
    phases: MovementPhases,
    trajectories: tuple[Trajectory, ...],
    confidence: float | None,
    model_id: str,
    model_version: str,
) -> tuple[MetricResult, ...]:
    complete = phases.status == "complete"
    unavailable = () if complete else ("MOVEMENT_INCOMPLETE",)
    trajectory = {item.id: [sample.value for sample in item.samples] for item in trajectories}

    def values_range(ids: tuple[str, ...]) -> list[float]:
        return [_robust_range(trajectory.get(id, [])) for id in ids]

    def result(id: str, label: str, formula: str, values: tuple[MetricValue, ...], keypoints: tuple[str, ...]) -> MetricResult:
        return MetricResult(
            id=id,
            label=label,
            status="valid" if complete else "unavailable",
            quality="valid" if complete else "invalid",
            required_views=(MOVEMENT_CONFIGS[action].required_view,),
            keypoints=keypoints,
            formula=formula,
            values=values if complete else (),
            confidence=confidence,
            unavailable_reasons=unavailable,
            analysis_version=ANALYSIS_VERSION,
            model_id=model_id,
            model_version=model_version,
        )

    hold_driver = [signals[index]["driver"] for index in phases.hold_indices if index in signals]
    stability_unit = {
        "bilateral-arm-raise": "degrees",
        "bodyweight-squat": "percent-shoulder-width",
        "neck-retraction": "percent-torso-length",
    }[action]
    stability = result("hold-stability", "停留阶段稳定性", "median absolute deviation during detected hold", (MetricValue("mad", _mad(hold_driver), stability_unit),), ())
    if action == "bilateral-arm-raise":
        left, right = values_range(("left-arm-angle", "right-arm-angle"))
        return (
            result("arm-range", "左右活动范围", "P95(angle) - P05(angle)", (MetricValue("left", left, "degrees"), MetricValue("right", right, "degrees"), MetricValue("absolute_difference", abs(left - right), "degrees")), ("left_shoulder", "right_shoulder", "left_hip", "right_hip", "left_wrist", "right_wrist")),
            result("trunk-excursion", "躯干运动轨迹", "P95(trunk_angle) - P05(trunk_angle)", (MetricValue("range", _robust_range(trajectory.get("trunk-angle", [])), "degrees"),), ("left_shoulder", "right_shoulder", "left_hip", "right_hip")),
            stability,
        )
    if action == "bodyweight-squat":
        left, right = values_range(("left-knee-angle", "right-knee-angle"))
        left_offset, right_offset = values_range(("left-knee-offset", "right-knee-offset"))
        return (
            result("knee-range", "左右膝关节运动范围", "P95(knee_angle) - P05(knee_angle)", (MetricValue("left", left, "degrees"), MetricValue("right", right, "degrees"), MetricValue("absolute_difference", abs(left - right), "degrees")), ("left_hip", "right_hip", "left_knee", "right_knee", "left_ankle", "right_ankle")),
            result("knee-movement", "膝部内外移动轨迹", "range of signed knee-to-hip-ankle-line offset", (MetricValue("left", left_offset, "percent-shoulder-width"), MetricValue("right", right_offset, "percent-shoulder-width")), ("left_hip", "right_hip", "left_knee", "right_knee", "left_ankle", "right_ankle")),
            result("trunk-excursion", "躯干运动轨迹", "P95(trunk_angle) - P05(trunk_angle)", (MetricValue("range", _robust_range(trajectory.get("trunk-angle", [])), "degrees"),), ("left_shoulder", "right_shoulder", "left_hip", "right_hip")),
            stability,
        )
    offset_range = _robust_range(trajectory.get("ear-shoulder-offset", []))
    return (
        result("ear-shoulder-excursion", "耳肩相对位置变化", "P95(offset) - P05(offset)", (MetricValue("range", offset_range, "percent-torso-length"),), ()),
        result("head-angle-excursion", "头部线角度变化", "P95(head_angle) - P05(head_angle)", (MetricValue("range", _robust_range(trajectory.get("head-angle", [])), "degrees"),), ()),
        stability,
    )


def _robust_range(values: Sequence[float]) -> float:
    if not values:
        return 0
    return float(np.percentile(values, 95) - np.percentile(values, 5))


def _mad(values: Sequence[float]) -> float:
    if not values:
        return 0
    center = median(values)
    return median(abs(value - center) for value in values)
