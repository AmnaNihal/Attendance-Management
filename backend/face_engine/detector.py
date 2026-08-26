"""
face_engine/detector.py
Real face detection using OpenCV 5 FaceDetectorYN (YuNet DNN — bundled with OpenCV).
Detects actual human faces in live camera frames and uploaded images.
Falls back to a center-ROI heuristic only if the model file is missing.
"""
import os
import cv2
import numpy as np
import logging
from typing import List, Tuple

logger = logging.getLogger(__name__)

# ── Path to the bundled YuNet ONNX model ──────────────────────────────────────
_MODEL_PATH = os.path.join(os.path.dirname(__file__), "face_detection_yunet.onnx")

# ── Singleton detector — created once at import time ──────────────────────────
_yunet: cv2.FaceDetectorYN = None

def _get_detector(width: int = 640, height: int = 480) -> cv2.FaceDetectorYN:
    """
    Return (or create) the YuNet face detector for the given frame size.
    Automatically reinitializes if the input size changes.
    """
    global _yunet
    if not os.path.exists(_MODEL_PATH):
        logger.error(
            "YuNet model not found at %s. Face detection unavailable.", _MODEL_PATH
        )
        return None

    if _yunet is None:
        _yunet = cv2.FaceDetectorYN_create(
            _MODEL_PATH,
            "",
            (width, height),
            score_threshold=0.6,   # confidence ≥ 60% to count as a face
            nms_threshold=0.3,     # NMS IoU threshold
            top_k=5,               # max faces per frame
        )
        logger.info("YuNet face detector loaded (input %dx%d).", width, height)
    else:
        # Update input size if frame dimensions changed
        _yunet.setInputSize((width, height))

    return _yunet


def detect_faces(
    image: np.ndarray,
    min_face_size: int = 30,
) -> List[Tuple[int, int, int, int]]:
    """
    Detect real human faces in an image using YuNet DNN.

    Args:
        image:         BGR or grayscale OpenCV image (any size).
        min_face_size: Minimum face height/width in pixels to accept.

    Returns:
        List of (top, right, bottom, left) tuples, largest face first.
        Empty list if no faces are found.
    """
    if image is None or image.size == 0:
        return []

    h, w = image.shape[:2]
    if h < 20 or w < 20:
        return []

    # YuNet requires BGR — convert if grayscale
    if len(image.shape) == 2:
        bgr = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
    else:
        bgr = image

    detector = _get_detector(w, h)
    if detector is None:
        # Graceful fallback: return center ROI
        return _center_roi_fallback(w, h)

    _, faces = detector.detect(bgr)

    if faces is None or len(faces) == 0:
        return []

    locations = []
    for face in faces:
        # YuNet returns [x, y, w, h, ...landmarks..., confidence]
        x, y, fw, fh = int(face[0]), int(face[1]), int(face[2]), int(face[3])

        # Skip tiny detections
        if fw < min_face_size or fh < min_face_size:
            continue

        top    = max(0, y)
        left   = max(0, x)
        bottom = min(h, y + fh)
        right  = min(w, x + fw)
        locations.append((top, right, bottom, left))

    # Sort largest face first (highest area)
    locations.sort(key=lambda loc: (loc[2] - loc[0]) * (loc[1] - loc[3]), reverse=True)
    return locations


def detect_faces_in_crop(image: np.ndarray) -> bool:
    """
    Quick check: does this image contain at least one real face?
    Used to validate uploaded photos before storing them.
    """
    locs = detect_faces(image)
    return len(locs) > 0


def _center_roi_fallback(w: int, h: int) -> List[Tuple[int, int, int, int]]:
    """
    Fallback when no detector is available — returns the center 45% of the frame.
    """
    box_w = int(w * 0.45)
    box_h = int(box_w * 1.2)
    top   = max(0, int(h * 0.15))
    left  = max(0, int((w - box_w) / 2))
    return [(top, left + box_w, min(h, top + box_h), left)]


def extract_face_feature(face_crop: np.ndarray) -> np.ndarray:
    """
    Extract a normalized pixel + Sobel gradient magnitude feature vector.
    Standardized to 48×48 — used for SVM training and live inference.

    Args:
        face_crop: BGR or grayscale face image (any size).

    Returns:
        float32 numpy array of length 4608 (2 × 48 × 48).
    """
    if len(face_crop.shape) == 3:
        gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
    else:
        gray = face_crop.copy()

    eq      = cv2.equalizeHist(gray)
    resized = cv2.resize(eq, (48, 48), interpolation=cv2.INTER_AREA)
    norm    = resized.astype(np.float32) / 255.0

    gx  = cv2.Sobel(norm, cv2.CV_32F, 1, 0, ksize=3)
    gy  = cv2.Sobel(norm, cv2.CV_32F, 0, 1, ksize=3)
    mag = np.sqrt(gx ** 2 + gy ** 2)

    return np.hstack([norm.flatten(), mag.flatten()])


def get_face_encodings(
    frame: np.ndarray,
    locations: List[Tuple[int, int, int, int]],
) -> List[np.ndarray]:
    """
    Compute feature encodings for a list of face locations.
    """
    h, w = frame.shape[:2]
    encodings = []
    for (top, right, bottom, left) in locations:
        crop = frame[max(0, top):min(h, bottom), max(0, left):min(w, right)]
        if crop.size > 0:
            encodings.append(extract_face_feature(crop))
    return encodings


def draw_face_boxes(
    frame: np.ndarray,
    locations: List[Tuple[int, int, int, int]],
    labels: List[str],
    confidences: List[float],
) -> np.ndarray:
    """
    Draw real bounding boxes and name labels on a BGR frame.
    Green = recognized student, Red = Unknown.
    """
    frame = frame.copy()
    for (top, right, bottom, left), label, conf in zip(locations, labels, confidences):
        is_known = label != "Unknown"
        color    = (0, 200, 0) if is_known else (0, 0, 220)

        cv2.rectangle(frame, (left, top), (right, bottom), color, 2)

        display = f"{label} ({conf:.0%})" if is_known else "Unknown"
        (tw, th), _ = cv2.getTextSize(display, cv2.FONT_HERSHEY_DUPLEX, 0.5, 1)
        cv2.rectangle(frame, (left, max(0, top - th - 8)), (left + tw + 6, top), color, cv2.FILLED)
        cv2.putText(
            frame, display,
            (left + 3, max(14, top - 4)),
            cv2.FONT_HERSHEY_DUPLEX, 0.5,
            (255, 255, 255), 1,
        )
    return frame
