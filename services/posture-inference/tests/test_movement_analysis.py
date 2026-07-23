from __future__ import annotations

from math import cos, radians, sin

import pytest

from app.analysis.models import AnalysisPoint, MovementInputFrame
from app.analysis.sequence import analyze_movement, select_frames_by_timestamp


def test_timestamp_selection_is_uniform_bounded_and_preserves_real_timestamps() -> None:
    timestamps = [0, 41, 93, 171, 222, 391, 403, 612, 799, 1_011]
    frames = [MovementInputFrame(index=index, timestamp_ms=value, keypoints=(), bounding_box=(0, 0, 1, 1)) for index, value in enumerate(timestamps)]

    selected = select_frames_by_timestamp(frames, target_fps=5, max_frames=40)

    assert selected[0].timestamp_ms == 0
    assert selected[-1].timestamp_ms == 1_011
    assert [frame.timestamp_ms for frame in selected] == [0, 222, 403, 612, 799, 1_011]
    assert all(frame.timestamp_ms in timestamps for frame in selected)

    long_frames = [MovementInputFrame(index=index, timestamp_ms=index * 80, keypoints=(), bounding_box=(0, 0, 1, 1)) for index in range(101)]
    bounded = select_frames_by_timestamp(long_frames, target_fps=5, max_frames=40)
    assert len(bounded) == 40
    assert bounded[0].timestamp_ms == 0
    assert bounded[-1].timestamp_ms == 8_000


def test_arm_raise_keeps_raw_timestamps_separate_from_filtered_points_and_segments_one_rep() -> None:
    angles = [0, 0, 10, 35, 70, 110, 150, 170, 170, 168, 140, 100, 55, 20, 5, 0]
    timestamps = [0, 180, 405, 610, 790, 1_040, 1_250, 1_480, 1_710, 1_970, 2_240, 2_460, 2_730, 3_010, 3_330, 3_650]
    frames = [arm_frame(index, timestamp, angle) for index, (timestamp, angle) in enumerate(zip(timestamps, angles))]

    result = analyze_movement(frames, action="bilateral-arm-raise", view="front", model_id="rtmpose", model_version="1.3.2")

    assert result.status == "valid"
    assert result.phases.status == "complete"
    assert result.phases.start_index < result.phases.peak_index < result.phases.return_index
    assert [frame.timestamp_ms for frame in result.raw_frames] == timestamps
    assert result.raw_frames[5].keypoints != result.processed_frames[5].filtered_keypoints
    arm_range = movement_metric(result, "arm-range")
    assert [value.label for value in arm_range.values] == ["left", "right", "absolute_difference"]
    assert arm_range.values[0].value > 150
    assert {trajectory.id for trajectory in result.trajectories} >= {"left-arm-angle", "right-arm-angle", "trunk-angle"}


def test_local_spike_is_marked_and_not_used_as_a_synthetic_phase() -> None:
    angles = [0, 0, 20, 60, 100, 140, 170, 170, 0, 168, 140, 90, 40, 10, 0]
    frames = [arm_frame(index, index * 220, angle) for index, angle in enumerate(angles)]

    result = analyze_movement(frames, action="bilateral-arm-raise", view="front")

    assert result.processed_frames[8].outlier is True
    assert result.processed_frames[8].filtered_keypoints == ()
    assert result.status == "valid"


def test_missing_return_phase_is_incomplete_and_metrics_are_unavailable() -> None:
    angles = [0, 0, 15, 45, 80, 120, 155, 170, 170, 168]
    frames = [arm_frame(index, index * 250, angle) for index, angle in enumerate(angles)]

    result = analyze_movement(frames, action="bilateral-arm-raise", view="front")

    assert result.status == "incomplete"
    assert result.phases.status == "incomplete"
    assert result.phases.return_index is None
    assert result.phases.reasons == ("MOVEMENT_INCOMPLETE",)
    assert all(metric.status == "unavailable" for metric in result.metrics)


def test_peak_frames_too_close_in_real_time_do_not_fake_a_hold_phase() -> None:
    angles = [0, 0, 20, 60, 120, 170, 170, 120, 60, 10, 0]
    timestamps = [0, 250, 500, 750, 1_000, 1_250, 1_260, 1_500, 1_750, 2_000, 2_250]
    frames = [arm_frame(index, timestamp, angle) for index, (timestamp, angle) in enumerate(zip(timestamps, angles))]

    result = analyze_movement(frames, action="bilateral-arm-raise", view="front")

    assert result.status == "incomplete"
    assert result.phases.reasons == ("MOVEMENT_INCOMPLETE",)


def test_squat_and_neck_retraction_use_action_specific_drivers() -> None:
    squat_depths = [0, 0, 0.1, 0.3, 0.6, 0.9, 1, 1, 0.95, 0.7, 0.4, 0.15, 0, 0]
    squat = analyze_movement(
        [squat_frame(index, index * 300, depth) for index, depth in enumerate(squat_depths)],
        action="bodyweight-squat",
        view="front",
    )
    assert squat.status == "valid"
    assert {metric.id for metric in squat.metrics} >= {"knee-range", "knee-movement", "trunk-excursion", "hold-stability"}
    assert movement_metric(squat, "hold-stability").values[0].unit == "percent-shoulder-width"

    retract = [0, 0, 0.15, 0.4, 0.75, 1, 1, 0.95, 0.7, 0.35, 0.1, 0, 0]
    neck = analyze_movement(
        [neck_frame(index, index * 280, amount) for index, amount in enumerate(retract)],
        action="neck-retraction",
        view="side",
        visible_side="left",
    )
    assert neck.status == "valid"
    assert {metric.id for metric in neck.metrics} >= {"ear-shoulder-excursion", "head-angle-excursion", "hold-stability"}
    assert movement_metric(neck, "hold-stability").values[0].unit == "percent-torso-length"
    assert all("right_" not in name for name in neck.required_keypoints)


def test_squat_segmentation_is_invariant_to_detector_box_translation() -> None:
    depths = [0, 0, 0.1, 0.3, 0.6, 0.9, 1, 1, 0.95, 0.7, 0.4, 0.15, 0, 0]
    frames = []
    for index, depth in enumerate(depths):
        frame = squat_frame(index, index * 300, depth)
        hip_y = 85 + depth * 38
        frames.append(
            MovementInputFrame(
                index=frame.index,
                timestamp_ms=frame.timestamp_ms,
                keypoints=frame.keypoints,
                bounding_box=(10, hip_y - 90, 100, 180),
            )
        )

    result = analyze_movement(frames, action="bodyweight-squat", view="front")

    assert result.status == "valid"
    assert result.phases.status == "complete"
    assert movement_metric(result, "hold-stability").values[0].unit == "percent-shoulder-width"


def test_missing_or_low_confidence_required_points_invalidate_only_real_frames() -> None:
    frames = [arm_frame(index, index * 250, angle) for index, angle in enumerate([0, 0, 30, 90, 160, 170, 170, 120, 50, 10, 0])]
    points = list(frames[4].keypoints)
    points[0] = AnalysisPoint(points[0].name, points[0].x, points[0].y, 0.2)
    frames[4] = MovementInputFrame(index=4, timestamp_ms=frames[4].timestamp_ms, keypoints=tuple(points), bounding_box=frames[4].bounding_box)

    result = analyze_movement(frames, action="bilateral-arm-raise", view="front")

    assert result.raw_frames[4].valid is False
    assert result.raw_frames[4].reasons[0].startswith("LOW_CONFIDENCE_KEYPOINT")
    assert len(result.raw_frames) == len(frames)


def movement_metric(result, metric_id: str):
    return next(metric for metric in result.metrics if metric.id == metric_id)


def arm_frame(index: int, timestamp_ms: float, angle: float) -> MovementInputFrame:
    length = 35
    left_shoulder = (40, 60)
    right_shoulder = (80, 60)
    theta = radians(angle)
    points = [
        p("left_shoulder", *left_shoulder), p("right_shoulder", *right_shoulder),
        p("left_hip", 40, 105), p("right_hip", 80, 105),
        p("left_wrist", left_shoulder[0] + sin(theta) * length, left_shoulder[1] + cos(theta) * length),
        p("right_wrist", right_shoulder[0] - sin(theta) * length, right_shoulder[1] + cos(theta) * length),
    ]
    return MovementInputFrame(index=index, timestamp_ms=timestamp_ms, keypoints=tuple(points), bounding_box=(10, 10, 100, 180))


def squat_frame(index: int, timestamp_ms: float, depth: float) -> MovementInputFrame:
    hip_y = 85 + depth * 38
    knee_y = 125 + depth * 8
    points = [
        p("left_shoulder", 40, 40 + depth * 12), p("right_shoulder", 80, 40 + depth * 12),
        p("left_hip", 45, hip_y), p("right_hip", 75, hip_y),
        p("left_knee", 44 - depth * 4, knee_y), p("right_knee", 76 + depth * 4, knee_y),
        p("left_ankle", 42, 170), p("right_ankle", 78, 170),
    ]
    return MovementInputFrame(index=index, timestamp_ms=timestamp_ms, keypoints=tuple(points), bounding_box=(10, 10, 100, 180))


def neck_frame(index: int, timestamp_ms: float, amount: float) -> MovementInputFrame:
    points = [
        p("nose", 69 - amount * 8, 31),
        p("left_ear", 60 - amount * 10, 32),
        p("left_shoulder", 50, 62),
        p("left_hip", 52, 112),
    ]
    return MovementInputFrame(index=index, timestamp_ms=timestamp_ms, keypoints=tuple(points), bounding_box=(20, 10, 80, 170))


def p(name: str, x: float, y: float, score: float = 0.95) -> AnalysisPoint:
    return AnalysisPoint(name=name, x=x, y=y, score=score)
