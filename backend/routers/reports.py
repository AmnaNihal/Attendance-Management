"""routers/reports.py — Analytics, daily/weekly summaries, CSV export."""
import csv
import io
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db, AttendanceRecord, Student, AttendanceStatus
from schemas import DailyReport, StudentAttendanceSummary, StudentOut
from auth import get_current_user
from services.email_service import send_low_attendance_alert, send_daily_report
from config import get_settings

settings = get_settings()
router = APIRouter(prefix="/api/reports", tags=["reports"])

ATTENDANCE_THRESHOLD = 75.0  # alert if below 75%


@router.get("/daily", response_model=DailyReport)
def daily_report(
    date: str = Query(default=None, description="YYYY-MM-DD, defaults to today"),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    if not date:
        date = datetime.utcnow().strftime("%Y-%m-%d")

    total = db.query(Student).filter(Student.is_enrolled == True).count()
    present = db.query(AttendanceRecord).filter(
        AttendanceRecord.date == date,
        AttendanceRecord.status == AttendanceStatus.present,
    ).count()
    absent = total - present
    pct = (present / total * 100) if total > 0 else 0.0

    return DailyReport(
        date=date,
        total_students=total,
        present=present,
        absent=absent,
        attendance_percentage=round(pct, 1),
    )


@router.get("/weekly")
def weekly_report(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Returns daily summaries for the last 7 days."""
    today = datetime.utcnow()
    results = []
    total = db.query(Student).filter(Student.is_enrolled == True).count()

    for i in range(6, -1, -1):
        d = (today - timedelta(days=i)).strftime("%Y-%m-%d")
        present = db.query(AttendanceRecord).filter(
            AttendanceRecord.date == d,
            AttendanceRecord.status == AttendanceStatus.present,
        ).count()
        results.append({
            "date": d,
            "present": present,
            "absent": total - present,
            "total": total,
            "percentage": round((present / total * 100) if total > 0 else 0.0, 1),
        })
    return results


@router.get("/student-summary")
def student_summary(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Per-student attendance percentage across all recorded dates."""
    students = db.query(Student).filter(Student.is_enrolled == True).all()
    dates = db.query(AttendanceRecord.date).distinct().count()
    results = []

    for student in students:
        present_days = db.query(AttendanceRecord).filter(
            AttendanceRecord.student_id == student.id,
            AttendanceRecord.status == AttendanceStatus.present,
        ).count()
        absent_days = dates - present_days
        pct = (present_days / dates * 100) if dates > 0 else 0.0

        results.append({
            "student": {
                "id": student.id,
                "student_id": student.student_id,
                "full_name": student.full_name,
                "course": student.course,
            },
            "total_days": dates,
            "present_days": present_days,
            "absent_days": absent_days,
            "attendance_percentage": round(pct, 1),
            "low_attendance": pct < ATTENDANCE_THRESHOLD,
        })

    return sorted(results, key=lambda x: x["attendance_percentage"])


@router.post("/send-alerts")
def send_low_attendance_alerts(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Trigger email alerts for all students below threshold."""
    students = db.query(Student).filter(Student.is_enrolled == True).all()
    dates = db.query(AttendanceRecord.date).distinct().count()
    alerted = []

    for student in students:
        present_days = db.query(AttendanceRecord).filter(
            AttendanceRecord.student_id == student.id,
            AttendanceRecord.status == AttendanceStatus.present,
        ).count()
        pct = (present_days / dates * 100) if dates > 0 else 0.0

        if pct < ATTENDANCE_THRESHOLD:
            target_email = student.email if student.email else settings.alert_recipient
            if target_email:
                send_low_attendance_alert(student.full_name, student.student_id, pct, recipient=target_email)
            alerted.append(student.student_id)

    return {"alerted": alerted, "count": len(alerted)}


@router.post("/send-daily-report")
def trigger_daily_report(
    date: str = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Send a daily summary email to the admin."""
    if not date:
        date = datetime.utcnow().strftime("%Y-%m-%d")
    total = db.query(Student).filter(Student.is_enrolled == True).count()
    present = db.query(AttendanceRecord).filter(
        AttendanceRecord.date == date,
        AttendanceRecord.status == AttendanceStatus.present,
    ).count()
    send_daily_report(date, present, total - present, total)
    return {"message": f"Daily report sent for {date}"}


@router.get("/export/csv")
def export_csv(
    date: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Export attendance records to CSV."""
    q = db.query(AttendanceRecord)
    if date:
        q = q.filter(AttendanceRecord.date == date)
    records = q.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Record ID", "Student ID", "Student Name", "Date", "Status", "In Time", "Out Time", "Confidence"])

    for r in records:
        writer.writerow([
            r.id,
            r.student.student_id if r.student else "",
            r.student.full_name if r.student else "",
            r.date,
            r.status.value,
            r.in_time.isoformat() if r.in_time else "",
            r.out_time.isoformat() if r.out_time else "",
            f"{r.confidence:.3f}" if r.confidence else "",
        ])

    output.seek(0)
    filename = f"attendance_{date or 'all'}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
