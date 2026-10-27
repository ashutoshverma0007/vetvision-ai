from fastapi.testclient import TestClient
from PIL import Image
from pathlib import Path
from main import app
from app.core.config import settings
from app.schemas.inference import PredictionStatusEnum, PredictedClassEnum

client = TestClient(app)

def test_api_health_endpoint():
    # Test unauthorized access
    unauth_resp = client.get("/internal/v1/health")
    assert unauth_resp.status_code == 403

    # Test authorized access
    headers = {"X-Internal-Token": settings.INTERNAL_SECRET}
    resp = client.get("/internal/v1/health", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "HEALTHY"
    assert data["model_loaded"] is True
    assert settings.MODEL_VERSION in data["models"]

def test_api_models_endpoint():
    headers = {"X-Internal-Token": settings.INTERNAL_SECRET}
    resp = client.get("/internal/v1/models", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["active_model"]["framework"] == "ONNX"
    assert data["active_model"]["version"] == "lsd-efficientnetb0-v1.0.0"
    assert data["active_model"]["is_available"] is True
    assert data["confidence_threshold"] == 0.65
    assert data["input_dimensions"] == {"width": 224, "height": 224}

def test_api_inference_endpoint_real_image(tmp_path):
    img_path = str(tmp_path / "test_api_cattle.jpg")
    img = Image.new("RGB", (256, 256), color=(140, 100, 70))
    img.save(img_path)

    headers = {"X-Internal-Token": settings.INTERNAL_SECRET}
    payload = {
        "imagePath": img_path,
        "imageMimeType": "image/jpeg"
    }

    resp = client.post("/internal/v1/inference", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["status"] in ["AVAILABLE", "LOW_CONFIDENCE"]
    assert data["predictedClass"] in ["NORMAL", "MILD", "SEVERE"]
    assert data["confidence"] is not None
    assert data["normalProbability"] is not None
    assert data["mildProbability"] is not None
    assert data["severeProbability"] is not None
    assert data["inferenceTimeMs"] is not None and data["inferenceTimeMs"] > 0
    assert data["modelVersion"] == "lsd-efficientnetb0-v1.0.0"
    assert data["deviceType"] == "cpu"
    assert data["errorMessage"] is None
