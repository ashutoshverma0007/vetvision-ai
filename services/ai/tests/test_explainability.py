"""
==============================================================================
VetVision AI - Unit Tests: Explainability Module (Grad-CAM)
==============================================================================
Module: services.ai.tests.test_explainability
Tests:
    1. Checkpoint loading and weight verification for EfficientNet-B0.
    2. Correct identification of final convolutional feature layer.
    3. Forward and backward hook execution and gradient capture.
    4. Heatmap spatial resolution, normalization [0, 1], and output dimensions.
    5. Class index handling (integer vs string names).
    6. Invalid input handling (non-existent image, invalid class name/index).
    7. Full end-to-end explanation generation and artifact verification.
==============================================================================
"""

import json
from pathlib import Path
import numpy as np
import pytest
import torch
from PIL import Image

from research.explainability import (
    CLASS_NAMES,
    CLASS_TO_IDX,
    GradCAM,
    apply_colormap_and_overlay,
    generate_explanation,
    get_target_layer,
    load_efficientnetb0_checkpoint,
    preprocess_image,
)

AI_DIR = Path(__file__).resolve().parents[1]
CHECKPOINT_PATH = AI_DIR / "research" / "models" / "efficientnetb0_exp3_best.pth"
SAMPLE_VAL_IMAGE = (
    AI_DIR.parent.parent
    / "data"
    / "lsd"
    / "LumpySkinDisease_DataHub"
    / "LumpySkinDisease_DataHub"
    / "data-processed"
    / "lumpy_unbalanced"
    / "lumpy"
    / "Mild_101.png"
)


def test_checkpoint_exists():
    """Verify the Experiment 3 PyTorch checkpoint exists on disk."""
    assert CHECKPOINT_PATH.is_file(), f"Checkpoint not found at {CHECKPOINT_PATH}"
    assert CHECKPOINT_PATH.stat().st_size > 30 * 1024 * 1024, "Checkpoint file size is unexpectedly small"


def test_load_checkpoint_and_architecture():
    """Verify loading checkpoint yields an EfficientNet-B0 with 3 output classes."""
    model, metadata = load_efficientnetb0_checkpoint(CHECKPOINT_PATH, num_classes=3)
    assert model is not None
    assert not model.training, "Model should be in evaluation mode"
    assert hasattr(model, "classifier")
    assert model.classifier[1].out_features == 3
    assert metadata.get("epoch") == 51
    assert metadata.get("phase") == 2
    assert metadata.get("class_names") == ["Normal", "Mild", "Severe"]


def test_target_layer_identification():
    """Verify target layer is correctly resolved to model.features[-1]."""
    model, _ = load_efficientnetb0_checkpoint(CHECKPOINT_PATH)
    target_layer = get_target_layer(model)
    assert target_layer is model.features[-1]
    assert hasattr(target_layer, "forward")


def test_gradcam_hook_registration_and_cleanup():
    """Verify GradCAM registers forward hook and clears them upon removal."""
    model, _ = load_efficientnetb0_checkpoint(CHECKPOINT_PATH)
    cam_engine = GradCAM(model)
    assert len(cam_engine.hook_handles) == 1

    cam_engine.remove_hooks()
    assert len(cam_engine.hook_handles) == 0


def test_preprocess_image():
    """Verify image preprocessing produces 4D tensor with expected shape and valid range."""
    assert SAMPLE_VAL_IMAGE.is_file(), f"Sample validation image not found: {SAMPLE_VAL_IMAGE}"
    tensor, orig_img, orig_size = preprocess_image(SAMPLE_VAL_IMAGE)

    assert tensor.dim() == 4
    assert tensor.shape == (1, 3, 224, 224)
    assert isinstance(orig_img, Image.Image)
    assert orig_size == (256, 256)
    assert orig_img.mode == "RGB"


def test_cam_computation_and_range():
    """Verify forward/backward pass computes a normalized 2D CAM in [0, 1]."""
    model, _ = load_efficientnetb0_checkpoint(CHECKPOINT_PATH)
    cam_engine = GradCAM(model)
    input_tensor, _, _ = preprocess_image(SAMPLE_VAL_IMAGE)

    try:
        cam_2d, pred_idx, pred_prob, probs = cam_engine.generate_cam(input_tensor)
        assert isinstance(cam_2d, np.ndarray)
        assert cam_2d.ndim == 2
        # Feature map resolution for 224x224 in EfficientNet-B0 is 7x7
        assert cam_2d.shape == (7, 7)
        assert 0.0 <= np.min(cam_2d) <= 1.0
        assert 0.0 <= np.max(cam_2d) <= 1.0
        assert pred_idx in [0, 1, 2]
        assert 0.0 <= pred_prob <= 1.0
        assert sum(probs.values()) == pytest.approx(1.0, abs=0.01)
    finally:
        cam_engine.remove_hooks()


def test_target_class_selection():
    """Verify specifying an explicit target class computes CAM for that class."""
    model, _ = load_efficientnetb0_checkpoint(CHECKPOINT_PATH)
    cam_engine = GradCAM(model)
    input_tensor, _, _ = preprocess_image(SAMPLE_VAL_IMAGE)

    try:
        # Target Severe (index 2)
        cam_severe, _, _, _ = cam_engine.generate_cam(input_tensor, target_class_idx=2)
        # Target Normal (index 0)
        cam_normal, _, _, _ = cam_engine.generate_cam(input_tensor, target_class_idx=0)

        assert cam_severe.shape == (7, 7)
        assert cam_normal.shape == (7, 7)
        # Explanations for distinct classes should not be identical
        assert not np.allclose(cam_severe, cam_normal)
    finally:
        cam_engine.remove_hooks()


def test_colormap_and_overlay_dimensions():
    """Verify upsampling matches original image resolution."""
    cam_2d = np.random.uniform(0.0, 1.0, (7, 7)).astype(np.float32)
    fake_orig = Image.new("RGB", (320, 240), color=(128, 128, 128))

    cam_gray, rgb_colored, overlay_pil, composite_pil = apply_colormap_and_overlay(
        cam_2d, fake_orig, colormap_name="jet", alpha=0.5
    )

    assert cam_gray.shape == (240, 320)
    assert rgb_colored.shape == (240, 320, 3)
    assert overlay_pil.size == (320, 240)
    # Composite width = 3 * 320 + 2 * 10 = 980
    assert composite_pil.size == (980, 240)


def test_end_to_end_generate_explanation(tmp_path):
    """Verify full end-to-end generate_explanation pipeline creates all expected files."""
    out_dir = tmp_path / "gradcam_output"

    meta = generate_explanation(
        image_path=SAMPLE_VAL_IMAGE,
        checkpoint_path=CHECKPOINT_PATH,
        output_dir=out_dir,
        target_class="Mild",
    )

    assert meta is not None
    assert meta["prediction"]["predicted_class"] in CLASS_NAMES
    assert meta["explanation"]["target_class"] == "Mild"

    stem = SAMPLE_VAL_IMAGE.stem
    expected_files = [
        out_dir / f"{stem}_original.png",
        out_dir / f"{stem}_heatmap_gray.png",
        out_dir / f"{stem}_heatmap_colored.png",
        out_dir / f"{stem}_overlay.png",
        out_dir / f"{stem}_composite.png",
        out_dir / f"{stem}_metadata.json",
    ]

    for f in expected_files:
        assert f.is_file(), f"Expected artifact {f.name} was not created"
        assert f.stat().st_size > 0, f"Artifact {f.name} is empty"

    # Verify metadata JSON structure
    with open(out_dir / f"{stem}_metadata.json", "r", encoding="utf-8") as jf:
        data = json.load(jf)
        assert data["provenance"]["checkpoint_sha256"] != ""
        assert data["input_dimensions"]["native_width"] == 256
        assert data["input_dimensions"]["native_height"] == 256


def test_invalid_image_path():
    """Verify FileNotFoundError is raised for non-existent image."""
    with pytest.raises(FileNotFoundError):
        generate_explanation(
            image_path="non_existent_image.png",
            checkpoint_path=CHECKPOINT_PATH,
            output_dir="tmp",
        )


def test_invalid_checkpoint_path():
    """Verify FileNotFoundError is raised for non-existent checkpoint."""
    with pytest.raises(FileNotFoundError):
        generate_explanation(
            image_path=SAMPLE_VAL_IMAGE,
            checkpoint_path="non_existent_ckpt.pth",
            output_dir="tmp",
        )


def test_invalid_target_class():
    """Verify ValueError is raised for invalid target class name or out-of-range index."""
    with pytest.raises(ValueError):
        generate_explanation(
            image_path=SAMPLE_VAL_IMAGE,
            checkpoint_path=CHECKPOINT_PATH,
            output_dir="tmp",
            target_class="NonExistentClass",
        )

    with pytest.raises(ValueError):
        generate_explanation(
            image_path=SAMPLE_VAL_IMAGE,
            checkpoint_path=CHECKPOINT_PATH,
            output_dir="tmp",
            target_class=99,
        )
