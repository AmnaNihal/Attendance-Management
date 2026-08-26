"""
routers/student_portal.py — Dedicated endpoints for logged-in students.
Includes stats, attendance logs, CSV export, leave requests, and biometric photo updates.
"""
import io
import os
import csv
from datetime import datetime
from pathlib import Path
from typing import List, Optional
import cv2
import numpy as np

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from config import get_settings
from database import get_db, AttendanceRecord, Student, AttendanceStatus, User, UserRole, LeaveRequest, LeaveStatus
from schemas import AttendanceOut, StudentPortalStats, LeaveRequestCreate, LeaveRequestOut, PhotoUploadResult
from auth import get_current_user
from face_engine.preprocessor import preprocess_for_storage, crop_face
from face_engine.detector import detect_faces

settings = get_settings()
router = APIRouter(prefix="/api/student-portal", tags=["student-portal"])

ATTENDANCE_THRESHOLD = 75.0


def _get_student_from_user(current_user: User, db: Session) -> Student:
    """Helper to find the student entity associated with the logged-in student user."""
    student = None
    if current_user.student_id:
        student = db.query(Student).filter(Student.student_id == current_user.student_id).first()
    if not student and current_user.email:
        student = db.query(Student).filter(func.lower(Student.email) == current_user.email.lower()).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not linked to this user account")
    return student


@router.get("/stats", response_model=StudentPortalStats)
def get_my_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch logged in student's summary stats, attendance %, and today's status."""
    student = _get_student_from_user(current_user, db)

    dates = db.query(AttendanceRecord.date).distinct().count()
    present_days = db.query(AttendanceRecord).filter(
        AttendanceRecord.student_id == student.id,
        AttendanceRecord.status == AttendanceStatus.present,
    ).count()

    absent_days = max(0, dates - present_days)
    pct = (present_days / dates * 100) if dates > 0 else 0.0

    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    today_rec = db.query(AttendanceRecord).filter(
        AttendanceRecord.student_id == student.id,
        AttendanceRecord.date == today_str
    ).first()

    today_status = today_rec.status.value if today_rec else "Not marked yet"

    return StudentPortalStats(
        student_id=student.student_id,
        full_name=student.full_name,
        email=student.email,
        course=student.course,
        image_count=student.image_count,
        total_days=dates,
        present_days=present_days,
        absent_days=absent_days,
        attendance_percentage=round(pct, 1),
        is_low_attendance=pct < ATTENDANCE_THRESHOLD,
        today_status=today_status,
    )


@router.get("/attendance", response_model=List[AttendanceOut])
def get_my_attendance(
    status: Optional[AttendanceStatus] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List logged-in student's historical attendance records."""
    student = _get_student_from_user(current_user, db)

    q = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student.id)
    if status:
        q = q.filter(AttendanceRecord.status == status)

    return q.order_by(AttendanceRecord.date.desc()).offset(skip).limit(limit).all()


@router.get("/export-csv")
def export_my_attendance_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download personal attendance statement as CSV."""
    student = _get_student_from_user(current_user, db)
    records = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student.id).order_by(AttendanceRecord.date.asc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Student ID", "Student Name", "Date", "Status", "In Time", "Out Time", "Confidence"])

    for r in records:
        writer.writerow([
            student.student_id,
            student.full_name,
            r.date,
            r.status.value,
            r.in_time.strftime("%H:%M:%S") if r.in_time else "—",
            r.out_time.strftime("%H:%M:%S") if r.out_time else "—",
            f"{r.confidence:.1%}" if r.confidence else "—",
        ])

    output.seek(0)
    filename = f"attendance_{student.student_id}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ── Leaves Management for Students ─────────────────────────────────────────────

@router.post("/leaves", response_model=LeaveRequestOut, status_code=201)
def apply_for_leave(
    payload: LeaveRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a new leave application to faculty."""
    student = _get_student_from_user(current_user, db)

    leave = LeaveRequest(
        student_id=student.id,
        start_date=payload.start_date.strip(),
        end_date=payload.end_date.strip(),
        leave_type=payload.leave_type.strip(),
        reason=payload.reason.strip(),
        status=LeaveStatus.pending,
    )
    db.add(leave)
    db.commit()
    db.refresh(leave)
    return leave


@router.get("/leaves", response_model=List[LeaveRequestOut])
def get_my_leaves(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all leave applications submitted by the logged-in student."""
    student = _get_student_from_user(current_user, db)
    return db.query(LeaveRequest).filter(
        LeaveRequest.student_id == student.id
    ).order_by(LeaveRequest.created_at.desc()).all()


# ── Biometric Face Photos Update ───────────────────────────────────────────────

@router.post("/upload-photos", response_model=PhotoUploadResult)
async def upload_face_photos(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Allows a student to upload one or more face photos to improve/update their AI recognition profile.
    Images are preprocessed into grayscale normalized 128x128 face crops.
    """
    student = _get_student_from_user(current_user, db)
    label = f"{student.student_id}_{student.full_name.replace(' ', '_')}"
    save_dir = Path(settings.dataset_path) / label
    save_dir.mkdir(parents=True, exist_ok=True)

    existing_files = list(save_dir.glob("*.jpg")) + list(save_dir.glob("*.png"))
    current_count = len(existing_files)
    added_count = 0

    for file in files:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            continue

        # Detect face or crop
        locs = detect_faces(img)
        if locs:
            crop = crop_face(img, locs[0])
            if crop.size > 0:
                processed = preprocess_for_storage(crop)
            else:
                processed = preprocess_for_storage(img)
        else:
            processed = preprocess_for_storage(img)

        filename = f"user_{current_count + added_count:04d}.jpg"
        out_path = save_dir / filename
        cv2.imwrite(str(out_path), processed)
        added_count += 1

    # Update student database image count
    new_total = current_count + added_count
    student.image_count = new_total
    db.commit()

    return PhotoUploadResult(
        student_id=student.student_id,
        images_added=added_count,
        total_images=new_total,
        message=f"Successfully uploaded {added_count} new face photos to your biometric profile. Retrain the model in Settings to apply changes.",
    )
