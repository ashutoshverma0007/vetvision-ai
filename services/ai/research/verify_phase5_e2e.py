import os
import sys
import json
import hashlib
from pathlib import Path
from PIL import Image
import numpy as np

# Ensure services/ai is on sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
AI_DIR = SCRIPT_DIR.parent
REPO_ROOT = AI_DIR.parent.parent
sys.path.insert(0, str(AI_DIR))

from app.core.config import settings
from app.models.onnx_adapter import ONNXAdapter
from app.inference.engine import engine, InferenceEngine
from app.schemas.inference import InferenceRequest, PredictionStatusEnum, PredictedClassEnum
from fastapi.testclient import TestClient
from main import app

def run_phase5_verification():
    report_data = {}
    print("=" * 70)
    print("VETVISION AI — PHASE 5 END-TO-END INFERENCE VERIFICATION")
    print("=" * 70)

    # ---------------------------------------------------------
    # 1. VERIFY MODEL ARTIFACT
    # ---------------------------------------------------------
    onnx_path = AI_DIR / "models" / "efficientnetb0_lsd_v1.onnx"
    pth_path = AI_DIR / "research" / "models" / "efficientnetb0_exp3_best.pth"

    print("\n[STEP 1] Model Artifact Verification:")
    print(f"  ONNX Artifact Path: {onnx_path}")
    print(f"  ONNX Exists: {onnx_path.is_file()}")
    if onnx_path.is_file():
        onnx_size_bytes = onnx_path.stat().st_size
        onnx_size_mb = round(onnx_size_bytes / (1024 * 1024), 2)
        print(f"  ONNX Size: {onnx_size_mb} MB ({onnx_size_bytes} bytes)")
    else:
        raise FileNotFoundError(f"ONNX model missing at {onnx_path}")

    report_data["model_artifact"] = {
        "onnx_path": str(onnx_path),
        "onnx_size_mb": onnx_size_mb,
        "source_checkpoint": str(pth_path),
        "source_checkpoint_exists": pth_path.is_file()
    }

    # ---------------------------------------------------------
    # 2. RUN GENUINE INFERENCE ON EXTERNAL CATTLE LESION IMAGES
    # ---------------------------------------------------------
    print("\n[STEP 2] Running Genuine Inference on External Cattle Images:")
    real_images = [
        REPO_ROOT / "data" / "storage" / "0fa7f247-a87e-4d18-b28a-c71478ee26b7.jpg",
        REPO_ROOT / "data" / "storage" / "d463c616-6043-4d44-a34d-7ebc3b26078b.jpg"
    ]

    real_inference_results = []
    for img_path in real_images:
        if not img_path.is_file():
            print(f"  [WARN] Image not found: {img_path}")
            continue

        with open(img_path, "rb") as f:
            file_bytes = f.read()
            img_sha256 = hashlib.sha256(file_bytes).hexdigest()

        with Image.open(img_path) as pil_img:
            dimensions = pil_img.size
            img_mode = pil_img.mode
            img_format = pil_img.format

        print(f"\n  Image File: {img_path.name}")
        print(f"    Dimensions: {dimensions}, Mode: {img_mode}, Format: {img_format}")
        print(f"    SHA-256: {img_sha256}")

        # Run inference through InferenceEngine
        req = InferenceRequest(imagePath=str(img_path), imageMimeType="image/jpeg")
        res = engine.run_inference(req)

        res_dict = res.model_dump()
        print(f"    Inference Status: {res.status}")
        print(f"    Predicted Class: {res.predicted_class}")
        print(f"    Confidence: {res.confidence}")
        print(f"    Normal Probability: {res.normal_probability}")
        print(f"    Mild Probability: {res.mild_probability}")
        print(f"    Severe Probability: {res.severe_probability}")
        print(f"    Inference Latency: {res.inference_time_ms} ms")
        print(f"    Model Version: {res.model_version}")

        real_inference_results.append({
            "image_filename": img_path.name,
            "sha256": img_sha256,
            "dimensions": f"{dimensions[0]}x{dimensions[1]}",
            "format": img_format,
            "result": res_dict
        })

    report_data["real_cattle_smoke_tests"] = real_inference_results

    # ---------------------------------------------------------
    # 3. VERIFY FASTAPI HTTP ENDPOINTS & SECURITY
    # ---------------------------------------------------------
    print("\n[STEP 3] Verifying FastAPI HTTP Endpoints & Security Contract:")
    client = TestClient(app)

    # 3a. Unauthorized Access
    r_unauth = client.get("/internal/v1/health")
    print(f"  GET /internal/v1/health without token -> HTTP {r_unauth.status_code} (Expected 403)")
    assert r_unauth.status_code == 403

    # 3b. Authorized Health Check
    headers = {"X-Internal-Token": settings.INTERNAL_SECRET}
    r_health = client.get("/internal/v1/health", headers=headers)
    print(f"  GET /internal/v1/health with valid token -> HTTP {r_health.status_code}")
    assert r_health.status_code == 200
    health_json = r_health.json()
    print(f"    Payload: {health_json}")
    assert health_json["status"] == "HEALTHY"
    assert health_json["model_loaded"] is True
    assert settings.MODEL_VERSION in health_json["models"]

    # 3c. Authorized Models List
    r_models = client.get("/internal/v1/models", headers=headers)
    print(f"  GET /internal/v1/models -> HTTP {r_models.status_code}")
    assert r_models.status_code == 200
    models_json = r_models.json()
    print(f"    Active Model: {models_json['active_model']['version']} ({models_json['active_model']['framework']})")
    assert models_json["active_model"]["framework"] == "ONNX"
    assert models_json["active_model"]["is_available"] is True

    # 3d. Post Real Image via API
    api_payload = {
        "imagePath": str(real_images[0]),
        "imageMimeType": "image/jpeg"
    }
    r_infer = client.post("/internal/v1/inference", json=api_payload, headers=headers)
    print(f"  POST /internal/v1/inference with real image -> HTTP {r_infer.status_code}")
    assert r_infer.status_code == 200
    infer_json = r_infer.json()
    print(f"    API Returned Class: {infer_json['predictedClass']}")
    print(f"    Confidence: {infer_json['confidence']}")
    print(f"    Probabilities: Normal={infer_json['normalProbability']}, Mild={infer_json['mildProbability']}, Severe={infer_json['severeProbability']}")
    print(f"    Latency: {infer_json['inferenceTimeMs']} ms")

    report_data["api_verification"] = {
        "unauthorized_status": r_unauth.status_code,
        "health_check": health_json,
        "models_meta": models_json,
        "api_inference_response": infer_json
    }

    # ---------------------------------------------------------
    # 4. EDGE CASE & FAULT TOLERANCE VERIFICATION
    # ---------------------------------------------------------
    print("\n[STEP 4] Edge Case & Fault Tolerance Verification:")

    # 4a. Missing Image File
    req_missing = InferenceRequest(imagePath="data/storage/missing_image_12345.jpg", imageMimeType="image/jpeg")
    res_missing = engine.run_inference(req_missing)
    print(f"  Missing Image -> Status: {res_missing.status}, Error: {res_missing.error_message}")
    assert res_missing.status == PredictionStatusEnum.FAILED

    # 4b. Corrupted Image File
    corrupt_temp = REPO_ROOT / "data" / "storage" / "temp_corrupt.jpg"
    corrupt_temp.write_bytes(b"INVALID_MAGIC_BYTES_1234567890")
    req_corrupt = InferenceRequest(imagePath=str(corrupt_temp), imageMimeType="image/jpeg")
    res_corrupt = engine.run_inference(req_corrupt)
    print(f"  Corrupted Image -> Status: {res_corrupt.status}, Error: {res_corrupt.error_message}")
    assert res_corrupt.status == PredictionStatusEnum.FAILED
    if corrupt_temp.is_file():
        corrupt_temp.unlink()

    # 4c. Model Unmounted / Unavailable State
    test_engine = InferenceEngine()
    test_engine.adapter.unload()  # Simulate unmounted weights
    req_unavail = InferenceRequest(imagePath=str(real_images[0]), imageMimeType="image/jpeg")
    res_unavail = test_engine.run_inference(req_unavail)
    print(f"  Unmounted Model -> Status: {res_unavail.status}, PredictedClass: {res_unavail.predicted_class}, Error: {res_unavail.error_message}")
    assert res_unavail.status == PredictionStatusEnum.MODEL_UNAVAILABLE
    assert res_unavail.predicted_class is None
    assert res_unavail.confidence is None

    report_data["fault_tolerance"] = {
        "missing_file_handling": res_missing.model_dump(),
        "corrupted_file_handling": res_corrupt.model_dump(),
        "unmounted_model_handling": res_unavail.model_dump()
    }

    # Save verification JSON
    json_out = AI_DIR / "research" / "reports" / "phase5_e2e_verification_data.json"
    with open(json_out, "w") as f:
        json.dump(report_data, f, indent=2)
    print(f"\n[DONE] Verification data persisted to: {json_out}")
    print("=" * 70)

if __name__ == "__main__":
    run_phase5_verification()
