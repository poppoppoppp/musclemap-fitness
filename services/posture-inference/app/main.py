from __future__ import annotations

import json
from collections.abc import Callable
from contextlib import asynccontextmanager
from dataclasses import asdict
from time import perf_counter
from typing import Annotated, Any, Literal
from uuid import uuid4

from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import ServiceConfig
from .analysis.models import AnalysisPoint, MovementInputFrame
from .analysis.sequence import analyze_movement
from .analysis.static_metrics import analyze_static
from .errors import InferenceServiceError
from .image_input import ImageLimits, read_image_upload
from .runtime import RuntimeBundle, create_runtime
from .schemas import (
    ErrorDetail,
    ErrorResponse,
    HealthResponse,
    ImageInfo,
    KeypointResponse,
    MovementAnalysisInfo,
    MovementAnalysisResponse,
    MovementInferenceFrame,
    MovementLimitsResponse,
    ModelsResponse,
    PersonKeypoints,
    StaticAnalysisRequest,
    StaticAnalysisResponse,
    TimingInfo,
)


RuntimeFactory = Callable[[ServiceConfig], RuntimeBundle]


def create_app(
    *,
    config: ServiceConfig | None = None,
    runtime_factory: RuntimeFactory = create_runtime,
) -> FastAPI:
    settings = config or ServiceConfig()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.runtime_bundle = None
        app.state.runtime_error = None
        try:
            app.state.runtime_bundle = runtime_factory(settings)
        except Exception as error:  # surfaced through health and structured 503 responses
            app.state.runtime_error = error
        yield

    app = FastAPI(title="MuscleMap Posture Inference", version="1.0.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origin_list,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["content-type"],
    )

    @app.exception_handler(InferenceServiceError)
    async def inference_error_handler(_: Request, error: InferenceServiceError) -> JSONResponse:
        response = ErrorResponse(
            error=ErrorDetail(
                code=error.code,
                message=error.message,
                retryable=error.retryable,
                details=error.details,
            )
        )
        return JSONResponse(status_code=error.status_code, content=response.model_dump(by_alias=True))

    @app.get("/health", response_model=HealthResponse)
    async def health(request: Request) -> HealthResponse:
        bundle: RuntimeBundle | None = request.app.state.runtime_bundle
        if bundle is None:
            return HealthResponse(status="unavailable", ready=False, device=settings.device, model_ids=[])
        return HealthResponse(
            status="ready",
            ready=True,
            device=bundle.runtime.device,
            model_ids=[bundle.model.id, bundle.detector.id],
        )

    @app.get("/v1/models", response_model=ModelsResponse)
    async def models(request: Request) -> ModelsResponse:
        bundle = _require_runtime(request)
        return ModelsResponse(model=bundle.model, detector=bundle.detector, runtime=bundle.runtime)

    @app.post("/v1/posture/keypoints", response_model=KeypointResponse)
    async def keypoints(
        request: Request,
        image: UploadFile = File(...),
        view: Literal["front", "back", "side"] | None = Form(default=None),
    ) -> KeypointResponse:
        request_started = perf_counter()
        bundle = _require_runtime(request)
        decode_started = perf_counter()
        decoded = await read_image_upload(
            image,
            ImageLimits(
                max_upload_bytes=settings.max_upload_bytes,
                max_image_pixels=settings.max_image_pixels,
            ),
        )
        decode_time_ms = (perf_counter() - decode_started) * 1000
        try:
            output = bundle.engine.infer(decoded.image)
        except InferenceServiceError:
            raise
        except Exception as error:
            raise InferenceServiceError(
                code="INFERENCE_FAILED",
                message=f"Official model inference failed: {error}",
                status_code=500,
                retryable=True,
            ) from error
        total_time_ms = (perf_counter() - request_started) * 1000
        return KeypointResponse(
            request_id=str(uuid4()),
            model=bundle.model,
            detector=bundle.detector,
            runtime=bundle.runtime,
            timing_ms=TimingInfo(
                decode=decode_time_ms,
                detection=output.detection_time_ms,
                pose=output.pose_time_ms,
                total=total_time_ms,
            ),
            image=ImageInfo(
                width=decoded.width,
                height=decoded.height,
                mime_type=decoded.mime_type,
                bytes=decoded.encoded_bytes,
            ),
            person=PersonKeypoints(bounding_box=output.bounding_box, keypoints=output.keypoints),
            warnings=output.warnings,
        )

    @app.post("/v1/posture/analysis/static", response_model=StaticAnalysisResponse)
    async def static_analysis(payload_data: dict[str, Any]) -> StaticAnalysisResponse:
        payload = StaticAnalysisRequest.model_validate(payload_data)
        result = analyze_static(
            [AnalysisPoint(name=point.name, x=point.x, y=point.y, score=point.score) for point in payload.keypoints],
            bounding_box=(
                payload.bounding_box.x,
                payload.bounding_box.y,
                payload.bounding_box.width,
                payload.bounding_box.height,
            ),
            view=payload.view,
            visible_side=payload.visible_side,
            model_id=payload.model_id,
            model_version=payload.model_version,
        )
        return StaticAnalysisResponse.model_validate(asdict(result))

    @app.post("/v1/posture/analysis/movement", response_model=MovementAnalysisResponse)
    async def movement_analysis(
        request: Request,
        frames: Annotated[list[UploadFile], File()],
        action: Annotated[Literal["bilateral-arm-raise", "bodyweight-squat", "neck-retraction"], Form()],
        view: Annotated[Literal["front", "side"], Form()],
        timestamps_ms: Annotated[str, Form(alias="timestampsMs")],
        visible_side: Annotated[Literal["left", "right"] | None, Form(alias="visibleSide")] = None,
    ) -> MovementAnalysisResponse:
        request_started = perf_counter()
        _validate_movement_request(request, frames, timestamps_ms, settings)
        timestamps = _parse_movement_timestamps(timestamps_ms, len(frames))
        bundle = _require_runtime(request)

        decoded_frames = []
        total_decoded_pixels = 0
        decode_total_ms = 0.0
        for upload in frames:
            decode_started = perf_counter()
            try:
                decoded = await read_image_upload(
                    upload,
                    ImageLimits(
                        max_upload_bytes=settings.movement_max_frame_bytes,
                        max_image_pixels=settings.movement_max_frame_pixels,
                    ),
                )
                decoded_frames.append((decoded, None))
                total_decoded_pixels += decoded.width * decoded.height
                if total_decoded_pixels > settings.movement_max_total_pixels:
                    raise InferenceServiceError(
                        code="MOVEMENT_TOTAL_PIXELS_EXCEEDED",
                        message=f"Decoded movement frames exceed the {settings.movement_max_total_pixels}-pixel total limit.",
                        status_code=413,
                        retryable=False,
                        details={"maxTotalPixels": settings.movement_max_total_pixels},
                    )
            except InferenceServiceError as error:
                if error.status_code in (413, 415):
                    raise
                decoded_frames.append((None, error))
            finally:
                decode_total_ms += (perf_counter() - decode_started) * 1000

        inference_frames: list[MovementInferenceFrame] = []
        analysis_frames: list[MovementInputFrame] = []
        detection_total_ms = 0.0
        pose_total_ms = 0.0
        for index, ((decoded, decode_error), timestamp) in enumerate(zip(decoded_frames, timestamps)):
            if decode_error is not None:
                inference_frames.append(
                    MovementInferenceFrame(
                        index=index,
                        timestamp_ms=timestamp,
                        status="failed",
                        error=ErrorDetail(
                            code=decode_error.code,
                            message=decode_error.message,
                            retryable=decode_error.retryable,
                            details=decode_error.details,
                        ),
                    )
                )
                analysis_frames.append(MovementInputFrame(index, timestamp, (), (0, 0, 1, 1), decode_error.code))
                continue
            try:
                output = bundle.engine.infer(decoded.image)
                detection_total_ms += output.detection_time_ms
                pose_total_ms += output.pose_time_ms
                frame_timing = TimingInfo(
                    decode=0,
                    detection=output.detection_time_ms,
                    pose=output.pose_time_ms,
                    total=output.detection_time_ms + output.pose_time_ms,
                )
                person = PersonKeypoints(bounding_box=output.bounding_box, keypoints=output.keypoints)
                inference_frames.append(
                    MovementInferenceFrame(
                        index=index,
                        timestamp_ms=timestamp,
                        status="valid",
                        image=ImageInfo(
                            width=decoded.width,
                            height=decoded.height,
                            mime_type=decoded.mime_type,
                            bytes=decoded.encoded_bytes,
                        ),
                        person=person,
                        timing_ms=frame_timing,
                        warnings=output.warnings,
                    )
                )
                analysis_frames.append(
                    MovementInputFrame(
                        index=index,
                        timestamp_ms=timestamp,
                        keypoints=tuple(AnalysisPoint(point.name, point.x, point.y, point.score) for point in output.keypoints),
                        bounding_box=(output.bounding_box.x, output.bounding_box.y, output.bounding_box.width, output.bounding_box.height),
                    )
                )
            except InferenceServiceError as error:
                inference_frames.append(
                    MovementInferenceFrame(
                        index=index,
                        timestamp_ms=timestamp,
                        status="failed",
                        error=ErrorDetail(code=error.code, message=error.message, retryable=error.retryable, details=error.details),
                    )
                )
                analysis_frames.append(MovementInputFrame(index, timestamp, (), (0, 0, 1, 1), error.code))
            except Exception as error:
                inference_frames.append(
                    MovementInferenceFrame(
                        index=index,
                        timestamp_ms=timestamp,
                        status="failed",
                        error=ErrorDetail(code="INFERENCE_FAILED", message=str(error), retryable=True),
                    )
                )
                analysis_frames.append(MovementInputFrame(index, timestamp, (), (0, 0, 1, 1), "INFERENCE_FAILED"))

        analysis = analyze_movement(
            analysis_frames,
            action=action,
            view=view,
            visible_side=visible_side,
            model_id=bundle.model.id,
            model_version=bundle.model.version,
        )
        total_ms = (perf_counter() - request_started) * 1000
        return MovementAnalysisResponse(
            request_id=str(uuid4()),
            model=bundle.model,
            detector=bundle.detector,
            runtime=bundle.runtime,
            timing_ms=TimingInfo(
                decode=decode_total_ms,
                detection=detection_total_ms,
                pose=pose_total_ms,
                total=total_ms,
            ),
            limits=MovementLimitsResponse(
                max_frames=settings.movement_max_frames,
                max_frame_bytes=settings.movement_max_frame_bytes,
                max_request_bytes=settings.movement_max_request_bytes,
                max_frame_pixels=settings.movement_max_frame_pixels,
                max_total_pixels=settings.movement_max_total_pixels,
            ),
            frames=inference_frames,
            analysis=MovementAnalysisInfo.model_validate(asdict(analysis)),
        )

    return app


def _validate_movement_request(request: Request, frames: list[UploadFile], timestamps_json: str, settings: ServiceConfig) -> None:
    if len(frames) > settings.movement_max_frames:
        raise InferenceServiceError(
            code="MOVEMENT_FRAME_LIMIT_EXCEEDED",
            message=f"Movement request exceeds the {settings.movement_max_frames}-frame limit.",
            status_code=413,
            retryable=False,
            details={"maxFrames": settings.movement_max_frames, "receivedFrames": len(frames)},
        )
    content_length = request.headers.get("content-length")
    known_upload_bytes = sum(upload.size or 0 for upload in frames)
    if (content_length and int(content_length) > settings.movement_max_request_bytes) or known_upload_bytes > settings.movement_max_request_bytes:
        raise InferenceServiceError(
            code="MOVEMENT_REQUEST_TOO_LARGE",
            message=f"Movement request exceeds the {settings.movement_max_request_bytes}-byte total limit.",
            status_code=413,
            retryable=False,
            details={"maxRequestBytes": settings.movement_max_request_bytes},
        )
    _parse_movement_timestamps(timestamps_json, len(frames))


def _parse_movement_timestamps(value: str, frame_count: int) -> list[float]:
    try:
        parsed = json.loads(value)
        timestamps = [float(item) for item in parsed]
    except (TypeError, ValueError, json.JSONDecodeError) as error:
        raise InferenceServiceError(
            code="MOVEMENT_TIMESTAMPS_INVALID",
            message="Movement timestamps must be a JSON array of finite milliseconds.",
            status_code=422,
            retryable=False,
        ) from error
    if len(timestamps) != frame_count or not timestamps or not all(value == value and abs(value) != float("inf") for value in timestamps):
        raise InferenceServiceError(
            code="MOVEMENT_TIMESTAMPS_INVALID",
            message="Movement timestamps must match the submitted frame count.",
            status_code=422,
            retryable=False,
        )
    if any(timestamps[index] >= timestamps[index + 1] for index in range(len(timestamps) - 1)):
        raise InferenceServiceError(
            code="MOVEMENT_TIMESTAMPS_INVALID",
            message="Movement timestamps must be strictly increasing.",
            status_code=422,
            retryable=False,
        )
    return timestamps


def _require_runtime(request: Request) -> RuntimeBundle:
    bundle: RuntimeBundle | None = request.app.state.runtime_bundle
    if bundle is not None:
        return bundle
    error = request.app.state.runtime_error
    detail = str(error) if error else "runtime did not initialize"
    raise InferenceServiceError(
        code="MODEL_UNAVAILABLE",
        message=f"Posture model runtime is unavailable: {detail}",
        status_code=503,
        retryable=True,
    )


app = create_app()
