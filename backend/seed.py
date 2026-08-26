"""
seed.py
Seeds initial admin user, faculty user, student accounts, demo students, and sample attendance history.
Run: python seed.py
"""
import sys
from datetime import datetime, timedelta
from database import SessionLocal, create_tables, User, Student, AttendanceRecord, UserRole, AttendanceStatus
from auth import hash_password

def seed_database():
    create_tables()
    db = SessionLocal()
    try:
        # 1. Create Default Users
        admin_user = db.query(User).filter(User.email == "admin@school.com").first()
        if not admin_user:
            admin = User(
                full_name="System Administrator",
                email="admin@school.com",
                hashed_password=hash_password("admin123"),
                role=UserRole.admin,
                is_active=True
            )
            db.add(admin)
            print("[OK] Created default Admin: admin@school.com / admin123")

        faculty_user = db.query(User).filter(User.email == "faculty@school.com").first()
        if not faculty_user:
            faculty = User(
                full_name="Professor Smith",
                email="faculty@school.com",
                hashed_password=hash_password("faculty123"),
                role=UserRole.faculty,
                is_active=True
            )
            db.add(faculty)
            print("[OK] Created default Faculty: faculty@school.com / faculty123")

        db.commit()

        # 2. Seed 6 Demo Students
        demo_students = [
            {"student_id": "STU001", "full_name": "Alice Johnson", "email": "alice@school.edu", "course": "Computer Science"},
            {"student_id": "STU002", "full_name": "Bob Smith",     "email": "bob@school.edu",   "course": "Computer Science"},
            {"student_id": "STU003", "full_name": "Carol White",   "email": "carol@school.edu", "course": "Information Tech"},
            {"student_id": "STU004", "full_name": "David Brown",   "email": "david@school.edu", "course": "Data Science"},
            {"student_id": "STU005", "full_name": "Eva Davis",     "email": "eva@school.edu",   "course": "Computer Science"},
            {"student_id": "STU006", "full_name": "Frank Miller",  "email": "frank@school.edu", "course": "Data Science"},
        ]

        student_objs = []
        for item in demo_students:
            s = db.query(Student).filter(Student.student_id == item["student_id"]).first()
            if not s:
                s = Student(
                    student_id=item["student_id"],
                    full_name=item["full_name"],
                    email=item["email"],
                    course=item["course"],
                    image_count=100,
                    is_enrolled=True
                )
                db.add(s)
                db.commit()
                db.refresh(s)
            student_objs.append(s)

            # Create student user login account
            stu_user = db.query(User).filter(User.email == item["email"]).first()
            if not stu_user:
                stu_user = User(
                    full_name=item["full_name"],
                    email=item["email"],
                    student_id=item["student_id"],
                    hashed_password=hash_password("student123"),
                    role=UserRole.student,
                    is_active=True
                )
                db.add(stu_user)
                db.commit()

        print(f"[OK] Seeded {len(student_objs)} students and their student portal user accounts")

        # 3. Seed Past 5 Days Attendance History for Demo Visuals
        today = datetime.now()
        for day_offset in range(5, 0, -1):
            day_date = (today - timedelta(days=day_offset)).strftime("%Y-%m-%d")
            for idx, student in enumerate(student_objs):
                # Eva (index 4) has lower attendance to demonstrate alerts
                is_present = not (idx == 4 and day_offset in [1, 2, 4])
                
                existing = db.query(AttendanceRecord).filter(
                    AttendanceRecord.student_id == student.id,
                    AttendanceRecord.date == day_date
                ).first()

                if not existing:
                    in_time = (today - timedelta(days=day_offset)).replace(hour=8, minute=30 + idx * 5) if is_present else None
                    out_time = (today - timedelta(days=day_offset)).replace(hour=16, minute=30) if is_present else None
                    rec = AttendanceRecord(
                        student_id=student.id,
                        date=day_date,
                        status=AttendanceStatus.present if is_present else AttendanceStatus.absent,
                        in_time=in_time,
                        out_time=out_time,
                        confidence=0.98 if is_present else None,
                        marked_by="system"
                    )
                    db.add(rec)

        db.commit()
        print("[OK] Seeded 5 days of attendance history for analytics")

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
