from fastapi import APIRouter, Header, HTTPException, status
from typing import Optional, Dict, Any
from app.core.config import settings
from app.core.logger import logger
from app.schemas.inference import InferenceRequest, InferenceResponse
from app.inference.engine import engine

api_router = APIRouter()

def verify_internal_token(x_internal_token: Optional[str] = Header(None, alias="X-Internal-Token")):
    if not x_internal_token or x_internal_token != settings.INTERNAL_SECRET:
        logger.warn("Unauthorized internal request rejected")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing X-Internal-Token header"
        )

@api_router.post("/internal/v1/inference", response_model=InferenceResponse)
def run_inference(
    request: InferenceRequest,
    x_internal_token: Optional[str] = Header(None, alias="X-Internal-Token")
) -> InferenceResponse:
    verify_internal_token(x_internal_token)
    return engine.run_inference(request)

@api_router.get("/internal/v1/health")
def health_check(
    x_internal_token: Optional[str] = Header(None, alias="X-Internal-Token")
) -> Dict[str, Any]:
    verify_internal_token(x_internal_token)
    is_model_loaded = engine.adapter.is_available()
    return {
        "status": "HEALTHY",
        "service": settings.APP_NAME,
        "model_loaded": is_model_loaded,
        "models": [settings.MODEL_VERSION] if is_model_loaded else []
    }

@api_router.get("/internal/v1/models")
def list_models(
    x_internal_token: Optional[str] = Header(None, alias="X-Internal-Token")
) -> Dict[str, Any]:
    verify_internal_token(x_internal_token)
    return {
        "active_model": engine.adapter.get_metadata(),
        "confidence_threshold": settings.CONFIDENCE_THRESHOLD,
        "input_dimensions": {
            "width": settings.INPUT_WIDTH,
            "height": settings.INPUT_HEIGHT
        }
    }
