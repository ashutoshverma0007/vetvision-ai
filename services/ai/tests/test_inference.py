from app.inference.engine import InferenceEngine
from app.schemas.inference import InferenceRequest, PredictionStatusEnum
from app.models.adapter import ModelAdapter
import numpy as np

def test_inference_engine_returns_model_unavailable_when_weights_unconfigured():
    engine = InferenceEngine()
    # Force adapter to unavailable to test contract
    engine.adapter.model = None

    req = InferenceRequest(imagePath="dummy/path.jpg", imageMimeType="image/jpeg")
    res = engine.run_inference(req)

    assert res.status == PredictionStatusEnum.MODEL_UNAVAILABLE
    assert res.predicted_class is None
    assert res.confidence is None
    assert res.error_message is not None

class MockModelAdapter(ModelAdapter):
    def __init__(self, probs, latency=25.0):
        self.probs = probs
        self.latency = latency
    def load(self, path): return True
    def is_available(self): return True
    def predict(self, tensor):
        return {
            "normal_prob": self.probs[0],
            "mild_prob": self.probs[1],
            "severe_prob": self.probs[2],
            "latency_ms": self.latency
        }
    def get_metadata(self): return {"version": "mock-v1", "framework": "TEST"}

def test_inference_engine_detects_low_confidence(tmp_path):
    # Create temporary image
    from PIL import Image
    img_path = str(tmp_path / "test.jpg")
    Image.new("RGB", (100, 100)).save(img_path)

    engine = InferenceEngine()
    # Mock probabilities where highest probability is 0.45 (< 0.65 threshold)
    engine.adapter = MockModelAdapter([0.45, 0.35, 0.20])

    req = InferenceRequest(imagePath=img_path, imageMimeType="image/jpeg")
    res = engine.run_inference(req)

    assert res.status == PredictionStatusEnum.LOW_CONFIDENCE
    assert res.confidence == 0.45
    assert res.predicted_class == "NORMAL"

def test_inference_engine_confident_prediction(tmp_path):
    from PIL import Image
    img_path = str(tmp_path / "test.jpg")
    Image.new("RGB", (100, 100)).save(img_path)

    engine = InferenceEngine()
    # Mock high confidence SEVERE lesion: 0.88 (> 0.65 threshold)
    engine.adapter = MockModelAdapter([0.05, 0.07, 0.88], latency=42.0)

    req = InferenceRequest(imagePath=img_path, imageMimeType="image/jpeg")
    res = engine.run_inference(req)

    assert res.status == PredictionStatusEnum.AVAILABLE
    assert res.confidence == 0.88
    assert res.predicted_class == "SEVERE"
    assert res.severe_probability == 0.88
    assert res.inference_time_ms == 42.0

def test_inference_engine_missing_image_file():
    engine = InferenceEngine()
    req = InferenceRequest(imagePath="non_existent_folder/missing_image.jpg", imageMimeType="image/jpeg")
    res = engine.run_inference(req)

    assert res.status == PredictionStatusEnum.FAILED
    assert "Image file not found" in res.error_message

def test_inference_engine_corrupted_image_file(tmp_path):
    corrupt_file = tmp_path / "corrupt.jpg"
    corrupt_file.write_bytes(b"NOT_A_VALID_JPEG_HEADER_RANDOM_CORRUPT_BYTES_XYZ")

    engine = InferenceEngine()
    req = InferenceRequest(imagePath=str(corrupt_file), imageMimeType="image/jpeg")
    res = engine.run_inference(req)

    assert res.status == PredictionStatusEnum.FAILED
    assert "Inference execution failed" in res.error_message

def test_inference_engine_unsupported_image_format(tmp_path):
    text_file = tmp_path / "document.txt"
    text_file.write_text("This is plain text, not an image format.")

    engine = InferenceEngine()
    req = InferenceRequest(imagePath=str(text_file), imageMimeType="text/plain")
    res = engine.run_inference(req)

    assert res.status == PredictionStatusEnum.FAILED
    assert "Inference execution failed" in res.error_message

class FailingAdapter(ModelAdapter):
    def load(self, path): return True
    def is_available(self): return True
    def predict(self, tensor):
        raise RuntimeError("Hardware or runtime failure inside model execution")
    def get_metadata(self): return {"version": "fail-v1", "framework": "TEST"}

def test_inference_engine_handles_adapter_runtime_failure(tmp_path):
    from PIL import Image
    img_path = str(tmp_path / "test.jpg")
    Image.new("RGB", (100, 100)).save(img_path)

    engine = InferenceEngine()
    engine.adapter = FailingAdapter()

    req = InferenceRequest(imagePath=img_path, imageMimeType="image/jpeg")
    res = engine.run_inference(req)

    assert res.status == PredictionStatusEnum.FAILED
    assert "Inference execution failed" in res.error_message
    assert "Hardware or runtime failure" in res.error_message

