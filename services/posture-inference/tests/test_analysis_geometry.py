from __future__ import annotations

import pytest

from app.analysis.geometry import (
    angle_between,
    line_angle_degrees,
    normalize_point,
    signed_distance_to_line,
)
from app.analysis.models import AnalysisPoint


def point(name: str, x: float, y: float, score: float = 0.9) -> AnalysisPoint:
    return AnalysisPoint(name=name, x=x, y=y, score=score)


def test_line_angles_follow_original_image_axes() -> None:
    origin = point("origin", 10, 20)

    assert line_angle_degrees(origin, point("right", 30, 20)) == pytest.approx(0)
    assert line_angle_degrees(origin, point("down", 10, 40)) == pytest.approx(90)
    assert line_angle_degrees(origin, point("up", 10, 0)) == pytest.approx(-90)


def test_vector_angle_is_unsigned_and_scale_independent() -> None:
    assert angle_between((0, 2), (2, 0)) == pytest.approx(90)
    assert angle_between((0, 200), (200, 0)) == pytest.approx(90)


def test_signed_distance_to_line_preserves_side() -> None:
    start = point("hip", 0, 0)
    end = point("ankle", 0, 10)

    assert signed_distance_to_line(point("right", 3, 5), start, end) == pytest.approx(-3)
    assert signed_distance_to_line(point("left", -3, 5), start, end) == pytest.approx(3)


def test_point_normalization_is_translation_and_scale_invariant() -> None:
    base = normalize_point(point("knee", 30, 50), center=(10, 20), scale=20)
    translated = normalize_point(point("knee", 130, 250), center=(110, 220), scale=20)
    scaled = normalize_point(point("knee", 60, 100), center=(20, 40), scale=40)

    assert base == pytest.approx((1, 1.5))
    assert translated == pytest.approx(base)
    assert scaled == pytest.approx(base)


def test_geometry_rejects_zero_length_references() -> None:
    same = point("same", 1, 1)

    with pytest.raises(ValueError, match="non-zero"):
        normalize_point(same, center=(0, 0), scale=0)
    with pytest.raises(ValueError, match="non-zero"):
        angle_between((0, 0), (1, 0))
    with pytest.raises(ValueError, match="non-zero"):
        signed_distance_to_line(point("p", 2, 2), same, same)
