import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    APP_NAME: str = "VetVision AI Inference Service"
    ENVIRONMENT: str = "development"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Internal Authentication
    INTERNAL_SECRET: str = "dev-internal-ai-secret-key-32-bytes-long"
    
    # Model Configuration
    # If weights do not exist at MODEL_ARTIFACT_PATH, the service explicitly returns MODEL_UNAVAILABLE
    MODEL_ARTIFACT_PATH: Optional[str] = None
    MODEL_VERSION: str = "lsd-resnet50-v1.0.0"
    MODEL_FRAMEWORK: str = "PYTORCH"  # PYTORCH or ONNX
    CONFIDENCE_THRESHOLD: float = 0.65
    
    # Input Tensor Dimensions
    INPUT_WIDTH: int = 224
    INPUT_HEIGHT: int = 224
    
    model_config = {
        "env_file": ".env",
        "extra": "ignore"
    }

settings = Settings()
