import os
from typing import Optional
from app.core.config import settings
from app.core.logger import logger
from app.preprocessing.pipeline import pipeline
from app.models.adapter import ModelAdapter
from app.models.pytorch_adapter import PyTorchAdapter
from app.models.onnx_adapter import ONNXAdapter
from app.schemas.inference import (
    InferenceRequest,
    InferenceResponse,
    PredictionStatusEnum,
    PredictedClassEnum
)

CLASSES = [
    PredictedClassEnum.NORMAL,
    PredictedClassEnum.MILD,
    PredictedClassEnum.SEVERE
]

class InferenceEngine:
    def __init__(self):
        self.adapter: ModelAdapter = self._initialize_adapter()
        self._load_active_model()

    def _initialize_adapter(self) -> ModelAdapter:
        framework = settings.MODEL_FRAMEWORK.upper()
        if framework == "ONNX":
            logger.info("Initializing ONNXAdapter...")
            return ONNXAdapter(version=settings.MODEL_VERSION)
        else:
            logger.info("Initializing PyTorchAdapter...")
            return PyTorchAdapter(version=settings.MODEL_VERSION)

    def _load_active_model(self):
        path = settings.MODEL_ARTIFACT_PATH
        if path and os.path.isfile(path):
            success = self.adapter.load(path)
            if success:
                logger.info(f"Successfully loaded model weights from: {path}")
            else:
                logger.warn(f"Failed to parse or load model artifact at: {path}")
        else:
            logger.info("No valid MODEL_ARTIFACT_PATH configured. Operating in MODEL_UNAVAILABLE mode.")

    def run_inference(self, request: InferenceRequest) -> InferenceResponse:
        # CRITICAL PRINCIPLE: Never fabricate predictions.
        # If no valid model is available in the adapter, return MODEL_UNAVAILABLE honestly.
        if not self.adapter.is_available():
            logger.info("Inference request received, but model adapter is unconfigured. Returning MODEL_UNAVAILABLE.")
            return InferenceResponse(
                status=PredictionStatusEnum.MODEL_UNAVAILABLE,
                model_version=settings.MODEL_VERSION,
                preprocessing_version=pipeline.version,
                error_message="Model weights not configured or artifact file missing on host. Real screening offline."
            )

        # Check image exists on disk
        if not os.path.isfile(request.image_path):
            logger.error(f"Image asset file not found at: {request.image_path}")
            return InferenceResponse(
                status=PredictionStatusEnum.FAILED,
                error_message=f"Image file not found on server: {request.image_path}"
            )

        try:
            # 1. Preprocess
            tensor = pipeline.preprocess_image_file(request.image_path)

            # 2. Forward pass with adapter
            prediction_output = self.adapter.predict(tensor)

            normal_p = prediction_output["normal_prob"]
            mild_p = prediction_output["mild_prob"]
            severe_p = prediction_output["severe_prob"]
            latency_ms = prediction_output["latency_ms"]

            probs = [normal_p, mild_p, severe_p]
            max_idx = int(max(range(len(probs)), key=lambda i: probs[i]))
            predicted_class = CLASSES[max_idx]
            confidence = probs[max_idx]

            # 3. Check clinical confidence threshold
            if confidence < settings.CONFIDENCE_THRESHOLD:
                status = PredictionStatusEnum.LOW_CONFIDENCE
            else:
                status = PredictionStatusEnum.AVAILABLE

            return InferenceResponse(
                status=status,
                predicted_class=predicted_class,
                confidence=round(confidence, 4),
                normal_probability=round(normal_p, 4),
                mild_probability=round(mild_p, 4),
                severe_probability=round(severe_p, 4),
                inference_time_ms=latency_ms,
                model_version=settings.MODEL_VERSION,
                preprocessing_version=pipeline.version,
                device_type="cpu"
            )

        except Exception as e:
            logger.error(f"Inference error during execution: {str(e)}")
            return InferenceResponse(
                status=PredictionStatusEnum.FAILED,
                error_message=f"Inference execution failed: {str(e)}"
            )

engine = InferenceEngine()
