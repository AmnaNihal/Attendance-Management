"""routers/attendance.py — Mark, view, and manage attendance records."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date as date_type, datetime

from database import get_db, AttendanceRecord, Student, AttendanceStatus
from schemas import AttendanceOut, AttendanceManualMark
from auth import get_current_user

router = APIRouter(prefix="/api/attendance", tags=["attendance"])


@router.get("/", response_model=List[AttendanceOut])
def list_records(
    date: Optional[str] = Query(None, description="Filter by date YYYY-MM-DD"),
    student_id: Optional[int] = Query(None),
    status: Optional[AttendanceStatus] = Query(None),
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(AttendanceRecord)
    if date:
        q = q.filter(AttendanceRecord.date == date)
    if student_id:
        q = q.filter(AttendanceRecord.student_id == student_id)
    if status:
        q = q.filter(AttendanceRecord.status == status)
    q = q.order_by(AttendanceRecord.in_time.desc().nullslast(), AttendanceRecord.id.desc())
    return q.offset(skip).limit(limit).all()


@router.post("/mark", response_model=AttendanceOut)
def mark_attendance(
    payload: AttendanceManualMark,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Manually mark a student present or absent (faculty override)."""
    student = db.query(Student).filter(Student.id == payload.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Check for duplicate on same date
    existing = db.query(AttendanceRecord).filter(
        AttendanceRecord.student_id == payload.student_id,
        AttendanceRecord.date == payload.date,
    ).first()

    if existing:
        existing.status = payload.status
        existing.marked_by = current_user.email
        db.commit()
        db.refresh(existing)
        return existing

    record = AttendanceRecord(
        student_id=payload.student_id,
        date=payload.date,
        status=payload.status,
        in_time=datetime.utcnow() if payload.status == AttendanceStatus.present else None,
        marked_by=current_user.email,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.post("/mark-all-absent")
def mark_all_absent(
    date: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Mark all enrolled students who have no record for a given date as absent.
    Called at end of session.
    """
    students = db.query(Student).filter(Student.is_enrolled == True).all()
    marked = 0
    for student in students:
        existing = db.query(AttendanceRecord).filter(
            AttendanceRecord.student_id == student.id,
            AttendanceRecord.date == date,
        ).first()
        if not existing:
            record = AttendanceRecord(
                student_id=student.id,
                date=date,
                status=AttendanceStatus.absent,
                marked_by="system",
            )
            db.add(record)
            marked += 1
    db.commit()
    return {"message": f"Marked {marked} students absent for {date}"}


@router.patch("/{record_id}/out-time")
def mark_out_time(
    record_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Update out-time when student leaves."""
    record = db.query(AttendanceRecord).filter(AttendanceRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    record.out_time = datetime.utcnow()
    db.commit()
    db.refresh(record)
    return record
