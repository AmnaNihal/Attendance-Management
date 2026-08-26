"""
routers/leaves.py — Faculty and Admin leave management endpoints.
"""
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db, LeaveRequest, LeaveStatus, Student, AttendanceRecord, AttendanceStatus, User
from schemas import LeaveRequestOut, LeaveRequestReview
from auth import get_current_user

router = APIRouter(prefix="/api/leaves", tags=["leaves"])


@router.get("/", response_model=List[LeaveRequestOut])
def list_all_leaves(
    status: Optional[LeaveStatus] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all student leave requests for faculty review."""
    q = db.query(LeaveRequest)
    if status:
        q = q.filter(LeaveRequest.status == status)
    return q.order_by(LeaveRequest.created_at.desc()).offset(skip).limit(limit).all()


@router.patch("/{leave_id}/review", response_model=LeaveRequestOut)
def review_leave_request(
    leave_id: int,
    payload: LeaveRequestReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Approve or reject a student leave request."""
    leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")

    new_status = payload.status.lower()
    if new_status not in ["approved", "rejected", "pending"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be 'approved', 'rejected', or 'pending'")

    leave.status = LeaveStatus(new_status)
    leave.faculty_remarks = payload.faculty_remarks.strip() if payload.faculty_remarks else None
    leave.reviewed_by = current_user.email

    db.commit()
    db.refresh(leave)
    return leave
