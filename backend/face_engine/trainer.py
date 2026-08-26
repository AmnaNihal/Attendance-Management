"""
face_engine/trainer.py
Encodes all student images in the dataset folder and trains an SVM classifier.
Uses OpenCV spatial-gradient features + StandardScaler + SVM.
Handles single-photo student profiles safely using feature duplication/augmentation.
"""
import os
import pickle
import logging
from pathlib import Path
from typing import Tuple, List
from collections import Counter

import cv2
import numpy as np
from sklearn.svm import SVC
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

from config import get_settings
from face_engine.detector import detect_faces, extract_face_feature

settings = get_settings()
logger = logging.getLogger(__name__)


def encode_dataset(dataset_path: str) -> Tuple[List[np.ndarray], List[str]]:
    """
    Walk the dataset folder and extract feature encodings + labels.
    If a student has only 1 image, automatically generates augmented variations
    (horizontal flip, brightness variations) so the student has at least 3 samples.
    """
    encodings: List[np.ndarray] = []
    labels: List[str] = []

    dataset_dir = Path(dataset_path)
    if not dataset_dir.exists():
        raise FileNotFoundError(f"Dataset path not found: {dataset_path}")

    student_folders = [f for f in dataset_dir.iterdir() if f.is_dir()]
    if not student_folders:
        raise ValueError("No student folders found in dataset directory.")

    for student_folder in sorted(student_folders):
        label = student_folder.name
        image_files = list(student_folder.glob("*.jpg")) + list(student_folder.glob("*.png"))

        if not image_files:
            continue

        folder_encodings = []
        for img_path in image_files:
            img = cv2.imread(str(img_path))
            if img is None:
                continue

            feat = extract_face_feature(img)
            folder_encodings.append(feat)

            # If there's only 1 image in the folder, create augmented variations (flip, brightness)
            if len(image_files) == 1:
                # Flipped horizontal
                flipped = cv2.flip(img, 1)
                folder_encodings.append(extract_face_feature(flipped))

                # Slightly brighter
                bright = np.clip(img.astype(np.float32) * 1.1, 0, 255).astype(np.uint8)
                folder_encodings.append(extract_face_feature(bright))

                # Slightly darker
                dark = np.clip(img.astype(np.float32) * 0.9, 0, 255).astype(np.uint8)
                folder_encodings.append(extract_face_feature(dark))

        for feat in folder_encodings:
            encodings.append(feat)
            labels.append(label)

    return encodings, labels


def train_model(dataset_path: str = None, model_path: str = None) -> dict:
    """
    Train SVM classifier pipeline on extracted encodings and save model to disk.
    Handles single-sample classes safely to prevent train_test_split errors.
    """
    dataset_path = dataset_path or settings.dataset_path
    model_path = model_path or settings.model_path

    logger.info("Starting face recognition model training...")
    encodings, labels = encode_dataset(dataset_path)

    if len(set(labels)) < 2:
        raise ValueError("Need at least 2 students in dataset to train classifier.")

    X = np.array(encodings)
    le = LabelEncoder()
    y = le.fit_transform(labels)

    # Check class sample counts to safely split or fit
    label_counts = Counter(y)
    min_samples = min(label_counts.values())

    # Standardized feature scaling + Linear SVM with calibrated probabilities
    clf = make_pipeline(
        StandardScaler(),
        SVC(kernel="linear", probability=True, C=1.0, random_state=42)
    )

    if min_samples >= 2 and len(X) >= 4:
        try:
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )
            clf.fit(X_train, y_train)
            y_pred = clf.predict(X_test)
            report = classification_report(y_test, y_pred, target_names=le.classes_, output_dict=True, zero_division=0)
            accuracy = report["accuracy"]
        except Exception as e:
            logger.warning(f"Stratified split failed ({e}), training on full dataset...")
            clf.fit(X, y)
            accuracy = float(clf.score(X, y))
    else:
        logger.info("Few samples available per class. Training directly on full dataset...")
        clf.fit(X, y)
        accuracy = float(clf.score(X, y))

    logger.info(f"Training complete. Accuracy: {accuracy:.2%}")

    # Save model + label encoder
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    with open(model_path, "wb") as f:
        pickle.dump({"classifier": clf, "label_encoder": le}, f)

    logger.info(f"Model saved to {model_path}")
    return {
        "accuracy": accuracy,
        "num_students": len(le.classes_),
        "num_samples": len(X),
        "students": list(le.classes_),
    }


def load_model(model_path: str = None) -> Tuple:
    """Load saved SVM pipeline + LabelEncoder from disk."""
    model_path = model_path or settings.model_path
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model not found at {model_path}. Train first.")
    with open(model_path, "rb") as f:
        data = pickle.load(f)
    return data["classifier"], data["label_encoder"]


if __name__ == "__main__":
    import sys
    logging.basicConfig(level=logging.INFO)
    metrics = train_model()
    print("\n[OK] Training complete!")
    print(f"   Accuracy  : {metrics['accuracy']:.2%}")
    print(f"   Students  : {metrics['num_students']}")
    print(f"   Samples   : {metrics['num_samples']}")
