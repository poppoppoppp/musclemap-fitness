from app.schemas import HALPE26_NAMES, KeypointResponse


def test_keypoint_response_requires_explicit_pixel_coordinate_space_and_26_names() -> None:
    assert len(HALPE26_NAMES) == 26
    assert HALPE26_NAMES[0] == "nose"
    assert HALPE26_NAMES[20:26] == (
        "left_big_toe",
        "right_big_toe",
        "left_small_toe",
        "right_small_toe",
        "left_heel",
        "right_heel",
    )
    coordinate_field = KeypointResponse.model_fields["coordinate_space"]
    assert coordinate_field.annotation is not None
