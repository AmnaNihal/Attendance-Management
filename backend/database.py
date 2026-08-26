from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Float, ForeignKey, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.sql import func
import enum

from config import get_settings

settings = get_settings()

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ── Enums ──────────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    admin = "admin"
    faculty = "faculty"
    student = "student"


class AttendanceStatus(str, enum.Enum):
    present = "present"
    absent = "absent"


class LeaveStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


# ── Models ─────────────────────────────────────────────────────────────────────

class User(Base):
    """System users — admins, faculty members, and students."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    student_id = Column(String, unique=True, index=True, nullable=True)  # for students, e.g. "STU001"
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.faculty, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Student(Base):
    """Registered students with face data."""
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, unique=True, index=True, nullable=False)  # e.g. "STU001"
    full_name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    course = Column(String, nullable=True)
    image_count = Column(Integer, default=0)  # how many training images captured
    is_enrolled = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    attendance_records = relationship("AttendanceRecord", back_populates="student")
    leave_requests = relationship("LeaveRequest", back_populates="student")


class LeaveRequest(Base):
    """Student leave application to faculty."""
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    start_date = Column(String, nullable=False)     # "YYYY-MM-DD"
    end_date = Column(String, nullable=False)       # "YYYY-MM-DD"
    leave_type = Column(String, default="Medical")  # Medical, Academic, Personal, Other
    reason = Column(String, nullable=False)
    status = Column(Enum(LeaveStatus), default=LeaveStatus.pending, nullable=False)
    faculty_remarks = Column(String, nullable=True)
    reviewed_by = Column(String, nullable=True)     # faculty email
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    student = relationship("Student", back_populates="leave_requests")


class AttendanceRecord(Base):
    """One row per student per session (in-time + out-time)."""
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    date = Column(String, nullable=False)          # "YYYY-MM-DD"
    session_id = Column(String, nullable=True)     # optional: link to a specific class session
    status = Column(Enum(AttendanceStatus), nullable=False)
    in_time = Column(DateTime(timezone=True), nullable=True)
    out_time = Column(DateTime(timezone=True), nullable=True)
    confidence = Column(Float, nullable=True)      # recognition confidence score
    marked_by = Column(String, default="system")  # "system" or user email

    student = relationship("Student", back_populates="attendance_records")


class Session(Base):
    """Optional: named class sessions (e.g. 'CS101 Morning 2026-08-25')."""
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    course = Column(String, nullable=True)
    date = Column(String, nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)


# ── Dependency ─────────────────────────────────────────────────────────────────

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    Base.metadata.create_all(bind=engine)
