"""routers/students.py — Student CRUD, image upload, and dataset management."""
import os
import shutil
import threading
from pathlib import Path
from typing import List
import cv2
import numpy as np

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, UploadFile, File
from sqlalchemy.orm import Session

from database import get_db, Student
from schemas import StudentCreate, StudentOut, StudentUpdate, PhotoUploadResult
from auth import get_current_user
from config import get_settings
from face_engine.capture import capture_student_images
from face_engine.preprocessor import preprocess_for_storage, crop_face
from face_engine.detector import detect_faces

settings = get_settings()
router = APIRouter(prefix="/api/students", tags=["students"])


@router.get("/", response_model=List[StudentOut])
def list_students(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return db.query(Student).offset(skip).limit(limit).all()


@router.post("/", response_model=StudentOut, status_code=201)
def create_student(
    payload: StudentCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    existing = db.query(Student).filter(Student.student_id == payload.student_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Student ID already exists")
    student = Student(**payload.model_dump())
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


@router.get("/{student_id}", response_model=StudentOut)
def get_student(student_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


@router.patch("/{student_id}", response_model=StudentOut)
def update_student(
    student_id: str,
    payload: StudentUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(student, field, value)
    db.commit()
    db.refresh(student)
    return student


@router.delete("/{student_id}", status_code=204)
def delete_student(
    student_id: str,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Remove dataset folder
    dataset_dir = os.path.join(
        settings.dataset_path,
        f"{student.student_id}_{student.full_name.replace(' ', '_')}"
    )
    if os.path.exists(dataset_dir):
        shutil.rmtree(dataset_dir)

    db.delete(student)
    db.commit()
    return None


@router.post("/{student_id}/upload-photos", response_model=PhotoUploadResult)
async def upload_student_photos(
    student_id: str,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Upload one or multiple face photos for a student to train facial recognition."""
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

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

    new_total = current_count + added_count
    student.image_count = new_total
    db.commit()

    return PhotoUploadResult(
        student_id=student.student_id,
        images_added=added_count,
        total_images=new_total,
        message=f"Successfully uploaded {added_count} photos for {student.full_name}. Biometric total: {new_total} photos.",
    )


@router.post("/{student_id}/capture")
def trigger_capture(
    student_id: str,
    num_images: int = 100,
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Trigger background image capture for a student's dataset."""
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    label = f"{student.student_id}_{student.full_name.replace(' ', '_')}"

    def do_capture():
        count = capture_student_images(label, num_images=num_images)
        db2 = next(get_db())
        s = db2.query(Student).filter(Student.student_id == student_id).first()
        if s:
            s.image_count = count
            db2.commit()
        db2.close()

    background_tasks.add_task(do_capture)
    return {"message": f"Capture started for {label}. Capturing {num_images} images in background."}
