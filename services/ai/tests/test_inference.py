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
