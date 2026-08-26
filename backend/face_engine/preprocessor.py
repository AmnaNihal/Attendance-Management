"""
face_engine/preprocessor.py
Handles image enhancement before encoding.
"""
import cv2
import numpy as np
from PIL import Image


def preprocess_frame(frame: np.ndarray) -> np.ndarray:
    """
    Full preprocessing pipeline for a raw BGR frame from OpenCV.
    Returns RGB frame suitable for face_recognition.
    """
    # 1. Convert to grayscale for enhancement, then back to RGB
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # 2. Histogram equalization — improves contrast in varied lighting
    equalized = cv2.equalizeHist(gray)

    # 3. Slight Gaussian blur to reduce noise
    blurred = cv2.GaussianBlur(equalized, (3, 3), 0)

    # 4. Convert back to 3-channel RGB (face_recognition expects RGB)
    rgb = cv2.cvtColor(blurred, cv2.COLOR_GRAY2RGB)

    return rgb


def preprocess_for_storage(frame: np.ndarray, size: tuple = (128, 128)) -> np.ndarray:
    """
    Preprocess and resize a face crop for saving to dataset.
    Input: BGR frame. Output: grayscale resized image.
    """
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    equalized = cv2.equalizeHist(gray)
    resized = cv2.resize(equalized, size, interpolation=cv2.INTER_AREA)
    return resized


def crop_face(frame: np.ndarray, location: tuple, padding: int = 20) -> np.ndarray:
    """
    Crop a face from frame given face_recognition location tuple (top, right, bottom, left).
    Adds padding around the face bounding box.
    """
    top, right, bottom, left = location
    h, w = frame.shape[:2]

    top = max(0, top - padding)
    left = max(0, left - padding)
    bottom = min(h, bottom + padding)
    right = min(w, right + padding)

    return frame[top:bottom, left:right]
