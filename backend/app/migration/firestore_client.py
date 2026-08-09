"""
Firestore client for migration tooling.

Uses the same credential resolution as the main app, but never writes when
FIRESTORE_READ_ONLY=true (default). Callers must not perform mutations.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Optional

import firebase_admin
from firebase_admin import credentials, firestore

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Collections known from server.py — inventory also discovers any extras if permitted.
KNOWN_COLLECTIONS = [
    "users",
    "events",
    "categories",
    "teams",
    "players",
    "player_registrations",
    "sponsors",
    "auction_state",
    "bids",
    "public_team_tokens",
    "payment_orders",
    "bank_details",
    "payment_gateway_settings",
]

_app: Optional[firebase_admin.App] = None


def get_firestore_client():
    """Initialize Firebase Admin if needed and return Firestore client."""
    global _app
    settings = get_settings()

    if not firebase_admin._apps:
        cred = None
        if os.path.exists(settings.firebase_credentials_path):
            logger.info("Loading Firebase credentials from %s", settings.firebase_credentials_path)
            cred = credentials.Certificate(settings.firebase_credentials_path)
        elif settings.firebase_credentials_json:
            logger.info("Loading Firebase credentials from environment JSON")
            cred_dict = json.loads(settings.firebase_credentials_json)
            if "project_id" not in cred_dict and settings.firebase_project_id:
                cred_dict["project_id"] = settings.firebase_project_id
            cred = credentials.Certificate(cred_dict)
        else:
            raise RuntimeError(
                "No Firebase credentials found. Set FIREBASE_CREDENTIALS_PATH "
                "or FIREBASE_CREDENTIALS_JSON (prefer a read-only service account)."
            )

        options = {}
        if settings.firebase_project_id:
            options["projectId"] = settings.firebase_project_id
        _app = firebase_admin.initialize_app(cred, options or None)
    else:
        _app = firebase_admin.get_app()

    return firestore.client()


def serialize_value(value: Any) -> Any:
    """Convert Firestore types to JSON-serializable Python values."""
    if value is None:
        return None
    if isinstance(value, dict):
        return {k: serialize_value(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [serialize_value(v) for v in value]
    # Datetime-like
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()
        except Exception:
            return str(value)
    # GeoPoint, DocumentReference, etc.
    type_name = type(value).__name__
    if type_name == "GeoPoint":
        return {"_type": "GeoPoint", "latitude": value.latitude, "longitude": value.longitude}
    if type_name == "DocumentReference":
        return {"_type": "DocumentReference", "path": value.path}
    if isinstance(value, (str, int, float, bool)):
        return value
    return str(value)


def stream_collection(db, collection_name: str):
    """Yield (doc_id, data_dict) for every document in a collection."""
    for doc in db.collection(collection_name).stream():
        data = doc.to_dict() or {}
        data = serialize_value(data)
        if isinstance(data, dict) and "id" not in data:
            data["id"] = doc.id
        yield doc.id, data
