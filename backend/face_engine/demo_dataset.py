"""
face_engine/demo_dataset.py
Fast vectorized generator for synthetic student face dataset.
Generates 600 distinct, high-accuracy face profiles across 6 students.
"""
import os
import cv2
import numpy as np
from pathlib import Path

from config import get_settings

settings = get_settings()

DEMO_STUDENTS = [
    {"id": "STU001", "name": "Alice_Johnson", "shade": 210, "eye_spacing": 0.18, "eye_r": 0.06, "mouth_y": 0.18},
    {"id": "STU002", "name": "Bob_Smith",     "shade": 170, "eye_spacing": 0.14, "eye_r": 0.05, "mouth_y": 0.14},
    {"id": "STU003", "name": "Carol_White",   "shade": 120, "eye_spacing": 0.20, "eye_r": 0.04, "mouth_y": 0.20},
    {"id": "STU004", "name": "David_Brown",   "shade": 190, "eye_spacing": 0.16, "eye_r": 0.07, "mouth_y": 0.12},
    {"id": "STU005", "name": "Eva_Davis",     "shade": 140, "eye_spacing": 0.12, "eye_r": 0.05, "mouth_y": 0.16},
    {"id": "STU006", "name": "Frank_Miller",  "shade": 160, "eye_spacing": 0.22, "eye_r": 0.06, "mouth_y": 0.15},
]

IMAGES_PER_STUDENT = 100


def generate_synthetic_face(student_idx: int, img_idx: int, size: int = 128) -> np.ndarray:
    """
    Generate synthetic face with student-specific facial geometry.
    """
    rng = np.random.RandomState(seed=student_idx * 10000 + img_idx)
    s = DEMO_STUDENTS[student_idx]

    # Coordinate grid
    y, x = np.ogrid[:size, :size]
    cx, cy = size // 2, size // 2

    # Face ellipse mask
    dx = (x - cx) / (size * 0.35)
    dy = (y - cy) / (size * 0.45)
    face_mask = (dx * dx + dy * dy) <= 1.0

    img = np.full((size, size), 20, dtype=np.uint8)
    
    # Base skin value with subtle variation
    noise = rng.randint(-8, 8, size=(size, size), dtype=np.int16)
    face_pixels = np.clip(s["shade"] + noise, 30, 240).astype(np.uint8)
    img[face_mask] = face_pixels[face_mask]

    # Eyes (unique spacing and radius per student)
    eye_y = int(cy - size * 0.10)
    spacing = int(size * s["eye_spacing"])
    eye_radius = int(size * s["eye_r"])
    for ex in [cx - spacing, cx + spacing]:
        cv2.circle(img, (ex, eye_y), eye_radius, 15, -1)
        # Eyebrows
        cv2.line(img, (ex - eye_radius, eye_y - eye_radius - 2), (ex + eye_radius, eye_y - eye_radius - 2), 10, 2)

    # Mouth (unique position and shape per student)
    mouth_y = int(cy + size * s["mouth_y"])
    cv2.ellipse(img, (cx, mouth_y), (int(size * 0.12), int(size * 0.04)), 0, 0, 180, 40, 2)

    # Lighting / contrast simulation
    brightness = rng.uniform(0.95, 1.05)
    img = np.clip(img.astype(np.float32) * brightness, 0, 255).astype(np.uint8)

    return cv2.equalizeHist(img)


def create_demo_dataset(dataset_path: str = None, images_per_student: int = IMAGES_PER_STUDENT):
    """
    Create synthetic dataset folders for all 6 demo students.
    """
    dataset_path = Path(dataset_path or settings.dataset_path)
    dataset_path.mkdir(parents=True, exist_ok=True)

    print(f"\n[INFO] Creating demo dataset at: {dataset_path}")

    for idx, student in enumerate(DEMO_STUDENTS):
        label = f"{student['id']}_{student['name']}"
        student_dir = dataset_path / label
        student_dir.mkdir(parents=True, exist_ok=True)

        for i in range(images_per_student):
            img = generate_synthetic_face(idx, i)
            img_path = student_dir / f"{i:04d}.jpg"
            cv2.imwrite(str(img_path), img)

        print(f"   [OK] {label}: {images_per_student} images saved")

    print("\n[OK] Demo dataset ready!")


if __name__ == "__main__":
    create_demo_dataset()
