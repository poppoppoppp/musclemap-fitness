from __future__ import annotations

from math import atan2, degrees, hypot

import pytest

from app.analysis.models import AnalysisPoint
from app.analysis.static_metrics import analyze_static


def test_front_static_formulas_are_explicit_and_scale_invariant() -> None:
    result = analyze_static(
        front_points(),
        bounding_box=(10, 10, 80, 180),
        view="front",
        model_id="rtmpose-m-body26-256x192",
        model_version="1.3.2",
    )

    assert result.analysis_version == "posture-metrics-v1"
    assert result.normalization.basis == "shoulder-width"
    assert result.normalization.pixels == pytest.approx(hypot(40, 4))
    assert metric(result, "head-lateral-tilt").values[0].value == pytest.approx(degrees(atan2(2, 20)))
    assert metric(result, "shoulder-height-relation").values[0].value == pytest.approx(4 / hypot(40, 4) * 100)
    assert metric(result, "trunk-lateral-offset").values[0].value == pytest.approx(0)
    assert metric(result, "pelvis-height-relation").values[0].value == pytest.approx(2 / hypot(30, 2) * 100)
    assert [value.label for value in metric(result, "knee-alignment").values] == ["left", "right"]
    assert [value.value for value in metric(result, "foot-direction").values] == pytest.approx([0, 0])
    assert metric(result, "side-ear-shoulder-position").status == "unavailable"
    assert metric(result, "head-lateral-tilt").formula
    assert metric(result, "head-lateral-tilt").model_id == "rtmpose-m-body26-256x192"

    scaled = analyze_static(
        transform(front_points(), scale=2, dx=17, dy=-9),
        bounding_box=(37, 11, 160, 360),
        view="front",
        model_id="rtmpose-m-body26-256x192",
        model_version="1.3.2",
    )
    for metric_id in ["head-lateral-tilt", "shoulder-height-relation", "trunk-lateral-offset", "pelvis-height-relation", "knee-alignment", "foot-direction"]:
        assert [item.value for item in metric(scaled, metric_id).values] == pytest.approx(
            [item.value for item in metric(result, metric_id).values]
        )


def test_semantic_horizontal_mirror_flips_signed_bilateral_measurements() -> None:
    original = analyze_static(front_points(), bounding_box=(0, 0, 200, 200), view="front")
    mirrored = analyze_static(mirror_semantically(front_points(), width=200), bounding_box=(0, 0, 200, 200), view="front")

    for metric_id in ["head-lateral-tilt", "shoulder-height-relation", "trunk-lateral-offset", "pelvis-height-relation"]:
        assert metric(mirrored, metric_id).values[0].value == pytest.approx(-metric(original, metric_id).values[0].value)
    assert [value.value for value in metric(mirrored, "knee-alignment").values] == pytest.approx(
        [-value.value for value in reversed(metric(original, "knee-alignment").values)]
    )


def test_horizontal_axis_angles_do_not_jump_to_180_when_anatomical_left_is_on_image_right() -> None:
    points = front_points()
    replace(points, "left_ear", 70, 20)
    replace(points, "right_ear", 30, 22)
    replace(points, "left_shoulder", 75, 40)
    replace(points, "right_shoulder", 25, 42)
    replace(points, "left_hip", 70, 80)
    replace(points, "right_hip", 30, 78)

    result = analyze_static(points, bounding_box=(0, 0, 100, 200), view="front")

    assert metric(result, "head-lateral-tilt").values[0].value == pytest.approx(degrees(atan2(2, 40)))
    assert metric(result, "shoulder-height-relation").values[1].value == pytest.approx(degrees(atan2(2, 50)))
    assert metric(result, "pelvis-height-relation").values[1].value == pytest.approx(degrees(atan2(-2, 40)))


def test_side_measurement_uses_only_the_explicit_visible_side_chain() -> None:
    points = front_points()
    replace(points, "left_ear", 45, 25)
    replace(points, "left_shoulder", 50, 50)
    replace(points, "left_hip", 52, 100)
    first = analyze_static(points, bounding_box=(0, 0, 100, 200), view="side", visible_side="left")

    replace(points, "right_ear", 999, -999, score=0.01)
    replace(points, "right_shoulder", -500, 800, score=0.01)
    replace(points, "right_hip", 700, 600, score=0.01)
    second = analyze_static(points, bounding_box=(0, 0, 100, 200), view="side", visible_side="left")

    expected = (45 - 50) / hypot(2, 50) * 100
    assert metric(first, "side-ear-shoulder-position").values[0].value == pytest.approx(expected)
    assert metric(second, "side-ear-shoulder-position").values == metric(first, "side-ear-shoulder-position").values
    assert metric(first, "side-ear-shoulder-position").keypoints == ("left_ear", "left_shoulder", "left_hip")
    assert metric(first, "head-lateral-tilt").status == "unavailable"


def test_side_measurement_never_guesses_a_visible_side() -> None:
    result = analyze_static(front_points(), bounding_box=(0, 0, 100, 200), view="side")
    side_metric = metric(result, "side-ear-shoulder-position")

    assert side_metric.status == "unavailable"
    assert side_metric.values == ()
    assert side_metric.unavailable_reasons == ("VISIBLE_SIDE_REQUIRED",)


def test_missing_and_low_confidence_points_are_unavailable_not_estimated() -> None:
    missing = [point for point in front_points() if point.name != "right_ear"]
    missing_result = analyze_static(missing, bounding_box=(0, 0, 100, 200), view="front")
    assert metric(missing_result, "head-lateral-tilt").unavailable_reasons == ("MISSING_KEYPOINT:right_ear",)

    low = front_points()
    replace(low, "right_shoulder", 70, 44, score=0.29)
    low_result = analyze_static(low, bounding_box=(0, 0, 100, 200), view="front")
    shoulder = metric(low_result, "shoulder-height-relation")
    assert shoulder.status == "unavailable"
    assert shoulder.confidence == pytest.approx(0.29)
    assert shoulder.unavailable_reasons == ("LOW_CONFIDENCE_KEYPOINT:right_shoulder",)


def metric(result, metric_id: str):
    return next(item for item in result.metrics if item.id == metric_id)


def front_points() -> list[AnalysisPoint]:
    values = {
        "nose": (50, 10),
        "left_ear": (40, 20), "right_ear": (60, 22),
        "left_shoulder": (30, 40), "right_shoulder": (70, 44),
        "left_hip": (35, 80), "right_hip": (65, 82),
        "left_knee": (36, 120), "right_knee": (64, 120),
        "left_ankle": (35, 160), "right_ankle": (65, 160),
        "left_big_toe": (30, 180), "right_big_toe": (60, 180),
        "left_small_toe": (38, 180), "right_small_toe": (68, 180),
        "left_heel": (34, 170), "right_heel": (64, 170),
    }
    return [AnalysisPoint(name=name, x=x, y=y, score=0.9) for name, (x, y) in values.items()]


def replace(points: list[AnalysisPoint], name: str, x: float, y: float, score: float = 0.9) -> None:
    index = next(index for index, point in enumerate(points) if point.name == name)
    points[index] = AnalysisPoint(name=name, x=x, y=y, score=score)


def transform(points: list[AnalysisPoint], *, scale: float, dx: float, dy: float) -> list[AnalysisPoint]:
    return [AnalysisPoint(point.name, point.x * scale + dx, point.y * scale + dy, point.score) for point in points]


def mirror_semantically(points: list[AnalysisPoint], *, width: float) -> list[AnalysisPoint]:
    mirrored = []
    for point in points:
        if point.name.startswith("left_"):
            name = "right_" + point.name.removeprefix("left_")
        elif point.name.startswith("right_"):
            name = "left_" + point.name.removeprefix("right_")
        else:
            name = point.name
        mirrored.append(AnalysisPoint(name, width - point.x, point.y, point.score))
    return mirrored
