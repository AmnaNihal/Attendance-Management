"""routers/auth.py — Login, register users, token refresh."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db, User
from schemas import UserCreate, UserOut, Token, LoginRequest
from auth import hash_password, verify_password, create_access_token, get_user_by_email, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


from database import get_db, User, Student, UserRole


@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    email_clean = payload.email.strip().lower()
    existing = get_user_by_email(db, email_clean)
    if existing:
        raise HTTPException(status_code=400, detail="Email or Student ID already registered")

    student_id_clean = payload.student_id.strip() if payload.student_id else None

    # If student_id provided, ensure unique
    if student_id_clean:
        existing_id = db.query(User).filter(User.student_id == student_id_clean).first()
        if existing_id:
            raise HTTPException(status_code=400, detail=f"Student ID {student_id_clean} is already registered")

    user = User(
        full_name=payload.full_name.strip(),
        email=email_clean,
        student_id=student_id_clean,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # If registering as a student, create student directory record if not already existing
    if payload.role == UserRole.student:
        stu_id = student_id_clean or f"STU{user.id:03d}"
        existing_student = db.query(Student).filter(Student.student_id == stu_id).first()
        if not existing_student:
            new_student = Student(
                student_id=stu_id,
                full_name=payload.full_name.strip(),
                email=email_clean,
                course="General",
                image_count=0,
                is_enrolled=True,
            )
            db.add(new_student)
            if not user.student_id:
                user.student_id = stu_id
            db.commit()

    return user


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, payload.email)
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    token = create_access_token({"sub": user.email, "role": user.role})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
