"""
routers/camera.py
MJPEG live stream + real-time face recognition endpoint.
WebSocket endpoint broadcasts recognition events to the frontend.
"""
import cv2
import asyncio
import logging
import numpy as np
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db, AttendanceRecord, Student, AttendanceStatus
from auth import get_current_user
from face_engine.recognizer import recognizer
from face_engine.preprocessor import preprocess_frame
from face_engine.detector import draw_face_boxes
from face_engine.capture import get_camera_source
from services.email_service import send_student_marked_notification
from config import get_settings

settings = get_settings()
router = APIRouter(prefix="/api/camera", tags=["camera"])
logger = logging.getLogger(__name__)


def _mark_attendance_in_db(db: Session, student_id_str: str, full_name: str, confidence: float):
    """Find student by student_id string and create/update attendance record if needed."""
    student = db.query(Student).filter(Student.student_id == student_id_str).first()
    if not student:
        return None

    today_str = datetime.now().strftime("%Y-%m-%d")
    now_dt = datetime.now()

    # Look for ANY record for this student on today's date
    existing = db.query(AttendanceRecord).filter(
        AttendanceRecord.student_id == student.id,
        AttendanceRecord.date == today_str,
    ).first()

    if existing:
        if existing.status == AttendanceStatus.present:
            return existing  # Already present

        # If record was previously absent, update to present!
        existing.status = AttendanceStatus.present
        existing.in_time = now_dt
        existing.confidence = confidence
        existing.marked_by = "system"
        db.commit()
        db.refresh(existing)
        record = existing
    else:
        record = AttendanceRecord(
            student_id=student.id,
            date=today_str,
            status=AttendanceStatus.present,
            in_time=now_dt,
            confidence=confidence,
            marked_by="system",
        )
        db.add(record)
        db.commit()
        db.refresh(record)

    # Fire email notification (non-blocking — runs in thread)
    try:
        send_student_marked_notification(
            student_name=full_name,
            student_id=student_id_str,
            in_time=record.in_time.strftime("%H:%M:%S"),
        )
    except Exception:
        pass

    return record


@router.get("/stream")
def mjpeg_stream():
    """
    MJPEG live stream with face bounding boxes drawn on frames.
    Access at: GET /api/camera/stream
    """
    def generate():
        cap = cv2.VideoCapture(get_camera_source())
        if not cap.isOpened():
            return

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            rgb = preprocess_frame(frame)
            if recognizer.is_ready:
                results = recognizer.process_frame(rgb)
                locations = [r["location"] for r in results]
                labels = [r["full_name"] for r in results]
                confidences = [r["confidence"] for r in results]
                frame = draw_face_boxes(frame, locations, labels, confidences)

                # Mark attendance in database for recognized students
                for r in results:
                    if r["should_mark"] and r["student_id"]:
                        try:
                            db_stream = next(get_db())
                            _mark_attendance_in_db(
                                db_stream, r["student_id"], r["full_name"], r["confidence"]
                            )
                            db_stream.close()
                        except Exception:
                            pass

            _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n"
                + buffer.tobytes()
                + b"\r\n"
            )
        cap.release()

    return StreamingResponse(
        generate(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@router.websocket("/ws")
async def recognition_ws(websocket: WebSocket):
    """
    WebSocket that streams recognition events to the frontend in real-time.
    Frontend connects, receives JSON events when a student is recognized.
    """
    await websocket.accept()
    cap = cv2.VideoCapture(get_camera_source())

    if not cap.isOpened():
        await websocket.send_json({"error": "Cannot open camera"})
        await websocket.close()
        return

    db = next(get_db())

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            rgb = preprocess_frame(frame)

            if recognizer.is_ready:
                results = recognizer.process_frame(rgb)
                for r in results:
                    event = {
                        "student_id": r["student_id"],
                        "full_name": r["full_name"],
                        "confidence": round(r["confidence"], 3),
                        "status": "recognized" if r["label"] != "Unknown" else "unknown",
                        "timestamp": datetime.utcnow().isoformat(),
                        "attendance_marked": False,
                    }

                    if r["should_mark"] and r["student_id"]:
                        record = _mark_attendance_in_db(
                            db, r["student_id"], r["full_name"], r["confidence"]
                        )
                        event["attendance_marked"] = record is not None

                    await websocket.send_json(event)

            await asyncio.sleep(0.1)  # ~10 recognition checks per second

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    finally:
        cap.release()
        db.close()


@router.post("/load-model")
def load_model_endpoint(_=Depends(get_current_user)):
    """Reload the face recognition model from disk (after retraining)."""
    recognizer.load()
    return {"message": "Model loaded", "ready": recognizer.is_ready}


@router.post("/reset-session")
def reset_session(_=Depends(get_current_user)):
    """Clear per-student cooldowns (start fresh for a new class session)."""
    recognizer.reset_session()
    return {"message": "Session reset"}
