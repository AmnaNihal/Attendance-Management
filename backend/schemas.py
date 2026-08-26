from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from database import UserRole, AttendanceStatus


# ── Auth / User ────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    full_name: str
    email: str
    password: str
    role: UserRole = UserRole.faculty
    student_id: Optional[str] = None


class UserOut(BaseModel):
    id: int
    full_name: str
    email: str
    student_id: Optional[str] = None
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class StudentPortalStats(BaseModel):
    student_id: str
    full_name: str
    email: Optional[str]
    course: Optional[str]
    image_count: int
    total_days: int
    present_days: int
    absent_days: int
    attendance_percentage: float
    is_low_attendance: bool
    today_status: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


# ── Student ────────────────────────────────────────────────────────────────────

class StudentCreate(BaseModel):
    student_id: str
    full_name: str
    email: Optional[str] = None
    course: Optional[str] = None


class StudentOut(BaseModel):
    id: int
    student_id: str
    full_name: str
    email: Optional[str]
    course: Optional[str]
    image_count: int
    is_enrolled: bool
    created_at: datetime

    class Config:
        from_attributes = True


class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    course: Optional[str] = None
    is_enrolled: Optional[bool] = None


# ── Attendance ─────────────────────────────────────────────────────────────────

class AttendanceOut(BaseModel):
    id: int
    student_id: int
    date: str
    status: AttendanceStatus
    in_time: Optional[datetime]
    out_time: Optional[datetime]
    confidence: Optional[float]
    marked_by: str
    student: Optional[StudentOut]

    class Config:
        from_attributes = True


class AttendanceManualMark(BaseModel):
    student_id: int
    date: str
    status: AttendanceStatus


# ── Reports ────────────────────────────────────────────────────────────────────

class DailyReport(BaseModel):
    date: str
    total_students: int
    present: int
    absent: int
    attendance_percentage: float


class StudentAttendanceSummary(BaseModel):
    student: StudentOut
    total_days: int
    present_days: int
    absent_days: int
    attendance_percentage: float


# ── Recognition ───────────────────────────────────────────────────────────────

class RecognitionResult(BaseModel):
    student_id: Optional[str]
    full_name: Optional[str]
    confidence: Optional[float]
    status: str  # "recognized", "unknown", "no_face"
    attendance_marked: bool = False


# ── Leaves ────────────────────────────────────────────────────────────────────

class LeaveRequestCreate(BaseModel):
    start_date: str
    end_date: str
    leave_type: str = "Medical"
    reason: str


class LeaveRequestReview(BaseModel):
    status: str  # "approved" or "rejected"
    faculty_remarks: Optional[str] = None


class LeaveRequestOut(BaseModel):
    id: int
    student_id: int
    start_date: str
    end_date: str
    leave_type: str
    reason: str
    status: str
    faculty_remarks: Optional[str] = None
    reviewed_by: Optional[str] = None
    created_at: datetime
    student: Optional[StudentOut] = None

    class Config:
        from_attributes = True


class PhotoUploadResult(BaseModel):
    student_id: str
    images_added: int
    total_images: int
    message: str
