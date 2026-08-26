"""routers/training.py — Trigger model training from the API."""
from fastapi import APIRouter, Depends, BackgroundTasks
from auth import require_admin
from face_engine.trainer import train_model
from face_engine.recognizer import recognizer
import logging

router = APIRouter(prefix="/api/training", tags=["training"])
logger = logging.getLogger(__name__)

_training_status = {"status": "idle", "last_result": None}


@router.post("/train")
def trigger_training(
    background_tasks: BackgroundTasks,
    _=Depends(require_admin),
):
    """Start model training in the background (admin only)."""
    if _training_status["status"] == "running":
        return {"message": "Training already in progress", "status": "running"}

    def do_train():
        _training_status["status"] = "running"
        try:
            result = train_model()
            recognizer.load()  # auto-reload after training
            _training_status["last_result"] = result
            _training_status["status"] = "done"
            logger.info(f"Training done: {result}")
        except Exception as e:
            _training_status["status"] = "error"
            _training_status["last_result"] = {"error": str(e)}
            logger.error(f"Training failed: {e}")

    background_tasks.add_task(do_train)
    _training_status["status"] = "running"
    return {"message": "Training started in background", "status": "running"}


@router.get("/status")
def training_status(_=Depends(require_admin)):
    """Check training progress and last result."""
    return {
        "status": _training_status["status"],
        "model_ready": recognizer.is_ready,
        "last_result": _training_status["last_result"],
    }
