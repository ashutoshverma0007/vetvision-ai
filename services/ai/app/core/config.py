import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    APP_NAME: str = "VetVision AI Inference Service"
    ENVIRONMENT: str = "development"
    HOST: str = "0.0.0.0"
    AI_PORT: int = 8000
    PORT: int = 8000

    def model_post_init(self, __context):
        # Allow dynamic PORT injected by cloud container hosts (e.g. Render, Railway)
        env_port = os.environ.get("PORT") or os.environ.get("AI_PORT")
        if env_port:
            try:
                self.PORT = int(env_port)
            except ValueError:
                pass
    
    # Internal Authentication
    INTERNAL_SECRET: str = "dev-internal-ai-secret-key-32-bytes-long"
    
    # Model Configuration
    # If weights do not exist at MODEL_ARTIFACT_PATH, the service explicitly returns MODEL_UNAVAILABLE
    MODEL_ARTIFACT_PATH: Optional[str] = "services/ai/models/efficientnetb0_lsd_v1.onnx"
    MODEL_VERSION: str = "lsd-efficientnetb0-v1.0.0"
    MODEL_FRAMEWORK: str = "ONNX"  # PYTORCH or ONNX
    CONFIDENCE_THRESHOLD: float = 0.65
    
    # Input Tensor Dimensions
    INPUT_WIDTH: int = 224
    INPUT_HEIGHT: int = 224
    
    model_config = {
        "env_file": ".env",
        "extra": "ignore"
    }

settings = Settings()
