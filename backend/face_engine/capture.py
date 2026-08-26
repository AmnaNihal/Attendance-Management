"""
face_engine/capture.py
Webcam capture utilities for:
  1. Building the training dataset — saves face-only crops for each student.
  2. Streaming frames to the recognizer in real-time.

Uses real Haar Cascade detection — only saves frames that contain an actual face.
"""
import cv2
import os
import logging
import time
from pathlib import Path
from typing import Generator

import numpy as np

from config import get_settings
from face_engine.preprocessor import preprocess_for_storage, crop_face
from face_engine.detector import detect_faces

settings = get_settings()
logger = logging.getLogger(__name__)


def get_camera_source():
    """Return int (webcam index) or string (RTSP/HTTP URL) from config."""
    src = settings.camera_source
    try:
        return int(src)
    except ValueError:
        return src


def capture_student_images(
    student_label: str,
    num_images: int = 100,
    delay_ms: int = 150,
    dataset_path: str = None,
) -> int:
    """
    Open the camera and capture `num_images` real face images for a student.

    - Only saves a frame when the Haar Cascade detects a real face.
    - Preprocesses each crop (grayscale + histogram equalization + resize).
    - Saves to dataset/<student_label>/.

    Returns:
        Number of images actually saved.
    """
    save_dir = Path(dataset_path or settings.dataset_path) / student_label
    save_dir.mkdir(parents=True, exist_ok=True)

    cap = cv2.VideoCapture(get_camera_source())
    if not cap.isOpened():
        raise RuntimeError(
            "Cannot open camera. Check that a webcam is connected and "
            "not in use by another application."
        )

    count = 0
    attempts = 0
    max_attempts = num_images * 10  # prevent infinite loop if no face found

    logger.info("Capturing %d face images for %s …", num_images, student_label)

    while count < num_images and attempts < max_attempts:
        ret, frame = cap.read()
        attempts += 1

        if not ret:
            logger.warning("Failed to read frame from camera (attempt %d).", attempts)
            time.sleep(0.05)
            continue

        # Only use frames that contain a real detected face
        locations = detect_faces(frame)
        if not locations:
            time.sleep(delay_ms / 1000.0)
            continue

        # Use the largest detected face (first after sort by area)
        face_crop = crop_face(frame, locations[0])
        if face_crop.size == 0:
            continue

        processed = preprocess_for_storage(face_crop)
        img_path = save_dir / f"{count:04d}.jpg"
        cv2.imwrite(str(img_path), processed)
        count += 1

        time.sleep(delay_ms / 1000.0)

    cap.release()

    if count < num_images:
        logger.warning(
            "Only captured %d/%d images for %s. "
            "Make sure the student's face is clearly visible to the camera.",
            count, num_images, student_label,
        )
    else:
        logger.info("Done. %d images saved to %s", count, save_dir)

    return count


def frame_generator() -> Generator[bytes, None, None]:
    """
    Yields raw MJPEG frames as bytes for the live stream endpoint.
    """
    cap = cv2.VideoCapture(get_camera_source())
    if not cap.isOpened():
        logger.error("Cannot open camera for streaming.")
        return

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            yield buffer.tobytes()
    finally:
        cap.release()
