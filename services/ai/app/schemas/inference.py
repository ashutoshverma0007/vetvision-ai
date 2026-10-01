from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from enum import Enum

class PredictionStatusEnum(str, Enum):
    AVAILABLE = "AVAILABLE"
    LOW_CONFIDENCE = "LOW_CONFIDENCE"
    MODEL_UNAVAILABLE = "MODEL_UNAVAILABLE"
    FAILED = "FAILED"

class PredictedClassEnum(str, Enum):
    NORMAL = "NORMAL"
    MILD = "MILD"
    SEVERE = "SEVERE"

class InferenceRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    image_path: str = Field(..., alias="imagePath", description="Absolute local path to image asset")
    image_mime_type: str = Field("image/jpeg", alias="imageMimeType", description="MIME type of the image")
    model_version_id: Optional[str] = Field(None, alias="modelVersionId", description="Specific model version requested")

class InferenceResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    status: PredictionStatusEnum
    predicted_class: Optional[PredictedClassEnum] = Field(None, alias="predictedClass")
    confidence: Optional[float] = None
    normal_probability: Optional[float] = Field(None, alias="normalProbability")
    mild_probability: Optional[float] = Field(None, alias="mildProbability")
    severe_probability: Optional[float] = Field(None, alias="severeProbability")
    inference_time_ms: Optional[float] = Field(None, alias="inferenceTimeMs")
    model_version: Optional[str] = Field(None, alias="modelVersion")
    preprocessing_version: Optional[str] = Field("1.0.0", alias="preprocessingVersion")
    device_type: Optional[str] = Field("cpu", alias="deviceType")
    error_message: Optional[str] = Field(None, alias="errorMessage")

