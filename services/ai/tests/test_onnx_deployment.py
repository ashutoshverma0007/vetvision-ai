import os
from pathlib import Path
import numpy as np
import pytest
import torch
import torchvision.models as models
import torch.nn as nn
from PIL import Image

from app.models.onnx_adapter import ONNXAdapter
from app.models.pytorch_adapter import PyTorchAdapter
from app.inference.engine import InferenceEngine
from app.schemas.inference import InferenceRequest, PredictionStatusEnum, PredictedClassEnum

AI_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = AI_DIR.parent
ONNX_PATH = AI_DIR / "models" / "efficientnetb0_lsd_v1.onnx"
PTH_PATH = AI_DIR / "research" / "models" / "efficientnetb0_exp3_best.pth"


def test_onnx_artifact_exists():
    """Verify the exported ONNX model artifact exists and is non-empty."""
    assert ONNX_PATH.is_file(), f"ONNX model artifact not found at {ONNX_PATH}"
    assert ONNX_PATH.stat().st_size > 10 * 1024 * 1024, "ONNX artifact size is unexpectedly small"


def test_onnx_adapter_successful_loading():
    """Verify ONNXAdapter loads the artifact into an active ONNX Runtime session."""
    adapter = ONNXAdapter(version="lsd-efficientnetb0-v1.0.0")
    loaded = adapter.load(str(ONNX_PATH))
    assert loaded is True, "Failed to load ONNX model via ONNXAdapter"
    assert adapter.is_available() is True, "ONNXAdapter does not report available after load"
    assert adapter.session is not None
    assert adapter.input_name == "input"


def test_onnx_adapter_metadata():
    """Verify ONNXAdapter metadata matches expected deployment schema."""
    adapter = ONNXAdapter(version="lsd-efficientnetb0-v1.0.0")
    adapter.load(str(ONNX_PATH))
    meta = adapter.get_metadata()

    assert meta["version"] == "lsd-efficientnetb0-v1.0.0"
    assert meta["framework"] == "ONNX"
    assert meta["is_available"] is True
    assert meta["device"] == "cpu"
    assert str(ONNX_PATH) in meta["artifact_path"]


def test_onnx_output_shape_and_probability_distribution():
    """Verify ONNX model output shape is 3 classes and probabilities sum to 1.0."""
    adapter = ONNXAdapter(version="lsd-efficientnetb0-v1.0.0")
    adapter.load(str(ONNX_PATH))

    # Synthetic input of shape (1, 3, 224, 224)
    dummy_input = np.random.randn(1, 3, 224, 224).astype(np.float32)
    output = adapter.predict(dummy_input)

    assert "normal_prob" in output
    assert "mild_prob" in output
    assert "severe_prob" in output
    assert "latency_ms" in output

    p_norm = output["normal_prob"]
    p_mild = output["mild_prob"]
    p_sev = output["severe_prob"]

    assert 0.0 <= p_norm <= 1.0
    assert 0.0 <= p_mild <= 1.0
    assert 0.0 <= p_sev <= 1.0

    total_prob = p_norm + p_mild + p_sev
    assert pytest.approx(total_prob, abs=1e-5) == 1.0
    assert output["latency_ms"] >= 0.0


def test_onnx_class_ordering_contract():
    """
    Verify the class index mapping matches the Experiment 3 training specification:
    Index 0 -> Normal
    Index 1 -> Mild
    Index 2 -> Severe
    """
    adapter = ONNXAdapter(version="lsd-efficientnetb0-v1.0.0")
    adapter.load(str(ONNX_PATH))

    # Test with synthetic input
    tensor = np.zeros((1, 3, 224, 224), dtype=np.float32)
    raw_outputs = adapter.session.run(None, {adapter.input_name: tensor})
    logits = raw_outputs[0][0]

    # Verify 3 output classes
    assert len(logits) == 3

    # Check that adapter maps indices [0, 1, 2] to [normal, mild, severe]
    exp_logits = np.exp(logits - np.max(logits))
    expected_probs = exp_logits / np.sum(exp_logits)

    pred = adapter.predict(tensor)
    assert pytest.approx(pred["normal_prob"], abs=1e-5) == expected_probs[0]
    assert pytest.approx(pred["mild_prob"], abs=1e-5) == expected_probs[1]
    assert pytest.approx(pred["severe_prob"], abs=1e-5) == expected_probs[2]


def test_onnx_pytorch_numerical_equivalence_synthetic():
    """
    Verify numerical equivalence between original PyTorch checkpoint and exported ONNX model
    on synthetic test inputs.
    Constraint: Do not use test images. Logit max diff must be < 1e-4.
    """
    if not PTH_PATH.is_file():
        pytest.skip(f"PyTorch checkpoint not found at {PTH_PATH}")

    # Load PyTorch model
    checkpoint = torch.load(str(PTH_PATH), map_location="cpu")
    pt_model = models.efficientnet_b0(weights=None)
    in_features = pt_model.classifier[1].in_features
    pt_model.classifier = nn.Sequential(
        nn.Dropout(p=0.2, inplace=True),
        nn.Linear(in_features, 3)
    )
    pt_model.load_state_dict(checkpoint["model_state_dict"])
    pt_model.eval()

    # Load ONNX adapter
    adapter = ONNXAdapter()
    adapter.load(str(ONNX_PATH))

    # Evaluate across 10 deterministic synthetic tensors
    np.random.seed(42)
    max_abs_diff = 0.0

    for i in range(10):
        dummy_np = np.random.randn(1, 3, 224, 224).astype(np.float32)
        dummy_torch = torch.from_numpy(dummy_np)

        with torch.no_grad():
            pt_logits = pt_model(dummy_torch).numpy()[0]

        ort_logits = adapter.session.run(None, {adapter.input_name: dummy_np})[0][0]

        diff = np.max(np.abs(pt_logits - ort_logits))
        if diff > max_abs_diff:
            max_abs_diff = diff

        # Class predictions must match 100%
        assert np.argmax(pt_logits) == np.argmax(ort_logits)

    # Max difference strictly below 1e-4
    assert max_abs_diff < 1e-4, f"Max absolute difference {max_abs_diff} exceeds tolerance 1e-4"


def test_inference_engine_end_to_end_with_onnx(tmp_path):
    """
    Verify end-to-end inference flow through InferenceEngine using the ONNX backend
    on a synthetic RGB image.
    """
    img_path = str(tmp_path / "synthetic_cow_lesion.jpg")
    img = Image.new("RGB", (300, 300), color=(128, 80, 60))
    img.save(img_path)

    engine = InferenceEngine()
    req = InferenceRequest(imagePath=img_path, imageMimeType="image/jpeg")
    res = engine.run_inference(req)

    assert res.status in [PredictionStatusEnum.AVAILABLE, PredictionStatusEnum.LOW_CONFIDENCE]
    assert res.predicted_class in [PredictedClassEnum.NORMAL, PredictedClassEnum.MILD, PredictedClassEnum.SEVERE]
    assert res.confidence is not None and 0.0 <= res.confidence <= 1.0
    assert res.normal_probability is not None and 0.0 <= res.normal_probability <= 1.0
    assert res.mild_probability is not None and 0.0 <= res.mild_probability <= 1.0
    assert res.severe_probability is not None and 0.0 <= res.severe_probability <= 1.0
    assert res.inference_time_ms is not None and res.inference_time_ms > 0.0
    assert res.device_type == "cpu"
    assert res.model_version == "lsd-efficientnetb0-v1.0.0"
