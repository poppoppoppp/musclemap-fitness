from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np
from numpy.typing import NDArray
from starlette.datastructures import UploadFile

from .errors import InferenceServiceError


SUPPORTED_IMAGE_TYPES = frozenset({"image/jpeg", "image/png", "image/webp"})
READ_CHUNK_BYTES = 64 * 1024


@dataclass(frozen=True)
class ImageLimits:
    max_upload_bytes: int
    max_image_pixels: int


@dataclass(frozen=True)
class DecodedImage:
    image: NDArray[np.uint8]
    width: int
    height: int
    mime_type: str
    encoded_bytes: int


async def read_image_upload(upload: UploadFile, limits: ImageLimits) -> DecodedImage:
    content_type = (upload.content_type or "").lower()
    if content_type not in SUPPORTED_IMAGE_TYPES:
        raise InferenceServiceError(
            code="UNSUPPORTED_IMAGE_TYPE",
            message="Image type must be JPEG, PNG, or WebP.",
            status_code=415,
            retryable=False,
            details={"receivedContentType": content_type or None},
        )

    contents = bytearray()
    while chunk := await upload.read(READ_CHUNK_BYTES):
        contents.extend(chunk)
        if len(contents) > limits.max_upload_bytes:
            raise InferenceServiceError(
                code="IMAGE_TOO_LARGE",
                message=f"Image exceeds the {limits.max_upload_bytes}-byte upload limit.",
                status_code=413,
                retryable=False,
                details={"maxUploadBytes": limits.max_upload_bytes},
            )

    encoded = np.frombuffer(contents, dtype=np.uint8)
    image = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
    if image is None:
        raise InferenceServiceError(
            code="IMAGE_DECODE_FAILED",
            message="Image cannot be decoded as the declared supported type.",
            status_code=422,
            retryable=False,
        )
    height, width = image.shape[:2]
    if width * height > limits.max_image_pixels:
        raise InferenceServiceError(
            code="IMAGE_DIMENSIONS_EXCEEDED",
            message=f"Decoded image exceeds the {limits.max_image_pixels}-pixel limit.",
            status_code=413,
            retryable=False,
            details={"width": width, "height": height, "maxImagePixels": limits.max_image_pixels},
        )
    return DecodedImage(
        image=image,
        width=width,
        height=height,
        mime_type=content_type,
        encoded_bytes=len(contents),
    )
