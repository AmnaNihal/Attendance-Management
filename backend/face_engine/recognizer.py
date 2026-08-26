"""
face_engine/recognizer.py
Real-time face recognition using OpenCV Haar Cascade detection + HOG + SVM.
Handles proxy/duplicate detection via per-session cooldown.
"""
import time
import logging
import numpy as np
from typing import Dict, List, Tuple, Optional

import cv2

from config import get_settings
from face_engine.trainer import load_model
from face_engine.detector import detect_faces, extract_face_feature

settings = get_settings()
logger = logging.getLogger(__name__)


class FaceRecognizer:
    """
    Stateful recognizer that:
    - Loads the trained SVM model once.
    - Detects real human faces in every frame using Haar Cascade.
    - Identifies each face against the trained student set.
    - Tracks recently seen faces to prevent duplicate attendance.
    """

    def __init__(self):
        self._clf = None
        self._le = None
        self._model_loaded = False
        self._last_seen: Dict[str, float] = {}
        self._cooldown = settings.proxy_cooldown_seconds
        self._threshold = settings.face_confidence_threshold

    def load(self):
        """Load or reload the trained model from disk."""
        try:
            self._clf, self._le = load_model()
            self._model_loaded = True
            logger.info(
                "Recognizer loaded. Students: %s", list(self._le.classes_)
            )
        except FileNotFoundError:
            self._model_loaded = False
            logger.warning("No trained model found. Train the model first.")

    @property
    def is_ready(self) -> bool:
        return self._model_loaded

    def process_frame(self, frame: np.ndarray) -> List[dict]:
        """
        Detect and identify all faces in a camera frame.

        Returns:
            List of dicts per detected face:
            {
                "label":      str,    # "STU001_Alice_Johnson" or "Unknown"
                "student_id": str,    # "STU001"
                "full_name":  str,    # "Alice Johnson"
                "confidence": float,
                "location":   tuple,  # (top, right, bottom, left)
                "should_mark": bool,  # True if outside cooldown
            }
        """
        if not self._model_loaded:
            return []

        # Run real Haar Cascade face detection
        face_locations = detect_faces(frame)
        if not face_locations:
            return []

        h, w = frame.shape[:2]
        results = []

        for location in face_locations:
            top, right, bottom, left = location
            top_c    = max(0, top)
            left_c   = max(0, left)
            bottom_c = min(h, bottom)
            right_c  = min(w, right)

            crop = frame[top_c:bottom_c, left_c:right_c]
            if crop.size == 0:
                continue

            feature = extract_face_feature(crop)
            proba = self._clf.predict_proba([feature])[0]
            best_idx = int(np.argmax(proba))
            confidence = float(proba[best_idx])
            label = self._le.inverse_transform([best_idx])[0]

            if confidence < self._threshold:
                label = "Unknown"
                student_id = None
                full_name = "Unknown"
                should_mark = False
            else:
                parts = label.split("_", 1)
                student_id = parts[0]
                full_name = parts[1].replace("_", " ") if len(parts) > 1 else label
                should_mark = self._check_and_update_cooldown(label)

            results.append({
                "label":       label,
                "student_id":  student_id,
                "full_name":   full_name,
                "confidence":  confidence,
                "location":    location,
                "should_mark": should_mark,
            })

        return results

    def _check_and_update_cooldown(self, label: str) -> bool:
        """
        Returns True if this student can be marked (outside cooldown window).
        Updates the last-seen timestamp.
        """
        now = time.time()
        last = self._last_seen.get(label, 0)
        if now - last >= self._cooldown:
            self._last_seen[label] = now
            return True
        return False

    def reset_session(self):
        """Clear cooldown state (call at start of each class session)."""
        self._last_seen.clear()
        logger.info("Recognizer session reset.")


# Singleton instance — shared across the API
recognizer = FaceRecognizer()
