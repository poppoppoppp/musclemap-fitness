from __future__ import annotations

from math import atan2, degrees, hypot, isfinite
from typing import Callable, Literal, Sequence

from .config import ANALYSIS_VERSION, MIN_KEYPOINT_SCORE
from .geometry import distance, horizontal_axis_angle_degrees, midpoint, normalize_point, signed_distance_to_line
from .models import (
    AnalysisPoint,
    MetricResult,
    MetricValue,
    NormalizationInfo,
    NormalizedPoint,
    StaticAnalysisResult,
)


View = Literal["front", "back", "side"]
VisibleSide = Literal["left", "right"]


def analyze_static(
    keypoints: Sequence[AnalysisPoint],
    *,
    bounding_box: tuple[float, float, float, float],
    view: View,
    visible_side: VisibleSide | None = None,
    model_id: str = "unknown",
    model_version: str = "unknown",
) -> StaticAnalysisResult:
    points = {point.name: point for point in keypoints}
    normalization = _normalization(points, bounding_box, view, visible_side)
    normalized_points = []
    for point in keypoints:
        if not all(isfinite(value) for value in (point.x, point.y, point.score)):
            continue
        normalized_x, normalized_y = normalize_point(
            point,
            center=(normalization.center_x, normalization.center_y),
            scale=normalization.pixels,
        )
        normalized_points.append(NormalizedPoint(point.name, normalized_x, normalized_y, point.score))
    normalized = tuple(normalized_points)
    context = _MetricContext(points, view, visible_side, model_id, model_version)
    metrics = (
        context.metric(
            id="head-lateral-tilt",
            label="头部左右倾斜",
            required_views=("front", "back"),
            names=("left_ear", "right_ear"),
            formula="atan2(right_ear.y - left_ear.y, abs(right_ear.x - left_ear.x))",
            calculate=lambda selected: (MetricValue("angle", horizontal_axis_angle_degrees(selected[0], selected[1]), "degrees"),),
        ),
        _side_ear_shoulder(context),
        context.metric(
            id="shoulder-height-relation",
            label="左右肩高差",
            required_views=("front", "back"),
            names=("left_shoulder", "right_shoulder"),
            formula="(right_shoulder.y - left_shoulder.y) / shoulder_width * 100; line_angle = atan2(delta_y, abs(delta_x))",
            calculate=lambda selected: (
                MetricValue("vertical_difference", (selected[1].y - selected[0].y) / distance(selected[0], selected[1]) * 100, "percent-shoulder-width"),
                MetricValue("line_angle", horizontal_axis_angle_degrees(selected[0], selected[1]), "degrees"),
            ),
        ),
        _trunk_offset(context),
        context.metric(
            id="pelvis-height-relation",
            label="骨盆左右高低关系",
            required_views=("front", "back"),
            names=("left_hip", "right_hip"),
            formula="(right_hip.y - left_hip.y) / hip_width * 100; line_angle = atan2(delta_y, abs(delta_x))",
            calculate=lambda selected: (
                MetricValue("vertical_difference", (selected[1].y - selected[0].y) / distance(selected[0], selected[1]) * 100, "percent-hip-width"),
                MetricValue("line_angle", horizontal_axis_angle_degrees(selected[0], selected[1]), "degrees"),
            ),
        ),
        _knee_alignment(context),
        _foot_direction(context),
    )
    return StaticAnalysisResult(
        analysis_version=ANALYSIS_VERSION,
        view=view,
        visible_side=visible_side,
        normalization=normalization,
        raw_keypoints=tuple(keypoints),
        normalized_keypoints=normalized,
        filtered_keypoints=(),
        metrics=metrics,
    )


class _MetricContext:
    def __init__(self, points: dict[str, AnalysisPoint], view: View, visible_side: VisibleSide | None, model_id: str, model_version: str) -> None:
        self.points = points
        self.view = view
        self.visible_side = visible_side
        self.model_id = model_id
        self.model_version = model_version

    def metric(
        self,
        *,
        id: str,
        label: str,
        required_views: tuple[str, ...],
        names: tuple[str, ...],
        formula: str,
        calculate: Callable[[tuple[AnalysisPoint, ...]], tuple[MetricValue, ...]],
        extra_reason: str | None = None,
    ) -> MetricResult:
        selected, confidence, reasons = self.select(names)
        if self.view not in required_views:
            reasons.insert(0, f"VIEW_NOT_SUPPORTED:{self.view}")
        if extra_reason:
            reasons.insert(0, extra_reason)
        values: tuple[MetricValue, ...] = ()
        if not reasons:
            try:
                values = calculate(selected)
                if not all(isfinite(value.value) for value in values):
                    reasons.append("NON_FINITE_RESULT")
                    values = ()
            except ValueError:
                reasons.append("DEGENERATE_GEOMETRY")
        return MetricResult(
            id=id,
            label=label,
            status="unavailable" if reasons else "valid",
            quality="invalid" if reasons else "valid",
            required_views=required_views,
            keypoints=names,
            formula=formula,
            values=values,
            confidence=confidence,
            unavailable_reasons=tuple(reasons),
            analysis_version=ANALYSIS_VERSION,
            model_id=self.model_id,
            model_version=self.model_version,
        )

    def select(self, names: tuple[str, ...]) -> tuple[tuple[AnalysisPoint, ...], float | None, list[str]]:
        selected: list[AnalysisPoint] = []
        reasons: list[str] = []
        for name in names:
            point = self.points.get(name)
            if point is None:
                reasons.append(f"MISSING_KEYPOINT:{name}")
                continue
            selected.append(point)
            if not isfinite(point.x) or not isfinite(point.y) or not isfinite(point.score):
                reasons.append(f"NON_FINITE_KEYPOINT:{name}")
            elif point.score < MIN_KEYPOINT_SCORE:
                reasons.append(f"LOW_CONFIDENCE_KEYPOINT:{name}")
        confidence = min((point.score for point in selected if isfinite(point.score)), default=None)
        return tuple(selected), confidence, reasons


def _side_ear_shoulder(context: _MetricContext) -> MetricResult:
    side = context.visible_side
    names = tuple(f"{side}_{part}" for part in ("ear", "shoulder", "hip")) if side else ()
    return context.metric(
        id="side-ear-shoulder-position",
        label="侧面耳肩相对位置",
        required_views=("side",),
        names=names,
        formula="(ear.x - shoulder.x) / distance(shoulder, hip) * 100; angle relative to image vertical",
        extra_reason="VISIBLE_SIDE_REQUIRED" if context.view == "side" and side is None else None,
        calculate=lambda selected: (
            MetricValue("horizontal_offset", (selected[0].x - selected[1].x) / distance(selected[1], selected[2]) * 100, "percent-torso-length"),
            MetricValue("vertical_angle", degrees(atan2(selected[0].x - selected[1].x, selected[1].y - selected[0].y)), "degrees"),
        ),
    )


def _trunk_offset(context: _MetricContext) -> MetricResult:
    def calculate(selected: tuple[AnalysisPoint, ...]) -> tuple[MetricValue, ...]:
        shoulder_mid = midpoint(selected[0], selected[1], name="shoulder_mid")
        hip_mid = midpoint(selected[2], selected[3], name="hip_mid")
        return (MetricValue("horizontal_offset", (shoulder_mid.x - hip_mid.x) / distance(shoulder_mid, hip_mid) * 100, "percent-torso-length"),)

    return context.metric(
        id="trunk-lateral-offset",
        label="躯干侧偏",
        required_views=("front", "back"),
        names=("left_shoulder", "right_shoulder", "left_hip", "right_hip"),
        formula="(shoulder_mid.x - hip_mid.x) / distance(shoulder_mid, hip_mid) * 100",
        calculate=calculate,
    )


def _knee_alignment(context: _MetricContext) -> MetricResult:
    names = ("left_hip", "left_knee", "left_ankle", "right_hip", "right_knee", "right_ankle", "left_shoulder", "right_shoulder")

    def calculate(selected: tuple[AnalysisPoint, ...]) -> tuple[MetricValue, ...]:
        shoulder_width = distance(selected[6], selected[7])
        return (
            MetricValue("left", signed_distance_to_line(selected[1], selected[0], selected[2]) / shoulder_width * 100, "percent-shoulder-width"),
            MetricValue("right", signed_distance_to_line(selected[4], selected[3], selected[5]) / shoulder_width * 100, "percent-shoulder-width"),
        )

    return context.metric(
        id="knee-alignment",
        label="膝部排列",
        required_views=("front", "back"),
        names=names,
        formula="signed_perpendicular_distance(knee, hip_to_ankle) / shoulder_width * 100",
        calculate=calculate,
    )


def _foot_direction(context: _MetricContext) -> MetricResult:
    names = ("left_heel", "left_big_toe", "left_small_toe", "right_heel", "right_big_toe", "right_small_toe")

    def foot_angle(heel: AnalysisPoint, big_toe: AnalysisPoint, small_toe: AnalysisPoint) -> float:
        toe_mid = midpoint(big_toe, small_toe, name="toe_mid")
        dx = toe_mid.x - heel.x
        dy = toe_mid.y - heel.y
        if hypot(dx, dy) <= 1e-9:
            raise ValueError("Foot axis must be non-zero.")
        return degrees(atan2(dx, dy))

    return context.metric(
        id="foot-direction",
        label="足部朝向",
        required_views=("front", "back"),
        names=names,
        formula="atan2(mean_toes.x - heel.x, mean_toes.y - heel.y)",
        calculate=lambda selected: (
            MetricValue("left", foot_angle(selected[0], selected[1], selected[2]), "degrees"),
            MetricValue("right", foot_angle(selected[3], selected[4], selected[5]), "degrees"),
        ),
    )


def _normalization(
    points: dict[str, AnalysisPoint],
    bounding_box: tuple[float, float, float, float],
    view: View,
    visible_side: VisibleSide | None,
) -> NormalizationInfo:
    x, y, width, height = bounding_box
    center_x = x + width / 2
    center_y = y + height / 2
    if view in ("front", "back"):
        selected = _valid_pair(points, "left_shoulder", "right_shoulder")
        if selected:
            return NormalizationInfo("shoulder-width", distance(*selected), center_x, center_y)
    elif visible_side:
        selected = _valid_pair(points, f"{visible_side}_shoulder", f"{visible_side}_hip")
        if selected:
            return NormalizationInfo("torso-length", distance(*selected), center_x, center_y)
    diagonal = hypot(width, height)
    return NormalizationInfo("bounding-box-diagonal", diagonal if diagonal > 1e-9 else 1, center_x, center_y)


def _valid_pair(points: dict[str, AnalysisPoint], first_name: str, second_name: str) -> tuple[AnalysisPoint, AnalysisPoint] | None:
    first = points.get(first_name)
    second = points.get(second_name)
    if not first or not second:
        return None
    if min(first.score, second.score) < MIN_KEYPOINT_SCORE:
        return None
    if not all(isfinite(value) for value in (first.x, first.y, second.x, second.y)):
        return None
    try:
        if distance(first, second) <= 1e-9:
            return None
    except ValueError:
        return None
    return first, second
