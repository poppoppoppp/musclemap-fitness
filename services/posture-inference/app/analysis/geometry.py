from __future__ import annotations

from math import atan2, degrees, hypot

from .models import AnalysisPoint


def distance(first: AnalysisPoint, second: AnalysisPoint) -> float:
    return hypot(second.x - first.x, second.y - first.y)


def midpoint(first: AnalysisPoint, second: AnalysisPoint, *, name: str) -> AnalysisPoint:
    return AnalysisPoint(
        name=name,
        x=(first.x + second.x) / 2,
        y=(first.y + second.y) / 2,
        score=min(first.score, second.score),
    )


def line_angle_degrees(start: AnalysisPoint, end: AnalysisPoint) -> float:
    _require_non_zero(end.x - start.x, end.y - start.y)
    return degrees(atan2(end.y - start.y, end.x - start.x))


def horizontal_axis_angle_degrees(start: AnalysisPoint, end: AnalysisPoint) -> float:
    _require_non_zero(end.x - start.x, end.y - start.y)
    return degrees(atan2(end.y - start.y, abs(end.x - start.x)))


def angle_between(first: tuple[float, float], second: tuple[float, float]) -> float:
    first_length = _require_non_zero(*first)
    second_length = _require_non_zero(*second)
    cross = first[0] * second[1] - first[1] * second[0]
    dot = first[0] * second[0] + first[1] * second[1]
    angle = abs(degrees(atan2(cross, dot)))
    return min(angle, 360 - angle)


def signed_distance_to_line(point: AnalysisPoint, start: AnalysisPoint, end: AnalysisPoint) -> float:
    dx = end.x - start.x
    dy = end.y - start.y
    length = _require_non_zero(dx, dy)
    return (dx * (point.y - start.y) - dy * (point.x - start.x)) / length


def normalize_point(
    point: AnalysisPoint,
    *,
    center: tuple[float, float],
    scale: float,
) -> tuple[float, float]:
    if scale <= 0:
        raise ValueError("Normalization scale must be non-zero and positive.")
    return ((point.x - center[0]) / scale, (point.y - center[1]) / scale)


def _require_non_zero(x: float, y: float) -> float:
    length = hypot(x, y)
    if length <= 1e-9:
        raise ValueError("Reference vector must be non-zero.")
    return length
