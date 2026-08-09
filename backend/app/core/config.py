"""Application configuration for database and migration tooling."""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env")


@lru_cache
def get_settings() -> "Settings":
    return Settings()


class Settings:
    """Runtime settings loaded from environment."""

    def __init__(self) -> None:
        self.app_env: str = os.getenv("APP_ENV", "development")
        # firestore (default, current production) | postgres (staging/target)
        self.data_backend: str = os.getenv("DATA_BACKEND", "firestore").lower()
        self.database_url: str | None = os.getenv("DATABASE_URL")
        self.firebase_credentials_path: str = os.getenv(
            "FIREBASE_CREDENTIALS_PATH",
            str(ROOT_DIR / "firebase-admin.json"),
        )
        self.firebase_credentials_json: str | None = (
            os.getenv("FIREBASE_CREDENTIALS")
            or os.getenv("FIREBASE_CREDENTIALS_JSON")
        )
        self.firebase_project_id: str | None = os.getenv("FIREBASE_PROJECT_ID")
        # Migration tooling
        self.migration_output_dir: Path = Path(
            os.getenv("MIGRATION_OUTPUT_DIR", str(ROOT_DIR / "migration_output"))
        )
        self.firestore_read_only: bool = (
            os.getenv("FIRESTORE_READ_ONLY", "true").lower() != "false"
        )

    @property
    def use_postgres(self) -> bool:
        return self.data_backend == "postgres"

    def require_database_url(self) -> str:
        if not self.database_url:
            raise RuntimeError(
                "DATABASE_URL is not set. Configure Railway Postgres or local Postgres."
            )
        return self.database_url
