import uvicorn
from fastapi import FastAPI
from app.core.config import settings
from app.api.routes import api_router

app = FastAPI(
    title=settings.APP_NAME,
    description="Internal machine learning inference and benchmarking service for VetVision AI",
    version="1.0.0",
    docs_url=None,  # Disabled in production for internal security
    redoc_url=None
)

app.include_router(api_router)

if __name__ == "__main__":
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=False)
