"""
main.py — FastAPI application entry point.
Run with: uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import get_settings
from database import create_tables
from face_engine.recognizer import recognizer
from routers import auth, students, attendance, camera, reports, training, student_portal, leaves

settings = get_settings()
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown logic."""
    logger.info("🚀 Starting AI Attendance Manager")
    create_tables()
    recognizer.load()  # try to load existing model on startup
    if recognizer.is_ready:
        logger.info("✅ Face recognition model loaded")
    else:
        logger.warning("⚠️  No trained model found — train via POST /api/training/train")
    yield
    logger.info("👋 Shutting down")


app = FastAPI(
    title="AI Attendance Manager",
    description="Automated face-recognition attendance system",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(students.router)
app.include_router(attendance.router)
app.include_router(camera.router)
app.include_router(reports.router)
app.include_router(training.router)
app.include_router(student_portal.router)
app.include_router(leaves.router)


@app.get("/")
def root():
    return {
        "app": settings.app_name,
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_ready": recognizer.is_ready,
    }
