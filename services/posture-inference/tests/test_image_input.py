import asyncio

import cv2
import numpy as np
import pytest
from starlette.datastructures import UploadFile

from app.errors import InferenceServiceError
from app.image_input import ImageLimits, read_image_upload


@pytest.mark.parametrize(
    ("extension", "content_type"),
    [(".jpg", "image/jpeg"), (".png", "image/png"), (".webp", "image/webp")],
)
def test_decodes_supported_image_without_changing_dimensions(extension: str, content_type: str) -> None:
    image = np.zeros((7, 11, 3), dtype=np.uint8)
    success, encoded = cv2.imencode(extension, image)
    assert success
    upload = UploadFile(filename=f"frame{extension}", file=_memory_file(encoded.tobytes()), headers={"content-type": content_type})

    decoded = asyncio.run(read_image_upload(upload, ImageLimits(max_upload_bytes=1024, max_image_pixels=100)))

    assert decoded.width == 11
    assert decoded.height == 7
    assert decoded.mime_type == content_type
    assert decoded.image.shape == (7, 11, 3)


def test_rejects_corrupt_supported_image() -> None:
    upload = UploadFile(filename="frame.webp", file=_memory_file(b"not-an-image"), headers={"content-type": "image/webp"})

    with pytest.raises(InferenceServiceError, match="cannot be decoded") as caught:
        asyncio.run(read_image_upload(upload, ImageLimits(max_upload_bytes=1024, max_image_pixels=100)))

    assert caught.value.code == "IMAGE_DECODE_FAILED"


def test_rejects_unsupported_media_type_before_decode() -> None:
    upload = UploadFile(filename="frame.gif", file=_memory_file(b"GIF89a"), headers={"content-type": "image/gif"})

    with pytest.raises(InferenceServiceError) as caught:
        asyncio.run(read_image_upload(upload, ImageLimits(max_upload_bytes=1024, max_image_pixels=100)))

    assert caught.value.code == "UNSUPPORTED_IMAGE_TYPE"
    assert caught.value.status_code == 415


def test_rejects_upload_larger_than_byte_limit() -> None:
    upload = UploadFile(filename="frame.jpg", file=_memory_file(b"12345"), headers={"content-type": "image/jpeg"})

    with pytest.raises(InferenceServiceError) as caught:
        asyncio.run(read_image_upload(upload, ImageLimits(max_upload_bytes=4, max_image_pixels=100)))

    assert caught.value.code == "IMAGE_TOO_LARGE"
    assert caught.value.status_code == 413


def test_rejects_decoded_image_larger_than_pixel_limit() -> None:
    image = np.zeros((10, 10, 3), dtype=np.uint8)
    success, encoded = cv2.imencode(".png", image)
    assert success
    upload = UploadFile(filename="frame.png", file=_memory_file(encoded.tobytes()), headers={"content-type": "image/png"})

    with pytest.raises(InferenceServiceError) as caught:
        asyncio.run(read_image_upload(upload, ImageLimits(max_upload_bytes=1024, max_image_pixels=99)))

    assert caught.value.code == "IMAGE_DIMENSIONS_EXCEEDED"
    assert caught.value.status_code == 413


def _memory_file(contents: bytes):
    from io import BytesIO

    return BytesIO(contents)
