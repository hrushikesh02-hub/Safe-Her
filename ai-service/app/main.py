import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.voice import router as voice_router
from app.routes.movement import router as movement_router
from app.routes.fusion import router as fusion_router
from app.routes.predictive import router as predictive_router
from app.routes.response_coordination import router as response_router

from contextlib import asynccontextmanager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("safeher-ai-service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        from app.routes.voice import processor
        import numpy as np
        logger.info("Warming up audio processing pipeline...")
        dummy = np.zeros(2205, dtype=np.float32)
        processor.extract_features(dummy, 22050)
        logger.info("AI Service models warmed up and ready.")
    except Exception as e:
        logger.warning(f"Audio model warmup note: {e}")
    yield


app = FastAPI(
    title="SafeHer AI Service",
    description="AI Safety Platform: Voice Distress Detection (Phase 1) + Movement & GPS Intelligence + Multi-Modal Risk Fusion (Phase 2)",
    version="2.0.0",
    lifespan=lifespan
)

# Enable CORS for local Node backend & React frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(voice_router)
app.include_router(movement_router)
app.include_router(fusion_router)
app.include_router(predictive_router)
app.include_router(response_router)

@app.get("/")
async def root():
    return {
        "service": "SafeHer AI Safety Platform",
        "status": "online",
        "version": "2.0.0",
        "phase": "Phase 2 — Voice + Movement + GPS + Fusion",
        "demo_mode": os.getenv("AI_DEMO_MODE", "true").lower() == "true",
        "docs_url": "/docs"
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
