from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "AI Attendance Manager"
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    database_url: str = "sqlite:///./attendance.db"

    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    email_from: str = ""
    alert_recipient: str = ""

    face_confidence_threshold: float = 0.55
    proxy_cooldown_seconds: int = 30
    dataset_path: str = "./dataset"
    model_path: str = "./face_engine/model.pkl"

    camera_source: str = "0"  # "0" for webcam, or URL string for IP cam

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
