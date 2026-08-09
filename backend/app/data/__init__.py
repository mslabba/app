"""Data access helpers — Firestore (default) or Postgres (local/staging)."""

from app.core.config import get_settings


def use_postgres() -> bool:
    return get_settings().use_postgres
